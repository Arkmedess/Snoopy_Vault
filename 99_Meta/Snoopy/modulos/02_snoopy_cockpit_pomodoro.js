/**
 * Snoopy Vault - Módulo 02: Cockpit de Foco Pomodoro & Histórico de Constância
 * Renderiza o temporizador circular SVG com controles iconizados no estilo player (Spotify vibe),
 * Playlist de Ciclos / Fila de Foco contínua ligada às tarefas, jardim botânico evolutivo e heatmap real de 30 dias.
 *
 * @module modulos/02_snoopy_cockpit_pomodoro
 * @fires pomodoro:complete - Notifica término de ciclo com minutos acumulados.
 * @listens pomodoro:foco - Aponta foco imediato para uma tarefa.
 * @listens pomodoro:enfileirar - Adiciona tarefa à playlist de foco.
 * @listens pomodoro:comando - Executa comandos CLI do timer (start, pause, reset, proximo).
 */

return {
  id: 'snoopy_cockpit_pomodoro',
  titulo: 'Pomodoro Cockpit & Histórico',

  /**
   * Ponto de entrada do ciclo de vida de renderização do Módulo 02.
   *
   * @param {object} ctx - Contexto compartilhado com microsserviços transversais.
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
    const PomodoroPlaylistClass = await carregarModulo("99_Meta/Snoopy/modulos/pomodoro/pomodoro_playlist.js");
    const JardimStore = await carregarModulo("99_Meta/Snoopy/core/jardim_store.js");

    let completedCyclesToday = ctx.completedCyclesToday || 0;
    let focusMin = (ctx.config && ctx.config.tempo_foco) ? Number(ctx.config.tempo_foco) : 25;
    let breakMin = (ctx.config && ctx.config.tempo_pausa_curta) ? Number(ctx.config.tempo_pausa_curta) : 5;
    const dailyGoal = (ctx.config && ctx.config.meta_ciclos_diarios) ? Number(ctx.config.meta_ciclos_diarios) : 4;

    const renderIconFn = ctx.renderIcon || (ctx.UIKit && ctx.UIKit.renderIcon ? (c, n, o) => ctx.UIKit.renderIcon(c, n, o) : null);

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
        </div>
        <span class="snoopy-card-subtitle">Sessão de foco e intervalo</span>
      </div>
      <div class="snoopy-meta" style="display: flex; align-items: center; gap: 8px;">
        <label class="snoopy-time-chip" title="Tempo de foco em minutos (clique para alterar)">
          <span class="snoopy-time-chip-label">Foco:</span>
          <input id="cfg-focus" class="snoopy-time-chip-input" type="number" value="${focusMin}" min="1" max="90" aria-label="Tempo de foco em minutos">
          <span class="snoopy-time-chip-unit">m</span>
        </label>
        <label class="snoopy-time-chip" title="Tempo de pausa em minutos (clique para alterar)">
          <span class="snoopy-time-chip-label">Pausa:</span>
          <input id="cfg-break" class="snoopy-time-chip-input" type="number" value="${breakMin}" min="1" max="30" aria-label="Tempo de pausa em minutos">
          <span class="snoopy-time-chip-unit">m</span>
        </label>
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
          <div class="snoopy-micro" style="font-weight: 700; color: #86efac; letter-spacing: 0.05em;">FOCO ATIVO (TOCANDO AGORA):</div>
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
    if (renderIconFn) {
      renderIconFn(tIconBox, 'target', { size: 14, color: '#86efac' });
      renderIconFn(tDoneBtn, 'check', { size: 12, color: '#86efac' });
      renderIconFn(tClearBtn, 'x', { size: 12 });
    }

    // Centro do Pomodoro: Anel SVG + Controles do Player + Focus Playlist (Spotify vibe)
    const pomoCenter = pomoBox.createEl('div', {
      cls: 'snoopy-pomo-center',
      attr: { style: 'display: grid; grid-template-columns: minmax(200px, 1.15fr) 1.35fr; gap: 14px; align-items: center; padding: 2px 0;' }
    });

    const ringWrapper = pomoCenter.createEl('div', { 
      cls: 'snoopy-ring-wrapper',
      attr: { style: 'display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 4px;' } 
    });
    const svgBox = ringWrapper.createEl('div', {
      cls: 'snoopy-circle-box',
      attr: { style: 'position: relative; width: 200px; height: 200px; display: flex; align-items: center; justify-content: center;' }
    });
    svgBox.innerHTML = `
      <svg style="width: 200px; height: 200px;" viewBox="0 0 170 170">
        <circle class="circle-progress-bg" cx="85" cy="85" r="74" fill="none" stroke-width="7" />
        <circle id="snoopy-circle-bar" class="circle-progress-bar" cx="85" cy="85" r="74" fill="none" stroke-width="7" stroke-dasharray="464.96" stroke-dashoffset="0" />
      </svg>
      <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; user-select: none;">
        <span id="snoopy-timer-display" class="snoopy-meta" style="font-size: 38px; font-weight: 800; color: #ffffff; letter-spacing: 0.04em; line-height: 1; font-family: var(--font-monospace, monospace);">${String(focusMin).padStart(2, '0')}:00</span>
        <span id="snoopy-cycle-label" class="snoopy-meta" style="font-size: 12px; font-weight: 700; color: #86efac; margin-top: 6px; letter-spacing: 0.05em; text-transform: uppercase;">Ciclo 1 de ${dailyGoal}</span>
      </div>
    `;

    // Painel de Ritmo Diário ampliado abaixo do Relógio
    const dailyPomoTracker = ringWrapper.createEl('div', {
      cls: 'snoopy-daily-tracker-box',
      attr: { style: 'display: flex; flex-direction: column; align-items: center; gap: 4px; width: 100%; max-width: 185px; margin-top: 2px;' }
    });
    const pctMetaHoje = dailyGoal > 0 ? Math.min(100, Math.round((completedCyclesToday / dailyGoal) * 100)) : 0;
    dailyPomoTracker.innerHTML = `
      <div style="display: flex; justify-content: space-between; width: 100%; font-size: 12px; color: #a1a1aa;">
        <span style="font-weight: 600;">Meta Diária:</span>
        <span id="snoopy-pomo-meta-txt" style="font-weight: 800; color: #86efac; font-size: 13px;">${completedCyclesToday}/${dailyGoal} ciclos</span>
      </div>
      <div class="snoopy-prog-track" style="height: 8px; width: 100%; border-radius: 4px;">
        <div id="snoopy-pomo-meta-fill" class="snoopy-prog-fill" style="width: ${pctMetaHoje}%; background: #4ade80; border-radius: 4px;"></div>
      </div>
    `;

    const playerCol = pomoCenter.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 10px;' } });

    // 1. DOCK DE CONTROLES DO PLAYER (Estilo Spotify Compacto & Iconizado)
    const dockWrap = playerCol.createEl('div');
    dockWrap.innerHTML = '<div class="snoopy-sub-title" style="margin-bottom: 5px; font-size: 11px;">CONTROLE DE REPRODUÇÃO</div>';
    const playerDock = dockWrap.createEl('div', { cls: 'snoopy-player-dock' });

    // Botão Reset
    const btnReset = playerDock.createEl('button', {
      cls: 'snoopy-player-btn-icon',
      attr: { title: 'Reiniciar ciclo atual (Reset)' }
    });
    if (renderIconFn) renderIconFn(btnReset, 'rotate-ccw', { size: 14 });

    // Botão Ciclo/Faixa Anterior
    const btnPrev = playerDock.createEl('button', {
      cls: 'snoopy-player-btn-icon',
      attr: { title: 'Ciclo / Faixa anterior' }
    });
    if (renderIconFn) renderIconFn(btnPrev, 'skip-back', { size: 14 });

    // Botão Principal Play/Pause (Padronizado e harmonizado)
    const btnMainPlay = playerDock.createEl('button', {
      cls: 'snoopy-player-btn-main',
      attr: { title: 'Iniciar / Pausar foco' }
    });
    if (renderIconFn) renderIconFn(btnMainPlay, 'play', { size: 16, color: '#070709' });

    // Botão Próximo Ciclo/Faixa
    const btnNext = playerDock.createEl('button', {
      cls: 'snoopy-player-btn-icon',
      attr: { title: 'Avançar para próximo ciclo / próxima faixa' }
    });
    if (renderIconFn) renderIconFn(btnNext, 'skip-forward', { size: 14 });

    // Divisor
    playerDock.createEl('div', { cls: 'snoopy-player-divider' });

    // Alternar Modo Foco / Pausa
    const btnToggleMode = playerDock.createEl('button', {
      cls: 'snoopy-player-btn-icon',
      attr: { title: 'Alternar entre Foco e Pausa' }
    });
    if (renderIconFn) renderIconFn(btnToggleMode, 'clock', { size: 14 });

    // Modo Foco Imersivo (Tela Cheia)
    const btnImersivo = playerDock.createEl('button', {
      cls: 'snoopy-player-btn-icon',
      attr: { title: 'Modo Foco Imersivo sem distrações' }
    });
    if (renderIconFn) renderIconFn(btnImersivo, 'maximize-2', { size: 14 });

    // Botão Testar / Concluir Rápido
    const btnTestar = playerDock.createEl('button', {
      cls: 'snoopy-player-btn-icon',
      attr: { title: 'Simular término do ciclo (Testar)' }
    });
    if (renderIconFn) renderIconFn(btnTestar, 'zap', { size: 14, color: '#facc15' });

    // 2. FILA DE FOCO / PLAYLIST (Spotify Vibe)
    const playlistWrap = playerCol.createEl('div', { cls: 'snoopy-pomodoro-playlist' });

    const playlistHeader = playlistWrap.createEl('div', { cls: 'snoopy-playlist-header' });
    playlistHeader.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
        <span class="snoopy-micro" style="font-weight: 700; color: #a1a1aa; letter-spacing: 0.05em; white-space: nowrap;">FILA DE FOCO (PLAYLIST)</span>
        <span id="snoopy-playlist-count" class="snoopy-micro" style="color: #60a5fa; font-weight: bold; white-space: nowrap; flex-shrink: 0;">0 faixas</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
        <button id="snoopy-playlist-btn-add" class="snoopy-playlist-btn-edit" title="Adicionar nova tarefa na fila">+ Fila</button>
        <button id="snoopy-playlist-clear" class="snoopy-micro" style="background: transparent; border: none; color: #71717a; cursor: pointer; padding: 2px 4px;">Limpar</button>
      </div>
    `;

    const playlistTracksBox = playlistWrap.createEl('div', {
      attr: { id: 'snoopy-playlist-tracks', style: 'display: flex; flex-direction: column; gap: 4px;' }
    });

    // 3. Ações Rápidas de Registro
    const quickLogRow = playerCol.createEl('div', { cls: 'snoopy-toolbar', attr: { style: 'margin-top: 2px;' } });
    const btnAnotar = quickLogRow.createEl('button', {
      cls: 'snoopy-btn-action snoopy-btn-sm snoopy-btn-block',
      attr: { style: 'font-size: 11px;' }
    });
    if (renderIconFn) renderIconFn(btnAnotar, 'pencil', { size: 11 });
    btnAnotar.createEl('span', { text: 'O que aprendi?' });

    const btnFlashcard = quickLogRow.createEl('button', {
      cls: 'snoopy-btn-action snoopy-btn-sm snoopy-btn-block',
      attr: { style: 'font-size: 11px;' }
    });
    if (renderIconFn) renderIconFn(btnFlashcard, 'brain', { size: 11 });
    btnFlashcard.createEl('span', { text: '+ Flashcard' });

    // --- LADO DIREITO: HISTÓRICO & JARDIM EXPANDIDO (PREVIEW HUB) ---
    const historyBox = topGrid.createEl('div', { cls: 'snoopy-card-box' });

    let historyHeaderEls = null;
    if (ctx.UIKit && typeof ctx.UIKit.criarCardHeader === 'function') {
      historyHeaderEls = ctx.UIKit.criarCardHeader(historyBox, {
        title: 'JARDIM DE CONSTÂNCIA',
        icon: 'sprout',
        subtitle: 'Histórico e ciclos acumulados'
      });
      const headerActions = historyHeaderEls.actionsBox;
      headerActions.createEl('div', {
        cls: 'snoopy-moedas-badge',
        attr: { id: 'snoopy-jardim-moedas', title: 'Ganhe 1 moeda de seiva a cada 5m de foco' },
        text: '🪙 0 (+1/5m)'
      });
      headerActions.createEl('span', {
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
        <div style="display: flex; align-items: center; gap: 8px;">
          <div id="snoopy-jardim-moedas" class="snoopy-moedas-badge" title="Ganhe 1 moeda de seiva a cada 5m de foco">🪙 <span id="snoopy-moedas-val">0</span> <span style="font-size: 9.5px; opacity: 0.75; font-weight: 500; margin-left: 2px;">(+1/5m)</span></div>
          <span id="snoopy-today-stats" class="snoopy-meta" style="color: #86efac; font-weight: bold;">0 ciclos hoje (0 min)</span>
        </div>
      `;
    }

    const plantCard = historyBox.createEl('div', {
      cls: 'snoopy-preview-hub-card',
      attr: { 
        id: 'snoopy-plant-preview-card',
        title: 'Clique para abrir o Santuário Botânico, Bosque e Loja de Árvores'
      }
    });
    plantCard.innerHTML = `
      <div id="snoopy-plant-avatar" class="snoopy-planter-pot" title="Árvore ativa em cultivo"></div>
      <div style="flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 4px;">
        <div style="display: flex; justify-content: space-between; align-items: center; gap: 8px;">
          <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
            <span id="snoopy-stage-title" style="font-size: 13px; font-weight: 700; color: #ffffff; white-space: nowrap;">Brotinho Verdejante</span>
            <span id="snoopy-stage-badge" class="snoopy-micro" style="padding: 1px 6px; border-radius: 4px; background: rgba(255, 255, 255, 0.08); color: #86efac; font-weight: 700; font-size: 10px;">NÍVEL 1</span>
          </div>
          <div id="snoopy-stage-next-chip" class="snoopy-micro" style="color: #a1a1aa; font-size: 10.5px; white-space: nowrap;">
            Próximo: <strong style="color: #86efac;">Plântula</strong> (+1 foco)
          </div>
        </div>
        <div class="snoopy-prog-track" style="height: 4px; width: 100%; border-radius: 2px; margin: 1px 0;">
          <div id="snoopy-plant-bar" class="snoopy-prog-fill" style="width: 0%; background: #4ade80; border-radius: 2px;"></div>
        </div>
        <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 10px; color: #71717a;">
          <div style="display: flex; align-items: center; gap: 6px; white-space: nowrap;">
            <span style="color: #facc15; font-weight: 600;">🪙 +1 a cada 5m</span>
            <span>•</span>
            <span id="snoopy-card-taxa-foco">Ciclo ${focusMin}m = ${Math.max(1, Math.floor(focusMin / 5))} 🪙</span>
          </div>
          <button id="snoopy-btn-open-jardim" class="snoopy-btn-santuario" title="Abrir Santuário Botânico & Loja de Espécies">
            <span class="snoopy-estufa-btn-icon"></span>
            <span>Bosque & Loja</span>
          </button>
        </div>
      </div>
    `;

    const estufaBtnIcon = plantCard.querySelector('.snoopy-estufa-btn-icon');
    if (estufaBtnIcon && renderIconFn) renderIconFn(estufaBtnIcon, 'trees', { size: 12, color: '#86efac' });

    const abrirEstufa = () => {
      if (PomodoroJardim && typeof PomodoroJardim.abrirModalEstufa === 'function') {
        const sessoesHoje = (typeof window !== 'undefined' && Array.isArray(window.__snoopyTodaySessions))
          ? window.__snoopyTodaySessions
          : [];
        PomodoroJardim.abrirModalEstufa(ModalFactory, {
          completedCyclesToday,
          dailyGoal,
          focusMin,
          sessoesHoje,
          renderIcon: ctx.renderIcon,
          JardimStore,
          app,
          onAtualizar: async () => {
            await atualizarTelasJardim();
          }
        });
      }
    };

    const plantAvatarEl = plantCard.querySelector('#snoopy-plant-avatar');
    const btnOpenJardim = plantCard.querySelector('#snoopy-btn-open-jardim');
    const moedasBadgeEl = historyBox.querySelector('#snoopy-jardim-moedas');
    if (plantAvatarEl) plantAvatarEl.onclick = abrirEstufa;
    if (btnOpenJardim) btnOpenJardim.onclick = abrirEstufa;
    if (plantCard) {
      plantCard.onclick = (e) => {
        if (e.target !== btnOpenJardim && !btnOpenJardim?.contains(e.target)) {
          abrirEstufa();
        }
      };
    }
    if (moedasBadgeEl) moedasBadgeEl.onclick = abrirEstufa;

    const historySplit = historyBox.createEl('div', { attr: { style: 'padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.08);' } });
    historySplit.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
        <div style="display: flex; align-items: baseline; gap: 6px;">
          <span class="snoopy-sub-title" style="font-size: 11px;">HISTÓRICO 30 DIAS</span>
          <span class="snoopy-micro" style="color: #71717a;">(<strong id="metric-total" style="color: #e4e4e7; font-weight: 700;">0 ciclos</strong> total)</span>
        </div>
        <div class="snoopy-micro" style="display: flex; align-items: center; gap: 4px; color: #a1a1aa;">
          <span>0</span>
          <div class="snoopy-heat-cell heat-lvl-0" style="width: 10px; height: 10px; border-radius: 2px;"></div>
          <div class="snoopy-heat-cell heat-lvl-2" style="width: 10px; height: 10px; border-radius: 2px;"></div>
          <div class="snoopy-heat-cell heat-lvl-4" style="width: 10px; height: 10px; border-radius: 2px;"></div>
          <span>4+</span>
        </div>
      </div>
    `;

    const gridMetricsRow = historySplit.createEl('div', {
      attr: { style: 'display: grid; grid-template-columns: auto 1fr; gap: 14px; align-items: stretch;' }
    });

    const heatScroll = gridMetricsRow.createEl('div', { attr: { style: 'padding: 0;' } });
    heatScroll.createEl('div', { cls: 'snoopy-heat-grid' });

    const metricsSide = gridMetricsRow.createEl('div', {
      cls: 'snoopy-meta',
      attr: { style: 'background: #14141c; border: 1px solid rgba(255,255,255,0.08); border-radius: 8px; padding: 6px 12px; display: flex; flex-direction: column; justify-content: space-between; height: 66px; box-sizing: border-box;' }
    });
    metricsSide.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="color: #a1a1aa; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em;">Na Semana:</span>
        <span id="metric-week" style="font-weight: 800; color: #ffffff; font-size: 12.5px;">0m</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 2px; border-top: 1px solid rgba(255,255,255,0.05);">
        <span style="color: #a1a1aa; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em;">Maior Foco:</span>
        <span id="metric-peak" style="font-weight: 800; color: #ffffff; font-size: 12.5px;">0m</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 2px; border-top: 1px solid rgba(255,255,255,0.05);">
        <span style="color: #a1a1aa; font-size: 10.5px; text-transform: uppercase; letter-spacing: 0.04em;">Sequência:</span>
        <span id="metric-streak" style="font-weight: 800; color: #86efac; font-size: 12.5px;">0 dias</span>
      </div>
    `;

    const heatInspectBox = historySplit.createEl('div', {
      cls: 'snoopy-heat-inspection',
      attr: { id: 'snoopy-heat-inspection' }
    });
    heatInspectBox.textContent = 'Clique em uma data para inspecionar constância';

    // --- INSTANCIAÇÃO DOS SUBMÓDULOS E BINDINGS ---
    const circleBar = pomoBox.querySelector('#snoopy-circle-bar');
    const timerDisplay = pomoBox.querySelector('#snoopy-timer-display');
    const cycleLabel = pomoBox.querySelector('#snoopy-cycle-label');
    const modeBadge = pomoBox.querySelector('#snoopy-mode-badge');
    const targetNameEl = targetBanner.querySelector('#snoopy-target-name');
    const playlistCountEl = playlistWrap.querySelector('#snoopy-playlist-count');
    const playlistClearBtn = playlistWrap.querySelector('#snoopy-playlist-clear');
    const playlistAddBtn = playlistWrap.querySelector('#snoopy-playlist-btn-add');

    function abrirModalAdicionarFila() {
      if (ModalFactory && typeof ModalFactory.abrir === 'function') {
        ModalFactory.abrir({
          maxWidth: '440px',
          htmlContent: `
            <div class="snoopy-card-header">
              <span class="snoopy-section-title">Adicionar Tarefa na Fila do Pomodoro</span>
              <button class="snoopy-modal-close" title="Fechar"></button>
            </div>
            <div class="snoopy-modal-label">O que você deseja focar a seguir?</div>
            <input id="modal-fila-input" class="snoopy-form-input" type="text" placeholder="Ex: Ler capítulo 3, Refatorar módulo..." style="width: 100%; margin-bottom: 12px;">
            <div class="snoopy-modal-label">Estimativa de Ciclos Pomodoro:</div>
            <div class="snoopy-toolbar" style="margin-bottom: 16px;">
              <button class="snoopy-btn-mode active" data-pomos="1">1 ciclo (25m)</button>
              <button class="snoopy-btn-mode" data-pomos="2">2 ciclos (50m)</button>
              <button class="snoopy-btn-mode" data-pomos="3">3 ciclos (75m)</button>
              <button class="snoopy-btn-mode" data-pomos="4">4 ciclos (100m)</button>
            </div>
            <div class="snoopy-toolbar" style="justify-content: flex-end;">
              <button id="modal-fila-confirmar" class="snoopy-btn-primary snoopy-btn-md">Adicionar à Fila</button>
            </div>
          `,
          onMontar: (box, fechar) => {
            let pomosEscolhidos = 1;
            const btnsPomos = box.querySelectorAll('.snoopy-btn-mode');
            btnsPomos.forEach(b => {
              b.onclick = () => {
                btnsPomos.forEach(x => x.classList.remove('active'));
                b.classList.add('active');
                pomosEscolhidos = Number(b.dataset.pomos) || 1;
              };
            });

            const inp = box.querySelector('#modal-fila-input');
            const btnConf = box.querySelector('#modal-fila-confirmar');
            if (inp) inp.focus();

            const salvar = () => {
              const texto = inp ? inp.value.trim() : '';
              if (texto && playlist) {
                playlist.adicionarFaixa({ titulo: texto, pomosTotal: pomosEscolhidos });
                if (playlist.obterTamanho() === 1) definirAlvoFoco(playlist.obterFaixaAtual());
                renderizarPlaylistVisual();
                if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Adicionado à fila: "${texto}" (${pomosEscolhidos}p)`);
                fechar();
              }
            };

            if (btnConf) btnConf.onclick = salvar;
            if (inp) inp.onkeydown = (e) => { if (e.key === 'Enter') salvar(); };
          }
        });
      }
    }

    // Inicialização da Playlist
    const playlist = PomodoroPlaylistClass ? new PomodoroPlaylistClass() : null;
    if (playlist && typeof window !== 'undefined' && window.__snoopyPomodoroPlaylist) {
      playlist.deserializar(window.__snoopyPomodoroPlaylist);
    }

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

    const atualizarTelasJardim = async () => {
      if (PomodoroJardim) {
        const sessoesHoje = (typeof window !== 'undefined' && Array.isArray(window.__snoopyTodaySessions))
          ? window.__snoopyTodaySessions
          : [];

        let storeData = null;
        if (JardimStore && typeof JardimStore.carregar === 'function' && app) {
          try {
            storeData = await JardimStore.carregar(app);
            const moedasValEl = historyBox.querySelector('#snoopy-moedas-val');
            const moedasBoxEl = historyBox.querySelector('#snoopy-jardim-moedas');
            if (moedasValEl) moedasValEl.textContent = String(storeData.moedas || 0);
            else if (moedasBoxEl) moedasBoxEl.textContent = `${storeData.moedas || 0} 🪙`;
          } catch (e) {
            console.warn('[Pomodoro Cockpit] Erro ao carregar moedas:', e);
          }
        }

        PomodoroJardim.atualizarVisualPlanta(historyBox, {
          completedCyclesToday,
          dailyGoal,
          focusMin,
          sessoesHoje,
          renderIcon: ctx.renderIcon,
          arvoreAtiva: storeData ? storeData.arvoreAtiva : 'sprout'
        });
        PomodoroJardim.renderizarHeatmap(historyBox, {
          mapaFoco,
          todayStr,
          focusMin,
          dailyGoal,
          now
        });
      }
    };

    // Renderizador da Playlist Visual (Spotify Vibe)
    const renderizarPlaylistVisual = () => {
      if (!playlist || !playlistTracksBox) return;
      playlistTracksBox.innerHTML = '';
      const total = playlist.obterTamanho();
      if (playlistCountEl) playlistCountEl.textContent = `${total} ${total === 1 ? 'faixa' : 'faixas'}`;

      if (total === 0) {
        playlistTracksBox.innerHTML = `
          <div class="snoopy-meta" style="color: #71717a; font-size: 11px; text-align: center; padding: 8px 4px;">
            Nenhuma tarefa na fila. Clique no ícone de fila nas tarefas ou use <code>&gt; fila add</code>.
          </div>
        `;
        return;
      }

      playlist.tracks.forEach((track, idx) => {
        const isAtiva = (idx === playlist.currentIndex);
        const trackEl = playlistTracksBox.createEl('div', {
          cls: `snoopy-playlist-track ${isAtiva ? 'active' : ''}`
        });

        const leftCol = trackEl.createEl('div', {
          attr: { style: 'display: flex; align-items: center; gap: 7px; overflow: hidden; flex: 1;' }
        });

        const numSpan = leftCol.createEl('span', {
          attr: { style: `font-size: 10px; font-weight: 700; width: 14px; text-align: center; color: ${isAtiva ? '#93c5fd' : '#71717a'};` }
        });
        if (isAtiva && renderIconFn) {
          renderIconFn(numSpan, 'play', { size: 10, color: '#93c5fd' });
        } else {
          numSpan.textContent = String(idx + 1);
        }

        const titleSpan = leftCol.createEl('span', {
          text: track.titulo,
          attr: { style: 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' }
        });

        const rightCol = trackEl.createEl('div', {
          attr: { style: 'display: flex; align-items: center; gap: 6px; flex-shrink: 0;' }
        });

        const pomoBadge = rightCol.createEl('span', {
          cls: 'snoopy-micro',
          attr: { style: `padding: 1px 4px; border-radius: 3px; font-size: 9.5px; background: ${isAtiva ? 'rgba(147, 197, 253, 0.2)' : 'rgba(255, 255, 255, 0.05)'}; color: ${isAtiva ? '#bfdbfe' : '#a1a1aa'};` },
          text: `${track.pomosConcluidos}/${track.pomosTotal}p`
        });

        const delBtn = rightCol.createEl('button', {
          cls: 'snoopy-playlist-track-del',
          text: '✕',
          attr: { title: 'Remover da fila' }
        });

        delBtn.onclick = (e) => {
          e.stopPropagation();
          playlist.removerFaixa(track.id);
          renderizarPlaylistVisual();
        };

        trackEl.onclick = () => {
          playlist.selecionarFaixa(idx);
          const selecionada = playlist.obterFaixaAtual();
          if (selecionada) definirAlvoFoco(selecionada);
          renderizarPlaylistVisual();
        };
      });

      // Salva estado da playlist
      if (typeof window !== 'undefined') {
        window.__snoopyPomodoroPlaylist = playlist.serializar();
      }
    };

    if (playlist) {
      playlist.onChange = () => renderizarPlaylistVisual();
      if (playlistClearBtn) {
        playlistClearBtn.onclick = () => {
          playlist.limpar();
          renderizarPlaylistVisual();
        };
      }
      if (playlistAddBtn) {
        playlistAddBtn.onclick = abrirModalAdicionarFila;
      }
    }

    const finalizarFoco = async () => {
      completedCyclesToday++;
      mapaFoco[todayStr] = completedCyclesToday;

      const agora = new Date();
      const pad = (n) => String(n).padStart(2, '0');
      const horaStr = `${pad(agora.getHours())}:${pad(agora.getMinutes())}`;
      const faixaAtual = playlist && playlist.obterFaixaAtual ? playlist.obterFaixaAtual() : null;
      const tituloSessao = faixaAtual ? faixaAtual.titulo : 'Foco Livre';

      if (typeof window !== 'undefined') {
        window.__snoopyTodaySessions = window.__snoopyTodaySessions || [];
        window.__snoopyTodaySessions.push({
          titulo: tituloSessao,
          hora: horaStr,
          min: focusMin
        });
      }

      if (modalManager) {
        await modalManager.salvarPomodoroNaNotaDiaria(completedCyclesToday);
        await modalManager.sincronizarComCicloEstudos(focusMin);
      }

      if (JardimStore && typeof JardimStore.creditarFoco === 'function' && app) {
        try {
          const resEconomia = await JardimStore.creditarFoco(app, focusMin);
          if (resEconomia && typeof Notice !== 'undefined') {
            new Notice(`🪙 +${resEconomia.moedasGanhas} Moedas de Seiva ganhas! (Saldo: ${resEconomia.moedas} 🪙)`);
          }
        } catch (e) {
          console.warn('[Pomodoro Cockpit] Erro ao creditar moedas:', e);
        }
      }

      await atualizarTelasJardim();

      // Atualiza progresso da faixa na playlist
      if (playlist && playlist.obterFaixaAtual()) {
        const { atingiuTotal, faixa } = playlist.concluirCicloNaFaixaAtual();
        if (atingiuTotal && typeof Notice !== 'undefined') {
          new Notice(`[Snoopy Playlist] Meta de ciclos concluída para: "${faixa?.titulo}"!`);
        }
        renderizarPlaylistVisual();
      }

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
        if (btnMainPlay) btnMainPlay.click();
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

    if (btnImersivo) {
      btnImersivo.onclick = (e) => {
        e.preventDefault();
        ativarModoImersivo();
      };
    }

    if (ctx.Lifecycle) {
      ctx.Lifecycle.onDispose('home', fecharModoImersivo);
    }

    // Recupera estado preservado do Pomodoro
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
          // Automação: transita para Pausa automaticamente
          if (timer) {
            timer.setMode('pausa');
            timer.start();
          }
        } else {
          // Pausa concluída: avança para a próxima faixa e volta para Foco
          if (typeof Notice !== 'undefined') new Notice('[Snoopy] Pausa concluída! Iniciando próximo ciclo.');
          if (playlist) {
            const proxFaixa = playlist.obterFaixaAtual();
            if (proxFaixa) definirAlvoFoco(proxFaixa);
          }
          if (timer) {
            timer.setMode('foco');
            timer.start();
          }
        }
      },
      onModeChange: ({ mode }) => {
        const isFoco = mode === 'foco';
        if (circleBar) {
          circleBar.style.stroke = isFoco ? '#4ade80' : '#60a5fa';
          if (typeof circleBar.classList?.toggle === 'function') {
            circleBar.classList.toggle('is-break', !isFoco);
          }
        }
        if (cycleLabel) {
          cycleLabel.textContent = isFoco ? `Ciclo ${completedCyclesToday + 1} de ${dailyGoal}` : 'PAUSA';
          cycleLabel.style.color = isFoco ? '#86efac' : '#93c5fd';
        }
        if (modeBadge) {
          modeBadge.textContent = isFoco ? 'FOCO ATIVO' : 'PAUSA ATIVA';
          modeBadge.style.color = isFoco ? '#86efac' : '#93c5fd';
          modeBadge.style.background = isFoco ? 'rgba(74, 222, 128, 0.15)' : 'rgba(96, 165, 250, 0.15)';
        }
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
        if (!btnMainPlay) return;
        btnMainPlay.innerHTML = '';
        const iconName = isRunning ? 'pause' : 'play';
        if (renderIconFn) renderIconFn(btnMainPlay, iconName, { size: 16, color: '#070709' });
      }
    }) : null;

    // Prevenção estrita de timers fantasmas concorrentes
    if (typeof window !== 'undefined' && timer) {
      if (window.__snoopyActiveTimerInstance && typeof window.__snoopyActiveTimerInstance.destroy === 'function') {
        window.__snoopyActiveTimerInstance.destroy();
      }
      window.__snoopyActiveTimerInstance = timer;
    }

    // Hidrata visual inicial
    if (timer) {
      const isFoco = timer.currentMode === 'foco';
      if (circleBar) {
        circleBar.style.stroke = isFoco ? '#4ade80' : '#60a5fa';
        if (typeof circleBar.classList?.toggle === 'function') {
          circleBar.classList.toggle('is-break', !isFoco);
        }
      }
      if (cycleLabel) {
        cycleLabel.textContent = isFoco ? `Ciclo ${completedCyclesToday + 1} de ${dailyGoal}` : 'PAUSA';
        cycleLabel.style.color = isFoco ? '#86efac' : '#93c5fd';
      }
      const initStr = timer.formatarTempo(timer.remainingSeconds);
      if (timerDisplay) timerDisplay.textContent = initStr;
      const initOffset = timer.calcularStrokeOffset(timer.remainingSeconds, timer.totalSeconds);
      if (circleBar) circleBar.style.strokeDashoffset = initOffset;

      if (globalState && globalState.isRunning && globalState.endAt) {
        if (globalState.endAt > Date.now()) {
          timer.start();
        } else {
          // Tempo finalizado durante estado inativo / segundo plano
          timer.remainingSeconds = 0;
          timer.onTick({ remaining: 0, total: timer.totalSeconds, timeStr: '00:00', offset: 0 });
          timer.onComplete({ mode: timer.currentMode, alvo: timer.alvoAtual });
        }
      }
    }

    // Alvo direcionado
    const definirAlvoFoco = (dados) => {
      if (!dados) return;
      if (timer) timer.setAlvo(dados);
      if (targetBanner && targetNameEl) {
        targetBanner.style.display = 'flex';
        targetNameEl.textContent = dados.texto || dados.titulo || '-';
        pomoBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pomoBox.style.borderColor = 'rgba(134, 239, 172, 0.4)';
        setTimeout(() => { pomoBox.style.borderColor = ''; }, 2000);
        if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Pomodoro apontado para: ${dados.texto || dados.titulo}`);
      }
    };

    if (initialAlvo && targetBanner && targetNameEl) {
      targetBanner.style.display = 'flex';
      targetNameEl.textContent = initialAlvo.texto || initialAlvo.titulo || '-';
    }

    // Ouvintes de Eventos (EventBus)
    if (events) {
      const cancelPomoFoco = events.on('pomodoro:foco', definirAlvoFoco);
      const cancelPomoFila = events.on('pomodoro:enfileirar', (dados) => {
        if (playlist) {
          playlist.adicionarFaixa(dados);
          if (playlist.obterTamanho() === 1) {
            definirAlvoFoco(playlist.obterFaixaAtual());
          }
          if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Adicionado à fila: "${dados.titulo || dados.texto}"`);
        }
      });
      const cancelPomoCmd = events.on('pomodoro:comando', ({ acao }) => {
        if (!timer) return;
        if (acao === 'start' || acao === 'play') timer.start();
        else if (acao === 'pause') timer.pause();
        else if (acao === 'reset') timer.reset();
        else if (acao === 'proximo' || acao === 'skip') {
          if (playlist) {
            const prox = playlist.avancar();
            if (prox) definirAlvoFoco(prox);
          }
          timer.reset();
        }
      });

      if (ctx.Lifecycle) {
        ctx.Lifecycle.onDispose('home', cancelPomoFoco);
        ctx.Lifecycle.onDispose('home', cancelPomoFila);
        ctx.Lifecycle.onDispose('home', cancelPomoCmd);
      }
    }

    if (ctx.Lifecycle && timer) {
      ctx.Lifecycle.onDispose('home', () => {
        timer.destroy();
        if (typeof window !== 'undefined' && window.__snoopyActiveTimerInstance === timer) {
          window.__snoopyActiveTimerInstance = null;
        }
      });
    }

    if (typeof window !== 'undefined') {
      window.snoopySetPomodoroFocus = (titulo) => definirAlvoFoco({ texto: titulo });
      window._snoopyDefinirTarefaFoco = (d) => definirAlvoFoco(d);
      window._snoopyAdicionarFilaPomodoro = (d) => {
        if (playlist) {
          playlist.adicionarFaixa(d);
          if (playlist.obterTamanho() === 1) definirAlvoFoco(playlist.obterFaixaAtual());
        }
      };
    }

    const btnTargetClear = targetBanner.querySelector('#snoopy-btn-target-clear');
    if (btnTargetClear) {
      btnTargetClear.onclick = (e) => {
        e.preventDefault();
        if (timer) timer.setAlvo(null);
        targetBanner.style.display = 'none';
        if (targetNameEl) targetNameEl.textContent = '-';
        if (typeof Notice !== 'undefined') new Notice('[Snoopy] Alvo de foco liberado.');
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
        if (playlist) {
          playlist.concluirCicloNaFaixaAtual();
          const prox = playlist.obterFaixaAtual();
          if (prox) definirAlvoFoco(prox);
          renderizarPlaylistVisual();
        }
        if (timer) timer.setAlvo(null);
        if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Concluído: "${nomeAtual}"!`);
      };
    }

    // Configurações de Foco/Pausa
    const cfgFocusInput = pomoBox.querySelector('#cfg-focus');
    const cfgBreakInput = pomoBox.querySelector('#cfg-break');
    const atualizarTempos = () => {
      focusMin = parseInt(cfgFocusInput.value) || 25;
      breakMin = parseInt(cfgBreakInput.value) || 5;
      if (timer) timer.setTempos(focusMin, breakMin);
      const taxaEl = historyBox.querySelector('#snoopy-card-taxa-foco');
      if (taxaEl) taxaEl.textContent = `Ciclo ${focusMin}m = ${Math.max(1, Math.floor(focusMin / 5))} 🪙`;
    };

    if (cfgFocusInput) cfgFocusInput.onchange = atualizarTempos;
    if (cfgBreakInput) cfgBreakInput.onchange = atualizarTempos;

    // Ações do Player Dock
    if (btnMainPlay) btnMainPlay.onclick = () => { if (timer) timer.toggle(); };
    if (btnReset) btnReset.onclick = () => { if (timer) timer.reset(); };
    if (btnPrev) btnPrev.onclick = () => {
      if (playlist) {
        const ant = playlist.retroceder();
        if (ant) definirAlvoFoco(ant);
        renderizarPlaylistVisual();
      }
      if (timer) timer.reset();
    };
    if (btnNext) btnNext.onclick = () => {
      if (playlist) {
        const prox = playlist.avancar();
        if (prox) definirAlvoFoco(prox);
        renderizarPlaylistVisual();
      }
      if (timer) timer.reset();
    };
    if (btnToggleMode) btnToggleMode.onclick = () => {
      if (timer) {
        const novoModo = timer.currentMode === 'foco' ? 'pausa' : 'foco';
        timer.setMode(novoModo);
      }
    };
    if (btnTestar) btnTestar.onclick = finalizarFoco;
    if (btnAnotar && modalManager) btnAnotar.onclick = () => modalManager.abrirModalAnotacao(false);
    if (btnFlashcard && modalManager) btnFlashcard.onclick = () => modalManager.abrirModalAnotacao(true);

    // Inicialização Visual
    if (timer) timer._notificarTick();
    atualizarTelasJardim();
    renderizarPlaylistVisual();
  }
};
