let atlas = null;

const APELIDOS = {
  'united states of america': 'United States of America',
  'united states': 'United States of America',
  usa: 'United States of America',
  us: 'United States of America',
  eua: 'United States of America',
  'estados unidos': 'United States of America',
  brasil: 'Brazil',
  'peoples r china': 'China',
  'people s republic of china': 'China',
  'peoples republic of china': 'China',
  england: 'United Kingdom',
  scotland: 'United Kingdom',
  wales: 'United Kingdom',
  'northern ireland': 'United Kingdom',
  uk: 'United Kingdom',
  'great britain': 'United Kingdom',
  'reino unido': 'United Kingdom',
  'czech republic': 'Czechia',
  'russian federation': 'Russia',
  turkiye: 'Turkey',
  espanha: 'Spain',
  italia: 'Italy',
  franca: 'France',
  alemanha: 'Germany',
  suica: 'Switzerland',
  'republic of korea': 'South Korea',
  korea: 'South Korea',
  'viet nam': 'Vietnam',
  'syrian arab republic': 'Syria',
  'democratic republic of the congo': 'Dem. Rep. Congo',
  'bosnia and herzegovina': 'Bosnia and Herz.',
  'north macedonia': 'Macedonia',
  'ivory coast': "Côte d'Ivoire",
  'south sudan': 'S. Sudan',
  'dominican republic': 'Dominican Rep.',
  'united republic of tanzania': 'Tanzania',
};

function chave(nome) {
  return String(nome ?? '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/\./g, '')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

export function setNomesAtlas(nomes) {
  atlas = new Map(nomes.map((n) => [chave(n), n]));
}

export function normalizarPais(nome) {
  const k = chave(nome);
  if (k === '') return null;
  const alvo = APELIDOS[k];
  if (alvo) return atlas ? (atlas.get(chave(alvo)) ?? null) : alvo;
  return atlas ? (atlas.get(k) ?? null) : null;
}

export function contagemPaises(nomes) {
  const contagem = new Map();
  const naoMapeados = [];
  for (const nome of nomes) {
    const pais = normalizarPais(nome);
    if (pais) contagem.set(pais, (contagem.get(pais) ?? 0) + 1);
    else if (!naoMapeados.includes(nome)) naoMapeados.push(nome);
  }
  const mapeados = [...contagem.entries()]
    .map(([pais, total]) => ({ pais, total }))
    .sort((a, b) => b.total - a.total || a.pais.localeCompare(b.pais));
  return { mapeados, naoMapeados };
}

const coordenadaValida = (lat, lng) =>
  Number.isFinite(lat) && Number.isFinite(lng) && lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;

export function pontosComCoordenadas(cods, tipo) {
  const pontos = [];
  let semCoordenadas = 0;
  for (const c of cods) {
    const itens = tipo === 'viewpoints' ? c.viewpoints?.pontos ?? [] : c.sitios ?? [];
    for (const p of itens) {
      if (coordenadaValida(p.lat, p.lng)) pontos.push({ nome: p.nome, lat: p.lat, lng: p.lng, estudoId: c.estudoId });
      else semCoordenadas++;
    }
  }
  return { pontos, semCoordenadas };
}
