import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEstudo } from '../src/schema.js';
import { producaoPorAno, topContagem, idiomaPorAno, citacoesTotais } from '../src/metrics.js';
import { coocorrencia, coautoria } from '../src/networks.js';

const est = (titulo, extra = {}) => makeEstudo({ titulo, ...extra }, 'scopus');

test('lista vazia não lança e devolve estruturas vazias', () => {
  assert.deepEqual(producaoPorAno([]), []);
  assert.deepEqual(topContagem([], 'autores', 5), []);
  assert.deepEqual(idiomaPorAno([]), []);
  assert.equal(citacoesTotais([]), 0);
  assert.deepEqual(coocorrencia([], 1), { nos: [], arestas: [] });
  assert.deepEqual(coautoria([], 1), { nos: [], arestas: [] });
});

test('producaoPorAno ordena e põe "não informado" por último', () => {
  const lista = [est('A', { ano: 2020 }), est('B'), est('C', { ano: 2018 }), est('D', { ano: 2020 })];
  assert.deepEqual(producaoPorAno(lista), [
    { ano: 2018, total: 1 },
    { ano: 2020, total: 2 },
    { ano: null, total: 1 },
  ]);
});

test('topContagem respeita n, ordena decrescente e conta "não informado"', () => {
  const lista = [
    est('A', { periodico: 'Geoheritage' }),
    est('B', { periodico: 'Geoheritage' }),
    est('C', { periodico: 'Geosciences' }),
    est('D'),
  ];
  const top = topContagem(lista, 'periodico', 2);
  assert.deepEqual(top, [
    { nome: 'Geoheritage', total: 2 },
    { nome: 'Geosciences', total: 1 },
  ]);
  assert.deepEqual(topContagem(lista, 'periodico', 10).at(-1), { nome: 'não informado', total: 1 });
});

test('topContagem em campos de lista conta cada valor e trata lista vazia como não informado', () => {
  const lista = [est('A', { paises: ['Brazil', 'Portugal'] }), est('B', { paises: ['Brazil'] }), est('C')];
  const top = topContagem(lista, 'paises', 10);
  assert.equal(top[0].nome, 'Brazil');
  assert.equal(top[0].total, 2);
  assert.ok(top.some((t) => t.nome === 'não informado' && t.total === 1));
});

test('idiomaPorAno cruza ano e idioma', () => {
  const lista = [
    est('A', { ano: 2020, idioma: 'English' }),
    est('B', { ano: 2020, idioma: 'English' }),
    est('C', { ano: 2020, idioma: 'Portuguese' }),
    est('D', { ano: 2021 }),
  ];
  const r = idiomaPorAno(lista);
  assert.deepEqual(r.find((x) => x.ano === 2020 && x.idioma === 'inglês'), { ano: 2020, idioma: 'inglês', total: 2 });
  assert.deepEqual(r.find((x) => x.ano === 2021), { ano: 2021, idioma: 'não informado', total: 1 });
});

test('citacoesTotais soma e ignora citações ausentes', () => {
  assert.equal(citacoesTotais([est('A', { citacoes: 5 }), est('B'), est('C', { citacoes: 7 })]), 12);
});

test('coocorrência compara palavras-chave sem diferenciar caixa e respeita minPeso', () => {
  const lista = [
    est('A', { palavrasChave: ['Geotourism', 'viewpoints', 'geosites'] }),
    est('B', { palavrasChave: ['geotourism', 'Viewpoints'] }),
    est('C', { palavrasChave: ['geosites'] }),
  ];
  const r = coocorrencia(lista, 2);
  assert.deepEqual(r.arestas, [{ a: 'geotourism', b: 'viewpoints', peso: 2 }]);
  assert.equal(r.nos.find((n) => n.id === 'geotourism').total, 2);
});

test('coautoria descarta pares que aparecem só uma vez com minPeso 2', () => {
  const lista = [
    est('A', { autores: ['Silva', 'Souza', 'Lima'] }),
    est('B', { autores: ['Silva', 'Souza'] }),
  ];
  const r = coautoria(lista, 2);
  assert.deepEqual(r.arestas, [{ a: 'Silva', b: 'Souza', peso: 2 }]);
});

test('5.000 estudos: redes e contagens rodam em menos de 2 segundos', () => {
  const lista = [];
  for (let i = 0; i < 5000; i++) {
    lista.push(
      est(`E${i}`, {
        ano: 2000 + (i % 24),
        autores: [0, 1, 2, 3].map((k) => `Autor ${(i * 7 + k * 13) % 2000}`),
        palavrasChave: [0, 1, 2, 3, 4].map((k) => `kw${(i * 3 + k * 11) % 300}`),
      }),
    );
  }
  for (const fn of [() => coocorrencia(lista, 2), () => coautoria(lista, 2), () => topContagem(lista, 'autores', 20), () => producaoPorAno(lista)]) {
    const t0 = performance.now();
    fn();
    assert.ok(performance.now() - t0 < 2000);
  }
});
