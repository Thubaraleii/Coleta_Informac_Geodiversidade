const IDIOMAS = {
  english: 'inglês',
  portuguese: 'português',
  spanish: 'espanhol',
  french: 'francês',
  german: 'alemão',
  italian: 'italiano',
};

export function normalizeDoi(raw) {
  if (raw == null) return null;
  const limpo = String(raw)
    .trim()
    .toLowerCase()
    .replace(/^(https?:\/\/(dx\.)?doi\.org\/|doi:\s*)/, '')
    .trim();
  return limpo === '' ? null : limpo;
}

export function normalizeTitle(raw) {
  return String(raw ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function normalizeAno(raw) {
  const n = Number(raw);
  return Number.isInteger(n) && n >= 1800 && n <= 2100 ? n : null;
}

function normalizeIdioma(raw) {
  if (raw == null || String(raw).trim() === '') return null;
  const texto = String(raw).trim();
  return IDIOMAS[texto.toLowerCase()] ?? texto;
}

function normalizeCitacoes(raw) {
  if (raw == null || raw === '') return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
}

export function makeEstudo(partial, base) {
  const titulo = String(partial.titulo ?? '').trim();
  const doi = normalizeDoi(partial.doi);
  const resumo = String(partial.resumo ?? '').trim();
  const palavrasChave = partial.palavrasChave ?? [];
  return {
    id: doi ?? `t:${normalizeTitle(titulo)}`,
    titulo,
    autores: partial.autores ?? [],
    ano: normalizeAno(partial.ano),
    periodico: String(partial.periodico ?? '').trim(),
    doi,
    resumo,
    palavrasChave,
    idioma: normalizeIdioma(partial.idioma),
    paises: partial.paises ?? [],
    citacoes: normalizeCitacoes(partial.citacoes),
    bases: [base],
    incompleto: resumo === '' || palavrasChave.length === 0,
  };
}
