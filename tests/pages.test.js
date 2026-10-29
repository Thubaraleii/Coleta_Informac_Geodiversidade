import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { novaCodificacao } from '../src/coding.js';

const RAIZ = new URL('../', import.meta.url);

test('a versão para o Pages é uma página HTML completa', () => {
  const r = spawnSync(process.execPath, ['build.js', '--pages=dist/pages/index.html'], { cwd: RAIZ, encoding: 'utf8' });
  assert.equal(r.status, 0, r.stderr);
  const html = readFileSync(new URL('dist/pages/index.html', RAIZ), 'utf8');
  assert.match(html, /^<!doctype html>/i);
  assert.match(html, /<html lang="pt-BR">/);
  assert.match(html, /<body>/);
  assert.ok(html.includes('Painel de Geodiversidade'));
  assert.ok(html.includes('cdnjs.cloudflare.com/ajax/libs/Chart.js/4.4.1/'));
  assert.ok(html.includes('Exportar base'));
  assert.ok(html.includes('Importar backup'));
});

test('novaCodificacao registra quando foi atualizada', () => {
  assert.equal(novaCodificacao('x').atualizadoEm, null);
});
