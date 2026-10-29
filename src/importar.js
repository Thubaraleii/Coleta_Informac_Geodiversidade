import { mergeEstudos } from './dedupe.js';

/**
 * Importa estudos já convertidos. Relê a base antes de unir, para não apagar o que outra
 * pessoa importou depois que esta página abriu, e só grava quando algo mudou.
 */
export async function importarEstudos(store, novos) {
  const atuais = await store.listEstudos();
  const r = mergeEstudos(atuais, novos);
  const gravou = r.adicionados > 0 || r.alterados > 0;
  if (gravou) await store.saveEstudos(r.resultado);
  return { ...r, gravou };
}
