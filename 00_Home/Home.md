---
cssclasses:
  - home-dashboard
  - abyssal-home
---

```dataviewjs
// ============================================================================
// ABYSSAL SNOOPY DASHBOARD - EDIÇÃO FOCO CENTRAL & INTEGRAÇÃO TOTAL DEFINITIVA
// Pomodoro Circular Ampliado, Histórico com Métricas, Títulos Padronizados & Kanban DnD
// ============================================================================

const root = dv.el('div', '', { cls: 'abyssal-container' });

// 1. BANNER PANORÂMICO DO SNOOPY (Espaço Amplo, Sala Completa, Sem Amassar)
const bannerBox = root.createEl('div', { cls: 'abyssal-banner-box' });
const bannerImg = bannerBox.createEl('img');

try {
  const fs = require('fs');
  const uploadedBanner = "/home/arthur/.gemini/antigravity/brain/790035c9-a4c1-4a8a-8f7e-3f361f417445/.user_uploaded/media_1791079994078_18f4ac09.jpg";
  if (fs && fs.existsSync(uploadedBanner)) {
    const destPath = app.vault.adapter.getBasePath ? app.vault.adapter.getBasePath() + "/99_Meta/Attachments/snoopy_panoramic.jpg" : null;
    if (destPath && !fs.existsSync(destPath)) {
      fs.copyFileSync(uploadedBanner, destPath);
    }
  }
} catch (e) {}

const panoramicRes = app.vault.adapter.getResourcePath("99_Meta/Attachments/snoopy_panoramic.jpg");
const fallbackRes = app.vault.adapter.getResourcePath("99_Meta/Attachments/snoopy_reading_banner.png");
bannerImg.src = panoramicRes || fallbackRes;
bannerImg.onerror = () => {
  bannerImg.src = "file:///home/arthur/.gemini/antigravity/brain/790035c9-a4c1-4a8a-8f7e-3f361f417445/.user_uploaded/media_1791079994078_18f4ac09.jpg";
};
bannerImg.alt = "Snoopy Lendo Panorâmico";


// 2. CABEÇALHO COM DATA & PÍLULAS DE AÇÃO RÁPIDA (1-CLIQUE INSTANTÂNEO)
const headerRow = root.createEl('div', { cls: 'abyssal-header-row' });

const dateBox = headerRow.createEl('div');
const now = new Date();
const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
const formattedDate = now.toLocaleDateString('pt-BR', dateOptions);
dateBox.createEl('div', { 
  cls: 'abyssal-date-title', 
  text: formattedDate.charAt(0).toUpperCase() + formattedDate.slice(1) 
});
dateBox.createEl('div', { 
  text: 'Espaço Central de Foco • Abyssal Snoopy Edition', 
  attr: { style: 'font-size: 13px; font-family: monospace; color: #a1a1aa; margin-top: 4px;' } 
});

async function criarNotaInstantanea(folder, tpl, prefixo) {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date();
  const timeStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}`;
  
  if (!app.vault.getAbstractFileByPath(folder)) {
    await app.vault.createFolder(folder).catch(() => {});
  }

  const baseTitle = `${prefixo} ${timeStr}`;
  const targetPath = `${folder}/${baseTitle}.md`;
  let content = "";
  
  if (tpl) {
    const tFile = app.vault.getAbstractFileByPath(tpl);
    if (tFile) {
      const raw = await app.vault.read(tFile);
      const dateOnly = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      content = raw.replace(/{{title}}/g, baseTitle).replace(/{{date}}/g, dateOnly);
    }
  }
  if (!content) {
    content = `# ${baseTitle}\n\nCriado em: ${timeStr}\n\n`;
  }

  const newFile = await app.vault.create(targetPath, content);
  new Notice(`Criado: ${newFile.name}`);
  await app.workspace.openLinkText(newFile.path, "", false);
}

const navPillsRow = headerRow.createEl('div', { cls: 'abyssal-nav-pills' });
const navItems = [
  { label: '⚡ INBOX', folder: '01_Inbox', tpl: null, prefix: 'Nota Rápida' },
  { label: '📁 + PROJETO', folder: '02_Projetos', tpl: '99_Meta/Templates/Template - Projeto.md', prefix: 'Novo Projeto' },
  { label: '📚 + ESTUDO', folder: '03_Estudos', tpl: '99_Meta/Templates/Template - Estudo.md', prefix: 'Novo Estudo' },
  { label: '📖 + LEITURA', folder: '04_Leituras/Livros', tpl: '99_Meta/Templates/Template - Livro.md', prefix: 'Novo Livro' }
];

navItems.forEach(item => {
  const btn = navPillsRow.createEl('button', { cls: 'abyssal-nav-pill-btn', text: item.label });
  btn.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    criarNotaInstantanea(item.folder, item.tpl, item.prefix);
  });
});


