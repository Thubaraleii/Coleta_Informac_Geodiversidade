import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEstudo } from '../src/schema.js';
import { novaCodificacao } from '../src/coding.js';
import { filtrosVazios, aplicarFiltros } from '../src/filters.js';

const est = (titulo, extra = {}) => makeEstudo({ titulo, resumo: 'r', palavrasChave: ['k'], ...extra }, 'scopus');
const cod = (e, extra = {}) => ({ ...novaCodificacao(e.id), elegibilidade: 'incluido', ...extra });

test('filtros vazios devolvem os estudos não excluídos', () => {
  const a = est('A');
  const b = est('B');
  const r = aplicarFiltros([a, b], [cod(b, { elegibilidade: 'excluido' })], filtrosVazios());
  assert.deepEqual(r.estudos.map((e) => e.titulo), ['A']);
  assert.equal(r.semCodificacaoIgnorados, 0);
});

test('período mantém só o intervalo e descarta estudos sem ano', () => {
  const lista = [est('A', { ano: 2009 }), est('B', { ano: 2012 }), est('C', { ano: 2015 }), est('D')];
  const f = { ...filtrosVazios(), periodo: [2010, 2015] };
  assert.deepEqual(aplicarFiltros(lista, [], f).estudos.map((e) => e.titulo), ['B', 'C']);
});

test('filtro de campo codificado exige codificação e conta os ignorados', () => {
  const a = est('A');
  const b = est('B');
  const c = est('C');
  const cods = [cod(a, { tiposSitio: ['paleontológico'] }), cod(b, { tiposSitio: ['geomorfológico'] })];
  const f = { ...filtrosVazios(), tiposSitio: ['paleontológico'] };
  const r = aplicarFiltros([a, b, c], cods, f);
  assert.deepEqual(r.estudos.map((e) => e.titulo), ['A']);
  assert.equal(r.semCodificacaoIgnorados, 1);
});

test('idiomas e países combinam por interseção', () => {
  const a = est('A', { idioma: 'English', paises: ['Brazil'] });
  const b = est('B', { idioma: 'English', paises: ['Spain'] });
  const c = est('C', { idioma: 'Spanish', paises: ['Brazil'] });
  const f = { ...filtrosVazios(), idiomas: ['inglês'], paises: ['Brazil'] };
  assert.deepEqual(aplicarFiltros([a, b, c], [], f).estudos.map((e) => e.titulo), ['A']);
});

test('métodos, problemáticas e eixos filtram pelos campos codificados', () => {
  const a = est('A');
  const b = est('B');
  const cods = [
    cod(a, { metodosAvaliacao: ['análise multicritério'], problematicas: ['ameaça antrópica'], eixos: ['geoturismo'] }),
    cod(b, { metodosAvaliacao: ['trabalho de campo'], eixos: ['geoturismo'] }),
  ];
  const f = { ...filtrosVazios(), metodos: ['análise multicritério'], problematicas: ['ameaça antrópica'], eixos: ['geoturismo'] };
  assert.deepEqual(aplicarFiltros([a, b], cods, f).estudos.map((e) => e.titulo), ['A']);
});

test('autores e periódicos filtram os campos bibliográficos', () => {
  const a = est('A', { autores: ['Silva, Ana'], periodico: 'Geoheritage' });
  const b = est('B', { autores: ['Souza, Bruno'], periodico: 'Geosciences' });
  assert.deepEqual(aplicarFiltros([a, b], [], { ...filtrosVazios(), autores: ['Silva, Ana'] }).estudos.length, 1);
  assert.deepEqual(aplicarFiltros([a, b], [], { ...filtrosVazios(), periodicos: ['Geosciences'] }).estudos[0].titulo, 'B');
});

test('estudo excluído nunca passa, mesmo satisfazendo os filtros', () => {
  const a = est('A', { ano: 2012 });
  const f = { ...filtrosVazios(), periodo: [2010, 2015] };
  assert.equal(aplicarFiltros([a], [cod(a, { elegibilidade: 'excluido' })], f).estudos.length, 0);
});
