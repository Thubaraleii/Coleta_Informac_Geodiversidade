import { CATEGORIAS_INICIAIS } from './coding.js';

const ID_CATEGORIAS = 'principal';

export function memoryAdapter() {
  const colecoes = new Map();
  const col = (nome) => {
    if (!colecoes.has(nome)) colecoes.set(nome, new Map());
    return colecoes.get(nome);
  };
  return {
    async list(nome) {
      return [...col(nome).entries()].map(([id, data]) => ({ id, data: structuredClone(data) }));
    },
    async set(nome, id, data) {
      col(nome).set(id, structuredClone(data));
    },
    async remove(nome, id) {
      col(nome).delete(id);
    },
  };
}

export function createStore(adapter) {
  const dados = async (nome) => (await adapter.list(nome)).map((x) => x.data);
  return {
    listEstudos: () => dados('estudos'),
    async saveEstudos(estudos) {
      for (const e of estudos) await adapter.set('estudos', e.id, e);
    },
    getCodificacoes: () => dados('codificacao'),
    saveCodificacao: (c) => adapter.set('codificacao', c.estudoId, c),
    async getCategorias() {
      const salvo = (await adapter.list('categorias')).find((x) => x.id === ID_CATEGORIAS);
      return salvo ? salvo.data : structuredClone(CATEGORIAS_INICIAIS);
    },
    saveCategorias: (c) => adapter.set('categorias', ID_CATEGORIAS, c),
    listDocumentos: () => dados('documentos'),
    saveDocumento: (d) => adapter.set('documentos', d.id, d),
    removeDocumento: (id) => adapter.remove('documentos', id),
  };
}
