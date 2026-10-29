export const ROTULOS = {
  eixos: 'Eixos temáticos',
  tiposSitio: 'Tipos de sítio',
  objeto: 'Objeto de estudo',
  metodosAvaliacao: 'Métodos de avaliação',
  criteriosAvaliacao: 'Critérios de avaliação',
  problematicas: 'Problemáticas, ameaças e vulnerabilidades',
  estrategias: 'Estratégias de conservação e gestão',
  aplicacao: 'Aplicações',
  criteriosSelecao: 'Critérios de seleção dos pontos',
  metodosVisuais: 'Métodos de avaliação visual',
  tecnicasVisibilidade: 'Técnicas de visibilidade',
  caracteristicasPaisagem: 'Características da paisagem',
  ameacasVisuais: 'Ameaças à integridade visual',
};

export const CAMPOS_COD = ['eixos', 'tiposSitio', 'objeto', 'metodosAvaliacao', 'criteriosAvaliacao', 'problematicas', 'estrategias', 'aplicacao'];
export const CAMPOS_VIEWPOINT = ['criteriosSelecao', 'metodosVisuais', 'tecnicasVisibilidade', 'caracteristicasPaisagem', 'ameacasVisuais'];

/** Campos que podem entrar em cruzamentos: caminho em Codificacao -> rótulo. */
export const CAMPOS_CRUZAMENTO = {
  ...Object.fromEntries(CAMPOS_COD.map((c) => [c, ROTULOS[c]])),
  ...Object.fromEntries(CAMPOS_VIEWPOINT.map((c) => [`viewpoints.${c}`, `Pontos de observação: ${ROTULOS[c].toLowerCase()}`])),
};
