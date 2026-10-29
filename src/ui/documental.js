import { h, limpar, numero, adicionar } from './dom.js';

const TIPOS = ['lei', 'decreto', 'portaria', 'resolução', 'norma técnica', 'plano ou programa', 'convenção ou tratado', 'documento institucional', 'outro'];
const JURISDICOES = ['internacional', 'nacional', 'estadual ou regional', 'municipal', 'institucional'];
const APLICACOES = ['conservação', 'turismo', 'educação', 'planejamento'];

const novoDocumento = () => ({
  id: `doc-${Date.now().toString(36)}`,
  titulo: '',
  tipoInstrumento: TIPOS[0],
  jurisdicao: JURISDICOES[1],
  orgaoEmissor: '',
  vigencia: '',
  ano: null,
  eixos: [],
  aplicacoes: [],
  dispositivo: '',
});

export function render(container, ctx) {
  const { acoes } = ctx;
  const eixos = (ctx.categorias?.eixos ?? []).map((c) => c.nome);
  let filtroEixo = '';
  let filtroAplicacao = '';
  let rascunho = null;
  let confirmarRemocao = null;

  const lista = h('div', { class: 'tabela' });
  const formulario = h('div', { class: 'pilha' });
  const aviso = h('div', { 'aria-live': 'polite' });

  function mensagem(texto, erro = false) {
    limpar(aviso).append(h('div', { class: erro ? 'aviso' : 'chip' }, texto));
  }

  function checks(rotulo, opcoes, valores) {
    return h('fieldset', null, h('legend', null, rotulo), h('div', { class: 'checks' }, opcoes.map((o) => h('label', null, h('input', { type: 'checkbox', checked: valores.includes(o), onChange: (ev) => { const i = valores.indexOf(o); if (ev.target.checked && i < 0) valores.push(o); if (!ev.target.checked && i >= 0) valores.splice(i, 1); } }), o))));
  }

  function desenharLista() {
    const docs = ctx.documentos
      .filter((d) => (!filtroEixo || d.eixos.includes(filtroEixo)) && (!filtroAplicacao || d.aplicacoes.includes(filtroAplicacao)))
      .sort((a, b) => (b.ano ?? 0) - (a.ano ?? 0) || a.titulo.localeCompare(b.titulo));
    limpar(lista);
    if (docs.length === 0) {
      lista.append(h('div', { class: 'vazio' }, ctx.documentos.length === 0 ? 'Nenhum documento registrado. Use o formulário para cadastrar uma legislação ou documento institucional.' : 'Nenhum documento com estes filtros.'));
      return;
    }
    lista.append(h('table', null,
      h('thead', null, h('tr', null, ['Ano', 'Documento', 'Tipo', 'Jurisdição', 'Eixos', 'Aplicações', ''].map((t) => h('th', null, t)))),
      h('tbody', null, docs.map((d) => h('tr', null,
        h('td', { class: 'num' }, d.ano ?? '—'),
        h('td', null, h('b', null, d.titulo || '(sem título)'), h('div', { class: 'legenda' }, [d.orgaoEmissor, d.vigencia].filter(Boolean).join(' · '))),
        h('td', null, d.tipoInstrumento),
        h('td', null, d.jurisdicao),
        h('td', null, d.eixos.join('; ')),
        h('td', null, d.aplicacoes.join('; ')),
        h('td', null, h('div', { class: 'acoes' },
          h('button', { type: 'button', class: 'sec', onClick: () => { rascunho = structuredClone(d); confirmarRemocao = null; desenharFormulario(); } }, 'Editar'),
          acoes.podeEscrever() ? h('button', { type: 'button', class: 'sec', onClick: async () => {
            if (confirmarRemocao !== d.id) { confirmarRemocao = d.id; desenharLista(); return; }
            try { await acoes.removerDocumento(d.id); ctx.documentos = ctx.documentos.filter((x) => x.id !== d.id); confirmarRemocao = null; desenharLista(); mensagem('Documento removido.'); }
            catch (e) { mensagem(`Não foi possível remover: ${acoes.mensagemErro(e)}`, true); }
          } }, confirmarRemocao === d.id ? 'Confirmar remoção' : 'Remover') : null,
        )),
      ))),
    ));
  }

  function desenharFormulario() {
    limpar(formulario);
    if (!rascunho) {
      formulario.append(h('button', { type: 'button', class: 'primario', disabled: !acoes.podeEscrever(), onClick: () => { rascunho = novoDocumento(); desenharFormulario(); } }, 'Cadastrar documento'));
      return;
    }
    const campo = (rotulo, id, controle) => h('label', { class: 'campo', for: id }, rotulo, controle);
    formulario.append(
      campo('Título', 'doc-titulo', h('input', { type: 'text', id: 'doc-titulo', value: rascunho.titulo, onChange: (ev) => { rascunho.titulo = ev.target.value; } })),
      h('div', { class: 'grade' },
        campo('Tipo de instrumento', 'doc-tipo', h('select', { id: 'doc-tipo', value: rascunho.tipoInstrumento, onChange: (ev) => { rascunho.tipoInstrumento = ev.target.value; } }, TIPOS.map((t) => h('option', { value: t }, t)))),
        campo('Jurisdição', 'doc-jur', h('select', { id: 'doc-jur', value: rascunho.jurisdicao, onChange: (ev) => { rascunho.jurisdicao = ev.target.value; } }, JURISDICOES.map((t) => h('option', { value: t }, t)))),
        campo('Órgão emissor', 'doc-orgao', h('input', { type: 'text', id: 'doc-orgao', value: rascunho.orgaoEmissor, onChange: (ev) => { rascunho.orgaoEmissor = ev.target.value; } })),
        campo('Vigência', 'doc-vig', h('input', { type: 'text', id: 'doc-vig', placeholder: 'ex.: vigente desde 2012', value: rascunho.vigencia, onChange: (ev) => { rascunho.vigencia = ev.target.value; } })),
        campo('Ano', 'doc-ano', h('input', { type: 'number', id: 'doc-ano', value: rascunho.ano ?? '', onChange: (ev) => { rascunho.ano = ev.target.value === '' ? null : Number(ev.target.value); } })),
      ),
      checks('Relação com os eixos temáticos', eixos, rascunho.eixos),
      checks('Aplicações', APLICACOES, rascunho.aplicacoes),
      campo('Dispositivo relevante e como trata o tema', 'doc-disp', h('textarea', { id: 'doc-disp', onChange: (ev) => { rascunho.dispositivo = ev.target.value; } }, rascunho.dispositivo)),
      h('div', { class: 'acoes' },
        h('button', { class: 'primario', type: 'button', onClick: async () => {
          if (!rascunho.titulo.trim()) { mensagem('Informe o título do documento.', true); return; }
          try {
            await acoes.salvarDocumento(rascunho);
            const i = ctx.documentos.findIndex((d) => d.id === rascunho.id);
            if (i >= 0) ctx.documentos[i] = structuredClone(rascunho); else ctx.documentos.push(structuredClone(rascunho));
            rascunho = null;
            desenharLista();
            desenharFormulario();
            mensagem('Documento salvo.');
          } catch (e) { mensagem(`Não foi possível salvar: ${acoes.mensagemErro(e)}`, true); }
        } }, 'Salvar documento'),
        h('button', { class: 'sec', type: 'button', onClick: () => { rascunho = null; desenharFormulario(); } }, 'Cancelar'),
      ),
    );
  }

  const resumo = h('div', { class: 'kpis' },
    h('div', { class: 'kpi' }, h('b', null, numero(ctx.documentos.length)), h('span', null, 'documentos')),
    APLICACOES.map((a) => h('div', { class: 'kpi' }, h('b', null, numero(ctx.documentos.filter((d) => d.aplicacoes.includes(a)).length)), h('span', null, `tratam de ${a}`))),
  );

  adicionar(
    container,
    h('h2', null, 'Documental'),
    h('p', { class: 'lead' }, 'Legislações e documentos institucionais ficam numa base própria. Eles não têm DOI, autor nem citações e não entram em nenhuma contagem de produção científica das outras páginas.'),
    ctx.documentos.length > 0 ? resumo : null,
    h('div', { class: 'painel pilha' },
      h('div', { class: 'grade' },
        h('label', { class: 'campo', for: 'doc-f-eixo' }, 'Filtrar por eixo', h('select', { id: 'doc-f-eixo', onChange: (ev) => { filtroEixo = ev.target.value; desenharLista(); } }, h('option', { value: '' }, 'Todos'), eixos.map((e) => h('option', { value: e }, e)))),
        h('label', { class: 'campo', for: 'doc-f-apl' }, 'Filtrar por aplicação', h('select', { id: 'doc-f-apl', onChange: (ev) => { filtroAplicacao = ev.target.value; desenharLista(); } }, h('option', { value: '' }, 'Todas'), APLICACOES.map((a) => h('option', { value: a }, a)))),
      ),
      lista,
    ),
    h('div', { class: 'painel' }, h('h3', null, rascunho ? 'Documento' : 'Novo documento'), formulario, aviso),
  );
  desenharLista();
  desenharFormulario();
}
