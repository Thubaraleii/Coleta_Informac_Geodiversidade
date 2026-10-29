# Dashboard de produção científica em geodiversidade — Plano de implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir um dashboard web que importa exportações bibliográficas, deixa a Stefany codificar cada estudo conforme um dicionário editável, e responde às 11 perguntas do `Dashboard.docx` com gráficos, redes, mapas, matrizes de lacunas, filtros globais, página documental separada e rastreabilidade por registro.

**Architecture:** Lógica pura em módulos ES sem dependências (parsers, deduplicação, filtros, métricas, redes, matrizes, geografia) testada com `node --test`. Uma camada `store` isola o banco compartilhado do Artifact atrás de um adaptador, com adaptador em memória nos testes. Um `build.js` junta módulos, template e mapa-múndi em um único `dist/index.html`, publicado como Artifact privado com banco compartilhado.

**Tech Stack:** JavaScript (ES modules), Node 18+ (`node:test`), Chart.js 4.4.1, d3 7.8.5 e topojson-client 3.1.0 via cdnjs; `world-atlas@2.0.2` como devDependency (arquivo `countries-110m.json` embutido no build); Artifact do claude.ai com capacidade `db`.

**Spec:** `docs/superpowers/specs/2026-10-29-dashboard-geodiversidade-design.md` (fonte dos requisitos: `Dashboard.docx`)

## Global Constraints

- Coleções do banco: exatamente `estudos`, `codificacao`, `categorias`, `documentos`.
- `documentos` nunca entra em métrica, filtro ou rede bibliométrica; nenhuma função de `src/metrics.js`, `src/networks.js`, `src/gaps.js` ou `src/filters.js` recebe documentos.
- Estudos com `elegibilidade === 'excluido'` ficam fora de todas as métricas e gráficos, mas continuam em Registros.
- O arquivo importado não é guardado, só os registros convertidos.
- Duplicatas: por DOI normalizado e, sem DOI, por título normalizado; o registro guarda todas as bases em `bases`.
- Valores ausentes aparecem como "não informado"; itens não codificados como "pendente"; nada disso quebra gráficos.
- Sítios e pontos de observação só vão ao mapa com coordenadas informadas; os demais são contados e declarados, nunca posicionados por suposição.
- Arquivo em formato desconhecido gera mensagem clara e não altera a base.
- Dependências externas em scripts só de cdnjs.cloudflare.com, com versão exata.
- Interface em português do Brasil.

## Review Focus

- CSV da Scopus com vírgulas, aspas e quebras de linha dentro de campos, e arquivo com BOM: deve ler os registros sem deslocar colunas.
- DOI em formatos variados (`https://doi.org/10.1/X`, `10.1/x`) e importar o mesmo arquivo duas vezes: nada duplicado.
- Base vazia, sem anos, sem idioma ou sem países: todas as páginas renderizam sem erro, mostrando "não informado".
- Filtro por campo codificado quando poucos estudos estão codificados: o resultado vazio é explicado, não parece erro.
- Nomes de país em formatos variados ("USA", "United States", "Brasil"): cada um cai no país correto do mapa; os não reconhecidos vão para "países não mapeados".
- Milhares de registros (5.000): importação, filtros, métricas e redes continuam responsivos.

---

### Task 1: Esquema comum e normalização

**Files:**
- Create: `package.json` (`"type": "module"`, script `test`: `node --test`)
- Create: `src/schema.js`
- Test: `tests/schema.test.js`

**Interfaces:**
- Produces: `normalizeDoi(raw: string | null): string | null` (minúsculo, sem prefixo de URL); `normalizeTitle(raw: string): string` (minúsculo, sem acentos e pontuação, espaços colapsados); `makeEstudo(partial: object, base: string): Estudo` com `Estudo = {id: string, titulo: string, autores: string[], ano: number | null, periodico: string, doi: string | null, resumo: string, palavrasChave: string[], idioma: string | null, paises: string[], citacoes: number | null, bases: string[], incompleto: boolean}`. O `id` é o DOI normalizado ou, sem DOI, `t:` + título normalizado. `idioma` é o nome em português quando reconhecível (`'English'` → `'inglês'`, `'Portuguese'` → `'português'`, `'Spanish'` → `'espanhol'`), senão o texto original.

