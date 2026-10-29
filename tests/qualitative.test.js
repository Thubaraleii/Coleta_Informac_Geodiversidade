import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEstudo } from '../src/schema.js';
import { novaCodificacao } from '../src/coding.js';
import { contagemPorCampo, contagemTemporalidade, resumoViewpoints, cruzar, cruzarPaisTema, limitacoesRecorrentes } from '../src/qualitative.js';

const cod = (id, extra = {}) => ({ ...novaCodificacao(id), elegibilidade: 'incluido', ...extra });

test('contagemPorCampo conta valores de listas e do caminho viewpoints.*', () => {
  const cods = [
    cod('a', { tiposSitio: ['geomorfológico', 'paleontológico'], viewpoints: { ...novaCodificacao('a').viewpoints, criteriosSelecao: ['acessibilidade'] } }),
    cod('b', { tiposSitio: ['geomorfológico'] }),
  ];
  assert.deepEqual(contagemPorCampo(cods, 'tiposSitio'), [
    { nome: 'geomorfológico', total: 2 },
    { nome: 'paleontológico', total: 1 },
  ]);
  assert.deepEqual(contagemPorCampo(cods, 'viewpoints.criteriosSelecao'), [{ nome: 'acessibilidade', total: 1 }]);
  assert.deepEqual(contagemPorCampo([], 'tiposSitio'), []);
});

test('contagemTemporalidade ignora nulos e traduz os valores', () => {
  const cods = [cod('a', { temporalidade: 'antigo' }), cod('b', { temporalidade: 'antigo' }), cod('c', { temporalidade: 'recente' }), cod('d')];
  assert.deepEqual(contagemTemporalidade(cods), [
    { nome: 'registro geológico antigo', total: 2 },
    { nome: 'processo ou registro recente', total: 1 },
  ]);
});

test('resumoViewpoints separa sim, não e sem informação', () => {
  const vp = (usa) => ({ ...novaCodificacao('x').viewpoints, usa });
  const cods = [cod('a', { viewpoints: vp(true) }), cod('b', { viewpoints: vp(false) }), cod('c'), cod('d', { viewpoints: vp(true) })];
  assert.deepEqual(resumoViewpoints(cods), { usam: 2, naoUsam: 1, semInformacao: 1 });
});

test('cruzar monta a matriz e coloca a combinação com zero em menosEstudadas', () => {
  const cods = [
    cod('a', { tiposSitio: ['geomorfológico'], aplicacao: ['avaliação'] }),
    cod('b', { tiposSitio: ['geomorfológico', 'paleontológico'], aplicacao: ['conservação'] }),
  ];
  const r = cruzar(cods, 'tiposSitio', 'aplicacao');
  assert.deepEqual(r.linhas, ['geomorfológico', 'paleontológico']);
  assert.deepEqual(r.colunas, ['avaliação', 'conservação']);
  assert.deepEqual(r.celulas, [[1, 1], [0, 1]]);
  assert.deepEqual(r.menosEstudadas[0], { a: 'paleontológico', b: 'avaliação', total: 0 });
});

test('cruzar sem codificações devolve estrutura vazia', () => {
  assert.deepEqual(cruzar([], 'tiposSitio', 'aplicacao'), { linhas: [], colunas: [], celulas: [], menosEstudadas: [] });
});

test('cruzar limita menosEstudadas a 20 combinações', () => {
  const cods = [];
  for (let i = 0; i < 6; i++) cods.push(cod(`s${i}`, { objeto: [`o${i}`], estrategias: [`e${i}`] }));
  assert.equal(cruzar(cods, 'objeto', 'estrategias').menosEstudadas.length, 20);
});

test('cruzarPaisTema usa países estudados e ignora estudos sem codificação', () => {
  const a = makeEstudo({ titulo: 'A' }, 'scopus');
  const b = makeEstudo({ titulo: 'B' }, 'scopus');
  const cods = [cod(a.id, { paisesEstudados: ['Brazil'], eixos: ['geoturismo'] })];
  const r = cruzarPaisTema([a, b], cods, 'eixos');
  assert.deepEqual(r.linhas, ['Brazil']);
  assert.deepEqual(r.colunas, ['geoturismo']);
  assert.deepEqual(r.celulas, [[1]]);
});

test('limitacoesRecorrentes agrupa textos iguais ignorando caixa e espaços', () => {
  const cods = [
    cod('a', { limitacoes: 'Amostra pequena' }),
    cod('b', { limitacoes: '  amostra   PEQUENA ' }),
    cod('c', { limitacoes: 'Sem coordenadas' }),
    cod('d'),
  ];
  assert.deepEqual(limitacoesRecorrentes(cods, 5), [
    { texto: 'amostra pequena', total: 2 },
    { texto: 'sem coordenadas', total: 1 },
  ]);
});
