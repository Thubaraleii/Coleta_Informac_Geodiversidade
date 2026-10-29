import { h } from './dom.js';
import { contagemPorCampo, contagemTemporalidade, cruzar, sementeDe } from '../qualitative.js';
import { barras, matriz, kpis, avisosDaPagina } from './charts.js';
import { ROTULOS } from './rotulos.js';

function painel(titulo, desenhar) {
  const el = h('section', { class: 'painel' }, h('h3', null, titulo));
  desenhar(el);
  return el;
}

export function render(container, ctx) {
  const cods = ctx.codsFiltrados;
  container.append(
    h('h2', null, 'Sítios e elementos patrimoniais'),
    h('p', { class: 'lead' }, 'Natureza patrimonial dos objetos estudados e a dimensão temporal que cada estudo atribui a eles, respeitando a definição adotada em cada publicação.'),
  );
  avisosDaPagina(container, ctx, { qualitativa: true });
  if (cods.length === 0) return;
  const comSitio = cods.filter((c) => c.tiposSitio.length > 0).length;
  kpis(container, [
    { valor: cods.length, rotulo: 'estudos codificados' },
    { valor: comSitio, rotulo: 'com tipo de sítio informado' },
    { valor: cods.filter((c) => c.temporalidade && c.temporalidade !== 'nao-se-aplica').length, rotulo: 'com temporalidade informada' },
  ]);
  container.append(
    h('div', { class: 'grade' },
      painel(ROTULOS.tiposSitio, (el) => barras(el, contagemPorCampo(cods, 'tiposSitio'))),
      painel('Natureza temporal dos elementos', (el) => barras(el, contagemTemporalidade(cods))),
      painel(ROTULOS.objeto, (el) => barras(el, contagemPorCampo(cods, 'objeto'))),
      painel(ROTULOS.eixos, (el) => barras(el, contagemPorCampo(cods, 'eixos'))),
    ),
    painel('Tipo de sítio × eixo temático', (el) => matriz(el, cruzar(cods, 'tiposSitio', 'eixos', sementeDe(ctx.categorias, 'tiposSitio', 'eixos')))),
  );
}
