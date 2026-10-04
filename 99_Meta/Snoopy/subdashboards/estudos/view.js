/**
 * Snoopy Vault - Subdashboard Especializado de Estudos
 * Plataforma sob demanda inspirada no Estudei (estudei.com.br):
 * - Ciclo de estudos ativo com rotação de disciplinas
 * - Métricas de horas líquidas e taxa de assertividade de questões
 * - Acompanhamento de revisões espaçadas e flashcards
 */

const root = dv.container.createEl('div', { cls: 'abyssal-container' });
const now = new Date();
const padTime = (n) => String(n).padStart(2, '0');
const todayStr = `${now.getFullYear()}-${padTime(now.getMonth() + 1)}-${padTime(now.getDate())}`;

// ---------------------------------------------------------------------------
// 1. CABEÇALHO DO SUBDASHBOARD
// ---------------------------------------------------------------------------
const headerBox = root.createEl('div', {
  attr: { 
    style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 12px 16px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 10px; flex-wrap: wrap; gap: 12px;' 
  }
});

headerBox.innerHTML = `
  <div style="display: flex; align-items: center; gap: 12px;">
    <button id="btn-voltar-home" class="abyssal-btn-action" style="font-size: 11px; padding: 4px 10px;" title="Retornar ao Dashboard Central">← HOME</button>
    <div>
      <div style="font-size: 15px; font-weight: 700; color: var(--text-normal); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 6px;">
        <span>📚</span> PAINEL DE ESTUDOS & PERFORMANCE
      </div>
      <div style="font-size: 11px; font-family: monospace; color: var(--text-muted);">Ciclo de Rotação • Retenção • Questões</div>
    </div>
  </div>
  <div style="display: flex; align-items: center; gap: 8px;">
    <button id="btn-add-questao" class="abyssal-nav-pill-btn" style="font-size: 11px; padding: 3px 10px;" title="Registrar sessão de resolução de questões">+ QUESTÕES</button>
    <button id="btn-add-estudo" class="abyssal-nav-pill-btn" style="font-size: 11px; padding: 3px 10px;" title="Criar nova matéria de estudo">+ DISCIPLINA</button>
  </div>
`;

const btnVoltarHome = headerBox.querySelector('#btn-voltar-home');
if (btnVoltarHome) {
  btnVoltarHome.addEventListener('click', () => {
    app.workspace.openLinkText("00_Home/Home.md", "", false);
  });
}

// ---------------------------------------------------------------------------
// 2. LEITURA DE MATÉRIAS E CONFIGURAÇÃO DO CICLO
// ---------------------------------------------------------------------------
const cicloMetaPath = "99_Meta/ciclo-estudos.json";

async function carregarEstadoCiclo() {
  let estado = { disciplinaAtualIdx: 0, cicloOrdem: [] };
  const file = app.vault.getAbstractFileByPath(cicloMetaPath);
  if (file) {
    try {
      const raw = await app.vault.read(file);
      estado = JSON.parse(raw);
    } catch(e) {}
  }
  return estado;
}

async function salvarEstadoCiclo(estado) {
  const file = app.vault.getAbstractFileByPath(cicloMetaPath);
  const jsonStr = JSON.stringify(estado, null, 2);
  if (file) {
    await app.vault.modify(file, jsonStr);
  } else {
    await app.vault.create(cicloMetaPath, jsonStr);
  }
}

// ---------------------------------------------------------------------------
// 3. MODAIS DE AÇÃO RÁPIDA
// ---------------------------------------------------------------------------

