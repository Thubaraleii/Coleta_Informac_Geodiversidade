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

  const painelBackup = () => {
    const resultado = h('div', { 'aria-live': 'polite' });
    const mostrar = (texto, erro = false) => limpar(resultado).append(h('div', { class: erro ? 'aviso' : 'chip' }, texto));
    const arquivoBackup = h('input', { type: 'file', id: 'arquivo-backup', accept: '.json,application/json' });
    const exportar = h('button', { type: 'button', class: 'sec', onClick: async () => {
      try {
        const base = await acoes.exportar();
        const data = new Date().toISOString().slice(0, 10);
        const url = URL.createObjectURL(new Blob([JSON.stringify(base)], { type: 'application/json' }));
        const link = h('a', { href: url, download: `base-geodiversidade-${data}.json` });
        document.body.append(link);
        link.click();
        link.remove();
        setTimeout(() => URL.revokeObjectURL(url), 2000);
        mostrar(`Base exportada: ${numero(base.estudos.length)} estudos, ${numero(base.codificacoes.length)} codificações, ${numero(base.documentos.length)} documentos.`);
      } catch (e) { mostrar(`Não foi possível exportar: ${acoes.mensagemErro(e)}`, true); }
    } }, 'Exportar base (JSON)');
    const importar = h('button', { type: 'button', class: 'sec', disabled: !acoes.podeEscrever(), onClick: async () => {
      const arquivo = arquivoBackup.files[0];
      if (!arquivo) { mostrar('Escolha um arquivo de backup (.json).', true); return; }
      let dados;
      try { dados = JSON.parse(await arquivo.text()); } catch { mostrar('O arquivo não é um JSON válido.', true); return; }
      try {
        const r = await acoes.importarBackup(dados);
        mostrar(`Backup somado à base: ${numero(r.estudos.adicionados)} estudos novos, ${numero(r.estudos.alterados)} atualizados, ${numero(r.codificacoes.novas)} codificações novas e ${numero(r.codificacoes.atualizadas)} atualizadas, ${numero(r.categorias.novas)} categorias novas, ${numero(r.documentos.novos)} documentos novos.`);
        desenharBase();
      } catch (e) { mostrar(e.message?.startsWith('Backup inválido') ? e.message : `Não foi possível importar: ${acoes.mensagemErro(e)}`, true); }
    } }, 'Importar backup');
    return h('div', { class: 'painel pilha' },
      h('h3', null, 'Backup da base'),
      h('p', { class: 'lead' }, 'Seus dados ficam só neste navegador. Use o backup para guardar uma cópia ou enviar a sua base a outra pessoa. Ao importar, os estudos são unidos aos que já existem; na codificação do mesmo estudo vale a mais recente, e categorias e documentos só entram se forem novos.'),
      h('div', { class: 'acoes' }, exportar),
      h('label', { class: 'campo', for: 'arquivo-backup' }, 'Arquivo de backup', arquivoBackup),
      h('div', { class: 'acoes' }, importar),
      resultado,
    );
  };

  adicionar(
    container,
    h('h2', null, 'Importação'),
    h('p', { class: 'lead' }, 'Envie exportações da Scopus (CSV), da Web of Science (texto delimitado por tabulação), BibTeX ou RIS. Duplicatas por DOI ou título são unidas e as bases de origem ficam registradas. O arquivo não é guardado, só os registros convertidos. A codificação já feita não muda.'),
    acoes.podeEscrever() ? null : h('div', { class: 'aviso' }, 'Seu acesso é somente leitura: a importação está desativada.'),
    acoes.modo() === 'local' ? h('div', { class: 'aviso' }, 'Modo local: este navegador não permite guardar dados; a base existe só nesta aba e some ao fechar a página. Exporte um backup antes de sair.') : null,
    h('div', { class: 'painel pilha' }, h('label', { class: 'campo', for: 'arquivos' }, 'Arquivos de exportação', input), h('div', { class: 'acoes' }, botao), saida),
    h('div', { class: 'painel' }, h('h3', null, 'Base atual'), caixaBase),
    acoes.modo() === 'banco' ? null : painelBackup(),
  );
  desenharBase();
}
