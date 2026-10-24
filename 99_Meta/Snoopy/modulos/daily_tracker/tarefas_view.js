/**
 * Snoopy Vault - Submódulo: Lista e Renderizador de Tarefas com Cache em Memória
 * Gerencia o cache reativo de tarefas do vault, ordenação por prazos/prioridade,
 * abas de filtro rápido e cards de tarefas individuais.
 *
 * @module modulos/daily_tracker/tarefas_view
 */

const REGEX_CHECKED_TASKS = /\u{2705}\s*(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/u;

const TarefasView = {
  /**
   * Monta o painel da Central de Tarefas.
   */
  async montar({ tasksCard, ctx, abrirModalNovaTarefa, abrirModalTemplateTarefa, abrirModalMenuTarefa }) {
    const { app, dv, todayStr, DateUtils, VaultStore, TaskParser } = ctx;

    let addTaskBtn = null;
    let addTplBtn = null;
    if (ctx.UIKit && typeof ctx.UIKit.criarCardHeader === 'function') {
      const headerEls = ctx.UIKit.criarCardHeader(tasksCard, {
        title: 'TAREFAS',
        icon: 'list-checks',
        subtitle: 'O que precisa sair hoje'
      });
      if (typeof abrirModalTemplateTarefa === 'function') {
        addTplBtn = ctx.UIKit.criarBotao(headerEls.actionsBox, {
          label: '+ TEMPLATE',
          icon: 'plus',
          variant: 'action',
          size: 'sm',
          onClick: abrirModalTemplateTarefa
        }, ctx);
      }
      addTaskBtn = ctx.UIKit.criarBotao(headerEls.actionsBox, {
        label: '+ NOVA TAREFA',
        icon: 'plus',
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
      const actionsBox = todoHeader.createEl('div', { cls: 'snoopy-toolbar' });
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

    // Barra de Filtros / Abas
    const tabsContainer = tasksCard.createEl('div', { 
      cls: 'snoopy-task-tabs snoopy-toolbar', 
      attr: { style: 'overflow-x: auto; padding-bottom: 4px; border-bottom: 1px solid rgba(255,255,255,0.05);' } 
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

    tabsDef.forEach((t, idx) => {
      const btn = tabsContainer.createEl('button', {
        cls: `snoopy-btn-tab snoopy-btn-sm ${idx === 0 ? 'active' : ''}`,
        text: t.label
      });
      tabBtns[t.id] = btn;
      btn.onclick = () => {
        currentTab = t.id;
        Object.values(tabBtns).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        renderizarTarefasDoCache();
      };
    });

    const todoListContainer = tasksCard.createEl('div', {
      cls: 'snoopy-tasks-list-box',
      attr: { style: 'min-height: 180px; max-height: 420px; overflow-y: auto; padding-right: 4px;' }
    });

    // Cache em memória
    let cacheTarefasPendentes = [];
    let cacheTarefasConcluidasHoje = [];

    async function recarregarEAtualizarTarefas() {
      const escopo = dv.pages('"01_Inbox" or "02_Projetos" or "03_Estudos" or "04_Leituras"')
        .where(p => p.file && !p.file.path.includes('Template') && !p.file.path.includes('00_Home') && !p.file.name.includes('Painel'));

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
      const amanhãStr = DateUtils.somarDias(todayStr, 1);
      const semanaStr = DateUtils.somarDias(todayStr, 7);

      let filtradas = [];
      if (currentTab === 'hoje') {
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

      if (currentTab !== 'concluidas') {
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
          if (ctx.renderIcon) {
            if (isManha) ctx.renderIcon(pSpan, 'sunrise', { size: 12, color: '#fdba74' });
            else if (isTarde) ctx.renderIcon(pSpan, 'sun', { size: 12, color: '#fbbf24' });
            else if (isNoite) ctx.renderIcon(pSpan, 'moon', { size: 12, color: '#818cf8' });
          } else {
            pSpan.className = 'snoopy-emoji-meta';
            pSpan.textContent = item.periodo.split(' ')[0] || '';
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
            cls: 'snoopy-btn-primary snoopy-btn-sm',
            attr: { title: 'Carregar no Cockpit Pomodoro' }
          });
          if (ctx.renderIcon) ctx.renderIcon(btnFoco, 'play', { size: 10 });
          btnFoco.createEl('span', { text: 'Foco' });

          btnFoco.onclick = (e) => {
            e.stopPropagation();
            if (typeof window.snoopySetPomodoroFocus === 'function') window.snoopySetPomodoroFocus(item.cleanText, badgeLabel);
            if (typeof window._snoopyDefinirTarefaFoco === 'function') window._snoopyDefinirTarefaFoco({ texto: item.cleanText, path: filePath, line: t.line });
          };

          const btnMenu = badgesCol.createEl('button', {
            cls: 'snoopy-btn-icon snoopy-btn-sm',
            attr: { title: 'Ações da tarefa' }
          });
          if (ctx.renderIcon) ctx.renderIcon(btnMenu, 'more-vertical', { size: 11 });
          else btnMenu.textContent = '⋮';

          btnMenu.onclick = (e) => { e.stopPropagation(); abrirModalMenuTarefa(item, t, filePath); };
        } else {
          badgesCol.createEl('span', {
            cls: 'snoopy-micro',
            attr: { style: 'color: #86efac; font-weight: bold;' },
            text: 'Concluída'
          });
        }

        cb.onchange = async () => {
          if (filePath) {
            const file = app.vault.getAbstractFileByPath(filePath);
            if (file) {
              await VaultStore.substituirLinha(
                app, 
                file, 
                l => l.includes(t.text), 
                l => cb.checked 
                  ? l.replace(/- \[ \]/, `- [x] ✅ ${todayStr}`) 
                  : l.replace(/- \[[xX]\]/, '- [ ]').replace(REGEX_CHECKED_TASKS, '').trim()
              );
              new Notice(cb.checked ? `✅ Concluída: ${item.cleanText}` : `↩ Reaberta: ${item.cleanText}`);
              await recarregarEAtualizarTarefas();
            }
          }
        };
      });
    }

    // Função central para conclusão de tarefa apontada pelo Pomodoro
    const concluirTarefa = async (tarefaAtiva) => {
      if (!tarefaAtiva || !tarefaAtiva.path) return;
      const file = app.vault.getAbstractFileByPath(tarefaAtiva.path);
      if (file) {
        await VaultStore.substituirLinha(app, file, l => l.includes(tarefaAtiva.texto), l => l.replace(/- \[ \]/, `- [x] ✅ ${DateUtils.formatarDDMMYYYY(todayStr)}`));
        new Notice(`✅ Tarefa concluída: ${tarefaAtiva.texto}`);
        await recarregarEAtualizarTarefas();
      }
    };

    if (ctx.events) {
      const cancelConcluir = ctx.events.on('tarefa:concluir', concluirTarefa);
      if (ctx.Lifecycle) {
        ctx.Lifecycle.onDispose('home', cancelConcluir);
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

