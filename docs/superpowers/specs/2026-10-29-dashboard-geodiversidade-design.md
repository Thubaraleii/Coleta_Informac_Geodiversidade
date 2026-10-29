# Dashboard de produção científica em geodiversidade — Spec de design

Data: 2026-10-29 (revisada para incorporar `Dashboard.docx`)

## Objetivo

Ferramenta de apoio à investigação científica que sistematiza, visualiza e analisa a produção científica internacional sobre **geodiversidade, geoturismo, geoconservação e geopatrimônio**, articulando bibliometria, análise qualitativa dos estudos e, em dimensão separada, legislações e documentos institucionais. Deve permitir compreender a evolução do campo, identificar abordagens e reconhecer lacunas que fundamentem novas investigações.

## Decisões já tomadas

- A bibliografia entra por **exportação de arquivo** (sem consulta automática às APIs). As bases ainda não estão definidas (Scopus, Web of Science, outras): o importador aceita várias.
- A **Stefany** faz a análise qualitativa, **codificando cada estudo por formulário dentro do dashboard**, conforme um dicionário de dados editável.
- Acesso por **link online** (Artifact privado) com **banco compartilhado**.
- O `Dashboard.docx` na pasta do projeto é a fonte dos requisitos abaixo; onde a spec e o documento divergirem, vale o documento.

## Perguntas que o dashboard deve responder (do documento)

1. Autores mais produtivos e redes de colaboração.
2. Países que concentram a produção e países dos sítios efetivamente estudados.
3. Periódicos mais frequentes nos quatro eixos temáticos.
4. Idiomas predominantes e sua variação no tempo e entre contextos geográficos.
5. Tipos de sítios avaliados (geomorfológicos, paleontológicos, arqueológicos, mineralógicos, outros).
6. Natureza temporal dos elementos (registros geológicos antigos, formas de relevo herdadas, processos ou registros recentes).
7. Problemáticas, ameaças, fragilidades e vulnerabilidades, e os métodos e critérios para avaliá-las.
8. Uso de pontos de observação (viewpoints) e visadas da paisagem.
9. Métodos de avaliação dos sítios e critérios de seleção dos pontos de observação.
10. Lacunas temáticas, metodológicas, territoriais e de integração.
11. Como legislações e documentos institucionais tratam os temas e suas aplicações (conservação, turismo, educação, planejamento).

## Páginas (interface)

Seis dimensões analíticas, mais páginas de apoio:

1. **Produção e colaboração:** evolução temporal, autores, periódicos, idiomas (total e por ano), rede de coautoria, rede de coocorrência de palavras-chave.
2. **Geografia:** mapa de países de afiliação dos autores; mapa dos países estudados; mapa de sítios por coordenadas; cruzamento país × tema.
3. **Sítios e elementos patrimoniais:** tipos de sítio, características e temporalidade.
4. **Problemáticas, métodos e critérios:** ameaças, fragilidades, vulnerabilidades, métodos e critérios de avaliação, estratégias de conservação e gestão; rede de palavras-chave.
5. **Pontos de observação e visadas:** frequência de estudos com viewpoints, critérios de seleção, métodos de avaliação visual, técnicas de visibilidade, características da paisagem, ameaças à integridade visual e relações com tipo de patrimônio, ameaças e aplicações; mapa dos pontos quando houver coordenadas.
6. **Lacunas e síntese:** matrizes de evidências que cruzam categorias (tema × método, tipo de sítio × aplicação, problemática × método, país × tema), destacando combinações pouco representadas; indicadores de limitações recorrentes.
7. **Documental** (página independente): legislações e documentos institucionais.
8. **Registros:** consulta individual de cada estudo com metadados, classificação, critérios do dicionário, evidências textuais e fonte original (rastreabilidade).
9. **Codificação:** formulário da Stefany e edição do dicionário de categorias.
10. **Importação:** envio de arquivos, conversão e conferência de duplicatas.

