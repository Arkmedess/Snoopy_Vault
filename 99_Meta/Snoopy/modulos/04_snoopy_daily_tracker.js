/**
 * Snoopy Vault - Módulo 04: Hábitos Diários & Central de Tarefas Prioritárias
 * Orquestrador leve que compõe os submódulos de Hábitos e Tarefas com alta coesão,
 * densidade espacial limpa e ciclo de vida seguro no DOM.
 *
 * @module modulos/04_snoopy_daily_tracker
 * @listens pomodoro:complete - Sincroniza progresso de tarefas focadas.
 * @fires pomodoro:focar - Direciona o temporizador para uma tarefa específica.
 */
return {
  id: 'snoopy_daily_tracker',
  titulo: 'Hábitos & Central de Tarefas',

  /**
   * Ponto de entrada do ciclo de vida de renderização do Módulo 04.
   *
   * @param {object} ctx - Contexto compartilhado com os microsserviços do Vault.
   * @param {HTMLElement} ctx.root - Contêiner raiz da dashboard.
   * @param {object} ctx.app - Instância do Obsidian.
   * @param {object} ctx.dv - API Dataview.
   * @param {string} ctx.todayStr - Data corrente em formato ISO (YYYY-MM-DD).
   * @param {string} ctx.dailyPath - Caminho relativo da nota diária de hoje.
   * @param {function(): Promise<TFile>} ctx.garantirNotaDiaria - Obtém ou cria o diário de hoje.
   * @returns {Promise<void>}
   */
  async render(ctx) {
    const { root, app } = ctx;

    // Helper interno para carregar submódulos do daily_tracker dinamicamente
    async function carregarSubmodulo(caminhoRelativo) {
      try {
        const file = app.vault.getAbstractFileByPath(caminhoRelativo);
        if (file) {
          const code = await app.vault.read(file);
          return (new Function(code))();
        }
      } catch (e) {
        console.error(`[Snoopy] Erro ao carregar submódulo ${caminhoRelativo}:`, e);
      }
      return null;
    }

    const HabitosView = await carregarSubmodulo("99_Meta/Snoopy/modulos/daily_tracker/habitos_view.js");
    const TarefasModal = await carregarSubmodulo("99_Meta/Snoopy/modulos/daily_tracker/tarefas_modal.js");
    const TarefasView = await carregarSubmodulo("99_Meta/Snoopy/modulos/daily_tracker/tarefas_view.js");

    const hubGrid = root.createEl('div', { 
      cls: 'snoopy-daily-hub-grid',
      attr: { style: 'display: grid; grid-template-columns: minmax(260px, 30%) 1fr; gap: 16px; margin-bottom: 20px; align-items: stretch;' } 
    });

    // =========================================================================
    // BLOCO 1: HÁBITOS DIÁRIOS (30%)
    // =========================================================================
    const habitsCard = hubGrid.createEl('div', { 
      cls: 'snoopy-card-box', 
      attr: { style: 'display: flex; flex-direction: column; justify-content: space-between; gap: 10px;' } 
    });

    if (HabitosView && typeof HabitosView.montar === 'function') {
      await HabitosView.montar({ habitsCard, ctx });
    }

    // =========================================================================
    // BLOCO 2: CENTRAL DE TAREFAS PRIORITÁRIAS COM CACHE EM MEMÓRIA (70%)
    // =========================================================================
    const tasksCard = hubGrid.createEl('div', { 
      cls: 'snoopy-card-box', 
      attr: { style: 'display: flex; flex-direction: column; gap: 10px;' } 
    });

    if (TarefasView && typeof TarefasView.montar === 'function') {
      let controllerTarefas = null;

      const abrirModalNovaTarefa = () => {
        if (TarefasModal && typeof TarefasModal.abrirModalNovaTarefa === 'function') {
          TarefasModal.abrirModalNovaTarefa({
            app: ctx.app,
            dv: ctx.dv,
            todayStr: ctx.todayStr,
            DateUtils: ctx.DateUtils,
            VaultStore: ctx.VaultStore,
            ModalFactory: ctx.ModalFactory,
            garantirNotaDiaria: ctx.garantirNotaDiaria,
            onAtualizar: async () => {
              if (controllerTarefas) await controllerTarefas.recarregarEAtualizarTarefas();
            }
          });
        }
      };

      const abrirModalTemplateTarefa = () => {
        if (TarefasModal && typeof TarefasModal.abrirModalTemplateTarefa === 'function') {
          TarefasModal.abrirModalTemplateTarefa({
            app: ctx.app,
            ctx,
            todayStr: ctx.todayStr,
            garantirNotaDiaria: ctx.garantirNotaDiaria,
            onAtualizar: async () => {
              if (controllerTarefas) await controllerTarefas.recarregarEAtualizarTarefas();
            }
          });
        }
      };

      const abrirModalMenuTarefa = (item, t, filePath) => {
        if (TarefasModal && typeof TarefasModal.abrirModalMenuTarefa === 'function') {
          TarefasModal.abrirModalMenuTarefa({
            item,
            t,
            filePath,
            app: ctx.app,
            todayStr: ctx.todayStr,
            DateUtils: ctx.DateUtils,
            VaultStore: ctx.VaultStore,
            ModalFactory: ctx.ModalFactory,
            onAtualizar: async () => {
              if (controllerTarefas) await controllerTarefas.recarregarEAtualizarTarefas();
            }
          });
        }
      };

      controllerTarefas = await TarefasView.montar({
        tasksCard,
        ctx,
        abrirModalNovaTarefa,
        abrirModalTemplateTarefa,
        abrirModalMenuTarefa
      });
    }
  }
};
