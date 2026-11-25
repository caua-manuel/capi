import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './estilos.css';
import { aparenciaSalva, aplicarAparencia } from './telas/aparencia';

// O tema vai para o documento antes de desenhar a primeira tela, para não piscar.
aplicarAparencia(aparenciaSalva());

const raiz = document.getElementById('raiz');
if (!raiz) throw new Error('Elemento #raiz não encontrado');
createRoot(raiz).render(<StrictMode><App /></StrictMode>);
