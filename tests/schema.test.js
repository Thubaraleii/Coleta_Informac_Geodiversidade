import { test } from 'node:test';
import assert from 'node:assert/strict';
import { normalizeDoi, normalizeTitle, makeEstudo } from '../src/schema.js';

test('normalizeDoi remove prefixo de URL e caixa', () => {
  assert.equal(normalizeDoi('https://doi.org/10.1/ABC'), '10.1/abc');
  assert.equal(normalizeDoi('10.1/abc'), '10.1/abc');
  assert.equal(normalizeDoi('doi:10.1/ABC '), '10.1/abc');
});

test('normalizeDoi devolve null para vazio', () => {
  assert.equal(normalizeDoi(''), null);
  assert.equal(normalizeDoi(null), null);
  assert.equal(normalizeDoi('   '), null);
});

test('normalizeTitle remove acentos, pontuação e colapsa espaços', () => {
  assert.equal(normalizeTitle('Geodiversidade: Conceitos!'), 'geodiversidade conceitos');
  assert.equal(normalizeTitle('  Patrimônio   Geológico '), 'patrimonio geologico');
});

test('makeEstudo descarta ano inválido', () => {
  assert.equal(makeEstudo({ titulo: 'X', ano: 'abc' }, 'scopus').ano, null);
  assert.equal(makeEstudo({ titulo: 'X', ano: '2019' }, 'scopus').ano, 2019);
  assert.equal(makeEstudo({ titulo: 'X', ano: 1500 }, 'scopus').ano, null);
});

test('makeEstudo traduz idioma conhecido e preserva o desconhecido', () => {
  assert.equal(makeEstudo({ titulo: 'X', idioma: 'English' }, 'wos').idioma, 'inglês');
  assert.equal(makeEstudo({ titulo: 'X', idioma: 'Portuguese' }, 'wos').idioma, 'português');
  assert.equal(makeEstudo({ titulo: 'X', idioma: 'Spanish' }, 'wos').idioma, 'espanhol');
  assert.equal(makeEstudo({ titulo: 'X', idioma: 'Klingon' }, 'wos').idioma, 'Klingon');
  assert.equal(makeEstudo({ titulo: 'X' }, 'wos').idioma, null);
});

test('makeEstudo usa DOI normalizado como id, senão título', () => {
  assert.equal(makeEstudo({ titulo: 'X', doi: 'https://doi.org/10.1/A' }, 'scopus').id, '10.1/a');
  assert.equal(makeEstudo({ titulo: 'Geo Sítio' }, 'scopus').id, 't:geo sitio');
});

test('makeEstudo marca incompleto quando faltam resumo ou palavras-chave', () => {
  assert.equal(makeEstudo({ titulo: 'X' }, 'scopus').incompleto, true);
  assert.equal(
    makeEstudo({ titulo: 'X', resumo: 'r', palavrasChave: ['a'] }, 'scopus').incompleto,
    false,
  );
});

test('makeEstudo registra a base e aplica padrões', () => {
  const e = makeEstudo({ titulo: 'X' }, 'wos');
  assert.deepEqual(e.bases, ['wos']);
  assert.deepEqual(e.autores, []);
  assert.deepEqual(e.paises, []);
  assert.equal(e.citacoes, null);
});