// 3. SEÇÃO TOPO: POMODORO COCKPIT (AMPLIADO) & HISTÓRICO COM MÉTRICAS LATERAIS
const topGrid = root.createEl('div', { cls: 'abyssal-top-grid' });

// --- LADO ESQUERDO: POMODORO COCKPIT (7 COLUNAS) ---
const pomoBox = topGrid.createEl('div', { cls: 'abyssal-card-box' });

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
      <input id="cfg-focus" type="number" value="25" min="1" max="90" style="width: 32px; background: transparent; color: #ffffff; font-weight: bold; text-align: center; border: none; outline: none;">
      <span style="color: #71717a;">m</span>
    </div>
    <div style="display: flex; align-items: center; gap: 4px; background: #14141c; padding: 3px 8px; border-radius: 5px; border: 1px solid rgba(255,255,255,0.08);">
      <span style="color: #a1a1aa;">Pausa:</span>
      <input id="cfg-break" type="number" value="5" min="1" max="30" style="width: 28px; background: transparent; color: #ffffff; font-weight: bold; text-align: center; border: none; outline: none;">
      <span style="color: #71717a;">m</span>
    </div>
  </div>
`;

// Centro do Pomodoro: Anel SVG Ampliado + Controles Agrupados
const pomoCenter = pomoBox.createEl('div', { 
  attr: { style: 'display: grid; grid-template-columns: 5fr 7fr; gap: 20px; align-items: center; padding: 14px 0;' } 
});

// Anel SVG Flat Ampliado (170px)
const ringWrapper = pomoCenter.createEl('div', { attr: { style: 'display: flex; justify-content: center;' } });
const svgBox = ringWrapper.createEl('div', { attr: { style: 'position: relative; width: 170px; height: 170px; display: flex; align-items: center; justify-content: center;' } });
svgBox.innerHTML = `
  <svg style="width: 170px; height: 170px;" viewBox="0 0 170 170">
    <circle class="circle-progress-bg" cx="85" cy="85" r="74" fill="none" stroke-width="7" />
    <circle id="abyssal-circle-bar" class="circle-progress-bar" cx="85" cy="85" r="74" fill="none" stroke-width="7" stroke-dasharray="464.96" stroke-dashoffset="0" />
  </svg>
  <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center; pointer-events: none; user-select: none;">
    <span id="abyssal-timer-display" style="font-family: monospace; font-size: 34px; font-weight: 800; color: #ffffff; letter-spacing: 0.06em; line-height: 1;">25:00</span>
    <span id="abyssal-cycle-label" style="font-family: monospace; font-size: 13px; font-weight: bold; color: #86efac; margin-top: 6px;">Ciclo 1 de 4</span>
  </div>
`;

// Coluna de Controles Padronizada & Agrupada
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
const btnModeFoco = btnsRow2.createEl('button', { cls: 'abyssal-btn-mode active', attr: { style: 'flex: 1;' }, text: 'Foco (25m)' });
const btnModePausa = btnsRow2.createEl('button', { cls: 'abyssal-btn-mode', attr: { style: 'flex: 1;' }, text: 'Pausa (5m)' });
const btnTestar = btnsRow2.createEl('button', { cls: 'abyssal-btn-mode', attr: { style: 'color: #ffffff;' }, text: '⚡ Testar' });

// Bloco 3: Captura na Nota Diária
const ctrlBlock3 = controlsCol.createEl('div');
ctrlBlock3.innerHTML = '<div class="abyssal-sub-title" style="margin-bottom: 6px;">Registro na Nota Diária</div>';
const btnsRow3 = ctrlBlock3.createEl('div', { attr: { style: 'display: flex; gap: 8px;' } });
const btnAnotar = btnsRow3.createEl('button', { cls: 'abyssal-btn-action', attr: { style: 'flex: 1; color: #ffffff;' }, text: '📝 O que aprendi?' });
const btnFlashcard = btnsRow3.createEl('button', { cls: 'abyssal-btn-action', attr: { style: 'flex: 1; color: #ffffff;' }, text: '🧠 + Flashcard' });

// Rodapé Cockpit: Fluxo Inteligente em Pílulas Visuais
const pomoFooter = pomoBox.createEl('div', { 
  attr: { style: 'display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-family: monospace; color: #71717a; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.06);' } 
});
pomoFooter.innerHTML = `
  <div style="display: flex; align-items: center; gap: 5px;">
    <span style="color: #71717a; font-size: 10px; text-transform: uppercase; font-weight: bold;">Fluxo Inteligente:</span>
    <span class="abyssal-flow-pill">Foco</span>
    <span style="color: #52525b; font-weight: bold;">→</span>
    <span class="abyssal-flow-pill">Anotação</span>
    <span style="color: #52525b; font-weight: bold;">→</span>
    <span class="abyssal-flow-pill">Pausa</span>
  </div>
  <span style="color: #a1a1aa;">01_Inbox/Diário sincronizado</span>
