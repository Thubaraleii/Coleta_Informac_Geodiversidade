import { h, limpar, numero, adicionar } from './dom.js';
import { parseFile } from '../parsers/index.js';

const NOMES_BASE = { scopus: 'Scopus', wos: 'Web of Science', bibtex: 'BibTeX', ris: 'RIS' };

function resumoDaBase(estudos) {
  const porBase = new Map();
  for (const e of estudos) for (const b of e.bases) porBase.set(b, (porBase.get(b) ?? 0) + 1);
  return h(
    'div',
    { class: 'kpis' },
    h('div', { class: 'kpi' }, h('b', null, numero(estudos.length)), h('span', null, 'estudos na base')),
    h('div', { class: 'kpi' }, h('b', null, numero(estudos.filter((e) => e.incompleto).length)), h('span', null, 'com dados incompletos')),
    h('div', { class: 'kpi' }, h('b', null, numero(estudos.filter((e) => !e.doi).length)), h('span', null, 'sem DOI')),
    [...porBase.entries()].map(([b, n]) => h('div', { class: 'kpi' }, h('b', null, numero(n)), h('span', null, `de ${NOMES_BASE[b] ?? b}`))),
  );
}

export function render(container, ctx) {
  const { acoes } = ctx;
  const saida = h('div', { class: 'pilha', 'aria-live': 'polite' });
  const input = h('input', { type: 'file', id: 'arquivos', multiple: true, accept: '.csv,.txt,.tsv,.bib,.ris' });
  const botao = h('button', { class: 'primario', type: 'button', disabled: !acoes.podeEscrever() }, 'Importar arquivos');
  const linha = (texto, tipo) => h('div', { class: tipo === 'bad' ? 'aviso' : 'painel' }, texto);
  const caixaBase = h('div');
  const desenharBase = () => limpar(caixaBase).append(resumoDaBase(acoes.estudos()));

  botao.addEventListener('click', async () => {
    const arquivos = [...input.files];
    limpar(saida);
    if (arquivos.length === 0) {
      saida.append(linha('Escolha pelo menos um arquivo.', 'bad'));
      return;
    }
    botao.disabled = true;
    for (const arquivo of arquivos) {
      let lido;
      try {
        lido = parseFile(await arquivo.text(), arquivo.name);
      } catch (e) {
        saida.append(linha(`${arquivo.name}: ${e.message}. Este arquivo não alterou a base.`, 'bad'));
        continue;
      }
      try {
        const r = await acoes.importar(lido.estudos);
        const extra = r.alterados > 0 ? `, ${numero(r.alterados)} atualizados com dados desta base` : '';
        saida.append(linha(`${arquivo.name} (${NOMES_BASE[lido.format]}): ${numero(lido.estudos.length)} lidos, ${numero(r.adicionados)} novos, ${numero(r.duplicados)} duplicados${extra}.`, 'ok'));
      } catch (e) {
        saida.append(linha(`${arquivo.name}: não foi possível salvar (${acoes.mensagemErro(e)}).`, 'bad'));
      }
    }
    desenharBase();
    botao.disabled = !acoes.podeEscrever();
  });

  adicionar(
    container,
    h('h2', null, 'Importação'),
    h('p', { class: 'lead' }, 'Envie exportações da Scopus (CSV), da Web of Science (texto delimitado por tabulação), BibTeX ou RIS. Duplicatas por DOI ou título são unidas e as bases de origem ficam registradas. O arquivo não é guardado, só os registros convertidos. A codificação já feita não muda.'),
    acoes.podeEscrever() ? null : h('div', { class: 'aviso' }, 'Seu acesso é somente leitura: a importação está desativada.'),
    acoes.modo() === 'local' ? h('div', { class: 'aviso' }, 'Modo local: a base existe só nesta aba e some ao fechar a página.') : null,
    h('div', { class: 'painel pilha' }, h('label', { class: 'campo', for: 'arquivos' }, 'Arquivos de exportação', input), h('div', { class: 'acoes' }, botao), saida),
    h('div', { class: 'painel' }, h('h3', null, 'Base atual'), caixaBase),
  );
  desenharBase();
}
