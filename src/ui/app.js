import { createStore, memoryAdapter } from '../store.js';
import { artifactDbAdapter } from './db-adapter.js';
import { aplicarFiltros, filtrosVazios } from '../filters.js';
import { proporcaoCodificada } from '../coding.js';
import { setNomesAtlas } from '../geo.js';
import { MUNDO } from './mundo.generated.js';
import { h, limpar, numero } from './dom.js';
import { render as producao } from './producao.js';
import { render as geografia } from './geografia.js';
import { render as sitios } from './sitios.js';
import { render as problematicas } from './problematicas.js';
import { render as viewpoints } from './viewpoints.js';
import { render as lacunas } from './lacunas.js';
import { render as documental } from './documental.js';
import { render as registros } from './registros.js';
import { render as codificacao } from './codificacao.js';
import { render as importacao } from './importacao.js';

const PAGINAS = {
  producao: { render: producao, filtros: true },
  geografia: { render: geografia, filtros: true },
  sitios: { render: sitios, filtros: true },
  problematicas: { render: problematicas, filtros: true },
  viewpoints: { render: viewpoints, filtros: true },
  lacunas: { render: lacunas, filtros: true },
  documental: { render: documental, filtros: false },
  registros: { render: registros, filtros: false },
  codificacao: { render: codificacao, filtros: false },
  importacao: { render: importacao, filtros: false },
};

const estado = {
  estudos: [],
  cods: [],
  categorias: null,
  documentos: [],
  filtros: filtrosVazios(),
  pagina: 'producao',
  selecionado: null,
  modo: 'carregando',
  podeEscrever: true,
  erroCarga: null,
};
let store = null;

function mensagemErro(e) {
  switch (e?.code) {
    case 'quota_exceeded': return 'O limite de armazenamento do banco foi atingido. Remova dados ou reduza a base.';
    case 'invalid_argument': return 'Seu acesso não permite gravar neste painel. Peça ao dono do painel acesso de colaborador.';
    case 'resource_exhausted': return 'Muitas operações seguidas. Aguarde um instante e tente de novo.';
    case 'revoked': return 'O acesso a este painel mudou. Recarregue a página.';
    default: return e?.message || 'Erro desconhecido ao gravar.';
  }
}

const acoes = {
  mensagemErro,
  podeEscrever: () => estado.podeEscrever,
  modo: () => estado.modo,
  async salvarEstudos(lista) {
    await store.saveEstudos(lista);
    estado.estudos = lista;
    desenharStatus();
  },
  async salvarCodificacao(cod) {
    await store.saveCodificacao(cod);
    const i = estado.cods.findIndex((c) => c.estudoId === cod.estudoId);
    if (i >= 0) estado.cods[i] = cod;
    else estado.cods.push(cod);
    desenharStatus();
  },
  async salvarCategorias(categorias) {
    await store.saveCategorias(categorias);
    estado.categorias = categorias;
  },
  async salvarDocumento(doc) {
    await store.saveDocumento(doc);
    const i = estado.documentos.findIndex((d) => d.id === doc.id);
    if (i >= 0) estado.documentos[i] = doc;
    else estado.documentos.push(doc);
  },
  async removerDocumento(id) {
    await store.removeDocumento(id);
    estado.documentos = estado.documentos.filter((d) => d.id !== id);
  },
  selecionar(id) { estado.selecionado = id; },
  irPara(pagina, estudoId) {
    if (estudoId !== undefined) estado.selecionado = estudoId;
    navegar(pagina);
  },
};

function contexto() {
  const { estudos: filtrados, semCodificacaoIgnorados } = aplicarFiltros(estado.estudos, estado.cods, estado.filtros);
  const ids = new Set(filtrados.map((e) => e.id));
  return {
    estudos: estado.estudos,
    cods: estado.cods,
    categorias: estado.categorias,
    documentos: estado.documentos,
    filtrados,
    codsFiltrados: estado.cods.filter((c) => ids.has(c.estudoId)),
    filtros: estado.filtros,
    semCodificacaoIgnorados,
    selecionado: estado.selecionado,
    acoes,
  };
}

