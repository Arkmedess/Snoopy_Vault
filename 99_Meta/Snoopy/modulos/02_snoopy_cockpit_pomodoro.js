/**
 * Snoopy Vault - Módulo 02: Cockpit de Foco Pomodoro & Histórico de Constância
 * Renderiza o temporizador circular SVG, jardim botânico evolutivo de foco, heatmap real de 30 dias
 * e integra-se reativamente via Barramento de Eventos (`ctx.events`).
 *
 * @module modulos/02_snoopy_cockpit_pomodoro
 * @fires pomodoro:complete - Notifica término de ciclo com minutos acumulados.
 * @listens pomodoro:focar - Inicia sessão direcionada a uma tarefa específica.
 */

return {
  id: 'snoopy_cockpit_pomodoro',
  titulo: 'Pomodoro Cockpit & Histórico',

  /**
   * Ponto de entrada do ciclo de vida de renderização do Módulo 02.
   *
   * @param {object} ctx - Contexto compartilhado com microsserviços transversais.
   * @param {HTMLElement} ctx.root - Contêiner raiz da dashboard.
   * @param {object} ctx.app - Instância global do Obsidian.
   * @param {string} ctx.todayStr - Data atual no formato ISO 'YYYY-MM-DD'.
   * @param {string} ctx.dailyPath - Caminho relativo da nota diária atual.
   * @param {object} ctx.mapaFoco - Dicionário histórico { 'YYYY-MM-DD': totalPomodoros }.
   * @param {SnoopyEventBus} ctx.events - Barramento reativo de eventos.
   * @param {object} ctx.ModalFactory - Fábrica central de janelas modais.
   * @param {object} ctx.VaultStore - Microsserviço de I/O de notas Markdown.
   * @returns {Promise<void>}
   */
  async render(ctx) {
    const { root, app, now, padTime, todayStr, dailyPath, garantirNotaDiaria, mapaFoco, events, ModalFactory, VaultStore } = ctx;

    /**
     * Carrega um submódulo do Vault de forma segura.
     *
     * @param {string} caminho - Caminho relativo no Vault.
     * @returns {Promise<any>}
     */
    async function carregarModulo(caminho) {
      try {
        const file = app.vault.getAbstractFileByPath(caminho);
        if (file) {
          const code = await app.vault.read(file);
          return (new Function(code))();
        }
      } catch (err) {
        console.error(`[Snoopy Pomodoro] Falha ao carregar submódulo: ${caminho}`, err);
      }
      return null;
    }

    const PomodoroJardim = await carregarModulo("99_Meta/Snoopy/modulos/pomodoro/pomodoro_jardim.js");
    const PomodoroTimerClass = await carregarModulo("99_Meta/Snoopy/modulos/pomodoro/pomodoro_timer.js");
    const PomodoroModalClass = await carregarModulo("99_Meta/Snoopy/modulos/pomodoro/pomodoro_modal.js");

    let completedCyclesToday = ctx.completedCyclesToday || 0;
    let focusMin = (ctx.config && ctx.config.tempo_foco) ? Number(ctx.config.tempo_foco) : 25;
    let breakMin = (ctx.config && ctx.config.tempo_pausa_curta) ? Number(ctx.config.tempo_pausa_curta) : 5;
    const dailyGoal = (ctx.config && ctx.config.meta_ciclos_diarios) ? Number(ctx.config.meta_ciclos_diarios) : 4;

    // SEÇÃO TOPO: GRADE DE 2 COLUNAS
    const topGrid = root.createEl('div', { cls: 'snoopy-top-grid' });

    // --- LADO ESQUERDO: COCKPIT POMODORO ---
    const pomoBox = topGrid.createEl('div', { cls: 'snoopy-card-box' });

    const pomoHeader = pomoBox.createEl('div', {
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.08);' }
    });
    pomoHeader.innerHTML = `
      <div class="snoopy-card-header-main">
        <div class="snoopy-toolbar">
          ${ctx.UIKit && ctx.UIKit.ICONS && ctx.UIKit.ICONS['timer'] ? `<span class="snoopy-icon" style="width: 16px; height: 16px; color: var(--snoopy-muted);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">${ctx.UIKit.ICONS['timer']}</svg></span>` : ''}
          <span class="snoopy-section-title">POMODORO</span>
          <span id="snoopy-mode-badge" class="snoopy-micro" style="font-weight: bold; padding: 2px 7px; border-radius: 4px; background: rgba(74, 222, 128, 0.15); color: #86efac;">FOCO ATIVO</span>
        </div>
        <span class="snoopy-card-subtitle">Sessão de foco e intervalo</span>
      </div>
      <div class="snoopy-meta" style="display: flex; align-items: center; gap: 6px; font-size: 12px;">
        <div style="display: flex; align-items: center; gap: 4px; background: #14141c; padding: 3px 8px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.08);">
          <span style="color: #a1a1aa;">Foco:</span>
          <input id="cfg-focus" type="number" value="${focusMin}" min="1" max="90" style="width: 32px; background: transparent; color: #ffffff; font-weight: bold; text-align: center; border: none; outline: none;">
          <span style="color: #71717a;">m</span>
        </div>
        <div style="display: flex; align-items: center; gap: 4px; background: #14141c; padding: 3px 8px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.08);">
          <span style="color: #a1a1aa;">Pausa:</span>
          <input id="cfg-break" type="number" value="${breakMin}" min="1" max="30" style="width: 28px; background: transparent; color: #ffffff; font-weight: bold; text-align: center; border: none; outline: none;">
          <span style="color: #71717a;">m</span>
        </div>
      </div>
    `;

    // Banner de Alvo de Foco Selecionado
    const targetBanner = pomoBox.createEl('div', {
      cls: 'snoopy-target-banner',
      attr: { id: 'snoopy-pomodoro-target-box', style: 'display: none;' }
    });
    targetBanner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
        <span id="snoopy-target-icon-box" style="display: inline-flex; align-items: center;"></span>
        <div style="overflow: hidden;">
          <div class="snoopy-micro" style="font-weight: 700; color: #86efac; letter-spacing: 0.05em;">FOCO SELECIONADO:</div>
          <div id="snoopy-target-name" style="font-size: 12px; font-weight: 700; color: #ffffff; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">-</div>
        </div>
      </div>
      <div class="snoopy-toolbar">
        <button id="snoopy-btn-target-done" class="snoopy-btn-action snoopy-btn-sm" style="color: #86efac;">Feito</button>
        <button id="snoopy-btn-target-clear" class="snoopy-btn-icon" title="Liberar foco"></button>
      </div>
    `;
    const tIconBox = targetBanner.querySelector('#snoopy-target-icon-box');
    const tDoneBtn = targetBanner.querySelector('#snoopy-btn-target-done');
    const tClearBtn = targetBanner.querySelector('#snoopy-btn-target-clear');
    const renderIconFn = ctx.renderIcon || (ctx.UIKit && ctx.UIKit.renderIcon ? (c, n, o) => ctx.UIKit.renderIcon(c, n, o) : null);
    if (renderIconFn) {
      renderIconFn(tIconBox, 'target', { size: 14, color: '#86efac' });
      renderIconFn(tDoneBtn, 'check', { size: 12, color: '#86efac' });
      renderIconFn(tClearBtn, 'x', { size: 12 });
    }

    // Centro do Pomodoro: Anel SVG + Controles
    const pomoCenter = pomoBox.createEl('div', {
      attr: { style: 'display: grid; grid-template-columns: 5fr 7fr; gap: 20px; align-items: center; padding: 14px 0;' }
    });

    const ringWrapper = pomoCenter.createEl('div', { attr: { style: 'display: flex; justify-content: center;' } });
    const svgBox = ringWrapper.createEl('div', { attr: { style: 'position: relative; width: 170px; height: 170px; display: flex; align-items: center; justify-content: center;' } });
    svgBox.innerHTML = `
      <svg style="width: 170px; height: 170px;" viewBox="0 0 170 170">
        <circle class="circle-progress-bg" cx="85" cy="85" r="74" fill="none" stroke-width="7" />
        <circle id="snoopy-circle-bar" class="circle-progress-bar" cx="85" cy="85" r="74" fill="none" stroke-width="7" stroke-dasharray="464.96" stroke-dashoffset="0" />
      </svg>
      <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; user-select: none;">
        <span id="snoopy-timer-display" class="snoopy-meta" style="font-size: 34px; font-weight: 800; color: #ffffff; letter-spacing: 0.06em; line-height: 1;">${String(focusMin).padStart(2, '0')}:00</span>
        <span id="snoopy-cycle-label" class="snoopy-meta" style="font-size: 13px; font-weight: bold; color: #86efac; margin-top: 6px;">Ciclo 1 de ${dailyGoal}</span>
      </div>
    `;

    const controlsCol = pomoCenter.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 12px;' } });
    const criarBtn = (parent, opts) => {
      if (ctx.UIKit && typeof ctx.UIKit.criarBotao === 'function') {
        return ctx.UIKit.criarBotao(parent, opts, ctx);
      }
      const b = parent.createEl('button', { cls: `snoopy-btn-${opts.variant || 'action'} ${opts.cls || ''}` });
      if (opts.label) b.createEl('span', { text: opts.label });
      return b;
    };

    // Controles de Play / Pause / Reset / Modo Foco
    const ctrlBlock1 = controlsCol.createEl('div');
    ctrlBlock1.innerHTML = '<div class="snoopy-sub-title" style="margin-bottom: 6px;">Controle do Timer</div>';
    const btnsRow1 = ctrlBlock1.createEl('div', { cls: 'snoopy-toolbar' });
    const startBtn = criarBtn(btnsRow1, {
      label: 'Iniciar Foco',
      icon: 'play',
      iconSize: 13,
      variant: 'primary',
      cls: 'snoopy-btn-block'
    });
    const resetBtn = criarBtn(btnsRow1, {
      label: 'Reset',
      icon: 'rotate-ccw',
      iconSize: 12,
      variant: 'action'
    });
    const btnModoImersivo = criarBtn(btnsRow1, {
      label: 'Modo Foco',
      icon: 'search',
      iconSize: 12,
      variant: 'action'
    });

    // Modos Foco / Pausa / Testar
    const ctrlBlock2 = controlsCol.createEl('div');
    ctrlBlock2.innerHTML = '<div class="snoopy-sub-title" style="margin-bottom: 6px;">Alternar Modo</div>';
    const btnsRow2 = ctrlBlock2.createEl('div', { cls: 'snoopy-toolbar' });
    const btnModeFoco = criarBtn(btnsRow2, {
      label: `Foco (${focusMin}m)`,
      variant: 'mode',
      active: true,
      cls: 'snoopy-btn-block'
    });
    const btnModePausa = criarBtn(btnsRow2, {
      label: `Pausa (${breakMin}m)`,
      variant: 'mode',
      cls: 'snoopy-btn-block'
    });
    const btnTestar = criarBtn(btnsRow2, {
      label: 'Testar',
      icon: 'zap',
      iconSize: 12,
      variant: 'mode'
    });

    // Botões de Anotação & Flashcard
    const ctrlBlock3 = controlsCol.createEl('div');
    ctrlBlock3.innerHTML = '<div class="snoopy-sub-title" style="margin-bottom: 6px;">Registro na Nota Diária</div>';
    const btnsRow3 = ctrlBlock3.createEl('div', { cls: 'snoopy-toolbar' });
    const btnAnotar = criarBtn(btnsRow3, {
      label: 'O que aprendi?',
      icon: 'pencil',
      iconSize: 12,
      variant: 'action',
      cls: 'snoopy-btn-block'
    });
    const btnFlashcard = criarBtn(btnsRow3, {
      label: '+ Flashcard',
      icon: 'brain',
      iconSize: 12,
      variant: 'action',
      cls: 'snoopy-btn-block'
    });

    // Rodapé Cockpit
    const pomoFooter = pomoBox.createEl('div', {
      cls: 'snoopy-micro',
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; color: #71717a; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08);' }
    });
    pomoFooter.innerHTML = `<span style="color: #71717a;">Ciclo automático com nota diária</span><span style="color: #86efac; font-weight: 600;">Sincronizado</span>`;

    // --- LADO DIREITO: HISTÓRICO & JARDIM EXPANDIDO ---
    const historyBox = topGrid.createEl('div', { cls: 'snoopy-card-box' });

    let historyHeaderEls = null;
    if (ctx.UIKit && typeof ctx.UIKit.criarCardHeader === 'function') {
      historyHeaderEls = ctx.UIKit.criarCardHeader(historyBox, {
        title: 'JARDIM DE CONSTÂNCIA',
        icon: 'sprout',
        subtitle: 'Histórico e ciclos acumulados'
      });
      historyHeaderEls.actionsBox.createEl('span', {
        cls: 'snoopy-meta',
        attr: { id: 'snoopy-today-stats', style: 'color: #86efac; font-weight: bold;' },
        text: '0 ciclos hoje (0 min)'
      });
    } else {
      const historyHeader = historyBox.createEl('div', { cls: 'snoopy-card-header' });
      historyHeader.innerHTML = `
        <div class="snoopy-card-header-main">
          <div class="snoopy-toolbar">
            <span class="snoopy-section-title">JARDIM DE CONSTÂNCIA</span>
          </div>
          <span class="snoopy-card-subtitle">Histórico e ciclos acumulados</span>
        </div>
        <span id="snoopy-today-stats" class="snoopy-meta" style="color: #86efac; font-weight: bold;">0 ciclos hoje (0 min)</span>
      `;
    }

    const plantCard = historyBox.createEl('div', {
      attr: { style: 'display: flex; align-items: center; gap: 14px; padding: 12px 14px; background: #13131c; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); margin: 6px 0;' }
    });
    plantCard.innerHTML = `
      <div id="snoopy-plant-avatar" style="width: 56px; height: 56px; border-radius: 50%; background: #181824; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; flex-shrink: 0; user-select: none;"></div>
      <div style="flex: 1; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span id="snoopy-stage-title" style="font-size: 14px; font-weight: 700; color: #ffffff;">Semente Plantada</span>
          <span id="snoopy-stage-badge" class="snoopy-micro" style="padding: 2px 7px; border-radius: 4px; background: rgba(74, 222, 128, 0.15); color: #86efac; font-weight: bold;">NÍVEL 1</span>
        </div>
        <div id="snoopy-stage-desc" class="snoopy-meta" style="font-size: 11.5px; color: #a1a1aa; margin-top: 3px;">Inicie seu primeiro foco para germinar a plantinha.</div>
        <div class="snoopy-prog-track" style="height: 7px; width: 100%; margin-top: 7px;">
          <div id="snoopy-plant-bar" class="snoopy-prog-fill" style="width: 0%; background: #4ade80;"></div>
        </div>
      </div>
    `;

    const historySplit = historyBox.createEl('div', { attr: { style: 'padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.08);' } });
    historySplit.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="snoopy-sub-title">CICLOS DE POMODORO (ÚLTIMOS 30 DIAS)</span>
        <div class="snoopy-micro" style="display: flex; align-items: center; gap: 4px; color: #a1a1aa;">
          <span>0</span>
          <div class="snoopy-heat-cell heat-lvl-0"></div>
          <div class="snoopy-heat-cell heat-lvl-2"></div>
          <div class="snoopy-heat-cell heat-lvl-4"></div>
          <span>4+</span>
        </div>
      </div>
    `;

    const gridMetricsRow = historySplit.createEl('div', {
      attr: { style: 'display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: center;' }
    });

    const heatScroll = gridMetricsRow.createEl('div', { attr: { style: 'padding: 2px 0;' } });
    heatScroll.createEl('div', { cls: 'snoopy-heat-grid' });

    const metricsSide = gridMetricsRow.createEl('div', {
      cls: 'snoopy-meta',
      attr: { style: 'background: #14141c; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 9px;' }
    });
    metricsSide.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline;">
        <span style="color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Na Semana:</span>
        <span id="metric-week" style="font-weight: 800; color: #ffffff; font-size: 13.5px;">0m</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: baseline; padding-top: 7px; border-top: 1px solid rgba(255,255,255,0.05);">
        <span style="color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Maior Foco:</span>
        <span id="metric-peak" style="font-weight: 800; color: #ffffff; font-size: 13.5px;">0m</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: baseline; padding-top: 7px; border-top: 1px solid rgba(255,255,255,0.05);">
        <span style="color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Sequência:</span>
        <span id="metric-streak" style="font-weight: 800; color: #ffffff; font-size: 13.5px;">0 dias</span>
      </div>
    `;

    const historyFooter = historyBox.createEl('div', {
      cls: 'snoopy-micro',
      attr: { style: 'display: flex; justify-content: space-between; color: #71717a; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.08); margin-top: 8px;' }
    });
    historyFooter.innerHTML = `<span>Total Histórico: <strong id="metric-total" style="color: #e4e4e7;">0 ciclos</strong></span><span style="color: #ffffff; font-weight: 600;">Constância Ativa</span>`;

    // --- INSTANCIAÇÃO DOS SUBMÓDULOS E BINDINGS ---
    const circleBar = pomoBox.querySelector('#snoopy-circle-bar');
    const timerDisplay = pomoBox.querySelector('#snoopy-timer-display');
    const modeBadge = pomoBox.querySelector('#snoopy-mode-badge');
    const targetNameEl = targetBanner.querySelector('#snoopy-target-name');

    const modalManager = PomodoroModalClass ? new PomodoroModalClass({
      app,
      ModalFactory,
      VaultStore,
      garantirNotaDiaria,
      todayStr,
      padTime,
      onPausaIniciar: () => {
        if (timer) {
          timer.setMode('pausa');
          timer.start();
        }
      }
    }) : null;

    const atualizarTelasJardim = () => {
      if (PomodoroJardim) {
        PomodoroJardim.atualizarVisualPlanta(historyBox, {
          completedCyclesToday,
          dailyGoal,
          focusMin,
          renderIcon: ctx.renderIcon
        });
        PomodoroJardim.renderizarHeatmap(historyBox, {
          mapaFoco,
          todayStr,
          focusMin,
          now
        });
      }
    };

    const finalizarFoco = async () => {
      completedCyclesToday++;
      mapaFoco[todayStr] = completedCyclesToday;

      if (modalManager) {
        await modalManager.salvarPomodoroNaNotaDiaria(completedCyclesToday);
        await modalManager.sincronizarComCicloEstudos(focusMin);
      }

      atualizarTelasJardim();
      if (modalManager) {
        modalManager.abrirModalAnotacao(false);
      }
    };

    // --- SÍNTESE SONORA NATIVA (Web Audio API) ---
    const tocarChimePomodoro = () => {
      try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        if (!AudioContextClass) return;
        const audioCtx = new AudioContextClass();
        const notas = [523.25, 659.25, 783.99, 1046.50]; // C5 -> E5 -> G5 -> C6
        const tempoInicio = audioCtx.currentTime;

        notas.forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          const t = tempoInicio + (idx * 0.15);

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, t);

          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.exponentialRampToValueAtTime(0.25, t + 0.04);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.8);

          osc.connect(gain);
          gain.connect(audioCtx.destination);

          osc.start(t);
          osc.stop(t + 0.85);
        });
      } catch(e) {
        console.warn('[Pomodoro Audio] Erro ao sintetizar chime:', e);
      }
    };

    // --- MODO FOCO IMERSIVO (100% Destacado & Fundo Escuro) ---
    let focusOverlay = null;

    const fecharModoImersivo = () => {
      if (focusOverlay && focusOverlay.parentNode) {
        focusOverlay.parentNode.removeChild(focusOverlay);
        focusOverlay = null;
      }
      document.removeEventListener('keydown', onImmersiveEsc);
    };

    const onImmersiveEsc = (e) => {
      if (e.key === 'Escape') fecharModoImersivo();
    };

    const ativarModoImersivo = () => {
      if (focusOverlay) return;
      focusOverlay = document.createElement('div');
      focusOverlay.className = 'snoopy-focus-immersive-overlay';
      focusOverlay.setAttribute('style', `
        position: fixed;
        inset: 0;
        z-index: 99999;
        background: rgba(5, 5, 10, 0.96);
        backdrop-filter: blur(14px);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 22px;
        padding: 24px;
        color: #ffffff;
        font-family: var(--font-interface, inherit);
      `);

      const alvoNome = (timer && timer.alvoAtual && (timer.alvoAtual.texto || timer.alvoAtual.titulo))
        || (targetNameEl && targetNameEl.textContent !== '-' ? targetNameEl.textContent : 'Sessão de Foco Livre');

      const tempoAtualStr = timerDisplay ? timerDisplay.textContent : '25:00';
      const offsetAtual = circleBar ? circleBar.style.strokeDashoffset : '0';
      const isRodando = Boolean(timer && timer.timerInterval);

      focusOverlay.innerHTML = `
        <div style="position: absolute; top: 22px; right: 26px; display: flex; align-items: center; gap: 14px;">
          <span style="font-size: 11px; color: #71717a;">Pressione <kbd style="background: rgba(255,255,255,0.12); padding: 3px 7px; border-radius: 4px; color: #fff; font-size: 10px;">Esc</kbd> para sair</span>
          <button id="snoopy-imm-close" class="snoopy-btn-action snoopy-btn-sm" style="color: #fff; font-weight: 600;">Sair</button>
        </div>

        <div style="text-align: center; max-width: 650px;">
          <div style="display: flex; align-items: center; justify-content: center; gap: 6px; font-size: 12px; font-weight: 800; color: #86efac; text-transform: uppercase; letter-spacing: 0.12em; margin-bottom: 8px;">
            <span id="snoopy-imm-target-icon"></span>
            <span>FOCO ATIVO SEM DISTRAÇÕES</span>
          </div>
          <h2 style="font-size: 26px; font-weight: 800; color: #ffffff; margin: 0; text-shadow: 0 2px 12px rgba(0,0,0,0.6);">${alvoNome}</h2>
        </div>

        <div style="position: relative; width: 260px; height: 260px; display: flex; align-items: center; justify-content: center;">
          <svg style="width: 260px; height: 260px;" viewBox="0 0 170 170">
            <circle cx="85" cy="85" r="74" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="6" />
            <circle id="snoopy-imm-circle-bar" cx="85" cy="85" r="74" fill="none" stroke="#4ade80" stroke-width="6" stroke-dasharray="464.96" stroke-dashoffset="${offsetAtual}" />
          </svg>
          <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; user-select: none;">
            <span id="snoopy-imm-display" style="font-size: 54px; font-weight: 900; color: #ffffff; letter-spacing: 0.05em; line-height: 1; font-family: monospace;">${tempoAtualStr}</span>
            <span id="snoopy-imm-cycle" style="font-size: 13px; font-weight: 700; color: #86efac; margin-top: 10px; text-transform: uppercase; letter-spacing: 0.08em;">${modeBadge ? modeBadge.textContent : 'FOCO ATIVO'}</span>
          </div>
        </div>

        <div style="display: flex; gap: 12px; margin-top: 6px;">
          <button id="snoopy-imm-play-btn" class="snoopy-btn-primary snoopy-btn-md">
            ${isRodando ? 'Pausar' : 'Iniciar Foco'}
          </button>
          <button id="snoopy-imm-done-btn" class="snoopy-btn-action snoopy-btn-md" style="color: #86efac;">
            Concluir Alvo
          </button>
        </div>
      `;

      if (renderIconFn) {
        renderIconFn(focusOverlay.querySelector('#snoopy-imm-close'), 'x', { size: 12 });
        renderIconFn(focusOverlay.querySelector('#snoopy-imm-target-icon'), 'target', { size: 14, color: '#86efac' });
        renderIconFn(focusOverlay.querySelector('#snoopy-imm-done-btn'), 'check', { size: 14, color: '#86efac' });
      }

      document.body.appendChild(focusOverlay);
      document.addEventListener('keydown', onImmersiveEsc);

      focusOverlay.querySelector('#snoopy-imm-close').onclick = fecharModoImersivo;

      focusOverlay.querySelector('#snoopy-imm-play-btn').onclick = () => {
        if (startBtn) startBtn.click();
        setTimeout(() => {
          const rodandoAgora = Boolean(timer && timer.timerInterval);
          const btnPP = focusOverlay?.querySelector('#snoopy-imm-play-btn');
          if (btnPP) btnPP.textContent = rodandoAgora ? 'Pausar' : 'Iniciar Foco';
        }, 50);
      };

      focusOverlay.querySelector('#snoopy-imm-done-btn').onclick = () => {
        const btnDone = targetBanner ? targetBanner.querySelector('#snoopy-btn-target-done') : null;
        if (btnDone) btnDone.click();
        fecharModoImersivo();
      };
    };

    if (btnModoImersivo) {
      btnModoImersivo.onclick = (e) => {
        e.preventDefault();
        ativarModoImersivo();
      };
    }

    if (ctx.Lifecycle) {
      ctx.Lifecycle.onDispose('home', fecharModoImersivo);
    }

    // Recupera estado preservado do Pomodoro (se houver) para sobreviver a re-renders
    const globalState = typeof window !== 'undefined' ? window.__snoopyPomodoroState : null;
    const initialMode = globalState ? globalState.currentMode : 'foco';
    const initialRemaining = globalState ? globalState.remainingSeconds : (focusMin * 60);
    const initialAlvo = globalState ? globalState.alvoAtual : null;
    const endAt = globalState ? globalState.endAt : null;

    const timer = PomodoroTimerClass ? new PomodoroTimerClass({
      focusMin,
      breakMin,
      initialMode,
      initialRemaining,
      initialAlvo,
      endAt,
      onTick: ({ timeStr, offset }) => {
        if (timerDisplay) timerDisplay.textContent = timeStr;
        if (circleBar) circleBar.style.strokeDashoffset = offset;
        if (focusOverlay) {
          const immDisp = focusOverlay.querySelector('#snoopy-imm-display');
          const immBar = focusOverlay.querySelector('#snoopy-imm-circle-bar');
          if (immDisp) immDisp.textContent = timeStr;
          if (immBar) immBar.style.strokeDashoffset = offset;
        }
        if (typeof window !== 'undefined') {
          window.__snoopyPomodoroState = {
            isRunning: Boolean(timer && timer.timerInterval),
            endAt: timer ? timer.endAt : null,
            remainingSeconds: timer ? timer.remainingSeconds : 0,
            currentMode: timer ? timer.currentMode : 'foco',
            alvoAtual: timer ? timer.alvoAtual : null
          };
        }
      },
      onComplete: ({ mode }) => {
        if (typeof window !== 'undefined') {
          window.__snoopyPomodoroState = null;
        }
        tocarChimePomodoro();
        if (mode === 'foco') {
          finalizarFoco();
        } else {
          new Notice('Pausa concluída! Hora de focar.');
          if (timer) timer.setMode('foco');
        }
      },
      onModeChange: ({ mode }) => {
        if (circleBar) circleBar.style.stroke = mode === 'foco' ? '#4ade80' : '#60a5fa';
        if (modeBadge) {
          modeBadge.textContent = mode === 'foco' ? 'FOCO ATIVO' : 'PAUSA ATIVA';
          modeBadge.style.color = mode === 'foco' ? '#86efac' : '#93c5fd';
          modeBadge.style.background = mode === 'foco' ? 'rgba(74, 222, 128, 0.15)' : 'rgba(96, 165, 250, 0.15)';
        }
        if (btnModeFoco) btnModeFoco.classList.toggle('active', mode === 'foco');
        if (btnModePausa) btnModePausa.classList.toggle('active', mode === 'pausa');
      },
      onRunningChange: ({ isRunning }) => {
        if (typeof window !== 'undefined' && timer) {
          window.__snoopyPomodoroState = {
            isRunning,
            endAt: timer.endAt,
            remainingSeconds: timer.remainingSeconds,
            currentMode: timer.currentMode,
            alvoAtual: timer.alvoAtual
          };
        }
        if (!startBtn) return;
        startBtn.innerHTML = '';
        const iconName = isRunning ? 'pause' : 'play';
        const label = isRunning ? 'Pausar' : (timer.currentMode === 'foco' ? 'Iniciar Foco' : 'Iniciar Pausa');
        if (ctx.renderIcon) ctx.renderIcon(startBtn, iconName, { size: 13 });
        startBtn.createEl('span', { text: label });
      }
    }) : null;

    // Hidrata visual inicial caso venha de estado anterior ou timer em execucao
    if (timer) {
      const initStr = timer.formatarTempo(timer.remainingSeconds);
      if (timerDisplay) timerDisplay.textContent = initStr;
      const initOffset = timer.calcularStrokeOffset(timer.remainingSeconds, timer.totalSeconds);
      if (circleBar) circleBar.style.strokeDashoffset = initOffset;
      if (globalState && globalState.isRunning && globalState.endAt && globalState.endAt > Date.now()) {
        timer.start();
      }
    }

    // Alvo direcionado
    const definirAlvoFoco = (dados) => {
      if (timer) timer.setAlvo(dados);
      if (targetBanner && targetNameEl) {
        targetBanner.style.display = 'flex';
        targetNameEl.textContent = dados.texto || dados.titulo || '-';
        pomoBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pomoBox.style.borderColor = 'rgba(134, 239, 172, 0.4)';
        setTimeout(() => { pomoBox.style.borderColor = ''; }, 2000);
        new Notice(`[Snoopy] Pomodoro apontado para: ${dados.texto || dados.titulo}`);
      }
    };

    if (initialAlvo && targetBanner && targetNameEl) {
      targetBanner.style.display = 'flex';
      targetNameEl.textContent = initialAlvo.texto || initialAlvo.titulo || '-';
    }

    if (events) {
      const cancelPomoFoco = events.on('pomodoro:foco', definirAlvoFoco);
      if (ctx.Lifecycle) {
        ctx.Lifecycle.onDispose('home', cancelPomoFoco);
      }
    }
    if (ctx.Lifecycle && timer) {
      ctx.Lifecycle.onDispose('home', () => {
        timer.destroy();
      });
    }

    if (typeof window !== 'undefined') {
      window.snoopySetPomodoroFocus = (titulo) => definirAlvoFoco({ texto: titulo });
      window._snoopyDefinirTarefaFoco = (d) => definirAlvoFoco(d);
    }

    const btnTargetClear = targetBanner.querySelector('#snoopy-btn-target-clear');
    if (btnTargetClear) {
      btnTargetClear.onclick = (e) => {
        e.preventDefault();
        if (timer) timer.setAlvo(null);
        targetBanner.style.display = 'none';
        if (targetNameEl) targetNameEl.textContent = '-';
        new Notice('[Snoopy] Alvo de foco liberado.');
      };
    }

    const btnTargetDone = targetBanner.querySelector('#snoopy-btn-target-done');
    if (btnTargetDone) {
      btnTargetDone.onclick = (e) => {
        e.preventDefault();
        const nomeAtual = targetNameEl ? targetNameEl.textContent : '';
        targetBanner.style.display = 'none';
        const alvo = timer ? timer.alvoAtual : null;
        if (events && alvo) {
          events.emit('tarefa:concluir', alvo);
        } else if (typeof window._snoopyConcluirTarefaAtiva === 'function' && alvo) {
          window._snoopyConcluirTarefaAtiva(alvo);
        }
        if (timer) timer.setAlvo(null);
        new Notice(`[Snoopy] Concluído: "${nomeAtual}"!`);
      };
    }

    // Configurações de Foco/Pausa
    const cfgFocusInput = pomoBox.querySelector('#cfg-focus');
    const cfgBreakInput = pomoBox.querySelector('#cfg-break');
    const atualizarTempos = () => {
      focusMin = parseInt(cfgFocusInput.value) || 25;
      breakMin = parseInt(cfgBreakInput.value) || 5;
      if (btnModeFoco) btnModeFoco.textContent = `Foco (${focusMin}m)`;
      if (btnModePausa) btnModePausa.textContent = `Pausa (${breakMin}m)`;
      if (timer) timer.setTempos(focusMin, breakMin);
    };

    if (cfgFocusInput) cfgFocusInput.onchange = atualizarTempos;
    if (cfgBreakInput) cfgBreakInput.onchange = atualizarTempos;

    if (startBtn) startBtn.onclick = () => { if (timer) timer.toggle(); };
    if (resetBtn) resetBtn.onclick = () => { if (timer) timer.reset(); };
    if (btnModeFoco) btnModeFoco.onclick = () => { if (timer) timer.setMode('foco'); };
    if (btnModePausa) btnModePausa.onclick = () => { if (timer) timer.setMode('pausa'); };

    if (btnTestar) btnTestar.onclick = finalizarFoco;
    if (btnAnotar && modalManager) btnAnotar.onclick = () => modalManager.abrirModalAnotacao(false);
    if (btnFlashcard && modalManager) btnFlashcard.onclick = () => modalManager.abrirModalAnotacao(true);

    // Inicialização Visual
    if (timer) timer._notificarTick();
    atualizarTelasJardim();
  }
};
