import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEstudo } from '../src/schema.js';
import { novaCodificacao, CATEGORIAS_INICIAIS } from '../src/coding.js';
import { createStore, memoryAdapter } from '../src/store.js';

const novoStore = () => {
  const adapter = memoryAdapter();
  return { adapter, store: createStore(adapter) };
};

test('salvar e listar estudos preserva os dados', async () => {
  const { store } = novoStore();
  const e = makeEstudo({ titulo: 'A', doi: '10.1/a', autores: ['Silva'] }, 'scopus');
  await store.saveEstudos([e]);
  assert.deepEqual(await store.listEstudos(), [e]);
});

test('salvar o mesmo conjunto duas vezes não duplica', async () => {
  const { store } = novoStore();
  const lista = [makeEstudo({ titulo: 'A' }, 'scopus'), makeEstudo({ titulo: 'B' }, 'scopus')];
  await store.saveEstudos(lista);
  await store.saveEstudos(lista);
  assert.equal((await store.listEstudos()).length, 2);
});

test('listEstudos nunca devolve documentos', async () => {
  const { store } = novoStore();
  await store.saveEstudos([makeEstudo({ titulo: 'A' }, 'scopus')]);
  await store.saveDocumento({
    id: 'd1', titulo: 'Lei X', tipoInstrumento: 'lei', jurisdicao: 'federal', orgaoEmissor: 'Congresso',
    vigencia: 'vigente', ano: 2000, eixos: ['geoconservação'], aplicacoes: ['conservação'], dispositivo: 'art. 1',
  });
  const estudos = await store.listEstudos();
  assert.equal(estudos.length, 1);
  assert.equal(estudos[0].titulo, 'A');
  assert.equal((await store.listDocumentos()).length, 1);
});

test('documentos podem ser removidos', async () => {
  const { store } = novoStore();
  await store.saveDocumento({ id: 'd1', titulo: 'Lei X' });
  await store.removeDocumento('d1');
  assert.deepEqual(await store.listDocumentos(), []);
});

test('codificação salva volta idêntica e é indexada pelo estudoId', async () => {
  const { store, adapter } = novoStore();
  const c = { ...novaCodificacao('10.1/a'), elegibilidade: 'incluido', tiposSitio: ['paleontológico'] };
  await store.saveCodificacao(c);
  assert.deepEqual(await store.getCodificacoes(), [c]);
  assert.equal((await adapter.list('codificacao'))[0].id, '10.1/a');
});

test('getCategorias numa base nova devolve as iniciais e depois o que foi salvo', async () => {
  const { store } = novoStore();
  assert.deepEqual(await store.getCategorias(), CATEGORIAS_INICIAIS);
  const editadas = { ...CATEGORIAS_INICIAIS, objeto: [{ nome: 'novo', descricao: 'd' }] };
  await store.saveCategorias(editadas);
  assert.deepEqual(await store.getCategorias(), editadas);
});

test('cada coleção usa exatamente os nomes do spec', async () => {
  const { store, adapter } = novoStore();
  await store.saveEstudos([makeEstudo({ titulo: 'A' }, 'scopus')]);
  await store.saveCodificacao(novaCodificacao('x'));
  await store.saveCategorias(CATEGORIAS_INICIAIS);
  await store.saveDocumento({ id: 'd', titulo: 'T' });
  for (const col of ['estudos', 'codificacao', 'categorias', 'documentos']) {
    assert.ok((await adapter.list(col)).length >= 1, col);
  }
});

test('saveEstudos com replaceAll substitui o conjunto completo', async () => {
  const { store } = novoStore();
  const a = makeEstudo({ titulo: 'A' }, 'scopus');
  const b = makeEstudo({ titulo: 'B' }, 'scopus');
  await store.saveEstudos([a, b]);
  await store.saveEstudos([a]);
  assert.deepEqual((await store.listEstudos()).map((e) => e.titulo), ['A']);
});