- [ ] **Step 1: Criar `package.json` e `.gitignore` já existe; instalar a devDependency** `npm install --save-dev world-atlas@2.0.2`
- [ ] **Step 2: Write failing tests** em `tests/schema.test.js`: `normalizeDoi('https://doi.org/10.1/ABC')` e `normalizeDoi('10.1/abc')` retornam `'10.1/abc'`; `normalizeDoi('')` é `null`; `normalizeTitle('Geodiversidade: Conceitos!')` é `'geodiversidade conceitos'`; `makeEstudo({titulo: 'X', ano: 'abc'}, 'scopus').ano` é `null`; `makeEstudo({titulo: 'X', idioma: 'English'}, 'wos').idioma` é `'inglês'`; `incompleto === true` quando faltam resumo ou palavras-chave.
- [ ] **Step 3: Run** `npm test` e confirmar FAIL.
- [ ] **Step 4: Implement** as três funções em `src/schema.js`; ano só é aceito se inteiro entre 1800 e 2100.
- [ ] **Step 5: Run** `npm test` e confirmar PASS.
- [ ] **Step 6: Commit** `feat: esquema comum de estudos`

### Task 2: Parsers de exportação

**Files:**
- Create: `src/parsers/csv.js`, `src/parsers/scopus.js`, `src/parsers/wos.js`, `src/parsers/generic.js` (BibTeX e RIS), `src/parsers/index.js`
- Test: `tests/parsers.test.js`
- Create: `tests/fixtures/scopus.csv`, `wos.txt`, `sample.bib`, `sample.ris` (3 registros cada; um sem DOI; um com vírgula e quebra de linha em campo entre aspas; o de Scopus com BOM; idioma e afiliações presentes em Scopus e WoS)

**Interfaces:**
- Consumes: `makeEstudo(partial, base)` da Task 1.
- Produces: `parseScopusCsv(text: string): Estudo[]`; `parseWosTabDelimited(text: string): Estudo[]`; `parseBibtex(text: string): Estudo[]`; `parseRis(text: string): Estudo[]`; `detectFormat(text: string, filename: string): 'scopus' | 'wos' | 'bibtex' | 'ris' | null`; `parseFile(text: string, filename: string): {format: string, estudos: Estudo[]}` que lança `Error('Formato não reconhecido')` quando `detectFormat` retorna `null`. Base gravada em `bases`: `'scopus'`, `'wos'`, `'bibtex'`, `'ris'`.

- [ ] **Step 1: Write failing tests**: cada parser devolve 3 estudos da sua fixture; o campo com vírgula e quebra de linha vem inteiro no título; o BOM não corrompe o nome da primeira coluna; palavras-chave separadas por `;` viram array; Scopus e WoS preenchem `idioma` e `paises` (último trecho de cada afiliação, sem repetir); `parseFile('lixo', 'a.txt')` lança erro.
- [ ] **Step 2: Run** `npm test` e confirmar FAIL.
- [ ] **Step 3: Implement** o leitor CSV e os quatro parsers. Scopus: `Title`, `Authors`, `Year`, `Source title`, `DOI`, `Abstract`, `Author Keywords`, `Cited by`, `Affiliations`, `Language of Original Document`. WoS: tags `TI`, `AU`, `PY`, `SO`, `DI`, `AB`, `DE`, `TC`, `C1`, `LA`.
- [ ] **Step 4: Run** `npm test` e confirmar PASS.
- [ ] **Step 5: Commit** `feat: parsers de Scopus, WoS, BibTeX e RIS`

### Task 3: Deduplicação e fusão

**Files:**
- Create: `src/dedupe.js`
- Test: `tests/dedupe.test.js`

