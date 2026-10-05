/**
 * Snoopy Vault - Módulo 04: Hábitos Diários & Central de Tarefas Prioritárias
 * Rastreia hábitos de forma compacta e gerencia tarefas com suporte à sintaxe do plugin Tasks.
 */
return {
  id: 'snoopy_daily_tracker',
  titulo: 'Hábitos & Central de Tarefas',
  async render(ctx) {
    const { root, app, dv, todayStr, dailyPath, garantirNotaDiaria } = ctx;

    // =========================================================================
    // MINI-FRAMEWORK SUPERIOR: HUB DIÁRIO 30% HÁBITOS / 70% TAREFAS
    // =========================================================================
    const hubGrid = root.createEl('div', { 
      cls: 'snoopy-daily-hub-grid',
      attr: { 
        style: 'display: grid; grid-template-columns: minmax(260px, 30%) 1fr; gap: 16px; margin-bottom: 20px; align-items: stretch;' 
      } 
    });

    // LADO ESQUERDO (30%): HÁBITOS DIÁRIOS
    const habitsCard = hubGrid.createEl('div', { 
      cls: 'abyssal-card-box', 
      attr: { style: 'display: flex; flex-direction: column; justify-content: space-between; gap: 10px;' } 
    });

    const habitsTop = habitsCard.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 8px;' }
    });

    const habitsHeader = habitsTop.createEl('div', { 
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px;' } 
    });

    habitsHeader.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px;">
        <span class="abyssal-section-title">HÁBITOS DE HOJE</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span id="abyssal-habit-pct" style="font-size: 11px; font-family: monospace; color: #86efac; font-weight: bold;">0%</span>
      </div>
    `;

    const habitsTrack = habitsTop.createEl('div', { 
      cls: 'abyssal-prog-track', 
      attr: { style: 'height: 3px; width: 100%; margin-bottom: 4px;' } 
    });
    const habitsBar = habitsTrack.createEl('div', { 
      cls: 'abyssal-prog-fill', 
      attr: { style: 'width: 0%; background: #86efac;' } 
    });

    const habitsPillsBox = habitsTop.createEl('div', { 
      attr: { style: 'display: flex; flex-direction: column; gap: 6px;' } 
    });

    const defaultHabits = ['Leitura 20 min', 'Estudo Algoritmos', 'Pomodoro 4x', 'Exercício Físico'];

    const habitsFooter = habitsCard.createEl('div', {
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; border-top: 1px solid rgba(255,255,255,0.06); padding-top: 8px; margin-top: 6px;' }
    });
    habitsFooter.innerHTML = `
      <span style="font-size: 10.5px; font-family: monospace; color: #71717a; cursor: pointer;" title="Abrir nota diária de hoje">01_Inbox/Diário</span>
      <button id="abyssal-add-habit-btn" class="abyssal-btn-action" style="padding: 2px 8px; font-size: 11px;" title="Adicionar novo hábito">+ HÁBITO</button>
    `;

    // Modal para novo hábito com suporte a Persistência (Template Diário vs Hoje)
    function abrirModalNovoHabito() {
      const modalBg = document.createElement('div');
      modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.82); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
      
      const modalBox = document.createElement('div');
      modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 400px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.85); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';
      
      modalBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; font-weight: bold; color: #ffffff;">🎯 Cadastrar Hábito</span>
          <button id="modal-close-habit" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
        </div>
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa;">Nome da atividade de disciplina:</div>
        <input id="modal-habit-input" type="text" placeholder="Ex: Hidratação 2.5L, Meditação..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;">
        
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-top: 2px;">Escopo de repetição:</div>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <div id="scope-opt-persistente" style="background: rgba(134,239,172,0.1); border: 1px solid #86efac; border-radius: 6px; padding: 8px; cursor: pointer;">
            <div style="font-size: 11.5px; font-weight: 700; color: #86efac;">● Persistente</div>
            <div style="font-size: 9.5px; color: #71717a; margin-top: 2px;">Salva no Template Diário para todos os dias.</div>
          </div>
          <div id="scope-opt-hoje" style="background: #14141d; border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 8px; cursor: pointer;">
            <div style="font-size: 11.5px; font-weight: 700; color: #d4d4d8;">○ Apenas Hoje</div>
            <div style="font-size: 9.5px; color: #71717a; margin-top: 2px;">Salva somente na nota diária de hoje.</div>
          </div>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
          <button id="modal-cancel-habit" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
          <button id="modal-save-habit" class="abyssal-btn-primary" style="font-size: 11px;">Salvar Hábito</button>
        </div>
      `;
      
      modalBg.appendChild(modalBox);
      document.body.appendChild(modalBg);
      
      let escopoSelecionado = 'persistente';
      const optPersistente = modalBox.querySelector('#scope-opt-persistente');
      const optHoje = modalBox.querySelector('#scope-opt-hoje');

      optPersistente.onclick = () => {
        escopoSelecionado = 'persistente';
        optPersistente.style.background = 'rgba(134,239,172,0.1)';
        optPersistente.style.borderColor = '#86efac';
        optPersistente.querySelector('div').style.color = '#86efac';
        optHoje.style.background = '#14141d';
        optHoje.style.borderColor = 'rgba(255,255,255,0.08)';
        optHoje.querySelector('div').style.color = '#d4d4d8';
      };

      optHoje.onclick = () => {
        escopoSelecionado = 'hoje';
        optHoje.style.background = 'rgba(134,239,172,0.1)';
        optHoje.style.borderColor = '#86efac';
        optHoje.querySelector('div').style.color = '#86efac';
        optPersistente.style.background = '#14141d';
        optPersistente.style.borderColor = 'rgba(255,255,255,0.08)';
        optPersistente.querySelector('div').style.color = '#d4d4d8';
      };

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

            // Se for persistente, adiciona também no Template do Diário
            if (escopoSelecionado === 'persistente') {
              const tplFile = app.vault.getAbstractFileByPath("99_Meta/Templates/Template - Diário.md");
              if (tplFile) {
                const rawTpl = await app.vault.read(tplFile);
                if (rawTpl.includes('## Hábitos') && !rawTpl.includes(metaNome)) {
                  const updatedTpl = rawTpl.replace('## Hábitos', `## Hábitos\n- [ ] ${metaNome}`);
                  await app.vault.modify(tplFile, updatedTpl);
                }
              }
            }

            new Notice(`🎯 Hábito adicionado [${escopoSelecionado.toUpperCase()}]: ${metaNome}`);
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

    const addHabitBtn = habitsFooter.querySelector('#abyssal-add-habit-btn');
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
    // 2. CENTRAL DE TAREFAS PRIORITÁRIAS (70% - Núcleo de Execução do Ecossistema)
    // =========================================================================
    const tasksCard = hubGrid.createEl('div', { 
      cls: 'abyssal-card-box', 
      attr: { style: 'display: flex; flex-direction: column; gap: 10px;' } 
    });

    const todoHeader = tasksCard.createEl('div', { 
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid rgba(255,255,255,0.06); padding-bottom: 8px;' } 
    });

    todoHeader.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="abyssal-section-title">CENTRAL DE TAREFAS</span>
        <span style="font-size: 11px; color: #71717a; font-family: monospace;">Núcleo de Execução</span>
      </div>
      <div style="display: flex; align-items: center; gap: 6px;">
        <button id="abyssal-add-task-btn" class="abyssal-nav-pill-btn" style="padding: 2px 9px; font-size: 11px;" title="Adicionar nova tarefa">+ TAREFA</button>
      </div>
    `;

    // Abas de Filtro por Período
    const tabsRow = tasksCard.createEl('div', { 
      attr: { style: 'display: flex; gap: 6px; padding-bottom: 4px; overflow-x: auto;' } 
    });

    let currentTab = 'hoje'; // 'hoje' | 'amanha' | 'semana' | 'todas' | 'concluidas'

    const tabConfig = [
      { id: 'hoje', label: '🔥 HOJE' },
      { id: 'amanha', label: '📅 AMANHÃ' },
      { id: 'semana', label: '🗓️ ESTA SEMANA' },
      { id: 'todas', label: '📥 PRÓXIMAS' },
      { id: 'concluidas', label: '✓ CONCLUÍDAS' }
    ];

    const tabBtns = {};
    tabConfig.forEach(tab => {
      const btn = tabsRow.createEl('button', { 
        cls: `abyssal-btn-mode ${tab.id === currentTab ? 'active' : ''}`,
        attr: { style: 'padding: 4px 10px; font-size: 11px; border-radius: 4px; white-space: nowrap;' },
        text: tab.label
      });
      tabBtns[tab.id] = btn;
      btn.addEventListener('click', () => {
        currentTab = tab.id;
        Object.keys(tabBtns).forEach(k => tabBtns[k].classList.toggle('active', k === currentTab));
        renderTarefas();
      });
    });

    // Sub-faixa de Sugestão Inteligente do Ecossistema
    const recsBar = tasksCard.createEl('div', {
      attr: { style: 'background: #0d0d14; border: 1px dashed rgba(255,255,255,0.08); border-radius: 6px; padding: 6px 10px; display: none; justify-content: space-between; align-items: center; font-size: 11px;' }
    });

    // Container com lista de tarefas
    const todoListContainer = tasksCard.createEl('div', { 
      cls: 'abyssal-kanban-cards-box',
      attr: { style: 'max-height: 290px; overflow-y: auto; display: flex; flex-direction: column; gap: 6px; padding-right: 4px;' } 
    });

    // Helper: calcular data somando dias
    function somarDias(dataBaseStr, dias) {
      const d = new Date(dataBaseStr);
      d.setDate(d.getDate() + dias);
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }

    function normalizarParaISO(dStr) {
      if (!dStr) return null;
      const matchBR = String(dStr).match(/^(\d{2})-(\d{2})-(\d{4})$/);
      if (matchBR) {
        return `${matchBR[3]}-${matchBR[2]}-${matchBR[1]}`;
      }
      const matchISO = String(dStr).match(/^(\d{4})-(\d{2})-(\d{2})$/);
      if (matchISO) {
        return dStr;
      }
      return dStr;
    }

    function formatarDataDDMMYYYY(dStr) {
      if (!dStr) return '';
      const matchISO = String(dStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (matchISO) {
        return `${matchISO[3].padStart(2, '0')}-${matchISO[2].padStart(2, '0')}-${matchISO[1]}`;
      }
      const matchBR = String(dStr).match(/^(\d{1,2})-(\d{1,2})-(\d{4})/);
      if (matchBR) {
        return `${matchBR[1].padStart(2, '0')}-${matchBR[2].padStart(2, '0')}-${matchBR[3]}`;
      }
      return String(dStr);
    }

    // Modal 1: Nova Tarefa com Chips Rápidos de 1 Toque
    function abrirModalNovaTarefa() {
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
      modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.82); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
      
      const modalBox = document.createElement('div');
      modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 480px; width: 100%; padding: 24px; box-shadow: 0 12px 45px rgba(0,0,0,0.85); display: flex; flex-direction: column; gap: 14px; font-family: sans-serif;';
      
      const amanhãStr = somarDias(todayStr, 1);
      const semanaStr = somarDias(todayStr, 7);

      modalBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <div>
            <div style="font-size: 15px; font-weight: bold; color: #ffffff;">+ Nova Tarefa</div>
            <div style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">Adicione uma ação com prazo e estimativa de foco</div>
          </div>
          <button id="modal-close-task" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 16px;">✕</button>
        </div>

        <div>
          <div style="font-size: 11px; font-family: monospace; color: #d4d4d8; font-weight: bold; margin-bottom: 4px;">1. O que precisa ser feito?</div>
          <input id="modal-task-text" type="text" placeholder="Ex: Resolver 15 exercícios de SQL, Revisar arquitetura..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 9px; color: #ffffff; font-size: 12.5px; outline: none;">
        </div>

        <div>
          <div style="font-size: 11px; font-family: monospace; color: #d4d4d8; font-weight: bold; margin-bottom: 6px;">2. Prazo de Entrega:</div>
          <div id="modal-chips-prazos" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
            <button type="button" class="chip-prazo-opt" data-prazo="${todayStr}" style="background: var(--interactive-accent, #60a5fa); color: #000000; font-weight: bold; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer;">Hoje (${formatarDataDDMMYYYY(todayStr)})</button>
            <button type="button" class="chip-prazo-opt" data-prazo="${amanhãStr}" style="background: rgba(255,255,255,0.06); color: #e4e4e7; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer;">Amanhã (${formatarDataDDMMYYYY(amanhãStr)})</button>
            <button type="button" class="chip-prazo-opt" data-prazo="${semanaStr}" style="background: rgba(255,255,255,0.06); color: #e4e4e7; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer;">Esta Semana (${formatarDataDDMMYYYY(semanaStr)})</button>
            <button type="button" class="chip-prazo-opt" data-prazo="" style="background: rgba(255,255,255,0.06); color: #e4e4e7; border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; padding: 4px 10px; font-size: 11px; cursor: pointer;">Sem Prazo</button>
          </div>
          <input id="modal-task-date" type="date" value="${todayStr}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 11.5px; outline: none;">
        </div>

        <div style="display: flex; gap: 10px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; font-family: monospace; color: #d4d4d8; font-weight: bold; margin-bottom: 6px;">3. Prioridade:</div>
            <select id="modal-task-prio" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 11.5px; outline: none;">
              <option value="⏫">Alta (⏫)</option>
              <option value="🔼" selected>Média (🔼)</option>
              <option value="🔽">Baixa (🔽)</option>
              <option value="">Normal</option>
            </select>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 11px; font-family: monospace; color: #d4d4d8; font-weight: bold; margin-bottom: 6px;">4. Meta Pomodoros:</div>
            <select id="modal-task-pomos" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 11.5px; outline: none;">
              <option value="" selected>Sem meta</option>
              <option value="🍅 1">1 Pomodoro (25m)</option>
              <option value="🍅 2">2 Pomodoros (50m)</option>
              <option value="🍅 3">3 Pomodoros (1h15)</option>
              <option value="🍅 4">4 Pomodoros (1h40)</option>
            </select>
          </div>
        </div>

        <div>
          <div style="font-size: 11px; font-family: monospace; color: #d4d4d8; font-weight: bold; margin-bottom: 4px;">5. Vínculo / Onde Salvar:</div>
          <select id="modal-task-target" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 11.5px; outline: none;">
            <option value="daily" selected>📝 Diário de Hoje (${formatarDataDDMMYYYY(todayStr)})</option>
            ${iniciativas.map(ini => `<option value="${ini.path}">${ini.icone} [${ini.tipo === 'estudo' ? 'Estudo' : 'Projeto'}] ${ini.nome}</option>`).join('')}
          </select>
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
          <button id="modal-cancel-task" class="abyssal-btn-action" style="font-size: 11.5px; padding: 6px 14px;">Cancelar</button>
          <button id="modal-save-task" class="abyssal-btn-primary" style="font-size: 11.5px; padding: 6px 16px;">Criar Tarefa</button>
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
        } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
          e.preventDefault();
          const saveBtn = modalBox.querySelector('#modal-save-task');
          if (saveBtn) saveBtn.click();
        }
      };
      document.addEventListener('keydown', handleKey);

      modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) fechar();
      });
      
      modalBox.querySelector('#modal-close-task').onclick = fechar;
      modalBox.querySelector('#modal-cancel-task').onclick = fechar;
      
      const dateInput = modalBox.querySelector('#modal-task-date');
      modalBox.querySelectorAll('.chip-prazo-opt').forEach(chip => {
        chip.onclick = () => {
          dateInput.value = chip.dataset.prazo;
          modalBox.querySelectorAll('.chip-prazo-opt').forEach(c => {
            c.style.background = 'rgba(255,255,255,0.06)';
            c.style.color = '#e4e4e7';
            c.style.fontWeight = 'normal';
          });
          chip.style.background = 'var(--interactive-accent, #60a5fa)';
          chip.style.color = '#000000';
          chip.style.fontWeight = 'bold';
        };
      });

      modalBox.querySelector('#modal-save-task').onclick = async () => {
        const texto = modalBox.querySelector('#modal-task-text').value.trim();
        const prazo = dateInput.value.trim();
        const prio = modalBox.querySelector('#modal-task-prio').value.trim();
        const pomos = modalBox.querySelector('#modal-task-pomos').value.trim();
        const destino = modalBox.querySelector('#modal-task-target').value;

        if (!texto) {
          new Notice("Informe a descrição da tarefa.");
          return;
        }

        let taskLine = `- [ ] ${texto}`;
        if (pomos) taskLine += ` ${pomos}`;
        if (prazo) taskLine += ` 📅 ${formatarDataDDMMYYYY(prazo)}`;
        if (prio) taskLine += ` ${prio}`;

        if (destino === 'daily') {
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
      };

      setTimeout(() => modalBox.querySelector('#modal-task-text').focus(), 50);
    }

    const addTaskBtn = todoHeader.querySelector('#abyssal-add-task-btn');
    if (addTaskBtn) addTaskBtn.addEventListener('click', abrirModalNovaTarefa);

    // Modal 2: Menu Contextual de 3 Pontos (⋮) da Tarefa
    function abrirModalMenuTarefa(item, t, filePath) {
      const modalBg = document.createElement('div');
      modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
      
      const modalBox = document.createElement('div');
      modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 400px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';

      modalBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; font-weight: bold; color: #ffffff;">Gerenciar Tarefa</span>
          <button id="modal-close-task-menu" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
        </div>

        <div style="background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 10px; font-size: 12.5px; color: #ffffff; font-weight: 600;">
          ${item.cleanText}
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          <button id="btn-act-foco-pomo" class="abyssal-btn-primary" style="font-size: 11.5px; padding: 8px; text-align: left; display: flex; align-items: center; gap: 8px;">
            <span>▶</span> Puxar para o Timer Pomodoro Agora
          </button>
          <button id="btn-act-adiar-amanha" class="abyssal-btn-action" style="font-size: 11.5px; padding: 8px; text-align: left; display: flex; align-items: center; gap: 8px;">
            <span>📅</span> Adiar Prazo para Amanhã
          </button>
          <button id="btn-act-prio-alta" class="abyssal-btn-action" style="font-size: 11.5px; padding: 8px; text-align: left; display: flex; align-items: center; gap: 8px;">
            <span>⏫</span> Definir Prioridade Alta
          </button>
          <button id="btn-act-abrir-nota" class="abyssal-btn-action" style="font-size: 11.5px; padding: 8px; text-align: left; display: flex; align-items: center; gap: 8px;">
            <span>📄</span> Abrir Nota de Origem
          </button>
        </div>
      `;

      modalBg.appendChild(modalBox);
      document.body.appendChild(modalBg);

      const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
      modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });
      modalBox.querySelector('#modal-close-task-menu').onclick = fechar;

      modalBox.querySelector('#btn-act-foco-pomo').onclick = () => {
        fechar();
        if (typeof window._snoopyDefinirTarefaFoco === 'function') {
          window._snoopyDefinirTarefaFoco({
            texto: item.cleanText,
            path: filePath,
            line: t.line
          });
        }
      };

      modalBox.querySelector('#btn-act-adiar-amanha').onclick = async () => {
        const amanhãStr = somarDias(todayStr, 1);
        const amanhãFormatado = formatarDataDDMMYYYY(amanhãStr);
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
              let updatedLine = lines[idx];
              if (/📅\s*(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/.test(updatedLine)) {
                updatedLine = updatedLine.replace(/📅\s*(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/, `📅 ${amanhãFormatado}`);
              } else {
                updatedLine += ` 📅 ${amanhãFormatado}`;
              }
              lines[idx] = updatedLine;
              await app.vault.modify(file, lines.join('\n'));
              new Notice(`Prazo adiado para ${amanhãFormatado}!`);
              fechar();
              renderTarefas();
            }
          }
        }
      };

      modalBox.querySelector('#btn-act-prio-alta').onclick = async () => {
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
              let updatedLine = lines[idx].replace(/[⏫🔼🔽]/g, '').trim();
              updatedLine += ` ⏫`;
              lines[idx] = updatedLine;
              await app.vault.modify(file, lines.join('\n'));
              new Notice("Prioridade alterada para Alta (⏫)!");
              fechar();
              renderTarefas();
            }
          }
        }
      };

      modalBox.querySelector('#btn-act-abrir-nota').onclick = () => {
        fechar();
        if (filePath) app.workspace.openLinkText(filePath, "", false);
      };
    }

    // Suporte global para concluir tarefa ativa a partir do Cockpit Pomodoro
    window._snoopyConcluirTarefaAtiva = async (tarefaAtiva) => {
      if (!tarefaAtiva || !tarefaAtiva.path) return;
      const file = app.vault.getAbstractFileByPath(tarefaAtiva.path);
      if (file) {
        const raw = await app.vault.read(file);
        const lines = raw.split('\n');
        let idx = tarefaAtiva.line;
        if (idx === undefined || !lines[idx] || !lines[idx].includes(tarefaAtiva.texto)) {
          idx = lines.findIndex(l => l.includes(tarefaAtiva.texto));
        }
        if (idx !== -1) {
          lines[idx] = lines[idx].replace(/- \[ \]/, `- [x] ✅ ${formatarDataDDMMYYYY(todayStr)}`);
          await app.vault.modify(file, lines.join('\n'));
          new Notice(`✅ Tarefa concluída: ${tarefaAtiva.texto}`);
          renderTarefas();
        }
      }
    };

    // Renderização das Tarefas Filtradas
    async function renderTarefas() {
      todoListContainer.innerHTML = '';

      // Busca com escopo delimitado
      const escopo = dv.pages('"01_Inbox" or "02_Projetos" or "03_Estudos"')
        .where(p => p.file && !p.file.path.includes("Template") && !p.file.path.includes("00_Home") && !p.file.name.includes("Painel"));

      const allTasks = escopo.file.tasks
        .where(t => !t.text.includes("Leitura 20 min") && !t.text.includes("Pomodoro 4x") && !t.text.includes("Exercício Físico"));

      const tasksPendentes = [];
      const tasksConcluidasHoje = [];
      const hojeDate = new Date(todayStr);

      allTasks.forEach(t => {
        const textRaw = t.text;
        
        // Extrai prazo do plugin Tasks (📅 DD-MM-AAAA ou 📅 AAAA-MM-DD)
        const dateMatch = textRaw.match(/📅\s*(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/);
        const rawDueStr = dateMatch ? dateMatch[1] : null;
        const dueStr = rawDueStr ? normalizarParaISO(rawDueStr) : null;

        // Extrai prioridade do Tasks
        let prio = null;
        if (textRaw.includes('⏫')) prio = 'alta';
        else if (textRaw.includes('🔼')) prio = 'media';
        else if (textRaw.includes('🔽')) prio = 'baixa';

        // Extrai pomodoros estimados
        const pomoMatch = textRaw.match(/🍅\s*(\d+)/);
        const pomosEst = pomoMatch ? pomoMatch[1] : null;

        // Texto limpo da tarefa sem os marcadores
        const cleanText = textRaw
          .replace(/📅\s*(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/g, '')
          .replace(/[⏫🔼🔽]/g, '')
          .replace(/🍅\s*\d+/g, '')
          .replace(/✅\s*(\d{2}-\d{2}-\d{4}|\d{4}-\d{2}-\d{2})/g, '')
          .replace(/🔁[^\n]+/g, '')
          .trim();

        let statusPrazo = 'sem_prazo';
        if (dueStr) {
          if (dueStr < todayStr) statusPrazo = 'atrasada';
          else if (dueStr === todayStr) statusPrazo = 'hoje';
          else statusPrazo = 'futura';
        }

        const taskObj = {
          taskRef: t,
          cleanText,
          dueStr,
          rawDueStr,
          prio,
          pomosEst,
          statusPrazo,
          completed: t.completed
        };

        if (t.completed) {
          const hojeBR = formatarDataDDMMYYYY(todayStr);
          const concluidaHoje = (t.path && (t.path.includes(todayStr) || t.path.includes(hojeBR))) 
            || textRaw.includes(`✅ ${todayStr}`) 
            || textRaw.includes(`✅ ${hojeBR}`);
          if (concluidaHoje) {
            tasksConcluidasHoje.push(taskObj);
          }
        } else {
          tasksPendentes.push(taskObj);
        }
      });

      // Filtro por Aba
      const amanhãStr = somarDias(todayStr, 1);
      const semanaStr = somarDias(todayStr, 7);

      let filtradas = [];
      if (currentTab === 'hoje') {
        filtradas = tasksPendentes.filter(t => t.statusPrazo === 'atrasada' || t.statusPrazo === 'hoje');
      } else if (currentTab === 'amanha') {
        filtradas = tasksPendentes.filter(t => t.dueStr === amanhãStr);
      } else if (currentTab === 'semana') {
        filtradas = tasksPendentes.filter(t => t.statusPrazo === 'futura' && t.dueStr <= semanaStr);
      } else if (currentTab === 'todas') {
        filtradas = [...tasksPendentes];
      } else if (currentTab === 'concluidas') {
        filtradas = [...tasksConcluidasHoje];
      }

      // Ordenação das pendentes: Atrasadas > Hoje > Futuras > Prioridade Alta > Sem Prazo
      if (currentTab !== 'concluidas') {
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
      }

      // Atualiza contadores nas abas dinamicamente
      const countHoje = tasksPendentes.filter(t => t.statusPrazo === 'atrasada' || t.statusPrazo === 'hoje').length;
      const countAmanha = tasksPendentes.filter(t => t.dueStr === amanhãStr).length;
      const countSemana = tasksPendentes.filter(t => t.statusPrazo === 'futura' && t.dueStr <= semanaStr).length;

      if (tabBtns['hoje']) tabBtns['hoje'].textContent = `🔥 HOJE (${countHoje})`;
      if (tabBtns['amanha']) tabBtns['amanha'].textContent = `📅 AMANHÃ (${countAmanha})`;
      if (tabBtns['semana']) tabBtns['semana'].textContent = `🗓️ ESTA SEMANA (${countSemana})`;
      if (tabBtns['todas']) tabBtns['todas'].textContent = `📥 PRÓXIMAS (${tasksPendentes.length})`;
      if (tabBtns['concluidas']) tabBtns['concluidas'].textContent = `✓ CONCLUÍDAS (${tasksConcluidasHoje.length})`;

      // Sugestão Inteligente do Ciclo de Estudos
      if (recsBar) {
        try {
          const cicloFile = app.vault.getAbstractFileByPath("99_Meta/ciclo-estudos.json");
          if (cicloFile && currentTab === 'hoje') {
            const rawCiclo = await app.vault.read(cicloFile);
            const parsedCiclo = JSON.parse(rawCiclo);
            if (parsedCiclo && parsedCiclo.disciplinas && parsedCiclo.disciplinas.length > 0) {
              const idx = parsedCiclo.disciplinaAtualIdx || 0;
              const matVez = parsedCiclo.disciplinas[idx];
              if (matVez && matVez.nome) {
                recsBar.style.display = 'flex';
                recsBar.innerHTML = `
                  <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
                    <span style="color: #60a5fa; font-weight: 700; font-family: monospace;">⚡ Sugestão do Ciclo:</span>
                    <span style="color: #ffffff; white-space: nowrap; text-overflow: ellipsis; overflow: hidden; font-weight: 600;">${matVez.nome}</span>
                  </div>
                  <button id="btn-puxar-sugestao" class="abyssal-btn-action" style="padding: 2px 7px; font-size: 10px; color: #60a5fa; flex-shrink: 0;">+ Puxar para Hoje</button>
                `;
                const btnPuxar = recsBar.querySelector('#btn-puxar-sugestao');
                if (btnPuxar) {
                  btnPuxar.onclick = async () => {
                    const dailyFile = await garantirNotaDiaria();
                    const rawDaily = await app.vault.read(dailyFile);
                    let updated = rawDaily;
                    const novaTarefa = `- [ ] Estudo: ${matVez.nome} 📅 ${todayStr} ⏫ 🍅 2`;
                    if (updated.includes('## Tarefas')) {
                      updated = updated.replace('## Tarefas', `## Tarefas\n${novaTarefa}`);
                    } else {
                      updated += `\n\n## Tarefas\n${novaTarefa}\n`;
                    }
                    await app.vault.modify(dailyFile, updated);
                    new Notice(`📚 Tarefa de Estudo adicionada: ${matVez.nome}`);
                    recsBar.style.display = 'none';
                    renderTarefas();
                  };
                }
              } else {
                recsBar.style.display = 'none';
              }
            } else {
              recsBar.style.display = 'none';
            }
          } else {
            recsBar.style.display = 'none';
          }
        } catch(e) {
          recsBar.style.display = 'none';
        }
      }

      if (filtradas.length === 0) {
        todoListContainer.innerHTML = `
          <div style="font-size: 12px; font-family: monospace; color: var(--text-muted); text-align: center; padding: 24px 0;">
            ${currentTab === 'hoje' ? '🎉 Nenhuma tarefa pendente para hoje!' : (currentTab === 'amanha' ? 'Nenhuma tarefa agendada para amanhã.' : (currentTab === 'concluidas' ? 'Nenhuma tarefa concluída hoje ainda.' : 'Nenhuma tarefa nesta categoria.'))}
          </div>
        `;
        return;
      }

      filtradas.forEach(item => {
        const t = item.taskRef;
        const filePath = t.path || (t.link ? t.link.path : null);
        const fileName = t.link ? (t.link.display || t.link.path.split('/').pop().replace(/\.md$/, '')) : (filePath ? filePath.split('/').pop().replace(/\.md$/, '') : 'Nota');

        let badgeIcone = '📄 ';
        let badgeLabel = fileName;
        let originBadgeStyle = 'background: rgba(255, 255, 255, 0.05); color: #a1a1aa; border: 1px solid rgba(255, 255, 255, 0.08);';

        if (filePath) {
          if (filePath.startsWith('02_Projetos/')) {
            badgeIcone = '🎯 ';
            badgeLabel = `Projeto: ${fileName}`;
            originBadgeStyle = 'background: rgba(167, 139, 250, 0.15); color: #c4b5fd; border: 1px solid rgba(167, 139, 250, 0.3);';
          } else if (filePath.startsWith('03_Estudos/')) {
            badgeIcone = '📚 ';
            badgeLabel = `Estudo: ${fileName}`;
            originBadgeStyle = 'background: rgba(96, 165, 250, 0.15); color: #93c5fd; border: 1px solid rgba(96, 165, 250, 0.3);';
          } else if (filePath.startsWith('04_Leituras/')) {
            badgeIcone = '📖 ';
            badgeLabel = `Leitura: ${fileName}`;
            originBadgeStyle = 'background: rgba(56, 189, 248, 0.15); color: #7dd3fc; border: 1px solid rgba(56, 189, 248, 0.3);';
          } else if (filePath.startsWith('01_Inbox/Diário/')) {
            badgeIcone = '📝 ';
            badgeLabel = `Diário: ${fileName}`;
          }
        }

        const card = todoListContainer.createEl('div', { 
          cls: 'abyssal-kanban-card',
          attr: { style: 'padding: 8px 12px; margin-bottom: 3px; display: flex; flex-direction: column; gap: 6px;' } 
        });

        const rowTop = card.createEl('div', { 
          attr: { style: 'display: flex; align-items: center; justify-content: space-between; gap: 8px;' } 
        });

        const label = rowTop.createEl('label', { 
          attr: { style: 'display: flex; align-items: center; gap: 8px; cursor: pointer; flex: 1; overflow: hidden;' } 
        });

        const cb = label.createEl('input', { 
          cls: 'abyssal-circle-check', 
          attr: { type: 'checkbox' } 
        });
        cb.checked = item.completed;

        const textSpan = label.createEl('span', { 
          text: item.cleanText,
          attr: { 
            style: `font-size: 13px; font-weight: 600; color: ${item.completed ? 'var(--text-muted)' : 'var(--text-normal)'}; ${item.completed ? 'text-decoration: line-through;' : ''} line-height: 1.35; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;` 
          } 
        });

        // Ações e Badges na lateral direita
        const badgesCol = rowTop.createEl('div', { 
          attr: { style: 'display: flex; align-items: center; gap: 6px; flex-shrink: 0;' } 
        });

        if (item.pomosEst) {
          badgesCol.createEl('span', {
            attr: { style: 'font-size: 10px; font-family: monospace; padding: 1px 5px; border-radius: 3px; background: rgba(251, 146, 60, 0.15); color: #fdba74;' },
            text: `⏱️ ${item.pomosEst}p`
          });
        }

        if (!item.completed) {
          if (item.statusPrazo === 'atrasada') {
            badgesCol.createEl('span', { 
              cls: 'prio-badge prio-alta',
              attr: { style: 'font-size: 9.5px; padding: 1px 5px;' },
              text: `⚠️ Atrasada` 
            });
          } else if (item.statusPrazo === 'hoje') {
            badgesCol.createEl('span', { 
              attr: { style: 'font-size: 9.5px; font-family: monospace; font-weight: bold; padding: 1px 6px; border-radius: 4px; background: rgba(96, 165, 250, 0.15); color: #93c5fa;' },
              text: '📅 Hoje' 
            });
          } else if (item.dueStr) {
            badgesCol.createEl('span', { 
              attr: { style: 'font-size: 9.5px; font-family: monospace; color: var(--text-muted);' },
              text: `📅 ${formatarDataDDMMYYYY(item.dueStr)}` 
            });
          }

          if (item.prio === 'alta') {
            badgesCol.createEl('span', { text: '⏫', attr: { title: 'Prioridade Alta' } });
          }

          // Botão Foco
          const btnFoco = badgesCol.createEl('button', {
            cls: 'abyssal-btn-primary',
            attr: { style: 'font-size: 10.5px; padding: 2px 8px;', title: 'Carregar no Cockpit Pomodoro' },
            text: '▶ Foco'
          });
          btnFoco.onclick = (e) => {
            e.stopPropagation();
            if (typeof window.snoopySetPomodoroFocus === 'function') {
              window.snoopySetPomodoroFocus(item.cleanText, badgeLabel);
            }
            if (typeof window._snoopyDefinirTarefaFoco === 'function') {
              window._snoopyDefinirTarefaFoco({
                texto: item.cleanText,
                path: filePath,
                line: t.line
              });
            }
          };

          // Botão Menu Contextual ⋮
          const btnMenu = badgesCol.createEl('button', {
            cls: 'abyssal-btn-action',
            attr: { style: 'font-size: 12px; padding: 1px 6px; font-weight: bold;', title: 'Ações da tarefa' },
            text: '⋮'
          });
          btnMenu.onclick = (e) => {
            e.stopPropagation();
            abrirModalMenuTarefa(item, t, filePath);
          };
        } else {
          badgesCol.createEl('span', {
            attr: { style: 'font-size: 10px; font-family: monospace; color: #86efac; font-weight: bold;' },
            text: '✓ Concluída'
          });
        }

        // Linha inferior do card com a iniciativa / nota de origem
        if (filePath) {
          const rowBottom = card.createEl('div', { 
            attr: { style: 'display: flex; justify-content: space-between; align-items: center; padding-top: 3px; border-top: 1px solid rgba(255,255,255,0.04); font-size: 10.5px; font-family: monospace;' } 
          });

          const linkEl = rowBottom.createEl('a', { 
            cls: 'abyssal-todo-source',
            attr: { 
              title: `Abrir nota: ${filePath}`,
              style: `${originBadgeStyle} padding: 1px 6px; border-radius: 3px; text-decoration: none; cursor: pointer;`
            },
            text: `${badgeIcone}${badgeLabel}` 
          });
          linkEl.addEventListener('click', (e) => {
            e.preventDefault();
            e.stopPropagation();
            app.workspace.openLinkText(filePath, "", false);
          });
        }

        // Toggle do checkbox com persistência real
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
                if (cb.checked) {
                  lines[idx] = lines[idx].replace(/- \[ \]/, `- [x] ✅ ${todayStr}`);
                  new Notice(`✅ Tarefa concluída: ${item.cleanText}`);
                } else {
                  lines[idx] = lines[idx].replace(/- \[[xX]\]/, '- [ ]').replace(/✅\s*\d{4}-\d{2}-\d{2}/, '').trim();
                  new Notice(`↩ Tarefa reaberta: ${item.cleanText}`);
                }
                await app.vault.modify(file, lines.join('\n'));
                setTimeout(renderTarefas, 200);
              }
            }
          }
        });
      });
    }

    await renderTarefas();
  }
};
