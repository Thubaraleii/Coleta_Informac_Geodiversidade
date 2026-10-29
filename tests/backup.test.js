import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEstudo } from '../src/schema.js';
import { novaCodificacao, CATEGORIAS_INICIAIS } from '../src/coding.js';
import { createStore, memoryAdapter } from '../src/store.js';
import { exportarBase, importarBackup } from '../src/backup.js';

const novoStore = () => createStore(memoryAdapter());
const doc = (id, titulo = 'Lei') => ({ id, titulo, tipoInstrumento: 'lei', jurisdicao: 'nacional', orgaoEmissor: '', vigencia: '', ano: 2000, eixos: [], aplicacoes: [], dispositivo: '' });

async function preencher(store) {
  const a = makeEstudo({ titulo: 'A', doi: '10.1/a' }, 'scopus');
  await store.saveEstudos([a]);
  await store.saveCodificacao({ ...novaCodificacao(a.id), elegibilidade: 'incluido', tiposSitio: ['paleontológico'], atualizadoEm: '2026-01-01T00:00:00.000Z' });
  await store.saveDocumento(doc('d1'));
  return a;
}

test('exportarBase reúne as quatro coleções com formato e versão', async () => {
  const store = novoStore();
  await preencher(store);
  const base = await exportarBase(store);
  assert.equal(base.formato, 'painel-geodiversidade');
  assert.equal(base.versao, 1);
  assert.match(base.exportadoEm, /^\d{4}-\d{2}-\d{2}T/);
  assert.equal(base.estudos.length, 1);
  assert.equal(base.codificacoes.length, 1);
  assert.equal(base.documentos.length, 1);
  assert.deepEqual(base.categorias, CATEGORIAS_INICIAIS);
  assert.doesNotThrow(() => JSON.stringify(base));
});

test('exportar e importar em outra base reproduz os dados', async () => {
  const origem = novoStore();
  await preencher(origem);
  const destino = novoStore();
  const r = await importarBackup(destino, JSON.parse(JSON.stringify(await exportarBase(origem))));
  assert.equal(r.estudos.adicionados, 1);
  assert.equal(r.codificacoes.novas, 1);
  assert.equal(r.documentos.novos, 1);
  assert.deepEqual(await destino.listEstudos(), await origem.listEstudos());
  assert.deepEqual(await destino.getCodificacoes(), await origem.getCodificacoes());
});

test('importar o mesmo backup de novo não muda nada', async () => {
  const origem = novoStore();
  await preencher(origem);
  const base = JSON.parse(JSON.stringify(await exportarBase(origem)));
  const destino = novoStore();
  await importarBackup(destino, base);
  const r = await importarBackup(destino, base);
  assert.deepEqual(r, { estudos: { adicionados: 0, alterados: 0 }, codificacoes: { novas: 0, atualizadas: 0 }, categorias: { novas: 0 }, documentos: { novos: 0 } });
});

test('na codificação do mesmo estudo vence a mais recente; empate mantém a existente', async () => {
  const store = novoStore();
  const a = await preencher(store);
  const mais = { ...novaCodificacao(a.id), elegibilidade: 'incluido', tiposSitio: ['arqueológico'], atualizadoEm: '2026-02-01T00:00:00.000Z' };
  const menos = { ...novaCodificacao(a.id), elegibilidade: 'incluido', tiposSitio: ['outro'], atualizadoEm: '2025-01-01T00:00:00.000Z' };
  const base = (c) => ({ formato: 'painel-geodiversidade', versao: 1, exportadoEm: 'x', estudos: [], codificacoes: [c], categorias: {}, documentos: [] });
  const r1 = await importarBackup(store, base(mais));
  assert.equal(r1.codificacoes.atualizadas, 1);
  assert.deepEqual((await store.getCodificacoes())[0].tiposSitio, ['arqueológico']);
  const r2 = await importarBackup(store, base(menos));
  assert.equal(r2.codificacoes.atualizadas, 0);
  assert.deepEqual((await store.getCodificacoes())[0].tiposSitio, ['arqueológico']);
});

test('categorias novas são somadas e as definições existentes são preservadas; documentos só entram se forem novos', async () => {
  const store = novoStore();
  await preencher(store);
  const base = {
    formato: 'painel-geodiversidade', versao: 1, exportadoEm: 'x', estudos: [], codificacoes: [],
    categorias: { eixos: [{ nome: 'geoética', descricao: 'nova' }, { nome: 'geoturismo', descricao: 'outra definição' }] },
    documentos: [doc('d1', 'Outro título'), doc('d2', 'Decreto')],
  };
  const r = await importarBackup(store, base);
  assert.equal(r.categorias.novas, 1);
  assert.equal(r.documentos.novos, 1);
  const eixos = (await store.getCategorias()).eixos;
  assert.ok(eixos.some((c) => c.nome === 'geoética'));
  assert.equal(eixos.find((c) => c.nome === 'geoturismo').descricao, CATEGORIAS_INICIAIS.eixos.find((c) => c.nome === 'geoturismo').descricao);
  assert.equal((await store.listDocumentos()).find((d) => d.id === 'd1').titulo, 'Lei');
});

test('arquivo que não é um backup válido é recusado sem alterar a base', async () => {
  const store = novoStore();
  await preencher(store);
  for (const lixo of [null, 'texto', [], { formato: 'outro', versao: 1 }, { formato: 'painel-geodiversidade', versao: 99, estudos: [], codificacoes: [], categorias: {}, documentos: [] }, { formato: 'painel-geodiversidade', versao: 1, estudos: 'x', codificacoes: [], categorias: {}, documentos: [] }, { formato: 'painel-geodiversidade', versao: 1, estudos: [{ semId: true }], codificacoes: [], categorias: {}, documentos: [] }]) {
    await assert.rejects(() => importarBackup(store, lixo), /Backup inválido/);
  }
  assert.equal((await store.listEstudos()).length, 1);
});