**Interfaces:**
- Consumes: `Estudo` da Task 1.
- Produces: `mergeEstudos(existentes: Estudo[], novos: Estudo[]): {resultado: Estudo[], adicionados: number, duplicados: number}`. Em duplicata mantém o registro existente, une `bases` sem repetir e preenche campos vazios com os do novo registro.

- [ ] **Step 1: Write failing tests**: mesmo DOI em formatos diferentes funde; dois estudos sem DOI com título igual após normalização fundem; `bases` fica `['scopus','wos']`; importar a mesma lista duas vezes dá `adicionados === 0`; resumo vazio no existente é preenchido pelo novo.
- [ ] **Step 2: Run** `npm test` e confirmar FAIL.
- [ ] **Step 3: Implement** `mergeEstudos` indexando por `id` num `Map` (O(n)).
- [ ] **Step 4: Run** `npm test` e confirmar PASS.
- [ ] **Step 5: Commit** `feat: deduplicacao por DOI e titulo`

### Task 4: Dicionário de dados e codificação

**Files:**
- Create: `src/coding.js`
- Test: `tests/coding.test.js`

**Interfaces:**
- Consumes: `Estudo` da Task 1.
- Produces:
  - `Codificacao = {estudoId: string, elegibilidade: 'pendente' | 'incluido' | 'excluido', motivoExclusao: string, eixos: string[], paisesEstudados: string[], tiposSitio: string[], temporalidade: 'antigo' | 'herdado' | 'recente' | 'nao-se-aplica' | null, objeto: string[], metodosAvaliacao: string[], criteriosAvaliacao: string[], problematicas: string[], estrategias: string[], aplicacao: string[], viewpoints: {usa: boolean | null, criteriosSelecao: string[], metodosVisuais: string[], tecnicasVisibilidade: string[], caracteristicasPaisagem: string[], ameacasVisuais: string[], pontos: {nome: string, lat: number, lng: number}[]}, sitios: {nome: string, lat: number | null, lng: number | null}[], objetivos: string, resultados: string, limitacoes: string, recomendacoes: string, evidencias: {trecho: string, pagina: string}[], lacuna: string, observacao: string}`.
  - `novaCodificacao(estudoId: string): Codificacao` (tudo vazio, `elegibilidade: 'pendente'`, `viewpoints.usa: null`).
  - `CATEGORIAS_INICIAIS: Categorias` com `Categorias = {[campo: string]: {nome: string, descricao: string}[]}` para os campos `eixos` (as 4 temáticas), `tiposSitio` (geomorfológico, paleontológico, arqueológico, mineralógico, outro), `aplicacao` (avaliação, conservação, valorização, turismo, educação, planejamento) e listas curtas iniciais para `objeto`, `metodosAvaliacao`, `criteriosAvaliacao`, `problematicas`, `estrategias`, `criteriosSelecao`, `metodosVisuais`, `tecnicasVisibilidade`, `caracteristicasPaisagem`, `ameacasVisuais`, cada categoria com `descricao` não vazia.
  - `estudosAtivos(estudos: Estudo[], cods: Codificacao[]): Estudo[]` (remove os de `elegibilidade === 'excluido'`).
  - `proporcaoCodificada(estudos: Estudo[], cods: Codificacao[]): {codificados: number, total: number, pendentes: number}` (codificado = elegibilidade ≠ `pendente`; ignora codificações de estudos que não existem mais).

- [ ] **Step 1: Write failing tests**: `novaCodificacao('x')` tem `elegibilidade: 'pendente'` e `viewpoints.usa === null`; `CATEGORIAS_INICIAIS.aplicacao` contém avaliação, conservação e valorização; toda categoria inicial tem `descricao`; `estudosAtivos` remove só o excluído; 4 estudos e 1 codificação `incluido` dão `pendentes === 3`; codificação de estudo removido não conta.
- [ ] **Step 2: Run** `npm test` e confirmar FAIL.
- [ ] **Step 3: Implement** o módulo.
- [ ] **Step 4: Run** `npm test` e confirmar PASS.
- [ ] **Step 5: Commit** `feat: dicionario de dados e codificacao`

