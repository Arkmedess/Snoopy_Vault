/**
 * Snoopy Vault - Submódulo: Estado e Scanner de Disciplinas
 * Responsável pelo carregamento de dados do ciclo (`ciclo-estudos.json`)
 * e mapeamento de disciplinas da pasta `03_Estudos`.
 *
 * @module subdashboards/estudos/estado
 */

const CICLO_META_PATH = "99_Meta/ciclo-estudos.json";

const DEFAULT_STATE = {
  disciplinaAtualIdx: 0,
  cicloOrdem: [],
  temaCicloAtivo: "Todos",
  estudosCiclo: [],
  simulados: [],
  simulacaoProva: null,
  metaHorasSemanal: 20,
  metaQuestoesSemanal: 150,
  nomeMetaProva: "Geral",
  dataMetaProva: "",
  historicoDiario: {},
  revisoes: [],
  planner: {}
};

const EstudosEstado = {
  CICLO_META_PATH,
  DEFAULT_STATE,

  /**
   * Carrega o estado persistente do ciclo de estudos a partir do JSON no Vault.
   *
   * @param {object} app - Instância do Obsidian.
   * @returns {Promise<object>}
   */
  async carregar(app) {
    let state = { ...DEFAULT_STATE };
    const file = app.vault.getAbstractFileByPath(CICLO_META_PATH);
    if (file) {
      try {
        const raw = await app.vault.read(file);
        const parsed = JSON.parse(raw);
        state = { ...DEFAULT_STATE, ...parsed };
        if (!state.historicoDiario) state.historicoDiario = {};
        if (!Array.isArray(state.revisoes)) state.revisoes = [];
        if (!Array.isArray(state.estudosCiclo)) state.estudosCiclo = [];
        if (!Array.isArray(state.simulados)) state.simulados = [];
        if (!state.planner) state.planner = {};
      } catch (e) {
        console.warn("[Snoopy Estudos] Erro ao analisar ciclo-estudos.json:", e);
      }
    }
    return state;
  },

  /**
   * Grava o estado atualizado no arquivo JSON do Vault.
   *
   * @param {object} app - Instância do Obsidian.
   * @param {object} state - Objeto de estado a persistir.
   * @returns {Promise<void>}
   */
  async salvar(app, state) {
    const file = app.vault.getAbstractFileByPath(CICLO_META_PATH);
    const jsonStr = JSON.stringify(state, null, 2);
    if (file) {
      await app.vault.modify(file, jsonStr);
    } else {
      await app.vault.create(CICLO_META_PATH, jsonStr);
    }
  },

  /**
   * Converte de forma resiliente qualquer coleção ou DataArray do DataviewJS em Array nativo.
   *
   * @param {any} col - Coleção ou DataArray.
   * @returns {Array<any>}
   */
  paraArrayNativo(col) {
    if (!col) return [];
    const out = [];
    if (typeof col.forEach === 'function') {
      col.forEach(item => out.push(item));
      return out;
    }
    if (typeof col.length === 'number') {
      for (let i = 0; i < col.length; i++) out.push(col[i]);
      return out;
    }
    if (typeof col.map === 'function') {
      col.map(item => {
        out.push(item);
        return item;
      });
      return out;
    }
    return out;
  },

  /**
   * Coleta e calcula estatísticas de todas as disciplinas da pasta `03_Estudos`.
   *
   * @param {object} dv - Instância da Dataview API.
   * @returns {Array<object>}
   */
  obterDisciplinasProcessadas(dv) {
    if (!dv || typeof dv.pages !== 'function') return [];
    const rawPages = dv.pages('"03_Estudos"')
      .where(p => p.file && !p.file.name.includes("Template") && !p.file.name.includes("Painel"));

    const mapped = rawPages.map(p => {
      const minFoco = Number(p.minutos_foco) || (Number(p.tempo_foco) ? Number(p.tempo_foco) * 60 : 0);
      const feitas = Number(p.questoes_feitas) || 0;
      const acertos = Number(p.questoes_acertos) || 0;
      const erros = Math.max(0, feitas - acertos);
      const area = String(p.area || p.categoria || p.disciplina || "Geral");
      const sub = String(p.modulo || p.subtopico || "");

      let rawProvas = [];
      if (p.provas && typeof p.provas === 'object') rawProvas = EstudosEstado.paraArrayNativo(p.provas);
      else if (p.provas && typeof p.provas === 'string') rawProvas = [p.provas];
      else if (p.pdf) rawProvas = [p.pdf];

      const provas = [];
      rawProvas.forEach(item => {
        if (!item) return;
        if (typeof item === 'string') provas.push(item);
        else if (typeof item === 'object' && item.path) provas.push(String(item.path));
        else provas.push(String(item));
      });

      return {
        file: p.file,
        nome: String(p.title || p.file.name),
        path: p.file.path,
        area: area,
        categoria: area,
        subtopico: sub,
        minutos: minFoco,
        feitas: feitas,
        acertos: acertos,
        erros: erros,
        pct: feitas > 0 ? Math.round((acertos / feitas) * 100) : 0,
        status: p.status || "Ativo",
        provas: provas
      };
    });

    return EstudosEstado.paraArrayNativo(mapped);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = EstudosEstado;
}

return EstudosEstado;

