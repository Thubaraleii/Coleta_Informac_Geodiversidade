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
  const indice = new Map(existentes.map((e) => [e.id, e]));
  let adicionados = 0;
  let duplicados = 0;
  for (const novo of novos) {
    const atual = indice.get(novo.id);
    if (atual) {
      indice.set(novo.id, fundir(atual, novo));
      duplicados++;
    } else {
      indice.set(novo.id, novo);
      adicionados++;
    }
  }
  return { resultado: [...indice.values()], adicionados, duplicados };
}
