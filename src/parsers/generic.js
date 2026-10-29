import { makeEstudo, registroValido } from '../schema.js';
import { dividir, semBom } from './csv.js';

function limparLatex(v) {
  return v.replace(/\\['`^"~]/g, '').replace(/[{}]/g, '').replace(/\s+/g, ' ').trim();
}

function lerCampos(corpo) {
  const campos = {};
  const nomeCampo = /([A-Za-z_-]+)\s*=\s*/y;
  let i = 0;
  while (i < corpo.length) {
    nomeCampo.lastIndex = i;
    const achado = nomeCampo.exec(corpo);
    if (!achado) { i++; continue; }
    const nome = achado[1].toLowerCase();
    i = nomeCampo.lastIndex;
    let valor = '';
    if (corpo[i] === '{') {
      let nivel = 0;
      const ini = i;
      for (; i < corpo.length; i++) {
        if (corpo[i] === '{') nivel++;
        else if (corpo[i] === '}') { nivel--; if (nivel === 0) { i++; break; } }
      }
      valor = corpo.slice(ini + 1, i - 1);
    } else if (corpo[i] === '"') {
      const fim = corpo.indexOf('"', i + 1);
      valor = corpo.slice(i + 1, fim);
      i = fim + 1;
    } else {
      const fim = corpo.slice(i).search(/[,\n}]/);
      const f = fim === -1 ? corpo.length : i + fim;
      valor = corpo.slice(i, f);
      i = f;
    }
    campos[nome] = limparLatex(valor);
  }
  return campos;
}

const TIPOS_IGNORADOS = new Set(['string', 'preamble', 'comment']);

export function parseBibtex(texto) {
  const t = semBom(texto);
  const estudos = [];
  const abertura = /@(\w+)\s*\{/g;
  let m;
  while ((m = abertura.exec(t)) !== null) {
    const inicio = m.index + m[0].length;
    let nivel = 1;
    let i = inicio;
    for (; i < t.length && nivel > 0; i++) {
      if (t[i] === '{') nivel++;
      else if (t[i] === '}') nivel--;
    }
    abertura.lastIndex = i;
    if (TIPOS_IGNORADOS.has(m[1].toLowerCase())) continue;
    const interior = t.slice(inicio, i - 1);
    const virgula = interior.indexOf(',');
    const campos = lerCampos(virgula >= 0 ? interior.slice(virgula + 1) : '');
    estudos.push(
      makeEstudo(
        {
          titulo: campos.title,
          autores: String(campos.author ?? '').split(/\s+and\s+/).map((s) => s.trim()).filter(Boolean),
          ano: campos.year,
          periodico: campos.journal ?? campos.booktitle,
          doi: campos.doi,
          resumo: campos.abstract,
          palavrasChave: dividir(campos.keywords),
          idioma: campos.language,
        },
        'bibtex',
      ),
    );
  }
  return estudos.filter(registroValido);
}

export function parseRis(texto) {
  const blocos = semBom(texto).split(/^ER\s+-.*$/m);
  const estudos = [];
  for (const bloco of blocos) {
    const campos = {};
    for (const linha of bloco.split(/\r?\n/)) {
      const m = /^([A-Z][A-Z0-9])\s{2}-\s?(.*)$/.exec(linha);
      if (!m) continue;
      (campos[m[1]] ??= []).push(m[2].trim());
    }
    const titulo = (campos.TI ?? campos.T1 ?? [])[0];
    if (!titulo) continue;
    estudos.push(
      makeEstudo(
        {
          titulo,
          autores: campos.AU ?? campos.A1 ?? [],
          ano: String((campos.PY ?? campos.Y1 ?? [''])[0]).slice(0, 4),
          periodico: (campos.JO ?? campos.JF ?? campos.T2 ?? [''])[0],
          doi: (campos.DO ?? [''])[0],
          resumo: (campos.AB ?? [''])[0],
          palavrasChave: campos.KW ?? [],
          idioma: (campos.LA ?? [''])[0],
        },
        'ris',
      ),
    );
  }
  return estudos.filter(registroValido);
}