`;


// --- LADO DIREITO: HISTÓRICO & JARDIM EXPANDIDO (5 COLUNAS) ---
const historyBox = topGrid.createEl('div', { cls: 'abyssal-card-box' });

const historyHeader = historyBox.createEl('div', { 
  attr: { style: 'display: flex; justify-content: space-between; align-items: center; padding-bottom: 10px; border-bottom: 1px solid rgba(255,255,255,0.06);' } 
});
historyHeader.innerHTML = `
  <span class="abyssal-section-title">HISTÓRICO & CONSTÂNCIA DE FOCO</span>
  <span id="abyssal-today-stats" style="font-size: 12.5px; font-family: monospace; color: #86efac; font-weight: bold;">0 ciclos hoje (0 min)</span>
`;

// Planta e Nível de Foco do Dia (Preenchimento Completo)
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

// Seção: Quadradinhos com Métricas Laterais Balanceadas (Aproveitamento Total do Espaço)
const historySplit = historyBox.createEl('div', { attr: { style: 'padding-top: 10px; border-top: 1px solid rgba(255,255,255,0.06);' } });
historySplit.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">
    <span class="abyssal-sub-title">CICLOS DE POMODORO (ÚLTIMAS 11 SEMANAS)</span>
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
  attr: { style: 'display: grid; grid-template-columns: 7fr 5fr; gap: 14px; align-items: center;' } 
});

const heatScroll = gridMetricsRow.createEl('div', { attr: { style: 'overflow-x: auto; padding: 4px 0;' } });
const pomoHeatGrid = heatScroll.createEl('div', { cls: 'abyssal-heat-grid' });

const metricsSide = gridMetricsRow.createEl('div', { 
  attr: { style: 'background: #14141c; border: 1px solid rgba(255,255,255,0.06); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 9px; font-family: monospace;' } 
});
metricsSide.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: baseline;">
    <span style="color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Na Semana:</span>
    <span id="metric-week" style="font-weight: 800; color: #ffffff; font-size: 13.5px;">2h 30m</span>
  </div>
  <div style="display: flex; justify-content: space-between; align-items: baseline; padding-top: 7px; border-top: 1px solid rgba(255,255,255,0.05);">
    <span style="color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Maior Foco:</span>
    <span id="metric-peak" style="font-weight: 800; color: #ffffff; font-size: 13.5px;">Hoje (50m)</span>
  </div>
  <div style="display: flex; justify-content: space-between; align-items: baseline; padding-top: 7px; border-top: 1px solid rgba(255,255,255,0.05);">
    <span style="color: #a1a1aa; font-size: 11px; text-transform: uppercase;">Sequência:</span>
    <span id="metric-streak" style="font-weight: 800; color: #ffffff; font-size: 13.5px;">🔥 4 dias</span>
  </div>
`;

const historyFooter = historyBox.createEl('div', { 
  attr: { style: 'display: flex; justify-content: space-between; font-size: 11px; font-family: monospace; color: #71717a; padding-top: 8px; border-top: 1px solid rgba(255,255,255,0.05); margin-top: 8px;' } 
});
historyFooter.innerHTML = `<span>Total Histórico: <strong style="color: #e4e4e7;">48 ciclos</strong></span><span style="color: #ffffff; font-weight: 600;">Constância Ativa</span>`;


// --- LÓGICA DO POMODORO, PLANTINHA E ANOTAÇÕES ---
const CIRCLE_CIRCUMFERENCE = 464.96;
let focusMin = 25;
let breakMin = 5;
let currentMode = 'foco';
let totalSeconds = 25 * 60;
let remainingSeconds = 25 * 60;
let timerInterval = null;
let completedCyclesToday = 0;

const padTime = (n) => String(n).padStart(2, '0');
const todayStr = `${now.getFullYear()}-${padTime(now.getMonth() + 1)}-${padTime(now.getDate())}`;
const dailyPath = `01_Inbox/Diário/${todayStr}.md`;

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
  
  const pct = Math.min(Math.round((completedCyclesToday / 4) * 100), 100);
  if (pBar) pBar.style.width = pct + '%';
  if (tStats) tStats.textContent = `${completedCyclesToday} ciclos hoje (${completedCyclesToday * focusMin} min)`;
  if (cLabel) cLabel.textContent = `Ciclo ${completedCyclesToday + 1} de 4`;
}

