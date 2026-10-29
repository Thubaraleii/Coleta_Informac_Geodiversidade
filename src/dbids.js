const SEGMENTO_VALIDO = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;

function cyrb53(texto, semente) {
  let h1 = 0xdeadbeef ^ semente;
  let h2 = 0x41c6ce57 ^ semente;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charCodeAt(i);
    h1 = Math.imul(h1 ^ c, 2654435761);
    h2 = Math.imul(h2 ^ c, 1597334677);
  }
  h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
  h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
  return 4294967296 * (2097151 & h2) + (h1 >>> 0);
}

export function safeId(id) {
  const texto = String(id);
  if (SEGMENTO_VALIDO.test(texto) && texto !== '.' && texto !== '..') return texto;
  const a = cyrb53(texto, 0).toString(16).padStart(14, '0');
  const b = cyrb53(texto, 1).toString(16).padStart(14, '0');
  return `h${a}${b}`;
}

export const PAGINAS_CODIFICACAO = 20;

/** Página (0 a 19) em que uma codificação é gravada, para ler cada página abaixo do limite de 1000 documentos por consulta. */
export function paginaDe(id, paginas = PAGINAS_CODIFICACAO) {
  return cyrb53(String(id), 2) % paginas;
}

const codificador = new TextEncoder();

export function empacotar(itens, maxBytes) {
  const lotes = [];
  let atual = [];
  let tamanho = 0;
  for (const item of itens) {
    const t = codificador.encode(JSON.stringify(item)).length + 1;
    if (atual.length > 0 && tamanho + t > maxBytes) {
      lotes.push(atual);
      atual = [];
      tamanho = 0;
    }
    atual.push(item);
    tamanho += t;
  }
  if (atual.length > 0) lotes.push(atual);
  return lotes;
}
