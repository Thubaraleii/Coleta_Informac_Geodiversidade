import { h, numero } from './dom.js';
import { contagemPorCampo, resumoViewpoints, cruzar } from '../qualitative.js';
import { pontosComCoordenadas } from '../geo.js';
import { barras, matriz, mapaPontos, kpis, avisosDaPagina } from './charts.js';
import { ROTULOS, CAMPOS_VIEWPOINT } from './rotulos.js';

function painel(titulo, desenhar) {
  const el = h('section', { class: 'painel' }, h('h3', null, titulo));
  desenhar(el);
  return el;
}

export function render(container, ctx) {
  const cods = ctx.codsFiltrados;
  container.append(
    h('h2', null, 'Pontos de observação e visadas'),
    h('p', { class: 'lead' }, 'Como os estudos usam pontos de observação (viewpoints) para avaliar e interpretar o geopatrimônio: critérios de seleção, métodos visuais, técnicas de visibilidade, paisagens observadas e ameaças à integridade visual.'),
  );
  avisosDaPagina(container, ctx, { qualitativa: true });
  if (cods.length === 0) return;
  const r = resumoViewpoints(cods);
  kpis(container, [
    { valor: r.usam, rotulo: 'estudos que usam pontos de observação' },
    { valor: r.naoUsam, rotulo: 'estudos que não usam' },
    { valor: r.semInformacao, rotulo: 'sem informação' },
  ]);
  const usam = cods.filter((c) => c.viewpoints.usa === true);
  const pontos = pontosComCoordenadas(usam, 'viewpoints');
  container.append(
    h('div', { class: 'grade' }, CAMPOS_VIEWPOINT.map((c) => painel(ROTULOS[c], (el) => barras(el, contagemPorCampo(usam, `viewpoints.${c}`))))),
    painel('Tipo de patrimônio × ameaça à integridade visual', (el) => matriz(el, cruzar(usam, 'tiposSitio', 'viewpoints.ameacasVisuais'))),
    painel('Tipo de patrimônio × aplicação', (el) => matriz(el, cruzar(usam, 'tiposSitio', 'aplicacao'))),
    painel('Características da paisagem × aplicação', (el) => matriz(el, cruzar(usam, 'viewpoints.caracteristicasPaisagem', 'aplicacao'))),
    painel('Pontos de observação com coordenadas', (el) => {
      mapaPontos(el, pontos.pontos);
      el.append(h('div', { class: 'legenda' }, `${numero(pontos.pontos.length)} no mapa; ${numero(pontos.semCoordenadas)} pontos sem coordenadas (não posicionados).`));
    }),
  );
}