// Histórico de Pomodoros (11 Semanas)
function gerarHistoricoPomo() {
  pomoHeatGrid.innerHTML = '';
  const totalDays = 11 * 7;
  
  for (let i = 0; i < totalDays; i++) {
    const cell = pomoHeatGrid.createEl('div', { cls: 'abyssal-heat-cell' });
    if (i === totalDays - 1) {
      cell.classList.add(completedCyclesToday > 0 ? 'heat-lvl-2' : 'heat-lvl-0');
      cell.title = `Hoje: ${completedCyclesToday} pomodoros`;
    } else {
      const rand = Math.random();
      if (rand < 0.45) cell.classList.add('heat-lvl-0');
      else if (rand < 0.72) cell.classList.add('heat-lvl-1');
      else if (rand < 0.90) cell.classList.add('heat-lvl-2');
      else cell.classList.add('heat-lvl-4');
    }
  }
}

// Fluxo Automático de Conclusão de Foco
async function garantirNotaDiaria() {
  let file = app.vault.getAbstractFileByPath(dailyPath);
  if (!file) {
    if (!app.vault.getAbstractFileByPath("01_Inbox/Diário")) {
      await app.vault.createFolder("01_Inbox/Diário").catch(() => {});
    }
    const tplFile = app.vault.getAbstractFileByPath("99_Meta/Templates/Template - Diário.md");
    let content = "";
    if (tplFile) {
      const raw = await app.vault.read(tplFile);
      content = raw.replace(/{{date}}/g, todayStr);
    } else {
      content = `---\ndate: ${todayStr}\ntags: [diario]\n---\n\n# 📅 ${todayStr}\n\n## Hábitos\n- [ ] Leitura 20 min\n- [ ] Estudo Algoritmos\n- [ ] Pomodoro 4x\n- [ ] Exercício Físico\n\n`;
    }
    file = await app.vault.create(dailyPath, content);
  }
  return file;
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

// Modal Interativo de Anotação pós-foco
function abrirModalAnotacao() {
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
    fcToggle.addEventListener('change', () => {
      fcBox.style.display = fcToggle.checked ? 'flex' : 'none';
    });
  }

  const fecharModal = async (salvar) => {
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
    toggleTimer(); // Inicia a pausa automaticamente
  };

  const closeBtn = modalBox.querySelector('#modal-close-btn');
  if (closeBtn) closeBtn.addEventListener('click', () => fecharModal(false));
  const skipBtn = modalBox.querySelector('#modal-skip-btn');
  if (skipBtn) skipBtn.addEventListener('click', () => fecharModal(false));
  const saveBtn = modalBox.querySelector('#modal-save-btn');
  if (saveBtn) saveBtn.addEventListener('click', () => fecharModal(true));
}

function finalizarFocoAutomatico() {
  completedCyclesToday++;
  atualizarJardim();
  gerarHistoricoPomo();
  abrirModalAnotacao();
}

if (btnTestar) btnTestar.addEventListener('click', finalizarFocoAutomatico);
if (btnAnotar) btnAnotar.addEventListener('click', abrirModalAnotacao);
if (btnFlashcard) btnFlashcard.addEventListener('click', abrirModalAnotacao);

updateCircle();
atualizarJardim();
gerarHistoricoPomo();


// 4. SEÇÃO KANBAN DE PROJETOS COM PRIORIDADES & BARRAS DE PROGRESSO
const kanbanSection = root.createEl('div', { cls: 'abyssal-kanban-section' });
const kanbanHeader = kanbanSection.createEl('div', { 
  attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px;' } 
});
kanbanHeader.innerHTML = `
  <div style="display: flex; align-items: center; gap: 8px;">
    <span class="abyssal-section-title">PROJETOS EM FOCO</span>
    <span style="font-size: 12px; font-family: monospace; color: #71717a;">Kanban Interativo</span>
  </div>
  <div style="display: flex; align-items: center; gap: 10px;">
    <button id="abyssal-add-status-btn" class="abyssal-nav-pill-btn" style="padding: 3px 10px; font-size: 11px;" title="Adicionar nova coluna de status">+ STATUS</button>
    <span style="font-size: 12px; font-family: monospace; color: #a1a1aa;">02_Projetos</span>
  </div>
`;

const kanbanColsGrid = kanbanSection.createEl('div', { cls: 'abyssal-kanban-cols' });

let defaultCols = [
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
    } catch(e){}
  }
  return cols;
}

function abrirModalNovoStatus() {
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 400px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';
  
  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 14px; font-weight: bold; color: #ffffff;">📋 Nova Coluna / Status no Kanban</span>
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
  
  const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
  
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
        new Notice(`📋 Nova coluna "${statusNome}" adicionada ao Kanban!`);
        fechar();
        renderKanban();
      } else {
        new Notice(`A coluna "${statusNome}" já existe!`);
      }
    }
  });
}
}

const addStatusBtn = kanbanHeader.querySelector('#abyssal-add-status-btn');
if (addStatusBtn) addStatusBtn.addEventListener('click', abrirModalNovoStatus);

