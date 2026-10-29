import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { novaCodificacao } from '../src/coding.js';
import { setNomesAtlas, normalizarPais, contagemPaises, pontosComCoordenadas } from '../src/geo.js';

before(() => {
  const topo = JSON.parse(readFileSync(new URL('../node_modules/world-atlas/countries-110m.json', import.meta.url), 'utf8'));
  setNomesAtlas(topo.objects.countries.geometries.map((g) => g.properties.name));
});

test('variações dos EUA caem em United States of America', () => {
  for (const nome of ['USA', 'United States', 'U.S.A.', 'US', 'Estados Unidos']) {
    assert.equal(normalizarPais(nome), 'United States of America', nome);
  }
});

test('Brasil e Brazil caem no mesmo país', () => {
  assert.equal(normalizarPais('Brasil'), 'Brazil');
  assert.equal(normalizarPais('Brazil'), 'Brazil');
  assert.equal(normalizarPais('  brazil '), 'Brazil');
});

test('apelidos comuns de bases bibliográficas são reconhecidos', () => {
  assert.equal(normalizarPais('Peoples R China'), 'China');
  assert.equal(normalizarPais('England'), 'United Kingdom');
  assert.equal(normalizarPais('UK'), 'United Kingdom');
  assert.equal(normalizarPais('Czech Republic'), 'Czechia');
  assert.equal(normalizarPais('Russian Federation'), 'Russia');
  assert.equal(normalizarPais('Türkiye'), 'Turkey');
  assert.equal(normalizarPais('Portugal'), 'Portugal');
});

test('país desconhecido devolve null', () => {
  assert.equal(normalizarPais('Atlantis'), null);
  assert.equal(normalizarPais(''), null);
});

test('contagemPaises separa mapeados e não mapeados', () => {
  const r = contagemPaises(['USA', 'United States', 'Brazil', 'Atlantis']);
  assert.deepEqual(r.mapeados, [
    { pais: 'United States of America', total: 2 },
    { pais: 'Brazil', total: 1 },
  ]);
  assert.deepEqual(r.naoMapeados, ['Atlantis']);
});

test('pontosComCoordenadas descarta coordenadas inválidas e conta como sem coordenadas', () => {
  const c = {
    ...novaCodificacao('e1'),
    sitios: [
      { nome: 'Válido', lat: -22.9, lng: -43.2 },
      { nome: 'Latitude fora da faixa', lat: 120, lng: 10 },
      { nome: 'Sem coordenadas', lat: null, lng: null },
    ],
  };
  const r = pontosComCoordenadas([c], 'sitios');
  assert.deepEqual(r.pontos, [{ nome: 'Válido', lat: -22.9, lng: -43.2, estudoId: 'e1' }]);
  assert.equal(r.semCoordenadas, 2);
});

test('pontosComCoordenadas lê os pontos de observação em viewpoints.pontos', () => {
  const c = novaCodificacao('e2');
  c.viewpoints.pontos = [{ nome: 'Mirante', lat: 38.7, lng: -9.1 }];
  const r = pontosComCoordenadas([c, novaCodificacao('e3')], 'viewpoints');
  assert.equal(r.pontos.length, 1);
  assert.equal(r.pontos[0].estudoId, 'e2');
  assert.equal(r.semCoordenadas, 0);
});
