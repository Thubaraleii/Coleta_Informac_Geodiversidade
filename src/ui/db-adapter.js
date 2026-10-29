import { safeId, empacotar } from '../dbids.js';

const TAMANHO_LOTE = 150000;

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

  const ultimosLotes = new Map();

  return {
    async list(colecao) {
      const snap = await db.collection(colecao).get();
      const itens = [];
      for (const d of snap.docs) {
        const dados = d.data() ?? {};
        if (colecao === 'estudos') {
          ultimosLotes.set(d.id, JSON.stringify(dados));
          for (const item of dados.itens ?? []) itens.push({ id: item.id, data: item.data });
        } else {
          itens.push({ id: d.id, data: dados });
        }
      }
      return itens;
    },
    async set(colecao, id, data) {
      await db.collection(colecao).doc(safeId(id)).set(data);
    },
    async remove(colecao, id) {
      await db.collection(colecao).doc(safeId(id)).delete();
    },
    async replaceAll(colecao, itens) {
      const lotes = empacotar(itens, TAMANHO_LOTE);
      const existentes = (await db.collection(colecao).get()).docs.map((d) => d.id);
      const nomes = new Set();
      for (let i = 0; i < lotes.length; i++) {
        const nome = `lote-${String(i).padStart(4, '0')}`;
        nomes.add(nome);
        const corpo = { itens: lotes[i] };
        const json = JSON.stringify(corpo);
        if (ultimosLotes.get(nome) === json) continue;
        await db.collection(colecao).doc(nome).set(corpo);
        ultimosLotes.set(nome, json);
      }
      for (const id of existentes) {
        if (!nomes.has(id)) {
          await db.collection(colecao).doc(id).delete();
          ultimosLotes.delete(id);
        }
      }
    },
  };
}
