import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEstudo } from '../src/schema.js';
import { mergeEstudos } from '../src/dedupe.js';

test('mesmo DOI em formatos diferentes funde em um registro', () => {
  const a = makeEstudo({ titulo: 'A', doi: 'https://doi.org/10.1/X' }, 'scopus');
  const b = makeEstudo({ titulo: 'A', doi: '10.1/x' }, 'wos');
  const r = mergeEstudos([a], [b]);
  assert.equal(r.resultado.length, 1);
  assert.equal(r.adicionados, 0);
  assert.equal(r.duplicados, 1);
});

test('sem DOI funde por título normalizado', () => {
  const a = makeEstudo({ titulo: 'Geo-Sítios: um estudo' }, 'scopus');
  const b = makeEstudo({ titulo: 'geo sitios um estudo!' }, 'ris');
  assert.equal(mergeEstudos([a], [b]).resultado.length, 1);
});

test('une as bases sem repetir', () => {
  const a = makeEstudo({ titulo: 'A', doi: '10.1/x' }, 'scopus');
  const b = makeEstudo({ titulo: 'A', doi: '10.1/x' }, 'wos');
  const c = makeEstudo({ titulo: 'A', doi: '10.1/x' }, 'wos');
  const r = mergeEstudos([a], [b, c]);
  assert.deepEqual(r.resultado[0].bases, ['scopus', 'wos']);
});

test('importar a mesma lista duas vezes não adiciona nada', () => {
  const lista = [makeEstudo({ titulo: 'A', doi: '10.1/a' }, 'scopus'), makeEstudo({ titulo: 'B' }, 'scopus')];
  const primeira = mergeEstudos([], lista);
  assert.equal(primeira.adicionados, 2);
  const segunda = mergeEstudos(primeira.resultado, lista);
  assert.equal(segunda.adicionados, 0);
  assert.equal(segunda.duplicados, 2);
  assert.equal(segunda.resultado.length, 2);
});

test('campos vazios do existente são preenchidos pelo novo', () => {
  const a = makeEstudo({ titulo: 'A', doi: '10.1/x' }, 'scopus');
  const b = makeEstudo({ titulo: 'A', doi: '10.1/x', resumo: 'resumo novo', idioma: 'English', paises: ['Brazil'] }, 'wos');
  const e = mergeEstudos([a], [b]).resultado[0];
  assert.equal(e.resumo, 'resumo novo');
  assert.equal(e.idioma, 'inglês');
  assert.deepEqual(e.paises, ['Brazil']);
  assert.equal(e.incompleto, true);
});

test('não altera os arrays de entrada', () => {
  const a = makeEstudo({ titulo: 'A', doi: '10.1/x' }, 'scopus');
  const b = makeEstudo({ titulo: 'A', doi: '10.1/x' }, 'wos');
  mergeEstudos([a], [b]);
  assert.deepEqual(a.bases, ['scopus']);
});
