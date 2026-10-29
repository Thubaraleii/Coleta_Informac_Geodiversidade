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
