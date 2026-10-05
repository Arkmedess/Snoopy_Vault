/**
 * Snoopy Vault - Módulo 03: Kanban de Iniciativas (Projetos & Estudos)
 * Gerencia colunas dinâmicas, drag & drop desktop, controle tátil mobile (⋮) e vinculação com tarefas.
 */
return {
  id: 'snoopy_kanban_projetos',
  titulo: 'Kanban de Iniciativas',
  async render(ctx) {
    const { root, app, dv, todayStr } = ctx;

    // SEÇÃO KANBAN
    const kanbanSection = root.createEl('div', { cls: 'abyssal-kanban-section' });
    const kanbanHeader = kanbanSection.createEl('div', { 
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; flex-wrap: wrap; gap: 10px;' } 
    });

    let currentScope = 'projetos'; // 'projetos' | 'estudos' | 'todos'

    kanbanHeader.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
        <span class="abyssal-section-title">INICIATIVAS EM ANDAMENTO</span>
        <div id="kanban-scope-pills" style="display: flex; gap: 6px;">
          <button id="scope-btn-projetos" class="abyssal-btn-mode active" style="padding: 2px 8px; font-size: 11px;">Projetos</button>
          <button id="scope-btn-estudos" class="abyssal-btn-mode" style="padding: 2px 8px; font-size: 11px;">Estudos</button>
          <button id="scope-btn-todos" class="abyssal-btn-mode" style="padding: 2px 8px; font-size: 11px;">Todos</button>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 8px;">
        <button id="abyssal-add-status-btn" class="abyssal-nav-pill-btn" style="padding: 3px 9px; font-size: 11px;" title="Adicionar nova coluna de status">+ COLUNA</button>
      </div>
    `;

    // Alternador de escopo
    const scopeBtnProjetos = kanbanHeader.querySelector('#scope-btn-projetos');
    const scopeBtnEstudos = kanbanHeader.querySelector('#scope-btn-estudos');
    const scopeBtnTodos = kanbanHeader.querySelector('#scope-btn-todos');

    function setScope(scope) {
      currentScope = scope;
      if (scopeBtnProjetos) scopeBtnProjetos.classList.toggle('active', scope === 'projetos');
      if (scopeBtnEstudos) scopeBtnEstudos.classList.toggle('active', scope === 'estudos');
      if (scopeBtnTodos) scopeBtnTodos.classList.toggle('active', scope === 'todos');
      renderKanban();
    }

    if (scopeBtnProjetos) scopeBtnProjetos.addEventListener('click', () => setScope('projetos'));
    if (scopeBtnEstudos) scopeBtnEstudos.addEventListener('click', () => setScope('estudos'));
    if (scopeBtnTodos) scopeBtnTodos.addEventListener('click', () => setScope('todos'));

    const kanbanColsGrid = kanbanSection.createEl('div', { cls: 'abyssal-kanban-cols' });

    const defaultCols = [
      { status: 'Em Andamento', label: 'Em Andamento', dotColor: '#ffffff' },
      { status: 'Planejamento', label: 'Planejamento', dotColor: '#71717a' },
      { status: 'Concluído', label: 'Concluído', dotColor: '#86efac' }
    ];

    async function carregarColunas() {
      const metaPath = "99_Meta/kanban-columns.json";
      let cols = [...defaultCols];
      if (app.vault.getAbstractFileByPath(metaPath)) {
        try {
          const raw = await app.vault.read(app.vault.getAbstractFileByPath(metaPath));
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) cols = parsed;
        } catch(e) {}
      }
      return cols;
    }

    // Modal Nova Coluna de Status
    function abrirModalNovoStatus() {
      const modalBg = document.createElement('div');
      modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
      
      const modalBox = document.createElement('div');
      modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 400px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';
      
      modalBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; font-weight: bold; color: #ffffff;">📋 Nova Coluna / Status</span>
          <button id="modal-close-status" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
        </div>
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa;">Nome da nova coluna (ex: Backlog, Em Revisão, Pausado):</div>
        <input id="modal-status-input" type="text" placeholder="Ex: Backlog" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;">
        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
          <button id="modal-cancel-status" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
          <button id="modal-save-status" class="abyssal-btn-primary" style="font-size: 11px;">Criar Coluna</button>
        </div>
      `;
      
      modalBg.appendChild(modalBox);
      document.body.appendChild(modalBg);
      
      const fechar = () => {
        document.removeEventListener('keydown', handleKeyStatus);
        if (modalBg.parentNode) document.body.removeChild(modalBg);
      };

      const handleKeyStatus = (e) => {
        if (e.key === 'Escape') {
          e.preventDefault();
          fechar();
        } else if (e.key === 'Enter') {
          e.preventDefault();
          const saveBtn = modalBox.querySelector('#modal-save-status');
          if (saveBtn) saveBtn.click();
        }
      };
      document.addEventListener('keydown', handleKeyStatus);

      modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) fechar();
      });
      
      const closeStatus = modalBox.querySelector('#modal-close-status');
      if (closeStatus) closeStatus.addEventListener('click', fechar);
      const cancelStatus = modalBox.querySelector('#modal-cancel-status');
      if (cancelStatus) cancelStatus.addEventListener('click', fechar);
      
      const saveStatus = modalBox.querySelector('#modal-save-status');
      if (saveStatus) {
        saveStatus.addEventListener('click', async () => {
          const inputEl = modalBox.querySelector('#modal-status-input');
          const statusNome = inputEl ? inputEl.value.trim() : '';
          if (statusNome) {
            const metaPath = "99_Meta/kanban-columns.json";
            let cols = await carregarColunas();
            if (!cols.some(c => c.status.toLowerCase() === statusNome.toLowerCase())) {
              cols.push({ status: statusNome, label: statusNome, dotColor: '#a1a1aa' });
              let file = app.vault.getAbstractFileByPath(metaPath);
              if (file) {
                await app.vault.modify(file, JSON.stringify(cols, null, 2));
              } else {
                await app.vault.create(metaPath, JSON.stringify(cols, null, 2));
              }
              new Notice(`📋 Coluna "${statusNome}" criada!`);
              fechar();
              renderKanban();
            } else {
              new Notice(`A coluna "${statusNome}" já existe!`);
            }
          }
        });
      }

      setTimeout(() => {
        const inputEl = modalBox.querySelector('#modal-status-input');
        if (inputEl) inputEl.focus();
      }, 50);
    }

    const addStatusBtn = kanbanHeader.querySelector('#abyssal-add-status-btn');
    if (addStatusBtn) addStatusBtn.addEventListener('click', abrirModalNovoStatus);

    // Modal Inteligente: Criar Item no Kanban com Detalhamento Opcional
    function abrirModalNovoItem(colStatus) {
      const modalBg = document.createElement('div');
      modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
      
      const modalBox = document.createElement('div');
      modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 440px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';
      
      const tipoPadrao = currentScope === 'estudos' ? 'estudo' : 'projeto';

      modalBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-size: 14px; font-weight: bold; color: #ffffff;">🎯 Novo Item em "${colStatus}"</span>
          <button id="modal-close-item" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
        </div>

        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa;">Título do Projeto / Estudo:</div>
        <input id="modal-item-title" type="text" placeholder="Ex: Algoritmos II, Refatorar Backend..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;">
        
        <div style="display: flex; gap: 8px;">
          <div style="flex: 1;">
            <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Tipo / Escopo:</div>
            <select id="modal-item-type" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
              <option value="projeto" ${tipoPadrao === 'projeto' ? 'selected' : ''}>🎯 Projeto (02_Projetos)</option>
              <option value="estudo" ${tipoPadrao === 'estudo' ? 'selected' : ''}>📚 Estudo (03_Estudos)</option>
            </select>
          </div>
          <div style="flex: 1;">
            <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Prioridade:</div>
            <select id="modal-item-prio" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
              <option value="Alta">Alta</option>
              <option value="Média" selected>Média</option>
              <option value="Baixa">Baixa</option>
            </select>
          </div>
        </div>

        <div>
          <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Prazo Final (Opcional):</div>
          <input id="modal-item-due" type="date" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
        </div>

        <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
          <button id="modal-cancel-item" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
          <button id="modal-save-item" class="abyssal-btn-primary" style="font-size: 11px;">Criar Item</button>
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
          const saveBtn = modalBox.querySelector('#modal-save-item');
          if (saveBtn) saveBtn.click();
        }
      };
      document.addEventListener('keydown', handleKey);

      modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) fechar();
      });
      
      const closeBtn = modalBox.querySelector('#modal-close-item');
      if (closeBtn) closeBtn.addEventListener('click', fechar);
      const cancelBtn = modalBox.querySelector('#modal-cancel-item');
      if (cancelBtn) cancelBtn.addEventListener('click', fechar);
      
      const saveBtn = modalBox.querySelector('#modal-save-item');
      if (saveBtn) {
        saveBtn.addEventListener('click', async () => {
          const titleEl = modalBox.querySelector('#modal-item-title');
          const typeEl = modalBox.querySelector('#modal-item-type');
          const prioEl = modalBox.querySelector('#modal-item-prio');
          const dueEl = modalBox.querySelector('#modal-item-due');
          
          const rawTitle = titleEl ? titleEl.value.trim() : '';
          const tipo = typeEl ? typeEl.value : 'projeto';
          const prio = prioEl ? prioEl.value : 'Média';
          const due = dueEl ? dueEl.value : '';

          if (rawTitle) {
            const folder = tipo === 'estudo' ? "03_Estudos" : "02_Projetos";
            const tplPath = tipo === 'estudo' ? "99_Meta/Templates/Template - Estudo.md" : "99_Meta/Templates/Template - Projeto.md";
            
            if (!app.vault.getAbstractFileByPath(folder)) {
              await app.vault.createFolder(folder).catch(() => {});
            }
            
            const targetPath = `${folder}/${rawTitle}.md`;
            const tplFile = app.vault.getAbstractFileByPath(tplPath);
            let content = "";

            if (tplFile) {
              const rawTpl = await app.vault.read(tplFile);
              content = rawTpl.replace(/{{title}}/g, rawTitle)
                              .replace(/{{date}}/g, todayStr)
                              .replace(/status:\s*["'][^"']+["']/, `status: "${colStatus}"`)
                              .replace(/priority:\s*["'][^"']+["']/, `priority: "${prio}"`);
              if (due) {
                content = content.replace(/due_date:\s*([^\n]*)/, `due_date: ${due}`);
              }
            } else {
              content = `---\ntitle: "${rawTitle}"\nstatus: "${colStatus}"\npriority: "${prio}"\ndue_date: ${due}\ntags: [${tipo}]\n---\n\n# ${rawTitle}\n\n`;
            }

            const newFile = await app.vault.create(targetPath, content);
            new Notice(`🎯 "${rawTitle}" criado em ${colStatus}!`);
            fechar();
            await app.workspace.openLinkText(newFile.path, "", false);
            renderKanban();
          }
        });
      }

      setTimeout(() => {
        const titleEl = modalBox.querySelector('#modal-item-title');
        if (titleEl) titleEl.focus();
      }, 50);
    }

    // Modal de Ação Tátil Mobile: Mover Status com 1-Toque
    function abrirModalMoverStatus(file, colunas, currentStatus) {
      const modalBg = document.createElement('div');
      modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
      
      const modalBox = document.createElement('div');
      modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 320px; width: 100%; padding: 18px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 10px; font-family: sans-serif;';
      
      modalBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; padding-bottom: 6px; border-bottom: 1px solid rgba(255,255,255,0.06);">
          <span style="font-size: 13px; font-weight: bold; color: #ffffff;">Mover "${file.basename}":</span>
          <button id="modal-close-move" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
        </div>
        <div id="modal-move-options" style="display: flex; flex-direction: column; gap: 6px;"></div>
      `;
      
      modalBg.appendChild(modalBox);
      document.body.appendChild(modalBg);

      const fechar = () => {
        if (modalBg.parentNode) document.body.removeChild(modalBg);
      };

      modalBg.addEventListener('click', (e) => {
        if (e.target === modalBg) fechar();
      });

      const closeBtn = modalBox.querySelector('#modal-close-move');
      if (closeBtn) closeBtn.addEventListener('click', fechar);

      const optBox = modalBox.querySelector('#modal-move-options');
      colunas.forEach(col => {
        const isCurrent = col.status.toLowerCase() === currentStatus.toLowerCase();
        const btn = optBox.createEl('button', {
          cls: `abyssal-btn-action`,
          attr: { style: `width: 100%; justify-content: flex-start; padding: 8px 12px; font-size: 12px; ${isCurrent ? 'opacity: 0.5; border-color: #86efac;' : ''}` },
          text: `${isCurrent ? '✓ ' : '→ '}${col.label}`
        });
        if (!isCurrent) {
          btn.addEventListener('click', async () => {
            const raw = await app.vault.read(file);
            let updated = raw;
            if (/status:\s*["']?([^"'\n]+)["']?/.test(raw)) {
              updated = raw.replace(/status:\s*["']?([^"'\n]+)["']?/, `status: "${col.status}"`);
            } else if (raw.startsWith('---')) {
              updated = raw.replace(/^---\n/, `---\nstatus: "${col.status}"\n`);
            } else {
              updated = `---\nstatus: "${col.status}"\n---\n\n` + raw;
            }
            await app.vault.modify(file, updated);
            new Notice(`🎯 "${file.basename}" movido para ${col.label}!`);
            fechar();
            renderKanban();
          });
        }
      });
    }

    function formatarPrazo(dataStr) {
      if (!dataStr) return null;
      let clean = String(dataStr).trim();
      if (clean.includes('T')) clean = clean.split('T')[0];
      const matchIso = clean.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      if (matchIso) {
        const y = matchIso[1];
        const m = matchIso[2].padStart(2, '0');
        const d = matchIso[3].padStart(2, '0');
        return { label: `Prazo: ${d}/${m}/${y}`, isoDate: `${y}-${m}-${d}` };
      }
      const matchBr = clean.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
      if (matchBr) {
        const d = matchBr[1].padStart(2, '0');
        const m = matchBr[2].padStart(2, '0');
        const y = matchBr[3];
        return { label: `Prazo: ${d}/${m}/${y}`, isoDate: `${y}-${m}-${d}` };
      }
      return { label: `Prazo: ${clean}`, isoDate: clean };
    }

    async function renderKanban() {
      kanbanColsGrid.innerHTML = '';
      
      // Delimita query conforme o escopo selecionado
      let pages = [];
      if (currentScope === 'projetos') {
        pages = dv.pages('"02_Projetos"').where(p => !p.file.name.includes("Template") && !p.file.name.includes("Painel"));
      } else if (currentScope === 'estudos') {
        pages = dv.pages('"03_Estudos"').where(p => !p.file.name.includes("Template") && !p.file.name.includes("Painel"));
      } else {
        pages = dv.pages('"02_Projetos" or "03_Estudos"').where(p => !p.file.name.includes("Template") && !p.file.name.includes("Painel"));
      }

      const cols = await carregarColunas();

      // Inclui status orfãos dinamicamente se houver
      pages.forEach(p => {
        if (p.status && !cols.some(c => c.status.toLowerCase() === p.status.toLowerCase())) {
          cols.push({ status: p.status, label: p.status, dotColor: '#a1a1aa' });
        }
      });

      cols.forEach(col => {
        const colEl = kanbanColsGrid.createEl('div', { cls: 'abyssal-kanban-col' });
        
        // Drag over / drop para Desktop
        colEl.addEventListener('dragover', (e) => {
          e.preventDefault();
          e.dataTransfer.dropEffect = 'move';
          colEl.style.borderColor = 'rgba(255, 255, 255, 0.3)';
          colEl.style.background = 'var(--background-secondary-alt)';
        });

        colEl.addEventListener('dragleave', () => {
          colEl.style.borderColor = 'var(--background-modifier-border)';
          colEl.style.background = 'var(--background-primary-alt)';
        });

        colEl.addEventListener('drop', async (e) => {
          e.preventDefault();
          colEl.style.borderColor = 'var(--background-modifier-border)';
          colEl.style.background = 'var(--background-primary-alt)';
          
          const filePath = e.dataTransfer.getData('text/plain');
          if (!filePath) return;
          const file = app.vault.getAbstractFileByPath(filePath);
          if (!file) return;

          const raw = await app.vault.read(file);
          let updated = raw;
          if (/status:\s*["']?([^"'\n]+)["']?/.test(raw)) {
            updated = raw.replace(/status:\s*["']?([^"'\n]+)["']?/, `status: "${col.status}"`);
          } else if (raw.startsWith('---')) {
            updated = raw.replace(/^---\n/, `---\nstatus: "${col.status}"\n`);
          } else {
            updated = `---\nstatus: "${col.status}"\n---\n\n` + raw;
          }
          await app.vault.modify(file, updated);
          new Notice(`🎯 "${file.basename}" movido para ${col.label}!`);
          setTimeout(renderKanban, 150);
        });

        const filtered = pages.where(p => {
          const s = (p.status || 'Planejamento').toLowerCase();
          return s.includes(col.status.toLowerCase());
        });

        const colHeader = colEl.createEl('div', { 
          attr: { style: 'display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid var(--background-modifier-border);' } 
        });
        colHeader.innerHTML = `
          <span style="font-size: 13px; font-weight: 700; color: ${col.status === 'Concluído' ? '#86efac' : 'var(--text-normal)'}; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 7px;">
            <span style="width: 8px; height: 8px; border-radius: 50%; background: ${col.dotColor};"></span>
            ${col.label}
          </span>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 11px; font-family: monospace; padding: 2px 7px; border-radius: 4px; background: rgba(128,128,128,0.12); color: var(--text-normal); font-weight: bold;">
              ${filtered.length}
            </span>
            <button class="abyssal-col-add-btn" title="Criar novo item em ${col.label}">+</button>
          </div>
        `;

        const addColBtn = colHeader.querySelector('.abyssal-col-add-btn');
        if (addColBtn) {
          addColBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            abrirModalNovoItem(col.status);
          });
        }

        const cardsContainer = colEl.createEl('div', { cls: 'abyssal-kanban-cards-box' });

        if (filtered.length === 0) {
          cardsContainer.createEl('div', { 
            text: 'Nenhum item nesta coluna', 
            attr: { style: 'font-size: 11.5px; font-family: monospace; color: var(--text-faint); text-align: center; padding: 24px 0;' } 
          });
        } else {
          filtered.forEach(proj => {
            const card = cardsContainer.createEl('div', { cls: 'abyssal-kanban-card' });
            
            // Suporte desktop drag
            card.setAttribute('draggable', 'true');
            card.addEventListener('dragstart', (e) => {
              e.dataTransfer.setData('text/plain', proj.file.path);
              card.style.opacity = '0.4';
            });
            card.addEventListener('dragend', () => {
              card.style.opacity = '1';
            });

            card.addEventListener('click', () => {
              if (!card.matches(':active')) {
                app.workspace.openLinkText(proj.file.path, "", false);
              }
            });

            const titleRow = card.createEl('div', { attr: { style: 'display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;' } });
            
            const prioRaw = proj.priority || proj.prioridade || 'Média';
            const prioNormalized = prioRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
            const prioClass = (prioNormalized === 'alta') ? 'prio-alta' : (prioNormalized === 'baixa') ? 'prio-baixa' : 'prio-media';

            const leftTitle = titleRow.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 2px;' } });
            leftTitle.createEl('span', { 
              text: proj.title || proj.file.name,
              attr: { style: 'font-size: 13.5px; font-weight: 700; color: var(--text-normal); line-height: 1.3;' } 
            });

            const rightActions = titleRow.createEl('div', { attr: { style: 'display: flex; align-items: center; gap: 5px; flex-shrink: 0;' } });
            rightActions.createEl('span', { cls: `prio-badge ${prioClass}`, text: prioRaw });

            // Botão tátil mobile ⋮
            const touchBtn = rightActions.createEl('button', {
              cls: 'abyssal-col-add-btn',
              text: '⋮',
              attr: { title: 'Mover status (toque)', style: 'width: 18px; height: 18px; font-size: 13px;' }
            });
            touchBtn.addEventListener('click', (e) => {
              e.stopPropagation();
              const fileRef = app.vault.getAbstractFileByPath(proj.file.path);
              if (fileRef) abrirModalMoverStatus(fileRef, cols, col.status);
            });

            // Análise de tarefas vinculadas & alertas de atraso
            const tasks = proj.file.tasks;
            const totalTasks = tasks.length;
            const completedTasks = tasks.where(t => t.completed).length;
            const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (col.status === 'Concluído' ? 100 : 0);

            // Verifica se há tarefas atrasadas dentro deste projeto
            const tarefasAtrasadas = tasks.where(t => {
              if (t.completed) return false;
              const match = t.text.match(/📅\s*(\d{4}-\d{2}-\d{2})/);
              return match && match[1] < todayStr;
            }).length;

            const progRow = card.createEl('div');
            progRow.innerHTML = `
              <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; font-family: monospace; color: var(--text-muted); margin-bottom: 4px;">
                <div style="display: flex; align-items: center; gap: 6px;">
                  <span>${totalTasks > 0 ? `${completedTasks}/${totalTasks} tarefas` : 'Progresso'}</span>
                  ${tarefasAtrasadas > 0 ? `<span class="prio-badge prio-alta" style="font-size: 9.5px; padding: 1px 4px;" title="Tarefas com prazo vencido">⚠️ ${tarefasAtrasadas} atrasada${tarefasAtrasadas > 1 ? 's' : ''}</span>` : ''}
                </div>
                <span style="font-weight: bold; color: ${pct === 100 ? '#86efac' : 'var(--text-normal)'};">${pct}%</span>
              </div>
              <div class="abyssal-prog-track" style="height: 5px; width: 100%;">
                <div class="abyssal-prog-fill" style="width: ${pct}%; background: ${pct === 100 ? '#86efac' : 'var(--text-normal)'};"></div>
              </div>
            `;

            if (proj.due_date) {
              const info = formatarPrazo(proj.due_date);
              const dueRow = card.createEl('div', { 
                attr: { 
                  style: 'display: flex; justify-content: space-between; align-items: center; font-size: 11.5px; font-family: monospace; color: var(--text-muted); padding-top: 4px; border-top: 1px solid var(--background-modifier-border); cursor: pointer;' 
                } 
              });
              
              dueRow.innerHTML = `
                <span style="color: var(--interactive-accent, #60a5fa); text-decoration: underline; text-underline-offset: 2px;" title="Abrir data no Calendar">📅 ${info.label}</span>
              `;

              dueRow.addEventListener('click', (e) => {
                e.stopPropagation();
                app.workspace.openLinkText(`01_Inbox/Diário/${info.isoDate}.md`, "", false);
              });
            }
          });
        }
      });
    }

    renderKanban();
  }
};
