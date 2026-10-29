import { h, limpar, numero } from './dom.js';
import { ROTULOS, CAMPOS_COD, CAMPOS_VIEWPOINT } from './rotulos.js';

const ROTULO_ELEGIBILIDADE = { pendente: 'pendente', incluido: 'incluído', excluido: 'excluído' };
const ROTULO_TEMPORALIDADE = { antigo: 'registro geológico antigo', herdado: 'forma de relevo herdada', recente: 'processo ou registro recente', 'nao-se-aplica': 'não se aplica' };

function pillStatus(cod) {
  const el = cod?.elegibilidade ?? 'pendente';
  return h('span', { class: `pill ${el === 'incluido' ? 'ok' : el === 'excluido' ? 'bad' : 'pend'}` }, ROTULO_ELEGIBILIDADE[el]);
}

function descricaoDe(categorias, campo, nome) {
  return (categorias?.[campo] ?? []).find((c) => c.nome === nome)?.descricao ?? '';
}

function detalhe(container, estudo, cod, ctx) {
  limpar(container);
  const itens = [];
  const usados = [];
  const lista = (campo, valores, rotulo) => {
    if (!valores || valores.length === 0) return;
    itens.push(h('div', null, h('b', null, `${rotulo}: `), valores.join('; ')));
    for (const v of valores) {
      const d = descricaoDe(ctx.categorias, campo, v);
      if (d) usados.push([v, d]);
    }
  };
  if (cod) {
    lista('eixos', cod.eixos, ROTULOS.eixos);
    if (cod.paisesEstudados.length) itens.push(h('div', null, h('b', null, 'Países estudados: '), cod.paisesEstudados.join('; ')));
    for (const campo of CAMPOS_COD.filter((c) => c !== 'eixos')) lista(campo, cod[campo], ROTULOS[campo]);
    if (cod.temporalidade) itens.push(h('div', null, h('b', null, 'Temporalidade: '), ROTULO_TEMPORALIDADE[cod.temporalidade] ?? cod.temporalidade));
    if (cod.viewpoints.usa !== null) itens.push(h('div', null, h('b', null, 'Usa pontos de observação: '), cod.viewpoints.usa ? 'sim' : 'não'));
    for (const campo of CAMPOS_VIEWPOINT) lista(campo, cod.viewpoints[campo], ROTULOS[campo]);
    for (const [rotulo, texto] of [['Objetivos', cod.objetivos], ['Resultados', cod.resultados], ['Limitações', cod.limitacoes], ['Recomendações', cod.recomendacoes], ['Lacuna apontada', cod.lacuna], ['Observação', cod.observacao]]) {
      if (texto) itens.push(h('div', null, h('b', null, `${rotulo}: `), h('span', { class: 'resumo-txt' }, texto)));
    }
  }
  container.append(
    h('h3', null, 'Registro'),
    h('div', { class: 'pilha' },
      h('div', null, h('b', null, estudo.titulo || '(sem título)')),
      h('div', { class: 'chips' },
        estudo.ano ? h('span', { class: 'pill' }, estudo.ano) : h('span', { class: 'pill' }, 'ano não informado'),
        estudo.idioma ? h('span', { class: 'pill' }, estudo.idioma) : null,
        estudo.citacoes != null ? h('span', { class: 'pill' }, `${numero(estudo.citacoes)} citações`) : null,
        estudo.incompleto ? h('span', { class: 'pill pend' }, 'dados incompletos') : null,
        pillStatus(cod),
        estudo.bases.map((b) => h('span', { class: 'pill' }, `base: ${b}`)),
      ),
      h('div', null, estudo.autores.join('; ') || 'Autores não informados'),
      h('div', null, [estudo.periodico, estudo.paises.length ? `Afiliações: ${estudo.paises.join(', ')}` : null].filter(Boolean).join(' · ')),
      estudo.doi ? h('div', null, 'Fonte original: ', h('a', { href: `https://doi.org/${estudo.doi}`, target: '_blank', rel: 'noopener noreferrer' }, `doi.org/${estudo.doi}`)) : h('div', null, 'Sem DOI; identificado pelo título.'),
      estudo.resumo ? h('div', { class: 'resumo-txt' }, estudo.resumo) : null,
      estudo.palavrasChave.length ? h('div', { class: 'chips' }, estudo.palavrasChave.map((k) => h('span', { class: 'chip' }, k))) : null,
      cod ? h('div', { class: 'pilha' }, h('h3', null, 'Classificação'), itens.length ? itens : h('div', { class: 'vazio' }, 'Codificação criada, sem campos preenchidos.')) : h('div', { class: 'aviso' }, 'Este estudo ainda não foi codificado.'),
      cod?.motivoExclusao ? h('div', { class: 'aviso' }, `Motivo da exclusão: ${cod.motivoExclusao}`) : null,
      cod?.evidencias.length ? h('div', null, h('h3', null, 'Evidências textuais'), h('ul', null, cod.evidencias.map((ev) => h('li', null, `“${ev.trecho}”`, ev.pagina ? ` (p. ${ev.pagina})` : '')))) : null,
      usados.length ? h('div', null, h('h3', null, 'Critérios de classificação usados'), h('dl', { class: 'criterios' }, [...new Map(usados).entries()].map(([nome, d]) => [h('dt', null, nome), h('dd', null, d)]))) : null,
      h('div', { class: 'acoes' }, h('button', { class: 'primario', type: 'button', onClick: () => ctx.acoes.irPara('codificacao', estudo.id) }, cod ? 'Editar codificação' : 'Codificar este estudo')),
    ),
  );
}

