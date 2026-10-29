import { h, vazio, numero } from './dom.js';
import { MUNDO } from './mundo.generated.js';

const css = (nome) => getComputedStyle(document.documentElement).getPropertyValue(nome).trim();
export const serie = (i) => css(`--s${(i % 6) + 1}`);

const SVG = 'http://www.w3.org/2000/svg';
function s(tag, attrs = {}, ...filhos) {
  const el = document.createElementNS(SVG, tag);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
  for (const f of filhos) el.append(typeof f === 'string' ? document.createTextNode(f) : f);
  return el;
}

function criarGrafico(container, config, altura) {
  const Chart = globalThis.Chart;
  if (!Chart) {
    container.append(h('div', { class: 'aviso' }, 'Os gráficos não carregaram. Recarregue a página.'));
    return;
  }
  const caixa = h('div', { class: 'chart', style: `height:${altura}px` });
  const canvas = h('canvas');
  caixa.append(canvas);
  container.append(caixa);
  Chart.defaults.color = css('--muted');
  Chart.defaults.borderColor = css('--line');
  Chart.defaults.font.family = css('--font-ui');
  new Chart(canvas, config);
}

export function kpis(container, itens) {
  container.append(
    h('div', { class: 'kpis' }, itens.map((i) => h('div', { class: 'kpi' }, h('b', null, typeof i.valor === 'number' ? numero(i.valor) : i.valor), h('span', null, i.rotulo)))),
  );
}

export function avisosDaPagina(container, ctx, { qualitativa = false } = {}) {
  if (ctx.filtrados.length === 0) {
    container.append(h('div', { class: 'aviso' }, 'Nenhum estudo corresponde aos filtros atuais. Ajuste ou limpe os filtros, ou importe estudos na página Importação.'));
    return;
  }
  if (qualitativa && ctx.codsFiltrados.length === 0) {
    container.append(h('div', { class: 'aviso' }, 'Ainda não há estudos codificados nesta seleção. Os gráficos desta página aparecem depois da codificação (página Codificação).'));
  }
  if (ctx.semCodificacaoIgnorados > 0) {
    container.append(h('div', { class: 'aviso' }, `${numero(ctx.semCodificacaoIgnorados)} estudo(s) ficaram de fora porque os filtros usam campos codificados e eles ainda não foram codificados.`));
  }
}

export function barras(container, dados, { horizontal = true, max = 15 } = {}) {
  const itens = dados.slice(0, max);
  if (itens.length === 0) return vazio(container);
  const altura = horizontal ? Math.max(150, itens.length * 26 + 40) : 260;
  const escalaValor = { beginAtZero: true, ticks: { precision: 0 } };
  criarGrafico(
    container,
    {
      type: 'bar',
      data: { labels: itens.map((i) => i.nome), datasets: [{ data: itens.map((i) => i.total), backgroundColor: serie(0), borderRadius: 2 }] },
      options: {
        indexAxis: horizontal ? 'y' : 'x',
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: horizontal ? { x: escalaValor, y: { ticks: { autoSkip: false } } } : { y: escalaValor },
      },
    },
    altura,
  );
}

export function linhaTempo(container, dados) {
  barras(container, dados.map((d) => ({ nome: d.ano == null ? 'não informado' : String(d.ano), total: d.total })), { horizontal: false, max: 300 });
}

export function barrasEmpilhadas(container, linhas) {
  if (linhas.length === 0) return vazio(container);
  const anos = [...new Set(linhas.map((l) => l.ano))];
  const idiomas = [...new Set(linhas.map((l) => l.idioma))];
  const datasets = idiomas.map((idioma, i) => ({
    label: idioma,
    backgroundColor: serie(i),
    data: anos.map((ano) => linhas.find((l) => l.ano === ano && l.idioma === idioma)?.total ?? 0),
  }));
  criarGrafico(
    container,
    {
      type: 'bar',
      data: { labels: anos.map((a) => (a == null ? 'não informado' : String(a))), datasets },
      options: {
        maintainAspectRatio: false,
        plugins: { legend: { position: 'bottom' } },
        scales: { x: { stacked: true }, y: { stacked: true, beginAtZero: true, ticks: { precision: 0 } } },
      },
    },
    300,
  );
}