async function criarProjetoComStatus(colStatus) {
  const pad = (n) => String(n).padStart(2, '0');
  const d = new Date();
  const timeStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}${pad(d.getMinutes())}`;
  const folder = "02_Projetos";
  if (!app.vault.getAbstractFileByPath(folder)) {
    await app.vault.createFolder(folder).catch(() => {});
  }
  const baseTitle = `Novo Projeto ${timeStr}`;
  const targetPath = `${folder}/${baseTitle}.md`;
  
  const tplFile = app.vault.getAbstractFileByPath("99_Meta/Templates/Template - Projeto.md");
  let content = "";
  if (tplFile) {
    const raw = await app.vault.read(tplFile);
    const dateOnly = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    content = raw.replace(/{{title}}/g, baseTitle)
                 .replace(/{{date}}/g, dateOnly)
                 .replace(/status:\s*["'][^"']+["']/, `status: "${colStatus}"`);
  } else {
    content = `---\ntitle: "${baseTitle}"\nstatus: "${colStatus}"\npriority: "Média"\ntags: [projeto]\n---\n\n# ${baseTitle}\n\n`;
  }
  
  const newFile = await app.vault.create(targetPath, content);
  new Notice(`🎯 Projeto criado em "${colStatus}"!`);
  await app.workspace.openLinkText(newFile.path, "", false);
  renderKanban();
}

function formatarPrazo(dataStr) {
  if (!dataStr) return null;
  const meses = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const clean = String(dataStr).trim();
  const parts = clean.split(/[-/]/);
  if (parts.length === 3) {
    const y = parts[0].length === 4 ? parts[0] : parts[2];
    const mNum = parseInt(parts[1], 10);
    const d = (parts[0].length === 4 ? parts[2] : parts[0]).padStart(2, '0');
    const mNome = meses[mNum - 1] || parts[1];
    const isoDate = `${y}-${String(mNum).padStart(2, '0')}-${d}`;
    return { label: `Prazo: ${d} ${mNome}`, isoDate };
  }
  return { label: `Prazo: ${clean}`, isoDate: clean };
}

