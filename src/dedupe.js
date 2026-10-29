import { normalizeTitle } from './schema.js';

function vazio(v) {
  return v == null || v === '' || (Array.isArray(v) && v.length === 0);
}

function fundir(existente, novo) {
  const r = { ...existente, bases: [...new Set([...existente.bases, ...novo.bases])] };
  for (const campo of ['titulo', 'autores', 'ano', 'periodico', 'doi', 'resumo', 'palavrasChave', 'idioma', 'paises', 'citacoes']) {
    if (vazio(r[campo]) && !vazio(novo[campo])) r[campo] = novo[campo];
  }
  r.incompleto = vazio(r.resumo) || vazio(r.palavrasChave);
  return r;
}

export function mergeEstudos(existentes, novos) {
  const porId = new Map(existentes.map((e) => [e.id, e]));
  const porDoi = new Map();
  const porTitulo = new Map();
  const indexar = (e) => {
    if (e.doi && !porDoi.has(e.doi)) porDoi.set(e.doi, e.id);
    const t = normalizeTitle(e.titulo);
    if (t && !porTitulo.has(t)) porTitulo.set(t, e.id);
  };
  existentes.forEach(indexar);

  let adicionados = 0;
  let duplicados = 0;
  let alterados = 0;
  for (const novo of novos) {
    let alvoId = porId.has(novo.id) ? novo.id : (novo.doi ? porDoi.get(novo.doi) : undefined);
    if (!alvoId) {
      const candidato = porId.get(porTitulo.get(normalizeTitle(novo.titulo)));
      if (candidato && (!candidato.doi || !novo.doi)) alvoId = candidato.id;
    }
    if (alvoId) {
      const atual = porId.get(alvoId);
      const fundido = fundir(atual, novo);
      if (JSON.stringify(fundido) !== JSON.stringify(atual)) alterados++;
      porId.set(alvoId, fundido);
      indexar(fundido);
      duplicados++;
    } else {
      porId.set(novo.id, novo);
      indexar(novo);
      adicionados++;
    }
  }
  return { resultado: [...porId.values()], adicionados, duplicados, alterados };
}
