const ROTULO_TEMPORALIDADE = {
  antigo: 'registro geológico antigo',
  herdado: 'forma de relevo herdada',
  recente: 'processo ou registro recente',
  'nao-se-aplica': 'não se aplica',
};

const LIMITE_MENOS_ESTUDADAS = 20;

function valorDoCaminho(cod, caminho) {
  return caminho.split('.').reduce((obj, chave) => (obj == null ? undefined : obj[chave]), cod);
}

function listaDe(cod, campo) {
  const v = valorDoCaminho(cod, campo);
  return Array.isArray(v) ? v : [];
}

function ordenarContagem(mapa) {
  return [...mapa.entries()]
    .map(([nome, total]) => ({ nome, total }))
    .sort((a, b) => b.total - a.total || a.nome.localeCompare(b.nome));
}

export function contagemPorCampo(cods, campo) {
  const mapa = new Map();
  for (const c of cods) {
    for (const v of new Set(listaDe(c, campo))) mapa.set(v, (mapa.get(v) ?? 0) + 1);
  }
  return ordenarContagem(mapa);
}

export function contagemTemporalidade(cods) {
  const mapa = new Map();
  for (const c of cods) {
    const rotulo = ROTULO_TEMPORALIDADE[c.temporalidade];
    if (rotulo) mapa.set(rotulo, (mapa.get(rotulo) ?? 0) + 1);
  }
  return ordenarContagem(mapa);
}

export function resumoViewpoints(cods) {
  const r = { usam: 0, naoUsam: 0, semInformacao: 0 };
  for (const c of cods) {
    const usa = c.viewpoints?.usa;
    if (usa === true) r.usam++;
    else if (usa === false) r.naoUsam++;
    else r.semInformacao++;
  }
  return r;
}

function matriz(pares) {
  const linhas = [...new Set(pares.map(([a]) => a))].sort((x, y) => x.localeCompare(y));
  const colunas = [...new Set(pares.map(([, b]) => b))].sort((x, y) => x.localeCompare(y));
  if (linhas.length === 0 || colunas.length === 0) return { linhas: [], colunas: [], celulas: [], menosEstudadas: [] };
  const celulas = linhas.map(() => colunas.map(() => 0));
  const li = new Map(linhas.map((l, i) => [l, i]));
  const ci = new Map(colunas.map((c, i) => [c, i]));
  for (const [a, b] of pares) celulas[li.get(a)][ci.get(b)]++;
  const todas = [];
  linhas.forEach((a, i) => colunas.forEach((b, j) => todas.push({ a, b, total: celulas[i][j] })));
  todas.sort((x, y) => x.total - y.total || x.a.localeCompare(y.a) || x.b.localeCompare(y.b));
  return { linhas, colunas, celulas, menosEstudadas: todas.slice(0, LIMITE_MENOS_ESTUDADAS) };
}

function paresDe(cod, listaA, listaB) {
  const pares = [];
  for (const a of new Set(listaA)) for (const b of new Set(listaB)) pares.push([a, b]);
  return pares;
}

export function cruzar(cods, campoA, campoB) {
  const pares = [];
  for (const c of cods) pares.push(...paresDe(c, listaDe(c, campoA), listaDe(c, campoB)));
  return matriz(pares);
}

export function cruzarPaisTema(estudos, cods, campo) {
  const ids = new Set(estudos.map((e) => e.id));
  const pares = [];
  for (const c of cods) {
    if (ids.has(c.estudoId)) pares.push(...paresDe(c, c.paisesEstudados, listaDe(c, campo)));
  }
  return matriz(pares);
}

export function limitacoesRecorrentes(cods, n) {
  const mapa = new Map();
  for (const c of cods) {
    const texto = String(c.limitacoes ?? '').toLowerCase().replace(/\s+/g, ' ').trim();
    if (texto) mapa.set(texto, (mapa.get(texto) ?? 0) + 1);
  }
  return [...mapa.entries()]
    .map(([texto, total]) => ({ texto, total }))
    .sort((a, b) => b.total - a.total || a.texto.localeCompare(b.texto))
    .slice(0, n);
}