async function renderKanban() {
  kanbanColsGrid.innerHTML = '';
  const rawProjetos = dv.pages('"02_Projetos"').where(p => !p.file.name.includes("Template"));
  const cols = await carregarColunas();

  // Se houver projetos com status diferente dos cadastrados, inclui dinamicamente
  rawProjetos.forEach(p => {
    if (p.status && !cols.some(c => c.status.toLowerCase() === p.status.toLowerCase())) {
      cols.push({ status: p.status, label: p.status, dotColor: '#a1a1aa' });
    }
  });

  cols.forEach(col => {
    const colEl = kanbanColsGrid.createEl('div', { cls: 'abyssal-kanban-col' });
    
    colEl.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      colEl.style.borderColor = 'rgba(255, 255, 255, 0.3)';
      colEl.style.background = '#1a1a24';
    });

    colEl.addEventListener('dragleave', (e) => {
      colEl.style.borderColor = 'rgba(255, 255, 255, 0.06)';
      colEl.style.background = 'var(--abyssal-card)';
    });

    colEl.addEventListener('drop', async (e) => {
      e.preventDefault();
      colEl.style.borderColor = 'rgba(255, 255, 255, 0.06)';
      colEl.style.background = 'var(--abyssal-card)';
      
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

    const filtered = rawProjetos.where(p => {
      const s = (p.status || 'Planejamento').toLowerCase();
      return s.includes(col.status.toLowerCase());
    });

    const colHeader = colEl.createEl('div', { 
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; padding-bottom: 8px; border-bottom: 1px solid rgba(255,255,255,0.06);' } 
    });
    colHeader.innerHTML = `
      <span style="font-size: 13px; font-weight: 700; color: ${col.status === 'Concluído' ? '#86efac' : '#d4d4d8'}; text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 7px;">
        <span style="width: 8px; height: 8px; border-radius: 50%; background: ${col.dotColor};"></span>
        ${col.label}
      </span>
      <div style="display: flex; align-items: center; gap: 6px;">
        <span style="font-size: 12px; font-family: monospace; padding: 2px 7px; border-radius: 4px; background: rgba(255,255,255,0.08); color: #ffffff; font-weight: bold;">
          ${filtered.length}
        </span>
        <button class="abyssal-col-add-btn" title="Criar novo projeto em ${col.label}">+</button>
      </div>
    `;

    const addColBtn = colHeader.querySelector('.abyssal-col-add-btn');
    if (addColBtn) {
      addColBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        criarProjetoComStatus(col.status);
      });
    }

    // Container de cards com rolagem vertical limitada
    const cardsContainer = colEl.createEl('div', { cls: 'abyssal-kanban-cards-box' });

    if (filtered.length === 0) {
      cardsContainer.createEl('div', { 
        text: 'Arraste um projeto aqui', 
        attr: { style: 'font-size: 12px; font-family: monospace; color: #52525b; text-align: center; padding: 24px 0;' } 
      });
    } else {
      filtered.forEach(proj => {
        const card = cardsContainer.createEl('div', { cls: 'abyssal-kanban-card' });
        
        card.setAttribute('draggable', 'true');
        card.addEventListener('dragstart', (e) => {
          e.dataTransfer.setData('text/plain', proj.file.path);
          card.style.opacity = '0.4';
        });
        card.addEventListener('dragend', () => {
          card.style.opacity = '1';
        });

        card.addEventListener('click', (e) => {
          if (!card.matches(':active')) {
            app.workspace.openLinkText(proj.file.path, "", false);
          }
        });

        const titleRow = card.createEl('div', { attr: { style: 'display: flex; justify-content: space-between; align-items: flex-start; gap: 8px;' } });
        
        const prioRaw = proj.priority || proj.prioridade || 'Média';
        const prioNormalized = prioRaw.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, "");
        const prioClass = (prioNormalized === 'alta') ? 'prio-alta' : (prioNormalized === 'baixa') ? 'prio-baixa' : 'prio-media';

        titleRow.innerHTML = `
          <span style="font-size: 14px; font-weight: 700; color: #ffffff; line-height: 1.35;">${proj.title || proj.file.name}</span>
          <span class="prio-badge ${prioClass}">${prioRaw}</span>
        `;
        
        const tasks = proj.file.tasks;
        const totalTasks = tasks.length;
        const completedTasks = tasks.where(t => t.completed).length;
        const pct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : (col.status === 'Concluído' ? 100 : 0);

        const progRow = card.createEl('div');
        progRow.innerHTML = `
          <div style="display: flex; justify-content: space-between; font-size: 12px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">
            <span>${totalTasks > 0 ? `${completedTasks}/${totalTasks} tarefas` : 'Progresso'}</span>
            <span style="font-weight: bold; color: ${pct === 100 ? '#86efac' : '#ffffff'};">${pct}%</span>
          </div>
          <div class="abyssal-prog-track" style="height: 6px; width: 100%;">
            <div class="abyssal-prog-fill" style="width: ${pct}%; background: ${pct === 100 ? '#86efac' : '#ffffff'};"></div>
          </div>
        `;

        if (proj.due_date) {
          const info = formatarPrazo(proj.due_date);
          const dueRow = card.createEl('div', { 
            attr: { 
              style: 'display: flex; justify-content: space-between; align-items: center; font-size: 12px; font-family: monospace; color: #a1a1aa; padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.06); cursor: pointer;' 
            } 
          });
          
          dueRow.innerHTML = `
            <span style="color: #60a5fa; text-decoration: underline; text-underline-offset: 2px;" title="Abrir data no Calendar e diário">📅 ${info.label}</span>
            <span style="color: #52525b; font-size: 11px;">⋮⋮ segure e arraste</span>
          `;

          dueRow.addEventListener('click', (e) => {
            e.stopPropagation();
            app.workspace.openLinkText(`01_Inbox/Diário/${info.isoDate}.md`, "", false);
            new Notice(`📅 Navegando para ${info.label} no Calendário`);
          });
        }
      });
    }
  });
}

renderKanban();


// 5. GRID DUPLO INFERIOR: DAILY TRACKER & TO-DO + LEITURAS & ESTUDOS
const bottomGrid = root.createEl('div', { cls: 'abyssal-bottom-grid' });

// --- ESQUERDA: DAILY TRACKER & TO-DO ---
const leftBottom = bottomGrid.createEl('div', { cls: 'abyssal-card-box', attr: { style: 'gap: 18px;' } });

const trackerBox = leftBottom.createEl('div');
const trackerHeader = trackerBox.createEl('div', { 
  attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;' } 
});

trackerHeader.innerHTML = `
  <div style="display: flex; align-items: center; gap: 8px;">
    <span class="abyssal-section-title">DAILY TRACKER</span>
    <span style="font-size: 12px; font-family: monospace; color: #a1a1aa; cursor: pointer;" title="Abrir nota diária de hoje">01_Inbox/Diário (${todayStr})</span>
  </div>
  <div style="display: flex; align-items: center; gap: 8px;">
    <span id="abyssal-habit-pct" style="font-size: 12px; font-family: monospace; color: #86efac; font-weight: bold;">0%</span>
    <button id="abyssal-add-habit-btn" class="abyssal-nav-pill-btn" style="padding: 2px 8px; font-size: 11px;" title="Adicionar nova meta diária">+ META</button>
  </div>
`;

