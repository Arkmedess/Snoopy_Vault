/**
 * Snoopy Vault - Módulo 02: Cockpit de Foco Pomodoro & Histórico de Constância
 * Renderiza o temporizador circular SVG, jardim de evolução botânica e heatmap de 30 dias reais.
 */
return {
  id: 'snoopy_cockpit_pomodoro',
  titulo: 'Pomodoro Cockpit & Histórico',
  async render(ctx) {
    const { root, app, now, padTime, todayStr, dailyPath, garantirNotaDiaria, mapaFoco } = ctx;

    let completedCyclesToday = ctx.completedCyclesToday || 0;

    // 3. SEÇÃO TOPO: POMODORO COCKPIT & HISTÓRICO COM MÉTRICAS LATERAIS
    const topGrid = root.createEl('div', { cls: 'abyssal-top-grid' });

    // --- LADO ESQUERDO: POMODORO COCKPIT ---
    const pomoBox = topGrid.createEl('div', { cls: 'abyssal-card-box' });

    let focusMin = (ctx.config && ctx.config.tempo_foco) ? Number(ctx.config.tempo_foco) : 25;
    let breakMin = (ctx.config && ctx.config.tempo_pausa_curta) ? Number(ctx.config.tempo_pausa_curta) : 5;
    let dailyGoal = (ctx.config && ctx.config.meta_ciclos_diarios) ? Number(ctx.config.meta_ciclos_diarios) : 4;

    const pomoHeader = pomoBox.createEl('div', { 
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.06);' } 
    });
    pomoHeader.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="abyssal-section-title">POMODORO FOCUS COCKPIT</span>
        <span id="abyssal-mode-badge" style="font-size: 11px; font-family: monospace; font-weight: bold; padding: 2px 7px; border-radius: 4px; background: rgba(74, 222, 128, 0.15); color: #86efac;">FOCO ATIVO</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px; font-size: 12px; font-family: monospace;">
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

    // Banner Reativo de Foco Selecionado (Conectado à Central de Tarefas)
    const targetBanner = pomoBox.createEl('div', {
      cls: 'snoopy-pomodoro-target',
      attr: {
        id: 'snoopy-pomodoro-target-box',
        style: 'display: none; background: #14141e; border: 1px solid rgba(134, 239, 172, 0.25); border-radius: 6px; padding: 7px 11px; justify-content: space-between; align-items: center; margin: 8px 0 4px 0;'
      }
    });

    targetBanner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
        <span style="font-size: 14px;">🎯</span>
        <div style="overflow: hidden;">
          <div style="font-size: 9.5px; font-weight: 700; color: #86efac; letter-spacing: 0.05em; font-family: monospace;">FOCO SELECIONADO:</div>
          <div id="snoopy-target-name" style="font-size: 12px; font-weight: 700; color: #ffffff; white-space: nowrap; text-overflow: ellipsis; overflow: hidden;">-</div>
        </div>
      </div>
      <div style="display: flex; gap: 5px; flex-shrink: 0;">
        <button id="snoopy-btn-target-done" class="abyssal-btn-action" style="padding: 2px 7px; font-size: 10.5px; color: #86efac;">✓ Feito</button>
        <button id="snoopy-btn-target-clear" class="abyssal-btn-action" style="padding: 2px 5px; font-size: 10.5px; color: #a1a1aa;">✕</button>
      </div>
    `;

    const targetNameEl = targetBanner.querySelector('#snoopy-target-name');
    const btnTargetDone = targetBanner.querySelector('#snoopy-btn-target-done');
    const btnTargetClear = targetBanner.querySelector('#snoopy-btn-target-clear');

    if (btnTargetClear) {
      btnTargetClear.addEventListener('click', (e) => {
        e.preventDefault();
        targetBanner.style.display = 'none';
        if (targetNameEl) targetNameEl.textContent = '-';
        new Notice('Alvo de foco liberado.');
      });
    }

    if (btnTargetDone) {
      btnTargetDone.addEventListener('click', (e) => {
        e.preventDefault();
        const nomeAtual = targetNameEl ? targetNameEl.textContent : '';
        targetBanner.style.display = 'none';
        new Notice(`✓ Concluído: "${nomeAtual}"!`);
      });
    }

    window.snoopySetPomodoroFocus = function(titulo, tag) {
      if (targetBanner && targetNameEl) {
        targetBanner.style.display = 'flex';
        targetNameEl.textContent = titulo;
        pomoBox.scrollIntoView({ behavior: 'smooth', block: 'center' });
        pomoBox.style.boxShadow = '0 0 20px rgba(134, 239, 172, 0.25)';
        setTimeout(() => { pomoBox.style.boxShadow = '0 4px 20px rgba(0, 0, 0, 0.4)'; }, 2000);
        new Notice(`🎯 Pomodoro apontado para: ${titulo}`);
      }
    };

    // Centro do Pomodoro: Anel SVG + Controles Agrupados
    const pomoCenter = pomoBox.createEl('div', { 
      attr: { style: 'display: grid; grid-template-columns: 5fr 7fr; gap: 20px; align-items: center; padding: 14px 0;' } 
    });

    const ringWrapper = pomoCenter.createEl('div', { attr: { style: 'display: flex; justify-content: center;' } });
    const svgBox = ringWrapper.createEl('div', { attr: { style: 'position: relative; width: 170px; height: 170px; display: flex; align-items: center; justify-content: center;' } });
    svgBox.innerHTML = `
      <svg style="width: 170px; height: 170px;" viewBox="0 0 170 170">
        <circle class="circle-progress-bg" cx="85" cy="85" r="74" fill="none" stroke-width="7" />
        <circle id="abyssal-circle-bar" class="circle-progress-bar" cx="85" cy="85" r="74" fill="none" stroke-width="7" stroke-dasharray="464.96" stroke-dashoffset="0" />
      </svg>
      <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; user-select: none;">
        <span id="abyssal-timer-display" style="font-family: monospace; font-size: 34px; font-weight: 800; color: #ffffff; letter-spacing: 0.06em; line-height: 1;">${String(focusMin).padStart(2, '0')}:00</span>
        <span id="abyssal-cycle-label" style="font-family: monospace; font-size: 13px; font-weight: bold; color: #86efac; margin-top: 6px;">Ciclo 1 de ${dailyGoal}</span>
      </div>
    `;

    const controlsCol = pomoCenter.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 12px;' } });

    // Bloco 1: Controle
    const ctrlBlock1 = controlsCol.createEl('div');
    ctrlBlock1.innerHTML = '<div class="abyssal-sub-title" style="margin-bottom: 6px;">Controle do Timer</div>';
    const btnsRow1 = ctrlBlock1.createEl('div', { attr: { style: 'display: flex; gap: 8px;' } });
    const startBtn = btnsRow1.createEl('button', { cls: 'abyssal-btn-primary', attr: { style: 'flex: 1;' }, text: '▶ Iniciar Foco' });
    const resetBtn = btnsRow1.createEl('button', { cls: 'abyssal-btn-action', text: '↺ Reset' });

    // Bloco 2: Alternar Modo
    const ctrlBlock2 = controlsCol.createEl('div');
    ctrlBlock2.innerHTML = '<div class="abyssal-sub-title" style="margin-bottom: 6px;">Alternar Modo</div>';
    const btnsRow2 = ctrlBlock2.createEl('div', { attr: { style: 'display: flex; gap: 6px;' } });
    const btnModeFoco = btnsRow2.createEl('button', { cls: 'abyssal-btn-mode active', attr: { style: 'flex: 1;' }, text: `Foco (${focusMin}m)` });
    const btnModePausa = btnsRow2.createEl('button', { cls: 'abyssal-btn-mode', attr: { style: 'flex: 1;' }, text: `Pausa (${breakMin}m)` });
    const btnTestar = btnsRow2.createEl('button', { cls: 'abyssal-btn-mode', attr: { style: 'color: #ffffff;' }, text: '⚡ Testar' });

    // Bloco 3: Captura na Nota Diária
    const ctrlBlock3 = controlsCol.createEl('div');
    ctrlBlock3.innerHTML = '<div class="abyssal-sub-title" style="margin-bottom: 6px;">Registro na Nota Diária</div>';
    const btnsRow3 = ctrlBlock3.createEl('div', { attr: { style: 'display: flex; gap: 8px;' } });
    const btnAnotar = btnsRow3.createEl('button', { cls: 'abyssal-btn-action', attr: { style: 'flex: 1; color: #ffffff;' }, text: '📝 O que aprendi?' });
    const btnFlashcard = btnsRow3.createEl('button', { cls: 'abyssal-btn-action', attr: { style: 'flex: 1; color: #ffffff;' }, text: '🧠 + Flashcard' });

    // Rodapé Cockpit: Sincronização e Status
    const pomoFooter = pomoBox.createEl('div', { 
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-family: monospace; color: #71717a; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);' } 
    });
    pomoFooter.innerHTML = `
      <span style="color: #71717a;">Ciclo automático com nota diária</span>
      <span style="color: #86efac; font-weight: 600;">Sincronizado</span>
    `;

    // --- LADO DIREITO: HISTÓRICO & JARDIM EXPANDIDO ---
    const historyBox = topGrid.createEl('div', { cls: 'abyssal-card-box' });

    const historyHeader = historyBox.createEl('div', { 
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.06);' } 
    });
    historyHeader.innerHTML = `
      <span class="abyssal-section-title">HISTÓRICO & CONSTÂNCIA DE FOCO</span>
      <span id="abyssal-today-stats" style="font-size: 12.5px; font-family: monospace; color: #86efac; font-weight: bold;">0 ciclos hoje (0 min)</span>
    `;

    const plantCard = historyBox.createEl('div', { 
      attr: { style: 'display: flex; align-items: center; gap: 14px; padding: 12px 14px; background: #13131c; border-radius: 8px; border: 1px solid rgba(255,255,255,0.05); margin: 6px 0;' } 
    });
    plantCard.innerHTML = `
      <div id="abyssal-plant-avatar" style="width: 56px; height: 56px; border-radius: 50%; background: #181824; border: 1px solid rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center; font-size: 30px; flex-shrink: 0; user-select: none;">🌱</div>
      <div style="flex: 1; overflow: hidden;">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span id="abyssal-stage-title" style="font-size: 14px; font-weight: 700; color: #ffffff;">Semente Plantada</span>
          <span id="abyssal-stage-badge" style="font-size: 11px; font-family: monospace; padding: 2px 7px; border-radius: 4px; background: rgba(74, 222, 128, 0.15); color: #86efac; font-weight: bold;">NÍVEL 1</span>
        </div>
        <div id="abyssal-stage-desc" style="font-size: 11.5px; font-family: monospace; color: #a1a1aa; margin-top: 3px;">Inicie seu primeiro foco para germinar a plantinha.</div>
        <div class="abyssal-prog-track" style="height: 7px; width: 100%; margin-top: 7px;">
          <div id="abyssal-plant-bar" class="abyssal-prog-fill" style="width: 0%; background: #4ade80;"></div>
        </div>
      </div>
    `;

    const historySplit = historyBox.createEl('div', { attr: { style: 'padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06);' } });
    historySplit.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
        <span class="abyssal-sub-title">CICLOS DE POMODORO (ÚLTIMOS 30 DIAS)</span>
        <div style="display: flex; align-items: center; gap: 4px; font-size: 11px; font-family: monospace; color: #a1a1aa;">
          <span>0</span>
          <div class="abyssal-heat-cell heat-lvl-0"></div>
          <div class="abyssal-heat-cell heat-lvl-2"></div>
          <div class="abyssal-heat-cell heat-lvl-4"></div>
          <span>4+</span>
        </div>
      </div>
    `;

    const gridMetricsRow = historySplit.createEl('div', { 
      attr: { style: 'display: grid; grid-template-columns: auto 1fr; gap: 18px; align-items: center;' } 
    });

    const heatScroll = gridMetricsRow.createEl('div', { attr: { style: 'padding: 2px 0;' } });
    const pomoHeatGrid = heatScroll.createEl('div', { cls: 'abyssal-heat-grid' });

    const metricsSide = gridMetricsRow.createEl('div', { 
      attr: { style: 'background: #14141c; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 9px; font-family: monospace;' } 
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
      attr: { style: 'display: flex; justify-content: space-between; font-size: 11px; font-family: monospace; color: #71717a; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 8px;' } 
    });
    historyFooter.innerHTML = `<span>Total Histórico: <strong id="metric-total" style="color: #e4e4e7;">0 ciclos</strong></span><span style="color: #ffffff; font-weight: 600;">Constância Ativa</span>`;

    // --- LÓGICA DO POMODORO, PLANTINHA E ANOTAÇÕES ---
    const CIRCLE_CIRCUMFERENCE = 464.96;
    let currentMode = 'foco';
    let totalSeconds = focusMin * 60;
    let remainingSeconds = focusMin * 60;
    let timerInterval = null;

    const circleBar = root.querySelector('#abyssal-circle-bar');
    const timerDisplay = root.querySelector('#abyssal-timer-display');
    const modeBadge = root.querySelector('#abyssal-mode-badge');
    const cfgFocusInput = root.querySelector('#cfg-focus');
    const cfgBreakInput = root.querySelector('#cfg-break');

    function alterarTempos() {
      if (cfgFocusInput) focusMin = parseInt(cfgFocusInput.value) || 25;
      if (cfgBreakInput) breakMin = parseInt(cfgBreakInput.value) || 5;
      if (btnModeFoco) btnModeFoco.textContent = `Foco (${focusMin}m)`;
      if (btnModePausa) btnModePausa.textContent = `Pausa (${breakMin}m)`;
      if (!timerInterval) setMode(currentMode);
    }

    if (cfgFocusInput) cfgFocusInput.addEventListener('change', alterarTempos);
    if (cfgBreakInput) cfgBreakInput.addEventListener('change', alterarTempos);

    function updateCircle() {
      const cBar = root.querySelector('#abyssal-circle-bar') || circleBar;
      const tDisp = root.querySelector('#abyssal-timer-display') || timerDisplay;
      if (!cBar || !tDisp) return;
      const fraction = remainingSeconds / totalSeconds;
      const offset = CIRCLE_CIRCUMFERENCE * (1 - fraction);
      cBar.style.strokeDashoffset = offset;

      const m = Math.floor(remainingSeconds / 60);
      const s = remainingSeconds % 60;
      tDisp.textContent = `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
    }

    function setMode(mode) {
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      currentMode = mode;
      startBtn.textContent = mode === 'foco' ? '▶ Iniciar Foco' : '▶ Iniciar Pausa';

      const cBar = root.querySelector('#abyssal-circle-bar') || circleBar;
      const mBadge = root.querySelector('#abyssal-mode-badge') || modeBadge;

      if (mode === 'foco') {
        totalSeconds = focusMin * 60;
        if (cBar) cBar.style.stroke = '#4ade80';
        if (mBadge) {
          mBadge.textContent = 'FOCO ATIVO';
          mBadge.style.color = '#86efac';
          mBadge.style.background = 'rgba(74, 222, 128, 0.15)';
        }
        btnModeFoco.classList.add('active');
        btnModePausa.classList.remove('active');
      } else {
        totalSeconds = breakMin * 60;
        if (cBar) cBar.style.stroke = '#60a5fa';
        if (mBadge) {
          mBadge.textContent = 'PAUSA ATIVA';
          mBadge.style.color = '#93c5fd';
          mBadge.style.background = 'rgba(96, 165, 250, 0.15)';
        }
        btnModePausa.classList.add('active');
        btnModeFoco.classList.remove('active');
      }
      remainingSeconds = totalSeconds;
      updateCircle();
    }

    if (btnModeFoco) btnModeFoco.addEventListener('click', () => setMode('foco'));
    if (btnModePausa) btnModePausa.addEventListener('click', () => setMode('pausa'));

    function toggleTimer() {
      if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
        if (startBtn) startBtn.textContent = currentMode === 'foco' ? '▶ Continuar Foco' : '▶ Continuar Pausa';
      } else {
        if (startBtn) startBtn.textContent = '⏸ Pausar';
        timerInterval = setInterval(() => {
          if (remainingSeconds > 0) {
            remainingSeconds--;
            updateCircle();
          } else {
            clearInterval(timerInterval);
            timerInterval = null;
            if (startBtn) startBtn.textContent = '▶ Iniciar Foco';
            
            if (currentMode === 'foco') {
              finalizarFocoAutomatico();
            } else {
              new Notice('⏰ Pausa concluída! Hora de focar.');
              setMode('foco');
            }
          }
        }, 1000);
      }
    }

    function resetTimer() {
      if (timerInterval) { clearInterval(timerInterval); timerInterval = null; }
      setMode(currentMode);
    }

    if (startBtn) startBtn.addEventListener('click', toggleTimer);
    if (resetBtn) resetBtn.addEventListener('click', resetTimer);

    // Jardim e Evolução
    const plantStages = [
      { min: 0, icon: "🌱", title: "Semente Plantada", desc: "Inicie seu primeiro foco para germinar a plantinha." },
      { min: 1, icon: "🌿", title: "Broto Crescendo", desc: "1º foco concluído hoje! Suas folhas despontam." },
      { min: 2, icon: "🪴", title: "Muda Fortalecida", desc: "Suas raízes estão firmes. Continue o ritmo!" },
      { min: 3, icon: "🌸", title: "Planta Florindo", desc: "Quase uma árvore completa! Foco exemplar hoje." },
      { min: 4, icon: "🌳", title: "Árvore Majestosa", desc: "Parabéns! Meta de foco diário atingida com sucesso." }
    ];

    function atualizarJardim() {
      let stage = plantStages[0];
      for (let s of plantStages) {
        if (completedCyclesToday >= s.min) stage = s;
      }

      const pAvatar = root.querySelector('#abyssal-plant-avatar');
      const sTitle = root.querySelector('#abyssal-stage-title');
      const sDesc = root.querySelector('#abyssal-stage-desc');
      const sBadge = root.querySelector('#abyssal-stage-badge');
      const pBar = root.querySelector('#abyssal-plant-bar');
      const tStats = root.querySelector('#abyssal-today-stats');
      const cLabel = root.querySelector('#abyssal-cycle-label');

      if (pAvatar) pAvatar.textContent = stage.icon;
      if (sTitle) sTitle.textContent = stage.title;
      if (sDesc) sDesc.textContent = stage.desc;
      if (sBadge) sBadge.textContent = `NÍVEL ${Math.min(completedCyclesToday + 1, 5)}`;
      
      const pct = Math.min(Math.round((completedCyclesToday / dailyGoal) * 100), 100);
      if (pBar) pBar.style.width = pct + '%';
      if (tStats) tStats.textContent = `${completedCyclesToday} ciclos hoje (${completedCyclesToday * focusMin} min)`;
      if (cLabel) cLabel.textContent = `Ciclo ${completedCyclesToday + 1} de ${dailyGoal}`;
    }

    // Métricas Dinâmicas e Histórico de Pomodoros (Últimos 30 Dias)
    function atualizarMetricasLaterais() {
      mapaFoco[todayStr] = completedCyclesToday;

      let pomosSemana = 0;
      for (let i = 0; i < 7; i++) {
        const d = new Date(now.getTime() - i * 86400000);
        const key = `${d.getFullYear()}-${padTime(d.getMonth() + 1)}-${padTime(d.getDate())}`;
        pomosSemana += (mapaFoco[key] || 0);
      }
      const minSemana = pomosSemana * focusMin;
      const hSemana = Math.floor(minSemana / 60);
      const mSemana = minSemana % 60;
      const txtSemana = hSemana > 0 ? `${hSemana}h ${mSemana}m` : `${mSemana}m`;
      const elWeek = root.querySelector('#metric-week');
      if (elWeek) elWeek.textContent = txtSemana;

      let maxPomos = 0;
      let maxData = 'Nenhum';
      for (const [dStr, cnt] of Object.entries(mapaFoco)) {
        if (cnt > maxPomos) {
          maxPomos = cnt;
          maxData = dStr === todayStr ? 'Hoje' : dStr.slice(5).replace('-', '/');
        }
      }
      const txtPeak = maxPomos > 0 ? `${maxData} (${maxPomos * focusMin}m)` : '0m';
      const elPeak = root.querySelector('#metric-peak');
      if (elPeak) elPeak.textContent = txtPeak;

      let streak = 0;
      let checkDate = new Date(now.getTime());
      const hojeTem = (mapaFoco[todayStr] || 0) > 0;
      if (!hojeTem) {
        checkDate = new Date(now.getTime() - 86400000);
      }
      while (true) {
        const key = `${checkDate.getFullYear()}-${padTime(checkDate.getMonth() + 1)}-${padTime(checkDate.getDate())}`;
        if ((mapaFoco[key] || 0) > 0) {
          streak++;
          checkDate = new Date(checkDate.getTime() - 86400000);
        } else {
          break;
        }
      }
      const txtStreak = streak > 0 ? `🔥 ${streak} ${streak === 1 ? 'dia' : 'dias'}` : '0 dias';
      const elStreak = root.querySelector('#metric-streak');
      if (elStreak) elStreak.textContent = txtStreak;

      let totalHistorico = 0;
      for (const cnt of Object.values(mapaFoco)) {
        totalHistorico += cnt;
      }
      const elTotal = root.querySelector('#metric-total');
      if (elTotal) elTotal.textContent = `${totalHistorico} ciclos`;
    }

    function gerarHistoricoPomo() {
      pomoHeatGrid.innerHTML = '';
      const totalDays = 30;
      mapaFoco[todayStr] = completedCyclesToday;
      
      for (let i = 0; i < totalDays; i++) {
        const d = new Date(now.getTime() - (totalDays - 1 - i) * 86400000);
        const dStr = `${d.getFullYear()}-${padTime(d.getMonth() + 1)}-${padTime(d.getDate())}`;
        const count = mapaFoco[dStr] || 0;
        
        const cell = pomoHeatGrid.createEl('div', { cls: 'abyssal-heat-cell' });
        if (count === 0) cell.classList.add('heat-lvl-0');
        else if (count === 1) cell.classList.add('heat-lvl-1');
        else if (count === 2) cell.classList.add('heat-lvl-2');
        else if (count === 3) cell.classList.add('heat-lvl-3');
        else cell.classList.add('heat-lvl-4');
        
        const dFormatado = `${padTime(d.getDate())}/${padTime(d.getMonth() + 1)}`;
        cell.title = `${dFormatado}: ${count} pomodoro(s)`;
      }

      atualizarMetricasLaterais();
    }

    async function registrarLogNaNotaDiaria(texto, perguntaFc, respostaFc) {
      const dailyFile = await garantirNotaDiaria();
      const raw = await app.vault.read(dailyFile);
      const d = new Date();
      const hora = `${padTime(d.getHours())}:${padTime(d.getMinutes())}`;
      
      let updated = raw;
      if (texto) {
        const logLine = `- **[${hora}]** ${texto}`;
        if (updated.includes('### 🍅 Sessões de Foco')) {
          updated = updated.replace('### 🍅 Sessões de Foco', `### 🍅 Sessões de Foco\n${logLine}`);
        } else {
          updated += `\n\n### 🍅 Sessões de Foco\n${logLine}\n`;
        }
      }

      if (perguntaFc && respostaFc) {
        const fcLine = `${perguntaFc}::${respostaFc}`;
        if (updated.includes('## Flashcards do Dia')) {
          updated = updated.replace('## Flashcards do Dia', `## Flashcards do Dia\n${fcLine}`);
        } else {
          updated += `\n\n## Flashcards do Dia\n${fcLine}\n`;
        }
      }

      await app.vault.modify(dailyFile, updated);
    }

    function abrirModalAnotacao(abrirComFc = false) {
      const modalBg = document.createElement('div');
      modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
      
      const modalBox = document.createElement('div');
      modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(74, 222, 128, 0.3); border-radius: 12px; max-width: 440px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';
      
      modalBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; font-weight: bold; color: #ffffff;">🍅 Ciclo Concluído! O que você aprendeu?</span>
          <button id="modal-close-btn" style="background: none; border: none; color: #71717a; cursor: pointer; font-family: monospace; font-size: 14px;">✕</button>
        </div>
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa;">Consolidação rápida registrada na nota diária (01_Inbox/Diário):</div>
        <textarea id="modal-log-text" rows="2" placeholder="Ex: Fixei estrutura de grafos e complexidade..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;"></textarea>
        <div style="padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.06);">
          <label style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #d4d4d8; cursor: pointer;">
            <input type="checkbox" id="modal-fc-toggle" class="abyssal-circle-check">
            <span>Criar Flashcard deste aprendizado?</span>
          </label>
          <div id="modal-fc-box" style="display: none; flex-direction: column; gap: 6px; margin-top: 8px;">
            <input id="modal-fc-p" type="text" placeholder="Pergunta / Conceito" style="background: #14141e; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 6px; color: #ffffff; font-size: 11px; outline: none;">
            <input id="modal-fc-r" type="text" placeholder="Resposta / Definição" style="background: #14141e; border: 1px solid rgba(255,255,255,0.1); border-radius: 4px; padding: 6px; color: #ffffff; font-size: 11px; outline: none;">
          </div>
        </div>
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
          <button id="modal-skip-btn" class="abyssal-btn-action" style="font-size: 11px;">Apenas Pausar</button>
          <button id="modal-save-btn" class="abyssal-btn-primary" style="font-size: 11px;">Salvar & Iniciar Pausa ☕</button>
        </div>
      `;
      
      modalBg.appendChild(modalBox);
      document.body.appendChild(modalBg);

      const fcToggle = modalBox.querySelector('#modal-fc-toggle');
      const fcBox = modalBox.querySelector('#modal-fc-box');
      if (fcToggle && fcBox) {
        if (abrirComFc) {
          fcToggle.checked = true;
          fcBox.style.display = 'flex';
        }
        fcToggle.addEventListener('change', () => {
          fcBox.style.display = fcToggle.checked ? 'flex' : 'none';
        });
      }

      const fecharModal = async (salvar) => {
        document.removeEventListener('keydown', handleKeyAnotacao);
        if (salvar) {
          const txtEl = modalBox.querySelector('#modal-log-text');
          const txt = txtEl ? txtEl.value.trim() : '';
          const pEl = modalBox.querySelector('#modal-fc-p');
          const rEl = modalBox.querySelector('#modal-fc-r');
          const p = (fcToggle && fcToggle.checked && pEl) ? pEl.value.trim() : null;
          const r = (fcToggle && fcToggle.checked && rEl) ? rEl.value.trim() : null;
          if (txt || (p && r)) {
            await registrarLogNaNotaDiaria(txt, p, r);
            new Notice('📝 Aprendizado registrado na Nota Diária!');
          }
        }
        if (modalBg.parentNode) document.body.removeChild(modalBg);
        setMode('pausa');
        toggleTimer();
      };

      const handleKeyAnotacao = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          fecharModal(false);
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          fecharModal(true);
        }
      };
      document.addEventListener('keydown', handleKeyAnotacao);

      modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) fecharModal(false);
      });

      const closeBtn = modalBox.querySelector('#modal-close-btn');
      if (closeBtn) closeBtn.addEventListener('click', () => fecharModal(false));
      const skipBtn = modalBox.querySelector('#modal-skip-btn');
      if (skipBtn) skipBtn.addEventListener('click', () => fecharModal(false));
      const saveBtn = modalBox.querySelector('#modal-save-btn');
      if (saveBtn) saveBtn.addEventListener('click', () => fecharModal(true));

      setTimeout(() => {
        const txtField = modalBox.querySelector('#modal-log-text');
        if (txtField) txtField.focus();
      }, 50);
    }

    async function salvarPomodoroNaNotaDiaria() {
      try {
        const dailyFile = await garantirNotaDiaria();
        if (dailyFile && app.fileManager && app.fileManager.processFrontMatter) {
          await app.fileManager.processFrontMatter(dailyFile, (fm) => {
            fm.pomodoros = completedCyclesToday;
          });
        }
      } catch(e) {}
    }

    async function finalizarFocoAutomatico() {
      completedCyclesToday++;
      mapaFoco[todayStr] = completedCyclesToday;
      await salvarPomodoroNaNotaDiaria();

      // Sincroniza automaticamente com o histórico do Framework de Estudos
      try {
        const cicloPath = "99_Meta/ciclo-estudos.json";
        const cFile = app.vault.getAbstractFileByPath(cicloPath);
        if (cFile) {
          const raw = await app.vault.read(cFile);
          const cState = JSON.parse(raw);
          if (!cState.historicoDiario) cState.historicoDiario = {};
          if (!cState.historicoDiario[todayStr]) {
            cState.historicoDiario[todayStr] = { minutosFoco: 0, questoesFeitas: 0, questoesAcertos: 0 };
          }
          cState.historicoDiario[todayStr].minutosFoco += focusMin;
          await app.vault.modify(cFile, JSON.stringify(cState, null, 2));
        }
      } catch(e) {}

      atualizarJardim();
      gerarHistoricoPomo();
      abrirModalAnotacao(false);
    }

    if (btnTestar) btnTestar.addEventListener('click', finalizarFocoAutomatico);
    if (btnAnotar) btnAnotar.addEventListener('click', () => abrirModalAnotacao(false));
    if (btnFlashcard) btnFlashcard.addEventListener('click', () => abrirModalAnotacao(true));

    updateCircle();
    atualizarJardim();
    gerarHistoricoPomo();
  }
};
