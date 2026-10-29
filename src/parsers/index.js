import { semBom } from './csv.js';
import { parseScopusCsv } from './scopus.js';
import { parseWosTabDelimited } from './wos.js';
import { parseBibtex, parseRis } from './generic.js';

export { parseScopusCsv, parseWosTabDelimited, parseBibtex, parseRis };

export function detectFormat(texto) {
  const t = semBom(texto);
  const primeira = t.split(/\r?\n/, 1)[0];
  if (/^@\w+\s*\{/m.test(t)) return 'bibtex';
  if (/^TY\s{2}-/m.test(t)) return 'ris';
  if (primeira.startsWith('PT\t') && primeira.includes('\tTI')) return 'wos';
  if (primeira.includes('Authors') && primeira.includes('Title') && primeira.includes('Source title')) return 'scopus';
  return null;
}

const PARSERS = { scopus: parseScopusCsv, wos: parseWosTabDelimited, bibtex: parseBibtex, ris: parseRis };

export function parseFile(texto, nomeArquivo = '') {
  const format = detectFormat(texto, nomeArquivo);
  if (!format) throw new Error('Formato não reconhecido');
  return { format, estudos: PARSERS[format](texto) };
}