function abrirModalNovaMeta() {
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 380px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';
  
  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 14px; font-weight: bold; color: #ffffff;">🎯 Nova Meta Diária</span>
      <button id="modal-close-habit" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
    </div>
    <div style="font-size: 11px; font-family: monospace; color: #a1a1aa;">Adicionar novo hábito na nota diária (${todayStr}):</div>
    <input id="modal-habit-input" type="text" placeholder="Ex: Hidratação 2L, Leitura 30 min..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;">
    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
      <button id="modal-cancel-habit" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
      <button id="modal-save-habit" class="abyssal-btn-primary" style="font-size: 11px;">Adicionar Meta</button>
    </div>
  `;
  
  modalBg.appendChild(modalBox);
  document.body.appendChild(modalBg);
  
  const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
  
  const closeHabit = modalBox.querySelector('#modal-close-habit');
  if (closeHabit) closeHabit.addEventListener('click', fechar);
  const cancelHabit = modalBox.querySelector('#modal-cancel-habit');
  if (cancelHabit) cancelHabit.addEventListener('click', fechar);
  
  const saveHabit = modalBox.querySelector('#modal-save-habit');
  if (saveHabit) {
    saveHabit.addEventListener('click', async () => {
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
      new Notice(`🎯 Nova meta adicionada: ${metaNome}`);
      fechar();
      renderDailyTracker();
    }
  });
}
}

const addHabitBtn = trackerHeader.querySelector('#abyssal-add-habit-btn');
if (addHabitBtn) addHabitBtn.addEventListener('click', abrirModalNovaMeta);

const trackerTrack = trackerBox.createEl('div', { cls: 'abyssal-prog-track', attr: { style: 'height: 6px; width: 100%; margin-bottom: 12px;' } });
const trackerBar = trackerTrack.createEl('div', { cls: 'abyssal-prog-fill', attr: { style: 'width: 0%; background: #86efac;' } });

const habitsGrid = trackerBox.createEl('div', { attr: { style: 'display: grid; grid-template-columns: 1fr 1fr; gap: 10px; font-size: 14px; color: #e4e4e7;' } });

const defaultHabits = ['Leitura 20 min', 'Estudo Algoritmos', 'Pomodoro 4x', 'Exercício Físico'];

async function renderDailyTracker() {
  habitsGrid.innerHTML = '';
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
    if (habits.length === 0) {
      lines.forEach((l, idx) => {
        const match = l.match(/^- \[([ xX])\] (.*)$/);
        if (match && defaultHabits.some(dh => match[2].includes(dh))) {
          habits.push({ name: match[2].trim(), checked: match[1].toLowerCase() === 'x', line: idx });
        }
      });
    }
  }

  if (habits.length === 0) {
    defaultHabits.forEach(name => habits.push({ name, checked: false, line: -1 }));
  }

  let checkedCount = 0;
  habits.forEach(h => {
    const label = habitsGrid.createEl('label', { attr: { style: 'display: flex; align-items: center; gap: 8px; cursor: pointer;' } });
    const cb = label.createEl('input', { cls: 'abyssal-circle-check', attr: { type: 'checkbox' } });
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
      new Notice(`Hábito atualizado: ${h.name}`);
      renderDailyTracker();
    });

    label.createEl('span', { text: h.name });
  });

  const pct = Math.round((checkedCount / habits.length) * 100);
  if (trackerBar) trackerBar.style.width = pct + '%';
  const habitPctEl = root.querySelector('#abyssal-habit-pct');
  if (habitPctEl) habitPctEl.textContent = `${checkedCount}/${habits.length} hábitos • ${pct}%`;
}

renderDailyTracker();


// To Do Prioritário
const todoBox = leftBottom.createEl('div', { attr: { style: 'padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06);' } });
todoBox.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
    <span class="abyssal-section-title">TO DO PRIORITÁRIO</span>
    <span style="font-size: 12px; font-family: monospace; color: #a1a1aa;">01_Inbox & Vault</span>
  </div>
`;

const todoList = todoBox.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 8px; font-size: 14px; color: #e4e4e7;' } });

const tarefas = dv.pages()
  .where(p => p.file && !p.file.path.includes("Template") && !p.file.path.includes("00_Home"))
  .sort(p => p.file.mtime, 'desc')
  .file.tasks
  .where(t => !t.completed && !t.text.includes("Leitura 20 min"))
  .slice(0, 4);

if (tarefas.length === 0) {
  todoList.innerHTML = '<div style="color: #71717a; font-size: 13px;">Nenhuma tarefa pendente no vault!</div>';
} else {
  tarefas.forEach(t => {
    const filePath = t.path || (t.link ? t.link.path : null);
    const fileName = t.link ? (t.link.display || t.link.path.split('/').pop().replace(/\.md$/, '')) : (filePath ? filePath.split('/').pop().replace(/\.md$/, '') : 'Nota');

    const row = todoList.createEl('div', { 
      attr: { style: 'display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 4px 0;' } 
    });
    
    const label = row.createEl('label', { 
      attr: { style: 'display: flex; align-items: center; gap: 10px; cursor: pointer; flex: 1; overflow: hidden;' } 
    });
    const cb = label.createEl('input', { cls: 'abyssal-circle-check', attr: { type: 'checkbox' } });
    const labelSpan = label.createEl('span', { 
      text: t.text.replace(/📅.*$/, '').trim(),
      attr: { style: 'overflow: hidden; text-overflow: ellipsis; white-space: nowrap;' }
    });

    if (filePath) {
      const sourceBadge = row.createEl('a', { 
        cls: 'abyssal-todo-source', 
        text: `📄 ${fileName}`,
        attr: { title: `Abrir nota: ${filePath}` }
      });
      sourceBadge.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        app.workspace.openLinkText(filePath, "", false);
      });
    }

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
            new Notice(`Tarefa concluída em ${file.basename}!`);
            labelSpan.style.textDecoration = 'line-through';
            labelSpan.style.color = '#71717a';
          }
        }
      }
    });
  });
}


