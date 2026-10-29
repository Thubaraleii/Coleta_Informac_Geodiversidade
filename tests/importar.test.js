import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEstudo } from '../src/schema.js';
import { createStore, memoryAdapter } from '../src/store.js';
import { importarEstudos } from '../src/importar.js';

const est = (titulo, doi, base = 'scopus', extra = {}) => makeEstudo({ titulo, doi, ...extra }, base);

test('duas pessoas importando em sequência mantêm os estudos uma da outra', async () => {
  const adapter = memoryAdapter();
  const dono = createStore(adapter);
  const stefany = createStore(adapter);
  await importarEstudos(dono, [est('B', '10.1/b')]);
  await importarEstudos(stefany, [est('C', '10.1/c')]);
  const titulos = (await dono.listEstudos()).map((e) => e.titulo).sort();
  assert.deepEqual(titulos, ['B', 'C']);
});

test('importar só duplicatas idênticas não grava; importar nova base do mesmo estudo grava', async () => {
  const store = createStore(memoryAdapter());
  const a = est('A', '10.1/a');
  const r1 = await importarEstudos(store, [a]);
  assert.deepEqual({ adicionados: r1.adicionados, gravou: r1.gravou }, { adicionados: 1, gravou: true });
  const r2 = await importarEstudos(store, [a]);
  assert.deepEqual({ adicionados: r2.adicionados, duplicados: r2.duplicados, gravou: r2.gravou }, { adicionados: 0, duplicados: 1, gravou: false });
  const r3 = await importarEstudos(store, [est('A', '10.1/a', 'wos', { paises: ['Brazil'] })]);
  assert.equal(r3.gravou, true);
  const [salvo] = await store.listEstudos();
  assert.deepEqual(salvo.bases, ['scopus', 'wos']);
  assert.deepEqual(salvo.paises, ['Brazil']);
});
