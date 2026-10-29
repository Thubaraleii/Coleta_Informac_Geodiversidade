export function novaCodificacao(estudoId) {
  return {
    estudoId,
    elegibilidade: 'pendente',
    motivoExclusao: '',
    eixos: [],
    paisesEstudados: [],
    tiposSitio: [],
    temporalidade: null,
    objeto: [],
    metodosAvaliacao: [],
    criteriosAvaliacao: [],
    problematicas: [],
    estrategias: [],
    aplicacao: [],
    viewpoints: {
      usa: null,
      criteriosSelecao: [],
      metodosVisuais: [],
      tecnicasVisibilidade: [],
      caracteristicasPaisagem: [],
      ameacasVisuais: [],
      pontos: [],
    },
    sitios: [],
    objetivos: '',
    resultados: '',
    limitacoes: '',
    recomendacoes: '',
    evidencias: [],
    lacuna: '',
    observacao: '',
  };
}

const cat = (nome, descricao) => ({ nome, descricao });

export const CATEGORIAS_INICIAIS = {
  eixos: [
    cat('geodiversidade', 'Variedade de elementos abióticos (rochas, minerais, fósseis, relevo, solos, processos) tratada como objeto central do estudo.'),
    cat('geoturismo', 'Turismo baseado no patrimônio geológico e geomorfológico, com ênfase em interpretação e experiência do visitante.'),
    cat('geoconservação', 'Ações de proteção, manejo e gestão de elementos da geodiversidade.'),
    cat('geopatrimônio', 'Conjunto de sítios e elementos de valor científico, educativo, cultural ou estético reconhecidos como patrimônio.'),
  ],
  tiposSitio: [
    cat('geomorfológico', 'Formas de relevo e processos superficiais como valor principal do sítio.'),
    cat('paleontológico', 'Sítio cujo valor principal é o registro fóssil.'),
    cat('arqueológico', 'Sítio com registro arqueológico associado ao patrimônio natural.'),
    cat('mineralógico', 'Sítio cujo valor principal são minerais, rochas ou depósitos minerais.'),
    cat('outro', 'Outros tipos de patrimônio; descrever na observação.'),
  ],
  aplicacao: [
    cat('avaliação', 'O estudo avalia ou quantifica valor, risco ou vulnerabilidade de sítios.'),
    cat('conservação', 'O estudo propõe ou analisa medidas de conservação.'),
    cat('valorização', 'O estudo trata de valorização, divulgação ou interpretação do patrimônio.'),
    cat('turismo', 'Aplicação ao planejamento ou à oferta turística.'),
    cat('educação', 'Aplicação a educação e popularização da ciência.'),
    cat('planejamento', 'Aplicação a planejamento e ordenamento territorial.'),
  ],
  objeto: [
    cat('sítio individual', 'Um geossítio ou ponto específico.'),
    cat('conjunto de sítios', 'Inventário ou rede de vários sítios.'),
    cat('geoparque ou unidade territorial', 'Geoparque, área protegida ou unidade territorial.'),
    cat('conceito ou revisão', 'Estudo teórico, conceitual ou de revisão, sem sítio específico.'),
  ],
  metodosAvaliacao: [
    cat('inventário e quantificação', 'Inventário seguido de pontuação de valores por critérios.'),
    cat('análise multicritério', 'Métodos multicritério ou de decisão para priorizar sítios.'),
    cat('trabalho de campo', 'Levantamento direto em campo.'),
    cat('geoprocessamento', 'Uso de SIG e sensoriamento remoto.'),
    cat('entrevistas e questionários', 'Percepção de visitantes, gestores ou comunidades.'),
  ],
  criteriosAvaliacao: [
    cat('valor científico', 'Raridade, representatividade, integridade e relevância científica.'),
    cat('valor educativo', 'Potencial didático e acessibilidade interpretativa.'),
    cat('valor turístico', 'Atratividade, infraestrutura e acesso.'),
    cat('valor estético', 'Qualidade cênica e visual.'),
    cat('vulnerabilidade', 'Fragilidade e risco de degradação.'),
  ],
  problematicas: [
    cat('ameaça antrópica', 'Impacto de atividades humanas (mineração, urbanização, visitação).'),
    cat('degradação natural', 'Erosão, intemperismo e outros processos naturais.'),
    cat('fragilidade do sítio', 'Baixa resistência intrínseca do elemento.'),
    cat('falta de proteção legal', 'Ausência ou insuficiência de instrumentos de proteção.'),
    cat('gestão deficiente', 'Limitações de gestão, fiscalização ou recursos.'),
  ],
  estrategias: [
    cat('proteção legal', 'Criação ou aplicação de instrumentos legais.'),
    cat('ordenamento da visitação', 'Controle de fluxo e infraestrutura de uso público.'),
    cat('interpretação e sinalização', 'Painéis, trilhas e materiais interpretativos.'),
    cat('monitoramento', 'Acompanhamento periódico do estado do sítio.'),
  ],
  criteriosSelecao: [
    cat('visibilidade e amplitude da vista', 'Extensão da paisagem observada a partir do ponto.'),
    cat('acessibilidade', 'Facilidade de acesso ao ponto de observação.'),
    cat('segurança', 'Condições seguras para o observador.'),
    cat('valor cênico', 'Qualidade estética da paisagem observada.'),
    cat('representatividade geológica', 'Capacidade de ilustrar elementos da geodiversidade.'),
  ],
  metodosVisuais: [
    cat('avaliação cênica', 'Pontuação da qualidade visual da paisagem.'),
    cat('fotografia', 'Registro fotográfico sistemático ou panorâmico.'),
    cat('percepção do visitante', 'Questionários ou entrevistas sobre a vista.'),
  ],
  tecnicasVisibilidade: [
    cat('análise de visibilidade (viewshed)', 'Cálculo de bacia visual em SIG.'),
    cat('modelo digital de terreno', 'Uso de MDT para simular a vista.'),
    cat('observação em campo', 'Verificação da visada diretamente no local.'),
  ],
  caracteristicasPaisagem: [
    cat('paisagem costeira', 'Costa, falésias e praias.'),
    cat('paisagem de montanha', 'Serras, picos e vales.'),
    cat('paisagem cárstica', 'Relevo cárstico e cavernas.'),
    cat('paisagem vulcânica', 'Formas e depósitos vulcânicos.'),
    cat('paisagem urbana ou antropizada', 'Paisagens com forte presença humana.'),
  ],
  ameacasVisuais: [
    cat('obstrução da vista', 'Vegetação, construções ou instalações que bloqueiam a visada.'),
    cat('poluição visual', 'Elementos que degradam a qualidade cênica.'),
    cat('expansão urbana ou industrial', 'Ocupação que altera a paisagem observada.'),
  ],
};

/** Devolve uma nova lista com `valor` marcado ou desmarcado, sem duplicar nem mutar a original. */
export function alternarValor(lista, valor, marcado) {
  if (!marcado) return lista.filter((v) => v !== valor);
  return lista.includes(valor) ? [...lista] : [...lista, valor];
}

export function estudosAtivos(estudos, cods) {
  const excluidos = new Set(cods.filter((c) => c.elegibilidade === 'excluido').map((c) => c.estudoId));
  return estudos.filter((e) => !excluidos.has(e.id));
}

export function proporcaoCodificada(estudos, cods) {
  const ids = new Set(estudos.map((e) => e.id));
  const codificados = cods.filter((c) => ids.has(c.estudoId) && c.elegibilidade !== 'pendente').length;
  return { codificados, total: estudos.length, pendentes: estudos.length - codificados };
}
