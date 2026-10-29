import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseScopusCsv, parseWosTabDelimited, parseBibtex, parseRis, detectFormat, parseFile } from '../src/parsers/index.js';

const lerFixture = (nome) => readFileSync(new URL(`./fixtures/${nome}`, import.meta.url), 'utf8');

test('Scopus: devolve 3 estudos, sobrevive ao BOM e a campos com vírgula e quebra de linha', () => {
  const texto = lerFixture('scopus.csv');
  assert.equal(texto.charCodeAt(0), 0xfeff);
  const estudos = parseScopusCsv(texto);
  assert.equal(estudos.length, 3);
  assert.equal(estudos[0].titulo, 'Geoheritage and geoconservation: a review');
  assert.match(estudos[1].titulo, /^Geodiversity, geotourism and\n viewpoints in Brazil$/);
  assert.match(estudos[1].resumo, /"aspas"/);
});

test('Scopus: autores, palavras-chave, idioma, países e citações', () => {
  const [a, b, c] = parseScopusCsv(lerFixture('scopus.csv'));
  assert.deepEqual(a.autores, ['Brilha, José', 'Reynard, Emmanuel']);
  assert.deepEqual(a.palavrasChave, ['geoheritage', 'geoconservation', 'geosites']);
  assert.equal(a.idioma, 'inglês');
  assert.deepEqual(a.paises, ['Portugal', 'Switzerland']);
  assert.equal(a.citacoes, 120);
  assert.equal(a.ano, 2016);
  assert.equal(a.doi, '10.1007/s12371-016-0001-1');
  assert.equal(b.doi, null);
  assert.equal(b.idioma, 'português');
  assert.equal(c.doi, '10.1/xyz');
  assert.equal(c.citacoes, null);
  assert.deepEqual(c.paises, ['Spain', 'Portugal']);
  assert.deepEqual(a.bases, ['scopus']);
});

test('WoS: devolve 3 estudos com idioma, países e palavras-chave', () => {
  const [a, b, c] = parseWosTabDelimited(lerFixture('wos.txt'));
  assert.equal(a.titulo, 'Geosites assessment in Portugal');
  assert.deepEqual(a.autores, ['Silva, Ana', 'Souza, Bruno']);
  assert.deepEqual(a.palavrasChave, ['geosites', 'assessment']);
  assert.equal(a.idioma, 'inglês');
  assert.deepEqual(a.paises, ['Portugal']);
  assert.equal(a.citacoes, 10);
  assert.deepEqual(b.paises, ['Brazil', 'Portugal']);
  assert.equal(b.doi, null);
  assert.equal(c.doi, '10.1007/s12371-016-0001-1');
  assert.deepEqual(c.bases, ['wos']);
});

test('BibTeX: devolve 3 estudos, remove chaves e aceita campo sem DOI', () => {
  const [a, b, c] = parseBibtex(lerFixture('sample.bib'));
  assert.equal(a.titulo, 'Geoheritage and geoconservation: a review');
  assert.deepEqual(a.autores.length, 2);
  assert.deepEqual(a.palavrasChave, ['geoheritage', 'geoconservation']);
  assert.equal(a.idioma, 'inglês');
  assert.equal(b.titulo, 'Geodiversity, tourism and viewpoints');
  assert.equal(b.doi, null);
  assert.equal(c.titulo, 'Sites in Spain');
  assert.equal(c.ano, 2021);
  assert.deepEqual(c.bases, ['bibtex']);
});

test('RIS: devolve 3 estudos com autores e palavras-chave repetidos', () => {
  const [a, b, c] = parseRis(lerFixture('sample.ris'));
  assert.equal(a.ano, 2016);
  assert.deepEqual(a.autores, ['Brilha, José', 'Reynard, Emmanuel']);
  assert.deepEqual(a.palavrasChave, ['geoheritage', 'geoconservation']);
  assert.equal(b.periodico, 'Revista X');
  assert.equal(c.doi, '10.1/ris3');
  assert.deepEqual(c.bases, ['ris']);
});

test('detectFormat reconhece cada formato e rejeita lixo', () => {
  assert.equal(detectFormat(lerFixture('scopus.csv'), 'export.csv'), 'scopus');
  assert.equal(detectFormat(lerFixture('wos.txt'), 'savedrecs.txt'), 'wos');
  assert.equal(detectFormat(lerFixture('sample.bib'), 'x.bib'), 'bibtex');
  assert.equal(detectFormat(lerFixture('sample.ris'), 'x.ris'), 'ris');
  assert.equal(detectFormat('lixo', 'a.txt'), null);
});

test('parseFile devolve formato e estudos, e lança erro claro em formato desconhecido', () => {
  const r = parseFile(lerFixture('sample.ris'), 'x.ris');
  assert.equal(r.format, 'ris');
  assert.equal(r.estudos.length, 3);
  assert.throws(() => parseFile('lixo', 'a.txt'), /Formato não reconhecido/);
});
