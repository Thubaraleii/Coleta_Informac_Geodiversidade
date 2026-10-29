/** Armazenamento chave-valor em memória; serve de base para testes e de reserva quando o navegador não guarda dados. */
export function kvEmMemoria() {
  const mapa = new Map();
  return {
    async get(chave) {
      const valor = mapa.get(chave);
      return valor === undefined ? undefined : structuredClone(valor);
    },
    async set(chave, valor) {
      mapa.set(chave, structuredClone(valor));
    },
  };
}

/**
 * Adaptador de coleções sobre um chave-valor (cada coleção é uma lista guardada sob uma chave).
 * As operações de um mesmo adaptador rodam em fila, para que gravações simultâneas não se percam.
 */
export function adapterDeKv(kv) {
  let fila = Promise.resolve();
  const emFila = (tarefa) => {
    const resultado = fila.then(tarefa, tarefa);
    fila = resultado.catch(() => {});
    return resultado;
  };
  const ler = async (colecao) => (await kv.get(colecao)) ?? [];
  return {
    list: (colecao) => emFila(() => ler(colecao)),
    set: (colecao, id, data) =>
      emFila(async () => {
        const itens = await ler(colecao);
        const novo = { id, data: structuredClone(data) };
        const i = itens.findIndex((x) => x.id === id);
        if (i >= 0) itens[i] = novo;
        else itens.push(novo);
        await kv.set(colecao, itens);
      }),
    remove: (colecao, id) =>
      emFila(async () => {
        const itens = await ler(colecao);
        await kv.set(colecao, itens.filter((x) => x.id !== id));
      }),
    replaceAll: (colecao, itens) => emFila(() => kv.set(colecao, itens.map((x) => ({ id: x.id, data: structuredClone(x.data) })))),
  };
}
