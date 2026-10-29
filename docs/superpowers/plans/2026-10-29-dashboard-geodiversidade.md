# Dashboard de produção científica em geodiversidade — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um dashboard web que importa exportações bibliográficas, deixa a Stefany codificar cada estudo, e mostra bibliometria, análise qualitativa, lacunas e uma aba documental separada.

**Architecture:** Lógica pura em módulos ES sem dependências (parsers, deduplicação, métricas, lacunas) testada com `node --test`. Uma camada `store` isola o banco compartilhado do Artifact atrás de um adaptador, com adaptador em memória nos testes. Um `build.js` junta tudo em um único `dist/index.html`, publicado como Artifact privado com banco compartilhado.

**Tech Stack:** JavaScript (ES modules), Node 18+ para testes (`node:test`), Chart.js 4.4.1 via cdnjs, Artifact do claude.ai com capacidade de banco (`db`).

**Spec:** `docs/superpowers/specs/2026-10-29-dashboard-geodiversidade-design.md`

## Global Constraints

- Coleções do banco: exatamente `estudos`, `codificacao`, `categorias`, `documentos`.
- `documentos` nunca entra em nenhuma métrica bibliométrica; nenhuma função de `src/metrics.js` ou `src/gaps.js` recebe documentos.
- O arquivo importado não é guardado, só os registros convertidos.
- Duplicatas: por DOI e, sem DOI, por título normalizado; o registro guarda todas as bases de origem em `bases`.
- Campos ausentes aparecem como "não informado"; não codificados como "pendente"; nada disso quebra gráficos.
- Arquivo em formato desconhecido gera mensagem clara e não altera a base.
- Dependências externas só de cdnjs.cloudflare.com, com versão exata.
- Interface em português do Brasil.

## Review Focus

- CSV da Scopus com vírgulas, aspas e quebras de linha dentro de campos, e arquivo com BOM: deve ler os registros sem deslocar colunas.
- DOI em formatos variados (`https://doi.org/10.1/X`, `10.1/x`, maiúsculas): devem contar como o mesmo estudo.
- Importar o mesmo arquivo duas vezes: a segunda importação não pode criar nenhum registro novo.
- Base vazia ou com todos os anos ausentes: todas as abas renderizam sem erro, mostrando "não informado".
- Milhares de registros (5.000): importação, métricas e rede de coocorrência continuam responsivos.

---

### Task 1: Esquema comum e normalização

**Files:**
- Create: `package.json` (`"type": "module"`, script `test`: `node --test`)
- Create: `src/schema.js`
- Test: `tests/schema.test.js`

**Interfaces:**
- Produces: `normalizeDoi(raw: string | null): string | null` (minúsculo, sem prefixo de URL); `normalizeTitle(raw: string): string` (minúsculo, sem acentos e pontuação, espaços colapsados); `makeEstudo(partial: object, base: string): Estudo` com `Estudo = {id: string, titulo: string, autores: string[], ano: number | null, periodico: string, doi: string | null, resumo: string, palavrasChave: string[], paises: string[], citacoes: number | null, bases: string[], incompleto: boolean}`. O `id` é o DOI normalizado ou, sem DOI, `t:` + título normalizado.

- [ ] **Step 1: Run `git init` na pasta do projeto e criar `package.json`**
- [ ] **Step 2: Write failing tests** em `tests/schema.test.js`: `normalizeDoi('https://doi.org/10.1/ABC')` e `normalizeDoi('10.1/abc')` retornam ambos `'10.1/abc'`; `normalizeDoi('')` retorna `null`; `normalizeTitle('Geodiversidade: Conceitos!')` retorna `'geodiversidade conceitos'`; `makeEstudo({titulo: 'X', ano: 'abc'}, 'scopus').ano` é `null`; `makeEstudo` sem DOI tem `incompleto === true` quando faltam resumo ou palavras-chave.
- [ ] **Step 3: Run** `npm test` e confirmar FAIL.
- [ ] **Step 4: Implement** as três funções em `src/schema.js`; ano só é aceito se inteiro entre 1800 e 2100.
- [ ] **Step 5: Run** `npm test` e confirmar PASS.
- [ ] **Step 6: Commit** `feat: esquema comum de estudos`

