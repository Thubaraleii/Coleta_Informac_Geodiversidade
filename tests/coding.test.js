import { test } from 'node:test';
import assert from 'node:assert/strict';
import { makeEstudo } from '../src/schema.js';
import { novaCodificacao, CATEGORIAS_INICIAIS, estudosAtivos, proporcaoCodificada } from '../src/coding.js';

const estudo = (titulo) => makeEstudo({ titulo }, 'scopus');

test('novaCodificacao começa pendente e sem informação de viewpoints', () => {
  const c = novaCodificacao('x');
  assert.equal(c.estudoId, 'x');
  assert.equal(c.elegibilidade, 'pendente');
  assert.equal(c.viewpoints.usa, null);
  assert.deepEqual(c.eixos, []);
  assert.deepEqual(c.viewpoints.pontos, []);
  assert.deepEqual(c.sitios, []);
  assert.equal(c.temporalidade, null);
});

test('novaCodificacao devolve objetos independentes', () => {
  const a = novaCodificacao('a');
  const b = novaCodificacao('b');
  a.eixos.push('geoturismo');
  a.viewpoints.criteriosSelecao.push('acessibilidade');
  assert.deepEqual(b.eixos, []);
  assert.deepEqual(b.viewpoints.criteriosSelecao, []);
});

test('categorias iniciais cobrem eixos, tipos de sítio e aplicações', () => {
  const nomes = (campo) => CATEGORIAS_INICIAIS[campo].map((c) => c.nome);
  assert.deepEqual(nomes('eixos'), ['geodiversidade', 'geoturismo', 'geoconservação', 'geopatrimônio']);
  for (const t of ['geomorfológico', 'paleontológico', 'arqueológico', 'mineralógico', 'outro']) {
    assert.ok(nomes('tiposSitio').includes(t), t);
  }
  for (const a of ['avaliação', 'conservação', 'valorização', 'turismo', 'educação', 'planejamento']) {
    assert.ok(nomes('aplicacao').includes(a), a);
  }
});

test('toda categoria inicial tem nome e descrição', () => {
  const campos = Object.keys(CATEGORIAS_INICIAIS);
  for (const campo of ['objeto', 'metodosAvaliacao', 'criteriosAvaliacao', 'problematicas', 'estrategias',
    'criteriosSelecao', 'metodosVisuais', 'tecnicasVisibilidade', 'caracteristicasPaisagem', 'ameacasVisuais']) {
    assert.ok(campos.includes(campo), campo);
  }
  for (const campo of campos) {
    for (const cat of CATEGORIAS_INICIAIS[campo]) {
      assert.ok(cat.nome && cat.descricao, `${campo}:${cat.nome}`);
    }
  }
});

test('estudosAtivos remove apenas os excluídos', () => {
  const a = estudo('A');
  const b = estudo('B');
  const c = estudo('C');
  const cb = { ...novaCodificacao(b.id), elegibilidade: 'excluido' };
  const cc = { ...novaCodificacao(c.id), elegibilidade: 'incluido' };
  assert.deepEqual(estudosAtivos([a, b, c], [cb, cc]).map((e) => e.titulo), ['A', 'C']);
});

test('proporcaoCodificada conta pendentes e ignora codificações órfãs', () => {
  const estudos = ['A', 'B', 'C', 'D'].map(estudo);
  const cods = [
    { ...novaCodificacao(estudos[0].id), elegibilidade: 'incluido' },
    { ...novaCodificacao('removido'), elegibilidade: 'incluido' },
  ];
  assert.deepEqual(proporcaoCodificada(estudos, cods), { codificados: 1, total: 4, pendentes: 3 });
});

test('proporcaoCodificada com codificação ainda pendente não conta como codificada', () => {
  const estudos = [estudo('A')];
  assert.deepEqual(proporcaoCodificada(estudos, [novaCodificacao(estudos[0].id)]), { codificados: 0, total: 1, pendentes: 1 });
});

test('alternarValor acumula marcações sucessivas, sem duplicar e sem mutar a lista original', async () => {
  const { alternarValor } = await import('../src/coding.js');
  const original = [];
  const a = alternarValor(original, 'geoturismo', true);
  const b = alternarValor(a, 'geopatrimônio', true);
  assert.deepEqual(b, ['geoturismo', 'geopatrimônio']);
  assert.deepEqual(alternarValor(b, 'geoturismo', true), ['geoturismo', 'geopatrimônio']);
  assert.deepEqual(alternarValor(b, 'geoturismo', false), ['geopatrimônio']);
  assert.deepEqual(original, []);
});
