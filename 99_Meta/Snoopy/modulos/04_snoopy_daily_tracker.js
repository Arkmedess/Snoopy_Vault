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
    const CalendarioView = await carregarSubmodulo("99_Meta/Snoopy/modulos/daily_tracker/calendario_view.js");
    const TarefasModal = await carregarSubmodulo("99_Meta/Snoopy/modulos/daily_tracker/tarefas_modal.js");
    const TarefasView = await carregarSubmodulo("99_Meta/Snoopy/modulos/daily_tracker/tarefas_view.js");

    const hubGrid = root.createEl('div', { 
      cls: 'snoopy-daily-hub-grid',
      attr: { style: 'display: grid; grid-template-columns: minmax(260px, 30%) 1fr; gap: 16px; margin-bottom: 20px; align-items: stretch;' } 
    });

    // =========================================================================
    // BLOCO 1: COLUNA LATERAL - HÁBITOS & CALENDÁRIO INTERATIVO (30%)
    // =========================================================================
    const sideCard = hubGrid.createEl('div', { 
      cls: 'snoopy-card-box', 
      attr: { style: 'display: flex; flex-direction: column; justify-content: flex-start; gap: 8px; min-height: 380px; max-height: 380px; overflow: hidden;' } 
    });

    const switchToolbar = sideCard.createEl('div', {
      cls: 'snoopy-toolbar',
      attr: { style: 'display: flex; gap: 4px; border-bottom: 1px solid var(--snoopy-border); padding-bottom: 6px; margin-bottom: 4px;' }
    });

    const btnTabHabitos = switchToolbar.createEl('button', {
      cls: 'snoopy-btn-tab snoopy-btn-sm active',
      text: 'HÁBITOS'
    });

    const btnTabCalendario = switchToolbar.createEl('button', {
      cls: 'snoopy-btn-tab snoopy-btn-sm',
      text: 'CALENDÁRIO'
    });

    const habitsContainer = sideCard.createEl('div', {
      cls: 'snoopy-habits-panel-wrap',
      attr: { style: 'display: flex; flex-direction: column; justify-content: space-between; gap: 8px; flex: 1; overflow-y: auto;' }
    });

    const calContainer = sideCard.createEl('div', {
      cls: 'snoopy-cal-panel-wrap',
      attr: { style: 'display: none; flex-direction: column; justify-content: flex-start; gap: 8px; flex: 1; overflow-y: auto;' }
    });

    let calInstancia = null;

    btnTabHabitos.onclick = () => {
      btnTabHabitos.classList.add('active');
      btnTabCalendario.classList.remove('active');
      habitsContainer.style.display = 'flex';
      calContainer.style.display = 'none';
    };

    btnTabCalendario.onclick = async () => {
      btnTabCalendario.classList.add('active');
      btnTabHabitos.classList.remove('active');
      habitsContainer.style.display = 'none';
      calContainer.style.display = 'block';
      if (calInstancia && typeof calInstancia.recarregar === 'function') {
        calInstancia.recarregar();
      }
    };

    if (HabitosView && typeof HabitosView.montar === 'function') {
      await HabitosView.montar({ habitsCard: habitsContainer, ctx });
    }

    if (CalendarioView && typeof CalendarioView.montar === 'function') {
      calInstancia = await CalendarioView.montar({ container: calContainer, ctx });
    }

    // =========================================================================
    // BLOCO 2: CENTRAL DE TAREFAS PRIORITÁRIAS COM CACHE EM MEMÓRIA (70%)
    // =========================================================================
    const tasksCard = hubGrid.createEl('div', { 
      cls: 'snoopy-card-box', 
      attr: { style: 'display: flex; flex-direction: column; gap: 10px; min-height: 380px; max-height: 380px; overflow: hidden;' } 
    });

    if (TarefasView && typeof TarefasView.montar === 'function') {
      let controllerTarefas = null;

      const abrirModalNovaTarefa = () => {
        if (TarefasModal && typeof TarefasModal.abrirModalNovaTarefa === 'function') {
          TarefasModal.abrirModalNovaTarefa({
            app: ctx.app,
            ctx,
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
            ctx,
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