### Task 2: Parsers de exportação

**Files:**
- Create: `src/parsers/csv.js` (leitor CSV com aspas), `src/parsers/scopus.js`, `src/parsers/wos.js`, `src/parsers/generic.js` (BibTeX e RIS), `src/parsers/index.js`
- Test: `tests/parsers.test.js`
- Create: `tests/fixtures/scopus.csv`, `wos.txt`, `sample.bib`, `sample.ris` (3 registros cada, um deles sem DOI e um com vírgula e quebra de linha em campo entre aspas, o de Scopus com BOM)

**Interfaces:**
- Consumes: `makeEstudo(partial, base)` da Task 1.
- Produces: `parseScopusCsv(text: string): Estudo[]`; `parseWosTabDelimited(text: string): Estudo[]`; `parseBibtex(text: string): Estudo[]`; `parseRis(text: string): Estudo[]`; `detectFormat(text: string, filename: string): 'scopus' | 'wos' | 'bibtex' | 'ris' | null`; `parseFile(text: string, filename: string): {format: string, estudos: Estudo[]}` que lança `Error('Formato não reconhecido')` quando `detectFormat` retorna `null`. Base gravada em `bases`: `'scopus'`, `'wos'`, `'bibtex'`, `'ris'`.

- [ ] **Step 1: Write failing tests**: cada parser devolve 3 estudos da sua fixture; o campo com vírgula e quebra de linha vem inteiro no título; o BOM não corrompe o nome da primeira coluna; palavras-chave separadas por `;` viram array; `detectFormat('lixo', 'a.txt')` é `null` e `parseFile('lixo', 'a.txt')` lança erro.
- [ ] **Step 2: Run** `npm test` e confirmar FAIL.
- [ ] **Step 3: Implement** o leitor CSV e os quatro parsers mapeando colunas: Scopus (`Title`, `Authors`, `Year`, `Source title`, `DOI`, `Abstract`, `Author Keywords`, `Cited by`, `Affiliations` para países pelo último trecho após vírgula); WoS (tags `TI`, `AU`, `PY`, `SO`, `DI`, `AB`, `DE`, `TC`, `C1`).
- [ ] **Step 4: Run** `npm test` e confirmar PASS.
- [ ] **Step 5: Commit** `feat: parsers de Scopus, WoS, BibTeX e RIS`

### Task 3: Deduplicação e fusão

**Files:**
- Create: `src/dedupe.js`
- Test: `tests/dedupe.test.js`

**Interfaces:**
- Consumes: `Estudo` da Task 1.
- Produces: `mergeEstudos(existentes: Estudo[], novos: Estudo[]): {resultado: Estudo[], adicionados: number, duplicados: number}`. Em duplicata, mantém o registro existente, une `bases` sem repetir e preenche campos vazios com os do novo registro.

- [ ] **Step 1: Write failing tests**: mesmo DOI em formatos diferentes funde em um registro; dois estudos sem DOI com título igual após normalização fundem; `bases` fica `['scopus','wos']`; importar a mesma lista duas vezes dá `adicionados === 0`; registro existente com resumo vazio recebe o resumo do novo.
- [ ] **Step 2: Run** `npm test` e confirmar FAIL.
- [ ] **Step 3: Implement** `mergeEstudos` indexando por `id` num `Map` (O(n), para suportar 5.000 registros).
- [ ] **Step 4: Run** `npm test` e confirmar PASS.
- [ ] **Step 5: Commit** `feat: deduplicacao por DOI e titulo`

### Task 4: Métricas bibliométricas

**Files:**
- Create: `src/metrics.js`
- Test: `tests/metrics.test.js`

