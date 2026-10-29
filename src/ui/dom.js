function anexar(pai, filho) {
  if (filho == null || filho === false) return;
  if (Array.isArray(filho)) filho.forEach((f) => anexar(pai, f));
  else if (filho instanceof Node) pai.append(filho);
  else pai.append(document.createTextNode(String(filho)));
}

export function h(tag, props, ...filhos) {
  const el = document.createElement(tag);
  let valor;
  for (const [chave, v] of Object.entries(props ?? {})) {
    if (v == null || v === false) continue;
    if (chave === 'class') el.className = v;
    else if (chave === 'value') valor = v;
    else if (chave.startsWith('on')) el.addEventListener(chave.slice(2).toLowerCase(), v);
    else if (v === true) el.setAttribute(chave, '');
    else el.setAttribute(chave, v);
  }
  anexar(el, filhos);
  if (valor !== undefined) el.value = valor;
  return el;
}

/** Como `pai.append(...)`, mas ignora null, false e listas aninhadas (append(null) escreve "null"). */
export function adicionar(pai, ...filhos) {
  anexar(pai, filhos);
}

export const limpar = (el) => {
  el.replaceChildren();
  return el;
};

export const numero = (n) => new Intl.NumberFormat('pt-BR').format(n);

export function vazio(container, mensagem = 'Sem dados para os filtros atuais.') {
  container.append(h('div', { class: 'vazio' }, mensagem));
}