### Task 5: Filtros globais

**Files:**
- Create: `src/filters.js`
- Test: `tests/filters.test.js`

**Interfaces:**
- Consumes: `Estudo` (Task 1), `Codificacao` e `estudosAtivos` (Task 4).
- Produces: `Filtros = {periodo: [number, number] | null, eixos: string[], paises: string[], autores: string[], periodicos: string[], idiomas: string[], tiposSitio: string[], metodos: string[], problematicas: string[]}`; `filtrosVazios(): Filtros`; `aplicarFiltros(estudos: Estudo[], cods: Codificacao[], f: Filtros): {estudos: Estudo[], semCodificacaoIgnorados: number}`. Filtros de campos codificados (`eixos`, `tiposSitio`, `metodos`, `problematicas`) só mantêm estudos codificados que tenham pelo menos um dos valores; `semCodificacaoIgnorados` conta os estudos descartados só por não terem codificação. Estudos excluídos nunca passam. `paises` filtra por país de afiliação.

- [ ] **Step 1: Write failing tests**: filtros vazios devolvem os estudos não excluídos; `periodo: [2010, 2015]` mantém só esses anos e descarta `ano === null`; filtro `tiposSitio: ['paleontológico']` mantém só estudos codificados com o valor e `semCodificacaoIgnorados` conta os não codificados; combinação de `idiomas` e `paises` é interseção; excluído nunca passa.
- [ ] **Step 2: Run** `npm test` e confirmar FAIL.
- [ ] **Step 3: Implement** `filtrosVazios` e `aplicarFiltros`, indexando codificações por `estudoId` num `Map`.
- [ ] **Step 4: Run** `npm test` e confirmar PASS.
- [ ] **Step 5: Commit** `feat: filtros globais`

### Task 6: Métricas e redes bibliométricas

**Files:**
- Create: `src/metrics.js`, `src/networks.js`
- Test: `tests/metrics.test.js`, `tests/networks.test.js`

**Interfaces:**
- Consumes: `Estudo` da Task 1.
- Produces: `producaoPorAno(estudos): {ano: number | null, total: number}[]` (ordenado, `null` por último); `topContagem(estudos, campo: 'autores' | 'periodico' | 'paises' | 'palavrasChave' | 'idioma', n: number): {nome: string, total: number}[]` (vazios como `'não informado'`); `idiomaPorAno(estudos): {ano: number | null, idioma: string, total: number}[]`; `citacoesTotais(estudos): number`; `coocorrencia(estudos, minPeso: number): Rede` e `coautoria(estudos, minPeso: number): Rede` com `Rede = {nos: {id: string, total: number}[], arestas: {a: string, b: string, peso: number}[]}`. Redes limitam os nós aos 100 mais frequentes antes de montar pares.

- [ ] **Step 1: Write failing tests**: lista vazia devolve arrays vazios em todas as funções sem lançar; estudos sem ano entram em `{ano: null}`; `topContagem` respeita `n`, ordena decrescente e conta `'não informado'`; `coautoria` com `minPeso = 2` descarta pares que aparecem uma vez; 5.000 estudos gerados no teste rodam `coocorrencia` e `coautoria` em menos de 2 segundos cada.
- [ ] **Step 2: Run** `npm test` e confirmar FAIL.
- [ ] **Step 3: Implement** os dois módulos; palavras-chave comparadas em minúsculas.
- [ ] **Step 4: Run** `npm test` e confirmar PASS.
- [ ] **Step 5: Commit** `feat: metricas e redes bibliometricas`

### Task 7: Agregações qualitativas, viewpoints e lacunas

**Files:**
- Create: `src/qualitative.js`, `src/gaps.js`
- Test: `tests/qualitative.test.js`, `tests/gaps.test.js`

