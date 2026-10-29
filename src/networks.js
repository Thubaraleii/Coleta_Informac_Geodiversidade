const MAX_NOS = 100;

function montarRede(estudos, campo, normalizar, minPeso) {
  const listas = estudos.map((e) => [...new Set(e[campo].map(normalizar).filter(Boolean))]);
  const totais = new Map();
  for (const lista of listas) for (const item of lista) totais.set(item, (totais.get(item) ?? 0) + 1);

  const nos = [...totais.entries()]
    .map(([id, total]) => ({ id, total }))
    .sort((a, b) => b.total - a.total || a.id.localeCompare(b.id))
    .slice(0, MAX_NOS);
  const mantidos = new Set(nos.map((n) => n.id));

  const pares = new Map();
  for (const lista of listas) {
    const itens = lista.filter((i) => mantidos.has(i)).sort();
    for (let i = 0; i < itens.length; i++) {
      for (let j = i + 1; j < itens.length; j++) {
        const chave = `${itens[i]}\u0000${itens[j]}`;
        pares.set(chave, (pares.get(chave) ?? 0) + 1);
      }
    }
  }
  const arestas = [...pares.entries()]
    .filter(([, peso]) => peso >= minPeso)
    .map(([chave, peso]) => {
      const [a, b] = chave.split('\u0000');
      return { a, b, peso };
    })
    .sort((x, y) => y.peso - x.peso || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
  return { nos, arestas };
}

export function coocorrencia(estudos, minPeso) {
  return montarRede(estudos, 'palavrasChave', (k) => String(k).trim().toLowerCase(), minPeso);
}

export function coautoria(estudos, minPeso) {
  return montarRede(estudos, 'autores', (a) => String(a).trim(), minPeso);
}
