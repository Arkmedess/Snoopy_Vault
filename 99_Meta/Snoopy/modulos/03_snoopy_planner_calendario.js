/**
 * Snoopy Vault - Módulo 03: Planner & Calendário Mensal
 * Cockpit de planejamento mensal e semanal integrado na Home:
 * - Visão geral de blocos de estudo, revisões espaçadas e tarefas do vault no calendário.
 * - Flags visuais de tarefas pendentes/atrasadas, estudos agendados, revisões e foco.
 * - Filtro reativo que atualiza a Central de Tarefas via Barramento de Eventos (tarefas:filtrar-data).
 * - Barra de agendamento rápido inline com sincronização automática na nota diária.
 *
 * @module modulos/03_snoopy_planner_calendario
 */
return {
  id: 'snoopy_planner_calendario',
  titulo: 'Planner & Calendário Mensal',

  /**
   * Ponto de entrada do ciclo de vida de renderização do Módulo Planner.
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

    const padTime = (n) => String(n).padStart(2, '0');
    const formatarDataBR = (dStr) => {
      if (!dStr) return '';
      const p = dStr.split('-');
      if (p.length === 3) return `${p[2]}/${p[1]}/${p[0]}`;
      return dStr;
    };

    const getSvgIcon = (name, size = 12, color = 'currentColor') => {
      const inner = (ctx.UIKit && ctx.UIKit.ICONS && ctx.UIKit.ICONS[name]) || '';
      if (!inner) return '';
      return `<span class="snoopy-icon" style="width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; flex-shrink: 0;"><svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}" style="display: block;">${inner}</svg></span>`;
    };

    const mesesNomes = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    const diasSemanaNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    const now = new Date();
    let plannerAno = now.getFullYear();
    let plannerMes = now.getMonth();
    let diaFiltroSelecionado = null; // Inicialmente sem filtro para ver visão ampla

    // 1. Carregamento de dados de estudos e ciclo
    let cicloData = {
      disciplinaAtualIdx: 0,
      cicloOrdem: [],
      historicoDiario: {},
      revisoes: [],
      planner: {}
    };

    try {
      const cicloFile = app.vault.getAbstractFileByPath("99_Meta/ciclo-estudos.json");
      if (cicloFile) {
        const raw = await app.vault.read(cicloFile);
        const parsed = JSON.parse(raw);
        cicloData = { ...cicloData, ...parsed };
      }
    } catch (e) {
      console.warn('[Snoopy Planner] Não foi possível carregar ciclo-estudos.json:', e);
    }

    const salvarCicloData = async () => {
      try {
        const cicloFile = app.vault.getAbstractFileByPath("99_Meta/ciclo-estudos.json");
        if (cicloFile && typeof app.vault.modify === 'function') {
          await app.vault.modify(cicloFile, JSON.stringify(cicloData, null, 2));
        }
      } catch (err) {
        console.error('[Snoopy Planner] Erro ao salvar dados no ciclo-estudos.json:', err);
      }
    };

    // 2. Mapeamento dinâmico de tarefas com prazo por data no Vault
    function mapearTarefasDoVault() {
      const mapa = new Map(); // dataIso -> { total, pendentes, atrasadas, concluidas, items: [] }
      if (!dv || typeof dv.pages !== 'function') return mapa;

      try {
        const escopo = dv.pages('"01_Inbox" or "02_Projetos" or "03_Estudos" or "04_Leituras"');
        let tasks = [];

        if (escopo && escopo.file && escopo.file.tasks) {
          tasks = typeof escopo.file.tasks.where === 'function'
            ? escopo.file.tasks.where(t => !t.text.includes('Leitura 20 min') && !t.text.includes('Pomodoro 4x') && !t.text.includes('Exercício Físico'))
            : escopo.file.tasks;
        } else if (escopo && typeof escopo.where === 'function') {
          const filtered = escopo.where(p => p && p.file && (!p.file.path || (!p.file.path.includes('Template') && !p.file.path.includes('00_Home'))));
          if (filtered && filtered.file && filtered.file.tasks) {
            tasks = typeof filtered.file.tasks.where === 'function' ? filtered.file.tasks.where(t => true) : filtered.file.tasks;
          }
        }

        if (Array.isArray(tasks) || (tasks && typeof tasks.forEach === 'function')) {
          tasks.forEach(t => {
            if (!t || !t.text) return;
            let dueIso = null;
            const matchIso = t.text.match(/(?:due:|📅)\s*(\d{4}-\d{2}-\d{2})/);
            if (matchIso) {
              dueIso = matchIso[1];
            } else {
              const matchBr = t.text.match(/(?:due:|📅)\s*(\d{2}[-/]\d{2}[-/]\d{4})/);
              if (matchBr && ctx.DateUtils && typeof ctx.DateUtils.normalizarParaISO === 'function') {
                dueIso = ctx.DateUtils.normalizarParaISO(matchBr[1]);
              }
            }

            if (dueIso) {
              if (!mapa.has(dueIso)) {
                mapa.set(dueIso, { total: 0, pendentes: 0, atrasadas: 0, concluidas: 0, items: [] });
              }
              const info = mapa.get(dueIso);
              info.total++;
              info.items.push(t);
              if (t.completed) {
                info.concluidas++;
              } else {
                info.pendentes++;
                if (dueIso < todayStr) {
                  info.atrasadas++;
                }
              }
            }
          });
        }
      } catch (err) {
        console.warn('[Snoopy Planner] Falha ao mapear tarefas:', err);
      }

      return mapa;
    }

    // Coleta matérias disponíveis no vault
    const materiasDisponiveis = [];
    try {
      const pEstudos = dv.pages('"03_Estudos"')
        .where(e => !e.file.name.includes("Template") && !e.file.name.includes("Painel"));
      pEstudos.forEach(e => {
        materiasDisponiveis.push({
          nome: e.title || e.file.name,
          path: e.file.path,
          disciplina: e.disciplina || 'Geral'
        });
      });
    } catch (e) {}

    // Sincronização de bloco agendado na nota diária
    const sincronizarBlocoNaNotaDiaria = async (dataVal, matVal, tipoVal, tempoVal) => {
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
      } catch (err) {
        console.error('[Snoopy Planner] Erro ao sincronizar com diário:', err);
      }
    };

    // Coleta livros em leitura ativa no acervo
    function coletarLivrosAtivos() {
      const lista = [];
      if (!dv || typeof dv.pages !== 'function') return lista;
      try {
        const pLivros = dv.pages('"04_Leituras/Livros"');
        let rawList = [];
        if (pLivros && typeof pLivros.where === 'function') {
          const flt = pLivros.where(l => l && l.file && !l.file.name.includes("Template") && (!l.status || String(l.status).toLowerCase().includes('lendo')));
          if (Array.isArray(flt)) {
            rawList = flt;
          } else if (flt && typeof flt[Symbol.iterator] === 'function') {
            rawList = [...flt];
          } else if (flt && typeof flt.forEach === 'function') {
            flt.forEach(item => rawList.push(item));
          }
        } else if (Array.isArray(pLivros)) {
          rawList = pLivros.filter(l => l && l.file && !l.file.name.includes("Template") && (!l.status || String(l.status).toLowerCase().includes('lendo')));
        }
        rawList.forEach(l => {
          if (l && l.file) {
            lista.push({
              titulo: l.title || l.file.name,
              autor: l.author || l.autor || 'Autor não informado',
              current_page: Number(l.current_page) || 0,
              total_pages: Number(l.total_pages) || 100,
              path: l.file.path
            });
          }
        });
      } catch (e) {
        console.warn('[Snoopy Planner] Erro ao coletar livros ativos:', e);
      }
      return lista;
    }

    // Incremento rápido de páginas na nota do livro e na nota diária
    const incrementarPaginasLivro = async (livroPath, delta) => {
      if (!livroPath || !app || !app.vault) return;
      try {
        const file = app.vault.getAbstractFileByPath(livroPath);
        if (!file) return;
        const content = await app.vault.read(file);
        const matchCur = content.match(/current_page:\s*(\d+)/);
        const matchTot = content.match(/total_pages:\s*(\d+)/);
        const curAtual = matchCur ? Number(matchCur[1]) : 0;
        const totAtual = matchTot ? Number(matchTot[1]) : 100;
        const novoCur = Math.min(totAtual, Math.max(0, curAtual + delta));
        let updated = content;
        if (matchCur) {
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

        try {
          const dFile = app.vault.getAbstractFileByPath(`01_Inbox/Diário/${todayStr}.md`);
          if (dFile && typeof app.vault.modify === 'function') {
            const dContent = await app.vault.read(dFile);
            const mPag = dContent.match(/paginas_lidas:\s*(\d+)/);
            const pAtual = mPag ? Number(mPag[1]) : 0;
            const novaP = pAtual + delta;
            let dUp = dContent;
            if (mPag) {
              dUp = dUp.replace(/paginas_lidas:\s*\d+/, `paginas_lidas: ${novaP}`);
            } else {
              dUp = dUp.replace(/^---\n/, `---\npaginas_lidas: ${novaP}\n`);
            }
            await app.vault.modify(dFile, dUp);
          }
        } catch (e) {}

        if (typeof Notice !== 'undefined') {
          new Notice(`[Snoopy] +${delta} páginas registradas! (${novoCur}/${totAtual})`);
        }
        renderizarPlannerCompleto();
      } catch (err) {
        console.error('[Snoopy Planner] Erro ao incrementar páginas de leitura:', err);
      }
    };

    // Container principal da seção do Planner
    const plannerSection = root.createEl('div', {
      cls: 'snoopy-planner-section',
      attr: { style: 'margin-bottom: 24px; display: flex; flex-direction: column; gap: 12px;' }
    });

    function renderizarPlannerCompleto() {
      plannerSection.innerHTML = '';

      const mapaTarefas = mapearTarefasDoVault();
      const totalDiasMes = new Date(plannerAno, plannerMes + 1, 0).getDate();
      const prefixMes = `${plannerAno}-${padTime(plannerMes + 1)}-`;

      // Estatísticas do mês
      let totalBlocosMes = 0;
      let diasComFocoMes = 0;
      let revisoesNoMes = 0;
      let tarefasNoMes = 0;
      const proximosBlocos = [];

      if (cicloData.planner) {
        Object.keys(cicloData.planner).sort().forEach(dKey => {
          const lista = Array.isArray(cicloData.planner[dKey]) ? cicloData.planner[dKey] : [];
          if (dKey.startsWith(prefixMes)) totalBlocosMes += lista.length;
          if (dKey >= todayStr) {
            lista.forEach((b, idx) => proximosBlocos.push({ dataStr: dKey, idx, categoria: 'estudo', ...b }));
          }
        });
      }

      if (cicloData.historicoDiario) {
        Object.keys(cicloData.historicoDiario).forEach(dKey => {
          if (dKey.startsWith(prefixMes) && (Number(cicloData.historicoDiario[dKey]?.minutosFoco) > 0 || Number(cicloData.historicoDiario[dKey]?.questoesFeitas) > 0)) {
            diasComFocoMes++;
          }
        });
      }

      if (Array.isArray(cicloData.revisoes)) {
        cicloData.revisoes.forEach(r => {
          if (r && r.status === 'programada' && String(r.proximaRevisao || '').startsWith(prefixMes)) {
            revisoesNoMes++;
          }
        });
      }

      mapaTarefas.forEach((v, k) => {
        if (k.startsWith(prefixMes)) {
          tarefasNoMes += v.pendentes;
        }
      });

      // =========================================================================
      // 1. CABEÇALHO SUPERIOR (TÍTULO LIMPO SEM LINK FORÇADO + NAVEGAÇÃO)
      // =========================================================================
      const topCard = plannerSection.createEl('div', {
        cls: 'snoopy-card-box',
        attr: { style: 'display: flex; flex-direction: column; gap: 10px; padding: 12px 16px;' }
      });

      // Estilo local para evitar sobreposição da data com o ícone nativo do navegador
      topCard.innerHTML = `
        <style>
          #planner-quick-data::-webkit-calendar-picker-indicator {
            cursor: pointer;
            filter: invert(0.8);
            margin-left: 6px;
          }
        </style>
        <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
          <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
            <div class="snoopy-toolbar" style="gap: 8px;">
              ${ctx.UIKit && ctx.UIKit.ICONS && ctx.UIKit.ICONS['calendar'] ? `<span class="snoopy-icon" style="width: 16px; height: 16px; color: var(--snoopy-muted); display: inline-flex; align-items: center; justify-content: center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="16" height="16">${ctx.UIKit.ICONS['calendar']}</svg></span>` : ''}
              <span class="snoopy-section-title" style="letter-spacing: 0.5px;">PLANNER & CALENDÁRIO</span>
            </div>
            <div style="display: flex; gap: 6px; align-items: center; flex-wrap: wrap;">
              <span class="snoopy-micro" style="padding: 2px 7px; border-radius: 4px; background: rgba(96, 165, 250, 0.12); color: #93c5fd; border: 1px solid rgba(96, 165, 250, 0.2);">${totalBlocosMes} bloco(s)</span>
              <span class="snoopy-micro" style="padding: 2px 7px; border-radius: 4px; background: rgba(168, 85, 247, 0.12); color: #d8b4fe; border: 1px solid rgba(168, 85, 247, 0.2);">${revisoesNoMes} revisão(ões)</span>
              <span class="snoopy-micro" style="padding: 2px 7px; border-radius: 4px; background: rgba(248, 113, 113, 0.12); color: #fca5a5; border: 1px solid rgba(248, 113, 113, 0.2);">${tarefasNoMes} tarefa(s) pendente(s)</span>
              <span class="snoopy-micro" style="padding: 2px 7px; border-radius: 4px; background: rgba(134, 239, 172, 0.12); color: #86efac; border: 1px solid rgba(134, 239, 172, 0.2);">${diasComFocoMes} dia(s) com foco</span>
            </div>
          </div>

          <div style="display: flex; align-items: center; gap: 6px;">
            <button id="btn-planner-prev" class="snoopy-btn-action snoopy-btn-sm" style="padding: 3px 7px; height: 26px;" title="Mês anterior">
              <span class="snoopy-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="15 18 9 12 15 6"/></svg></span>
            </button>
            <span id="planner-mes-ano-txt" class="snoopy-meta" style="font-size: 13px; font-weight: 700; color: var(--text-normal); min-width: 140px; text-align: center;">
              ${mesesNomes[plannerMes]} de ${plannerAno}
            </span>
            <button id="btn-planner-next" class="snoopy-btn-action snoopy-btn-sm" style="padding: 3px 7px; height: 26px;" title="Próximo mês">
              <span class="snoopy-icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="12" height="12"><polyline points="9 18 15 12 9 6"/></svg></span>
            </button>
            <button id="btn-planner-hoje" class="snoopy-nav-pill-btn snoopy-btn-sm" style="font-size: 11px; padding: 2px 8px; height: 26px;">Hoje</button>
          </div>
        </div>

        <!-- Barra de Agendamento Rápido Inline com Espaçamento Amplo no Input de Data -->
        <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 8px; background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 6px 10px;">
          <span class="snoopy-micro" style="font-weight: 700; color: var(--text-muted); text-transform: uppercase;">Agendar:</span>
          <input id="planner-quick-data" type="date" value="${diaFiltroSelecionado || todayStr}" style="width: 135px; min-width: 135px; box-sizing: border-box; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 8px; font-size: 11.5px; color: var(--text-normal); outline: none;">
          <select id="planner-quick-mat" style="flex: 1.2; min-width: 140px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 6px; font-size: 11.5px; color: var(--text-normal); outline: none;">
            ${materiasDisponiveis.length > 0
              ? materiasDisponiveis.map(m => `<option value="${m.nome}">${m.nome} (${m.disciplina})</option>`).join('')
              : '<option value="Estudo Geral">Estudo Geral</option>'}
          </select>
          <select id="planner-quick-tipo" style="background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 6px; font-size: 11px; color: var(--text-normal); outline: none;">
            <option value="Teoria + Questões">Teoria + Questões</option>
            <option value="Teoria">Teoria</option>
            <option value="Questões">Questões</option>
            <option value="Revisão">Revisão</option>
            <option value="Simulado / Prova">Simulado / Prova</option>
          </select>
          <input id="planner-quick-tempo" type="text" value="1h30m" placeholder="Duração" style="width: 62px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 6px; font-size: 11px; color: var(--text-normal); text-align: center; outline: none;">
          <label style="display: inline-flex; align-items: center; gap: 4px; font-size: 11px; color: var(--text-muted); cursor: pointer; user-select: none;">
            <input id="planner-quick-sync" type="checkbox" checked style="cursor: pointer;">
            <span>+ Diário</span>
          </label>
          <button id="btn-planner-salvar-bloco" class="snoopy-btn-primary snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 4px; padding: 3px 10px; height: 25px; font-size: 11px;">
            <span>+ Agendar</span>
          </button>
        </div>
      `;

      // Eventos de Navegação
      const btnPrev = topCard.querySelector('#btn-planner-prev');
      if (btnPrev) {
        btnPrev.onclick = () => {
          if (plannerMes === 0) { plannerMes = 11; plannerAno--; }
          else { plannerMes--; }
          renderizarPlannerCompleto();
        };
      }

      const btnNext = topCard.querySelector('#btn-planner-next');
      if (btnNext) {
        btnNext.onclick = () => {
          if (plannerMes === 11) { plannerMes = 0; plannerAno++; }
          else { plannerMes++; }
          renderizarPlannerCompleto();
        };
      }

      const btnHoje = topCard.querySelector('#btn-planner-hoje');
      if (btnHoje) {
        btnHoje.onclick = () => {
          plannerAno = now.getFullYear();
          plannerMes = now.getMonth();
          diaFiltroSelecionado = todayStr;
          // Notifica Central de Tarefas para sincronizar com Hoje
          if (ctx.events && typeof ctx.events.emit === 'function') {
            ctx.events.emit('tarefas:filtrar-data', { data: todayStr });
          }
          renderizarPlannerCompleto();
        };
      }

      const btnSalvarBloco = topCard.querySelector('#btn-planner-salvar-bloco');
      if (btnSalvarBloco) {
        btnSalvarBloco.onclick = async () => {
          const dataEl = topCard.querySelector('#planner-quick-data');
          const matEl = topCard.querySelector('#planner-quick-mat');
          const tipoEl = topCard.querySelector('#planner-quick-tipo');
          const tempoEl = topCard.querySelector('#planner-quick-tempo');
          const syncEl = topCard.querySelector('#planner-quick-sync');

          const dataVal = (dataEl && dataEl.value) || todayStr;
          const matVal = (matEl && matEl.value) || (materiasDisponiveis[0]?.nome || 'Estudo Geral');
          const tipoVal = (tipoEl && tipoEl.value) || 'Teoria + Questões';
          const tempoVal = (tempoEl && tempoEl.value.trim()) || '1h30m';
          const syncDiario = syncEl ? syncEl.checked : true;

          if (!cicloData.planner) cicloData.planner = {};
          if (!Array.isArray(cicloData.planner[dataVal])) cicloData.planner[dataVal] = [];
          cicloData.planner[dataVal].push({ materia: matVal, tempo: tempoVal, tipo: tipoVal });
          await salvarCicloData();

          if (syncDiario) await sincronizarBlocoNaNotaDiaria(dataVal, matVal, tipoVal, tempoVal);
          if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Agendado: ${matVal} em ${formatarDataBR(dataVal)}!`);
          renderizarPlannerCompleto();
        };
      }

      // =========================================================================
      // 2. CORPO DO PLANNER: GRADE MENSAL + PAINEL DETALHADO DE ATIVIDADES
      // =========================================================================
      const mainGrid = plannerSection.createEl('div', {
        cls: 'snoopy-planner-grid',
        attr: { style: 'display: grid; grid-template-columns: 1fr 340px; gap: 12px; align-items: start;' }
      });

      // 2.1. Grade Mensal
      const calWrapper = mainGrid.createEl('div', {
        cls: 'snoopy-card-box',
        attr: { style: 'padding: 10px 12px; display: flex; flex-direction: column; gap: 6px;' }
      });

      // Cabeçalho dos dias da semana
      const calWeekHeader = calWrapper.createEl('div', {
        attr: { style: 'display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; text-align: center; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 4px;' }
      });

      diasSemanaNomes.forEach(dNome => {
        calWeekHeader.createEl('div', {
          attr: { class: 'snoopy-meta', style: 'font-size: 10px; font-weight: 700; color: var(--text-muted); text-transform: uppercase;' },
          text: dNome
        });
      });

      const primeiroDiaSemana = new Date(plannerAno, plannerMes, 1).getDay();
      const diasMesAnterior = new Date(plannerAno, plannerMes, 0).getDate();

      const calDaysGrid = calWrapper.createEl('div', {
        attr: { style: 'display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px;' }
      });

      // Células do mês anterior
      for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
        const diaNum = diasMesAnterior - i;
        const cellOut = calDaysGrid.createEl('div', {
          attr: { style: 'min-height: 84px; padding: 5px; border-radius: 6px; background: rgba(255,255,255,0.01); border: 1px dashed rgba(255,255,255,0.04); opacity: 0.3; display: flex; flex-direction: column;' }
        });
        cellOut.innerHTML = `<span class="snoopy-meta" style="font-size: 9px; text-align: right;">${diaNum}</span>`;
      }

      // Células do mês corrente
      for (let dia = 1; dia <= totalDiasMes; dia++) {
        const dStr = `${plannerAno}-${padTime(plannerMes + 1)}-${padTime(dia)}`;
        const isHoje = dStr === todayStr;
        const isSelected = dStr === diaFiltroSelecionado;
        const dadosTarefa = mapaTarefas.get(dStr);
        const blocosDoDia = (cicloData.planner && cicloData.planner[dStr]) ? cicloData.planner[dStr] : [];
        const revsDoDia = Array.isArray(cicloData.revisoes)
          ? cicloData.revisoes.filter(r => r && r.status === 'programada' && r.proximaRevisao === dStr)
          : [];
        const histDia = cicloData.historicoDiario && cicloData.historicoDiario[dStr];
        const minFeitos = Number(histDia?.minutosFoco) || 0;

        const dayCell = calDaysGrid.createEl('div', {
          cls: `snoopy-cal-day snoopy-planner-day${isHoje ? ' today' : ''}${isSelected ? ' active' : ''}`,
          attr: {
            style: `min-height: 84px; height: auto; box-sizing: border-box; padding: 5px 6px; border-radius: 6px; background: ${isHoje ? 'rgba(96, 165, 250, 0.08)' : (isSelected ? 'rgba(96, 165, 250, 0.16)' : 'var(--background-secondary)')}; border: 1px solid ${isHoje ? 'var(--interactive-accent, #60a5fa)' : (isSelected ? '#60a5fa' : 'var(--background-modifier-border)')}; display: flex; flex-direction: column; justify-content: flex-start; gap: 3px; cursor: pointer; transition: all 0.12s ease; overflow: visible;`
          }
        });

        // Badge superior: HOJE ou Foco Realizado
        const focoBadge = minFeitos > 0
          ? `<span class="snoopy-micro" style="font-size: 8px; padding: 1px 4px; border-radius: 2px; background: rgba(134, 239, 172, 0.16); color: #86efac; font-weight: 700;">${minFeitos >= 60 ? `${Math.floor(minFeitos / 60)}h` : `${minFeitos}m`}</span>`
          : (isHoje ? `<span class="snoopy-micro" style="font-size: 7.5px; padding: 1px 4px; border-radius: 2px; background: var(--interactive-accent, #60a5fa); color: #000000; font-weight: 800;">HOJE</span>` : '<span></span>');

        // Tags dentro da célula do calendário (sem emojis literais)
        const tagsDoDia = [];

        // 1. Tag de Tarefas
        if (dadosTarefa && dadosTarefa.total > 0) {
          if (dadosTarefa.atrasadas > 0) {
            tagsDoDia.push(`
              <div class="snoopy-micro" style="padding: 2px 4px; border-radius: 3px; background: rgba(248, 113, 113, 0.15); border-left: 2px solid #f87171; color: #fca5a5; font-size: 8px; font-weight: 600; line-height: 1.2; display: flex; align-items: center; gap: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${dadosTarefa.pendentes} tarefa(s) pendentes (${dadosTarefa.atrasadas} atrasadas)">
                ${getSvgIcon('check-circle', 8, '#f87171')}
                <span style="overflow: hidden; text-overflow: ellipsis;">${dadosTarefa.pendentes} tar (${dadosTarefa.atrasadas} atr)</span>
              </div>
            `);
          } else if (dadosTarefa.pendentes > 0) {
            tagsDoDia.push(`
              <div class="snoopy-micro" style="padding: 2px 4px; border-radius: 3px; background: rgba(251, 146, 60, 0.14); border-left: 2px solid #fb923c; color: #fdba74; font-size: 8px; font-weight: 600; line-height: 1.2; display: flex; align-items: center; gap: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${dadosTarefa.pendentes} tarefa(s) pendentes">
                ${getSvgIcon('check-circle', 8, '#fb923c')}
                <span style="overflow: hidden; text-overflow: ellipsis;">${dadosTarefa.pendentes} tar</span>
              </div>
            `);
          } else if (dadosTarefa.concluidas > 0) {
            tagsDoDia.push(`
              <div class="snoopy-micro" style="padding: 2px 4px; border-radius: 3px; background: rgba(134, 239, 172, 0.12); border-left: 2px solid #86efac; color: #86efac; font-size: 8px; line-height: 1.2; display: flex; align-items: center; gap: 3px;" title="${dadosTarefa.concluidas} tarefa(s) concluídas">
                ${getSvgIcon('check', 8, '#86efac')}
                <span>Concluídas</span>
              </div>
            `);
          }
        }

        // 2. Tag de Estudos Agendados
        if (blocosDoDia && blocosDoDia.length > 0) {
          blocosDoDia.forEach(b => {
            tagsDoDia.push(`
              <div class="snoopy-micro" style="padding: 2px 4px; border-radius: 3px; background: rgba(96, 165, 250, 0.16); border-left: 2px solid #60a5fa; color: #93c5fd; font-size: 8px; font-weight: 600; line-height: 1.2; display: flex; align-items: center; gap: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Estudo: ${b.materia} (${b.tempo || '1h'})">
                ${getSvgIcon('book-open', 8, '#60a5fa')}
                <span style="overflow: hidden; text-overflow: ellipsis;">${b.materia}</span>
              </div>
            `);
          });
        }

        // 3. Tag de Revisões Espaçadas
        if (revsDoDia && revsDoDia.length > 0) {
          revsDoDia.forEach(r => {
            tagsDoDia.push(`
              <div class="snoopy-micro" style="padding: 2px 4px; border-radius: 3px; background: rgba(168, 85, 247, 0.15); border-left: 2px solid #c084fc; color: #e9d5ff; font-size: 8px; line-height: 1.2; display: flex; align-items: center; gap: 3px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="Revisão: ${r.nome}">
                ${getSvgIcon('refresh-cw', 8, '#c084fc')}
                <span style="overflow: hidden; text-overflow: ellipsis;">Rev: ${r.nome}</span>
              </div>
            `);
          });
        }

        // Exibição compacta das tags com badge de contagem caso exceda 2
        let tagsHtml = '';
        if (tagsDoDia.length <= 2) {
          tagsHtml = tagsDoDia.join('');
        } else {
          tagsHtml = tagsDoDia.slice(0, 2).join('') + `
            <span class="snoopy-micro" style="font-size: 7.5px; color: var(--text-muted); padding: 0 2px;">+${tagsDoDia.length - 2} mais</span>
          `;
        }

        dayCell.innerHTML = `
          <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 2px;">
            ${focoBadge}
            <span class="snoopy-meta" style="font-size: 10px; font-weight: ${isHoje || isSelected ? '800' : '600'}; color: ${isHoje || isSelected ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-normal)'};">
              ${dia}
            </span>
          </div>
          <div style="display: flex; flex-direction: column; gap: 2px; flex: 1;">
            ${tagsHtml}
          </div>
        `;

        // Interação de Clique: Alterna Filtro e Emite Evento para Central de Tarefas
        dayCell.onclick = () => {
          if (diaFiltroSelecionado === dStr) {
            diaFiltroSelecionado = null;
            if (ctx.events && typeof ctx.events.emit === 'function') {
              ctx.events.emit('tarefas:filtrar-data', { data: null });
            }
          } else {
            diaFiltroSelecionado = dStr;
            if (ctx.events && typeof ctx.events.emit === 'function') {
              ctx.events.emit('tarefas:filtrar-data', { data: dStr });
            }
          }

          const inputData = topCard.querySelector('#planner-quick-data');
          if (inputData && diaFiltroSelecionado) {
            inputData.value = diaFiltroSelecionado;
          }

          renderizarPlannerCompleto();
        };
      }

      // Rodapé da grade com indicador de filtro ativo
      if (diaFiltroSelecionado) {
        const calFooter = calWrapper.createEl('div', {
          attr: {
            style: 'display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid var(--background-modifier-border); font-size: 11px; color: #60a5fa;'
          }
        });

        const tarefasFiltradas = mapaTarefas.get(diaFiltroSelecionado)?.total || 0;
        calFooter.innerHTML = `
          <span>Filtro ativo: <strong>${formatarDataBR(diaFiltroSelecionado)}</strong> (${tarefasFiltradas} tarefa(s) na Central)</span>
          <button id="btn-limpar-planner-filtro" class="snoopy-btn-action snoopy-btn-sm" style="font-size: 10px; padding: 1px 7px; height: 20px;">✕ Limpar Filtro</button>
        `;

        const btnLimpar = calFooter.querySelector('#btn-limpar-planner-filtro');
        if (btnLimpar) {
          btnLimpar.onclick = () => {
            diaFiltroSelecionado = null;
            if (ctx.events && typeof ctx.events.emit === 'function') {
              ctx.events.emit('tarefas:filtrar-data', { data: null });
            }
            renderizarPlannerCompleto();
          };
        }
      }

      // =========================================================================
      // 2.2. PAINEL LATERAL RICO: DETALHAMENTO DE TAREFA, ESTUDO E LEITURA
      // =========================================================================
      const sidePanel = mainGrid.createEl('div', {
        cls: 'snoopy-card-box',
        attr: { style: 'padding: 12px 14px; display: flex; flex-direction: column; gap: 10px; min-height: 380px;' }
      });

      // Coleta detalhada e unificada de todas as atividades
      const todasAtividades = [];

      // 1. Tarefas com prazo
      mapaTarefas.forEach((info, dIso) => {
        if (info && Array.isArray(info.items)) {
          info.items.forEach(t => {
            let cleanText = (t.text || '')
              .replace(/^-\s*\[[ xX]\]\s*/, '')
              .replace(/(?:due:|📅)\s*(?:\d{4}-\d{2}-\d{2}|\d{2}[-/]\d{2}[-/]\d{4})/, '')
              .replace(/#\S+/g, '')
              .trim();

            let statusPrazo = 'futura';
            if (t.completed) {
              statusPrazo = 'concluida';
            } else if (dIso < todayStr) {
              statusPrazo = 'atrasada';
            } else if (dIso === todayStr) {
              statusPrazo = 'hoje';
            }

            todasAtividades.push({
              id: `tarefa-${dIso}-${cleanText}`,
              categoria: 'tarefa',
              dataStr: dIso,
              titulo: cleanText || 'Tarefa sem descrição',
              subtitulo: t.file ? (t.file.name || t.file.path.split('/').pop().replace('.md', '')) : 'Nota Diária',
              path: t.file ? t.file.path : '',
              completed: !!t.completed,
              statusPrazo,
              rawTask: t
            });
          });
        }
      });

      // 2. Estudos agendados no planner
      if (cicloData.planner) {
        Object.keys(cicloData.planner).forEach(dKey => {
          const lista = Array.isArray(cicloData.planner[dKey]) ? cicloData.planner[dKey] : [];
          lista.forEach((b, idx) => {
            let statusPrazo = 'futura';
            if (dKey < todayStr) statusPrazo = 'passada';
            else if (dKey === todayStr) statusPrazo = 'hoje';

            todasAtividades.push({
              id: `estudo-${dKey}-${idx}`,
              categoria: 'estudo',
              dataStr: dKey,
              titulo: b.materia || 'Estudo Geral',
              subtitulo: `${b.tipo || 'Teoria + Questões'} • ${b.tempo || '1h30m'}`,
              tempo: b.tempo || '1h30m',
              tipo: b.tipo || 'Teoria + Questões',
              idx,
              statusPrazo
            });
          });
        });
      }

      // 3. Revisões espaçadas programadas
      if (Array.isArray(cicloData.revisoes)) {
        cicloData.revisoes.forEach((r, idx) => {
          if (r && r.status === 'programada' && r.proximaRevisao) {
            const dIso = r.proximaRevisao;
            let statusPrazo = 'futura';
            if (dIso < todayStr) statusPrazo = 'atrasada';
            else if (dIso === todayStr) statusPrazo = 'hoje';

            todasAtividades.push({
              id: `revisao-${dIso}-${idx}`,
              categoria: 'revisao',
              dataStr: dIso,
              titulo: `Revisão: ${r.nome || 'Matéria'}`,
              subtitulo: `Intervalo D+${r.intervaloDias || 1} • Curva de retenção`,
              intervalo: r.intervaloDias || 1,
              materia: r.nome,
              statusPrazo
            });
          }
        });
      }

      // 4. Leituras ativas no acervo
      const livrosAtivos = coletarLivrosAtivos();
      if (livrosAtivos.length > 0) {
        livrosAtivos.forEach((l, idx) => {
          const percent = Math.round((l.current_page / (l.total_pages || 100)) * 100);
          todasAtividades.push({
            id: `leitura-${todayStr}-${idx}`,
            categoria: 'leitura',
            dataStr: todayStr,
            titulo: l.titulo,
            subtitulo: `${l.current_page}/${l.total_pages} págs (${percent}%) • Meta: 25 p/dia`,
            autor: l.autor,
            current_page: l.current_page,
            total_pages: l.total_pages,
            path: l.path,
            percent,
            statusPrazo: 'hoje'
          });
        });
      }

      // Seleção e filtragem das atividades a exibir
      let atividadesExibir = [];
      if (diaFiltroSelecionado) {
        atividadesExibir = todasAtividades.filter(a => a.dataStr === diaFiltroSelecionado);
        if (diaFiltroSelecionado === todayStr) {
          const atrasadas = todasAtividades.filter(a => a.categoria === 'tarefa' && a.statusPrazo === 'atrasada' && !a.completed);
          atrasadas.forEach(atr => {
            if (!atividadesExibir.some(x => x.id === atr.id)) {
              atividadesExibir.unshift(atr);
            }
          });
        }
      } else {
        const atrasadas = todasAtividades.filter(a => a.categoria === 'tarefa' && a.statusPrazo === 'atrasada' && !a.completed);
        const deHoje = todasAtividades.filter(a => a.dataStr === todayStr && a.statusPrazo !== 'atrasada');
        const futuras = todasAtividades.filter(a => a.dataStr > todayStr && a.statusPrazo !== 'concluida');
        futuras.sort((a, b) => a.dataStr.localeCompare(b.dataStr));
        atividadesExibir = [...atrasadas, ...deHoje, ...futuras];
      }

      const tituloSide = diaFiltroSelecionado ? `BLOCOS (${formatarDataBR(diaFiltroSelecionado)})` : 'PRÓXIMOS BLOCOS';
      const subtituloSide = diaFiltroSelecionado
        ? 'Atividades do dia selecionado'
        : 'Visão detalhada: tarefas, estudos e leituras';

      sidePanel.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 8px;">
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <span class="snoopy-section-title" style="font-size: 13px; display: inline-flex; align-items: center; gap: 6px;">
              ${getSvgIcon('target', 14, '#60a5fa')}
              <span>${tituloSide}</span>
            </span>
            <span class="snoopy-meta" style="font-size: 10px; color: var(--text-muted);">
              ${subtituloSide}
            </span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span class="snoopy-micro" style="padding: 2px 7px; border-radius: 4px; background: rgba(96, 165, 250, 0.12); color: #93c5fd; font-weight: 700; border: 1px solid rgba(96, 165, 250, 0.2);">
              ${atividadesExibir.length} atividade${atividadesExibir.length === 1 ? '' : 's'}
            </span>
            ${diaFiltroSelecionado ? `<button id="btn-side-limpar" class="snoopy-btn-action snoopy-btn-sm" style="font-size: 10px; padding: 2px 6px; height: 22px;" title="Limpar filtro de data">${getSvgIcon('x', 11, 'var(--text-muted)')}</button>` : ''}
          </div>
        </div>
      `;

      const btnSideLimpar = sidePanel.querySelector('#btn-side-limpar');
      if (btnSideLimpar) {
        btnSideLimpar.onclick = () => {
          diaFiltroSelecionado = null;
          if (ctx.events && typeof ctx.events.emit === 'function') {
            ctx.events.emit('tarefas:filtrar-data', { data: null });
          }
          renderizarPlannerCompleto();
        };
      }

      if (atividadesExibir.length === 0) {
        sidePanel.createEl('div', {
          attr: { class: 'snoopy-meta', style: 'font-size: 11.5px; padding: 32px 12px; text-align: center; color: #71717a; line-height: 1.5;' },
          text: diaFiltroSelecionado
            ? `Nenhuma atividade programada para ${formatarDataBR(diaFiltroSelecionado)}. Use o formulário acima para adicionar estudos ou crie tarefas no Vault!`
            : 'Nenhum bloco futuro agendado. Use o formulário acima para agendar estudos ou crie tarefas com prazo no Vault!'
        });
      } else {
        const listContainer = sidePanel.createEl('div', {
          attr: { style: 'display: flex; flex-direction: column; gap: 7px; max-height: 480px; overflow-y: auto; padding-right: 2px;' }
        });

        atividadesExibir.slice(0, 15).forEach(item => {
          let bordaCor = '#60a5fa';
          let badgeCatHtml = '';
          let dataBadgeHtml = '';
          let actionsHtml = '';
          let extraHtml = '';

          if (item.categoria === 'tarefa') {
            bordaCor = item.statusPrazo === 'atrasada' ? '#f87171' : (item.completed ? '#86efac' : '#fb923c');
            badgeCatHtml = item.statusPrazo === 'atrasada'
              ? `<span class="snoopy-micro" style="padding: 1px 6px; border-radius: 3px; font-weight: 700; font-size: 8px; background: rgba(248, 113, 113, 0.15); border: 1px solid rgba(248, 113, 113, 0.3); color: #fca5a5; display: inline-flex; align-items: center; gap: 3px;">${getSvgIcon('check-circle', 9, '#f87171')} TAREFA ATRASADA</span>`
              : `<span class="snoopy-micro" style="padding: 1px 6px; border-radius: 3px; font-weight: 700; font-size: 8px; background: rgba(251, 146, 60, 0.12); border: 1px solid rgba(251, 146, 60, 0.25); color: #fdba74; display: inline-flex; align-items: center; gap: 3px;">${getSvgIcon('check-circle', 9, '#fb923c')} TAREFA</span>`;

            dataBadgeHtml = `<span class="snoopy-meta" style="font-size: 9.5px; font-weight: 600; color: ${item.statusPrazo === 'atrasada' ? '#f87171' : (item.dataStr === todayStr ? '#60a5fa' : 'var(--text-muted)')};">${item.statusPrazo === 'atrasada' ? 'Atrasada' : (item.dataStr === todayStr ? 'Hoje' : formatarDataBR(item.dataStr).slice(0, 5))}</span>`;

            actionsHtml = `
              <button class="snoopy-btn-action btn-act-foco" style="font-size: 9.5px; padding: 2px 6px; height: 20px; display: inline-flex; align-items: center; gap: 3px;" title="Iniciar Foco no Pomodoro">${getSvgIcon('play', 9, '#86efac')} <span>Foco</span></button>
            `;
          } else if (item.categoria === 'estudo') {
            bordaCor = '#60a5fa';
            badgeCatHtml = `<span class="snoopy-micro" style="padding: 1px 6px; border-radius: 3px; font-weight: 700; font-size: 8px; background: rgba(96, 165, 250, 0.12); border: 1px solid rgba(96, 165, 250, 0.25); color: #93c5fd; display: inline-flex; align-items: center; gap: 3px;">${getSvgIcon('book-open', 9, '#60a5fa')} ESTUDO</span>`;
            dataBadgeHtml = `<span class="snoopy-meta" style="font-size: 9.5px; font-weight: 600; color: ${item.dataStr === todayStr ? '#60a5fa' : 'var(--text-muted)'};">${item.dataStr === todayStr ? 'Hoje' : formatarDataBR(item.dataStr).slice(0, 5)}</span>`;

            actionsHtml = `
              <button class="snoopy-btn-action btn-act-foco" style="font-size: 9.5px; padding: 2px 6px; height: 20px; display: inline-flex; align-items: center; gap: 3px;" title="Iniciar Foco no Pomodoro">${getSvgIcon('play', 9, '#86efac')} <span>Foco</span></button>
              <button class="snoopy-btn-action btn-act-del" data-dia="${item.dataStr}" data-idx="${item.idx}" style="font-size: 9.5px; padding: 2px 5px; height: 20px;" title="Remover agendamento">${getSvgIcon('x', 9, 'var(--text-muted)')}</button>
            `;
          } else if (item.categoria === 'revisao') {
            bordaCor = '#c084fc';
            badgeCatHtml = `<span class="snoopy-micro" style="padding: 1px 6px; border-radius: 3px; font-weight: 700; font-size: 8px; background: rgba(192, 132, 252, 0.12); border: 1px solid rgba(192, 132, 252, 0.25); color: #e9d5ff; display: inline-flex; align-items: center; gap: 3px;">${getSvgIcon('refresh-cw', 9, '#c084fc')} REVISÃO</span>`;
            dataBadgeHtml = `<span class="snoopy-meta" style="font-size: 9.5px; font-weight: 600; color: ${item.dataStr === todayStr ? '#60a5fa' : 'var(--text-muted)'};">${item.dataStr === todayStr ? 'Hoje' : formatarDataBR(item.dataStr).slice(0, 5)}</span>`;

            actionsHtml = `
              <button class="snoopy-btn-action btn-act-foco" style="font-size: 9.5px; padding: 2px 6px; height: 20px; display: inline-flex; align-items: center; gap: 3px;" title="Revisar no Pomodoro">${getSvgIcon('play', 9, '#c084fc')} <span>Revisar</span></button>
            `;
          } else if (item.categoria === 'leitura') {
            bordaCor = '#86efac';
            badgeCatHtml = `<span class="snoopy-micro" style="padding: 1px 6px; border-radius: 3px; font-weight: 700; font-size: 8px; background: rgba(134, 239, 172, 0.12); border: 1px solid rgba(134, 239, 172, 0.25); color: #86efac; display: inline-flex; align-items: center; gap: 3px;">${getSvgIcon('book', 9, '#86efac')} LEITURA</span>`;
            dataBadgeHtml = `<span class="snoopy-meta" style="font-size: 9.5px; font-weight: 600; color: #86efac;">Meta Diária</span>`;

            actionsHtml = `
              <button class="snoopy-btn-action btn-pag-5" data-path="${item.path}" style="font-size: 9px; padding: 2px 5px; height: 20px;" title="Registrar +5 páginas">+5p</button>
              <button class="snoopy-btn-action btn-pag-10" data-path="${item.path}" style="font-size: 9px; padding: 2px 5px; height: 20px;" title="Registrar +10 páginas">+10p</button>
            `;

            extraHtml = `
              <div style="width: 100%; height: 3px; background: rgba(255,255,255,0.06); border-radius: 2px; overflow: hidden; margin-top: 3px;">
                <div style="width: ${item.percent}%; height: 100%; background: #86efac; border-radius: 2px;"></div>
              </div>
            `;
          }

          const card = listContainer.createEl('div', {
            cls: 'snoopy-activity-card',
            attr: {
              style: `background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 3px solid ${bordaCor}; border-radius: 6px; padding: 7px 9px; display: flex; flex-direction: column; gap: 4px; transition: background 0.1s ease;`
            }
          });

          const isTaskChecked = item.completed;
          card.innerHTML = `
            <div style="display: flex; justify-content: space-between; align-items: center; gap: 6px;">
              <div style="display: flex; align-items: center; gap: 6px;">
                ${badgeCatHtml}
                ${dataBadgeHtml}
              </div>
              <div style="display: flex; align-items: center; gap: 4px;">
                ${actionsHtml}
              </div>
            </div>

            <div style="display: flex; align-items: flex-start; gap: 6px;">
              ${item.categoria === 'tarefa' ? `<input type="checkbox" class="chk-task-toggle" ${isTaskChecked ? 'checked' : ''} style="cursor: pointer; margin-top: 2px;">` : ''}
              <div style="display: flex; flex-direction: column; gap: 2px; flex: 1; overflow: hidden;">
                <span class="activity-title" style="font-size: 11.5px; font-weight: 600; color: ${isTaskChecked ? 'var(--text-muted)' : 'var(--text-normal)'}; text-decoration: ${isTaskChecked ? 'line-through' : 'none'}; line-height: 1.3; cursor: pointer;">
                  ${item.titulo}
                </span>
                <span class="snoopy-meta" style="font-size: 9.5px; color: var(--text-muted); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">
                  ${item.subtitulo}
                </span>
                ${extraHtml}
              </div>
            </div>
          `;

          // Eventos dos cards de atividade
          const titleEl = card.querySelector('.activity-title');
          if (titleEl && item.path) {
            titleEl.onclick = (e) => {
              e.stopPropagation();
              if (app && app.workspace && typeof app.workspace.openLinkText === 'function') {
                app.workspace.openLinkText(item.path, '', false);
              }
            };
          }

          const btnFoco = card.querySelector('.btn-act-foco');
          if (btnFoco) {
            btnFoco.onclick = (e) => {
              e.stopPropagation();
              const focoLabel = item.categoria === 'estudo' ? 'Estudo' : (item.categoria === 'revisao' ? 'Revisão' : 'Tarefa');
              if (typeof window.snoopySetPomodoroFocus === 'function') {
                window.snoopySetPomodoroFocus(item.titulo, focoLabel);
              }
              if (typeof window._snoopyDefinirTarefaFoco === 'function') {
                window._snoopyDefinirTarefaFoco({ texto: item.titulo, path: item.path });
              }
              if (ctx.events && typeof ctx.events.emit === 'function') {
                ctx.events.emit('pomodoro:focar-tarefa', { texto: item.titulo, path: item.path });
              }
              if (typeof Notice !== 'undefined') {
                new Notice(`[Snoopy Pomodoro] Foco: ${item.titulo}`);
              }
            };
          }

          const btnDel = card.querySelector('.btn-act-del');
          if (btnDel) {
            btnDel.onclick = async (e) => {
              e.stopPropagation();
              const dKey = btnDel.getAttribute('data-dia');
              const bIdx = parseInt(btnDel.getAttribute('data-idx'), 10);
              if (cicloData.planner && Array.isArray(cicloData.planner[dKey])) {
                cicloData.planner[dKey].splice(bIdx, 1);
                await salvarCicloData();
                renderizarPlannerCompleto();
              }
            };
          }

          const chkTask = card.querySelector('.chk-task-toggle');
          if (chkTask) {
            chkTask.onchange = async (e) => {
              e.stopPropagation();
              if (item.path && app && app.vault) {
                const f = app.vault.getAbstractFileByPath(item.path);
                if (f && typeof app.vault.read === 'function' && typeof app.vault.modify === 'function') {
                  const content = await app.vault.read(f);
                  const rawT = item.rawTask?.text || '';
                  if (rawT && content.includes(rawT)) {
                    const updated = chkTask.checked
                      ? content.replace(rawT, rawT.replace(/- \[ \]/, `- [x] ✅ ${todayStr}`))
                      : content.replace(rawT, rawT.replace(/- \[[xX]\]/, '- [ ]').replace(/✅\s*\d{4}-\d{2}-\d{2}/, '').trim());
                    await app.vault.modify(f, updated);
                    renderizarPlannerCompleto();
                  }
                }
              }
            };
          }

          const btnP5 = card.querySelector('.btn-pag-5');
          if (btnP5) {
            btnP5.onclick = async (e) => {
              e.stopPropagation();
              await incrementarPaginasLivro(item.path, 5);
            };
          }

          const btnP10 = card.querySelector('.btn-pag-10');
          if (btnP10) {
            btnP10.onclick = async (e) => {
              e.stopPropagation();
              await incrementarPaginasLivro(item.path, 10);
            };
          }
        });
      }
    }

    renderizarPlannerCompleto();
  }
};