**Interfaces:**
- Consumes: `Codificacao` da Task 4, `Estudo` da Task 1.
- Produces: `contagemPorCampo(cods: Codificacao[], campo: string): {nome: string, total: number}[]` (para campos de lista de `Codificacao`; acessa também `viewpoints.<lista>` com o caminho `'viewpoints.criteriosSelecao'`); `contagemTemporalidade(cods): {nome: string, total: number}[]`; `resumoViewpoints(cods): {usam: number, naoUsam: number, semInformacao: number}`; `cruzar(cods: Codificacao[], campoA: string, campoB: string): {linhas: string[], colunas: string[], celulas: number[][], menosEstudadas: {a: string, b: string, total: number}[]}` (aceita campos de lista; `menosEstudadas` lista as combinações com a menor contagem, incluindo zeros, no máximo 20); `cruzarPaisTema(estudos: Estudo[], cods: Codificacao[], campo: string): mesma forma` usando `paisesEstudados`; `limitacoesRecorrentes(cods: Codificacao[], n: number): {texto: string, total: number}[]` (frases iguais, normalizadas, repetidas).

- [ ] **Step 1: Write failing tests**: `contagemPorCampo` sobre `'viewpoints.criteriosSelecao'` conta corretamente; `resumoViewpoints` separa `usa: true`, `false` e `null`; `cruzar` de duas codificações dá a matriz esperada e coloca a combinação com 0 em `menosEstudadas`; sem codificações `cruzar` devolve estrutura vazia sem lançar; `cruzarPaisTema` ignora estudos sem codificação; `limitacoesRecorrentes` agrupa textos iguais ignorando caixa.
- [ ] **Step 2: Run** `npm test` e confirmar FAIL.
- [ ] **Step 3: Implement** os módulos.
- [ ] **Step 4: Run** `npm test` e confirmar PASS.
- [ ] **Step 5: Commit** `feat: agregacoes qualitativas e lacunas`

### Task 8: Geografia

**Files:**
- Create: `src/geo.js`
- Test: `tests/geo.test.js`

**Interfaces:**
- Consumes: `Estudo` (Task 1), `Codificacao` (Task 4).
- Produces: `normalizarPais(nome: string): string | null` (devolve o nome usado em `world-atlas` `countries-110m.json`, por exemplo `'United States of America'`; aceita variações como `USA`, `United States`, `U.S.A.`, `Brasil`, `UK`, `Russia`; `null` quando desconhecido); `contagemPaises(nomes: string[]): {mapeados: {pais: string, total: number}[], naoMapeados: string[]}`; `pontosComCoordenadas(cods: Codificacao[], tipo: 'sitios' | 'viewpoints'): {pontos: {nome: string, lat: number, lng: number, estudoId: string}[], semCoordenadas: number}` (coordenadas válidas: lat −90..90, lng −180..180, números finitos).

- [ ] **Step 1: Write failing tests**: `normalizarPais('USA')`, `'United States'` e `'U.S.A.'` dão `'United States of America'`; `'Brasil'` e `'Brazil'` dão `'Brazil'`; `'Atlantis'` dá `null`; `contagemPaises(['USA', 'Brazil', 'Atlantis'])` separa mapeados e não mapeados; `pontosComCoordenadas` descarta lat 120 e conta como sem coordenadas, e conta sítios com `lat: null`.
- [ ] **Step 2: Run** `npm test` e confirmar FAIL.
- [ ] **Step 3: Implement** `src/geo.js` com tabela de apelidos mais nomes do atlas lidos de `node_modules/world-atlas/countries-110m.json` apenas no teste/build (o módulo recebe a lista de nomes do atlas por parâmetro com `setNomesAtlas(nomes: string[]): void`, chamada pelo build e pelo teste).
- [ ] **Step 4: Run** `npm test` e confirmar PASS.
- [ ] **Step 5: Commit** `feat: normalizacao de paises e pontos`

### Task 9: Camada de armazenamento

**Files:**
- Create: `src/store.js`
- Test: `tests/store.test.js`

