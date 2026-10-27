/**
 * Snoopy Vault - Submódulo: Aba Meu Planner (Estudos)
 * Cockpit de planejamento mensal e semanal unificando blocos agendados,
 * revisões espaçadas na grade, histórico real executado e agendamento rápido vinculado à Home.
 *
 * @module subdashboards/estudos/abas/aba_planner
 */

/**
 * Converte data ISO YYYY-MM-DD para o padrão brasileiro DD/MM/YYYY.
 *
 * @private
 * @param {string} dStr - Data ISO.
 * @returns {string}
 */
function formatarDataBR(dStr) {
  if (!dStr) return '';
  const parts = dStr.split('-');
  if (parts.length === 3) return `${parts[2]}/${parts[1]}/${parts[0]}`;
  return dStr;
}

/**
 * Renderiza a aba Meu Planner dentro do container fornecido.
 *
 * @param {HTMLElement} rootContainer - Elemento pai onde o planner será desenhado.
 * @param {object} ctx - Contexto compartilhado.
 */
function renderAbaPlanner(rootContainer, ctx) {
  const {
    app,
    estado = {},
    disciplinas: rawDisciplinas = [],
    modais,
    plannerAno: anoInicial,
    plannerMes: mesInicial,
    setPlannerData = () => {},
    salvarEstado = async () => {},
    onReload = () => {},
    getIconHtml,
    uiKit
  } = ctx;

  const paraArrayNativo = (col) => {
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
    return out;
  };

  const getDataAttr = (el, key) => {
    if (el && el.dataset && el.dataset[key] !== undefined) return el.dataset[key];
    if (el && typeof el.getAttribute === 'function') return el.getAttribute(`data-${key}`);
    if (el && el.attrs && el.attrs[`data-${key}`] !== undefined) return el.attrs[`data-${key}`];
    return '';
  };

  const disciplinas = paraArrayNativo(rawDisciplinas);
  const revisoes = paraArrayNativo(estado.revisoes);

  const getIcon = (name, size = 13) => {
    if (typeof getIconHtml === 'function') {
      const res = getIconHtml(name, size);
      if (res) return res;
    }
    if (uiKit && uiKit.ICONS && uiKit.ICONS[name]) {
      return `<span class="snoopy-icon" style="width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}">${uiKit.ICONS[name]}</svg></span>`;
    }
    const fallbackMap = {
      'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
      'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
      'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
      'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
      'play': '<polygon points="5 3 19 12 5 21 5 3"/>',
      'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      'repeat': '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
      'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="6" r="6"/><circle cx="12" cy="12" r="2"/>'
    };
    const inner = fallbackMap[name] || '<circle cx="12" cy="12" r="8"/>';
    return `<span class="snoopy-icon" style="width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}">${inner}</svg></span>`;
  };

  const now = new Date();
  const padTime = (n) => String(n).padStart(2, '0');
  const todayStr = `${now.getFullYear()}-${padTime(now.getMonth() + 1)}-${padTime(now.getDate())}`;

  let plannerAno = typeof anoInicial === 'number' ? anoInicial : now.getFullYear();
  let plannerMes = typeof mesInicial === 'number' ? mesInicial : now.getMonth();

  const container = rootContainer.createEl('div', {
    attr: { style: 'display: flex; flex-direction: column; gap: 12px;' }
  });

  const mesesNomes = [
    'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
    'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
  ];
  const diasSemanaNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const totalDiasMes = new Date(plannerAno, plannerMes + 1, 0).getDate();
  const prefixMes = `${plannerAno}-${padTime(plannerMes + 1)}-`;

  // Estatísticas do mês selecionado
  let totalBlocosMes = 0;
  let diasEstudadosMes = 0;
  let revisoesNoMes = 0;
  const proximosBlocos = [];

  if (estado.planner) {
    Object.keys(estado.planner).sort().forEach(dKey => {
      const lista = paraArrayNativo(estado.planner[dKey]);
      if (dKey.startsWith(prefixMes)) totalBlocosMes += lista.length;
      if (dKey >= todayStr) {
        lista.forEach((b, idx) => proximosBlocos.push({ dataStr: dKey, idx, ...b }));
      }
    });
  }
  if (estado.historicoDiario) {
    Object.keys(estado.historicoDiario).forEach(dKey => {
      if (dKey.startsWith(prefixMes) && (Number(estado.historicoDiario[dKey]?.minutosFoco) > 0 || Number(estado.historicoDiario[dKey]?.questoesFeitas) > 0)) {
        diasEstudadosMes++;
      }
    });
  }
  revisoes.forEach(r => {
    if (r && r.status === 'programada' && String(r.proximaRevisao || '').startsWith(prefixMes)) {
      revisoesNoMes++;
    }
  });

  // 1. CABEÇALHO COMPACTO + BARRA DE AGENDAMENTO RÁPIDO INLINE (Sem exigir modal)
  const topBar = container.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 10px; padding: 12px 16px;' }
  });

  topBar.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <span class="snoopy-section-title" style="display: inline-flex; align-items: center; gap: 6px; font-size: 15px;">
          ${getIcon('calendar', 14)}
          <span>MEU PLANNER • CALENDÁRIO MENSAL</span>
        </span>
        <div style="display: flex; gap: 6px; align-items: center;">
          <span class="snoopy-micro" style="padding: 2px 7px; border-radius: 4px; background: rgba(96, 165, 250, 0.14); color: #93c5fd;">${totalBlocosMes} bloco(s) no mês</span>
          <span class="snoopy-micro" style="padding: 2px 7px; border-radius: 4px; background: rgba(168, 85, 247, 0.14); color: #d8b4fe;">${revisoesNoMes} revisão(ões)</span>
          <span class="snoopy-micro" style="padding: 2px 7px; border-radius: 4px; background: rgba(134, 239, 172, 0.14); color: #86efac;">${diasEstudadosMes} dia(s) com foco</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 6px;">
        <button id="btn-cal-prev" class="snoopy-btn-action snoopy-btn-sm" style="padding: 4px 8px; display: inline-flex; align-items: center;" title="Mês anterior">${getIcon('chevron-left', 12)}</button>
        <span id="cal-mes-atual" class="snoopy-meta" style="font-size: 12.5px; font-weight: 700; color: var(--text-normal); min-width: 135px; text-align: center;">
          ${mesesNomes[plannerMes]} de ${plannerAno}
        </span>
        <button id="btn-cal-next" class="snoopy-btn-action snoopy-btn-sm" style="padding: 4px 8px; display: inline-flex; align-items: center;" title="Próximo mês">${getIcon('chevron-right', 12)}</button>
        <button id="btn-cal-hoje" class="snoopy-nav-pill-btn snoopy-btn-sm" style="font-size: 11px; padding: 3px 9px;">Hoje</button>
      </div>
    </div>

    <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px; background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 7px 10px;">
      <span class="snoopy-micro" style="font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Agendar:</span>
      <input id="quick-plan-data" type="date" value="${todayStr}" style="background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 7px; font-size: 11px; color: var(--text-normal); outline: none;">
      <select id="quick-plan-mat" style="flex: 1.5; min-width: 150px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 7px; font-size: 11.5px; color: var(--text-normal); outline: none;">
        ${disciplinas.length > 0
          ? disciplinas.map(m => `<option value="${m.nome}">${m.nome} (${m.area || m.categoria || 'Geral'})</option>`).join('')
          : '<option value="Estudo Geral">Estudo Geral</option>'}
      </select>
      <select id="quick-plan-tipo" style="background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 7px; font-size: 11px; color: var(--text-normal); outline: none;">
        <option value="Teoria + Questões">Teoria + Questões</option>
        <option value="Teoria">Teoria</option>
        <option value="Questões">Questões</option>
        <option value="Simulado / Prova">Simulado / Prova</option>
        <option value="Revisão">Revisão</option>
      </select>
      <input id="quick-plan-tempo" type="text" value="1h30m" placeholder="Duração" style="width: 68px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 7px; font-size: 11px; color: var(--text-normal); text-align: center; outline: none;">
      <label style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted); cursor: pointer; user-select: none;">
        <input id="quick-plan-sync" type="checkbox" checked style="cursor: pointer;">
        <span>+ Home</span>
      </label>
      <button id="btn-quick-plan-save" class="snoopy-btn-primary snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;">
        ${getIcon('plus', 11)}
        <span>Agendar</span>
      </button>
    </div>
  `;

  const sincronizarBlocoNaHome = async (dataVal, matVal, tipoVal, tempoVal) => {
    if (!matVal || !app || !app.vault || !app.vault.getAbstractFileByPath) return;
    try {
      const dailyFolder = "01_Inbox/Diário";
      const dailyPath = `${dailyFolder}/${dataVal}.md`;
      const taskLine = `- [ ] Estudar [[03_Estudos/${matVal}.md|${matVal}]] (${tipoVal} • ${tempoVal}) 📅 ${dataVal} #estudo`;

      if (!app.vault.getAbstractFileByPath(dailyFolder) && app.vault.createFolder) {
        await app.vault.createFolder(dailyFolder).catch(() => {});
      }
      const dailyFile = app.vault.getAbstractFileByPath(dailyPath);
      if (!dailyFile && app.vault.create) {
        await app.vault.create(dailyPath, `# Diário - ${dataVal}\n\n## Tarefas\n${taskLine}\n\n## Notas do Dia\n`);
      } else if (dailyFile && app.vault.read && app.vault.modify) {
        const raw = await app.vault.read(dailyFile);
        const regexTarefas = /(^##\s+.*Tarefas.*$)/m;
        const match = raw.match(regexTarefas);
        const updated = match
          ? raw.replace(match[0], `${match[0]}\n${taskLine}`)
          : `${raw}\n\n## Tarefas\n${taskLine}\n`;
        await app.vault.modify(dailyFile, updated);
      }
    } catch (e) {
      console.error('[Snoopy Estudos] Erro ao sincronizar bloco com Home:', e);
    }
  };

  const btnPrev = topBar.querySelector('#btn-cal-prev');
  if (btnPrev) {
    btnPrev.onclick = () => {
      if (plannerMes === 0) { plannerMes = 11; plannerAno--; }
      else { plannerMes--; }
      setPlannerData(plannerAno, plannerMes);
      onReload();
    };
  }

  const btnNext = topBar.querySelector('#btn-cal-next');
  if (btnNext) {
    btnNext.onclick = () => {
      if (plannerMes === 11) { plannerMes = 0; plannerAno++; }
      else { plannerMes++; }
      setPlannerData(plannerAno, plannerMes);
      onReload();
    };
  }

  const btnHoje = topBar.querySelector('#btn-cal-hoje');
  if (btnHoje) {
    btnHoje.onclick = () => {
      setPlannerData(now.getFullYear(), now.getMonth());
      onReload();
    };
  }

  const btnQuickPlan = topBar.querySelector('#btn-quick-plan-save');
  if (btnQuickPlan) {
    btnQuickPlan.onclick = async () => {
      const dataEl = topBar.querySelector('#quick-plan-data');
      const matEl = topBar.querySelector('#quick-plan-mat');
      const tipoEl = topBar.querySelector('#quick-plan-tipo');
      const tempoEl = topBar.querySelector('#quick-plan-tempo');
      const syncEl = topBar.querySelector('#quick-plan-sync');

      const dataVal = (dataEl && dataEl.value) || todayStr;
      const matVal = (matEl && matEl.value) || (disciplinas[0]?.nome || 'Estudo');
      const tipoVal = (tipoEl && tipoEl.value) || 'Teoria + Questões';
      const tempoVal = (tempoEl && tempoEl.value.trim()) || '1h30m';
      const syncHome = syncEl ? syncEl.checked : true;

      if (!estado.planner) estado.planner = {};
      if (!Array.isArray(estado.planner[dataVal])) estado.planner[dataVal] = [];
      estado.planner[dataVal].push({ materia: matVal, tempo: tempoVal, tipo: tipoVal });
      await salvarEstado();

      if (syncHome) await sincronizarBlocoNaHome(dataVal, matVal, tipoVal, tempoVal);
      if (typeof Notice !== 'undefined') new Notice(`Agendado: ${matVal} em ${formatarDataBR(dataVal)}!`);
      onReload();
    };
  }

  // 2. GRADE COMPACTA DO CALENDÁRIO + PAINEL LATERAL DE PRÓXIMOS BLOCOS
  const mainLayout = container.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: 1fr 290px; gap: 12px; align-items: start;' }
  });

  const calGridWrapper = mainLayout.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'padding: 12px; display: flex; flex-direction: column; gap: 6px;' }
  });

  const calWeekHeader = calGridWrapper.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px; text-align: center; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 6px;' }
  });

  diasSemanaNomes.forEach(dNome => {
    calWeekHeader.createEl('div', {
      attr: { class: 'snoopy-meta', style: 'font-size: 10.5px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;' },
      text: dNome
    });
  });

  const primeiroDiaSemana = new Date(plannerAno, plannerMes, 1).getDay();
  const diasMesAnterior = new Date(plannerAno, plannerMes, 0).getDate();

  const calDaysGrid = calGridWrapper.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: repeat(7, 1fr); gap: 5px;' }
  });

  for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
    const diaNum = diasMesAnterior - i;
    const cellOut = calDaysGrid.createEl('div', {
      attr: { style: 'min-height: 64px; padding: 5px; border-radius: 5px; background: rgba(255,255,255,0.01); border: 1px dashed rgba(255,255,255,0.04); opacity: 0.3; display: flex; flex-direction: column; justify-content: flex-start;' }
    });
    cellOut.innerHTML = `<span class="snoopy-meta" style="font-size: 9.5px; text-align: right;">${diaNum}</span>`;
  }

  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const dStr = `${plannerAno}-${padTime(plannerMes + 1)}-${padTime(dia)}`;
    const isHoje = dStr === todayStr;
    const blocosDoDia = (estado.planner && estado.planner[dStr]) ? paraArrayNativo(estado.planner[dStr]) : [];
    const revsDoDia = revisoes.filter(r => r && r.status === 'programada' && r.proximaRevisao === dStr);
    const histDia = estado.historicoDiario && estado.historicoDiario[dStr];
    const minFeitos = Number(histDia?.minutosFoco) || 0;

    const dayCell = calDaysGrid.createEl('div', {
      attr: {
        style: `min-height: 66px; padding: 5px 6px; border-radius: 6px; background: ${isHoje ? 'var(--background-secondary-alt)' : 'var(--background-secondary)'}; border: 1px solid ${isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--background-modifier-border)'}; display: flex; flex-direction: column; gap: 3px; cursor: pointer; transition: border-color 0.15s ease; position: relative;`
      }
    });

    const focoBadge = minFeitos > 0
      ? `<span class="snoopy-micro" style="font-size: 8px; padding: 0 4px; border-radius: 3px; background: rgba(134, 239, 172, 0.16); color: #86efac;">${minFeitos >= 60 ? `${Math.floor(minFeitos / 60)}h${minFeitos % 60 ? `${minFeitos % 60}m` : ''}` : `${minFeitos}m`}</span>`
      : (isHoje ? `<span class="snoopy-micro" style="font-size: 8px; padding: 0 4px; border-radius: 3px; background: var(--interactive-accent, #60a5fa); color: #000000; font-weight: bold;">HOJE</span>` : '<span></span>');

    dayCell.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        ${focoBadge}
        <span class="snoopy-meta" style="font-size: 10.5px; font-weight: ${isHoje ? '800' : '600'}; color: ${isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-normal)'};">
          ${dia}
        </span>
      </div>
      <div class="day-blocos-box" style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
        ${blocosDoDia.map((b, bIdx) => `
          <div class="cal-bloco-pill snoopy-meta" data-dia="${dStr}" data-idx="${bIdx}" style="padding: 1px 4px; border-radius: 3px; background: rgba(96, 165, 250, 0.16); border-left: 2px solid var(--interactive-accent, #60a5fa); font-size: 9px; color: var(--text-normal); display: flex; justify-content: space-between; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${b.materia} (${b.tempo || '1h'})">
            <span style="overflow: hidden; text-overflow: ellipsis;">${b.materia}</span>
            <span style="color: var(--text-muted); font-size: 8px; margin-left: 3px;">${b.tempo || '1h'}</span>
          </div>
        `).join('')}
        ${revsDoDia.map(r => `
          <div class="snoopy-meta" style="padding: 1px 4px; border-radius: 3px; background: rgba(168, 85, 247, 0.15); border-left: 2px solid #c084fc; font-size: 8.5px; color: #e9d5ff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Revisão programada (${r.intervaloDias || 1}d)">
            Rev: ${r.nome}
          </div>
        `).join('')}
      </div>
    `;

    dayCell.onclick = (e) => {
      if (e && e.target && e.target.closest && e.target.closest('.cal-bloco-pill')) return;
      const quickDateInput = topBar.querySelector('#quick-plan-data');
      if (quickDateInput) quickDateInput.value = dStr;
      abrirModalAgendarBloco(disciplinas, dStr);
    };

    dayCell.querySelectorAll('.cal-bloco-pill').forEach(pill => {
      pill.onclick = (e) => {
        if (e && e.stopPropagation) e.stopPropagation();
        const dKey = getDataAttr(pill, 'dia');
        const bIdx = parseInt(getDataAttr(pill, 'idx'), 10);
        if (estado.planner && estado.planner[dKey] && estado.planner[dKey][bIdx]) {
          abrirModalGerenciarBloco(dKey, bIdx, estado.planner[dKey][bIdx], disciplinas);
        }
      };
    });
  }

  // Painel Lateral: Agenda Operacional & Próximos Compromissos
  const sideCard = mainLayout.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'padding: 12px 14px; display: flex; flex-direction: column; gap: 10px;' }
  });

  sideCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="snoopy-section-title" style="font-size: 13px; display: inline-flex; align-items: center; gap: 5px;">
        ${getIcon('target', 13)}
        <span>PRÓXIMOS BLOCOS</span>
      </span>
      <span class="snoopy-micro" style="color: var(--text-muted);">${proximosBlocos.length} agendado(s)</span>
    </div>
  `;

  if (proximosBlocos.length === 0) {
    sideCard.createEl('div', {
      attr: { class: 'snoopy-meta', style: 'font-size: 11px; padding: 14px 0; text-align: center;' },
      text: 'Nenhum bloco futuro agendado. Use a barra superior ou clique em um dia para planejar.'
    });
  } else {
    const agendaList = sideCard.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 6px; max-height: 360px; overflow-y: auto;' }
    });

    proximosBlocos.slice(0, 8).forEach(item => {
      const row = agendaList.createEl('div', {
        attr: { style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 3px solid var(--interactive-accent, #60a5fa); border-radius: 6px; padding: 7px 9px; display: flex; justify-content: space-between; align-items: center; gap: 6px;' }
      });
      row.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden;">
          <div style="display: flex; align-items: center; gap: 5px;">
            <span class="snoopy-micro" style="font-size: 9.5px; color: #93c5fd; font-weight: 700;">${item.dataStr === todayStr ? 'HOJE' : formatarDataBR(item.dataStr).slice(0, 5)}</span>
            <span style="font-size: 11.5px; font-weight: 700; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${item.materia}</span>
          </div>
          <span class="snoopy-meta" style="font-size: 10px;">${item.tipo || 'Teoria'} • ${item.tempo || '1h'}</span>
        </div>
        <div style="display: flex; gap: 4px; flex-shrink: 0;">
          <button class="snoopy-btn-primary btn-side-foco" data-mat="${item.materia}" style="font-size: 10px; padding: 3px 7px; display: inline-flex; align-items: center; gap: 3px;" title="Iniciar Foco nesta matéria">
            ${getIcon('play', 9)}
            <span>Foco</span>
          </button>
          <button class="snoopy-btn-action btn-side-del" data-dia="${item.dataStr}" data-idx="${item.idx}" style="padding: 3px 5px; display: inline-flex; align-items: center;" title="Remover agendamento">
            ${getIcon('x', 10)}
          </button>
        </div>
      `;

      const btnFoco = row.querySelector('.btn-side-foco');
      if (btnFoco) {
        btnFoco.onclick = () => {
          const matNome = getDataAttr(btnFoco, 'mat');
          const discObj = disciplinas.find(d => d.nome === matNome);
          if (modais && modais.abrirModalSessao) modais.abrirModalSessao(discObj || null);
        };
      }

      const btnDel = row.querySelector('.btn-side-del');
      if (btnDel) {
        btnDel.onclick = async () => {
          const dKey = getDataAttr(btnDel, 'dia');
          const bIdx = parseInt(getDataAttr(btnDel, 'idx'), 10);
          if (estado.planner && Array.isArray(estado.planner[dKey])) {
            estado.planner[dKey].splice(bIdx, 1);
            await salvarEstado();
            onReload();
          }
        };
      }
    });
  }

  function abrirModalAgendarBloco(listaDisciplinas, dataInicial = todayStr) {
    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 400px; width: 100%; padding: 20px; display: flex; flex-direction: column; gap: 12px; font-family: var(--snoopy-font-sans);';

    modalBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; font-weight: bold; color: #ffffff;">Agendar Estudo • ${formatarDataBR(dataInicial)}</span>
        <button id="modal-close-plan" class="snoopy-modal-close" title="Fechar"></button>
      </div>

      <div>
        <div class="snoopy-modal-label">Data:</div>
        <input id="modal-plan-data" type="date" value="${dataInicial}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>

      <div>
        <div class="snoopy-modal-label">Disciplina:</div>
        <select id="modal-plan-mat" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
          ${listaDisciplinas.map(m => `<option value="${m.nome}">${m.nome} (${m.categoria || m.area || 'Geral'})</option>`).join('')}
        </select>
      </div>

      <div style="display: flex; gap: 8px;">
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Duração Estimada:</div>
          <input id="modal-plan-tempo" type="text" value="1h30m" placeholder="Ex: 50m, 1h, 2h" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
        </div>
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Modalidade:</div>
          <select id="modal-plan-tipo" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
            <option value="Teoria">Teoria</option>
            <option value="Questões">Questões</option>
            <option value="Simulado / Prova">Simulado / Prova</option>
            <option value="Revisão">Revisão</option>
          </select>
        </div>
      </div>

      <div style="background: rgba(96, 165, 250, 0.08); border: 1px solid rgba(96, 165, 250, 0.2); border-radius: 6px; padding: 8px 10px; display: flex; align-items: center; gap: 8px;">
        <input id="modal-plan-sync-home" type="checkbox" checked style="cursor: pointer;">
        <label for="modal-plan-sync-home" style="font-size: 11px; color: #e0e7ff; cursor: pointer;">
          Sincronizar com a Tabela Principal de Tarefas na Home (${formatarDataBR(dataInicial)})
        </label>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
        <button id="modal-cancel-plan" class="snoopy-btn-action" style="font-size: 11px;">Cancelar</button>
        <button id="modal-save-plan" class="snoopy-btn-primary" style="font-size: 11px;">Agendar Bloco</button>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });

    const btnClose = modalBox.querySelector('#modal-close-plan');
    if (btnClose) btnClose.onclick = fechar;
    const btnCancel = modalBox.querySelector('#modal-cancel-plan');
    if (btnCancel) btnCancel.onclick = fechar;

    const btnSave = modalBox.querySelector('#modal-save-plan');
    if (btnSave) {
      btnSave.onclick = async () => {
        const dataVal = modalBox.querySelector('#modal-plan-data').value;
        const matVal = modalBox.querySelector('#modal-plan-mat').value;
        const tempoVal = modalBox.querySelector('#modal-plan-tempo').value;
        const tipoVal = modalBox.querySelector('#modal-plan-tipo').value;
        const syncHome = modalBox.querySelector('#modal-plan-sync-home')
          ? modalBox.querySelector('#modal-plan-sync-home').checked
          : true;

        if (!estado.planner) estado.planner = {};
        if (!estado.planner[dataVal]) estado.planner[dataVal] = [];
        estado.planner[dataVal].push({ materia: matVal, tempo: tempoVal, tipo: tipoVal });

        await salvarEstado();
        if (syncHome) await sincronizarBlocoNaHome(dataVal, matVal, tipoVal, tempoVal);

        if (typeof Notice !== 'undefined') new Notice(`Bloco agendado para ${formatarDataBR(dataVal)}${syncHome ? ' e vinculado à Home' : ''}!`);
        fechar();
        onReload();
      };
    }
  }

  function abrirModalGerenciarBloco(dia, idx, bloco, listaDisciplinas) {
    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 360px; width: 100%; padding: 20px; display: flex; flex-direction: column; gap: 12px; font-family: var(--snoopy-font-sans);';

    const discObj = listaDisciplinas.find(d => d.nome === bloco.materia);

    modalBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; font-weight: bold; color: #ffffff;">Bloco de Estudo • ${formatarDataBR(dia)}</span>
        <button id="modal-close-mbloco" class="snoopy-modal-close" title="Fechar"></button>
      </div>

      <div style="background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 3px;">
        <div style="font-size: 13.5px; font-weight: bold; color: var(--text-normal);">${bloco.materia}</div>
        <div class="snoopy-meta">${bloco.tempo} • ${bloco.tipo}</div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
        <button id="btn-del-bloco-act" class="snoopy-btn-action" style="font-size: 11px; color: #fca5a5;">Excluir Bloco</button>
        <button id="btn-foco-bloco-act" class="snoopy-btn-primary" style="font-size: 11px;">Iniciar Foco</button>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });

    const btnClose = modalBox.querySelector('#modal-close-mbloco');
    if (btnClose) btnClose.onclick = fechar;

    const btnDel = modalBox.querySelector('#btn-del-bloco-act');
    if (btnDel) {
      btnDel.onclick = async () => {
        if (estado.planner && estado.planner[dia]) {
          estado.planner[dia].splice(idx, 1);
          await salvarEstado();
          if (typeof Notice !== 'undefined') new Notice("Bloco removido!");
          fechar();
          onReload();
        }
      };
    }

    const btnFoco = modalBox.querySelector('#btn-foco-bloco-act');
    if (btnFoco) {
      btnFoco.onclick = () => {
        fechar();
        if (modais && modais.abrirModalSessao) {
          modais.abrirModalSessao(discObj);
        }
      };
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderAbaPlanner, formatarDataBR };
}

return { renderAbaPlanner, formatarDataBR };