**Filtros globais** (valem nas páginas 1 a 6): período, eixo temático, país, autor, periódico, idioma, tipo de sítio, método e problemática. Filtros sobre campos codificados só consideram estudos codificados; isso fica explícito na interface.

## Dados

Coleções do banco compartilhado:

- `estudos`: registro bibliográfico no esquema comum — título, autores, ano, periódico, DOI, resumo, palavras-chave, **idioma**, países de afiliação, citações, bases de origem, indicador de dados incompletos.
- `codificacao`: uma entrada por estudo, conforme o dicionário: `eixos` (geodiversidade, geoturismo, geoconservação, geopatrimônio), `elegibilidade` (`pendente`, `incluido` ou `excluido`, com motivo), `paisesEstudados`, `tiposSitio`, `temporalidade` (`antigo`, `herdado`, `recente` ou `nao-se-aplica`), `objeto`, `metodosAvaliacao`, `criteriosAvaliacao`, `problematicas` (ameaças, fragilidades, vulnerabilidades), `estrategias` (conservação ou gestão), `aplicacao` (avaliação, conservação, valorização, turismo, educação, planejamento), `viewpoints` (usa: sim/não; critérios de seleção, métodos visuais, técnicas de visibilidade, características da paisagem, ameaças visuais, pontos com nome e coordenadas), texto livre para objetivos, resultados, limitações e recomendações, `evidencias` (trechos citados), `lacuna` e `observacao`.
- `categorias`: listas editáveis que alimentam os campos acima; cada categoria tem `nome` e `descricao` (o critério de classificação, exibido em Registros).
- `documentos`: instrumentos legais e institucionais — título, tipo de instrumento, jurisdição, órgão emissor, vigência, ano, eixos relacionados, aplicações (conservação, turismo, educação, planejamento) e dispositivo relevante.

**Regra de separação:** `documentos` é coleção distinta de `estudos`. Documentos não têm DOI, autor nem citações e **nunca entram em métricas de produtividade científica**; a separação é de dados, não apenas visual.

**Estudos excluídos:** estudos com `elegibilidade = excluido` saem de todas as métricas e gráficos, mas continuam consultáveis em Registros.

## Importação

- Um conversor por formato (Scopus CSV, Web of Science, BibTeX e RIS) leva a exportação ao esquema comum, incluindo idioma e países de afiliação quando a base os fornece.
- Duplicatas por DOI normalizado e, sem DOI, por título normalizado; o registro guarda todas as bases de origem.
- Bases pobres entram marcadas como "dados incompletos".
- O arquivo original não é guardado, só os registros convertidos.
- Novas importações somam à base existente sem alterar codificações, permitindo atualizar a base e reproduzir as análises.

## Mapas

- Mapas coropléticos de países (afiliação dos autores e países estudados) usando um mapa-múndi embutido no arquivo; nomes de países são normalizados para o mapa (por exemplo "United States" e "USA").
- Mapa de sítios e de pontos de observação **somente para registros com coordenadas informadas**; os demais são contados e declarados ("N sítios sem coordenadas"), nunca posicionados por suposição.

## Tratamento de erros

- Registros sem ano, DOI, idioma ou país não quebram gráficos; aparecem como "não informado".
- Itens não codificados aparecem como "pendente"; a proporção codificada fica sempre visível.
- Arquivo em formato desconhecido gera mensagem clara e não altera a base.
- País não reconhecido pelo mapa entra numa lista "países não mapeados".

## Testes

- Funções puras (parsers, deduplicação, filtros, métricas, redes, matrizes, normalização de países) testadas com `node --test`, com arquivos de exemplo.
- Fluxo completo conferido no navegador: importar, codificar, filtrar, ver gráficos e mapas mudarem, e confirmar que `documentos` e estudos excluídos não afetam nenhuma métrica.

## Fora do escopo

- Busca automática nas bases (APIs) e definição das estratégias de busca.
- Análise de texto completo dos artigos.
- Login separado, exportação para PDF e análise espacial de visibilidade (viewshed) — o dashboard registra e mostra o que os estudos relatam.
