import { estudosAtivos } from './coding.js';
import { normalizeTitle } from './schema.js';
import { paisesCanonicos } from './geo.js';

export function filtrosVazios() {
  return {
    periodo: null,
    eixos: [],
    paises: [],
    autores: [],
    periodicos: [],
    idiomas: [],
    tiposSitio: [],
    metodos: [],
    problematicas: [],
  };
}

const interseta = (selecionados, valores) => selecionados.some((s) => valores.includes(s));

const CAMPOS_CODIFICADOS = [
  ['eixos', 'eixos'],
  ['tiposSitio', 'tiposSitio'],
  ['metodos', 'metodosAvaliacao'],
  ['problematicas', 'problematicas'],
];

function passaBibliograficos(e, f, periodicosNormalizados) {
  if (f.periodo) {
    if (e.ano == null || e.ano < f.periodo[0] || e.ano > f.periodo[1]) return false;
  }
  if (f.paises.length > 0 && !interseta(f.paises, paisesCanonicos(e.paises))) return false;
  if (f.autores.length > 0 && !interseta(f.autores, e.autores)) return false;
  if (periodicosNormalizados.length > 0 && !periodicosNormalizados.includes(normalizeTitle(e.periodico))) return false;
  if (f.idiomas.length > 0 && !f.idiomas.includes(e.idioma)) return false;
  return true;
}

export function aplicarFiltros(estudos, cods, f) {
  const porEstudo = new Map(cods.map((c) => [c.estudoId, c]));
  const filtroCodificado = CAMPOS_CODIFICADOS.filter(([chave]) => f[chave].length > 0);
  const periodicosNormalizados = f.periodicos.map(normalizeTitle);
  let semCodificacaoIgnorados = 0;
  const resultado = [];
  for (const e of estudosAtivos(estudos, cods)) {
    if (!passaBibliograficos(e, f, periodicosNormalizados)) continue;
    if (filtroCodificado.length > 0) {
      const c = porEstudo.get(e.id);
      if (!c) { semCodificacaoIgnorados++; continue; }
      if (!filtroCodificado.every(([chave, campo]) => interseta(f[chave], c[campo]))) continue;
    }
    resultado.push(e);
  }
  return { estudos: resultado, semCodificacaoIgnorados };
}
