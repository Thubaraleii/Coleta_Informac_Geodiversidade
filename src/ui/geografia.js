import { h, limpar, numero } from './dom.js';
import { contagemPaises, pontosComCoordenadas, paisesCanonicos } from '../geo.js';
import { cruzarPaisTema, nomesDoDicionario } from '../qualitative.js';
import { mapaPaises, mapaPontos, matriz, avisosDaPagina } from './charts.js';
import { ROTULOS } from './rotulos.js';

function painel(titulo, ...filhos) {
  return h('section', { class: 'painel pilha' }, h('h3', null, titulo), ...filhos);
}

function nota(r, quem) {
  if (r.naoMapeados.length === 0) return null;
  return h('div', { class: 'legenda' }, `${quem} não mapeados: ${r.naoMapeados.slice(0, 12).join(', ')}${r.naoMapeados.length > 12 ? '…' : ''}`);
}

export function render(container, ctx) {
  container.append(
    h('h2', null, 'Geografia'),
    h('p', { class: 'lead' }, 'Onde os autores estão afiliados e onde os sítios foram de fato estudados. Pontos só aparecem quando o estudo informa coordenadas.'),
  );
  avisosDaPagina(container, ctx);
  if (ctx.filtrados.length === 0) return;

  const afiliacao = contagemPaises(ctx.filtrados.flatMap((e) => paisesCanonicos(e.paises)));
  const estudados = contagemPaises(ctx.codsFiltrados.flatMap((c) => paisesCanonicos(c.paisesEstudados)));
  const sitios = pontosComCoordenadas(ctx.codsFiltrados, 'sitios');

  const mapaAf = h('div');
  mapaPaises(mapaAf, afiliacao.mapeados);
  const mapaEst = h('div');
  if (ctx.codsFiltrados.length === 0) mapaEst.append(h('div', { class: 'vazio' }, 'Ainda não há estudos codificados com países estudados.'));
  else mapaPaises(mapaEst, estudados.mapeados);
  const mapaSit = h('div');
  mapaPontos(mapaSit, sitios.pontos);

  const campoTema = h('select', { id: 'tema-pais', onChange: () => desenharCruzamento() }, ['eixos', 'tiposSitio', 'aplicacao', 'problematicas'].map((c) => h('option', { value: c }, ROTULOS[c])));
  const caixaCruz = h('div');
  function desenharCruzamento() {
    limpar(caixaCruz);
    matriz(caixaCruz, cruzarPaisTema(ctx.filtrados, ctx.codsFiltrados, campoTema.value, { colunas: nomesDoDicionario(ctx.categorias, campoTema.value) }));
  }
  desenharCruzamento();

  container.append(
    painel('Países de afiliação dos autores', mapaAf, nota(afiliacao, 'Países')),
    painel('Países onde os sítios foram estudados', mapaEst, nota(estudados, 'Países')),
    painel('Sítios com coordenadas', mapaSit, h('div', { class: 'legenda' }, `${numero(sitios.pontos.length)} no mapa; ${numero(sitios.semCoordenadas)} sítios sem coordenadas (não posicionados).`)),
    painel('País estudado × tema', h('label', { class: 'campo', for: 'tema-pais' }, 'Tema', campoTema), caixaCruz),
  );
}