function desenharStatus() {
  const el = document.getElementById('status');
  const p = proporcaoCodificada(estado.estudos, estado.cods);
  const pct = p.total === 0 ? 0 : Math.round((p.codificados / p.total) * 100);
  const partes = [
    h('span', null, `${numero(p.total)} estudos`),
    h('span', null, `${numero(p.codificados)} codificados (${pct}%)`),
    h('span', { class: 'barra-codificada', role: 'img', 'aria-label': `${pct}% codificado` }, h('i', { style: `width:${pct}%` })),
  ];
  if (estado.modo === 'local') partes.push(h('span', { class: 'pill pend' }, 'Modo local: nada é salvo ao fechar'));
  else if (estado.modo === 'banco') partes.push(h('span', { class: 'pill ok' }, estado.podeEscrever ? 'Banco compartilhado' : 'Somente leitura'));
  if (estado.erroCarga) partes.push(h('span', { class: 'pill bad' }, estado.erroCarga));
  limpar(el).append(...partes);
}

const ROTULO_FILTROS = [
  ['eixos', 'Eixo temático'],
  ['paises', 'País (afiliação)'],
  ['autores', 'Autor'],
  ['periodicos', 'Periódico'],
  ['idiomas', 'Idioma'],
  ['tiposSitio', 'Tipo de sítio'],
  ['metodos', 'Método'],
  ['problematicas', 'Problemática'],
];

function opcoesDeFiltro(chave) {
  const contar = (valores) => {
    const m = new Map();
    for (const v of valores) if (v) m.set(v, (m.get(v) ?? 0) + 1);
    return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0])).slice(0, 300).map(([v]) => v);
  };
  const nomes = (campo) => (estado.categorias?.[campo] ?? []).map((c) => c.nome);
  switch (chave) {
    case 'eixos': return nomes('eixos');
    case 'tiposSitio': return nomes('tiposSitio');
    case 'metodos': return nomes('metodosAvaliacao');
    case 'problematicas': return nomes('problematicas');
    case 'paises': return contar(estado.estudos.flatMap((e) => e.paises)).sort((a, b) => a.localeCompare(b));
    case 'autores': return contar(estado.estudos.flatMap((e) => e.autores));
    case 'periodicos': return contar(estado.estudos.map((e) => e.periodico));
    case 'idiomas': return contar(estado.estudos.map((e) => e.idioma));
    default: return [];
  }
}

function seletorMultiplo(chave, rotulo) {
  const selecionados = estado.filtros[chave];
  const select = h(
    'select',
    {
      id: `filtro-${chave}`,
      onChange: (e) => {
        const v = e.target.value;
        if (v && !selecionados.includes(v)) { selecionados.push(v); atualizar(); }
      },
    },
    h('option', { value: '' }, 'Adicionar…'),
    opcoesDeFiltro(chave).map((o) => h('option', { value: o }, o.length > 60 ? `${o.slice(0, 59)}…` : o)),
  );
  return h(
    'label',
    { class: 'campo', for: `filtro-${chave}` },
    rotulo,
    select,
    h('span', { class: 'chips' }, selecionados.map((v) => h('span', { class: 'chip' }, v, h('button', { type: 'button', 'aria-label': `Remover ${v}`, onClick: () => { selecionados.splice(selecionados.indexOf(v), 1); atualizar(); } }, '×')))),
  );
}

function contarFiltrosAtivos() {
  const f = estado.filtros;
  return (f.periodo ? 1 : 0) + ROTULO_FILTROS.reduce((n, [k]) => n + (f[k].length > 0 ? 1 : 0), 0);
}