export function rede(container, r, { maxNos = 40 } = {}) {
  const nos = r.nos.slice(0, maxNos);
  const ids = new Set(nos.map((n) => n.id));
  const arestas = r.arestas.filter((a) => ids.has(a.a) && ids.has(a.b));
  if (nos.length === 0 || arestas.length === 0) {
    return vazio(container, 'Sem conexões suficientes para desenhar a rede. Reduza o peso mínimo ou importe mais estudos.');
  }
  const L = 720;
  const A = 520;
  const raio = Math.min(L, A) / 2 - 80;
  const pos = new Map(
    nos.map((n, i) => {
      const ang = (i / nos.length) * 2 * Math.PI - Math.PI / 2;
      return [n.id, { x: L / 2 + raio * Math.cos(ang), y: A / 2 + raio * Math.sin(ang), cos: Math.cos(ang) }];
    }),
  );
  const maxPeso = Math.max(...arestas.map((a) => a.peso));
  const maxTotal = Math.max(...nos.map((n) => n.total));
  const svg = s('svg', { viewBox: `0 0 ${L} ${A}`, role: 'img', 'aria-label': 'Rede' });
  for (const a of arestas) {
    const p = pos.get(a.a);
    const q = pos.get(a.b);
    svg.append(
      s('line', { x1: p.x, y1: p.y, x2: q.x, y2: q.y, stroke: serie(0), 'stroke-opacity': 0.2 + (0.6 * a.peso) / maxPeso, 'stroke-width': 1 + (3 * a.peso) / maxPeso }, s('title', {}, `${a.a} e ${a.b}: ${a.peso}`)),
    );
  }
  for (const n of nos) {
    const p = pos.get(n.id);
    const r0 = 4 + 8 * Math.sqrt(n.total / maxTotal);
    svg.append(s('circle', { cx: p.x, cy: p.y, r: r0, fill: serie(1), stroke: css('--surface'), 'stroke-width': 1.5 }, s('title', {}, `${n.id}: ${n.total}`)));
    const rotulo = n.id.length > 24 ? `${n.id.slice(0, 23)}…` : n.id;
    const dir = p.cos >= 0 ? 1 : -1;
    svg.append(s('text', { x: p.x + dir * (r0 + 4), y: p.y + 4, 'text-anchor': dir > 0 ? 'start' : 'end', 'font-size': 11, fill: css('--ink') }, rotulo));
  }
  container.append(h('div', { class: 'rede' }, svg));
}

const LARGURA = 1000;
const ALTURA = 575;

function projetar(lng, lat) {
  const l = (lng * Math.PI) / 180;
  const f = (lat * Math.PI) / 180;
  const f2 = f * f;
  const f4 = f2 * f2;
  const x = l * (0.8707 - 0.131979 * f2 + f4 * (-0.013791 + f4 * (0.003971 * f2 - 0.001529 * f4)));
  const y = f * (1.007226 + f2 * (0.015085 + f4 * (-0.044475 + 0.028874 * f2 - 0.005916 * f4)));
  return [LARGURA / 2 + x * 182.8, ALTURA / 2 - y * 182.8];
}

let caminhos = null;
function caminhosDoMundo() {
  if (caminhos) return caminhos;
  const anel = (r) => r.map(([lng, lat], i) => { const [x, y] = projetar(lng, lat); return `${i ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`; }).join('') + 'Z';
  caminhos = MUNDO.map((p) => {
    const poligonos = p.tipo === 'Polygon' ? [p.coordenadas] : p.coordenadas;
    return { nome: p.nome, d: poligonos.map((pol) => pol.map(anel).join('')).join('') };
  });
  return caminhos;
}

