import { makeEstudo } from '../schema.js';
import { linhasComoObjetos, dividir, paisesDeAfiliacoes } from './csv.js';

export function parseWosTabDelimited(texto) {
  return linhasComoObjetos(texto, '\t', false).map((r) => {
    const af = String(r['C1'] ?? '').replace(/\[[^\]]*\]/g, '');
    const completos = dividir(r['AF']);
    return makeEstudo(
      {
        titulo: r['TI'],
        autores: completos.length > 0 ? completos : dividir(r['AU']),
        ano: r['PY'],
        periodico: r['SO'],
        doi: r['DI'],
        resumo: r['AB'],
        palavrasChave: dividir(r['DE']),
        idioma: r['LA'],
        paises: paisesDeAfiliacoes(dividir(af)),
        citacoes: r['TC'],
      },
      'wos',
    );
  });
}
