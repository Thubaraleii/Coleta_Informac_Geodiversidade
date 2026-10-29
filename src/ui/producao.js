import { h, limpar, numero } from './dom.js';
import { producaoPorAno, topContagem, idiomaPorAno, citacoesTotais } from '../metrics.js';
import { coautoria, coocorrencia } from '../networks.js';
import { paisesCanonicos } from '../geo.js';
import { kpis, barras, linhaTempo, barrasEmpilhadas, rede, avisosDaPagina } from './charts.js';

function painel(titulo, desenhar) {
  const el = h('section', { class: 'painel' }, h('h3', null, titulo));
  desenhar(el);
  return el;
}

function redeComPeso(titulo, calcular, pesoInicial, id) {
  const caixa = h('div');
  const desenhar = (peso) => {
    limpar(caixa);
    rede(caixa, calcular(peso));
  };
  const seletor = h('label', { class: 'campo', for: id }, 'Peso mínimo da conexão', h('select', { id, onChange: (e) => desenhar(Number(e.target.value)) }, [1, 2, 3, 5].map((n) => h('option', { value: n, selected: n === pesoInicial }, `${n} ou mais estudos`))));
  desenhar(pesoInicial);
  return h('section', { class: 'painel pilha' }, h('h3', null, titulo), seletor, caixa);
}

export function render(container, ctx) {
  const e = ctx.filtrados;
  container.append(
    h('h2', null, 'Produção e colaboração'),
    h('p', { class: 'lead' }, 'Evolução das publicações, autores, periódicos, idiomas e redes de coautoria e de palavras-chave, considerando os filtros ativos.'),
  );
  avisosDaPagina(container, ctx);
  if (e.length === 0) return;
  const autoresUnicos = new Set(e.flatMap((x) => x.autores)).size;
  const periodicos = new Set(e.map((x) => x.periodico).filter(Boolean)).size;
  const comPaises = e.map((x) => ({ ...x, paises: paisesCanonicos(x.paises) }));
  const paises = new Set(comPaises.flatMap((x) => x.paises)).size;
  kpis(container, [
    { valor: e.length, rotulo: 'estudos' },
    { valor: autoresUnicos, rotulo: 'autores' },
    { valor: periodicos, rotulo: 'periódicos' },
    { valor: paises, rotulo: 'países de afiliação' },
    { valor: citacoesTotais(e), rotulo: 'citações somadas' },
    { valor: `${Math.round((e.filter((x) => x.incompleto).length / e.length) * 100)}%`, rotulo: 'com dados incompletos' },
  ]);
  container.append(
    painel('Publicações por ano', (el) => linhaTempo(el, producaoPorAno(e))),
    h('div', { class: 'grade' },
      painel('Autores mais produtivos', (el) => barras(el, topContagem(e, 'autores', 15))),
      painel('Periódicos mais frequentes', (el) => barras(el, topContagem(e, 'periodico', 15))),
      painel('Idiomas', (el) => barras(el, topContagem(e, 'idioma', 10))),
      painel('Países de afiliação dos autores', (el) => barras(el, topContagem(comPaises, 'paises', 15))),
    ),
    painel('Idiomas ao longo do tempo', (el) => barrasEmpilhadas(el, idiomaPorAno(e))),
    redeComPeso('Rede de coautoria (autores que publicaram juntos)', (p) => coautoria(e, p), 1, 'peso-coautoria'),
    redeComPeso('Rede de coocorrência de palavras-chave', (p) => coocorrencia(e, p), 2, 'peso-palavras'),
  );
  container.append(h('div', { class: 'legenda' }, `${numero(e.length)} estudos nesta seleção.`));
}
