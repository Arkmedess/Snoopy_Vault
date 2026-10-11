/**
 * Snoopy Vault - Microsserviço de Gestão e Sanitização de Dados de Exemplo (Mocks)
 * Permite que o usuário zere o cofre para começar 100% limpo com suas próprias notas,
 * ou restaure notas de demonstração para testes.
 *
 * @module core/mock_manager
 */
const MockManager = {
  /**
   * Prefixo oficial usado para identificar notas e arquivos de demonstração.
   */
  PREFIXO_MOCK: 'Exemplo - ',

  /**
   * Detecta notas de exemplo existentes no cofre.
   *
   * @param {object} app - Instância do Obsidian.
   * @returns {Promise<Array<{ path: string, nome: string, tipo: string }>>}
   */
  async detectarMocks(app) {
    if (!app || !app.vault) return [];
    const files = typeof app.vault.getMarkdownFiles === 'function' ? app.vault.getMarkdownFiles() : [];
    const mocks = [];

    for (const f of files) {
      if (f.basename && f.basename.startsWith(this.PREFIXO_MOCK)) {
        let tipo = 'geral';
        if (f.path.startsWith('02_Projetos')) tipo = 'projeto';
        else if (f.path.startsWith('03_Estudos')) tipo = 'estudo';
        else if (f.path.startsWith('04_Leituras')) tipo = 'leitura';

        mocks.push({
          path: f.path,
          nome: f.basename,
          tipo
        });
      }
    }

    return mocks;
  },

  /**
   * Remove todas as notas de exemplo e redefine o ciclo-estudos.json para o estado limpo.
   *
   * @param {object} app - Instância do Obsidian.
   * @returns {Promise<{ sucesso: boolean, removidos: string[] }>}
   */
  async removerMocks(app) {
    if (!app || !app.vault) {
      throw new Error('Instância do Obsidian Vault necessária.');
    }

    const mocks = await this.detectarMocks(app);
    const removidos = [];

    for (const item of mocks) {
      const file = app.vault.getAbstractFileByPath ? app.vault.getAbstractFileByPath(item.path) : item;
      if (file) {
        if (typeof app.vault.trash === 'function') {
          await app.vault.trash(file, true);
        }
        removidos.push(item.path);
      }
    }

    // Reseta ciclo-estudos.json para estado zerado
    const cicloPath = '99_Meta/ciclo-estudos.json';
    const cicloFile = app.vault.getAbstractFileByPath ? app.vault.getAbstractFileByPath(cicloPath) : null;
    const estadoZerado = {
      disciplinaAtualIdx: 0,
      cicloOrdem: [],
      metaHorasSemanal: 20,
      metaQuestoesSemanal: 150,
      nomeMetaProva: "Meta Pessoal",
      dataMetaProva: "",
      historicoDiario: {},
      revisoes: [],
      planner: {}
    };

    const jsonStr = JSON.stringify(estadoZerado, null, 2);
    if (cicloFile) {
      await app.vault.modify(cicloFile, jsonStr);
    } else if (app.vault.create) {
      await app.vault.create(cicloPath, jsonStr).catch(() => {});
    }

    return {
      sucesso: true,
      removidos
    };
  },

  /**
   * Restaura notas de exemplo e dados de demonstração a partir dos templates.
   *
   * @param {object} app - Instância do Obsidian.
   * @returns {Promise<{ sucesso: boolean, restaurados: string[] }>}
   */
  async restaurarMocks(app) {
    if (!app || !app.vault) {
      throw new Error('Instância do Obsidian Vault necessária.');
    }

    const restaurados = [];

    // 1. Exemplo de Projeto
    const projPath = '02_Projetos/Exemplo - Estruturar Meu Vault.md';
    if (!app.vault.getAbstractFileByPath(projPath)) {
      const projContent = `---\ntitle: "Estruturar Meu Vault"\nstatus: "Em Andamento"\npriority: "Alta"\nstart_date: "2026-10-03"\ntags:\n  - projeto\n---\n\n# 🎯 Estruturar Meu Vault\n\n- [ ] Explorar templates e atalhos 📅 2026-10-15 🔼\n`;
      await app.vault.create(projPath, projContent);
      restaurados.push(projPath);
    }

    // 2. Exemplo de Estudo
    const estudoPath = '03_Estudos/Exemplo - Arquitetura de Software.md';
    if (!app.vault.getAbstractFileByPath(estudoPath)) {
      const estudoContent = `---\ntitle: "Arquitetura de Software"\narea: "Programação"\nstatus: "Ativo"\nminutos_foco: 50\nquestoes_feitas: 10\nquestoes_acertos: 8\ntags:\n  - estudo\n---\n\n# Arquitetura de Software\n\nConceitos fundamentais de desacoplamento e microsserviços.\n`;
      await app.vault.create(estudoPath, estudoContent);
      restaurados.push(estudoPath);
    }

    // 3. Exemplo de Livro
    const livroPath = '04_Leituras/Livros/Exemplo - Hábitos Atômicos - James Clear.md';
    if (!app.vault.getAbstractFileByPath(livroPath)) {
      const livroContent = `---\ntitle: "Hábitos Atômicos"\nauthor: "James Clear"\ntotal_pages: 320\ncurrent_page: 90\nstatus: "Lendo"\nrating: 5\ntags:\n  - leitura\n  - livro\n---\n\n# Hábitos Atômicos\n\nComo pequenas mudanças geram resultados extraordinários.\n`;
      await app.vault.create(livroPath, livroContent);
      restaurados.push(livroPath);
    }

    // 4. Popula ciclo-estudos.json com o estudo restaurado
    const cicloPath = '99_Meta/ciclo-estudos.json';
    const cicloFile = app.vault.getAbstractFileByPath(cicloPath);
    const estadoDemo = {
      disciplinaAtualIdx: 0,
      cicloOrdem: [estudoPath],
      metaHorasSemanal: 20,
      metaQuestoesSemanal: 150,
      nomeMetaProva: "Concurso / Exame",
      dataMetaProva: "",
      historicoDiario: {
        "2026-10-04": { "minutosFoco": 25, "questoesFeitas": 10, "questoesAcertos": 8 }
      },
      revisoes: [
        {
          materiaPath: estudoPath,
          nome: "Exemplo - Arquitetura de Software",
          ultimaRevisao: "2026-10-04",
          proximaRevisao: "2026-10-15",
          intervaloDias: 7,
          tipo: "Teoria + Questões",
          status: "programada"
        }
      ],
      planner: {}
    };

    const jsonStr = JSON.stringify(estadoDemo, null, 2);
    if (cicloFile) {
      await app.vault.modify(cicloFile, jsonStr);
    } else {
      await app.vault.create(cicloPath, jsonStr).catch(() => {});
    }

    return {
      sucesso: true,
      restaurados
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = MockManager;
}

return MockManager;