// Modal para Criar Nova Disciplina
function abrirModalNovaDisciplina() {
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 420px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';
  
  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 14px; font-weight: bold; color: #ffffff;">📚 Nova Disciplina / Matéria</span>
      <button id="modal-close-disc" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
    </div>
    <div style="font-size: 11px; font-family: monospace; color: #a1a1aa;">Nome da matéria ou tópico:</div>
    <input id="modal-disc-title" type="text" placeholder="Ex: Arquitetura de Redes, SQL Avançado..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;">
    
    <div style="display: flex; gap: 8px;">
      <div style="flex: 1;">
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Área / Disciplina Pai:</div>
        <input id="modal-disc-area" type="text" placeholder="Ex: Computação" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>
      <div style="flex: 1;">
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Status Inicial:</div>
        <select id="modal-disc-status" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
          <option value="Em Andamento" selected>Em Andamento</option>
          <option value="Revisar">Revisar</option>
          <option value="Planejamento">Planejamento</option>
          <option value="Concluído">Concluído</option>
        </select>
      </div>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
      <button id="modal-cancel-disc" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
      <button id="modal-save-disc" class="abyssal-btn-primary" style="font-size: 11px;">Criar Disciplina</button>
    </div>
  `;
  
  modalBg.appendChild(modalBox);
  document.body.appendChild(modalBg);
  
  const fechar = () => {
    if (modalBg.parentNode) document.body.removeChild(modalBg);
  };

  modalBg.addEventListener('click', (e) => {
    if (e.target === modalBg) fechar();
  });
  
  const closeBtn = modalBox.querySelector('#modal-close-disc');
  if (closeBtn) closeBtn.addEventListener('click', fechar);
  const cancelBtn = modalBox.querySelector('#modal-cancel-disc');
  if (cancelBtn) cancelBtn.addEventListener('click', fechar);
  
  const saveBtn = modalBox.querySelector('#modal-save-disc');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const titleEl = modalBox.querySelector('#modal-disc-title');
      const areaEl = modalBox.querySelector('#modal-disc-area');
      const statusEl = modalBox.querySelector('#modal-disc-status');
      
      const titulo = titleEl ? titleEl.value.trim() : '';
      const area = areaEl ? areaEl.value.trim() : 'Geral';
      const status = statusEl ? statusEl.value : 'Em Andamento';

      if (titulo) {
        const targetPath = `03_Estudos/${titulo}.md`;
        const tplFile = app.vault.getAbstractFileByPath("99_Meta/Templates/Template - Estudo.md");
        let content = "";

        if (tplFile) {
          const raw = await app.vault.read(tplFile);
          content = raw.replace(/{{title}}/g, titulo)
                       .replace(/{{date}}/g, todayStr)
                       .replace(/status:\s*["'][^"']+["']/, `status: "${status}"`);
        } else {
          content = `---\ntitle: "${titulo}"\ndisciplina: "${area}"\ndata: ${todayStr}\nstatus: "${status}"\ntags: [estudo]\n---\n\n# 📚 ${titulo}\n\n`;
        }

        const newFile = await app.vault.create(targetPath, content);
        new Notice(`📚 Disciplina "${titulo}" cadastrada!`);
        fechar();
        renderPainelCompleto();
        await app.workspace.openLinkText(newFile.path, "", false);
      }
    });
  }

  setTimeout(() => {
    const titleEl = modalBox.querySelector('#modal-disc-title');
    if (titleEl) titleEl.focus();
  }, 50);
}

