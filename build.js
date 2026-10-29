import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { build } from 'esbuild';
import { feature } from 'topojson-client';

const aqui = (caminho) => new URL(caminho, import.meta.url);

function gerarMundo() {
  const topo = JSON.parse(readFileSync(aqui('node_modules/world-atlas/countries-110m.json'), 'utf8'));
  const colecao = feature(topo, topo.objects.countries);
  const arredondar = (c) => (typeof c[0] === 'number' ? [Math.round(c[0] * 10) / 10, Math.round(c[1] * 10) / 10] : c.map(arredondar));
  const paises = colecao.features.map((f) => ({
    nome: f.properties.name,
    tipo: f.geometry.type,
    coordenadas: arredondar(f.geometry.coordinates),
  }));
  writeFileSync(aqui('src/ui/mundo.generated.js'), `export const MUNDO = ${JSON.stringify(paises)};\n`);
}

gerarMundo();

const resultado = await build({
  entryPoints: [new URL('src/ui/app.js', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1')],
  bundle: true,
  format: 'iife',
  target: 'es2020',
  write: false,
  charset: 'utf8',
  logLevel: 'warning',
});
const script = resultado.outputFiles[0].text.replace(/<\/script/gi, '<\\/script');

const modelo = readFileSync(aqui('src/index.template.html'), 'utf8');
if (!modelo.includes('/*__SCRIPT__*/')) throw new Error('Marcador /*__SCRIPT__*/ ausente no template');
const html = modelo.replace('/*__SCRIPT__*/', () => script);

mkdirSync(aqui('dist/'), { recursive: true });
writeFileSync(aqui('dist/index.html'), html);
console.log(`dist/index.html gerado (${Math.round(html.length / 1024)} KB)`);

// Versão para hospedagem estática (GitHub Pages): o mesmo conteúdo dentro de uma página HTML completa.
// Uso: node build.js --pages=index.html,docs/index.html
const argPages = process.argv.find((a) => a.startsWith('--pages='));
if (argPages) {
  const paginaCompleta = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>:root{color-scheme:light}body{margin:0;font-size:14px}</style>
</head>
<body>
${html}
</body>
</html>
`;
  for (const caminho of argPages.slice('--pages='.length).split(',').filter(Boolean)) {
    const destino = aqui(caminho);
    mkdirSync(new URL('./', destino), { recursive: true });
    writeFileSync(destino, paginaCompleta);
    console.log(`${caminho} gerado (${Math.round(paginaCompleta.length / 1024)} KB)`);
  }
}