**Interfaces:**
- Produces: `createStore(adapter: Adapter): Store` com `Adapter = {list(col: string): Promise<{id: string, data: object}[]>, set(col: string, id: string, data: object): Promise<void>, remove(col: string, id: string): Promise<void>}` e `Store = {listEstudos(): Promise<Estudo[]>, saveEstudos(e: Estudo[]): Promise<void>, getCodificacoes(): Promise<Codificacao[]>, saveCodificacao(c: Codificacao): Promise<void>, getCategorias(): Promise<Categorias>, saveCategorias(c: Categorias): Promise<void>, listDocumentos(): Promise<Documento[]>, saveDocumento(d: Documento): Promise<void>, removeDocumento(id: string): Promise<void>}`; `memoryAdapter(): Adapter`; `Documento = {id: string, titulo: string, tipoInstrumento: string, jurisdicao: string, orgaoEmissor: string, vigencia: string, ano: number | null, eixos: string[], aplicacoes: string[], dispositivo: string}`.
- Consumes: `CATEGORIAS_INICIAIS` (Task 4); `getCategorias` devolve as iniciais quando a coleção está vazia.

- [ ] **Step 1: Write failing tests** com `memoryAdapter`: salvar e listar estudos preserva os dados; `saveEstudos` do mesmo conjunto duas vezes não duplica; `listEstudos` nunca devolve itens de `documentos`; codificação salva volta idêntica; `getCategorias` numa base nova devolve `CATEGORIAS_INICIAIS`.
- [ ] **Step 2: Run** `npm test` e confirmar FAIL.
- [ ] **Step 3: Implement** o store; cada função lê e escreve só a sua coleção.
- [ ] **Step 4: Run** `npm test` e confirmar PASS.
- [ ] **Step 5: Commit** `feat: camada de armazenamento`

### Task 10: Estrutura da interface, importação, registros e codificação

**Files:**
- Create: `src/ui/app.js` (estado, navegação por páginas, filtros globais), `src/ui/importacao.js`, `src/ui/registros.js`, `src/ui/codificacao.js`, `src/ui/db-adapter.js`, `src/index.template.html`, `build.js`
- Test: `tests/build.test.js`

**Interfaces:**
- Consumes: `parseFile`, `mergeEstudos`, `createStore`, `aplicarFiltros`, `filtrosVazios`, `proporcaoCodificada`, `novaCodificacao`, `CATEGORIAS_INICIAIS`.
- Produces: `dist/index.html` (arquivo único) com navegação para as 10 páginas do spec; `src/ui/db-adapter.js` exporta `artifactDbAdapter(): Adapter`; cada página de análise é um módulo `render(container: HTMLElement, ctx: Ctx): void` com `Ctx = {estudos: Estudo[], cods: Codificacao[], categorias: Categorias, filtrados: Estudo[], filtros: Filtros, semCodificacaoIgnorados: number}`; `build.js` inlina módulos, template e o mapa-múndi (`world-atlas/countries-110m.json`) e chama `setNomesAtlas`.

- [ ] **Step 1: Carregar as skills `artifact-design` e `artifact-capabilities`** e usar a chamada exata do banco compartilhado em `artifactDbAdapter`; declarar a capacidade `db` na publicação.
- [ ] **Step 2: Write failing test** `tests/build.test.js`: depois de `node build.js`, `dist/index.html` existe, contém os dez títulos de página (Produção e colaboração, Geografia, Sítios, Problemáticas e métodos, Pontos de observação, Lacunas, Documental, Registros, Codificação, Importação), referencia Chart.js `4.4.1`, d3 `7.8.5` e topojson-client `3.1.0` em `cdnjs.cloudflare.com`, e não contém nenhuma URL de script fora de cdnjs.
- [ ] **Step 3: Run** `npm test` e confirmar FAIL.
- [ ] **Step 4: Implement** `app.js` (carrega dados do store, barra de filtros globais com aviso de `semCodificacaoIgnorados`, barra com `proporcaoCodificada`), Importação (envio de arquivos, resumo `adicionados/duplicados`, erro claro em formato desconhecido), Registros (tabela pesquisável; detalhe com metadados, link do DOI, bases de origem, classificação, `descricao` de cada categoria usada, evidências), Codificação (formulário por estudo cobrindo todos os campos de `Codificacao`, edição do dicionário de categorias) e `build.js`. Páginas de análise entram como stubs que exibem o título até a Task 11.
- [ ] **Step 5: Run** `npm test` e confirmar PASS.
- [ ] **Step 6: Commit** `feat: estrutura da interface, importacao, registros e codificacao`

