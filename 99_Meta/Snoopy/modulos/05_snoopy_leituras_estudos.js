/**
 * Snoopy Vault - Módulo 05: Vitrine de Estudos & Bookshelf de Leituras
 * Posicionado acima do Kanban com proporção 50/50:
 * - Esquerda: Estudos com atalho direto ao Painel, destaque da matéria da vez e gráficos de foco semanal.
 * - Direita: Bookshelf estilo KOReader com mini hero, gráficos de constância semanal e busca na nuvem.
 *
 * @module modulos/05_snoopy_leituras_estudos
 */
return {
  id: 'snoopy_leituras_estudos',
  titulo: 'Estudos & Bookshelf de Leituras',

  /**
   * Ponto de entrada do ciclo de vida de renderização do Módulo 05.
   *
   * @param {object} ctx - Contexto compartilhado com os microsserviços do Vault.
   * @param {HTMLElement} ctx.root - Contêiner raiz DOM.
   * @param {object} ctx.app - Instância global do Obsidian.
   * @param {object} ctx.dv - API Dataview.
   * @param {string} ctx.todayStr - Data do dia em formato ISO (YYYY-MM-DD).
   * @param {function(HTMLElement, string, object=): HTMLElement} [ctx.renderIcon] - Helper de ícones.
   * @returns {Promise<void>}
   */
  async render(ctx) {
    const { root, app, dv, todayStr } = ctx;

    // Helper puro para calcular últimos 7 dias a partir de hoje
    const getUltimos7Dias = (dStr) => {
      const parts = dStr.split('-').map(Number);
      const dias = [];
      const nomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
      for (let i = 6; i >= 0; i--) {
        const dt = new Date(parts[0], parts[1] - 1, parts[2] - i);
        const iso = `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, '0')}-${String(dt.getDate()).padStart(2, '0')}`;
        dias.push({
          dateStr: iso,
          diaSemana: nomes[dt.getDay()],
          diaAbrev: nomes[dt.getDay()][0],
          isToday: i === 0
        });
      }
      return dias;
    };

    // Helper puro de renderização de Mini Gráfico de Barras SVG (7 Dias)
    const renderMiniGraficoBarras = ({ dias, meta, unidade, corAtiva = '#60a5fa', corMeta = '#86efac', corVazia = '#262633' }) => {
      const maxVal = Math.max(meta, ...dias.map(d => d.valor || 0), 1);
      const chartH = 28;
      const barW = 13;
      const gap = 7;
      const totalW = dias.length * barW + (dias.length - 1) * gap;
      const padLeft = Math.max(4, Math.floor((150 - totalW) / 2));
      const metaY = Math.max(2, Math.min(chartH, Math.round(chartH - (meta / maxVal) * chartH)));

      let barsSvg = '';
      dias.forEach((d, i) => {
        const x = padLeft + i * (barW + gap);
        const val = Number(d.valor) || 0;
        const h = val > 0 ? Math.max(4, Math.round((val / maxVal) * chartH)) : 3;
        const y = chartH - h;
        const isBatida = val >= meta;
        const barColor = val === 0 ? corVazia : (isBatida ? corMeta : corAtiva);
        const opacity = d.isToday ? '1' : (val === 0 ? '0.45' : '0.85');

        barsSvg += `
          <g>
            <rect x="${x}" y="${y}" width="${barW}" height="${h}" rx="2" fill="${barColor}" opacity="${opacity}">
              <title>${d.diaSemana} (${d.dateStr}): ${val} ${unidade}</title>
            </rect>
            <text x="${x + barW / 2}" y="41" text-anchor="middle" font-size="9" font-family="system-ui, sans-serif" font-weight="${d.isToday ? '700' : '400'}" fill="${d.isToday ? '#ffffff' : '#71717a'}">
              ${d.diaAbrev || d.diaSemana}
            </text>
            ${d.isToday ? `<circle cx="${x + barW / 2}" cy="45" r="1.5" fill="${corAtiva}" />` : ''}
          </g>
        `;
      });

      return `
        <svg viewBox="0 0 150 48" style="width: 100%; height: 48px; display: block;" preserveAspectRatio="xMidYMid meet">
          <line x1="${padLeft}" y1="${metaY}" x2="${padLeft + totalW}" y2="${metaY}" stroke="rgba(255, 255, 255, 0.16)" stroke-dasharray="2,2" stroke-width="1" />
          ${barsSvg}
        </svg>
      `;
    };

    // CONTAINER PRINCIPAL: VITRINE 50/50 LADO A LADO
    const showcaseGrid = root.createEl('div', { 
      cls: 'snoopy-showcase-grid',
      attr: { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;' }
    });

    // =========================================================================
    // 1. COLUNA ESQUERDA: ESTUDOS & CICLO ATIVO (ESTILO ESTUDEI)
    // =========================================================================
    const estudosCol = showcaseGrid.createEl('div', { 
      cls: 'snoopy-card-box', 
      attr: { style: 'display: flex; flex-direction: column; gap: 10px; padding: 14px 16px;' } 
    });

    const estudos = dv.pages('"03_Estudos"')
      .where(e => !e.file.name.includes("Template") && !e.file.name.includes("Painel"));

    const estudosHeader = estudosCol.createEl('div', { cls: 'snoopy-card-header' });

    estudosHeader.innerHTML = `
      <div class="snoopy-card-header-main">
        <a id="link-painel-estudos" class="snoopy-section-title-link" title="Abrir Subdashboard Completo de Estudos (Framework Estudei)">
          ${ctx.UIKit && ctx.UIKit.ICONS && ctx.UIKit.ICONS['graduation-cap'] ? `<span class="snoopy-icon" style="width: 16px; height: 16px; color: var(--snoopy-muted);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">${ctx.UIKit.ICONS['graduation-cap']}</svg></span>` : ''}
          ESTUDOS
          ${ctx.UIKit && ctx.UIKit.ICONS && ctx.UIKit.ICONS['arrow-up-right'] ? `<span class="snoopy-icon" style="width: 13px; height: 13px; opacity: 0.6;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">${ctx.UIKit.ICONS['arrow-up-right']}</svg></span>` : ''}
        </a>
        <span class="snoopy-card-subtitle">Ciclo de estudos e matérias ativas</span>
      </div>
      <span class="snoopy-meta">${ctx.UIKit && typeof ctx.UIKit.pluralizar === 'function' ? ctx.UIKit.pluralizar(estudos.length, 'matéria', 'matérias') : `${estudos.length} matérias`}</span>
    `;

    const linkPainelEstudos = estudosHeader.querySelector('#link-painel-estudos');
    if (linkPainelEstudos) {
      linkPainelEstudos.addEventListener('click', (e) => {
        e.preventDefault();
        app.workspace.openLinkText("03_Estudos/Painel de Estudos.md", "", false);
      });
    }

    // 1.1. Métricas de Estudos (Histórico Diário + Ciclo + Pomodoro)
    let minutosHoje = 0;
    let questoesHoje = 0;
    let cicloIdx = 0;
    let parsedCiclo = null;

    try {
      const cicloFile = app.vault.getAbstractFileByPath("99_Meta/ciclo-estudos.json");
      if (cicloFile) {
        const raw = await app.vault.read(cicloFile);
        parsedCiclo = JSON.parse(raw);
        if (typeof parsedCiclo.disciplinaAtualIdx === 'number') cicloIdx = parsedCiclo.disciplinaAtualIdx;
        if (parsedCiclo.historicoDiario && parsedCiclo.historicoDiario[todayStr]) {
          minutosHoje += Number(parsedCiclo.historicoDiario[todayStr].minutosFoco) || 0;
          questoesHoje += Number(parsedCiclo.historicoDiario[todayStr].questoesFeitas) || 0;
        }
      }
    } catch(e) {}

    // Pomodoros de hoje da nota diária
    const dailyPageHoje = dv.page(`"01_Inbox/Diário/${todayStr}"`);
    if (dailyPageHoje && dailyPageHoje.pomodoros) {
      const pMin = Number(dailyPageHoje.pomodoros) * 25;
      if (pMin > minutosHoje) minutosHoje = pMin;
    }

    const minutosHojeTxt = minutosHoje >= 60 ? `${Math.floor(minutosHoje / 60)}h${minutosHoje % 60 ? `${minutosHoje % 60}m` : ''}` : `${minutosHoje}m`;

    // Função auxiliar para registrar questões rápidas no histórico diário do ciclo
    const registrarQuestoesRapidas = async (qtd = 5) => {
      try {
        if (!app || !app.vault) return;
        const cicloFile = app.vault.getAbstractFileByPath("99_Meta/ciclo-estudos.json");
        if (!cicloFile) return;
        const raw = await app.vault.read(cicloFile);
        const parsed = JSON.parse(raw);
        if (!parsed.historicoDiario) parsed.historicoDiario = {};
        if (!parsed.historicoDiario[todayStr]) {
          parsed.historicoDiario[todayStr] = { minutosFoco: 0, questoesFeitas: 0 };
        }
        parsed.historicoDiario[todayStr].questoesFeitas = (parsed.historicoDiario[todayStr].questoesFeitas || 0) + qtd;
        if (typeof app.vault.modify === 'function') {
          await app.vault.modify(cicloFile, JSON.stringify(parsed, null, 2));
        }
        if (typeof Notice !== 'undefined') {
          new Notice(`[Snoopy] +${qtd} questões registradas hoje!`);
        }
      } catch (err) {
        console.error('[Snoopy] Erro ao registrar questões:', err);
      }
    };

    // Coleta série dos últimos 7 dias de Estudos para o gráfico
    const ultimos7Estudos = getUltimos7Dias(todayStr).map(d => {
      let m = 0;
      if (parsedCiclo && parsedCiclo.historicoDiario && parsedCiclo.historicoDiario[d.dateStr]) {
        m = Number(parsedCiclo.historicoDiario[d.dateStr].minutosFoco) || 0;
      }
      try {
        const dp = dv.page(`"01_Inbox/Diário/${d.dateStr}"`);
        if (dp && dp.pomodoros) {
          const pMin = Number(dp.pomodoros) * 25;
          if (pMin > m) m = pMin;
        }
      } catch (e) {}
      return { ...d, valor: m };
    });

    const minutosSemana = ultimos7Estudos.reduce((acc, d) => acc + d.valor, 0);
    const minutosSemanaTxt = minutosSemana >= 60 ? `${Math.floor(minutosSemana / 60)}h${minutosSemana % 60 ? `${minutosSemana % 60}m` : ''}` : `${minutosSemana}m`;

    const materiasLista = [...estudos];
    if (materiasLista.length > 0) {
      if (cicloIdx >= materiasLista.length) cicloIdx = 0;
      const materiaVez = materiasLista[cicloIdx];

      // Destaque da Matéria da Vez (Layout Compacto)
      const vezCard = estudosCol.createEl('div', {
        attr: {
          style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 3px solid var(--interactive-accent, #60a5fa); border-radius: 6px; padding: 9px 12px; display: flex; justify-content: space-between; align-items: center; cursor: pointer;'
        }
      });

      vezCard.innerHTML = `
        <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden; padding-right: 8px;">
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="snoopy-micro" style="font-weight: 700; color: var(--interactive-accent, #60a5fa); text-transform: uppercase;">Matéria da Vez no Ciclo</span>
            <span class="prio-badge prio-media" style="font-size: 10px; padding: 0 5px;">Foco Ativo</span>
          </div>
          <span style="font-size: 15.5px; font-weight: 700; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${materiaVez.title || materiaVez.file.name}</span>
          <span class="snoopy-meta" style="font-size: 11.5px;">${materiaVez.disciplina || 'Geral'} • Status: ${materiaVez.status || 'Em Andamento'}</span>
        </div>
        <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
          <button id="btn-add-questoes-materia" class="snoopy-btn-action snoopy-btn-sm" title="Registrar +5 questões feitas hoje" style="font-size: 10.5px; padding: 2px 7px; height: 22px;">+5 questões</button>
          <span class="snoopy-todo-source" style="font-size: 11px; padding: 2px 7px; flex-shrink: 0;">Abrir →</span>
        </div>
      `;

      vezCard.addEventListener('click', (e) => {
        const btnQ = vezCard.querySelector('#btn-add-questoes-materia');
        if (e.target === btnQ || btnQ?.contains(e.target)) return;
        app.workspace.openLinkText(materiaVez.file.path, "", false);
      });

      const btnAddQuestoes = vezCard.querySelector('#btn-add-questoes-materia');
      if (btnAddQuestoes) {
        btnAddQuestoes.onclick = async (e) => {
          e.stopPropagation();
          await registrarQuestoesRapidas(5);
        };
      }

      // =========================================================================
      // PAINEL INFERIOR DE ESTUDOS: GRÁFICO SEMANAL + RITMO DO CICLO
      // =========================================================================
      const metaMinutos = 50;
      const pctMetaFoco = Math.min(100, Math.round((minutosHoje / metaMinutos) * 100));

      const painelInferiorEstudos = estudosCol.createEl('div', {
        attr: { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;' }
      });

      // 1. Gráfico Semanal dos 7 Dias de Estudos
      const chartEstudosCard = painelInferiorEstudos.createEl('div', {
        attr: { style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; justify-content: space-between; gap: 4px;' }
      });

      chartEstudosCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="snoopy-micro" style="font-weight: 700; color: #a1a1aa; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px;">
            <span class="snoopy-icon-chart-estudos"></span>
            <span>Foco na Semana</span>
          </span>
          <span class="snoopy-micro" style="font-weight: 700; color: #60a5fa;">${minutosSemanaTxt}</span>
        </div>
        ${renderMiniGraficoBarras({ dias: ultimos7Estudos, meta: metaMinutos, unidade: 'min', corAtiva: '#60a5fa', corMeta: '#86efac' })}
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #71717a; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 3px;">
          <span>Foco Hoje: <strong style="color: var(--text-normal);">${minutosHojeTxt}</strong></span>
          <span>Meta: ${metaMinutos}m</span>
        </div>
      `;

      const iconChartEstudos = chartEstudosCard.querySelector('.snoopy-icon-chart-estudos');
      if (iconChartEstudos && ctx.renderIcon) ctx.renderIcon(iconChartEstudos, 'bar-chart-3', { size: 12, color: '#60a5fa' });

      // 2. Card de Ritmo do Ciclo & Próximo Passo
      const outrasMaterias = materiasLista.filter(m => m.file.path !== materiaVez.file.path).slice(0, 3);

      if (outrasMaterias.length > 0) {
        const ritmoCard = painelInferiorEstudos.createEl('div', {
          attr: { style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; justify-content: space-between; gap: 4px;' }
        });

        ritmoCard.innerHTML = `
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span class="snoopy-micro" style="font-weight: 700; color: #a1a1aa; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px;">
                <span class="snoopy-icon-ritmo-ciclo"></span>
                <span>Ritmo do Ciclo</span>
              </span>
              <span class="snoopy-micro" style="font-weight: 700; color: #86efac;">${questoesHoje} questões</span>
            </div>
            <div class="snoopy-prog-track" style="height: 4px; width: 100%;">
              <div class="snoopy-prog-fill" style="width: ${pctMetaFoco}%; background: ${minutosHoje >= metaMinutos ? '#86efac' : 'var(--interactive-accent, #60a5fa)'};"></div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 3px; margin-top: 2px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #71717a;">
              <span>Outras no Ciclo:</span>
              <span class="snoopy-meta" style="font-size: 10.5px;">${outrasMaterias.length} ativas</span>
            </div>
            <div style="display: flex; gap: 4px; overflow: hidden;">
              ${outrasMaterias.map(m => `
                <span class="snoopy-todo-source" style="font-size: 10px; padding: 1px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px;" title="${m.title || m.file.name}">
                  ${m.title || m.file.name}
                </span>
              `).join('')}
            </div>
          </div>
        `;

        const iconRitmo = ritmoCard.querySelector('.snoopy-icon-ritmo-ciclo');
        if (iconRitmo && ctx.renderIcon) ctx.renderIcon(iconRitmo, 'timer', { size: 12, color: '#a1a1aa' });
      } else {
        // CASO DE MATÉRIA ÚNICA
        const ritmoCard = painelInferiorEstudos.createEl('div', {
          attr: { style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; justify-content: space-between; gap: 4px; cursor: pointer;' }
        });

        ritmoCard.innerHTML = `
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span class="snoopy-micro" style="font-weight: 700; color: #a1a1aa; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px;">
                <span class="snoopy-icon-ritmo-ciclo"></span>
                <span>Ritmo do Ciclo</span>
              </span>
              <span class="snoopy-micro" style="font-weight: 700; color: ${minutosHoje >= metaMinutos ? '#86efac' : '#a1a1aa'};">${minutosHoje}/${metaMinutos}m</span>
            </div>
            <div class="snoopy-prog-track" style="height: 4px; width: 100%;">
              <div class="snoopy-prog-fill" style="width: ${pctMetaFoco}%; background: ${minutosHoje >= metaMinutos ? '#86efac' : 'var(--interactive-accent, #60a5fa)'};"></div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top: 2px;">
            <span class="snoopy-meta" style="font-size: 11px;">Questões: <strong style="color: var(--text-normal);">${questoesHoje}</strong></span>
            <span class="snoopy-todo-source" style="font-size: 10px; padding: 1px 6px;">+ Nova Matéria</span>
          </div>
          <div class="snoopy-micro" style="color: #71717a; font-size: 10px; line-height: 1.2;">
            Próxima Matéria: cadastre no painel para alternar.
          </div>
        `;

        const iconRitmo = ritmoCard.querySelector('.snoopy-icon-ritmo-ciclo');
        if (iconRitmo && ctx.renderIcon) ctx.renderIcon(iconRitmo, 'timer', { size: 12, color: '#a1a1aa' });

        ritmoCard.onclick = () => {
          app.workspace.openLinkText("03_Estudos/Painel de Estudos.md", "", false);
        };
      }
    } else {
      const emptyEstudos = estudosCol.createEl('div', {
        attr: { class: 'snoopy-meta', style: 'padding: 24px 0; text-align: center; width: 100%; font-size: 14px;' },
        text: 'Nenhuma matéria cadastrada. Clique no título para criar seu primeiro plano de estudos!'
      });
    }

    // =========================================================================
    // 2. COLUNA DIREITA: BOOKSHELF DE LEITURAS (ESTILO KOREADER)
    // =========================================================================
    const leiturasCol = showcaseGrid.createEl('div', { 
      cls: 'snoopy-card-box', 
      attr: { style: 'display: flex; flex-direction: column; gap: 10px; padding: 14px 16px;' } 
    });

    // Cálculo sutil da ofensiva de leitura para lembrete
    const dailyPagesLeitura = dv.pages('"01_Inbox/Diário"');
    let streakLeitura = 0;
    let pagsHoje = 0;
    const mapaDiasLeitura = new Map();
    dailyPagesLeitura.forEach(dp => {
      const dName = dp.file ? dp.file.name : '';
      if (/^\d{4}-\d{2}-\d{2}$/.test(dName)) {
        const pags = Number(dp.paginas_lidas) || 0;
        mapaDiasLeitura.set(dName, pags);
        if (dName === todayStr) pagsHoje = pags;
      }
    });

    const shiftData = (dStr, delta) => {
      const p = dStr.split('-').map(Number);
      const d = new Date(p[0], p[1] - 1, p[2] + delta);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    };

    let cursorStreak = (pagsHoje >= 20) ? todayStr : shiftData(todayStr, -1);
    while (true) {
      const p = mapaDiasLeitura.get(cursorStreak) || 0;
      if (p >= 20) {
        streakLeitura++;
        cursorStreak = shiftData(cursorStreak, -1);
      } else {
        break;
      }
    }

    const leiturasHeader = leiturasCol.createEl('div', { cls: 'snoopy-card-header' });

    leiturasHeader.innerHTML = `
      <div class="snoopy-card-header-main">
        <div class="snoopy-toolbar">
          <a id="link-painel-leituras" class="snoopy-section-title-link" title="Abrir pasta de leituras">
            ${ctx.UIKit && ctx.UIKit.ICONS && ctx.UIKit.ICONS['library'] ? `<span class="snoopy-icon" style="width: 16px; height: 16px; color: var(--snoopy-muted);"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">${ctx.UIKit.ICONS['library']}</svg></span>` : ''}
            ESTANTE
            ${ctx.UIKit && ctx.UIKit.ICONS && ctx.UIKit.ICONS['arrow-up-right'] ? `<span class="snoopy-icon" style="width: 13px; height: 13px; opacity: 0.6;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="13" height="13">${ctx.UIKit.ICONS['arrow-up-right']}</svg></span>` : ''}
          </a>
          ${streakLeitura > 0 ? `<span class="snoopy-micro" style="padding: 1px 6px; border-radius: 4px; background: rgba(134, 239, 172, 0.1); color: #86efac; border: 1px solid rgba(134, 239, 172, 0.2); font-weight: 600;" title="${pagsHoje} págs lidas hoje">${streakLeitura}d ofensiva</span>` : ''}
        </div>
        <span class="snoopy-card-subtitle">Leituras ativas e biblioteca</span>
      </div>
      <button id="btn-buscar-livro-nuvem" class="snoopy-nav-pill-btn snoopy-btn-sm" title="Buscar metadados de livro na nuvem via API">+ BUSCAR NA NUVEM</button>
    `;

    const linkPainelLeituras = leiturasHeader.querySelector('#link-painel-leituras');
    if (linkPainelLeituras) {
      linkPainelLeituras.addEventListener('click', (e) => {
        e.preventDefault();
        app.workspace.openLinkText("04_Leituras/Painel de Leituras.md", "", false);
      });
    }

    const todosLivros = dv.pages('"04_Leituras/Livros"')
      .where(l => !l.file.name.includes("Template"))
      .sort(l => l.file.mtime, 'desc');

    const listaLivros = [...todosLivros];

    // Coleta série dos últimos 7 dias de Leitura para o gráfico
    const ultimos7Leituras = getUltimos7Dias(todayStr).map(d => ({
      ...d,
      valor: mapaDiasLeitura.get(d.dateStr) || 0
    }));

    const pagsSemana = ultimos7Leituras.reduce((acc, d) => acc + d.valor, 0);

    // Função auxiliar para incremento rápido de páginas na nota do livro e diário
    const registrarPaginasRapidas = async (livro, delta) => {
      try {
        if (!app || !app.vault) return;
        const file = app.vault.getAbstractFileByPath(livro.file.path);
        if (!file) return;
        const content = await app.vault.read(file);
        const curAtual = Number(livro.current_page) || 0;
        const totAtual = Number(livro.total_pages) || 100;
        const novoCur = Math.min(totAtual, Math.max(0, curAtual + delta));
        let updated = content;
        if (/current_page:\s*\d+/.test(updated)) {
          updated = updated.replace(/current_page:\s*\d+/, `current_page: ${novoCur}`);
        } else {
          updated = updated.replace(/^---\n/, `---\ncurrent_page: ${novoCur}\n`);
        }
        if (novoCur >= totAtual && /status:\s*["']?[^"'\n]+["']?/.test(updated)) {
          updated = updated.replace(/status:\s*["']?[^"'\n]+["']?/, 'status: "Lido"');
        }
        if (typeof app.vault.modify === 'function') {
          await app.vault.modify(file, updated);
        }

        // Incrementa páginas lidas na nota diária
        try {
          const dFile = app.vault.getAbstractFileByPath(`01_Inbox/Diário/${todayStr}.md`);
          if (dFile && typeof app.vault.modify === 'function') {
            const dContent = await app.vault.read(dFile);
            const matchPag = dContent.match(/paginas_lidas:\s*(\d+)/);
            const pagAtual = matchPag ? Number(matchPag[1]) : 0;
            const novaPag = pagAtual + delta;
            let dUpdated = dContent;
            if (matchPag) {
              dUpdated = dUpdated.replace(/paginas_lidas:\s*\d+/, `paginas_lidas: ${novaPag}`);
            } else {
              dUpdated = dUpdated.replace(/^---\n/, `---\npaginas_lidas: ${novaPag}\n`);
            }
            await app.vault.modify(dFile, dUpdated);
          }
        } catch (e) {}

        if (typeof Notice !== 'undefined') {
          new Notice(`[Snoopy] +${delta} páginas registradas em "${livro.title || livro.file.name}"! (${novoCur}/${totAtual})`);
        }
      } catch (err) {
        console.error('[Snoopy] Erro ao incrementar páginas:', err);
      }
    };

    if (listaLivros.length === 0) {
      const emptyShelf = leiturasCol.createEl('div', {
        attr: { class: 'snoopy-meta', style: 'padding: 24px 0; text-align: center; width: 100%; font-size: 14px;' },
        text: 'Nenhum livro cadastrado. Use "+ BUSCAR NA NUVEM" para adicionar!'
      });
    } else {
      // Livro em Destaque (Preferencialmente em status "Lendo")
      const livroLendo = listaLivros.find(l => String(l.status).toLowerCase().includes('lendo')) || listaLivros[0];
      const curL = Number(livroLendo.current_page) || 0;
      const totL = Number(livroLendo.total_pages) || 100;
      const pctL = totL > 0 ? Math.round((curL / totL) * 100) : 0;
      const paginasRest = Math.max(0, totL - curL);

      // Mini Hero Box KOReader Compacto com Alinhamento Preciso
      const miniHero = leiturasCol.createEl('div', {
        cls: 'snoopy-bookshelf-card-hero',
        attr: { style: 'display: grid; grid-template-columns: 52px 1fr; gap: 10px; padding: 9px 12px; align-items: center;' }
      });

      const coverSrc = livroLendo.cover || "https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg";
      miniHero.innerHTML = `
        <img src="${coverSrc}" style="width: 52px; height: 76px; border-radius: 4px; object-fit: cover; border: 1px solid var(--background-modifier-border); cursor: pointer;" onerror="this.src='https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg';" />
        <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden; flex: 1;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <div style="display: flex; align-items: center; gap: 6px;">
              <span class="snoopy-micro" style="color: var(--interactive-accent, #60a5fa); font-weight: 700; text-transform: uppercase;">Lendo Agora</span>
              ${livroLendo.category ? `<span class="snoopy-micro" style="color: #a1a1aa; font-size: 10.5px; opacity: 0.8;">• ${livroLendo.category}</span>` : ''}
            </div>
            <span class="prio-badge prio-media" style="font-size: 10.5px; padding: 1px 6px;">${pctL}%</span>
          </div>
          <div style="font-size: 15px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer;">
            ${livroLendo.title || livroLendo.file.name}
          </div>
          <div style="font-size: 12px; font-style: italic; color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
            ${livroLendo.author || 'Autor desconhecido'}
          </div>
          <div style="margin-top: 2px;">
            <div class="snoopy-prog-track" style="height: 4px; width: 100%;">
              <div class="snoopy-prog-fill" style="width: ${pctL}%; background: var(--interactive-accent, #60a5fa);"></div>
            </div>
            <div class="snoopy-meta" style="font-size: 11px; margin-top: 3px; display: flex; justify-content: space-between; align-items: center;">
              <span>${curL}/${totL} págs • restam ${paginasRest} págs</span>
              <div style="display: flex; align-items: center; gap: 4px;">
                <button id="btn-step-5" class="snoopy-btn-action snoopy-btn-sm" title="Registrar +5 páginas lidas" style="font-size: 9.5px; padding: 1px 5px; height: 19px;">+5</button>
                <button id="btn-step-10" class="snoopy-btn-action snoopy-btn-sm" title="Registrar +10 páginas lidas" style="font-size: 9.5px; padding: 1px 5px; height: 19px;">+10</button>
              </div>
            </div>
          </div>
        </div>
      `;

      miniHero.onclick = (e) => {
        const btn5 = miniHero.querySelector('#btn-step-5');
        const btn10 = miniHero.querySelector('#btn-step-10');
        if (e.target === btn5 || btn5?.contains(e.target) || e.target === btn10 || btn10?.contains(e.target)) {
          return;
        }
        app.workspace.openLinkText(livroLendo.file.path, "", false);
      };

      const btnStep5 = miniHero.querySelector('#btn-step-5');
      const btnStep10 = miniHero.querySelector('#btn-step-10');
      if (btnStep5) {
        btnStep5.onclick = async (e) => {
          e.stopPropagation();
          await registrarPaginasRapidas(livroLendo, 5);
        };
      }
      if (btnStep10) {
        btnStep10.onclick = async (e) => {
          e.stopPropagation();
          await registrarPaginasRapidas(livroLendo, 10);
        };
      }

      // =========================================================================
      // PAINEL INFERIOR DA ESTANTE: GRÁFICO SEMANAL + RITMO DIÁRIO
      // =========================================================================
      const metaDiariaLeitura = 20;
      const diasEstimados = Math.max(1, Math.ceil(paginasRest / metaDiariaLeitura));
      const pctMetaDiaria = Math.min(100, Math.round((pagsHoje / metaDiariaLeitura) * 100));

      const painelInferiorLeituras = leiturasCol.createEl('div', {
        attr: { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 8px;' }
      });

      // 1. Gráfico Semanal dos 7 Dias de Leitura
      const chartLeiturasCard = painelInferiorLeituras.createEl('div', {
        attr: { style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; justify-content: space-between; gap: 4px;' }
      });

      chartLeiturasCard.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span class="snoopy-micro" style="font-weight: 700; color: #a1a1aa; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px;">
            <span class="snoopy-icon-chart-leituras"></span>
            <span>Páginas na Semana</span>
          </span>
          <span class="snoopy-micro" style="font-weight: 700; color: #86efac;">${pagsSemana} págs</span>
        </div>
        ${renderMiniGraficoBarras({ dias: ultimos7Leituras, meta: metaDiariaLeitura, unidade: 'págs', corAtiva: '#60a5fa', corMeta: '#86efac' })}
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #71717a; border-top: 1px solid rgba(255,255,255,0.05); padding-top: 3px;">
          <span>Lidas Hoje: <strong style="color: var(--text-normal);">${pagsHoje} págs</strong></span>
          <span>Meta: ${metaDiariaLeitura}p</span>
        </div>
      `;

      const iconChartLeituras = chartLeiturasCard.querySelector('.snoopy-icon-chart-leituras');
      if (iconChartLeituras && ctx.renderIcon) ctx.renderIcon(iconChartLeituras, 'bar-chart-3', { size: 12, color: '#86efac' });

      // 2. Card de Ritmo Diário & Fila do Acervo
      const outrosLivros = listaLivros.filter(l => l.file.path !== livroLendo.file.path).slice(0, 3);

      if (outrosLivros.length > 0) {
        const ritmoCard = painelInferiorLeituras.createEl('div', {
          attr: { style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; justify-content: space-between; gap: 4px;' }
        });

        ritmoCard.innerHTML = `
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span class="snoopy-micro" style="font-weight: 700; color: #a1a1aa; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px;">
                <span class="snoopy-icon-meta-target"></span>
                <span>Ritmo Diário</span>
              </span>
              <span class="snoopy-micro" style="font-weight: 700; color: ${pagsHoje >= metaDiariaLeitura ? '#86efac' : '#a1a1aa'};">${pagsHoje}/${metaDiariaLeitura} págs</span>
            </div>
            <div class="snoopy-prog-track" style="height: 4px; width: 100%;">
              <div class="snoopy-prog-fill" style="width: ${pctMetaDiaria}%; background: ${pagsHoje >= metaDiariaLeitura ? '#86efac' : 'var(--interactive-accent, #60a5fa)'};"></div>
            </div>
          </div>
          <div style="display: flex; flex-direction: column; gap: 3px; margin-top: 2px;">
            <div style="display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; color: #71717a;">
              <span>No Acervo: <strong style="color: var(--text-normal);">${listaLivros.length}</strong></span>
              <span class="snoopy-meta" style="font-size: 10.5px;">~${diasEstimados}d conclusão</span>
            </div>
            <div style="display: flex; gap: 4px; overflow: hidden;">
              ${outrosLivros.map(b => `
                <span class="snoopy-todo-source" style="font-size: 10px; padding: 1px 6px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 90px;" title="${b.title || b.file.name}">
                  ${b.title || b.file.name}
                </span>
              `).join('')}
            </div>
          </div>
        `;

        const iconMetaTarget = ritmoCard.querySelector('.snoopy-icon-meta-target');
        if (iconMetaTarget && ctx.renderIcon) ctx.renderIcon(iconMetaTarget, 'target', { size: 12, color: '#a1a1aa' });
      } else {
        // CASO DE LIVRO ÚNICO
        const ritmoCard = painelInferiorLeituras.createEl('div', {
          attr: { style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 8px 10px; display: flex; flex-direction: column; justify-content: space-between; gap: 4px; cursor: pointer;' }
        });

        ritmoCard.innerHTML = `
          <div>
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
              <span class="snoopy-micro" style="font-weight: 700; color: #a1a1aa; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px;">
                <span class="snoopy-icon-meta-target"></span>
                <span>Ritmo Diário</span>
              </span>
              <span class="snoopy-micro" style="font-weight: 700; color: ${pagsHoje >= metaDiariaLeitura ? '#86efac' : '#a1a1aa'};">${pagsHoje}/${metaDiariaLeitura} págs</span>
            </div>
            <div class="snoopy-prog-track" style="height: 4px; width: 100%;">
              <div class="snoopy-prog-fill" style="width: ${pctMetaDiaria}%; background: ${pagsHoje >= metaDiariaLeitura ? '#86efac' : 'var(--interactive-accent, #60a5fa)'};"></div>
            </div>
          </div>
          <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top: 2px;">
            <span class="snoopy-meta" style="font-size: 11px;">No Acervo: <strong style="color: var(--text-normal);">${listaLivros.length} livro</strong></span>
            <span class="snoopy-todo-source" style="font-size: 10px; padding: 1px 6px;">+ Adicionar</span>
          </div>
          <div class="snoopy-micro" style="color: #71717a; font-size: 10px; line-height: 1.2;">
            Próxima Leitura: ~${diasEstimados} dias restantes (20p/dia).
          </div>
        `;

        const iconMetaTarget = ritmoCard.querySelector('.snoopy-icon-meta-target');
        if (iconMetaTarget && ctx.renderIcon) ctx.renderIcon(iconMetaTarget, 'target', { size: 12, color: '#a1a1aa' });

        ritmoCard.onclick = () => {
          abrirModalBuscaLivro();
        };
      }
    }

    // =========================================================================
    // 3. MODAL DE BUSCA DE LIVROS NA NUVEM VIA API (KO-READER ASSISTANT)
    // =========================================================================
    function abrirModalBuscaLivro() {
      if (ctx.ModalFactory) {
        ctx.ModalFactory.abrir({
          maxWidth: '480px',
          htmlContent: `
            <div class="snoopy-card-header">
              <span class="snoopy-section-title">Buscar Livro no Bookshelf</span>
              <button class="snoopy-modal-close" title="Fechar"></button>
            </div>
            <div class="snoopy-modal-label">Digite o título ou autor (busca online via Open Library):</div>
            
            <div class="snoopy-toolbar">
              <input id="modal-book-search-input" class="snoopy-form-input" type="text" placeholder="Ex: Hábitos Atômicos, Clean Code..." style="flex: 1;">
              <button id="modal-book-search-btn" class="snoopy-btn-primary snoopy-btn-sm">Buscar</button>
            </div>

            <div id="modal-book-results" style="max-height: 320px; overflow-y: auto; display: flex; flex-direction: column; gap: 8px; margin-top: 4px; padding-right: 4px;">
              <div class="snoopy-meta" style="text-align: center; padding: 20px 0;">Digite o termo e clique em "Buscar".</div>
            </div>
          `,
          onMontar: (box, fechar) => {
            const inputSearch = box.querySelector('#modal-book-search-input');
            const btnSearch = box.querySelector('#modal-book-search-btn');
            const resultsContainer = box.querySelector('#modal-book-results');

            async function executarBusca() {
              const query = inputSearch ? inputSearch.value.trim() : '';
              if (!query) return;

              resultsContainer.innerHTML = '<div class="snoopy-meta" style="text-align: center; padding: 20px 0;">Consultando acervo na nuvem...</div>';

              try {
                const url = `https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=5`;
                const res = await fetch(url);
                const data = await res.json();

                if (!data.docs || data.docs.length === 0) {
                  resultsContainer.innerHTML = '<div class="snoopy-meta" style="color: #fca5a5; text-align: center; padding: 20px 0;">Nenhum livro encontrado para essa busca.</div>';
                  return;
                }

                resultsContainer.innerHTML = '';
                data.docs.forEach(doc => {
                  const titulo = doc.title || 'Sem título';
                  const autor = doc.author_name ? doc.author_name.join(', ') : 'Autor desconhecido';
                  const paginas = doc.number_of_pages_median || 250;
                  const ano = doc.first_publish_year || '';
                  const coverId = doc.cover_i;
                  const coverUrl = coverId ? `https://covers.openlibrary.org/b/id/${coverId}-M.jpg` : 'https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg';

                  const itemCard = resultsContainer.createEl('div', {
                    attr: {
                      style: 'display: flex; gap: 10px; align-items: center; background: #181824; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 8px; cursor: pointer; transition: background 0.12s ease;'
                    }
                  });

                  itemCard.innerHTML = `
                    <img src="${coverUrl}" style="width: 38px; height: 56px; border-radius: 4px; object-fit: cover; flex-shrink: 0;" />
                    <div style="flex: 1; overflow: hidden; display: flex; flex-direction: column; gap: 2px;">
                      <span style="font-size: 15.5px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${titulo}</span>
                      <span style="font-size: 14px; color: #a1a1aa; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${autor}</span>
                      <span class="snoopy-micro" style="color: #71717a;">${paginas} páginas ${ano ? `• ${ano}` : ''}</span>
                    </div>
                    <button class="snoopy-btn-action snoopy-btn-sm" style="flex-shrink: 0;">Salvar +</button>
                  `;

                  itemCard.addEventListener('click', async () => {
                    const cleanTitle = titulo.replace(/[\\/:*?"<>|]/g, '-').trim();
                    const targetPath = `04_Leituras/Livros/${cleanTitle}.md`;
                    
                    if (!app.vault.getAbstractFileByPath("04_Leituras/Livros")) {
                      await app.vault.createFolder("04_Leituras/Livros").catch(() => {});
                    }

                    const tplFile = app.vault.getAbstractFileByPath("99_Meta/Templates/Template - Livro.md");
                    let content = "";
                    if (tplFile) {
                      const raw = await app.vault.read(tplFile);
                      content = raw.replace(/{{title}}/g, cleanTitle)
                                   .replace(/{{author}}/g, autor)
                                   .replace(/{{category}}/g, "Geral")
                                   .replace(/{{publisher}}/g, "")
                                   .replace(/{{publishDate}}/g, String(ano))
                                   .replace(/{{totalPage}}/g, String(paginas))
                                   .replace(/{{coverUrl}}/g, coverUrl)
                                   .replace(/{{description}}/g, `Livro cadastrado automaticamente via busca na nuvem (Open Library).`);
                    } else {
                      content = `---\ntitle: "${cleanTitle}"\nauthor: "${autor}"\ntotal_pages: ${paginas}\ncurrent_page: 0\nstatus: "Quero ler"\ncover: "${coverUrl}"\ntags: [leitura, livro]\n---\n\n# ${cleanTitle}\n\n`;
                    }

                    const newFile = await app.vault.create(targetPath, content);
                    new Notice(`Livro "${cleanTitle}" adicionado à estante!`);
                    fechar();
                    await app.workspace.openLinkText(newFile.path, "", false);
                  });
                });

              } catch(err) {
                resultsContainer.innerHTML = `<div class="snoopy-meta" style="color: #fca5a5; text-align: center; padding: 20px 0;">Erro ao consultar nuvem: ${err.message || 'Verifique a conexão'}.</div>`;
              }
            }

            if (btnSearch) btnSearch.addEventListener('click', executarBusca);
            if (inputSearch) {
              inputSearch.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  executarBusca();
                }
              });
              setTimeout(() => inputSearch.focus(), 50);
            }
          }
        });
      }
    }

    const btnBuscarNuvem = leiturasHeader.querySelector('#btn-buscar-livro-nuvem');
    if (btnBuscarNuvem) btnBuscarNuvem.addEventListener('click', abrirModalBuscaLivro);
  }
};