function baseDoMapa(preenchimento) {
  const svg = s('svg', { viewBox: `0 0 ${LARGURA} ${ALTURA}`, role: 'img', 'aria-label': 'Mapa-múndi' });
  for (const c of caminhosDoMundo()) {
    const { fill, titulo } = preenchimento(c.nome);
    svg.append(s('path', { d: c.d, style: `fill:${fill}` }, ...(titulo ? [s('title', {}, titulo)] : [])));
  }
  return svg;
}

export function mapaPaises(container, contagem) {
  if (contagem.length === 0) return vazio(container, 'Nenhum país reconhecido para mapear.');
  const porPais = new Map(contagem.map((c) => [c.pais, c.total]));
  const max = Math.max(...contagem.map((c) => c.total));
  const svg = baseDoMapa((nome) => {
    const total = porPais.get(nome);
    if (!total) return { fill: 'var(--surface-2)', titulo: nome };
    const pct = Math.round(18 + 82 * Math.sqrt(total / max));
    return { fill: `color-mix(in srgb, var(--accent) ${pct}%, var(--surface-2))`, titulo: `${nome}: ${total}` };
  });
  container.append(
    h('div', { class: 'mapa' }, svg),
    h('div', { class: 'legenda' }, '1', h('i'), numero(max), ' estudos por país'),
  );
}

export function mapaPontos(container, pontos) {
  if (pontos.length === 0) return vazio(container, 'Nenhum ponto com coordenadas válidas.');
  const svg = baseDoMapa((nome) => ({ fill: 'var(--surface-2)', titulo: nome }));
  for (const p of pontos) {
    const [x, y] = projetar(p.lng, p.lat);
    svg.append(s('circle', { cx: x.toFixed(1), cy: y.toFixed(1), r: 4.5, fill: serie(1), stroke: css('--surface'), 'stroke-width': 1.2 }, s('title', {}, p.nome || 'sem nome')));
  }
  container.append(h('div', { class: 'mapa' }, svg));
}

export function matriz(container, r, { maxLinhas = 25, maxColunas = 14 } = {}) {
  if (r.linhas.length === 0) return vazio(container, 'Sem codificações suficientes para cruzar estas categorias.');
  const linhas = r.linhas.slice(0, maxLinhas);
  const colunas = r.colunas.slice(0, maxColunas);
  const max = Math.max(1, ...r.celulas.flat());
  const tabela = h(
    'table',
    { class: 'matriz' },
    h('thead', null, h('tr', null, h('th', null, ''), colunas.map((c) => h('th', null, c)))),
    h(
      'tbody',
      null,
      linhas.map((linha, i) =>
        h(
          'tr',
          null,
          h('th', { scope: 'row' }, linha),
          colunas.map((_, j) => {
            const v = r.celulas[i][j];
            return h('td', { class: `cel${v === 0 ? ' zero' : ''}`, title: `${linha} × ${colunas[j]}: ${v}`, style: v > 0 ? `background:color-mix(in srgb, var(--accent) ${Math.round(15 + 70 * (v / max))}%, transparent)` : null }, v);
          }),
        ),
      ),
    ),
  );
  container.append(h('div', { class: 'tabela' }, tabela));
  if (r.linhas.length > maxLinhas || r.colunas.length > maxColunas) {
    container.append(h('div', { class: 'legenda' }, `Mostrando ${linhas.length} de ${r.linhas.length} linhas e ${colunas.length} de ${r.colunas.length} colunas.`));
  }
  if (r.menosEstudadas.length > 0) {
    container.append(
      h('div', { class: 'legenda' }, 'Menos estudadas:'),
      h('div', { class: 'chips' }, r.menosEstudadas.slice(0, 8).map((m) => h('span', { class: 'chip' }, `${m.a} × ${m.b} (${m.total})`))),
    );
  }
}