### Task 11: Páginas de análise, mapas e documental

**Files:**
- Create: `src/ui/producao.js`, `src/ui/geografia.js`, `src/ui/sitios.js`, `src/ui/problematicas.js`, `src/ui/viewpoints.js`, `src/ui/lacunas.js`, `src/ui/documental.js`, `src/ui/charts.js` (helpers de gráfico, rede e mapa)
- Modify: `src/ui/app.js` (registrar as páginas)
- Test: `tests/build.test.js` (acrescentar asserções)

**Interfaces:**
- Consumes: `Ctx` da Task 10; métricas (Task 6); agregações e `cruzar` (Task 7); geografia (Task 8); `Documento` e `Store` (Task 9).
- Produces: `charts.js` exporta `barras(container, dados: {nome: string, total: number}[], opts?)`, `linhaTempo(container, dados)`, `rede(container, rede: Rede)`, `mapaPaises(container, contagem: {pais: string, total: number}[])`, `mapaPontos(container, pontos: {nome: string, lat: number, lng: number}[])`, `matriz(container, resultadoCruzar)`.

- [ ] **Step 1: Write failing test**: depois do build, `dist/index.html` contém `data-pagina` para cada página e o texto "sem coordenadas"; a página documental não importa `metrics`, `networks`, `filters` nem `gaps` (verificado lendo `src/ui/documental.js`).
- [ ] **Step 2: Run** `npm test` e confirmar FAIL.
- [ ] **Step 3: Implement** as páginas conforme o spec: Produção e colaboração (ano, autores, periódicos, idiomas total e por ano, redes de coautoria e de palavras-chave); Geografia (mapa de países de afiliação e de países estudados, mapa de sítios, lista "países não mapeados", contagem "N sem coordenadas", cruzamento país × tema); Sítios (tipos, temporalidade, características); Problemáticas e métodos (problemáticas, métodos, critérios, estratégias, rede de palavras-chave); Pontos de observação (`resumoViewpoints`, critérios, métodos visuais, técnicas, características, ameaças, relação com tipo de patrimônio e aplicação via `cruzar`, mapa de pontos); Lacunas (seleção de eixos para `cruzar`, matrizes predefinidas do spec, `menosEstudadas`, `limitacoesRecorrentes`); Documental (lista e formulário de `Documento`, filtro por eixo e aplicação, sem ligação com métricas).
- [ ] **Step 4: Run** `npm test` e confirmar PASS.
- [ ] **Step 5: Commit** `feat: paginas de analise, mapas e documental`

### Task 12: Verificação no navegador e publicação

**Files:**
- Modify: nenhum arquivo esperado; correções entram nos módulos da tarefa afetada.

- [ ] **Step 1: Run** `node build.js` e abrir `dist/index.html` no navegador interno com os arquivos de `tests/fixtures`.
- [ ] **Step 2: Verificar** na ordem: importar Scopus e WoS (a contagem de duplicados bate); importar o mesmo arquivo de novo (nada novo); codificar um estudo com sítio, coordenadas e viewpoint e ver proporção, gráficos e mapas mudarem; aplicar filtros e ver o aviso de estudos sem codificação; marcar um estudo como excluído e ver que sai das métricas mas segue em Registros; cadastrar um documento e conferir que nenhum número das páginas 1 a 6 muda.
- [ ] **Step 3: Verificar** estado vazio (banco novo) em todas as páginas, sem erros no console.
- [ ] **Step 4: Publicar** `dist/index.html` com a ferramenta Artifact (privado, capacidade `db`) **somente após confirmação do usuário** e entregar o link, avisando que o compartilhamento com a Stefany depende dele.
- [ ] **Step 5: Commit** `chore: versao verificada`
