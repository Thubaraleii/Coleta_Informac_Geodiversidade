import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { makeEstudo } from '../src/schema.js';
import { novaCodificacao, mesclarDescricoes } from '../src/coding.js';
import { filtrosVazios, aplicarFiltros } from '../src/filters.js';
import { topContagem } from '../src/metrics.js';
import { cruzar, cruzarPaisTema, nomesDoDicionario } from '../src/qualitative.js';
import { setNomesAtlas, normalizarPais, paisesCanonicos } from '../src/geo.js';
import { empacotar, paginaDe } from '../src/dbids.js';

before(() => {
  const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-110m.json', import.meta.url), 'utf8'));
  setNomesAtlas(topo.objects.countries.geometries.map((g) => g.properties.name));
});

const est = (titulo, extra = {}) => makeEstudo({ titulo, resumo: 'r', palavrasChave: ['k'], ...extra }, 'scopus');
const cod = (id, extra = {}) => ({ ...novaCodificacao(id), elegibilidade: 'incluido', ...extra });

test('nomes de países de bases bibliográficas são reconhecidos', () => {
  const esperado = {
    'U Arab Emirates': 'United Arab Emirates',
    'Bosnia & Herceg': 'Bosnia and Herz.',
    'Slovak Republic': 'Slovakia',
    'Korea, Republic of': 'South Korea',
    'Iran (Islamic Republic of)': 'Iran',
    'The Netherlands': 'Netherlands',
    'Lao PDR': 'Laos',
    'Republic of the Congo': 'Congo',
    'Democratic Republic Congo': 'Dem. Rep. Congo',
  };
  for (const [entrada, pais] of Object.entries(esperado)) assert.equal(normalizarPais(entrada), pais, entrada);
});

test('paisesCanonicos unifica variações, remove repetidos e mantém o que não reconhece', () => {
  assert.deepEqual(paisesCanonicos(['England', 'Scotland', 'USA', 'United States', 'Atlantis']), ['United Kingdom', 'United States of America', 'Atlantis']);
  assert.deepEqual(paisesCanonicos([]), []);
});

test('filtro de país trata variações do mesmo país como um só', () => {
  const a = est('A', { paises: ['USA'] });
  const b = est('B', { paises: ['United States'] });
  const c = est('C', { paises: ['Brazil'] });
  const f = { ...filtrosVazios(), paises: ['United States of America'] };
  assert.deepEqual(aplicarFiltros([a, b, c], [], f).estudos.map((e) => e.titulo), ['A', 'B']);
});

test('filtro de periódico ignora caixa e pontuação', () => {
  const a = est('A', { periodico: 'GEOHERITAGE' });
  const b = est('B', { periodico: 'Geoheritage' });
  const c = est('C', { periodico: 'Geosciences' });
  const f = { ...filtrosVazios(), periodicos: ['Geoheritage'] };
  assert.deepEqual(aplicarFiltros([a, b, c], [], f).estudos.map((e) => e.titulo), ['A', 'B']);
});

test('topContagem agrupa o mesmo periódico escrito de formas diferentes', () => {
  const lista = [est('A', { periodico: 'Geoheritage' }), est('B', { periodico: 'GEOHERITAGE' }), est('C', { periodico: 'Geoheritage' }), est('D', { periodico: 'Geosciences' })];
  assert.deepEqual(topContagem(lista, 'periodico', 5), [
    { nome: 'Geoheritage', total: 3 },
    { nome: 'Geosciences', total: 1 },
  ]);
});

test('cruzar inclui as categorias do dicionário que nunca foram codificadas', () => {
  const cods = [cod('a', { tiposSitio: ['geomorfológico'], aplicacao: ['avaliação'] })];
  const r = cruzar(cods, 'tiposSitio', 'aplicacao', { linhas: ['geomorfológico', 'paleontológico'], colunas: ['avaliação', 'turismo'] });
  assert.deepEqual(r.linhas, ['geomorfológico', 'paleontológico']);
  assert.deepEqual(r.colunas, ['avaliação', 'turismo']);
  assert.deepEqual(r.celulas, [[1, 0], [0, 0]]);
  assert.equal(r.menosEstudadas.some((m) => m.a === 'paleontológico' && m.b === 'turismo' && m.total === 0), true);
});

test('cruzar com semente mas sem codificações mostra a matriz de zeros', () => {
  assert.deepEqual(cruzar([], 'tiposSitio', 'aplicacao', { linhas: ['x'], colunas: ['y'] }).celulas, [[0]]);
});

test('cruzarPaisTema aceita colunas do dicionário sem codificação', () => {
  const a = est('A');
  const r = cruzarPaisTema([a], [cod(a.id, { paisesEstudados: ['Brazil'], eixos: ['geoturismo'] })], 'eixos', { colunas: ['geoturismo', 'geoconservação'] });
  assert.deepEqual(r.colunas, ['geoconservação', 'geoturismo']);
  assert.deepEqual(r.celulas, [[0, 1]]);
});

test('nomesDoDicionario lê campos simples e caminhos de viewpoints', () => {
  const cats = { tiposSitio: [{ nome: 'a', descricao: 'd' }], ameacasVisuais: [{ nome: 'b', descricao: 'd' }] };
  assert.deepEqual(nomesDoDicionario(cats, 'tiposSitio'), ['a']);
  assert.deepEqual(nomesDoDicionario(cats, 'viewpoints.ameacasVisuais'), ['b']);
  assert.deepEqual(nomesDoDicionario(cats, 'inexistente'), []);
});

test('mesclarDescricoes atualiza só as definições e preserva categorias novas', () => {
  const atuais = [{ nome: 'a', descricao: 'velha' }, { nome: 'geoética', descricao: 'nova' }];
  assert.deepEqual(mesclarDescricoes(atuais, [{ nome: 'a', descricao: 'editada' }]), [{ nome: 'a', descricao: 'editada' }, { nome: 'geoética', descricao: 'nova' }]);
});

test('empacotar mede o tamanho em bytes, não em caracteres', () => {
  const itens = Array.from({ length: 12 }, (_, i) => ({ id: `i${i}`, data: { texto: 'ж'.repeat(100) } }));
  const lotes = empacotar(itens, 700);
  for (const lote of lotes) assert.ok(new TextEncoder().encode(JSON.stringify(lote)).length <= 700 || lote.length === 1);
  assert.deepEqual(lotes.flat().map((i) => i.id), itens.map((i) => i.id));
});

test('paginaDe distribui ids em páginas estáveis entre 0 e 19', () => {
  assert.equal(paginaDe('10.1/a'), paginaDe('10.1/a'));
  const usadas = new Set();
  for (let i = 0; i < 2000; i++) {
    const p = paginaDe(`10.1/${i}`);
    assert.ok(Number.isInteger(p) && p >= 0 && p < 20);
    usadas.add(p);
  }
  assert.equal(usadas.size, 20);
});
