/** Armazenamento do navegador (IndexedDB) no formato chave-valor de src/kv.js; devolve null se o navegador não permitir. */
export async function kvIndexedDb(nome = 'painel-geodiversidade') {
  if (typeof indexedDB === 'undefined') return null;
  try {
    const db = await new Promise((resolve, reject) => {
      const pedido = indexedDB.open(nome, 1);
      pedido.onupgradeneeded = () => pedido.result.createObjectStore('colecoes');
      pedido.onsuccess = () => resolve(pedido.result);
      pedido.onerror = () => reject(pedido.error);
      pedido.onblocked = () => reject(new Error('Abertura do armazenamento bloqueada'));
    });
    const transacao = (modo, operacao) =>
      new Promise((resolve, reject) => {
        const t = db.transaction('colecoes', modo);
        const pedido = operacao(t.objectStore('colecoes'));
        t.oncomplete = () => resolve(pedido?.result);
        t.onerror = () => reject(t.error);
        t.onabort = () => reject(t.error ?? new Error('Gravação cancelada'));
      });
    return {
      get: (chave) => transacao('readonly', (s) => s.get(chave)),
      set: (chave, valor) => transacao('readwrite', (s) => s.put(valor, chave)),
    };
  } catch {
    return null;
  }
}