// Modal para Registrar Resolução de Questões
function abrirModalRegistroQuestoes(materias) {
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 400px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';
  
  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 14px; font-weight: bold; color: #ffffff;">🎯 Sessão de Questões</span>
      <button id="modal-close-quest" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
    </div>
    
    <div>
      <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Disciplina:</div>
      <select id="modal-quest-mat" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
        ${materias.map(m => `<option value="${m.file.path}">${m.title || m.file.name}</option>`).join('')}
      </select>
    </div>

    <div style="display: flex; gap: 8px;">
      <div style="flex: 1;">
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Total Feitas:</div>
        <input id="modal-quest-feitas" type="number" min="1" value="10" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>
      <div style="flex: 1;">
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Acertos:</div>
        <input id="modal-quest-acertos" type="number" min="0" value="8" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
      <button id="modal-cancel-quest" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
      <button id="modal-save-quest" class="abyssal-btn-primary" style="font-size: 11px;">Registrar Desempenho</button>
    </div>
  `;
  
  modalBg.appendChild(modalBox);
  document.body.appendChild(modalBg);
  
  const fechar = () => {
    if (modalBg.parentNode) document.body.removeChild(modalBg);
  };

  modalBg.addEventListener('click', (e) => {
    if (e.target === modalBg) fechar();
  });
  
  const closeBtn = modalBox.querySelector('#modal-close-quest');
  if (closeBtn) closeBtn.addEventListener('click', fechar);
  const cancelBtn = modalBox.querySelector('#modal-cancel-quest');
  if (cancelBtn) cancelBtn.addEventListener('click', fechar);
  
  const saveBtn = modalBox.querySelector('#modal-save-quest');
  if (saveBtn) {
    saveBtn.addEventListener('click', async () => {
      const matEl = modalBox.querySelector('#modal-quest-mat');
      const feitasEl = modalBox.querySelector('#modal-quest-feitas');
      const acertosEl = modalBox.querySelector('#modal-quest-acertos');
      
      const filePath = matEl ? matEl.value : null;
      const feitas = parseInt(feitasEl.value, 10) || 0;
      const acertos = parseInt(acertosEl.value, 10) || 0;

      if (filePath && feitas > 0) {
        const file = app.vault.getAbstractFileByPath(filePath);
        if (file) {
          const raw = await app.vault.read(file);
          let updated = raw;
          
          // Lê valores atuais de frontmatter
          let feitasTotal = feitas;
          let acertosTotal = acertos;
          
          const matchF = raw.match(/questoes_feitas:\s*(\d+)/);
          if (matchF) feitasTotal += parseInt(matchF[1], 10);
          
          const matchA = raw.match(/questoes_acertos:\s*(\d+)/);
          if (matchA) acertosTotal += parseInt(matchA[1], 10);

          if (/questoes_feitas:\s*\d+/.test(updated)) {
            updated = updated.replace(/questoes_feitas:\s*\d+/, `questoes_feitas: ${feitasTotal}`);
          } else if (updated.startsWith('---')) {
            updated = updated.replace(/^---\n/, `---\nquestoes_feitas: ${feitasTotal}\n`);
          }

          if (/questoes_acertos:\s*\d+/.test(updated)) {
            updated = updated.replace(/questoes_acertos:\s*\d+/, `questoes_acertos: ${acertosTotal}`);
          } else if (updated.startsWith('---')) {
            updated = updated.replace(/^---\n/, `---\nquestoes_acertos: ${acertosTotal}\n`);
          }

          // Registra entrada de histórico no corpo da nota
          const pct = Math.round((acertos / feitas) * 100);
          const registroLinha = `\n- 📅 ${todayStr}: ${acertos}/${feitas} acertos (${pct}%)`;
          if (updated.includes('## Histórico de Questões')) {
            updated = updated.replace('## Histórico de Questões', `## Histórico de Questões${registroLinha}`);
          } else {
            updated += `\n\n## Histórico de Questões${registroLinha}\n`;
          }

          await app.vault.modify(file, updated);
          new Notice(`🎯 Sessão registrada: ${acertos}/${feitas} (${pct}%)!`);
          fechar();
          renderPainelCompleto();
        }
      }
    });
  }
}

const btnAddEstudo = headerBox.querySelector('#btn-add-estudo');
if (btnAddEstudo) btnAddEstudo.addEventListener('click', abrirModalNovaDisciplina);

// ---------------------------------------------------------------------------
// 4. CORPO PRINCIPAL DO PAINEL
// ---------------------------------------------------------------------------
const mainContainer = root.createEl('div', {
  attr: { style: 'display: flex; flex-direction: column; gap: 20px;' }
});

