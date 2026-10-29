import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEstudo, normalizeDoi } from '../src/schema.js';
import { mergeEstudos } from '../src/dedupe.js';

test('normalizeDoi aceita formatos comuns de DOI e remove pontuação final', () => {
  assert.equal(normalizeDoi('doi.org/10.1/X'), '10.1/x');
  assert.equal(normalizeDoi('https://www.doi.org/10.1/X'), '10.1/x');
  assert.equal(normalizeDoi('DOI 10.1/abc'), '10.1/abc');
  assert.equal(normalizeDoi('10.1/abc.'), '10.1/abc');
  assert.equal(normalizeDoi('https://dx.doi.org/10.1007/S12371-016-0001-1'), '10.1007/s12371-016-0001-1');
});

test('importação só de duplicatas informa registros alterados quando bases ou campos mudam', () => {
  const a = makeEstudo({ titulo: 'A', doi: '10.1/x' }, 'scopus');
  const b = makeEstudo({ titulo: 'A', doi: '10.1/x', paises: ['Brazil'] }, 'wos');
  const r = mergeEstudos([a], [b]);
  assert.equal(r.adicionados, 0);
  assert.equal(r.alterados, 1);
  assert.deepEqual(r.resultado[0].bases, ['scopus', 'wos']);
  assert.equal(mergeEstudos(r.resultado, [b]).alterados, 0);
});

test('une registro sem DOI com o mesmo título que tem DOI, mantendo o id existente', () => {
  const semDoi = makeEstudo({ titulo: 'Geo Heritage Line' }, 'ris');
  const comDoi = makeEstudo({ titulo: 'Geo heritage line', doi: '10.1/ab' }, 'scopus');
  const r = mergeEstudos([semDoi], [comDoi]);
  assert.equal(r.resultado.length, 1);
  assert.equal(r.resultado[0].id, semDoi.id);
  assert.equal(r.resultado[0].doi, '10.1/ab');
  assert.deepEqual(r.resultado[0].bases, ['ris', 'scopus']);
  const inverso = mergeEstudos([comDoi], [semDoi]);
  assert.equal(inverso.resultado.length, 1);
  assert.equal(inverso.resultado[0].id, comDoi.id);
});

test('títulos iguais com DOIs diferentes continuam sendo estudos distintos', () => {
  const a = makeEstudo({ titulo: 'Introduction', doi: '10.1/a' }, 'scopus');
  const b = makeEstudo({ titulo: 'Introduction', doi: '10.1/b' }, 'scopus');
  assert.equal(mergeEstudos([a], [b]).resultado.length, 2);
});
