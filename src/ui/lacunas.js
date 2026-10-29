import { h, limpar, numero } from './dom.js';
import { cruzar, cruzarPaisTema, limitacoesRecorrentes, sementeDe, nomesDoDicionario } from '../qualitative.js';
import { matriz, avisosDaPagina } from './charts.js';
import { CAMPOS_CRUZAMENTO } from './rotulos.js';

function painel(titulo, ...filhos) {
  return h('section', { class: 'painel pilha' }, h('h3', null, titulo), ...filhos);
}

function matrizFixa(titulo, resultado) {
  const caixa = h('div');
  matriz(caixa, resultado);
  return painel(titulo, caixa);
}

export function render(container, ctx) {
  const cods = ctx.codsFiltrados;
  container.append(
    h('h2', null, 'Lacunas e síntese'),
    h('p', { class: 'lead' }, 'Matrizes de evidências cruzam as categorias codificadas. Células vazias (contorno tracejado) indicam combinações sem nenhum estudo na seleção atual; isso pode ser lacuna real ou só falta de codificação, por isso confira a proporção codificada no topo.'),
  );
  avisosDaPagina(container, ctx, { qualitativa: true });
  if (cods.length === 0) return;

  const opcoes = Object.entries(CAMPOS_CRUZAMENTO);
  const selA = h('select', { id: 'cruz-a', onChange: () => desenharLivre() }, opcoes.map(([k, r]) => h('option', { value: k, selected: k === 'tiposSitio' }, r)));
  const selB = h('select', { id: 'cruz-b', onChange: () => desenharLivre() }, opcoes.map(([k, r]) => h('option', { value: k, selected: k === 'metodosAvaliacao' }, r)));
  const caixaLivre = h('div');
  function desenharLivre() {
    limpar(caixaLivre);
    matriz(caixaLivre, cruzar(cods, selA.value, selB.value, sementeDe(ctx.categorias, selA.value, selB.value)));
  }
  desenharLivre();

  const lacunasRegistradas = cods.filter((c) => c.lacuna.trim() !== '');
  const tituloDe = new Map(ctx.estudos.map((e) => [e.id, e.titulo]));
  const limitacoes = limitacoesRecorrentes(cods, 10).filter((l) => l.total > 1);

  container.append(
    matrizFixa('Eixo temático × método de avaliação', cruzar(cods, 'eixos', 'metodosAvaliacao', sementeDe(ctx.categorias, 'eixos', 'metodosAvaliacao'))),
    matrizFixa('Tipo de sítio × aplicação', cruzar(cods, 'tiposSitio', 'aplicacao', sementeDe(ctx.categorias, 'tiposSitio', 'aplicacao'))),
    matrizFixa('Problemática × método de avaliação', cruzar(cods, 'problematicas', 'metodosAvaliacao', sementeDe(ctx.categorias, 'problematicas', 'metodosAvaliacao'))),
    matrizFixa('País estudado × eixo temático', cruzarPaisTema(ctx.filtrados, cods, 'eixos', { colunas: nomesDoDicionario(ctx.categorias, 'eixos') })),
    painel('Cruzamento livre', h('div', { class: 'grade' }, h('label', { class: 'campo', for: 'cruz-a' }, 'Linhas', selA), h('label', { class: 'campo', for: 'cruz-b' }, 'Colunas', selB)), caixaLivre),
    painel(
      'Limitações que se repetem nos estudos',
      limitacoes.length === 0 ? h('div', { class: 'vazio' }, 'Nenhuma limitação aparece em mais de um estudo (textos iguais). Registre limitações com a mesma redação para agrupá-las.') : h('div', { class: 'tabela' }, h('table', null, h('tbody', null, limitacoes.map((l) => h('tr', null, h('td', null, l.texto), h('td', { class: 'num' }, l.total))))))),
    painel(
      `Lacunas apontadas pelos autores ou pela codificação (${numero(lacunasRegistradas.length)})`,
      lacunasRegistradas.length === 0 ? h('div', { class: 'vazio' }, 'Nenhuma lacuna registrada nos estudos desta seleção.') : h('div', { class: 'tabela' }, h('table', null, h('thead', null, h('tr', null, h('th', null, 'Estudo'), h('th', null, 'Lacuna'))), h('tbody', null, lacunasRegistradas.map((c) => h('tr', null, h('td', null, tituloDe.get(c.estudoId) ?? c.estudoId), h('td', null, c.lacuna)))))),
    ),
  );
}