**Interfaces:**
- Consumes: `Estudo` da Task 1.
- Produces: `producaoPorAno(estudos: Estudo[]): {ano: number | null, total: number}[]` (ordenado, `null` por último = "não informado"); `topContagem(estudos: Estudo[], campo: 'autores' | 'periodico' | 'paises' | 'palavrasChave', n: number): {nome: string, total: number}[]` (vazios entram como `'não informado'`); `citacoesTotais(estudos: Estudo[]): number`; `coocorrencia(estudos: Estudo[], minPeso: number): {nos: {id: string, total: number}[], arestas: {a: string, b: string, peso: number}[]}`.

- [ ] **Step 1: Write failing tests**: lista vazia devolve arrays vazios em todas as funções, sem lançar; estudos sem ano entram em `{ano: null}`; `topContagem` respeita `n` e ordena decrescente; `coocorrencia` com `minPeso = 2` descarta pares que aparecem uma vez; um conjunto de 5.000 estudos gerados no teste roda `coocorrencia` em menos de 2 segundos.
- [ ] **Step 2: Run** `npm test` e confirmar FAIL.
- [ ] **Step 3: Implement** as quatro funções; palavras-chave comparadas em minúsculas; `coocorrencia` limita os nós às 100 palavras mais frequentes antes de montar os pares.
- [ ] **Step 4: Run** `npm test` e confirmar PASS.
- [ ] **Step 5: Commit** `feat: metricas bibliometricas`

### Task 5: Codificação, categorias e lacunas

**Files:**
- Create: `src/coding.js`, `src/gaps.js`
- Test: `tests/coding.test.js`, `tests/gaps.test.js`

**Interfaces:**
- Consumes: `Estudo` da Task 1.
- Produces: tipo `Codificacao = {estudoId: string, objeto: string[], metodo: string[], problematica: string[], aplicacao: string[], lacuna: string, observacao: string}`; `CATEGORIAS_INICIAIS: {objeto: string[], metodo: string[], problematica: string[], aplicacao: string[]}` (aplicação inclui `'avaliação'`, `'conservação'`, `'valorização'`; as demais listas começam com poucos itens editáveis); `proporcaoCodificada(estudos: Estudo[], codificacoes: Codificacao[]): {codificados: number, total: number, pendentes: number}` (ignora codificações cujo `estudoId` não existe mais); `contagemPorEixo(codificacoes: Codificacao[], eixo: 'objeto' | 'metodo' | 'problematica' | 'aplicacao'): {nome: string, total: number}[]`; `cruzar(codificacoes: Codificacao[], eixoA: string, eixoB: string): {linhas: string[], colunas: string[], celulas: number[][], menosEstudadas: {a: string, b: string, total: number}[]}` (`menosEstudadas` lista as combinações com contagem zero ou a menor).

- [ ] **Step 1: Write failing tests**: `proporcaoCodificada` com 4 estudos e 1 codificação dá `pendentes === 3`; codificação de estudo removido não conta; `cruzar` de duas codificações dá a matriz esperada e inclui a combinação com 0 em `menosEstudadas`; sem codificações, `cruzar` devolve matriz vazia sem lançar.
- [ ] **Step 2: Run** `npm test` e confirmar FAIL.
- [ ] **Step 3: Implement** os módulos.
- [ ] **Step 4: Run** `npm test` e confirmar PASS.
- [ ] **Step 5: Commit** `feat: codificacao e analise de lacunas`

### Task 6: Camada de armazenamento

