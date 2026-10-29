import { test } from 'node:test';
import assert from 'node:assert/strict';
import { adapterDeKv, kvEmMemoria } from '../src/kv.js';

test('lista vazia para coleção que nunca recebeu dados', async () => {
  assert.deepEqual(await adapterDeKv(kvEmMemoria()).list('estudos'), []);
});

test('set grava, substitui pelo mesmo id e list devolve na ordem de gravação', async () => {
  const a = adapterDeKv(kvEmMemoria());
  await a.set('codificacao', 'x', { n: 1 });
  await a.set('codificacao', 'y', { n: 2 });
  await a.set('codificacao', 'x', { n: 3 });
  assert.deepEqual(await a.list('codificacao'), [
    { id: 'x', data: { n: 3 } },
    { id: 'y', data: { n: 2 } },
  ]);
});

test('remove apaga só o id pedido e é idempotente', async () => {
  const a = adapterDeKv(kvEmMemoria());
  await a.set('documentos', 'a', { t: 1 });
  await a.set('documentos', 'b', { t: 2 });
  await a.remove('documentos', 'a');
  await a.remove('documentos', 'a');
  assert.deepEqual((await a.list('documentos')).map((i) => i.id), ['b']);
});

test('replaceAll troca a coleção inteira', async () => {
  const a = adapterDeKv(kvEmMemoria());
  await a.replaceAll('estudos', [{ id: '1', data: { t: 'A' } }, { id: '2', data: { t: 'B' } }]);
  await a.replaceAll('estudos', [{ id: '2', data: { t: 'B' } }]);
  assert.deepEqual((await a.list('estudos')).map((i) => i.id), ['2']);
});

test('o que se lê não compartilha referência com o que está guardado', async () => {
  const a = adapterDeKv(kvEmMemoria());
  const original = { lista: [1] };
  await a.set('c', 'x', original);
  original.lista.push(2);
  const [lido] = await a.list('c');
  lido.data.lista.push(3);
  assert.deepEqual((await a.list('c'))[0].data, { lista: [1] });
});

test('50 gravações simultâneas não perdem nenhuma', async () => {
  const a = adapterDeKv(kvEmMemoria());
  await Promise.all(Array.from({ length: 50 }, (_, i) => a.set('c', `i${i}`, { i })));
  assert.equal((await a.list('c')).length, 50);
});

test('coleções diferentes são independentes e dois adaptadores no mesmo armazenamento veem os mesmos dados', async () => {
  const kv = kvEmMemoria();
  const a = adapterDeKv(kv);
  const b = adapterDeKv(kv);
  await a.set('estudos', '1', { t: 1 });
  await a.set('documentos', '1', { t: 2 });
  assert.deepEqual((await b.list('estudos'))[0].data, { t: 1 });
  assert.deepEqual((await b.list('documentos'))[0].data, { t: 2 });
});
