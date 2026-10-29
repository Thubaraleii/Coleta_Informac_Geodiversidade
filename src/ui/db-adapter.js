import { safeId, empacotar, paginaDe, PAGINAS_CODIFICACAO } from '../dbids.js';

const TAMANHO_LOTE_BYTES = 120000;
const LIMITE_CONSULTA = 1000;

function leituraTruncada(colecao) {
  const erro = new Error(`A leitura de "${colecao}" chegou ao limite de ${LIMITE_CONSULTA} documentos e pode estar incompleta.`);
  erro.code = 'resource_exhausted';
  return erro;
}

async function ler(consulta, colecao) {
  const { docs } = await consulta.get();
  if (docs.length >= LIMITE_CONSULTA) throw leituraTruncada(colecao);
  return docs;
}

/** Adaptador do banco compartilhado do Artifact; devolve null quando o banco não está disponível. */
export async function artifactDbAdapter() {
  const api = globalThis.claude;
  if (!api || typeof api.use !== 'function') return null;
  let db = null;
  try {
    db = await api.use('db');
  } catch {
    return null;
  }
  if (!db) return null;

  return {
    async list(colecao) {
      if (colecao === 'codificacao') {
        const paginas = await Promise.all(
          Array.from({ length: PAGINAS_CODIFICACAO }, (_, p) => ler(db.collection(colecao).where('_pg', '==', p), colecao)),
        );
        return paginas.flat().map((d) => {
          const { _pg, ...dados } = d.data() ?? {};
          return { id: d.id, data: dados };
        });
      }
      const docs = await ler(db.collection(colecao), colecao);
      const itens = [];
      for (const d of docs) {
        const dados = d.data() ?? {};
        if (colecao === 'estudos') for (const item of dados.itens ?? []) itens.push({ id: item.id, data: item.data });
        else itens.push({ id: d.id, data: dados });
      }
      return itens;
    },
    async set(colecao, id, data) {
      const corpo = colecao === 'codificacao' ? { ...data, _pg: paginaDe(id) } : data;
      await db.collection(colecao).doc(safeId(id)).set(corpo);
    },
    async remove(colecao, id) {
      await db.collection(colecao).doc(safeId(id)).delete();
    },
    async replaceAll(colecao, itens) {
      const lotes = empacotar(itens, TAMANHO_LOTE_BYTES);
      const existentes = await ler(db.collection(colecao), colecao);
      const noBanco = new Map(existentes.map((d) => [d.id, JSON.stringify(d.data())]));
      const nomes = new Set();
      for (let i = 0; i < lotes.length; i++) {
        const nome = `lote-${String(i).padStart(4, '0')}`;
        nomes.add(nome);
        const corpo = { itens: lotes[i] };
        if (noBanco.get(nome) === JSON.stringify(corpo)) continue;
        await db.collection(colecao).doc(nome).set(corpo);
      }
      for (const id of noBanco.keys()) {
        if (!nomes.has(id)) await db.collection(colecao).doc(id).delete();
      }
    },
  };
}
