# Dashboard de produção científica em geodiversidade — Spec de design

Data: 2026-10-29

## Objetivo

Ferramenta de apoio à investigação científica que sistematiza, visualiza e analisa a produção científica internacional sobre **geodiversidade, geoturismo, geoconservação e geopatrimônio**. Deve permitir:

- compreender a evolução do campo;
- identificar abordagens, objetos de estudo, métodos, problemáticas e aplicações (avaliação, conservação, valorização do patrimônio natural);
- reconhecer lacunas de conhecimento que fundamentem novas investigações;
- analisar, em dimensão separada, legislações e documentos institucionais pertinentes.

## Decisões já tomadas

- A base bibliográfica entra por **exportação de arquivo** de bases científicas. Não há consulta automática às APIs.
- As bases ainda não estão definidas (Scopus, Web of Science, Google Scholar/outras). O importador deve aceitar várias.
- A **Stefany** faz a análise qualitativa, **codificando cada estudo por formulário dentro do dashboard**.
- Acesso por **link online** (Artifact privado) com **banco compartilhado**, para a Stefany e o autor usarem a mesma base.

## Premissas (confirmar na revisão)

- Os "produtos" mencionados no início são os produtos da pesquisa: gráficos, quadros e mapas de lacunas. Não são produtos comerciais.
- As categorias de codificação partem de uma **lista editável** e se ajustam durante a leitura dos estudos.
- Os pesos e os critérios de agrupamento ficam visíveis para o usuário, sem regras escondidas.

## Estrutura (abas)

1. **Panorama bibliométrico:** produção por ano, países, autores, periódicos, palavras-chave, citações e rede de coocorrência.
2. **Análise qualitativa:** quadros e gráficos por objeto de estudo, método, problemática e aplicação.
3. **Lacunas:** cruzamento de categorias (por exemplo método × objeto), destacando combinações pouco estudadas.
4. **Documental:** legislações e documentos institucionais.
5. **Codificação:** formulário para a Stefany classificar cada estudo.
6. **Importação:** envio dos arquivos, conversão e conferência de duplicatas.

## Dados

Coleções do banco compartilhado:

- `estudos`: registros bibliográficos já convertidos para um esquema comum (título, autores, ano, periódico, DOI, resumo, palavras-chave, país, citações, base de origem, indicador de dados incompletos).
- `codificacao`: uma entrada por estudo, com objeto de estudo, método, problemática, aplicação, lacuna e observação livre.
- `categorias`: listas editáveis usadas pela codificação.
- `documentos`: legislações e documentos institucionais, com campos próprios (ente ou país, esfera, ano, tipo, tema, dispositivo relevante).

**Regra de separação:** `documentos` é uma coleção distinta de `estudos`. Documentos não têm DOI, autor nem citações e **nunca entram em métricas de produtividade científica**. A separação é de dados, não apenas visual.

## Importação

- Um conversor por formato (Scopus CSV, Web of Science, BibTeX/RIS genérico) leva cada exportação ao esquema comum.
- Duplicatas são removidas por DOI e, na falta dele, por título normalizado. O registro guarda de qual(is) base(s) veio.
- Bases de dados mais pobres (como o Google Scholar) entram marcadas como "dados incompletos".
- O arquivo original não é guardado, só os registros convertidos.

## Codificação qualitativa

- A Stefany seleciona um estudo, marca as categorias e escreve uma observação.
- O painel mostra a proporção de estudos já codificados, para que os gráficos qualitativos não pareçam conclusivos antes da hora.

## Tratamento de erros

- Registros sem ano, DOI ou campos vazios não quebram gráficos; aparecem como "não informado".
- Arquivo em formato desconhecido gera mensagem clara e não altera a base.
- Campos pendentes de codificação aparecem como "pendente".

## Testes

- Importador testado com arquivos de exemplo de cada formato, incluindo campos vazios e duplicatas.
- Fluxo completo conferido no navegador: importar, codificar, ver os gráficos mudarem, e confirmar que `documentos` não afeta nenhuma métrica bibliométrica.

## Fora do escopo

- Busca automática nas bases (APIs).
- Mapas geográficos detalhados.
- Análise de texto completo dos artigos.
- Login separado e exportação para PDF.
