import { test, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { artifactDbAdapter } from '../src/ui/db-adapter.js';

const LIMITE = 1000;

function criarDbFalso() {
  const dados = new Map();
  const consulta = (nome, filtros) => ({
    where: (campo, op, valor) => consulta(nome, [...filtros, [campo, op, valor]]),
    async get() {
      const docs = [];
      for (const [chave, valor] of dados) {
        if (!chave.startsWith(`${nome}/`)) continue;
        if (!filtros.every(([c, o, v]) => o === '==' && valor[c] === v)) continue;
        docs.push({ id: chave.slice(nome.length + 1), data: () => structuredClone(valor) });
        if (docs.length >= LIMITE) break;
      }
      return { docs };
    },
  });
  return {
    collection: (nome) => ({
      ...consulta(nome, []),
      doc: (id) => ({
        async set(d) { dados.set(`${nome}/${id}`, structuredClone(d)); },
        async delete() { dados.delete(`${nome}/${id}`); },
      }),
    }),
  };
}

beforeEach(() => {
  const db = criarDbFalso();
  globalThis.claude = { use: async (nome) => (nome === 'db' ? db : null) };
});

test('lista todas as 1.200 codificações apesar do limite de 1000 por consulta', async () => {
  const adapter = await artifactDbAdapter();
  for (let i = 0; i < 1200; i++) await adapter.set('codificacao', `10.1/${i}`, { estudoId: `10.1/${i}`, n: i });
  const itens = await adapter.list('codificacao');
  assert.equal(itens.length, 1200);
  assert.equal(new Set(itens.map((x) => x.data.estudoId)).size, 1200);
  assert.ok(itens.every((x) => !('_pg' in x.data)));
});

test('recusa uma leitura que volta no limite, em vez de devolver lista truncada', async () => {
  const adapter = await artifactDbAdapter();
  for (let i = 0; i < LIMITE; i++) await adapter.set('documentos', `d${i}`, { id: `d${i}` });
  await assert.rejects(() => adapter.list('documentos'), (e) => e.code === 'resource_exhausted');
});

test('replaceAll grava mesmo quando o cache local acha que o lote não mudou', async () => {
  const a = await artifactDbAdapter();
  const b = await artifactDbAdapter();
  const itensA = [{ id: 'a', data: { titulo: 'A' } }];
  const itensB = [{ id: 'b', data: { titulo: 'B' } }];
  await a.replaceAll('estudos', itensA);
  await b.replaceAll('estudos', itensB);
  await a.replaceAll('estudos', itensA);
  assert.deepEqual((await b.list('estudos')).map((x) => x.id), ['a']);
});

test('estudos grandes são divididos em vários lotes e voltam completos', async () => {
  const adapter = await artifactDbAdapter();
  const itens = Array.from({ length: 300 }, (_, i) => ({ id: `e${i}`, data: { titulo: `T${i}`, resumo: 'ж'.repeat(2000) } }));
  await adapter.replaceAll('estudos', itens);
  const lidos = await adapter.list('estudos');
  assert.equal(lidos.length, 300);
  assert.deepEqual(lidos.map((x) => x.id).sort(), itens.map((x) => x.id).sort());
});