export function render(container, ctx) {
  const porEstudo = new Map(ctx.cods.map((c) => [c.estudoId, c]));
  let busca = '';
  let selecionadoId = ctx.selecionado;
  const corpo = h('tbody');
  const info = h('div', { class: 'legenda' });
  const painelDetalhe = h('div', { class: 'painel' }, h('div', { class: 'vazio' }, 'Selecione um registro para ver os detalhes.'));

  function desenharTabela() {
    const termo = busca.trim().toLowerCase();
    const achados = ctx.estudos.filter((e) => !termo || `${e.titulo} ${e.autores.join(' ')} ${e.palavrasChave.join(' ')} ${e.periodico}`.toLowerCase().includes(termo));
    limpar(corpo);
    for (const e of achados.slice(0, 100)) {
      corpo.append(
        h('tr', { class: `clicavel${e.id === selecionadoId ? ' selecionada' : ''}`, tabindex: 0, onClick: () => { selecionadoId = e.id; ctx.acoes.selecionar(e.id); desenharTabela(); detalhe(painelDetalhe, e, porEstudo.get(e.id), ctx); }, onKeydown: (ev) => { if (ev.key === 'Enter') ev.currentTarget.click(); } },
          h('td', { class: 'num' }, e.ano ?? '—'),
          h('td', null, e.titulo || '(sem título)'),
          h('td', null, `${e.autores.slice(0, 2).join('; ')}${e.autores.length > 2 ? ' et al.' : ''}`),
          h('td', null, pillStatus(porEstudo.get(e.id))),
        ),
      );
    }
    limpar(info).append(`Mostrando ${Math.min(100, achados.length)} de ${numero(achados.length)} registros.`);
  }

  container.append(
    h('h2', null, 'Registros'),
    h('p', { class: 'lead' }, 'Consulta individual de cada estudo: metadados, classificação, critérios do dicionário, evidências e fonte original. Aqui aparecem todos os estudos, inclusive os excluídos, sem aplicar os filtros globais.'),
    ctx.estudos.length === 0 ? h('div', { class: 'vazio' }, 'Nenhum estudo na base. Importe arquivos na página Importação.') : h('div', { class: 'duas-colunas' },
      h('div', { class: 'painel pilha' },
        h('label', { class: 'campo', for: 'busca-registros' }, 'Buscar por título, autor, palavra-chave ou periódico', h('input', { type: 'search', id: 'busca-registros', onInput: (ev) => { busca = ev.target.value; desenharTabela(); } })),
        h('div', { class: 'tabela' }, h('table', null, h('thead', null, h('tr', null, h('th', null, 'Ano'), h('th', null, 'Título'), h('th', null, 'Autores'), h('th', null, 'Situação'))), corpo)),
        info,
      ),
      painelDetalhe,
    ),
  );
  if (ctx.estudos.length > 0) {
    desenharTabela();
    const atual = ctx.estudos.find((e) => e.id === selecionadoId);
    if (atual) detalhe(painelDetalhe, atual, porEstudo.get(atual.id), ctx);
  }
}