function desenharFiltros() {
  const el = document.getElementById('filtros');
  el.hidden = !PAGINAS[estado.pagina].filtros;
  const ativos = contarFiltrosAtivos();
  const anos = estado.estudos.map((e) => e.ano).filter((a) => a != null);
  const [min, max] = anos.length ? [Math.min(...anos), Math.max(...anos)] : [1990, 2030];
  const periodo = estado.filtros.periodo ?? [min, max];
  const aplicarPeriodo = (i, valor) => {
    const novo = [...periodo];
    novo[i] = Number(valor);
    estado.filtros.periodo = novo[0] <= min && novo[1] >= max ? null : novo;
    atualizar();
  };
  const sumario = h('summary', null, 'Filtros', ativos > 0 ? h('span', { class: 'pill ok' }, `${ativos} ativo(s)`) : null, ativos > 0 ? h('button', { type: 'button', class: 'link', onClick: (e) => { e.preventDefault(); estado.filtros = filtrosVazios(); atualizar(); } }, 'Limpar') : null);
  const conteudo = h(
    'div',
    { class: 'conteudo' },
    h('label', { class: 'campo', for: 'filtro-ini' }, 'Período (de)', h('input', { type: 'number', id: 'filtro-ini', min, max, value: periodo[0], onChange: (e) => aplicarPeriodo(0, e.target.value) })),
    h('label', { class: 'campo', for: 'filtro-fim' }, 'Período (até)', h('input', { type: 'number', id: 'filtro-fim', min, max, value: periodo[1], onChange: (e) => aplicarPeriodo(1, e.target.value) })),
    ROTULO_FILTROS.map(([k, r]) => seletorMultiplo(k, r)),
  );
  limpar(el).append(sumario, conteudo);
}

function desenharPagina() {
  const alvo = limpar(document.getElementById('conteudo'));
  try {
    PAGINAS[estado.pagina].render(alvo, contexto());
  } catch (e) {
    console.error(e);
    alvo.append(h('div', { class: 'aviso' }, `Não foi possível desenhar esta página: ${e.message}`));
  }
}

function marcarNavegacao() {
  for (const b of document.querySelectorAll('nav.paginas button[data-pagina]')) {
    if (b.dataset.pagina === estado.pagina) b.setAttribute('aria-current', 'page');
    else b.removeAttribute('aria-current');
  }
}

function atualizar() {
  marcarNavegacao();
  desenharFiltros();
  desenharPagina();
}

function navegar(pagina) {
  if (!PAGINAS[pagina]) return;
  estado.pagina = pagina;
  try { history.replaceState(null, '', `#${pagina}`); } catch { /* ambiente sem history */ }
  atualizar();
  window.scrollTo?.(0, 0);
}

async function esperarClaude() {
  for (let i = 0; i < 15 && !globalThis.claude?.use; i++) await new Promise((r) => setTimeout(r, 100));
}

async function iniciar() {
  setNomesAtlas(MUNDO.map((p) => p.nome));
  for (const b of document.querySelectorAll('nav.paginas button[data-pagina]')) b.addEventListener('click', () => navegar(b.dataset.pagina));
  const inicial = location.hash.slice(1);
  if (PAGINAS[inicial]) estado.pagina = inicial;

  await esperarClaude();
  let adapter = null;
  try { adapter = await artifactDbAdapter(); } catch { adapter = null; }
  estado.modo = adapter ? 'banco' : 'local';
  store = createStore(adapter ?? memoryAdapter());

  try {
    const usuario = await globalThis.claude?.use?.('user');
    if (usuario && (await usuario.can('data.write')) === false) estado.podeEscrever = false;
  } catch { /* sem informação de permissão: mantém os campos editáveis */ }

  try {
    [estado.estudos, estado.cods, estado.categorias, estado.documentos] = await Promise.all([
      store.listEstudos(), store.getCodificacoes(), store.getCategorias(), store.listDocumentos(),
    ]);
  } catch (e) {
    estado.erroCarga = `Erro ao carregar: ${mensagemErro(e)}`;
    estado.categorias = (await createStore(memoryAdapter()).getCategorias());
  }

  desenharStatus();
  atualizar();
  const redesenhar = () => atualizar();
  matchMedia('(prefers-color-scheme: dark)').addEventListener?.('change', redesenhar);
  new MutationObserver(redesenhar).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
}

iniciar();
