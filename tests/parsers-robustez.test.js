import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseScopusCsv, parseWosTabDelimited, parseBibtex, parseFile } from '../src/parsers/index.js';

const CABECALHO = 'Authors,Author full names,Title,Year,Source title,Cited by,DOI,Affiliations,Abstract,Author Keywords,Language of Original Document';

test('Scopus salvo com ponto e vírgula como separador é lido corretamente', () => {
  const csv = `${CABECALHO.replaceAll(',', ';')}\n"Silva A.";"Silva, Ana (1)";"Título com vírgula, e mais";2020;Rev X;3;10.1/pv;"Univ, Rio, Brazil";Resumo;"geo; tur";Portuguese\n`;
  const [e] = parseScopusCsv(csv);
  assert.equal(e.titulo, 'Título com vírgula, e mais');
  assert.equal(e.ano, 2020);
  assert.deepEqual(e.paises, ['Brazil']);
  assert.deepEqual(e.palavrasChave, ['geo', 'tur']);
});

test('linhas vazias do Excel não geram registros e arquivo sem registros válidos é rejeitado', () => {
  assert.equal(parseScopusCsv(`${CABECALHO}\n,,,,,,,,,,\n,,,,,,,,,,\n`).length, 0);
  assert.throws(() => parseFile(`${CABECALHO}\n,,,,,,,,,,\n`, 'x.csv'), /Nenhum registro válido/);
});

test('BibTeX ignora @string, @preamble e @comment', () => {
  const bib = '@string{rev = "Revista X"}\n@preamble{"x"}\n@comment{nada}\n@article{a1,\n  title = {Único estudo},\n  year = {2020}\n}\n';
  const r = parseBibtex(bib);
  assert.equal(r.length, 1);
  assert.equal(r[0].titulo, 'Único estudo');
});

test('WoS: endereço dos EUA com estado e CEP vira USA', () => {
  const wos = 'PT\tAU\tAF\tTI\tSO\tLA\tDE\tAB\tC1\tTC\tPY\tDI\nJ\tA, B\tAa, Bb\tTítulo\tSO\tEnglish\tk\tr\t[Aa, Bb] Univ Colorado, Boulder, CO 80309 USA; [Cc] Univ Arizona, Tucson, AZ 85721 USA\t1\t2020\t10.1/usa\n';
  assert.deepEqual(parseWosTabDelimited(wos)[0].paises, ['USA']);
});

test('o erro de formato desconhecido diz quais formatos são aceitos', () => {
  assert.throws(() => parseFile('lixo', 'a.txt'), /Scopus.*Web of Science.*BibTeX.*RIS/s);
});
