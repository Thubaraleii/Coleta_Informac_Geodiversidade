import { test, before } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';

const RAIZ = new URL('../', import.meta.url);
let html = '';

before(() => {
  const r = spawnSync(process.execPath, ['build.js'], { cwd: RAIZ, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  html = readFileSync(new URL('dist/index.html', RAIZ), 'utf8');
});

const PAGINAS = [
  ['producao', 'Produção e colaboração'],
  ['geografia', 'Geografia'],
  ['sitios', 'Sítios'],
  ['problematicas', 'Problemáticas e métodos'],
  ['viewpoints', 'Pontos de observação'],
  ['lacunas', 'Lacunas'],
  ['documental', 'Documental'],
  ['registros', 'Registros'],
  ['codificacao', 'Codificação'],
  ['importacao', 'Importação'],
];

test('o HTML tem as dez páginas na navegação', () => {
  for (const [id, titulo] of PAGINAS) {
    assert.match(html, new RegExp(`data-pagina="${id}"`), id);
    assert.ok(html.includes(titulo), titulo);
  }
});

test('o título do documento é um nome curto', () => {
  assert.match(html, /<title>Painel de Geodiversidade<\/title>/);
});

test('só carrega scripts externos do cdnjs, com versão exata', () => {
  const externos = [...html.matchAll(/<script[^>]+src="([^"]+)"/g)].map((m) => m[1]);
  assert.ok(externos.length >= 1);
  for (const url of externos) assert.match(url, /^https:\/\/cdnjs\.cloudflare\.com\/ajax\/libs\//, url);
  assert.ok(externos.some((u) => u.includes('Chart.js/4.4.1/')));
});

test('o mapa-múndi vem embutido e o script do app está inline', () => {
  assert.ok(html.includes('United States of America'));
  assert.ok(html.includes('Brazil'));
  assert.ok(!/<script[^>]+src="(?!https:\/\/cdnjs)/.test(html));
});

test('o HTML é um fragmento de página (sem doctype nem body próprios)', () => {
  assert.ok(!/<!doctype/i.test(html));
  assert.ok(!/<body/i.test(html));
  assert.match(html, /name="claude:viewport-fit-sides"/);
});

test('o bundle declara estudos sem coordenadas em vez de posicioná-los', () => {
  assert.ok(html.includes('sem coordenadas'));
});

test('a página documental não importa módulos de métricas, redes, filtros nem lacunas', () => {
  const fonte = readFileSync(new URL('src/ui/documental.js', RAIZ), 'utf8');
  for (const proibido of ['metrics', 'networks', 'filters', 'qualitative', 'geo.js', 'charts']) {
    assert.ok(!new RegExp(`from '[^']*${proibido}`).test(fonte), proibido);
  }
});

test('os módulos de métricas, redes, filtros e lacunas não conhecem documentos', () => {
  for (const arq of ['metrics', 'networks', 'filters', 'qualitative']) {
    const fonte = readFileSync(new URL(`src/${arq}.js`, RAIZ), 'utf8');
    assert.ok(!/documento/i.test(fonte), arq);
  }
});
