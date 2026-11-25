import { DurableObject } from 'cloudflare:workers';
import { centavosParaTexto, lerInscricao, type Inscricao, type Pagamento, type Pendente } from './entrada';

export interface Ambiente {
  INSCRICOES: KVNamespace;
  PENDENTES: KVNamespace;
  COORDENACAO: DurableObjectNamespace<CoordenacaoDoAtalho>;
  LIMITE_POR_ROTA: RateLimit;
  VAPID: string;
}

interface Referencia {
  chave: string;
  id: string;
  expira: number;
}

interface Estado {
  fila: Referencia[];
  aExcluir: Referencia[];
  limite?: { janela: number; total: number };
  revogacao?: true | { hash: string; excluirInscricao?: boolean };
}

export type Acao = { tipo: 'inscrever'; inscricao: Inscricao } | { tipo: 'pagamento'; pagamento: Pagamento }
  | { tipo: 'pendentes' | 'teste' | 'desligar' };

type Resultado = { status: 200; pendentes: Pendente[] }
  | { status: 202; id: string; inscricao: Inscricao }
  | { status: 204; inscricao?: Inscricao }
  | { status: 401 | 404 | 409 | 503 }
  | { status: 429; tentarEm?: number };

const UMA_HORA = 60 * 60 * 1000;
const TTL_EM_SEGUNDOS = 48 * 60 * 60;
const MAXIMO_NA_FILA = 200;

export class CoordenacaoDoAtalho extends DurableObject<Ambiente> {
  async operar(hash: string, acao: Acao): Promise<Resultado> {
    // Workers KV é eventualmente consistente. Uma instância por hash ordena as operações da fila.
    return this.ctx.blockConcurrencyWhile(async () => {
      const agora = Date.now();
      const estado = await this.lerEstado(agora);
      if (acao.tipo === 'desligar') return this.desligar(hash, estado, agora);
      if (estado.revogacao) {
        return { status: acao.tipo === 'inscrever' ? 409 : acao.tipo === 'teste' ? 404 : 401 };
      }

      const inscricao = acao.tipo === 'inscrever' ? acao.inscricao : lerInscricao(await this.env.INSCRICOES.get(hash, 'json'));
      if (!inscricao) return { status: acao.tipo === 'teste' ? 404 : 401 };
      if (estado.limite && estado.limite.total >= 60) {
        return { status: 429, tentarEm: Math.ceil(((estado.limite.janela + 1) * UMA_HORA - agora) / 1000) };
      }
      estado.limite = { janela: Math.floor(agora / UMA_HORA), total: (estado.limite?.total ?? 0) + 1 };
      await this.gravar(estado, agora);

      switch (acao.tipo) {
        case 'inscrever':
          await this.env.INSCRICOES.put(hash, JSON.stringify(inscricao));
          return { status: 204 };
        case 'teste':
          return { status: 204, inscricao };
        case 'pagamento':
          return this.guardar(hash, acao.pagamento, inscricao, estado, agora);
        case 'pendentes':
          return this.consumir(estado, agora);
      }
    });
  }

  async alarm(): Promise<void> {
    await this.ctx.blockConcurrencyWhile(async () => {
      const agora = Date.now();
      const estado = await this.lerEstado(agora);
      await this.excluirDoKv(estado);
      await this.gravar(estado, agora);
    });
  }

  private async lerEstado(agora: number): Promise<Estado> {
    const salvo = await this.ctx.storage.get<Estado | true>('estado');
    if (salvo === true) return { fila: [], aExcluir: [], revogacao: true };
    const estado = salvo ?? { fila: [], aExcluir: [] };
    estado.fila = estado.fila.filter(({ expira }) => expira > agora);
    estado.aExcluir = estado.aExcluir.filter(({ expira }) => expira > agora);
    if (estado.limite?.janela !== Math.floor(agora / UMA_HORA)) delete estado.limite;
    // Atualiza a marca gravada na primeira versão do Worker de pagamentos.
    if (typeof estado.revogacao === 'object' && estado.revogacao.excluirInscricao === false) estado.revogacao = true;
    return estado;
  }

