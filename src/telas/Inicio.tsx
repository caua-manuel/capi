export function Inicio() {
  return (
    <main className="tela">
      <header style={{ padding: '0 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <img src={`${import.meta.env.BASE_URL}apple-touch-icon.png`} alt="" width={44} height={44}
          style={{ borderRadius: 11, boxShadow: '0 2px 8px rgba(11,21,48,.18)' }} />
        <span className="titulo">Capi</span>
      </header>
      <section style={{ padding: '32px 24px 0', textAlign: 'center' }}>
        <img className="capi" src={`${import.meta.env.BASE_URL}capi/capi-acena.png`} alt="" style={{ height: 180, margin: '0 auto' }} />
        <h1 className="titulo-grande" style={{ marginTop: 16 }}>Oi, eu sou a Capi.</h1>
        <p className="texto-2" style={{ margin: '8px 0 0' }}>
          Vou te ajudar a saber para onde vai o seu dinheiro. Tudo fica só neste aparelho.
        </p>
      </section>
      <p className="rotulo" style={{ textAlign: 'center', margin: '32px 24px 0' }}>
        Este plano é educativo e não é recomendação de investimento.
      </p>
    </main>
  );
}
