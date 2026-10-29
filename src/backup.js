import { importarEstudos } from './importar.js';

export const FORMATO_BACKUP = 'painel-geodiversidade';
export const VERSAO_BACKUP = 1;

const invalido = (motivo) => new Error(`Backup inválido: ${motivo}`);

export async function exportarBase(store) {
  const [estudos, codificacoes, categorias, documentos] = await Promise.all([
    store.listEstudos(),
    store.getCodificacoes(),
    store.getCategorias(),
    store.listDocumentos(),
  ]);
  return { formato: FORMATO_BACKUP, versao: VERSAO_BACKUP, exportadoEm: new Date().toISOString(), estudos, codificacoes, categorias, documentos };
}

function validar(dados) {
  if (dados === null || typeof dados !== 'object' || Array.isArray(dados)) throw invalido('o arquivo não é um objeto');
  if (dados.formato !== FORMATO_BACKUP) throw invalido('o arquivo não foi gerado por este painel');
  if (dados.versao !== VERSAO_BACKUP) throw invalido(`versão ${dados.versao} não é suportada`);
  for (const campo of ['estudos', 'codificacoes', 'documentos']) {
    if (!Array.isArray(dados[campo])) throw invalido(`o campo "${campo}" deve ser uma lista`);
  }
  if (dados.categorias === null || typeof dados.categorias !== 'object' || Array.isArray(dados.categorias)) throw invalido('o campo "categorias" deve ser um objeto');
  if (dados.estudos.some((e) => !e || typeof e.id !== 'string')) throw invalido('há estudos sem id');
  if (dados.codificacoes.some((c) => !c || typeof c.estudoId !== 'string')) throw invalido('há codificações sem estudoId');
  if (dados.documentos.some((d) => !d || typeof d.id !== 'string')) throw invalido('há documentos sem id');
}

/**
 * Soma um backup à base atual. Estudos são unidos por DOI/título; na codificação do mesmo estudo vence a mais
 * recente (empate mantém a existente); categorias e documentos só entram se forem novos.
 */
export async function importarBackup(store, dados) {
  validar(dados);

  const est = await importarEstudos(store, dados.estudos);

  const existentes = new Map((await store.getCodificacoes()).map((c) => [c.estudoId, c]));
  let novas = 0;
  let atualizadas = 0;
  for (const c of dados.codificacoes) {
    const atual = existentes.get(c.estudoId);
    if (!atual) {
      await store.saveCodificacao(c);
      novas++;
    } else if ((c.atualizadoEm ?? '') > (atual.atualizadoEm ?? '')) {
      await store.saveCodificacao(c);
      atualizadas++;
    }
  }

  const categorias = await store.getCategorias();
  let categoriasNovas = 0;
  for (const [campo, lista] of Object.entries(dados.categorias)) {
    if (!Array.isArray(lista)) continue;
    const atuais = categorias[campo] ?? [];
    const nomes = new Set(atuais.map((c) => c.nome));
    const acrescentar = lista.filter((c) => c && typeof c.nome === 'string' && !nomes.has(c.nome));
    if (acrescentar.length > 0) {
      categorias[campo] = [...atuais, ...acrescentar];
      categoriasNovas += acrescentar.length;
    }
  }
  if (categoriasNovas > 0) await store.saveCategorias(categorias);

  const idsDocumentos = new Set((await store.listDocumentos()).map((d) => d.id));
  let documentosNovos = 0;
  for (const d of dados.documentos) {
    if (idsDocumentos.has(d.id)) continue;
    await store.saveDocumento(d);
    documentosNovos++;
  }

  return {
    estudos: { adicionados: est.adicionados, alterados: est.alterados },
    codificacoes: { novas, atualizadas },
    categorias: { novas: categoriasNovas },
    documentos: { novos: documentosNovos },
  };
}