  private async gravar(estado: Estado, agora: number): Promise<void> {
    const prazos = estado.fila.map(({ expira }) => expira);
    if (estado.limite) prazos.push((estado.limite.janela + 1) * UMA_HORA);
    if (estado.aExcluir.length > 0 || typeof estado.revogacao === 'object') prazos.push(agora + 60_000);

    await this.ctx.storage.transaction(async (transacao) => {
      if (prazos.length === 0) {
        // Depois da limpeza, só este bit fica associado ao identificador derivado do hash.
        if (estado.revogacao === true) await transacao.put('estado', true);
        else await transacao.delete('estado');
        await transacao.deleteAlarm();
      } else {
        await transacao.put('estado', estado);
        await transacao.setAlarm(Math.min(...prazos));
      }
    });
  }

  private async guardar(hash: string, pagamento: Pagamento, inscricao: Inscricao, estado: Estado, agora: number): Promise<Resultado> {
    if (estado.fila.length + estado.aExcluir.length >= MAXIMO_NA_FILA) return { status: 429 };
    const id = crypto.randomUUID();
    const chave = `${hash}:${id}`;
    const referencia = { chave, id, expira: agora + TTL_EM_SEGUNDOS * 1000 };
    estado.fila.push(referencia);
    await this.gravar(estado, agora);
    try {
      await this.env.PENDENTES.put(chave, JSON.stringify(pagamento), { expirationTtl: TTL_EM_SEGUNDOS });
    } catch (erro) {
      // Uma escrita que perdeu a resposta pode ter chegado ao KV. Não a entregue na próxima leitura.
      estado.fila.pop();
      estado.aExcluir.push(referencia);
      await this.gravar(estado, agora);
      throw erro;
    }
    return { status: 202, id, inscricao };
  }

  private async consumir(estado: Estado, agora: number): Promise<Resultado> {
    const pendentes: Pendente[] = [];
    const consumidos = new Set<string>();
    for (let i = 0; i < estado.fila.length; i += 100) {
      const grupo = estado.fila.slice(i, i + 100);
      const dados = await this.env.PENDENTES.get<Pagamento>(grupo.map(({ chave }) => chave), 'json');
      for (const referencia of grupo) {
        const pagamento = dados.get(referencia.chave);
        // Em caso de atraso do KV, preserve a referência para a próxima leitura.
        if (!pagamento || referencia.expira <= Date.now()) continue;
        consumidos.add(referencia.chave);
        estado.aExcluir.push(referencia);
        pendentes.push({ id: referencia.id, valor: centavosParaTexto(pagamento.valor), loja: pagamento.loja });
      }
    }

    if (consumidos.size > 0) {
      estado.fila = estado.fila.filter(({ chave }) => !consumidos.has(chave));
      // Confirma a retirada de uma vez. O alarme retoma exclusões do KV em caso de falha transitória.
      await this.gravar(estado, agora);
      await this.excluirDoKv(estado);
      await this.gravar(estado, agora);
    }
    return { status: 200, pendentes };
  }

  private async desligar(hash: string, estado: Estado, agora: number): Promise<Resultado> {
    if (estado.revogacao === true && estado.aExcluir.length === 0) return { status: 204 };
    if (!estado.revogacao) {
      if (!estado.limite && estado.fila.length === 0 && estado.aExcluir.length === 0 && !await this.env.INSCRICOES.get(hash)) {
        return { status: 204 };
      }
      estado.revogacao = { hash };
      estado.aExcluir.push(...estado.fila);
      estado.fila = [];
      delete estado.limite;
      await this.gravar(estado, agora);
    }
    await this.excluirDoKv(estado);
    await this.gravar(estado, agora);
    return { status: estado.revogacao !== true || estado.aExcluir.length > 0 ? 503 : 204 };
  }

  private async excluirDoKv(estado: Estado): Promise<void> {
    if (typeof estado.revogacao === 'object') {
      try {
        await this.env.INSCRICOES.delete(estado.revogacao.hash);
        estado.revogacao = true;
      } catch { /* O alarme retenta a exclusão. */ }
    }
    const restantes: Referencia[] = [];
    for (let i = 0; i < estado.aExcluir.length; i += 6) {
      const grupo = estado.aExcluir.slice(i, i + 6);
      const resultados = await Promise.allSettled(grupo.map(({ chave }) => this.env.PENDENTES.delete(chave)));
      resultados.forEach((resultado, j) => { if (resultado.status === 'rejected') restantes.push(grupo[j]); });
    }
    estado.aExcluir = restantes;
  }
}