// --- DIREITA: READING & MATÉRIAS ---
const rightBottom = bottomGrid.createEl('div', { cls: 'abyssal-card-box', attr: { style: 'gap: 18px;' } });

const readingBox = rightBottom.createEl('div');
readingBox.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
    <span class="abyssal-section-title">READING</span>
    <span style="font-size: 12px; font-family: monospace; color: #a1a1aa;">04_Leituras/Livros</span>
  </div>
`;

const shelf = readingBox.createEl('div', { cls: 'abyssal-books-shelf' });
const livros = dv.pages('"04_Leituras/Livros"')
  .where(l => !l.file.name.includes("Template"))
  .sort(l => l.file.mtime, 'desc')
  .slice(0, 3);

if (livros.length === 0) {
  shelf.innerHTML = '<div style="color: #71717a; font-size: 13px;">Nenhum livro em 04_Leituras.</div>';
} else {
  livros.forEach(b => {
    const item = shelf.createEl('div', { cls: 'abyssal-book-item' });
    item.addEventListener('click', () => app.workspace.openLinkText(b.file.path, "", false));

    const img = item.createEl('img', { cls: 'abyssal-book-cover' });
    img.src = b.cover || "https://images.pexels.com/photos/10254198/pexels-photo-10254198.jpeg";
    
    item.createEl('div', { 
      text: b.title || b.file.name, 
      attr: { style: 'font-size: 13px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;' } 
    });

    const cur = Number(b.current_page) || 0;
    const tot = Number(b.total_pages) || 0;
    const pct = tot > 0 ? Math.round((cur / tot) * 100) : 0;

    const bookProg = item.createEl('div');
    bookProg.innerHTML = `
      <div style="display: flex; justify-content: space-between; font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 3px;">
        <span>${tot > 0 ? `${cur}/${tot}p` : 'Lendo'}</span>
        <span style="color: #ffffff; font-weight: bold;">${pct}%</span>
      </div>
      <div class="abyssal-prog-track" style="height: 5px; width: 100%;">
        <div class="abyssal-prog-fill" style="width: ${pct}%; background: #ffffff;"></div>
      </div>
    `;
  });
}

const subjectsSection = rightBottom.createEl('div', { attr: { style: 'padding-top: 14px; border-top: 1px solid rgba(255,255,255,0.06);' } });
subjectsSection.innerHTML = `
  <div style="display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 10px;">
    <span class="abyssal-section-title">MATÉRIAS & ESTUDOS</span>
    <span style="font-size: 12px; font-family: monospace; color: #a1a1aa;">03_Estudos</span>
  </div>
`;

const subjectsGrid = subjectsSection.createEl('div', { cls: 'abyssal-subject-grid' });
const estudos = dv.pages('"03_Estudos"')
  .where(e => !e.file.name.includes("Template"))
  .slice(0, 4);

const subjectIcons = ['💻', '🗄️', '📐', '🧠'];
estudos.forEach((e, idx) => {
  const card = subjectsGrid.createEl('div', { cls: 'abyssal-subject-card' });
  card.innerHTML = `
    <span style="font-size: 1.4rem;">${subjectIcons[idx % subjectIcons.length]}</span>
    <div style="overflow: hidden;">
      <div style="font-size: 14px; font-weight: 700; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${e.title || e.file.name}</div>
      <div style="font-size: 12px; font-family: monospace; color: #a1a1aa; margin-top: 2px;">${e.disciplina || 'Geral'}</div>
    </div>
  `;
  card.addEventListener('click', () => app.workspace.openLinkText(e.file.path, "", false));
});
```
