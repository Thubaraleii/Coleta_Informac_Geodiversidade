import { makeEstudo, registroValido } from '../schema.js';
import { linhasComoObjetos, dividir, paisesDeAfiliacoes, semBom } from './csv.js';

function detectarDelimitador(texto) {
  const primeira = semBom(texto).split(/\r?\n/, 1)[0];
  const conta = (c) => primeira.split(c).length - 1;
  return conta(';') > conta(',') ? ';' : ',';
}

export function parseScopusCsv(texto) {
  return linhasComoObjetos(texto, detectarDelimitador(texto))
    .map((r) => {
      const completos = dividir(r['Author full names']).map((n) => n.replace(/\s*\(\d+\)\s*$/, ''));
      const autores = completos.length > 0 ? completos : dividir(r['Authors'], ',');
      return makeEstudo(
        {
          titulo: r['Title'],
          autores,
          ano: r['Year'],
          periodico: r['Source title'],
          doi: r['DOI'],
          resumo: r['Abstract'],
          palavrasChave: dividir(r['Author Keywords']),
          idioma: r['Language of Original Document'],
          paises: paisesDeAfiliacoes(dividir(r['Affiliations'])),
          citacoes: r['Cited by'],
        },
        'scopus',
      );
    })
    .filter(registroValido);
}
