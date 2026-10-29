import { normalizeTitle } from './schema.js';

const NAO_INFORMADO = 'não informado';

export function producaoPorAno(estudos) {
  const contagem = new Map();
  for (const e of estudos) contagem.set(e.ano, (contagem.get(e.ano) ?? 0) + 1);
  return [...contagem.entries()]
    .map(([ano, total]) => ({ ano, total }))
    .sort((x, y) => (x.ano === null) - (y.ano === null) || x.ano - y.ano);
}

function valoresDe(estudo, campo) {
  const v = estudo[campo];
  if (Array.isArray(v)) return v.length > 0 ? v : [NAO_INFORMADO];
  return [v == null || v === '' ? NAO_INFORMADO : v];
}

export function topContagem(estudos, campo, n) {
  const grupos = new Map();
  for (const e of estudos) {
    for (const valor of new Set(valoresDe(e, campo))) {
      const chave = campo === 'periodico' && valor !== NAO_INFORMADO ? normalizeTitle(valor) || valor : valor;
      const grupo = grupos.get(chave) ?? { total: 0, formas: new Map() };
      grupo.total++;
      grupo.formas.set(valor, (grupo.formas.get(valor) ?? 0) + 1);
      grupos.set(chave, grupo);
    }
  }
  const nomeDe = (formas) => [...formas.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))[0][0];
  return [...grupos.values()]
    .map((g) => ({ nome: nomeDe(g.formas), total: g.total }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome))
    .slice(0, n);
}

export function idiomaPorAno(estudos) {
  const contagem = new Map();
  for (const e of estudos) {
    const idioma = e.idioma ?? NAO_INFORMADO;
    const chave = `${e.ano}|${idioma}`;
    const atual = contagem.get(chave) ?? { ano: e.ano, idioma, total: 0 };
    atual.total++;
    contagem.set(chave, atual);
  }
  return [...contagem.values()].sort((a, b) => (a.ano === null) - (b.ano === null) || a.ano - b.ano || a.idioma.localeCompare(b.idioma));
}

export function citacoesTotais(estudos) {
  return estudos.reduce((soma, e) => soma + (e.citacoes ?? 0), 0);
}
