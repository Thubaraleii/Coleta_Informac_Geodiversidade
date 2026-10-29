import { test } from 'node:test';
import assert from 'node:assert/strict';
import { safeId, empacotar } from '../src/dbids.js';

const SEGMENTO_VALIDO = /^[A-Za-z0-9_\-.~:@+]{1,200}$/;

test('safeId mantém ids que já são segmentos válidos', () => {
  assert.equal(safeId('principal'), 'principal');
  assert.equal(safeId('d-2020_1'), 'd-2020_1');
});

test('safeId converte DOI com barra e títulos com espaço em segmentos válidos', () => {
  for (const id of ['10.1007/s12371-016-0001-1', 't:geodiversidade e turismo', 'ação/ç', 'a'.repeat(500), '.', '..', '']) {
    assert.match(safeId(id), SEGMENTO_VALIDO, id);
    assert.notEqual(safeId(id), '.');
    assert.notEqual(safeId(id), '..');
  }
});

test('safeId é determinístico e distingue ids diferentes', () => {
  assert.equal(safeId('10.1/a'), safeId('10.1/a'));
  assert.notEqual(safeId('10.1/a'), safeId('10.1/b'));
  const ids = new Set();
  for (let i = 0; i < 5000; i++) ids.add(safeId(`10.1/${i}`));
  assert.equal(ids.size, 5000);
});

test('empacotar divide em lotes sem passar do limite de caracteres e preserva a ordem', () => {
  const itens = Array.from({ length: 10 }, (_, i) => ({ id: `i${i}`, data: { texto: 'x'.repeat(100) } }));
  const lotes = empacotar(itens, 350);
  assert.ok(lotes.length > 1);
  assert.deepEqual(lotes.flat().map((i) => i.id), itens.map((i) => i.id));
  for (const lote of lotes) assert.ok(JSON.stringify(lote).length <= 350 || lote.length === 1);
});

test('empacotar lista vazia devolve nenhum lote e item gigante fica sozinho', () => {
  assert.deepEqual(empacotar([], 100), []);
  const lotes = empacotar([{ id: 'a', data: { t: 'x'.repeat(500) } }, { id: 'b', data: {} }], 100);
  assert.equal(lotes.length, 2);
});
