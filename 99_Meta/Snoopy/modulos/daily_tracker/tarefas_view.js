/**
 * Snoopy Vault - Submódulo: Lista e Renderizador de Tarefas com Cache em Memória
 * Gerencia o cache reativo de tarefas do vault, ordenação por prazos/prioridade,
 * abas de filtro rápido e cards de tarefas individuais.
 *
 * @module modulos/daily_tracker/tarefas_view
 */

const REGEX_CHECKED_TASKS = /\u{2705}\u{FE0F}?\s*(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/u;

const TarefasView = {
  /**
   * Monta o painel da Central de Tarefas.
   */
  async montar({ tasksCard, ctx, CalendarioView, abrirModalNovaTarefa, abrirModalTemplateTarefa, abrirModalMenuTarefa }) {
    const { app, dv, todayStr, DateUtils, VaultStore, TaskParser } = ctx;

    let currentViewMode = (typeof window !== 'undefined' && window.__snoopyTaskViewMode) || 'lista';
    if (currentViewMode === 'calendario') currentViewMode = 'lista';
    let tabsContainer = null;
    let setViewMode = null;

    function montarViewSwitcher(container) {
      if (!container) return;
      const switcher = container.createEl('div', {
        cls: 'snoopy-view-switcher',
        attr: { style: 'display: inline-flex; align-items: center; background: var(--snoopy-panel); border: 1px solid var(--snoopy-border); border-radius: 7px; padding: 2px; gap: 3px; margin-right: 4px;' }
      });

      const btnLista = switcher.createEl('button', {
        cls: `snoopy-btn-view-mode ${currentViewMode === 'lista' ? 'active' : ''}`,
        attr: { 'data-mode': 'lista', title: 'Visualização em Lista com Abas', 'aria-label': 'Visualização em Lista' }
      });
      if (ctx.renderIcon) ctx.renderIcon(btnLista, 'list', { size: 14 });
      else btnLista.textContent = 'Lista';

      const btnKanban = switcher.createEl('button', {
        cls: `snoopy-btn-view-mode ${currentViewMode === 'kanban' ? 'active' : ''}`,
        attr: { 'data-mode': 'kanban', title: 'Visualização em Quadro Kanban por Status', 'aria-label': 'Visualização em Quadro Kanban' }
      });
      if (ctx.renderIcon) ctx.renderIcon(btnKanban, 'kanban', { size: 14 });
      else btnKanban.textContent = 'Kanban';

      setViewMode = (mode) => {
        currentViewMode = mode;
        if (typeof window !== 'undefined') window.__snoopyTaskViewMode = mode;
        btnLista.classList.toggle('active', mode === 'lista');
        btnKanban.classList.toggle('active', mode === 'kanban');

        // No modo kanban, oculta as abas de HOJE/AMANHÃ para foco total no fluxo
        if (tabsContainer) {
          if (mode === 'kanban') {
            tabsContainer.classList.add('snoopy-hidden');
            tabsContainer.style.display = 'none';
            if (typeof tabsContainer.style.setProperty === 'function') {
              tabsContainer.style.setProperty('display', 'none', 'important');
            }
          } else {
            tabsContainer.classList.remove('snoopy-hidden');
            tabsContainer.style.display = 'flex';
            if (typeof tabsContainer.style.removeProperty === 'function') {
              tabsContainer.style.removeProperty('display');
            }
          }
        }

        renderizarTarefasDoCache();
      };

      btnLista.onclick = () => setViewMode('lista');
      btnKanban.onclick = () => setViewMode('kanban');

      return switcher;
    }

    let addTaskBtn = null;
    let addTplBtn = null;
    if (ctx.UIKit && typeof ctx.UIKit.criarCardHeader === 'function') {
      const headerEls = ctx.UIKit.criarCardHeader(tasksCard, {
        title: 'TAREFAS',
        icon: 'list-checks',
        subtitle: 'O que precisa sair hoje'
      });
      if (headerEls.actionsBox) {
        headerEls.actionsBox.style.marginLeft = 'auto';
        headerEls.actionsBox.style.display = 'flex';
        headerEls.actionsBox.style.justifyContent = 'flex-end';
      }
      montarViewSwitcher(headerEls.actionsBox);
      if (typeof abrirModalTemplateTarefa === 'function') {
        addTplBtn = ctx.UIKit.criarBotao(headerEls.actionsBox, {
          label: '+ TEMPLATE',
          variant: 'action',
          size: 'sm',
          onClick: abrirModalTemplateTarefa
        }, ctx);
      }
      addTaskBtn = ctx.UIKit.criarBotao(headerEls.actionsBox, {
        label: '+ NOVA TAREFA',
        variant: 'primary',
        size: 'sm',
        onClick: abrirModalNovaTarefa
      }, ctx);
    } else {
      const todoHeader = tasksCard.createEl('div', { cls: 'snoopy-card-header' });
      todoHeader.innerHTML = `
        <div class="snoopy-toolbar">
          <span class="snoopy-section-title">TAREFAS</span>
          <span class="snoopy-card-subtitle">O que precisa sair hoje</span>
        </div>
      `;
      const actionsBox = todoHeader.createEl('div', { cls: 'snoopy-toolbar', attr: { style: 'margin-left: auto; display: flex; justify-content: flex-end;' } });
      montarViewSwitcher(actionsBox);
      if (typeof abrirModalTemplateTarefa === 'function') {
        addTplBtn = actionsBox.createEl('button', {
          cls: 'snoopy-btn-action snoopy-btn-sm',
          text: '+ TEMPLATE'
        });
        addTplBtn.onclick = abrirModalTemplateTarefa;
      }
      addTaskBtn = actionsBox.createEl('button', {
        cls: 'snoopy-btn-primary snoopy-btn-sm',
        text: '+ NOVA TAREFA'
      });
      if (addTaskBtn) addTaskBtn.onclick = abrirModalNovaTarefa;
    }

    // Barra de Filtros / Abas (Visível no modo lista, oculta no modo kanban para otimizar espaço)
    const isTabsHidden = currentViewMode === 'kanban';
    tabsContainer = tasksCard.createEl('div', { 
      cls: `snoopy-task-tabs snoopy-toolbar ${isTabsHidden ? 'snoopy-hidden' : ''}`, 
      attr: { style: `overflow-x: auto; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05); flex-shrink: 0; min-height: 38px; ${isTabsHidden ? 'display: none !important;' : ''}` } 
    });

    const tabsDef = [
      { id: 'hoje', label: 'HOJE' },
      { id: 'amanha', label: 'AMANHÃ' },
      { id: 'semana', label: 'ESTA SEMANA' },
      { id: 'todas', label: 'PRÓXIMAS' },
      { id: 'concluidas', label: 'CONCLUÍDAS' }
    ];

    let currentTab = 'hoje';
    const tabBtns = {};
    let dataFiltroAtiva = null;

    tabsDef.forEach((t, idx) => {
      const btn = tabsContainer.createEl('button', {
        cls: `snoopy-btn-tab snoopy-btn-sm ${idx === 0 ? 'active' : ''}`,
        text: t.label
      });
      tabBtns[t.id] = btn;
      btn.onclick = () => {
        dataFiltroAtiva = null;
        if (ctx.events && typeof ctx.events.emit === 'function') {
          ctx.events.emit('tarefas:filtrar-data', { data: null });
        }
        currentTab = t.id;
        Object.values(tabBtns).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        if (currentViewMode !== 'lista') {
          currentViewMode = 'lista';
          if (typeof window !== 'undefined') window.__snoopyTaskViewMode = 'lista';
          const switcher = tasksCard.querySelector('.snoopy-view-switcher');
          if (switcher) {
            switcher.querySelectorAll('.snoopy-btn-view-mode').forEach(b => {
              b.classList.toggle('active', b.getAttribute('data-mode') === 'lista');
            });
          }
        }
        renderizarTarefasDoCache();
      };
    });

    const todoListContainer = tasksCard.createEl('div', {
      cls: 'snoopy-tasks-list-box',
      attr: { style: 'flex: 1; min-height: 0; overflow-y: auto; padding-right: 4px;' }
    });

    // Cache em memória
    let cacheTarefasPendentes = [];
    let cacheTarefasConcluidasHoje = [];

    async function recarregarEAtualizarTarefas() {
      const escopo = dv.pages('"01_Inbox" or "02_Projetos" or "03_Estudos" or "04_Leituras"')
        .where(p => p.file && !p.file.path.includes('Template') && !p.file.path.includes('00_Home') && (!p.file.name || !p.file.name.includes('Painel')));

      const allTasks = escopo.file.tasks
        .where(t => !t.text.includes('Leitura 20 min') && !t.text.includes('Pomodoro 4x') && !t.text.includes('Exercício Físico'));

      cacheTarefasPendentes = [];
      cacheTarefasConcluidasHoje = [];
      const hojeBR = DateUtils.formatarDDMMYYYY(todayStr);

      allTasks.forEach(t => {
        const meta = TaskParser.parseMetadata(t.text, todayStr, DateUtils);
        const taskObj = { taskRef: t, ...meta, completed: t.completed };

        if (t.completed) {
          const concluidaHoje = (t.path && (t.path.includes(todayStr) || t.path.includes(hojeBR))) 
            || t.text.includes(`✅ ${todayStr}`) 
            || t.text.includes(`✅ ${hojeBR}`);
          if (concluidaHoje) cacheTarefasConcluidasHoje.push(taskObj);
        } else {
          cacheTarefasPendentes.push(taskObj);
        }
      });

      renderizarTarefasDoCache();
    }

    function renderizarTarefasDoCache() {
      todoListContainer.innerHTML = '';

      if (currentViewMode === 'kanban') {
        renderizarTarefasModoKanban();
        return;
      }

      if (currentViewMode === 'calendario') {
        renderizarTarefasModoCalendario();
        return;
      }

      const amanhãStr = DateUtils.somarDias(todayStr, 1);
      const semanaStr = DateUtils.somarDias(todayStr, 7);

      let filtradas = [];

      if (dataFiltroAtiva) {
        const todas = [...cacheTarefasPendentes, ...cacheTarefasConcluidasHoje];
        filtradas = todas.filter(t => t.dueStr === dataFiltroAtiva);

        const partes = dataFiltroAtiva.split('-');
        const dataBrFormatada = partes.length === 3 ? `${partes[2]}/${partes[1]}/${partes[0]}` : dataFiltroAtiva;

        const chipFilterBox = todoListContainer.createEl('div', {
          cls: 'snoopy-task-filter-active-chip',
          attr: {
            style: 'display: flex; align-items: center; justify-content: space-between; background: rgba(96, 165, 250, 0.1); border: 1px solid rgba(96, 165, 250, 0.25); border-radius: 6px; padding: 6px 12px; margin-bottom: 8px; font-size: 11px; color: #93c5fd;'
          }
        });

        const spanTxt = chipFilterBox.createEl('span');
        spanTxt.createEl('span', { text: 'Filtrando por data: ' });
        spanTxt.createEl('strong', { text: dataBrFormatada });
        spanTxt.createEl('span', { text: ` (${filtradas.length} encontrada${filtradas.length === 1 ? '' : 's'})` });

        const btnLimpar = chipFilterBox.createEl('button', {
          cls: 'snoopy-chip-del',
          attr: {
            style: 'background: transparent; border: none; color: #93c5fd; cursor: pointer; font-size: 11px; padding: 2px 4px; display: inline-flex; align-items: center; gap: 3px;'
          }
        });
        if (ctx.renderIcon) {
          ctx.renderIcon(btnLimpar, 'x', { size: 11 });
        } else if (ctx.UIKit && ctx.UIKit.renderIcon) {
          ctx.UIKit.renderIcon(btnLimpar, 'x', { size: 11 });
        }
        btnLimpar.createEl('span', { text: 'Limpar filtro' });

        btnLimpar.onclick = () => {
          dataFiltroAtiva = null;
          if (ctx.events && typeof ctx.events.emit === 'function') {
            ctx.events.emit('tarefas:filtrar-data', { data: null });
          }
          renderizarTarefasDoCache();
        };
      } else if (currentTab === 'hoje') {
        filtradas = cacheTarefasPendentes.filter(t => t.statusPrazo === 'atrasada' || t.statusPrazo === 'hoje');
      } else if (currentTab === 'amanha') {
        filtradas = cacheTarefasPendentes.filter(t => t.dueStr === amanhãStr);
      } else if (currentTab === 'semana') {
        filtradas = cacheTarefasPendentes.filter(t => t.statusPrazo === 'futura' && t.dueStr <= semanaStr);
      } else if (currentTab === 'todas') {
        filtradas = [...cacheTarefasPendentes];
      } else if (currentTab === 'concluidas') {
        filtradas = [...cacheTarefasConcluidasHoje];
      }

      if (!dataFiltroAtiva && currentTab !== 'concluidas') {
        filtradas.sort((a, b) => {
          const pPrazo = { atrasada: 1, hoje: 2, futura: 3, sem_prazo: 4 };
          const pPrio = { alta: 1, media: 2, baixa: 3 };
          const pA = pPrazo[a.statusPrazo] || 5;
          const pB = pPrazo[b.statusPrazo] || 5;
          if (pA !== pB) return pA - pB;
          if (a.dueStr && b.dueStr) return a.dueStr.localeCompare(b.dueStr);
          return (pPrio[a.prio] || 4) - (pPrio[b.prio] || 4);
        });
      }

      // Atualiza badges das abas
      const cHoje = cacheTarefasPendentes.filter(t => t.statusPrazo === 'atrasada' || t.statusPrazo === 'hoje').length;
      const cAmanha = cacheTarefasPendentes.filter(t => t.dueStr === amanhãStr).length;
      const cSemana = cacheTarefasPendentes.filter(t => t.statusPrazo === 'futura' && t.dueStr <= semanaStr).length;

      if (tabBtns['hoje']) tabBtns['hoje'].textContent = `HOJE (${cHoje})`;
      if (tabBtns['amanha']) tabBtns['amanha'].textContent = `AMANHÃ (${cAmanha})`;
      if (tabBtns['semana']) tabBtns['semana'].textContent = `ESTA SEMANA (${cSemana})`;
      if (tabBtns['todas']) tabBtns['todas'].textContent = `PRÓXIMAS (${cacheTarefasPendentes.length})`;
      if (tabBtns['concluidas']) tabBtns['concluidas'].textContent = `CONCLUÍDAS (${cacheTarefasConcluidasHoje.length})`;

      if (filtradas.length === 0) {
        if (ctx.UIKit && typeof ctx.UIKit.criarEstadoVazio === 'function') {
          ctx.UIKit.criarEstadoVazio(todoListContainer, {
            icon: 'list-checks',
            titulo: currentTab === 'hoje' ? 'Nenhuma tarefa pendente para hoje' : 'Nenhuma tarefa nesta categoria',
            descricao: currentTab === 'hoje' ? 'Aproveite para focar em estudos ou avançar projetos no Kanban.' : 'Cadastre novas tarefas para planejar seu fluxo diário.',
            acao: {
              label: '+ NOVA TAREFA',
              icon: 'plus',
              variant: 'action',
              onClick: abrirModalNovaTarefa
            }
          });
        } else {
          todoListContainer.innerHTML = `
            <div class="snoopy-meta" style="color: var(--text-muted); text-align: center; padding: 24px 0; font-size: 12px;">
              ${currentTab === 'hoje' ? 'Nenhuma tarefa pendente para hoje.' : 'Nenhuma tarefa nesta categoria.'}
            </div>
          `;
        }
        return;
      }

      filtradas.forEach(item => {
        const t = item.taskRef;
        const filePath = t.path || (t.link ? t.link.path : null);
        const fileName = t.link ? (t.link.display || t.link.path.split('/').pop().replace(/\.md$/, '')) : (filePath ? filePath.split('/').pop().replace(/\.md$/, '') : 'Nota');

        let badgeIconName = 'file-text';
        let badgeLabel = fileName;
        let originBadgeStyle = 'background: rgba(255, 255, 255, 0.05); color: #a1a1aa; border: 1px solid rgba(255, 255, 255, 0.08);';

        if (filePath) {
          if (filePath.startsWith('02_Projetos/')) {
            badgeIconName = 'target';
            originBadgeStyle = 'background: rgba(167, 139, 250, 0.12); color: #c4b5fd; border: 1px solid rgba(167, 139, 250, 0.25);';
          } else if (filePath.startsWith('03_Estudos/')) {
            badgeIconName = 'book-open';
            originBadgeStyle = 'background: rgba(96, 165, 250, 0.12); color: #93c5fd; border: 1px solid rgba(96, 165, 250, 0.25);';
          } else if (filePath.startsWith('04_Leituras/')) {
            badgeIconName = 'book-open';
            originBadgeStyle = 'background: rgba(56, 189, 248, 0.12); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.25);';
          } else if (filePath.startsWith('01_Inbox/Diário/')) {
            badgeIconName = 'calendar';
            badgeLabel = 'Diário';
            originBadgeStyle = 'background: rgba(255, 255, 255, 0.05); color: #a1a1aa; border: 1px solid rgba(255, 255, 255, 0.08);';
          }
        }

        const card = todoListContainer.createEl('div', { 
          cls: 'snoopy-task-card'
        });

        const label = card.createEl('label', { 
          attr: { style: 'display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1; overflow: hidden; min-width: 0;' } 
        });

        const cb = label.createEl('input', { cls: 'snoopy-circle-check', attr: { type: 'checkbox' } });
        cb.checked = item.completed;

        if (item.periodo) {
          const isManha = /manh|🌅/i.test(item.periodo);
          const isTarde = /tard|☀️/i.test(item.periodo);
          const isNoite = /noit|🌙/i.test(item.periodo);
          const pSpan = label.createEl('span', { 
            attr: { 
              style: 'font-size: 11px; flex-shrink: 0; display: inline-flex; align-items: center;', 
              title: `Período: ${isManha ? 'Manhã' : isTarde ? 'Tarde' : 'Noite'}` 
            } 
          });
          const renderIconFn = ctx.renderIcon || (ctx.UIKit && ctx.UIKit.renderIcon ? ctx.UIKit.renderIcon.bind(ctx.UIKit) : null);
          if (renderIconFn) {
            if (isManha) renderIconFn(pSpan, 'sunrise', { size: 12, color: '#fdba74' });
            else if (isTarde) renderIconFn(pSpan, 'sun', { size: 12, color: '#fbbf24' });
            else if (isNoite) renderIconFn(pSpan, 'moon', { size: 12, color: '#818cf8' });
          } else {
            pSpan.className = 'snoopy-periodo-meta';
            pSpan.textContent = isManha ? 'Manhã' : isTarde ? 'Tarde' : isNoite ? 'Noite' : '';
          }
        }

        label.createEl('span', { 
          text: item.cleanText,
          attr: { style: `font-size: 12.5px; font-weight: 500; color: ${item.completed ? 'var(--text-muted)' : 'var(--text-normal)'}; ${item.completed ? 'text-decoration: line-through;' : ''} line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` } 
        });

        const badgesCol = card.createEl('div', { attr: { style: 'display: flex; align-items: center; gap: 6px; flex-shrink: 0;' } });

        if (item.progresso) {
          const progBadge = badgesCol.createEl('span', {
            cls: `snoopy-task-prog-chip ${item.progresso.pct >= 100 || item.completed ? 'prog-concluido' : ''}`,
            attr: { title: `Meta: ${item.progresso.rotulo}${item.progresso.pct !== null ? ` (${item.progresso.pct}%)` : ''}` }
          });
          if (ctx.renderIcon) {
            ctx.renderIcon(progBadge, item.progresso.pct >= 100 || item.completed ? 'check' : 'zap', { size: 10 });
          }
          progBadge.createEl('span', { text: item.progresso.rotulo });
        }

        if (filePath) {
          const linkEl = badgesCol.createEl('a', { 
            cls: 'snoopy-todo-source',
            attr: { 
              title: `Abrir nota: ${filePath}`,
              style: `${originBadgeStyle} padding: 1px 6px; font-size: 10px; border-radius: 4px; text-decoration: none; cursor: pointer; max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-flex; align-items: center; gap: 4px;`
            }
          });
          if (ctx.renderIcon) {
            ctx.renderIcon(linkEl, badgeIconName, { size: 10 });
          }
          linkEl.createEl('span', { text: badgeLabel });
          linkEl.onclick = (e) => { e.preventDefault(); e.stopPropagation(); app.workspace.openLinkText(filePath, '', false); };
        }

        if (item.pomosEst) {
          const pomoBadge = badgesCol.createEl('span', {
            cls: 'snoopy-micro',
            attr: { style: 'padding: 1px 5px; border-radius: 4px; background: rgba(251, 146, 60, 0.12); color: #fdba74; display: inline-flex; align-items: center; gap: 3px;' }
          });
          if (ctx.renderIcon) ctx.renderIcon(pomoBadge, 'clock', { size: 10, color: '#fdba74' });
          pomoBadge.createEl('span', { text: `${item.pomosEst}p` });
        }

        if (!item.completed) {
          if (item.statusPrazo === 'atrasada') {
            badgesCol.createEl('span', { cls: 'prio-badge prio-alta', attr: { style: 'font-size: 9px; padding: 1px 4px;' }, text: 'Atrasada' });
          } else if (item.statusPrazo === 'hoje') {
            badgesCol.createEl('span', { cls: 'snoopy-micro', attr: { style: 'font-weight: bold; padding: 1px 5px; border-radius: 3px; background: rgba(96, 165, 250, 0.15); color: #93c5fa;' }, text: 'Hoje' });
          } else if (item.dueStr) {
            badgesCol.createEl('span', { cls: 'snoopy-micro', attr: { style: 'color: var(--text-muted);' }, text: DateUtils.formatarDDMMYYYY(item.dueStr) });
          }

          if (item.prio === 'alta') {
            const prioIcon = badgesCol.createEl('span', { attr: { title: 'Prioridade Alta', style: 'display: inline-flex; align-items: center; color: #fb923c;' } });
            if (ctx.renderIcon) ctx.renderIcon(prioIcon, 'arrow-up', { size: 11, color: '#fb923c' });
          }

          const btnFoco = badgesCol.createEl('button', {
            cls: 'snoopy-btn-task-focus snoopy-btn-sm',
            attr: { title: 'Carregar no Cockpit Pomodoro' }
          });
          if (ctx.renderIcon) ctx.renderIcon(btnFoco, 'play', { size: 10, color: 'var(--snoopy-module-accent)' });
          btnFoco.createEl('span', { text: 'Foco' });

          btnFoco.onclick = (e) => {
            e.stopPropagation();
            if (typeof window.snoopySetPomodoroFocus === 'function') window.snoopySetPomodoroFocus(item.cleanText, badgeLabel);
            if (typeof window._snoopyDefinirTarefaFoco === 'function') window._snoopyDefinirTarefaFoco({ texto: item.cleanText, path: filePath, line: t.line });
          };

          const btnFila = badgesCol.createEl('button', {
            cls: 'snoopy-task-action-btn',
            attr: { title: 'Adicionar à Playlist / Fila de Foco do Pomodoro' }
          });
          if (ctx.renderIcon) ctx.renderIcon(btnFila, 'list-plus', { size: 15 });
          else btnFila.textContent = '+Fila';

          btnFila.onclick = (e) => {
            e.stopPropagation();
            const pomosNum = Number(item.pomosEst) || 1;
            if (ctx.events) {
              ctx.events.emit('pomodoro:enfileirar', {
                titulo: item.cleanText,
                path: filePath,
                line: t.line,
                pomosTotal: pomosNum
              });
            } else if (typeof window._snoopyAdicionarFilaPomodoro === 'function') {
              window._snoopyAdicionarFilaPomodoro({
                titulo: item.cleanText,
                path: filePath,
                line: t.line,
                pomosTotal: pomosNum
              });
            }
          };

          const btnMenu = badgesCol.createEl('button', {
            cls: 'snoopy-task-action-btn',
            attr: { title: 'Ações da tarefa' }
          });
          if (ctx.renderIcon) ctx.renderIcon(btnMenu, 'more-vertical', { size: 15 });
          else btnMenu.textContent = '⋮';

          btnMenu.onclick = (e) => { e.stopPropagation(); abrirModalMenuTarefa(item, t, filePath); };
        } else {
          badgesCol.createEl('span', {
            cls: 'snoopy-micro',
            attr: { style: 'color: var(--snoopy-module-accent); font-weight: bold;' },
            text: 'Concluída'
          });
        }

        cb.onchange = async () => {
          if (filePath) {
            const file = app.vault.getAbstractFileByPath(filePath);
            if (file) {
              const novoChecked = cb.checked;
              item.completed = novoChecked;
              if (item.taskRef) item.taskRef.completed = novoChecked;

              const idxPend = cacheTarefasPendentes.findIndex(x => x === item || (x.taskRef && t && x.taskRef.text === t.text) || x.cleanText === item.cleanText);
              const idxConc = cacheTarefasConcluidasHoje.findIndex(x => x === item || (x.taskRef && t && x.taskRef.text === t.text) || x.cleanText === item.cleanText);

              if (novoChecked) {
                if (idxPend >= 0) cacheTarefasPendentes.splice(idxPend, 1);
                if (idxConc < 0) cacheTarefasConcluidasHoje.push(item);
              } else {
                if (idxConc >= 0) cacheTarefasConcluidasHoje.splice(idxConc, 1);
                if (idxPend < 0) cacheTarefasPendentes.push(item);
              }

              renderizarTarefasDoCache();

              await VaultStore.substituirLinha(
                app, 
                file, 
                l => l.includes(t.text), 
                l => novoChecked 
                  ? l.replace(/- \[ \]/, `- [x] ✅ ${todayStr}`) 
                  : l.replace(/- \[[xX]\]/, '- [ ]').replace(REGEX_CHECKED_TASKS, '').trim()
              );
              if (typeof Notice !== 'undefined') new Notice(novoChecked ? `[Snoopy] Concluída: ${item.cleanText}` : `[Snoopy] Reaberta: ${item.cleanText}`);
            }
          }
        };
      });
    }

    let elementoCardSendoArrastado = null;

    function renderizarTarefasModoKanban() {
      todoListContainer.innerHTML = '';

      const board = todoListContainer.createEl('div', {
        cls: 'snoopy-task-kanban-board'
      });

      const ordenarKanban = (lista) => {
        return lista.sort((a, b) => {
          const pPrazo = { atrasada: 1, hoje: 2, futura: 3, sem_prazo: 4 };
          const pPrio = { alta: 1, media: 2, baixa: 3 };
          const pA = pPrazo[a.statusPrazo] || 5;
          const pB = pPrazo[b.statusPrazo] || 5;
          if (pA !== pB) return pA - pB;
          if (a.dueStr && b.dueStr) return a.dueStr.localeCompare(b.dueStr);
          return (pPrio[a.prio] || 4) - (pPrio[b.prio] || 4);
        });
      };

      const tarefasHoje = ordenarKanban(cacheTarefasPendentes.filter(t => t.statusPrazo === 'hoje' || t.statusPrazo === 'atrasada'));
      const tarefasAFazer = ordenarKanban(cacheTarefasPendentes.filter(t => t.statusPrazo !== 'hoje' && t.statusPrazo !== 'atrasada'));
      const tarefasConcluidas = [...cacheTarefasConcluidasHoje];

      const colunasDef = [
        { id: 'afazer', titulo: 'A FAZER', dotCls: 'dot-afazer', itens: tarefasAFazer },
        { id: 'hoje', titulo: 'HOJE / EM ANDAMENTO', dotCls: 'dot-hoje', itens: tarefasHoje },
        { id: 'concluido', titulo: 'CONCLUÍDO', dotCls: 'dot-concluido', itens: tarefasConcluidas }
      ];

      const moverTarefaParaColuna = async (dragData, destinoColId) => {
        if (!dragData || !dragData.path || !dragData.rawText) return;
        if (dragData.origemCol === destinoColId) return;

        // 1. SINCRONIZAÇÃO OTIMISTA IN-PLACE DO CACHE (0ms)
        const idxPendente = cacheTarefasPendentes.findIndex(t => t.cleanText === dragData.cleanText || (t.taskRef && t.taskRef.text.includes(dragData.rawText)));
        const idxConcluido = cacheTarefasConcluidasHoje.findIndex(t => t.cleanText === dragData.cleanText || (t.taskRef && t.taskRef.text.includes(dragData.rawText)));

        let itemMovido = null;
        if (idxPendente >= 0) {
          itemMovido = cacheTarefasPendentes.splice(idxPendente, 1)[0];
        } else if (idxConcluido >= 0) {
          itemMovido = cacheTarefasConcluidasHoje.splice(idxConcluido, 1)[0];
        }

        if (itemMovido) {
          if (destinoColId === 'concluido') {
            itemMovido.completed = true;
            cacheTarefasConcluidasHoje.unshift(itemMovido);
          } else if (destinoColId === 'hoje') {
            itemMovido.completed = false;
            itemMovido.statusPrazo = 'hoje';
            itemMovido.dueStr = todayStr;
            cacheTarefasPendentes.unshift(itemMovido);
          } else {
            itemMovido.completed = false;
            itemMovido.statusPrazo = 'sem_prazo';
            itemMovido.dueStr = null;
            cacheTarefasPendentes.push(itemMovido);
          }
        }

        // 2. ATUALIZAÇÃO OTIMISTA INSTANTÂNEA NO DOM (Na posição canônica ordenada)
        const colOrigemEl = board.querySelector(`.col-${dragData.origemCol}`);
        const colDestinoEl = board.querySelector(`.col-${destinoColId}`);
        const cardsWrapDestino = colDestinoEl ? colDestinoEl.querySelector('.snoopy-task-kanban-col-cards') : null;
        const cardsWrapOrigem = colOrigemEl ? colOrigemEl.querySelector('.snoopy-task-kanban-col-cards') : null;

        const cardAlvo = elementoCardSendoArrastado || (cardsWrapOrigem ? cardsWrapOrigem.querySelector('.snoopy-task-kanban-card') : null);

        if (cardAlvo && cardsWrapDestino) {
          // Remove mensagem de vazio da coluna destino se houver
          const emptyDestino = cardsWrapDestino.querySelector('.snoopy-meta');
          if (emptyDestino && emptyDestino.textContent && emptyDestino.textContent.includes('Nenhum item')) {
            if (typeof emptyDestino.remove === 'function') {
              emptyDestino.remove();
            } else if (emptyDestino.parentElement && typeof emptyDestino.parentElement.removeChild === 'function') {
              emptyDestino.parentElement.removeChild(emptyDestino);
            }
          }

          // Insere na posição ordenada em vez de jogar rudemente no final da coluna
          const cardsExistentes = Array.from(cardsWrapDestino.querySelectorAll('.snoopy-task-kanban-card')).filter(c => c !== cardAlvo);
          let inserido = false;
          if (itemMovido && cardsExistentes.length > 0) {
            const pMap = { alta: 1, media: 2, baixa: 3 };
            const movidoAtrasado = itemMovido.statusPrazo === 'atrasada';
            for (const c of cardsExistentes) {
              const cAtrasada = c.getAttribute('data-atrasada') === 'true';
              const cPrio = c.getAttribute('data-prio') || 'baixa';
              if (movidoAtrasado && !cAtrasada) {
                cardsWrapDestino.insertBefore(cardAlvo, c);
                inserido = true;
                break;
              }
              if (movidoAtrasado === cAtrasada && (pMap[itemMovido.prio] || 4) < (pMap[cPrio] || 4)) {
                cardsWrapDestino.insertBefore(cardAlvo, c);
                inserido = true;
                break;
              }
            }
          }
          if (!inserido) {
            if (cardsExistentes.length > 0 && (destinoColId === 'concluido' || destinoColId === 'hoje')) {
              cardsWrapDestino.insertBefore(cardAlvo, cardsExistentes[0]);
            } else {
              cardsWrapDestino.appendChild(cardAlvo);
            }
          }

          // Atualiza os contadores de coluna no cabeçalho
          const countOrigem = colOrigemEl ? colOrigemEl.querySelector('.snoopy-task-kanban-col-header .snoopy-micro') : null;
          const countDestino = colDestinoEl ? colDestinoEl.querySelector('.snoopy-task-kanban-col-header .snoopy-micro') : null;
          if (countOrigem) countOrigem.textContent = String(Math.max(0, (parseInt(countOrigem.textContent) || 0) - 1));
          if (countDestino) countDestino.textContent = String((parseInt(countDestino.textContent) || 0) + 1);

          // Se a coluna de origem ficou vazia, reexibe a mensagem sutil
          if (cardsWrapOrigem && cardsWrapOrigem.querySelectorAll('.snoopy-task-kanban-card').length === 0) {
            cardsWrapOrigem.createEl('div', {
              cls: 'snoopy-meta',
              attr: { style: 'color: #71717a; font-size: 11px; font-style: italic; text-align: center; padding: 16px 0;' },
              text: 'Nenhum item nesta coluna'
            });
          }

          // Atualiza estilização do card conforme o destino
          const cb = cardAlvo.querySelector('.snoopy-circle-check');
          const titleEl = cardAlvo.querySelector('span[style*="font-size: 12px"]');
          if (destinoColId === 'concluido') {
            if (cb) cb.checked = true;
            if (titleEl) {
              titleEl.style.color = 'var(--text-muted)';
              titleEl.style.textDecoration = 'line-through';
            }
          } else {
            if (cb) cb.checked = false;
            if (titleEl) {
              titleEl.style.color = '#ffffff';
              titleEl.style.textDecoration = 'none';
            }
          }
        }

        // 3. PERSISTÊNCIA ASSÍNCRONA NO VAULT (BACKGROUND WORKER)
        const file = app.vault.getAbstractFileByPath(dragData.path);
        if (!file) return;

        let novaLinhaPersistida = '';
        await VaultStore.substituirLinha(
          app,
          file,
          l => l.includes(dragData.rawText),
          l => {
            let novaLinha = l;
            if (destinoColId === 'concluido') {
              if (/- \[ \]/.test(novaLinha)) {
                novaLinha = novaLinha.replace(/- \[ \]/, `- [x] ✅ ${todayStr}`);
              } else if (!/- \[[xX]\]/.test(novaLinha)) {
                novaLinha = `- [x] ✅ ${todayStr} ${novaLinha}`.trim();
              }
            } else if (destinoColId === 'hoje') {
              novaLinha = novaLinha.replace(/- \[[xX]\]/, '- [ ]').replace(REGEX_CHECKED_TASKS, '').trim();
              if (!/- \[ \]/.test(novaLinha)) novaLinha = `- [ ] ${novaLinha}`;
              if (/(?:due:|📅)\s*(\d{4}-\d{2}-\d{2}|\d{2}[-/]\d{2}[-/]\d{4})/.test(novaLinha)) {
                novaLinha = novaLinha.replace(/(?:due:|📅)\s*(\d{4}-\d{2}-\d{2}|\d{2}[-/]\d{2}[-/]\d{4})/, `📅 ${todayStr}`);
              } else {
                novaLinha = `${novaLinha} 📅 ${todayStr}`;
              }
            } else if (destinoColId === 'afazer') {
              novaLinha = novaLinha.replace(/- \[[xX]\]/, '- [ ]').replace(REGEX_CHECKED_TASKS, '').trim();
              if (!/- \[ \]/.test(novaLinha)) novaLinha = `- [ ] ${novaLinha}`;
              novaLinha = novaLinha.replace(/(?:due:|📅)\s*(\d{4}-\d{2}-\d{2}|\d{2}[-/]\d{2}[-/]\d{4})/, '').trim();
            }
            novaLinhaPersistida = novaLinha;
            if (itemMovido && itemMovido.taskRef) itemMovido.taskRef.text = novaLinhaPersistida;
            return novaLinha;
          }
        );

        const rotulosCol = { afazer: 'A Fazer', hoje: 'Hoje / Em Andamento', concluido: 'Concluído' };
        if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Tarefa movida para ${rotulosCol[destinoColId] || destinoColId}!`);
      };

      colunasDef.forEach(col => {
        const colEl = board.createEl('div', {
          cls: `snoopy-task-kanban-col col-${col.id}`
        });

        const headerEl = colEl.createEl('div', {
          cls: 'snoopy-task-kanban-col-header'
        });
        const titleRow = headerEl.createEl('div', {
          attr: { style: 'display: flex; align-items: center; gap: 6px;' }
        });
        titleRow.createEl('span', { cls: `snoopy-kanban-dot ${col.dotCls}` });
        titleRow.createEl('span', {
          cls: 'snoopy-sub-title',
          attr: { style: 'font-size: 11px; font-weight: 700;' },
          text: col.titulo
        });
        headerEl.createEl('span', {
          cls: 'snoopy-micro',
          attr: { style: 'color: #71717a; font-weight: bold;' },
          text: String(col.itens.length)
        });

        const cardsWrap = colEl.createEl('div', {
          cls: 'snoopy-task-kanban-col-cards',
          attr: { style: 'display: flex; flex-direction: column; gap: 8px; overflow-y: auto; max-height: 380px; padding-right: 2px;' }
        });

        // Suporte HTML5 Drag and Drop na coluna
        cardsWrap.addEventListener('dragover', (e) => {
          e.preventDefault();
          if (e.dataTransfer) e.dataTransfer.dropEffect = 'move';
          colEl.classList.add('snoopy-kanban-dragover');
          colEl.style.borderColor = 'var(--snoopy-module-accent, #86efac)';
        });

        cardsWrap.addEventListener('dragleave', () => {
          colEl.classList.remove('snoopy-kanban-dragover');
          colEl.style.borderColor = '';
        });

        cardsWrap.addEventListener('drop', async (e) => {
          e.preventDefault();
          colEl.classList.remove('snoopy-kanban-dragover');
          colEl.style.borderColor = '';

          const rawPayload = e.dataTransfer ? e.dataTransfer.getData('text/plain') : null;
          if (!rawPayload) return;
          let dragData = null;
          try {
            dragData = JSON.parse(rawPayload);
          } catch (_) {
            return;
          }
          await moverTarefaParaColuna(dragData, col.id);
        });

        if (col.itens.length === 0) {
          cardsWrap.createEl('div', {
            cls: 'snoopy-meta',
            attr: { style: 'color: #71717a; font-size: 11px; font-style: italic; text-align: center; padding: 16px 0;' },
            text: 'Nenhum item nesta coluna'
          });
        } else {
          col.itens.forEach(item => {
            renderizarCardKanban(cardsWrap, item, col.id);
          });
        }
      });
    }

    function renderizarCardKanban(cardsWrap, item, colId) {
      const t = item.taskRef;
      const filePath = t.path || (t.link ? t.link.path : null);
      const fileName = t.link ? (t.link.display || t.link.path.split('/').pop().replace(/\.md$/, '')) : (filePath ? filePath.split('/').pop().replace(/\.md$/, '') : 'Nota');

      let badgeIconName = 'file-text';
      let badgeLabel = fileName;
      let originBadgeStyle = 'background: rgba(255, 255, 255, 0.05); color: #a1a1aa; border: 1px solid rgba(255, 255, 255, 0.08);';

      if (filePath) {
        if (filePath.startsWith('02_Projetos/')) {
          badgeIconName = 'target';
          originBadgeStyle = 'background: rgba(167, 139, 250, 0.12); color: #c4b5fd; border: 1px solid rgba(167, 139, 250, 0.25);';
        } else if (filePath.startsWith('03_Estudos/')) {
          badgeIconName = 'book-open';
          originBadgeStyle = 'background: rgba(96, 165, 250, 0.12); color: #93c5fd; border: 1px solid rgba(96, 165, 250, 0.25);';
        } else if (filePath.startsWith('04_Leituras/')) {
          badgeIconName = 'book-open';
          originBadgeStyle = 'background: rgba(56, 189, 248, 0.12); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.25);';
        } else if (filePath.startsWith('01_Inbox/Diário/')) {
          badgeIconName = 'calendar';
          badgeLabel = 'Diário';
          originBadgeStyle = 'background: rgba(255, 255, 255, 0.05); color: #a1a1aa; border: 1px solid rgba(255, 255, 255, 0.08);';
        }
      }

      const card = cardsWrap.createEl('div', { cls: 'snoopy-task-kanban-card' });
      card.setAttribute('data-prio', item.prio || 'baixa');
      card.setAttribute('data-atrasada', item.statusPrazo === 'atrasada' ? 'true' : 'false');
      card.setAttribute('data-task-path', filePath || '');
      card.setAttribute('data-task-raw', encodeURIComponent(t.text || ''));

      // Suporte a HTML5 Drag & Drop no Card
      card.setAttribute('draggable', 'true');
      card.style.cursor = 'grab';

      card.addEventListener('dragstart', (e) => {
        elementoCardSendoArrastado = card;
        const dragPayload = JSON.stringify({
          path: filePath,
          rawText: t.text,
          cleanText: item.cleanText,
          origemCol: colId
        });
        if (e.dataTransfer) {
          e.dataTransfer.setData('text/plain', dragPayload);
          e.dataTransfer.effectAllowed = 'move';
        }
        card.classList.add('is-dragging');
        card.style.opacity = '0.4';
      });

      card.addEventListener('dragend', () => {
        elementoCardSendoArrastado = null;
        card.classList.remove('is-dragging');
        card.style.opacity = '1';
      });

      // Topo: Checkbox + Título
      const topRow = card.createEl('div', {
        attr: { style: 'display: flex; align-items: flex-start; gap: 8px;' }
      });
      const cb = topRow.createEl('input', {
        cls: 'snoopy-circle-check',
        attr: { type: 'checkbox', style: 'margin-top: 2px;' }
      });
      cb.checked = item.completed;
      cb.onchange = async () => {
        if (filePath) {
          const file = app.vault.getAbstractFileByPath(filePath);
          if (file) {
            const novoChecked = cb.checked;
            item.completed = novoChecked;
            if (item.taskRef) item.taskRef.completed = novoChecked;

            const idxPend = cacheTarefasPendentes.findIndex(x => x === item || (x.taskRef && t && x.taskRef.text === t.text) || x.cleanText === item.cleanText);
            const idxConc = cacheTarefasConcluidasHoje.findIndex(x => x === item || (x.taskRef && t && x.taskRef.text === t.text) || x.cleanText === item.cleanText);

            if (novoChecked) {
              if (idxPend >= 0) cacheTarefasPendentes.splice(idxPend, 1);
              if (idxConc < 0) cacheTarefasConcluidasHoje.push(item);
            } else {
              if (idxConc >= 0) cacheTarefasConcluidasHoje.splice(idxConc, 1);
              if (idxPend < 0) cacheTarefasPendentes.push(item);
            }

            renderizarTarefasDoCache();

            await VaultStore.substituirLinha(
              app, 
              file, 
              l => l.includes(t.text), 
              l => novoChecked 
                ? l.replace(/- \[ \]/, `- [x] ✅ ${todayStr}`) 
                : l.replace(/- \[[xX]\]/, '- [ ]').replace(REGEX_CHECKED_TASKS, '').trim()
            );
            if (typeof Notice !== 'undefined') new Notice(novoChecked ? `[Snoopy] Concluída: ${item.cleanText}` : `[Snoopy] Reaberta: ${item.cleanText}`);
          }
        }
      };

      topRow.createEl('span', {
        text: item.cleanText,
        attr: { style: `font-size: 12px; font-weight: 600; color: ${item.completed ? 'var(--text-muted)' : '#ffffff'}; ${item.completed ? 'text-decoration: line-through;' : ''} line-height: 1.35; flex: 1; word-break: break-word;` }
      });

      // Badges e Tags
      const tagsRow = card.createEl('div', {
        attr: { style: 'display: flex; align-items: center; gap: 4px; flex-wrap: wrap; margin-top: 4px;' }
      });

      if (filePath) {
        const linkEl = tagsRow.createEl('a', {
          cls: 'snoopy-todo-source',
          attr: {
            title: `Abrir nota: ${filePath}`,
            style: `${originBadgeStyle} padding: 1px 6px; font-size: 10px; border-radius: 4px; text-decoration: none; cursor: pointer; max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-flex; align-items: center; gap: 3px;`
          }
        });
        if (ctx.renderIcon) ctx.renderIcon(linkEl, badgeIconName, { size: 10 });
        linkEl.createEl('span', { text: badgeLabel });
        linkEl.onclick = (e) => { e.preventDefault(); e.stopPropagation(); app.workspace.openLinkText(filePath, '', false); };
      }

      if (item.progresso) {
        const progBadge = tagsRow.createEl('span', {
          cls: `snoopy-task-prog-chip ${item.progresso.pct >= 100 || item.completed ? 'prog-concluido' : ''}`,
          attr: { style: 'font-size: 10px;', title: `Meta: ${item.progresso.rotulo}${item.progresso.pct !== null ? ` (${item.progresso.pct}%)` : ''}` }
        });
        if (ctx.renderIcon) ctx.renderIcon(progBadge, item.progresso.pct >= 100 || item.completed ? 'check' : 'zap', { size: 10 });
        progBadge.createEl('span', { text: item.progresso.rotulo });
      }

      if (item.pomosEst) {
        const pomoBadge = tagsRow.createEl('span', {
          cls: 'snoopy-micro',
          attr: { style: 'padding: 1px 5px; border-radius: 4px; background: rgba(251, 146, 60, 0.12); color: #fdba74; display: inline-flex; align-items: center; gap: 3px; font-size: 10px;' }
        });
        if (ctx.renderIcon) ctx.renderIcon(pomoBadge, 'clock', { size: 10, color: '#fdba74' });
        pomoBadge.createEl('span', { text: `${item.pomosEst}p` });
      }

      if (!item.completed) {
        if (item.statusPrazo === 'atrasada') {
          tagsRow.createEl('span', { cls: 'prio-badge prio-alta', attr: { style: 'font-size: 9px; padding: 1px 5px;' }, text: 'ATRASADA' });
        } else if (item.statusPrazo === 'hoje') {
          tagsRow.createEl('span', { cls: 'snoopy-micro', attr: { style: 'font-weight: bold; padding: 1px 5px; border-radius: 3px; background: rgba(96, 165, 250, 0.15); color: #93c5fa; font-size: 10px;' }, text: 'Hoje' });
        } else if (item.dueStr) {
          tagsRow.createEl('span', { cls: 'snoopy-micro', attr: { style: 'color: var(--text-muted); font-size: 10px;' }, text: DateUtils.formatarDDMMYYYY(item.dueStr) });
        }

        if (item.prio === 'alta') {
          const prioIcon = tagsRow.createEl('span', { attr: { title: 'Prioridade Alta', style: 'display: inline-flex; align-items: center; color: #fb923c;' } });
          if (ctx.renderIcon) ctx.renderIcon(prioIcon, 'arrow-up', { size: 11, color: '#fb923c' });
        }
      }

      // Rodapé
      const footerRow = card.createEl('div', {
        attr: { style: 'display: flex; align-items: center; justify-content: flex-end; gap: 6px; margin-top: 6px; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.04);' }
      });

      if (!item.completed) {
        const btnFoco = footerRow.createEl('button', {
          cls: 'snoopy-btn-task-focus snoopy-btn-sm',
          attr: { title: 'Carregar no Cockpit Pomodoro', style: 'padding: 2px 8px; font-size: 11px;' }
        });
        if (ctx.renderIcon) ctx.renderIcon(btnFoco, 'play', { size: 10, color: 'var(--snoopy-module-accent)' });
        btnFoco.createEl('span', { text: 'Foco' });

        btnFoco.onclick = (e) => {
          e.stopPropagation();
          if (typeof window.snoopySetPomodoroFocus === 'function') window.snoopySetPomodoroFocus(item.cleanText, badgeLabel);
          if (typeof window._snoopyDefinirTarefaFoco === 'function') window._snoopyDefinirTarefaFoco({ texto: item.cleanText, path: filePath, line: t.line });
        };

        const btnFila = footerRow.createEl('button', {
          cls: 'snoopy-task-action-btn',
          attr: { title: 'Adicionar à Playlist / Fila de Foco do Pomodoro' }
        });
        if (ctx.renderIcon) ctx.renderIcon(btnFila, 'list-plus', { size: 14 });
        else btnFila.textContent = '+Fila';

        btnFila.onclick = (e) => {
          e.stopPropagation();
          const pomosNum = Number(item.pomosEst) || 1;
          if (ctx.events) {
            ctx.events.emit('pomodoro:enfileirar', {
              titulo: item.cleanText,
              path: filePath,
              line: t.line,
              pomosTotal: pomosNum
            });
          } else if (typeof window._snoopyAdicionarFilaPomodoro === 'function') {
            window._snoopyAdicionarFilaPomodoro({
              titulo: item.cleanText,
              path: filePath,
              line: t.line,
              pomosTotal: pomosNum
            });
          }
        };

        const btnMenu = footerRow.createEl('button', {
          cls: 'snoopy-task-action-btn',
          attr: { title: 'Ações da tarefa' }
        });
        if (ctx.renderIcon) ctx.renderIcon(btnMenu, 'more-vertical', { size: 14 });
        else btnMenu.textContent = '⋮';

        btnMenu.onclick = (e) => { e.stopPropagation(); abrirModalMenuTarefa(item, t, filePath); };
      } else {
        footerRow.createEl('span', {
          cls: 'snoopy-micro',
          attr: { style: 'color: var(--snoopy-module-accent); font-weight: bold; font-size: 11px;' },
          text: 'Concluída'
        });
      }
    }

    async function renderizarTarefasModoCalendario() {
      todoListContainer.innerHTML = '';

      const calWrap = todoListContainer.createEl('div', {
        cls: 'snoopy-task-calendar-view-wrap',
        attr: { style: 'width: 100%; max-width: 680px; margin: 0 auto; padding: 6px 12px; height: 100%; display: flex; flex-direction: column;' }
      });

      const CalView = CalendarioView 
        || (ctx && ctx.CalendarioView) 
        || (typeof require !== 'undefined' ? require('./calendario_view.js') : null);

      if (CalView && typeof CalView.montar === 'function') {
        await CalView.montar({
          container: calWrap,
          ctx,
          dataInicial: dataFiltroAtiva,
          onSelectData: (dataIso) => {
            dataFiltroAtiva = dataIso;
            if (dataIso) {
              if (typeof setViewMode === 'function') {
                setViewMode('lista');
              } else {
                currentViewMode = 'lista';
                if (typeof window !== 'undefined') window.__snoopyTaskViewMode = 'lista';
                if (tabsContainer) tabsContainer.style.display = 'flex';
                const switcher = tasksCard.querySelector('.snoopy-view-switcher');
                if (switcher) {
                  switcher.querySelectorAll('.snoopy-btn-view-mode').forEach(b => {
                    b.classList.toggle('active', b.getAttribute('data-mode') === 'lista');
                  });
                }
                renderizarTarefasDoCache();
              }
            }
          }
        });
      }
    }

    // Função central para conclusão de tarefa apontada pelo Pomodoro
    const concluirTarefa = async (tarefaAtiva) => {
      if (!tarefaAtiva || !tarefaAtiva.path) return;
      const file = app.vault.getAbstractFileByPath(tarefaAtiva.path);
      if (file) {
        await VaultStore.substituirLinha(app, file, l => l.includes(tarefaAtiva.texto), l => l.replace(/- \[ \]/, `- [x] ✅ ${DateUtils.formatarDDMMYYYY(todayStr)}`));
        if (typeof Notice !== 'undefined') new Notice(`[Snoopy] Tarefa concluída: ${tarefaAtiva.texto}`);
        await recarregarEAtualizarTarefas();
      }
    };

    if (ctx.events) {
      const cancelConcluir = ctx.events.on('tarefa:concluir', concluirTarefa);
      const cancelFiltroData = ctx.events.on('tarefas:filtrar-data', ({ data }) => {
        dataFiltroAtiva = data || null;
        renderizarTarefasDoCache();
      });
      if (ctx.Lifecycle) {
        ctx.Lifecycle.onDispose('home', cancelConcluir);
        ctx.Lifecycle.onDispose('home', cancelFiltroData);
      }
    }

    // Mantém compatibilidade temporária com chamadas legadas
    if (typeof window !== 'undefined') {
      window._snoopyConcluirTarefaAtiva = concluirTarefa;
    }

    await recarregarEAtualizarTarefas();
    return { recarregarEAtualizarTarefas, renderizarTarefasDoCache };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = TarefasView;
}

return TarefasView;