async function renderPainelCompleto() {
  mainContainer.innerHTML = '';

  // Busca disciplinas em 03_Estudos
  const rawPages = dv.pages('"03_Estudos"')
    .where(p => p.file && !p.file.name.includes("Template") && !p.file.name.includes("Painel de Estudos"));

  const materias = [...rawPages];

  const btnAddQuestao = headerBox.querySelector('#btn-add-questao');
  if (btnAddQuestao) {
    btnAddQuestao.onclick = () => abrirModalRegistroQuestoes(materias);
  }

  // =========================================================================
  // BLOCO 1: CICLO DE ROTAÇÃO ATIVO (ESTILO ESTUDEI)
  // =========================================================================
  const cicloBox = mainContainer.createEl('div', { cls: 'abyssal-card-box' });
  
  const cicloHeader = cicloBox.createEl('div', {
    attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;' }
  });
  
  cicloHeader.innerHTML = `
    <div style="display: flex; align-items: center; gap: 8px;">
      <span class="abyssal-section-title">CICLO DE ESTUDOS ATIVO</span>
      <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">(Rotação Contínua)</span>
    </div>
    <div style="font-size: 11.5px; font-family: monospace; color: var(--text-normal);">
      ${materias.length} matéria${materias.length !== 1 ? 's' : ''} no ciclo
    </div>
  `;

  if (materias.length === 0) {
    cicloBox.createEl('div', {
      text: 'Nenhuma disciplina cadastrada em 03_Estudos. Clique em "+ DISCIPLINA" para começar seu ciclo!',
      attr: { style: 'font-size: 12px; font-family: monospace; color: var(--text-muted); text-align: center; padding: 24px 0;' }
    });
  } else {
    const estadoCiclo = await carregarEstadoCiclo();
    let currentIdx = estadoCiclo.disciplinaAtualIdx || 0;
    if (currentIdx >= materias.length) currentIdx = 0;

    const materiaVez = materias[currentIdx];

    // Card em Destaque: MATÉRIA DA VEZ
    const vezBox = cicloBox.createEl('div', {
      attr: { 
        style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 4px solid var(--interactive-accent, #60a5fa); border-radius: 8px; padding: 14px 16px; margin-bottom: 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;' 
      }
    });

    const vezInfo = vezBox.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 4px;' } });
    vezInfo.innerHTML = `
      <div style="font-size: 10.5px; font-family: monospace; font-weight: 700; color: var(--interactive-accent, #60a5fa); text-transform: uppercase; letter-spacing: 0.05em;">
        ▶ MATÉRIA DA VEZ NO CICLO (${currentIdx + 1}/${materias.length})
      </div>
      <div style="font-size: 16px; font-weight: 700; color: var(--text-normal);">
        ${materiaVez.title || materiaVez.file.name}
      </div>
      <div style="font-size: 11.5px; font-family: monospace; color: var(--text-muted);">
        Área: ${materiaVez.disciplina || 'Geral'} • Status: ${materiaVez.status || 'Em Andamento'}
      </div>
    `;

    const vezActions = vezBox.createEl('div', { attr: { style: 'display: flex; align-items: center; gap: 8px;' } });
    
    const btnAbrirNota = vezActions.createEl('button', {
      cls: 'abyssal-btn-action',
      attr: { style: 'font-size: 11.5px; padding: 5px 12px;' },
      text: '📖 Abrir Nota'
    });
    btnAbrirNota.addEventListener('click', () => {
      app.workspace.openLinkText(materiaVez.file.path, "", false);
    });

    const btnAvancarCiclo = vezActions.createEl('button', {
      cls: 'abyssal-btn-primary',
      attr: { style: 'font-size: 11.5px; padding: 5px 14px;' },
      text: '✓ Concluir Sessão & Avançar'
    });
    btnAvancarCiclo.addEventListener('click', async () => {
      const proximoIdx = (currentIdx + 1) % materias.length;
      estadoCiclo.disciplinaAtualIdx = proximoIdx;
      await salvarEstadoCiclo(estadoCiclo);
      new Notice(`🎉 Sessão concluída! Próxima matéria: ${materias[proximoIdx].title || materias[proximoIdx].file.name}`);
      renderPainelCompleto();
    });

    // Trilha Sequencial da Rotação
    const trilhaRow = cicloBox.createEl('div', {
      attr: { style: 'display: flex; align-items: center; gap: 6px; overflow-x: auto; padding-bottom: 4px;' }
    });

    materias.forEach((m, idx) => {
      const isAtual = idx === currentIdx;
      const pill = trilhaRow.createEl('div', {
        cls: `abyssal-nav-pill ${isAtual ? 'active' : ''}`,
        attr: { 
          style: `font-size: 11px; padding: 4px 10px; cursor: pointer; flex-shrink: 0; ${isAtual ? 'border-color: var(--interactive-accent, #60a5fa); font-weight: bold;' : 'opacity: 0.7;'}` 
        },
        text: `${idx + 1}. ${m.title || m.file.name}`
      });
      pill.addEventListener('click', async () => {
        estadoCiclo.disciplinaAtualIdx = idx;
        await salvarEstadoCiclo(estadoCiclo);
        renderPainelCompleto();
      });
    });
  }

  // =========================================================================
  // BLOCO 2: GRADE DE DISCIPLINAS & RETENÇÃO DE QUESTÕES
  // =========================================================================
  const gridSection = mainContainer.createEl('div');
  const gridHeader = gridSection.createEl('div', {
    attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;' }
  });
  gridHeader.innerHTML = `
    <span class="abyssal-section-title">DESEMPENHO POR DISCIPLINA</span>
    <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">Assertividade & Flashcards</span>
  `;

  const cardsGrid = gridSection.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;' }
  });

  for (const m of materias) {
    const card = cardsGrid.createEl('div', { cls: 'abyssal-kanban-card', attr: { style: 'cursor: default; padding: 12px 14px;' } });
    
    // Contagem de flashcards
    let totalFlashcards = 0;
    try {
      const fFile = app.vault.getAbstractFileByPath(m.file.path);
      if (fFile) {
        const raw = await app.vault.read(fFile);
        const matches = raw.match(/::/g);
        if (matches) totalFlashcards = matches.length;
      }
    } catch(e) {}

    // Tarefas
    const tasks = m.file.tasks;
    const totalTasks = tasks.length;
    const completedTasks = tasks.where(t => t.completed).length;

    // Questões
    const feitas = Number(m.questoes_feitas) || 0;
    const acertos = Number(m.questoes_acertos) || 0;
    const pctAcertos = feitas > 0 ? Math.round((acertos / feitas) * 100) : null;

    const rowTop = card.createEl('div', {
      attr: { style: 'display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;' }
    });

    rowTop.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 2px;">
        <span style="font-size: 13.5px; font-weight: 700; color: var(--text-normal);">${m.title || m.file.name}</span>
        <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">${m.disciplina || 'Geral'}</span>
      </div>
      <div style="display: flex; align-items: center; gap: 5px;">
        <span class="prio-badge prio-media" style="font-size: 10px;">${m.status || 'Ativo'}</span>
      </div>
    `;

    // Barra de Questões / Assertividade
    const questBox = card.createEl('div', {
      attr: { style: 'margin-bottom: 8px; padding: 8px; background: var(--background-secondary-alt); border-radius: 6px; border: 1px solid var(--background-modifier-border);' }
    });

    if (feitas > 0) {
      questBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-family: monospace; margin-bottom: 4px;">
          <span style="color: var(--text-muted);">🎯 Questões: ${acertos}/${feitas}</span>
          <span style="font-weight: bold; color: ${pctAcertos >= 75 ? '#86efac' : pctAcertos >= 50 ? 'var(--text-normal)' : '#fca5a5'};">${pctAcertos}%</span>
        </div>
        <div class="abyssal-prog-track" style="height: 4px; width: 100%;">
          <div class="abyssal-prog-fill" style="width: ${pctAcertos}%; background: ${pctAcertos >= 75 ? '#86efac' : 'var(--text-normal)'};"></div>
        </div>
      `;
    } else {
      questBox.innerHTML = `
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-family: monospace; color: var(--text-muted);">
          <span>🎯 Questões: Nenhuma registrada</span>
          <span style="cursor: pointer; text-decoration: underline;" id="btn-cad-q-${m.file.basename}">+ Adicionar</span>
        </div>
      `;
      const btnCad = questBox.querySelector(`#btn-cad-q-${m.file.basename}`);
      if (btnCad) {
        btnCad.addEventListener('click', (e) => {
          e.stopPropagation();
          abrirModalRegistroQuestoes([m]);
        });
      }
    }

    // Rodapé do Card
    const rowBottom = card.createEl('div', {
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid var(--background-modifier-border); font-size: 11px; font-family: monospace;' }
    });

    rowBottom.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="color: var(--text-muted);">📋 ${completedTasks}/${totalTasks} tarefas</span>
        ${totalFlashcards > 0 ? `<span style="color: var(--interactive-accent, #60a5fa);">🧠 ${totalFlashcards} cards</span>` : ''}
      </div>
      <a class="abyssal-todo-source" style="font-size: 10.5px; padding: 1px 6px;">Abrir →</a>
    `;

    const openLink = rowBottom.querySelector('.abyssal-todo-source');
    if (openLink) {
      openLink.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        app.workspace.openLinkText(m.file.path, "", false);
      });
    }
  }
}

await renderPainelCompleto();
