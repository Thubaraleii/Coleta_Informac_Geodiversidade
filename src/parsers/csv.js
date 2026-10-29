export function semBom(texto) {
  return texto.charCodeAt(0) === 0xfeff ? texto.slice(1) : texto;
}

export function parseCsv(texto, delimitador = ',', usarAspas = true) {
  const t = semBom(texto);
  const linhas = [];
  let linha = [];
  let campo = '';
  let aspas = false;
  for (let i = 0; i < t.length; i++) {
    const c = t[i];
    if (aspas) {
      if (c === '"') {
        if (t[i + 1] === '"') { campo += '"'; i++; } else { aspas = false; }
      } else {
        campo += c;
      }
    } else if (c === '"' && usarAspas) {
      aspas = true;
    } else if (c === delimitador) {
      linha.push(campo); campo = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && t[i + 1] === '\n') i++;
      linha.push(campo); campo = '';
      linhas.push(linha); linha = [];
    } else {
      campo += c;
    }
  }
  if (campo !== '' || linha.length > 0) { linha.push(campo); linhas.push(linha); }
  return linhas.filter((l) => !(l.length === 1 && l[0] === ''));
}

export function linhasComoObjetos(texto, delimitador = ',', usarAspas = true) {
  const [cabecalho, ...resto] = parseCsv(texto, delimitador, usarAspas);
  if (!cabecalho) return [];
  return resto.map((linha) => Object.fromEntries(cabecalho.map((nome, i) => [nome.trim(), linha[i] ?? ''])));
}

export function dividir(valor, separador = ';') {
  return String(valor ?? '').split(separador).map((s) => s.trim()).filter(Boolean);
}

export function paisesDeAfiliacoes(afiliacoes) {
  const vistos = [];
  for (const af of afiliacoes) {
    const partes = af.split(',').map((s) => s.trim()).filter(Boolean);
    let pais = partes.length > 1 ? partes[partes.length - 1].replace(/\.$/, '') : '';
    if (/\bUSA$/i.test(pais)) pais = 'USA';
    if (pais && !vistos.includes(pais)) vistos.push(pais);
  }
  return vistos;
}
