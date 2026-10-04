/**
 * Snoopy Vault - Módulo 04: Hábitos Diários & Central de Tarefas Prioritárias
 * Rastreia hábitos de forma compacta e gerencia tarefas com suporte à sintaxe do plugin Tasks.
 */
return {
  id: 'snoopy_daily_tracker',
  titulo: 'Hábitos & Central de Tarefas',
  async render(ctx) {
    const { root, app, dv, todayStr, dailyPath, garantirNotaDiaria } = ctx;

    // Bloco Inferior: Hábitos Diários & Central de Tarefas em Largura Total
    const leftBottom = root.createEl('div', { cls: 'abyssal-card-box', attr: { style: 'display: flex; flex-direction: column; gap: 14px; margin-bottom: 24px;' } });

    // =========================================================================
    // 1. FAIXA COMPACTA: HÁBITOS DO DIA
    // =========================================================================
    const habitsSection = leftBottom.createEl('div');
    const habitsHeader = habitsSection.createEl('div', { 
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;' } 
    });

    habitsHeader.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="abyssal-section-title">HÁBITOS DE HOJE</span>
        <span style="font-size: 11.5px; font-family: monospace; color: #a1a1aa; cursor: pointer;" title="Abrir nota diária de hoje">01_Inbox/Diário (${todayStr})</span>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span id="abyssal-habit-pct" style="font-size: 11.5px; font-family: monospace; color: #86efac; font-weight: bold;">0%</span>
        <button id="abyssal-add-habit-btn" class="abyssal-col-add-btn" style="padding: 2px 8px; font-size: 11px; width: auto; height: auto;" title="Adicionar novo hábito na nota diária">+ HÁBITO</button>
      </div>
    `;

    const habitsTrack = habitsSection.createEl('div', { 
      cls: 'abyssal-prog-track', 
      attr: { style: 'height: 4px; width: 100%; margin-bottom: 10px;' } 
    });
    const habitsBar = habitsTrack.createEl('div', { 
      cls: 'abyssal-prog-fill', 
      attr: { style: 'width: 0%; background: #86efac;' } 
    });

    const habitsPillsBox = habitsSection.createEl('div', { 
      attr: { style: 'display: flex; flex-wrap: wrap; gap: 8px;' } 
    });

    const defaultHabits = ['Leitura 20 min', 'Estudo Algoritmos', 'Pomodoro 4x', 'Exercício Físico'];

    // Modal para novo hábito
    function abrirModalNovoHabito() {
      const modalBg = document.createElement('div');
      modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
      
      const modalBox = document.createElement('div');
      modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 380px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';
      
      modalBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; font-weight: bold; color: #ffffff;">🎯 Novo Hábito Diário</span>
          <button id="modal-close-habit" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
        </div>
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa;">Adicionar hábito à nota de hoje (${todayStr}):</div>
        <input id="modal-habit-input" type="text" placeholder="Ex: Hidratação 2L, Vocabulário..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;">
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
          <button id="modal-cancel-habit" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
          <button id="modal-save-habit" class="abyssal-btn-primary" style="font-size: 11px;">Salvar Hábito</button>
        </div>
      `;
      
      modalBg.appendChild(modalBox);
      document.body.appendChild(modalBg);
      
      const fechar = () => {
        document.removeEventListener('keydown', handleKey);
        if (modalBg.parentNode) document.body.removeChild(modalBg);
      };

      const handleKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          fechar();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const saveBtn = modalBox.querySelector('#modal-save-habit');
          if (saveBtn) saveBtn.click();
        }
      };
      document.addEventListener('keydown', handleKey);

      modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) fechar();
      });
      
      const closeBtn = modalBox.querySelector('#modal-close-habit');
      if (closeBtn) closeBtn.addEventListener('click', fechar);
      const cancelBtn = modalBox.querySelector('#modal-cancel-habit');
      if (cancelBtn) cancelBtn.addEventListener('click', fechar);
      
      const saveBtn = modalBox.querySelector('#modal-save-habit');
      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          const inputEl = modalBox.querySelector('#modal-habit-input');
          const metaNome = inputEl ? inputEl.value.trim() : '';
          if (metaNome) {
            const dailyFile = await garantirNotaDiaria();
            const raw = await app.vault.read(dailyFile);
            let updated = raw;
            if (updated.includes('## Hábitos')) {
              updated = updated.replace('## Hábitos', `## Hábitos\n- [ ] ${metaNome}`);
            } else {
              updated += `\n\n## Hábitos\n- [ ] ${metaNome}\n`;
            }
            await app.vault.modify(dailyFile, updated);
            new Notice(`🎯 Novo hábito adicionado: ${metaNome}`);
            fechar();
            renderHabitos();
          }
        });
      }

      setTimeout(() => {
        const inputEl = modalBox.querySelector('#modal-habit-input');
        if (inputEl) inputEl.focus();
      }, 50);
    }

    const addHabitBtn = habitsHeader.querySelector('#abyssal-add-habit-btn');
    if (addHabitBtn) addHabitBtn.addEventListener('click', abrirModalNovoHabito);

    async function renderHabitos() {
      habitsPillsBox.innerHTML = '';
      let file = app.vault.getAbstractFileByPath(dailyPath);
      let habits = [];

      if (file) {
        const raw = await app.vault.read(file);
        const lines = raw.split('\n');
        let inSection = false;
        lines.forEach((l, idx) => {
          if (/^##\s+H[áa]bitos/i.test(l)) { inSection = true; return; }
          if (inSection && /^##\s+/.test(l)) { inSection = false; }
          if (inSection) {
            const match = l.match(/^- \[([ xX])\] (.*)$/);
            if (match) {
              habits.push({ name: match[2].trim(), checked: match[1].toLowerCase() === 'x', line: idx });
            }
          }
        });
      }

      if (habits.length === 0) {
        defaultHabits.forEach(name => habits.push({ name, checked: false, line: -1 }));
      }

      let checkedCount = 0;
      habits.forEach(h => {
        const pill = habitsPillsBox.createEl('label', { 
          cls: 'abyssal-habit-pill',
          attr: { style: h.checked ? 'background: rgba(134, 239, 172, 0.12); border-color: rgba(134, 239, 172, 0.4);' : '' }
        });
        
        const cb = pill.createEl('input', { cls: 'abyssal-circle-check', attr: { type: 'checkbox' } });
        cb.checked = h.checked;
        if (h.checked) checkedCount++;

        cb.addEventListener('change', async () => {
          const dailyFile = await garantirNotaDiaria();
          const raw = await app.vault.read(dailyFile);
          const lines = raw.split('\n');
          
          let habitFound = false;
          const newLines = lines.map(line => {
            if (line.includes(h.name)) {
              habitFound = true;
              return cb.checked ? line.replace(/- \[ \]/, '- [x]') : line.replace(/- \[[xX]\]/, '- [ ]');
            }
            return line;
          });

          if (!habitFound) {
            newLines.push(`- [${cb.checked ? 'x' : ' '}] ${h.name}`);
          }

          await app.vault.modify(dailyFile, newLines.join('\n'));
          new Notice(`Hábito: ${h.name}`);
          renderHabitos();
        });

        const spanText = pill.createEl('span', { 
          text: h.name,
          attr: { style: h.checked ? 'color: #86efac; font-weight: 600;' : '' }
        });
      });

      const pct = habits.length > 0 ? Math.round((checkedCount / habits.length) * 100) : 0;
      if (habitsBar) habitsBar.style.width = pct + '%';
      const pctEl = habitsHeader.querySelector('#abyssal-habit-pct');
      if (pctEl) pctEl.textContent = `${checkedCount}/${habits.length} • ${pct}%`;
    }

    await renderHabitos();

    // =========================================================================
    // 2. CENTRAL DE TAREFAS PRIORITÁRIAS (Com Suporte ao Tasks Plugin)
    // =========================================================================
    const todoSection = leftBottom.createEl('div', { 
      attr: { style: 'padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06); display: flex; flex-direction: column; gap: 10px; flex: 1;' } 
    });

    const todoHeader = todoSection.createEl('div', { 
      attr: { style: 'display: flex; justify-content: space-between; align-items: center;' } 
    });

    todoHeader.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="abyssal-section-title">CENTRAL DE TAREFAS</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <button id="abyssal-add-task-btn" class="abyssal-nav-pill-btn" style="padding: 2px 9px; font-size: 11px;" title="Adicionar nova tarefa">+ TAREFA</button>
      </div>
    `;

    // Abas de Filtro
    const tabsRow = todoSection.createEl('div', { 
      attr: { style: 'display: flex; gap: 6px; padding-bottom: 4px;' } 
    });

    let currentTab = 'hoje'; // 'hoje' | 'proximas' | 'todas'

    const tabConfig = [
      { id: 'hoje', label: '🔥 HOJE & ATRASADAS' },
      { id: 'proximas', label: '📋 PRÓXIMAS' },
      { id: 'todas', label: '📥 TODAS' }
    ];

    const tabBtns = {};
    tabConfig.forEach(tab => {
      const btn = tabsRow.createEl('button', { 
        cls: `abyssal-btn-mode ${tab.id === currentTab ? 'active' : ''}`,
        attr: { style: 'padding: 3px 8px; font-size: 10.5px; border-radius: 4px;' },
        text: tab.label
      });
      tabBtns[tab.id] = btn;
      btn.addEventListener('click', () => {
        currentTab = tab.id;
        Object.keys(tabBtns).forEach(k => tabBtns[k].classList.toggle('active', k === currentTab));
        renderTarefas();
      });
    });

    // Container com lista de tarefas
    const todoListContainer = todoSection.createEl('div', { 
      cls: 'abyssal-kanban-cards-box',
      attr: { style: 'max-height: 250px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px;' } 
    });

    // Modal Nova Tarefa
    function abrirModalNovaTarefa() {
      // Coleta iniciativas ativas para o seletor híbrido
      let iniciativas = [];
      try {
        const pages = dv.pages('"02_Projetos" or "03_Estudos"')
          .where(p => p.file && !p.file.name.includes("Template") && !p.file.name.includes("Painel"));
        pages.forEach(p => {
          const isEstudo = p.file.path.startsWith("03_Estudos");
          iniciativas.push({
            nome: p.title || p.file.name,
            path: p.file.path,
            tipo: isEstudo ? 'estudo' : 'projeto',
            icone: isEstudo ? '📚' : '🎯'
          });
        });
        iniciativas.sort((a, b) => a.nome.localeCompare(b.nome));
      } catch(e) {}

      const modalBg = document.createElement('div');
      modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
      
      const modalBox = document.createElement('div');
      modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 440px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';
      
      modalBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; font-weight: bold; color: #ffffff;">📋 Nova Tarefa</span>
          <button id="modal-close-task" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
        </div>
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa;">Descrição da tarefa:</div>
        <input id="modal-task-text" type="text" placeholder="Ex: Entregar relatório de arquitetura..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;">
        
        <div>
          <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Vínculo / Onde Salvar:</div>
          <select id="modal-task-target" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
            <option value="daily" selected>📝 Diário de Hoje (${todayStr})</option>
            ${iniciativas.map(ini => `<option value="${ini.path}">${ini.icone} [${ini.tipo === 'estudo' ? 'Estudo' : 'Projeto'}] ${ini.nome}</option>`).join('')}
          </select>
        </div>

        <div style="display: flex; gap: 8px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Data de Prazo (Tasks):</div>
            <input id="modal-task-date" type="date" value="${todayStr}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
          </div>
          <div style="flex: 1;">
            <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Prioridade:</div>
            <select id="modal-task-prio" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
              <option value="⏫">Alta (⏫)</option>
              <option value="🔼" selected>Média (🔼)</option>
              <option value="🔽">Baixa (🔽)</option>
              <option value="">Nenhuma</option>
            </select>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
          <button id="modal-cancel-task" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
          <button id="modal-save-task" class="abyssal-btn-primary" style="font-size: 11px;">Criar Tarefa</button>
        </div>
      `;
      
      modalBg.appendChild(modalBox);
      document.body.appendChild(modalBg);
      
      const fechar = () => {
        document.removeEventListener('keydown', handleKey);
        if (modalBg.parentNode) document.body.removeChild(modalBg);
      };

      const handleKey = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          fechar();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const saveBtn = modalBox.querySelector('#modal-save-task');
          if (saveBtn) saveBtn.click();
        }
      };
      document.addEventListener('keydown', handleKey);

      modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) fechar();
      });
      
      const closeBtn = modalBox.querySelector('#modal-close-task');
      if (closeBtn) closeBtn.addEventListener('click', fechar);
      const cancelBtn = modalBox.querySelector('#modal-cancel-task');
      if (cancelBtn) cancelBtn.addEventListener('click', fechar);
      
      const saveBtn = modalBox.querySelector('#modal-save-task');
      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          const txtEl = modalBox.querySelector('#modal-task-text');
          const targetEl = modalBox.querySelector('#modal-task-target');
          const dateEl = modalBox.querySelector('#modal-task-date');
          const prioEl = modalBox.querySelector('#modal-task-prio');
          
          const texto = txtEl ? txtEl.value.trim() : '';
          const destino = targetEl ? targetEl.value : 'daily';
          const prazo = dateEl ? dateEl.value.trim() : '';
          const prio = prioEl ? prioEl.value.trim() : '';

          if (texto) {
            let taskLine = `- [ ] ${texto}`;
            if (prazo) taskLine += ` 📅 ${prazo}`;
            if (prio) taskLine += ` ${prio}`;

            if (destino === 'daily') {
              // Salva na nota diária de hoje
              const dailyFile = await garantirNotaDiaria();
              const raw = await app.vault.read(dailyFile);
              let updated = raw;
              if (updated.includes('## 🎯 Foco Principal de Hoje')) {
                updated = updated.replace('## 🎯 Foco Principal de Hoje', `## 🎯 Foco Principal de Hoje\n${taskLine}`);
              } else {
                updated += `\n\n## 🎯 Foco Principal de Hoje\n${taskLine}\n`;
              }
              await app.vault.modify(dailyFile, updated);
              new Notice(`📋 Tarefa registrada na nota diária!`);
            } else {
              // Salva diretamente na iniciativa (Projeto ou Estudo) selecionada
              const targetFile = app.vault.getAbstractFileByPath(destino);
              if (targetFile) {
                const raw = await app.vault.read(targetFile);
                let updated = raw;
                const headerMatch = updated.match(/^##\s+.*Tarefas/m);
                if (headerMatch) {
                  updated = updated.replace(headerMatch[0], `${headerMatch[0]}\n${taskLine}`);
                } else {
                  updated += `\n\n## 📋 Tarefas\n${taskLine}\n`;
                }
                await app.vault.modify(targetFile, updated);
                new Notice(`🎯 Tarefa vinculada a "${targetFile.basename}"!`);
              }
            }

            fechar();
            renderTarefas();
          }
        });
      }

      setTimeout(() => {
        const txtEl = modalBox.querySelector('#modal-task-text');
        if (txtEl) txtEl.focus();
      }, 50);
    }

    const addTaskBtn = todoHeader.querySelector('#abyssal-add-task-btn');
    if (addTaskBtn) addTaskBtn.addEventListener('click', abrirModalNovaTarefa);

    // Renderização das Tarefas Filtradas
    async function renderTarefas() {
      todoListContainer.innerHTML = '';

      // Busca com escopo delimitado (evita travamento do vault)
      const escopo = dv.pages('"01_Inbox" or "02_Projetos" or "03_Estudos"')
        .where(p => p.file && !p.file.path.includes("Template") && !p.file.path.includes("00_Home") && !p.file.name.includes("Painel"));

      const rawTasks = escopo.file.tasks
        .where(t => !t.completed && !t.text.includes("Leitura 20 min") && !t.text.includes("Pomodoro 4x") && !t.text.includes("Exercício Físico"));

      const tasksProcessadas = [];
      const hojeDate = new Date(todayStr);

      rawTasks.forEach(t => {
        const textRaw = t.text;
        
        // Extrai prazo do plugin Tasks (📅 AAAA-MM-DD)
        const dateMatch = textRaw.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
        const dueStr = dateMatch ? dateMatch[1] : null;

        // Extrai prioridade do Tasks
        let prio = null;
        if (textRaw.includes('⏫')) prio = 'alta';
        else if (textRaw.includes('🔼')) prio = 'media';
        else if (textRaw.includes('🔽')) prio = 'baixa';

        // Texto limpo da tarefa sem os marcadores
        const cleanText = textRaw
          .replace(/📅\s*\d{4}-\d{2}-\d{2}/g, '')
          .replace(/[⏫🔼🔽]/g, '')
          .replace(/🔁[^\n]+/g, '')
          .trim();

        let statusPrazo = 'sem_prazo';
        if (dueStr) {
          if (dueStr < todayStr) statusPrazo = 'atrasada';
          else if (dueStr === todayStr) statusPrazo = 'hoje';
          else statusPrazo = 'futura';
        }

        tasksProcessadas.push({
          taskRef: t,
          cleanText,
          dueStr,
          prio,
          statusPrazo
        });
      });

      // Filtro por Aba
      let filtradas = [];
      if (currentTab === 'hoje') {
        filtradas = tasksProcessadas.filter(t => t.statusPrazo === 'atrasada' || t.statusPrazo === 'hoje');
      } else if (currentTab === 'proximas') {
        // Próximos 7 dias
        const maxData = new Date(hojeDate.getTime() + 7 * 86400000);
        const maxStr = `${maxData.getFullYear()}-${String(maxData.getMonth() + 1).padStart(2, '0')}-${String(maxData.getDate()).padStart(2, '0')}`;
        filtradas = tasksProcessadas.filter(t => t.statusPrazo === 'futura' && t.dueStr <= maxStr);
      } else {
        // Todas
        filtradas = [...tasksProcessadas];
      }

      // Ordenação: Atrasadas > Hoje > Futuras > Prioridade Alta > Sem Prazo
      filtradas.sort((a, b) => {
        const pesoPrazo = { atrasada: 1, hoje: 2, futura: 3, sem_prazo: 4 };
        const pesoPrio = { alta: 1, media: 2, baixa: 3 };
        const pA = pesoPrazo[a.statusPrazo] || 5;
        const pB = pesoPrazo[b.statusPrazo] || 5;
        if (pA !== pB) return pA - pB;
        if (a.dueStr && b.dueStr) return a.dueStr.localeCompare(b.dueStr);
        const prA = pesoPrio[a.prio] || 4;
        const prB = pesoPrio[b.prio] || 4;
        return prA - prB;
      });

      // Atualiza contadores nas abas
      const countHoje = tasksProcessadas.filter(t => t.statusPrazo === 'atrasada' || t.statusPrazo === 'hoje').length;
      if (tabBtns['hoje']) tabBtns['hoje'].textContent = `🔥 HOJE (${countHoje})`;
      if (tabBtns['todas']) tabBtns['todas'].textContent = `📥 TODAS (${tasksProcessadas.length})`;

      if (filtradas.length === 0) {
        todoListContainer.innerHTML = `
          <div style="font-size: 12px; font-family: monospace; color: #71717a; text-align: center; padding: 24px 0;">
            ${currentTab === 'hoje' ? '🎉 Nenhuma tarefa atrasada ou para hoje!' : 'Nenhuma tarefa pendente nesta categoria.'}
          </div>
        `;
        return;
      }

      filtradas.forEach(item => {
        const t = item.taskRef;
        const filePath = t.path || (t.link ? t.link.path : null);
        const fileName = t.link ? (t.link.display || t.link.path.split('/').pop().replace(/\.md$/, '')) : (filePath ? filePath.split('/').pop().replace(/\.md$/, '') : 'Nota');

        const card = todoListContainer.createEl('div', { 
          cls: 'abyssal-kanban-card',
          attr: { style: 'padding: 8px 10px; margin-bottom: 2px; cursor: default;' } 
        });

        const rowTop = card.createEl('div', { 
          attr: { style: 'display: flex; align-items: flex-start; justify-content: space-between; gap: 8px;' } 
        });

        const label = rowTop.createEl('label', { 
          attr: { style: 'display: flex; align-items: flex-start; gap: 8px; cursor: pointer; flex: 1;' } 
        });

        const cb = label.createEl('input', { 
          cls: 'abyssal-circle-check', 
          attr: { type: 'checkbox', style: 'margin-top: 2px;' } 
        });

        const textSpan = label.createEl('span', { 
          text: item.cleanText,
          attr: { style: 'font-size: 13px; font-weight: 600; color: #ffffff; line-height: 1.35; flex: 1;' } 
        });

        // Badges na lateral direita
        const badgesCol = rowTop.createEl('div', { 
          attr: { style: 'display: flex; align-items: center; gap: 4px; flex-shrink: 0;' } 
        });

        if (item.statusPrazo === 'atrasada') {
          badgesCol.createEl('span', { 
            cls: 'prio-badge prio-alta',
            attr: { style: 'font-size: 10px; padding: 1px 5px;' },
            text: `⚠️ Atrasada (${item.dueStr.slice(5).replace('-', '/')})` 
          });
        } else if (item.statusPrazo === 'hoje') {
          badgesCol.createEl('span', { 
            attr: { style: 'font-size: 10px; font-family: monospace; font-weight: bold; padding: 1px 6px; border-radius: 4px; background: rgba(96, 165, 250, 0.2); color: #93c5fd;' },
            text: '📅 Hoje' 
          });
        } else if (item.dueStr) {
          badgesCol.createEl('span', { 
            attr: { style: 'font-size: 10px; font-family: monospace; color: #a1a1aa;' },
            text: `📅 ${item.dueStr.slice(5).replace('-', '/')}` 
          });
        }

        if (item.prio === 'alta') {
          badgesCol.createEl('span', { text: '⏫', attr: { title: 'Prioridade Alta' } });
        }

        // Linha inferior do card com a iniciativa / nota de origem
        if (filePath) {
          const rowBottom = card.createEl('div', { 
            attr: { style: 'display: flex; justify-content: flex-end; padding-top: 4px; margin-top: 4px; border-top: 1px solid rgba(255,255,255,0.04);' } 
          });

          let badgeIcone = '📄 ';
          let badgeLabel = fileName;
          if (filePath.startsWith('02_Projetos/')) {
            badgeIcone = '🎯 ';
            badgeLabel = `Projeto: ${fileName}`;
          } else if (filePath.startsWith('03_Estudos/')) {
            badgeIcone = '📚 ';
            badgeLabel = `Estudo: ${fileName}`;
          } else if (filePath.startsWith('01_Inbox/Diário/')) {
            badgeIcone = '📝 ';
            badgeLabel = `Diário: ${fileName}`;
          }

          const linkEl = rowBottom.createEl('a', { 
            cls: 'abyssal-todo-source',
            attr: { style: 'font-size: 11px;', title: `Abrir nota: ${filePath}` },
            text: `${badgeIcone}${badgeLabel}` 
          });
          linkEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            app.workspace.openLinkText(filePath, "", false);
          });
        }

        // Conclusão da tarefa com sincronização real
        cb.addEventListener('change', async () => {
          if (filePath) {
            const file = app.vault.getAbstractFileByPath(filePath);
            if (file) {
              const raw = await app.vault.read(file);
              const lines = raw.split('\n');
              let idx = t.line;
              if (idx === undefined || !lines[idx] || !lines[idx].includes(t.text)) {
                idx = lines.findIndex(l => l.includes(t.text));
              }
              if (idx !== -1) {
                lines[idx] = lines[idx].replace(/- \[ \]/, '- [x]');
                await app.vault.modify(file, lines.join('\n'));
                new Notice(`✅ Tarefa concluída: ${item.cleanText}`);
                textSpan.style.textDecoration = 'line-through';
                textSpan.style.color = '#71717a';
                setTimeout(renderTarefas, 300);
              }
            }
          }
        });
      });
    }

    await renderTarefas();
  }
};