**Files:**
- Create: `src/store.js`, `src/documentos.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Produces: `createStore(adapter: Adapter): Store` com `Adapter = {list(col: string): Promise<{id: string, data: object}[]>, set(col: string, id: string, data: object): Promise<void>, remove(col: string, id: string): Promise<void>}` e `Store = {listEstudos(): Promise<Estudo[]>, saveEstudos(e: Estudo[]): Promise<void>, getCodificacoes(): Promise<Codificacao[]>, saveCodificacao(c: Codificacao): Promise<void>, getCategorias(): Promise<Categorias>, saveCategorias(c: Categorias): Promise<void>, listDocumentos(): Promise<Documento[]>, saveDocumento(d: Documento): Promise<void>, removeDocumento(id: string): Promise<void>}`; `memoryAdapter(): Adapter` para testes; `Documento = {id: string, titulo: string, ente: string, esfera: string, ano: number | null, tipo: string, tema: string, dispositivo: string}`.
- Consumes: `CATEGORIAS_INICIAIS` da Task 5 (`getCategorias` devolve as iniciais quando a coleção está vazia).

- [ ] **Step 1: Write failing tests** com `memoryAdapter`: salvar e listar estudos preserva os dados; `saveEstudos` do mesmo conjunto duas vezes não duplica; `listEstudos` nunca devolve itens de `documentos`; `getCategorias` numa base nova devolve `CATEGORIAS_INICIAIS`.
- [ ] **Step 2: Run** `npm test` e confirmar FAIL.
- [ ] **Step 3: Implement** o store; cada função lê/escreve só a sua coleção.
- [ ] **Step 4: Run** `npm test` e confirmar PASS.
- [ ] **Step 5: Commit** `feat: camada de armazenamento`

### Task 7: Interface (abas) e build do Artifact

**Files:**
- Create: `src/ui/app.js`, `src/ui/importacao.js`, `src/ui/panorama.js`, `src/ui/qualitativa.js`, `src/ui/lacunas.js`, `src/ui/documental.js`, `src/ui/codificacao.js`, `src/ui/db-adapter.js`, `src/index.template.html`, `build.js`
- Test: `tests/build.test.js`

**Interfaces:**
- Consumes: `parseFile` (Task 2), `mergeEstudos` (Task 3), métricas (Task 4), `proporcaoCodificada`, `contagemPorEixo`, `cruzar` (Task 5), `createStore` e `Store` (Task 6).
- Produces: `dist/index.html` (arquivo único). `src/ui/db-adapter.js` exporta `artifactDbAdapter(): Adapter` ligado ao banco compartilhado do Artifact.

- [ ] **Step 1: Carregar as skills `artifact-design` e `artifact-capabilities`** e usar a chamada exata do banco compartilhado para implementar `artifactDbAdapter`; declarar a capacidade `db` na publicação.
- [ ] **Step 2: Write failing test** `tests/build.test.js`: depois de `node build.js`, `dist/index.html` existe, contém as seis abas (Panorama, Qualitativa, Lacunas, Documental, Codificação, Importação) e referencia Chart.js em `cdnjs.cloudflare.com` com versão `4.4.1`.
- [ ] **Step 3: Run** `npm test` e confirmar FAIL.
- [ ] **Step 4: Implement** as abas: Importação (envio de arquivos, resumo `adicionados/duplicados`, erro claro em formato desconhecido); Panorama (gráficos de ano, países, autores, periódicos, palavras-chave, rede de coocorrência com Chart.js ou SVG); Qualitativa (gráficos por eixo e a proporção codificada no topo); Lacunas (matriz `cruzar` com seleção de eixos e destaque das menos estudadas); Codificação (formulário por estudo, categorias editáveis); Documental (lista e formulário de `Documento`, sem ligação com nenhuma métrica). Valores ausentes mostram "não informado" e "pendente". `build.js` inlina os módulos no template.
- [ ] **Step 5: Run** `npm test` e confirmar PASS.
- [ ] **Step 6: Commit** `feat: interface e build do dashboard`

### Task 8: Verificação no navegador e publicação

**Files:**
- Modify: nenhum arquivo de código esperado; correções entram nos módulos da tarefa afetada.

- [ ] **Step 1: Run** `node build.js` e abrir `dist/index.html` no navegador interno com os arquivos de `tests/fixtures`.
- [ ] **Step 2: Verificar** na ordem: importar Scopus e WoS (a contagem de duplicados bate), importar o mesmo arquivo de novo (nada novo), codificar um estudo e ver a proporção e os gráficos mudarem, cadastrar um documento e conferir que nenhum número do Panorama muda.
- [ ] **Step 3: Verificar** estado vazio (banco novo) em todas as abas, sem erros no console.
- [ ] **Step 4: Publicar** `dist/index.html` com a ferramenta Artifact (privado, capacidade `db`) e entregar o link ao usuário, informando que o compartilhamento com a Stefany depende dele.
- [ ] **Step 5: Commit** `chore: versao publicada`
