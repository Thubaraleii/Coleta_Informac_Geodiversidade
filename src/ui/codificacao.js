import { h, limpar, numero, adicionar } from './dom.js';
import { novaCodificacao, alternarValor } from '../coding.js';
import { normalizarPais } from '../geo.js';
import { MUNDO } from './mundo.generated.js';
import { ROTULOS, CAMPOS_COD, CAMPOS_VIEWPOINT } from './rotulos.js';

const TEMPORALIDADES = [
  ['', 'Não informada'],
  ['antigo', 'Registro geológico antigo'],
  ['herdado', 'Forma de relevo herdada'],
  ['recente', 'Processo ou registro recente'],
  ['nao-se-aplica', 'Não se aplica'],
];

const numeroOuNulo = (texto) => {
  const n = Number.parseFloat(String(texto).replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

export function render(container, ctx) {
  const { acoes } = ctx;
  const codPorEstudo = new Map(ctx.cods.map((c) => [c.estudoId, c]));
  let busca = '';
  let situacao = 'todos';
  let selecionadoId = ctx.selecionado;
  let rascunho = null;

  const corpoLista = h('tbody');
  const infoLista = h('div', { class: 'legenda' });
  const formulario = h('div', { class: 'pilha' });

  function abrir(id) {
    selecionadoId = id;
    acoes.selecionar(id);
    const existente = codPorEstudo.get(id);
    rascunho = structuredClone(existente ?? novaCodificacao(id));
    desenharLista();
    desenharFormulario();
  }

  function desenharLista() {
    const termo = busca.trim().toLowerCase();
    const achados = ctx.estudos.filter((e) => {
      const cod = codPorEstudo.get(e.id);
      const codificado = cod && cod.elegibilidade !== 'pendente';
      if (situacao === 'pendentes' && codificado) return false;
      if (situacao === 'codificados' && !codificado) return false;
      return !termo || `${e.titulo} ${e.autores.join(' ')}`.toLowerCase().includes(termo);
    });
    limpar(corpoLista);
    for (const e of achados.slice(0, 100)) {
      const cod = codPorEstudo.get(e.id);
      const codificado = cod && cod.elegibilidade !== 'pendente';
      corpoLista.append(
        h('tr', { class: `clicavel${e.id === selecionadoId ? ' selecionada' : ''}`, tabindex: 0, onClick: () => abrir(e.id), onKeydown: (ev) => { if (ev.key === 'Enter') ev.currentTarget.click(); } },
          h('td', null, e.titulo || '(sem título)'),
          h('td', null, h('span', { class: `pill ${codificado ? 'ok' : 'pend'}` }, codificado ? 'codificado' : 'pendente')),
        ),
      );
    }
    limpar(infoLista).append(`Mostrando ${Math.min(100, achados.length)} de ${numero(achados.length)} estudos.`);
  }

  function grupoChecks(rotulo, campo, ler, aoMudar) {
    const valores = ler();
    const opcoes = ctx.categorias?.[campo] ?? [];
    const conhecidos = new Set(opcoes.map((o) => o.nome));
    const extras = valores.filter((v) => !conhecidos.has(v)).map((v) => ({ nome: v, descricao: 'Categoria que não está mais no dicionário.' }));
    const novo = h('input', { type: 'text', 'aria-label': `Nova categoria em ${rotulo}`, placeholder: 'Nova categoria' });
    return h('fieldset', null,
      h('legend', null, rotulo),
      h('div', { class: 'checks' },
        [...opcoes, ...extras].map((o) => h('label', { title: o.descricao }, h('input', { type: 'checkbox', checked: valores.includes(o.nome), onChange: (ev) => aoMudar(alternarValor(ler(), o.nome, ev.target.checked)) }), o.nome)),
      ),
      h('div', { class: 'linha-campos', style: 'margin-top:6px' }, novo, h('button', { type: 'button', class: 'sec', disabled: !acoes.podeEscrever(), onClick: async () => {
        const nome = novo.value.trim();
        if (!nome) return;
        if ((ctx.categorias[campo] ?? []).some((c) => c.nome.toLowerCase() === nome.toLowerCase())) return;
        try {
          await acoes.salvarCategorias({ ...ctx.categorias, [campo]: [...(ctx.categorias[campo] ?? []), { nome, descricao: 'Definição a registrar.' }] });
          ctx.categorias = { ...ctx.categorias, [campo]: [...(ctx.categorias[campo] ?? []), { nome, descricao: 'Definição a registrar.' }] };
          aoMudar(alternarValor(ler(), nome, true));
          desenharFormulario();
        } catch (e) { mensagem(`Não foi possível salvar a categoria: ${acoes.mensagemErro(e)}`, true); }
      } }, 'Adicionar')),
    );
  }

  const aviso = h('div', { 'aria-live': 'polite' });
  function mensagem(texto, erro = false) {
    limpar(aviso).append(h('div', { class: erro ? 'aviso' : 'chip' }, texto));
  }

  function linhasEditaveis(itens, colunas, vazioNovo) {
    const caixa = h('div', { class: 'linhas' });
    const desenhar = () => {
      limpar(caixa);
      itens.forEach((item, i) => {
        caixa.append(h('div', { class: 'linha-campos' },
          colunas.map((c) => h('input', { type: c.tipo ?? 'text', step: c.tipo === 'number' ? 'any' : null, 'aria-label': c.rotulo, placeholder: c.rotulo, value: item[c.chave] ?? '', onChange: (ev) => { item[c.chave] = c.tipo === 'number' ? numeroOuNulo(ev.target.value) : ev.target.value; } })),
          h('button', { type: 'button', class: 'sec', 'aria-label': 'Remover linha', onClick: () => { itens.splice(i, 1); desenhar(); } }, 'Remover'),
        ));
      });
      caixa.append(h('div', null, h('button', { type: 'button', class: 'sec', onClick: () => { itens.push(vazioNovo()); desenhar(); } }, 'Adicionar linha')));
    };
    desenhar();
    return caixa;
  }

  function texto(rotulo, chave, id) {
    return h('label', { class: 'campo', for: id }, rotulo, h('textarea', { id, onChange: (ev) => { rascunho[chave] = ev.target.value; } }, rascunho[chave]));
  }

  function desenharFormulario() {
    limpar(formulario);
    if (!rascunho) {
      formulario.append(h('div', { class: 'vazio' }, ctx.estudos.length === 0 ? 'Nenhum estudo na base. Importe arquivos na página Importação.' : 'Escolha um estudo na lista para codificar.'));
      return;
    }
    const estudo = ctx.estudos.find((e) => e.id === rascunho.estudoId);
    const vp = rascunho.viewpoints;
    adicionar(
      formulario,
      h('div', null, h('b', null, estudo?.titulo ?? rascunho.estudoId), h('div', { class: 'legenda' }, [estudo?.autores.slice(0, 3).join('; '), estudo?.ano].filter(Boolean).join(' · '), estudo?.doi ? [' · ', h('a', { href: `https://doi.org/${estudo.doi}`, target: '_blank', rel: 'noopener noreferrer' }, 'abrir fonte')] : null)),
      estudo?.resumo ? h('details', null, h('summary', null, 'Resumo do estudo'), h('div', { class: 'resumo-txt' }, estudo.resumo)) : null,
      h('div', { class: 'grade' },
        h('label', { class: 'campo', for: 'cod-eleg' }, 'Elegibilidade', h('select', { id: 'cod-eleg', value: rascunho.elegibilidade, onChange: (ev) => { rascunho.elegibilidade = ev.target.value; desenharFormulario(); } }, [['pendente', 'Pendente'], ['incluido', 'Incluído'], ['excluido', 'Excluído']].map(([v, r]) => h('option', { value: v }, r)))),
        rascunho.elegibilidade === 'excluido' ? h('label', { class: 'campo', for: 'cod-motivo' }, 'Motivo da exclusão', h('input', { type: 'text', id: 'cod-motivo', value: rascunho.motivoExclusao, onChange: (ev) => { rascunho.motivoExclusao = ev.target.value; } })) : null,
      ),
      grupoChecks(ROTULOS.eixos, 'eixos', () => rascunho.eixos, (v) => { rascunho.eixos = v; }),
      h('label', { class: 'campo', for: 'cod-paises' }, 'Países onde os sítios foram estudados (separe por vírgula)',
        h('input', { type: 'text', id: 'cod-paises', list: 'lista-paises', value: rascunho.paisesEstudados.join(', '), onChange: (ev) => { rascunho.paisesEstudados = ev.target.value.split(',').map((p) => p.trim()).filter(Boolean).map((p) => normalizarPais(p) ?? p); ev.target.value = rascunho.paisesEstudados.join(', '); } }),
        h('datalist', { id: 'lista-paises' }, MUNDO.map((p) => h('option', { value: p.nome })))),
      grupoChecks(ROTULOS.tiposSitio, 'tiposSitio', () => rascunho.tiposSitio, (v) => { rascunho.tiposSitio = v; }),
      h('label', { class: 'campo', for: 'cod-temporal' }, 'Natureza temporal dos elementos', h('select', { id: 'cod-temporal', value: rascunho.temporalidade ?? '', onChange: (ev) => { rascunho.temporalidade = ev.target.value || null; } }, TEMPORALIDADES.map(([v, r]) => h('option', { value: v }, r)))),
      ...CAMPOS_COD.filter((c) => c !== 'eixos' && c !== 'tiposSitio').map((c) => grupoChecks(ROTULOS[c], c, () => rascunho[c], (v) => { rascunho[c] = v; })),
      h('fieldset', null, h('legend', null, 'Sítios estudados (coordenadas opcionais)'), linhasEditaveis(rascunho.sitios, [{ chave: 'nome', rotulo: 'Nome do sítio' }, { chave: 'lat', rotulo: 'Latitude', tipo: 'number' }, { chave: 'lng', rotulo: 'Longitude', tipo: 'number' }], () => ({ nome: '', lat: null, lng: null }))),
      h('fieldset', null,
        h('legend', null, 'Pontos de observação (viewpoints)'),
        h('div', { class: 'pilha' },
          h('label', { class: 'campo', for: 'cod-vp' }, 'O estudo usa pontos de observação?', h('select', { id: 'cod-vp', value: vp.usa === null ? '' : vp.usa ? 'sim' : 'nao', onChange: (ev) => { vp.usa = ev.target.value === '' ? null : ev.target.value === 'sim'; } }, [['', 'Sem informação'], ['sim', 'Sim'], ['nao', 'Não']].map(([v, r]) => h('option', { value: v }, r)))),
          ...CAMPOS_VIEWPOINT.map((c) => grupoChecks(ROTULOS[c], c, () => vp[c], (v) => { vp[c] = v; })),
          h('div', null, h('b', null, 'Pontos com coordenadas'), linhasEditaveis(vp.pontos, [{ chave: 'nome', rotulo: 'Nome do ponto' }, { chave: 'lat', rotulo: 'Latitude', tipo: 'number' }, { chave: 'lng', rotulo: 'Longitude', tipo: 'number' }], () => ({ nome: '', lat: null, lng: null }))),
        ),
      ),
      texto('Objetivos do estudo', 'objetivos', 'cod-obj'),
      texto('Resultados', 'resultados', 'cod-res'),
      texto('Limitações (use a mesma redação para limitações iguais)', 'limitacoes', 'cod-lim'),
      texto('Recomendações para pesquisas futuras', 'recomendacoes', 'cod-rec'),
      h('fieldset', null, h('legend', null, 'Evidências textuais'), linhasEditaveis(rascunho.evidencias, [{ chave: 'trecho', rotulo: 'Trecho citado' }, { chave: 'pagina', rotulo: 'Página' }], () => ({ trecho: '', pagina: '' }))),
      texto('Lacuna identificada', 'lacuna', 'cod-lac'),
      texto('Observação', 'observacao', 'cod-obs'),
      h('div', { class: 'acoes' },
        h('button', { class: 'primario', type: 'button', disabled: !acoes.podeEscrever(), onClick: async () => {
          try {
            rascunho.sitios = rascunho.sitios.filter((s) => s.nome.trim() !== '' || s.lat != null);
            rascunho.viewpoints.pontos = rascunho.viewpoints.pontos.filter((p) => p.nome.trim() !== '' || p.lat != null);
            rascunho.evidencias = rascunho.evidencias.filter((e) => e.trecho.trim() !== '');
            await acoes.salvarCodificacao(rascunho);
            codPorEstudo.set(rascunho.estudoId, structuredClone(rascunho));
            desenharLista();
            mensagem('Codificação salva.');
          } catch (e) { mensagem(`Não foi possível salvar: ${acoes.mensagemErro(e)}`, true); }
        } }, 'Salvar codificação'),
        acoes.podeEscrever() ? null : h('span', { class: 'legenda' }, 'Acesso somente leitura.'),
      ),
      aviso,
    );
  }

  function painelDicionario() {
    const campos = Object.keys(ctx.categorias);
    const select = h('select', { id: 'dic-campo', onChange: () => desenhar() }, campos.map((c) => h('option', { value: c }, ROTULOS[c] ?? c)));
    const caixa = h('div', { class: 'linhas' });
    const info = h('div', { 'aria-live': 'polite' });
    function desenhar() {
      limpar(caixa);
      const campo = select.value;
      const atuais = ctx.categorias[campo] ?? [];
      const edits = atuais.map((c) => ({ ...c }));
      edits.forEach((c) => {
        caixa.append(h('div', { class: 'linha-campos' }, h('b', null, c.nome), h('textarea', { 'aria-label': `Definição de ${c.nome}`, onChange: (ev) => { c.descricao = ev.target.value; } }, c.descricao)));
      });
      caixa.append(h('div', { class: 'acoes' }, h('button', { type: 'button', class: 'primario', disabled: !acoes.podeEscrever(), onClick: async () => {
        try {
          const novo = { ...ctx.categorias, [campo]: edits };
          await acoes.salvarCategorias(novo);
          ctx.categorias = novo;
          limpar(info).append(h('div', { class: 'chip' }, 'Definições salvas.'));
        } catch (e) { limpar(info).append(h('div', { class: 'aviso' }, `Não foi possível salvar: ${acoes.mensagemErro(e)}`)); }
      } }, 'Salvar definições'), h('span', { class: 'legenda' }, 'Os nomes não podem ser alterados depois de usados; edite só as definições.')), info);
    }
    desenhar();
    return h('details', { class: 'painel' }, h('summary', null, 'Dicionário de categorias e critérios de classificação'), h('div', { class: 'pilha', style: 'margin-top:10px' }, h('label', { class: 'campo', for: 'dic-campo' }, 'Campo', select), caixa));
  }

  container.append(
    h('h2', null, 'Codificação'),
    h('p', { class: 'lead' }, 'Classifique cada estudo conforme o dicionário de dados: eixos, tipos de sítio, temporalidade, métodos, problemáticas, pontos de observação, evidências e lacunas. As definições das categorias aparecem ao passar o mouse e na página Registros.'),
    ctx.estudos.length === 0 ? h('div', { class: 'vazio' }, 'Nenhum estudo na base. Importe arquivos na página Importação.') : h('div', { class: 'duas-colunas' },
      h('div', { class: 'painel pilha' },
        h('label', { class: 'campo', for: 'busca-cod' }, 'Buscar estudo', h('input', { type: 'search', id: 'busca-cod', onInput: (ev) => { busca = ev.target.value; desenharLista(); } })),
        h('label', { class: 'campo', for: 'situacao-cod' }, 'Situação', h('select', { id: 'situacao-cod', onChange: (ev) => { situacao = ev.target.value; desenharLista(); } }, [['todos', 'Todos'], ['pendentes', 'Pendentes'], ['codificados', 'Codificados']].map(([v, r]) => h('option', { value: v }, r)))),
        h('div', { class: 'tabela' }, h('table', null, h('thead', null, h('tr', null, h('th', null, 'Título'), h('th', null, 'Situação'))), corpoLista)),
        infoLista,
      ),
      h('div', { class: 'painel' }, formulario),
    ),
    painelDicionario(),
  );
  if (ctx.estudos.length > 0) {
    desenharLista();
    if (selecionadoId && ctx.estudos.some((e) => e.id === selecionadoId)) abrir(selecionadoId);
    else desenharFormulario();
  }
}
