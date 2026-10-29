import { h, limpar } from './dom.js';
import { contagemPorCampo, cruzar } from '../qualitative.js';
import { coocorrencia } from '../networks.js';
import { barras, matriz, rede, avisosDaPagina } from './charts.js';
import { ROTULOS } from './rotulos.js';

function painel(titulo, desenhar) {
  const el = h('section', { class: 'painel' }, h('h3', null, titulo));
  desenhar(el);
  return el;
}

export function render(container, ctx) {
  const cods = ctx.codsFiltrados;
  container.append(
    h('h2', null, 'Problemáticas, métodos e critérios'),
    h('p', { class: 'lead' }, 'Ameaças, fragilidades e vulnerabilidades registradas nos estudos, os métodos e critérios usados para avaliá-las e as estratégias de conservação ou gestão.'),
  );
  avisosDaPagina(container, ctx, { qualitativa: true });
  if (ctx.filtrados.length === 0) return;
  if (cods.length > 0) {
    container.append(
      h('div', { class: 'grade' },
        painel(ROTULOS.problematicas, (el) => barras(el, contagemPorCampo(cods, 'problematicas'))),
        painel(ROTULOS.metodosAvaliacao, (el) => barras(el, contagemPorCampo(cods, 'metodosAvaliacao'))),
        painel(ROTULOS.criteriosAvaliacao, (el) => barras(el, contagemPorCampo(cods, 'criteriosAvaliacao'))),
        painel(ROTULOS.estrategias, (el) => barras(el, contagemPorCampo(cods, 'estrategias'))),
      ),
      painel('Problemática × método de avaliação', (el) => matriz(el, cruzar(cods, 'problematicas', 'metodosAvaliacao'))),
    );
  }
  const caixa = h('div');
  rede(caixa, coocorrencia(ctx.filtrados, 2));
  container.append(painel('Rede de palavras-chave dos estudos selecionados', (el) => el.append(caixa)));
}
