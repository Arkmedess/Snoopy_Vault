/**
 * Snoopy Vault - Subdashboard Especializado de Estudos
 * Framework Completo fiel às plataformas de concurso e estudo (Estudei):
 * - Abas de Navegação: [ Painel de Controle ] [ Meu Planner ] [ Revisões ] [ Ciclo de Estudos ]
 * - Painel de Controle (Prints 2 e 3): Gráfico Donut SVG de Horas, Cards de Métricas e Tabela Analítica
 * - Meu Planner (Print 1): Calendário semanal de blocos de estudo
 * - Central de Revisões: Abas Programadas, Atrasadas e Concluídas com intervalos espaçados
 * - Ciclo de Estudos: Rotação contínua e vinculação direta ao Pomodoro
 */

const root = dv.container.createEl('div', { cls: 'abyssal-container' });
const now = new Date();
const padTime = (n) => String(n).padStart(2, '0');
const todayStr = `${now.getFullYear()}-${padTime(now.getMonth() + 1)}-${padTime(now.getDate())}`;

// ---------------------------------------------------------------------------
// 1. GERENCIAMENTO DE ESTADO E PERSISTÊNCIA
// ---------------------------------------------------------------------------
const cicloMetaPath = "99_Meta/ciclo-estudos.json";

const defaultState = {
  disciplinaAtualIdx: 0,
  cicloOrdem: [],
  metaHorasSemanal: 20,
  metaQuestoesSemanal: 150,
  nomeMetaProva: "Concurso / Exame",
  dataMetaProva: "",
  historicoDiario: {},
  revisoes: [],
  planner: {} // { "YYYY-MM-DD": [ { materia: "...", tempo: "1h30", tipo: "Teoria" } ] }
};

async function carregarEstadoEstudos() {
  let state = { ...defaultState };
  const file = app.vault.getAbstractFileByPath(cicloMetaPath);
  if (file) {
    try {
      const raw = await app.vault.read(file);
      const parsed = JSON.parse(raw);
      state = { ...defaultState, ...parsed };
      if (!state.historicoDiario) state.historicoDiario = {};
      if (!Array.isArray(state.revisoes)) state.revisoes = [];
      if (!state.planner) state.planner = {};
    } catch(e) {}
  }
  return state;
}

async function salvarEstadoEstudos(state) {
  const file = app.vault.getAbstractFileByPath(cicloMetaPath);
  const jsonStr = JSON.stringify(state, null, 2);
  if (file) {
    await app.vault.modify(file, jsonStr);
  } else {
    await app.vault.create(cicloMetaPath, jsonStr);
  }
}

let estadoAtual = await carregarEstadoEstudos();
let abaModulo = 'painel'; // 'painel' | 'planner' | 'revisoes' | 'ciclo'
let revisaoFiltro = 'programadas'; // 'programadas' | 'atrasadas' | 'concluidas'

// Coleta de disciplinas cadastradas em 03_Estudos
const rawPages = dv.pages('"03_Estudos"')
  .where(p => p.file && !p.file.name.includes("Template") && !p.file.name.includes("Painel"));
const materias = [...rawPages];

// ---------------------------------------------------------------------------
// 2. MODAL DE REGISTRO RÁPIDO & METAS
// ---------------------------------------------------------------------------
function abrirModalSessao(materiaPreSelecionada = null) {
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 440px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';

  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 14px; font-weight: bold; color: #ffffff;">⏱️ Registrar Estudo & Questões</span>
      <button id="modal-close-sess" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
    </div>

    <div>
      <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Disciplina:</div>
      <select id="modal-sess-mat" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
        ${materias.map(m => `
          <option value="${m.file.path}" ${materiaPreSelecionada && materiaPreSelecionada.file.path === m.file.path ? 'selected' : ''}>
            ${m.title || m.file.name}
          </option>
        `).join('')}
      </select>
    </div>

    <div style="display: flex; gap: 8px;">
      <div style="flex: 1;">
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Tempo de Foco (minutos):</div>
        <input id="modal-sess-min" type="number" min="0" value="50" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>
      <div style="flex: 1;">
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Tipo de Estudo:</div>
        <select id="modal-sess-tipo" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
          <option value="Teoria + Questões" selected>Teoria + Questões</option>
          <option value="Apenas Teoria">Apenas Teoria</option>
          <option value="Apenas Questões">Apenas Questões</option>
          <option value="Revisão">Revisão</option>
        </select>
      </div>
    </div>

    <div style="display: flex; gap: 8px;">
      <div style="flex: 1;">
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Questões Feitas:</div>
        <input id="modal-sess-feitas" type="number" min="0" value="10" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>
      <div style="flex: 1;">
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Acertos:</div>
        <input id="modal-sess-acertos" type="number" min="0" value="8" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
      <input id="modal-sess-rev" type="checkbox" checked style="accent-color: var(--text-normal); cursor: pointer;">
      <label for="modal-sess-rev" style="font-size: 11.5px; color: #a1a1aa; cursor: pointer;">
        Programar Revisão Espaçada inicial (1 dia)
      </label>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
      <button id="modal-cancel-sess" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
      <button id="modal-save-sess" class="abyssal-btn-primary" style="font-size: 11px;">Salvar Sessão</button>
    </div>
  `;

  modalBg.appendChild(modalBox);
  document.body.appendChild(modalBg);

  const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
  modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });
  modalBox.querySelector('#modal-close-sess').onclick = fechar;
  modalBox.querySelector('#modal-cancel-sess').onclick = fechar;

  modalBox.querySelector('#modal-save-sess').onclick = async () => {
    const matPath = modalBox.querySelector('#modal-sess-mat').value;
    const minutos = parseInt(modalBox.querySelector('#modal-sess-min').value, 10) || 0;
    const tipo = modalBox.querySelector('#modal-sess-tipo').value;
    const feitas = parseInt(modalBox.querySelector('#modal-sess-feitas').value, 10) || 0;
    const acertos = parseInt(modalBox.querySelector('#modal-sess-acertos').value, 10) || 0;
    const agendarRev = modalBox.querySelector('#modal-sess-rev').checked;

    const file = app.vault.getAbstractFileByPath(matPath);
    const nomeMateria = file ? file.basename : "Estudos";

    // Atualiza histórico diário
    if (!estadoAtual.historicoDiario[todayStr]) {
      estadoAtual.historicoDiario[todayStr] = { minutosFoco: 0, questoesFeitas: 0, questoesAcertos: 0 };
    }
    estadoAtual.historicoDiario[todayStr].minutosFoco += minutos;
    estadoAtual.historicoDiario[todayStr].questoesFeitas += feitas;
    estadoAtual.historicoDiario[todayStr].questoesAcertos += acertos;

    // Agendamento de revisão
    if (agendarRev && file) {
      const amanha = new Date(now.getTime() + 86400000);
      const amanhaStr = `${amanha.getFullYear()}-${padTime(amanha.getMonth() + 1)}-${padTime(amanha.getDate())}`;
      estadoAtual.revisoes = estadoAtual.revisoes.filter(r => r.materiaPath !== matPath);
      estadoAtual.revisoes.push({
        materiaPath: matPath,
        nome: nomeMateria,
        ultimaRevisao: todayStr,
        proximaRevisao: amanhaStr,
        intervaloDias: 1,
        tipo: tipo,
        status: 'programada'
      });
    }

    await salvarEstadoEstudos(estadoAtual);

    // Atualiza nota física da matéria
    if (file) {
      const raw = await app.vault.read(file);
      let updated = raw;
      if (feitas > 0) {
        let fTotal = feitas;
        let aTotal = acertos;
        const mF = raw.match(/questoes_feitas:\s*(\d+)/);
        if (mF) fTotal += parseInt(mF[1], 10);
        const mA = raw.match(/questoes_acertos:\s*(\d+)/);
        if (mA) aTotal += parseInt(mA[1], 10);

        if (/questoes_feitas:\s*\d+/.test(updated)) {
          updated = updated.replace(/questoes_feitas:\s*\d+/, `questoes_feitas: ${fTotal}`);
        } else if (updated.startsWith('---')) {
          updated = updated.replace(/^---\n/, `---\nquestoes_feitas: ${fTotal}\n`);
        }

        if (/questoes_acertos:\s*\d+/.test(updated)) {
          updated = updated.replace(/questoes_acertos:\s*\d+/, `questoes_acertos: ${aTotal}`);
        } else if (updated.startsWith('---')) {
          updated = updated.replace(/^---\n/, `---\nquestoes_acertos: ${aTotal}\n`);
        }
      }

      // Adiciona minutos de foco no frontmatter da matéria
      let minMatTotal = minutos;
      const mMin = raw.match(/minutos_foco:\s*(\d+)/);
      if (mMin) minMatTotal += parseInt(mMin[1], 10);
      if (/minutos_foco:\s*\d+/.test(updated)) {
        updated = updated.replace(/minutos_foco:\s*\d+/, `minutos_foco: ${minMatTotal}`);
      } else if (updated.startsWith('---')) {
        updated = updated.replace(/^---\n/, `---\nminutos_foco: ${minMatTotal}\n`);
      }

      await app.vault.modify(file, updated);
    }

    new Notice(`🎉 Sessão registrada: ${minutos}m em ${nomeMateria}!`);
    fechar();
    renderFrameworkEstudos();
  };
}

// ---------------------------------------------------------------------------
// 3. RENDERIZADOR PRINCIPAL DO FRAMEWORK ESTUDEI
// ---------------------------------------------------------------------------
function renderFrameworkEstudos() {
  root.innerHTML = '';

  // 3.1. CABEÇALHO GLOBAL COM NAVEGAÇÃO E AÇÕES
  const header = root.createEl('div', {
    attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 18px; padding: 12px 18px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 10px; flex-wrap: wrap; gap: 12px;' }
  });

  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <button id="btn-back-home" class="abyssal-btn-action" style="font-size: 11px; padding: 4px 10px;">← HOME</button>
      <div>
        <div style="font-size: 15px; font-weight: 700; color: var(--text-normal); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px;">
          <span>📚</span> FRAMEWORK DE ESTUDOS • ESTUDEI
        </div>
        <div style="font-size: 11px; font-family: monospace; color: var(--text-muted);">${materias.length} disciplinas cadastradas</div>
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 8px;">
      <button id="btn-registrar-sessao-top" class="abyssal-btn-primary" style="font-size: 11px; padding: 4px 12px;">+ REGISTRAR ESTUDO</button>
    </div>
  `;

  header.querySelector('#btn-back-home').onclick = () => app.workspace.openLinkText("00_Home/Home.md", "", false);
  header.querySelector('#btn-registrar-sessao-top').onclick = () => abrirModalSessao();

  // 3.2. BARRA DE ABAS MODULARES DO FRAMEWORK (PRINTS 1, 2, 3 E 5)
  const navTabs = root.createEl('div', {
    attr: {
      style: 'display: flex; gap: 6px; border-bottom: 2px solid var(--background-modifier-border); margin-bottom: 20px; overflow-x: auto; padding-bottom: 2px;'
    }
  });

  const abas = [
    { id: 'painel', label: '📊 PAINEL DE CONTROLE (Métricas & Donut)' },
    { id: 'planner', label: '📅 MEU PLANNER (Cronograma)' },
    { id: 'revisoes', label: '🔄 REVISÕES ESPAÇADAS' },
    { id: 'ciclo', label: '🎯 CICLO DE ESTUDOS' }
  ];

  abas.forEach(aba => {
    const isAtiva = abaModulo === aba.id;
    const btn = navTabs.createEl('button', {
      cls: `abyssal-btn-mode ${isAtiva ? 'active' : ''}`,
      attr: {
        style: `font-size: 11px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.05em; padding: 6px 14px; border-radius: 4px; white-space: nowrap; ${isAtiva ? 'background: var(--text-normal); color: var(--background-primary);' : ''}`
      },
      text: aba.label
    });
    btn.onclick = () => {
      abaModulo = aba.id;
      renderFrameworkEstudos();
    };
  });

  // -------------------------------------------------------------------------
  // ABA 1: PAINEL DE CONTROLE (PRINTS 2 E 3)
  // -------------------------------------------------------------------------
  if (abaModulo === 'painel') {
    renderAbaPainelDeControle();
  } else if (abaModulo === 'planner') {
    renderAbaMeuPlanner();
  } else if (abaModulo === 'revisoes') {
    renderAbaRevisoes();
  } else if (abaModulo === 'ciclo') {
    renderAbaCicloEstudos();
  }
}

// ---------------------------------------------------------------------------
// 4. VISÃO: PAINEL DE CONTROLE (PRINTS 2 E 3 - DONUT SVG & TABELA ANALÍTICA)
// ---------------------------------------------------------------------------
function renderAbaPainelDeControle() {
  const container = root.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 20px;' } });

  // Cálculos Consolidados
  let totalMinutosGlobal = 0;
  let totalQuestoesGlobal = 0;
  let totalAcertosGlobal = 0;
  let totalErrosGlobal = 0;

  // Mapa de tempo por disciplina para o gráfico Donut
  const disciplinasDados = materias.map(m => {
    const min = Number(m.minutos_foco) || (Number(m.tempo_foco) ? Number(m.tempo_foco)*60 : 60);
    const feitas = Number(m.questoes_feitas) || 0;
    const acertos = Number(m.questoes_acertos) || 0;
    const erros = Math.max(0, feitas - acertos);

    totalMinutosGlobal += min;
    totalQuestoesGlobal += feitas;
    totalAcertosGlobal += acertos;
    totalErrosGlobal += erros;

    return {
      nome: m.title || m.file.name,
      path: m.file.path,
      minutos: min,
      feitas,
      acertos,
      erros,
      pct: feitas > 0 ? Math.round((acertos / feitas) * 100) : 0
    };
  });

  const totalHorasTxt = `${Math.floor(totalMinutosGlobal / 60)}h${totalMinutosGlobal % 60}m`;
  const pctAcertosGeral = totalQuestoesGlobal > 0 ? Math.round((totalAcertosGlobal / totalQuestoesGlobal) * 100) : 0;

  // 1. CÁLCULO DOS ÚLTIMOS 7 DIAS (EVOLUÇÃO TEMPORAL & POMODORO)
  const ultimos7Dias = [];
  const diasSemanaNomesCurtos = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let somaMinutos7d = 0;
  let somaQuestoes7d = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dStr = `${d.getFullYear()}-${padTime(d.getMonth() + 1)}-${padTime(d.getDate())}`;
    const isHoje = dStr === todayStr;

    let minDia = 0;
    let questDia = 0;

    // Sessões registradas
    if (estadoAtual.historicoDiario && estadoAtual.historicoDiario[dStr]) {
      minDia += Number(estadoAtual.historicoDiario[dStr].minutosFoco) || 0;
      questDia += Number(estadoAtual.historicoDiario[dStr].questoesFeitas) || 0;
    }

    // Leitura retroativa do diário (pomodoros de 25m)
    const dailyPage = dv.page(`"01_Inbox/Diário/${dStr}"`);
    if (dailyPage && dailyPage.pomodoros) {
      const pMin = Number(dailyPage.pomodoros) * 25;
      if (pMin > minDia) minDia = pMin;
    }

    somaMinutos7d += minDia;
    somaQuestoes7d += questDia;

    ultimos7Dias.push({
      dataStr: dStr,
      diaSemana: diasSemanaNomesCurtos[d.getDay()],
      diaMes: `${padTime(d.getDate())}/${padTime(d.getMonth() + 1)}`,
      minutos: minDia,
      questoes: questDia,
      isHoje
    });
  }

  const mediaMinutosDia = Math.round(somaMinutos7d / 7);
  const mediaHorasTxt = `${Math.floor(mediaMinutosDia / 60)}h${mediaMinutosDia % 60}m`;
  const maxMinutosPlot = Math.max(60, ...ultimos7Dias.map(p => p.minutos)) * 1.15;

  // FAIXA SUPERIOR 50/50: DONUT POR DISCIPLINA & LINHA DE EVOLUÇÃO SEMANAL
  const topControlGrid = container.createEl('div', {
    cls: 'abyssal-showcase-grid',
    attr: { style: 'margin-bottom: 0;' }
  });

  // CARD 1: DONUT SVG (HORAS POR DISCIPLINA)
  const donutCard = topControlGrid.createEl('div', {
    cls: 'abyssal-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 14px;' }
  });

  donutCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="abyssal-section-title">HORAS POR DISCIPLINA</span>
      <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">Total: ${totalHorasTxt}</span>
    </div>
  `;

  const donutContent = donutCard.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: 130px 1fr; gap: 16px; align-items: center;' }
  });

  // Construção do Gráfico Donut em SVG Puro
  const coresPaleta = ['#2DCDAA', '#6735BC', '#2196F3', '#FF6347', '#E7D827', '#93c5fd', '#86efac', '#f472b6'];
  const svgWrapper = donutContent.createEl('div', { attr: { style: 'position: relative; width: 130px; height: 130px; display: flex; align-items: center; justify-content: center;' } });
  
  const raio = 50;
  const circunferencia = 2 * Math.PI * raio;
  let offsetAcumulado = 0;

  let circlesHtml = '';
  disciplinasDados.forEach((d, idx) => {
    const proporcao = totalMinutosGlobal > 0 ? (d.minutos / totalMinutosGlobal) : (1 / Math.max(1, disciplinasDados.length));
    const strokeDash = proporcao * circunferencia;
    const strokeOffset = -offsetAcumulado;
    offsetAcumulado += strokeDash;
    const cor = coresPaleta[idx % coresPaleta.length];

    circlesHtml += `
      <circle cx="65" cy="65" r="${raio}" fill="none" stroke="${cor}" stroke-width="15"
        stroke-dasharray="${strokeDash} ${circunferencia - strokeDash}"
        stroke-dashoffset="${strokeOffset}" style="transition: stroke-dasharray 0.3s ease;" />
    `;
  });

  svgWrapper.innerHTML = `
    <svg width="130" height="130" viewBox="0 0 130 130" style="transform: rotate(-90deg);">
      <circle cx="65" cy="65" r="${raio}" fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="15" />
      ${circlesHtml}
    </svg>
    <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; text-align: center;">
      <span style="font-size: 9.5px; font-family: monospace; color: var(--text-muted); text-transform: uppercase;">Total</span>
      <span style="font-size: 13.5px; font-weight: 800; color: var(--text-normal); font-family: monospace;">${totalHorasTxt}</span>
    </div>
  `;

  // Legenda do Donut
  const legendaBox = donutContent.createEl('div', {
    attr: { style: 'display: flex; flex-direction: column; gap: 5px; max-height: 130px; overflow-y: auto; padding-right: 4px;' }
  });

  disciplinasDados.forEach((d, idx) => {
    const cor = coresPaleta[idx % coresPaleta.length];
    const hTxt = `${Math.floor(d.minutos / 60)}h${d.minutos % 60}m`;
    const pctTxt = totalMinutosGlobal > 0 ? Math.round((d.minutos / totalMinutosGlobal) * 100) : 0;

    const row = legendaBox.createEl('div', {
      attr: { style: 'display: flex; justify-content: space-between; align-items: center; font-size: 10.5px; font-family: monospace;' }
    });
    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
        <span style="width: 7px; height: 7px; border-radius: 50%; background: ${cor}; flex-shrink: 0;"></span>
        <span style="color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${d.nome}</span>
      </div>
      <span style="color: var(--text-muted); flex-shrink: 0;">${hTxt} (${pctTxt}%)</span>
    `;
  });

  // CARD 2: GRÁFICO DE LINHA/ÁREA SVG (EVOLUÇÃO DOS ÚLTIMOS 7 DIAS COM POMODORO)
  const lineChartCard = topControlGrid.createEl('div', {
    cls: 'abyssal-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 10px;' }
  });

  lineChartCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="abyssal-section-title">TEMPO DE ESTUDO & FOCO (7 DIAS)</span>
      <span style="font-size: 10.5px; font-family: monospace; color: var(--text-muted);">Média: ${mediaHorasTxt}/dia</span>
    </div>
  `;

  // Construção do Gráfico de Linha/Área SVG
  const plotW = 285;
  const plotH = 75;
  const padL = 32;
  const padT = 16;
  const baseLineY = padT + plotH;

  const pontosCoord = ultimos7Dias.map((p, idx) => {
    const cx = padL + (idx / 6) * plotW;
    const cy = baseLineY - (p.minutos / maxMinutosPlot) * plotH;
    return { ...p, cx, cy };
  });

  const linePathD = pontosCoord.map((pt, idx) => `${idx === 0 ? 'M' : 'L'} ${pt.cx.toFixed(1)},${pt.cy.toFixed(1)}`).join(' ');
  const areaPathD = `${linePathD} L ${pontosCoord[6].cx.toFixed(1)},${baseLineY} L ${pontosCoord[0].cx.toFixed(1)},${baseLineY} Z`;
  const yMediaLine = baseLineY - (mediaMinutosDia / maxMinutosPlot) * plotH;

  const lineSvgContainer = lineChartCard.createEl('div', { attr: { style: 'width: 100%; position: relative;' } });
  lineSvgContainer.innerHTML = `
    <svg width="100%" height="125" viewBox="0 0 345 125" style="overflow: visible;">
      <defs>
        <linearGradient id="areaGradEstudos" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="var(--interactive-accent, #60a5fa)" stop-opacity="0.32" />
          <stop offset="100%" stop-color="var(--interactive-accent, #60a5fa)" stop-opacity="0.0" />
        </linearGradient>
      </defs>

      <!-- Linhas horizontais de referência (grade) -->
      <line x1="${padL}" y1="${baseLineY}" x2="${padL + plotW}" y2="${baseLineY}" stroke="var(--background-modifier-border)" stroke-width="1" />
      <line x1="${padL}" y1="${yMediaLine.toFixed(1)}" x2="${padL + plotW}" y2="${yMediaLine.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="3,3" stroke-width="1" />

      <!-- Área com gradiente -->
      <path d="${areaPathD}" fill="url(#areaGradEstudos)" />

      <!-- Linha principal da curva de estudos -->
      <path d="${linePathD}" fill="none" stroke="var(--interactive-accent, #60a5fa)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

      <!-- Rótulos do Eixo X e Pontos -->
      ${pontosCoord.map(pt => `
        <!-- Eixo X (Dia da semana) -->
        <text x="${pt.cx.toFixed(1)}" y="${baseLineY + 14}" text-anchor="middle" font-size="9" fill="${pt.isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-muted)'}" font-family="monospace" font-weight="${pt.isHoje ? 'bold' : 'normal'}">
          ${pt.diaSemana}
        </text>

        <!-- Valor do Ponto (minutos/horas) -->
        ${pt.minutos > 0 ? `
          <text x="${pt.cx.toFixed(1)}" y="${(pt.cy - 6).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="${pt.isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-normal)'}" font-family="monospace" font-weight="bold">
            ${pt.minutos >= 60 ? `${Math.floor(pt.minutos / 60)}h${pt.minutos % 60 ? `${pt.minutos % 60}m` : ''}` : `${pt.minutos}m`}
          </text>
        ` : ''}

        <!-- Marcador do ponto -->
        <circle cx="${pt.cx.toFixed(1)}" cy="${pt.cy.toFixed(1)}" r="${pt.isHoje ? 4.5 : 3}" fill="${pt.isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-normal)'}" stroke="var(--background-secondary, #111118)" stroke-width="1.5" />
      `).join('')}
    </svg>
  `;

  // CARDS DE KPI CONSOLIDADOS (EM LARGURA TOTAL)
  const kpiGridCard = container.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;' }
  });

  const kpis = [
    { label: 'TOTAL DE QUESTÕES', val: totalQuestoesGlobal, sub: 'Exercícios cadastrados', cor: 'var(--text-normal)', icone: '📝' },
    { label: 'TOTAL DE ACERTOS', val: totalAcertosGlobal, sub: `${pctAcertosGeral}% de taxa`, cor: '#86efac', icone: '✓' },
    { label: 'TOTAL DE ERROS', val: totalErrosGlobal, sub: 'Pontos de reforço', cor: totalErrosGlobal > 0 ? '#fca5a5' : 'var(--text-muted)', icone: '✗' },
    { label: 'TAXA GERAL DE ACERTO', val: `${pctAcertosGeral}%`, sub: 'Meta sugerida: 80%', cor: pctAcertosGeral >= 80 ? '#86efac' : 'var(--text-normal)', icone: '🎯' },
    { label: 'HORAS DE ESTUDO', val: totalHorasTxt, sub: 'Tempo líquido focado', cor: 'var(--text-normal)', icone: '⏱️' },
    { label: 'MATÉRIAS ATIVAS', val: materias.length, sub: 'No plano de estudo', cor: 'var(--interactive-accent, #60a5fa)', icone: '📚' }
  ];

  kpis.forEach(k => {
    const cardEl = kpiGridCard.createEl('div', {
      attr: { style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px;' }
    });
    cardEl.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 9.5px; font-family: monospace; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em;">${k.label}</span>
        <span style="font-size: 11px;">${k.icone}</span>
      </div>
      <span style="font-size: 20px; font-weight: 800; color: ${k.cor}; font-family: monospace; line-height: 1.2;">${k.val}</span>
      <span style="font-size: 10px; font-family: monospace; color: var(--text-muted);">${k.sub}</span>
    `;
  });

  // TABELA DETALHADA POR DISCIPLINA (PRINT 2 FIEL)
  const tableSection = container.createEl('div', { cls: 'abyssal-card-box', attr: { style: 'display: flex; flex-direction: column; gap: 12px;' } });
  
  tableSection.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="abyssal-section-title">TABELA ANALÍTICA POR DISCIPLINA</span>
      <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">${disciplinasDados.length} disciplinas</span>
    </div>
  `;

  const tableWrapper = tableSection.createEl('div', { attr: { style: 'overflow-x: auto;' } });
  const tableEl = tableWrapper.createEl('table', {
    attr: { style: 'width: 100%; border-collapse: collapse; font-size: 12px; font-family: monospace; text-align: left;' }
  });

  tableEl.innerHTML = `
    <thead>
      <tr style="border-bottom: 2px solid var(--background-modifier-border); color: var(--text-muted); font-size: 11px; text-transform: uppercase;">
        <th style="padding: 8px 10px;">Disciplina</th>
        <th style="padding: 8px 10px;">Tempo Focado</th>
        <th style="padding: 8px 10px; color: #86efac;">✓ Acertos</th>
        <th style="padding: 8px 10px; color: #fca5a5;">✗ Erros</th>
        <th style="padding: 8px 10px;">Total Questões</th>
        <th style="padding: 8px 10px;">Assertividade</th>
        <th style="padding: 8px 10px; text-align: right;">Ação</th>
      </tr>
    </thead>
    <tbody>
      ${disciplinasDados.map(d => {
        const hTxt = `${Math.floor(d.minutos / 60)}h${d.minutos % 60}m`;
        return `
          <tr style="border-bottom: 1px solid var(--background-modifier-border); transition: background 0.12s ease;">
            <td style="padding: 10px; font-weight: 700; color: var(--text-normal);">${d.nome}</td>
            <td style="padding: 10px; color: var(--text-normal);">${hTxt}</td>
            <td style="padding: 10px; color: #86efac; font-weight: bold;">${d.acertos}</td>
            <td style="padding: 10px; color: ${d.erros > 0 ? '#fca5a5' : 'var(--text-muted)'}; font-weight: bold;">${d.erros}</td>
            <td style="padding: 10px; color: var(--text-normal);">${d.feitas}</td>
            <td style="padding: 10px;">
              <div style="display: flex; align-items: center; gap: 8px; width: 140px;">
                <div class="abyssal-prog-track" style="height: 5px; flex: 1;">
                  <div class="abyssal-prog-fill" style="width: ${d.pct}%; background: ${d.pct >= 80 ? '#86efac' : d.pct >= 60 ? 'var(--text-normal)' : '#fca5a5'};"></div>
                </div>
                <span style="font-weight: bold; color: ${d.pct >= 80 ? '#86efac' : 'var(--text-normal)'}; font-size: 11px;">${d.pct}%</span>
              </div>
            </td>
            <td style="padding: 10px; text-align: right;">
              <button class="abyssal-todo-source btn-open-mat" data-path="${d.path}" style="font-size: 10.5px; padding: 2px 8px;">Abrir →</button>
            </td>
          </tr>
        `;
      }).join('')}
    </tbody>
  `;

  tableEl.querySelectorAll('.btn-open-mat').forEach(btn => {
    btn.onclick = () => app.workspace.openLinkText(btn.dataset.path, "", false);
  });
}

// ---------------------------------------------------------------------------
// 5. VISÃO: MEU PLANNER (CRONOGRAMA SEMANAL - PRINT 1)
// ---------------------------------------------------------------------------
function renderAbaMeuPlanner() {
  const container = root.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 16px;' } });

  const diasSemanaNomes = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
  
  const plannerHeader = container.createEl('div', { cls: 'abyssal-card-box', attr: { style: 'display: flex; justify-content: space-between; align-items: center;' } });
  plannerHeader.innerHTML = `
    <div>
      <span class="abyssal-section-title">MEU PLANNER • PLANEJAMENTO SEMANAL</span>
      <div style="font-size: 11px; font-family: monospace; color: var(--text-muted); margin-top: 2px;">Distribuição de matérias por dia da semana</div>
    </div>
    <button id="btn-add-planner-bloco" class="abyssal-btn-primary" style="font-size: 11px; padding: 4px 12px;">+ AGENDAR BLOCO</button>
  `;

  plannerHeader.querySelector('#btn-add-planner-bloco').onclick = () => abrirModalAgendarBloco();

  // Grid dos 7 Dias da Semana (Estilo Print 1)
  const weekGrid = container.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px;' }
  });

  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() + (i - now.getDay()) * 86400000);
    const dStr = `${d.getFullYear()}-${padTime(d.getMonth() + 1)}-${padTime(d.getDate())}`;
    const isHoje = dStr === todayStr;

    const blocosDoDia = (estadoAtual.planner && estadoAtual.planner[dStr]) ? estadoAtual.planner[dStr] : [];

    const colDia = weekGrid.createEl('div', {
      cls: 'abyssal-card-box',
      attr: {
        style: `display: flex; flex-direction: column; gap: 8px; min-height: 180px; ${isHoje ? 'border-color: var(--interactive-accent, #60a5fa); background: var(--background-secondary-alt);' : ''}`
      }
    });

    colDia.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 6px;">
        <span style="font-size: 12px; font-weight: 700; color: ${isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-normal)'}; text-transform: uppercase;">
          ${diasSemanaNomes[d.getDay()]}
        </span>
        <span style="font-size: 10.5px; font-family: monospace; color: var(--text-muted);">${padTime(d.getDate())}/${padTime(d.getMonth() + 1)}</span>
      </div>
      <div class="blocos-container" style="display: flex; flex-direction: column; gap: 6px; flex: 1;">
        ${blocosDoDia.length === 0 ? `
          <div style="font-size: 11px; font-family: monospace; color: var(--text-muted); opacity: 0.5; text-align: center; margin-top: 24px;">Livre</div>
        ` : blocosDoDia.map((b, bIdx) => `
          <div style="background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-left: 3px solid var(--interactive-accent, #60a5fa); border-radius: 4px; padding: 6px 8px; display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 700; color: var(--text-normal);">
              <span>${b.materia}</span>
              <button class="btn-del-bloco" data-dia="${dStr}" data-idx="${bIdx}" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 10px;">✕</button>
            </div>
            <span style="font-size: 10px; font-family: monospace; color: var(--text-muted);">${b.tempo || '1h'} • ${b.tipo || 'Estudo'}</span>
          </div>
        `).join('')}
      </div>
    `;

    colDia.querySelectorAll('.btn-del-bloco').forEach(btn => {
      btn.onclick = async () => {
        const dia = btn.dataset.dia;
        const idx = parseInt(btn.dataset.idx, 10);
        estadoAtual.planner[dia].splice(idx, 1);
        await salvarEstadoEstudos(estadoAtual);
        renderFrameworkEstudos();
      };
    });
  }

  // Modal para Agendar Bloco no Planner
  function abrirModalAgendarBloco() {
    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
    
    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 380px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';

    modalBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; font-weight: bold; color: #ffffff;">📅 Agendar Bloco de Estudo</span>
        <button id="modal-close-plan" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
      </div>

      <div>
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Data:</div>
        <input id="modal-plan-data" type="date" value="${todayStr}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>

      <div>
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Disciplina:</div>
        <select id="modal-plan-mat" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
          ${materias.map(m => `<option value="${m.title || m.file.name}">${m.title || m.file.name}</option>`).join('')}
        </select>
      </div>

      <div style="display: flex; gap: 8px;">
        <div style="flex: 1;">
          <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Duração Estimada:</div>
          <input id="modal-plan-tempo" type="text" value="1h30m" placeholder="Ex: 1h, 50m" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
        </div>
        <div style="flex: 1;">
          <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Modalidade:</div>
          <select id="modal-plan-tipo" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
            <option value="Teoria">Teoria</option>
            <option value="Questões">Questões</option>
            <option value="Revisão">Revisão</option>
          </select>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
        <button id="modal-cancel-plan" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
        <button id="modal-save-plan" class="abyssal-btn-primary" style="font-size: 11px;">Agendar</button>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });
    modalBox.querySelector('#modal-close-plan').onclick = fechar;
    modalBox.querySelector('#modal-cancel-plan').onclick = fechar;

    modalBox.querySelector('#modal-save-plan').onclick = async () => {
      const dataVal = modalBox.querySelector('#modal-plan-data').value;
      const matVal = modalBox.querySelector('#modal-plan-mat').value;
      const tempoVal = modalBox.querySelector('#modal-plan-tempo').value;
      const tipoVal = modalBox.querySelector('#modal-plan-tipo').value;

      if (!estadoAtual.planner[dataVal]) estadoAtual.planner[dataVal] = [];
      estadoAtual.planner[dataVal].push({ materia: matVal, tempo: tempoVal, tipo: tipoVal });

      await salvarEstadoEstudos(estadoAtual);
      new Notice(`📅 Bloco agendado para ${dataVal}!`);
      fechar();
      renderFrameworkEstudos();
    };
  }
}

// ---------------------------------------------------------------------------
// 6. VISÃO: REVISÕES ESPAÇADAS (ESTILO IMAGEM 2 DO ESTUDEI)
// ---------------------------------------------------------------------------
function renderAbaRevisoes() {
  const container = root.createEl('div', { cls: 'abyssal-card-box', attr: { style: 'display: flex; flex-direction: column; gap: 14px;' } });
  
  const revisoes = estadoAtual.revisoes || [];
  const revProgramadas = revisoes.filter(r => r.status === 'programada' && r.proximaRevisao >= todayStr);
  const revAtrasadas = revisoes.filter(r => r.status === 'programada' && r.proximaRevisao < todayStr);
  const revConcluidas = revisoes.filter(r => r.status === 'concluida');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <span class="abyssal-section-title">REVISÕES ESPAÇADAS • SAIBA O QUE REVISAR</span>
      <div style="display: flex; gap: 6px;">
        <button id="rev-tab-prog" class="abyssal-btn-mode ${revisaoFiltro === 'programadas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 8px;">
          📅 PROGRAMADAS (${revProgramadas.length})
        </button>
        <button id="rev-tab-atra" class="abyssal-btn-mode ${revisaoFiltro === 'atrasadas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 8px;">
          ⚠️ ATRASADAS (${revAtrasadas.length})
        </button>
        <button id="rev-tab-conc" class="abyssal-btn-mode ${revisaoFiltro === 'concluidas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 8px;">
          ✅ CONCLUÍDAS (${revConcluidas.length})
        </button>
      </div>
    </div>
  `;

  container.querySelector('#rev-tab-prog').onclick = () => { revisaoFiltro = 'programadas'; renderFrameworkEstudos(); };
  container.querySelector('#rev-tab-atra').onclick = () => { revisaoFiltro = 'atrasadas'; renderFrameworkEstudos(); };
  container.querySelector('#rev-tab-conc').onclick = () => { revisaoFiltro = 'concluidas'; renderFrameworkEstudos(); };

  const list = container.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 8px;' } });
  const listaExibir = revisaoFiltro === 'programadas' ? revProgramadas : (revisaoFiltro === 'atrasadas' ? revAtrasadas : revConcluidas);

  if (listaExibir.length === 0) {
    list.innerHTML = `
      <div style="font-size: 12px; font-family: monospace; color: var(--text-muted); text-align: center; padding: 30px 0;">
        ${revisaoFiltro === 'atrasadas' ? '🎉 Parabéns! Nenhuma revisão atrasada.' : 'Nenhuma revisão nesta aba. Registre novas sessões de estudo para alimentar a curva de esquecimento.'}
      </div>
    `;
    return;
  }

  listaExibir.forEach(rev => {
    const row = list.createEl('div', {
      attr: {
        style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;'
      }
    });

    const badgeIntervalo = `${rev.intervaloDias || 1} dia${rev.intervaloDias > 1 ? 's' : ''}`;
    row.innerHTML = `
      <div style="display: flex; align-items: center; gap: 10px;">
        <span style="font-size: 10.5px; font-family: monospace; padding: 2px 6px; border-radius: 4px; background: rgba(96, 165, 250, 0.15); color: #93c5fd; font-weight: bold;">
          ${rev.proximaRevisao === todayStr ? 'HOJE' : rev.proximaRevisao}
        </span>
        <span class="prio-badge prio-media" style="font-size: 10px;">${badgeIntervalo}</span>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 13px; font-weight: 700; color: var(--text-normal);">${rev.nome}</span>
          <span style="font-size: 10.5px; font-family: monospace; color: var(--text-muted);">${rev.tipo || 'Teoria + Questões'}</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        ${rev.status !== 'concluida' ? `
          <button class="abyssal-btn-action btn-rev-open" style="font-size: 10.5px; padding: 3px 8px;">Abrir Nota</button>
          <button class="abyssal-btn-primary btn-rev-done" style="font-size: 10.5px; padding: 3px 10px;">✓ Marcar Revisado</button>
        ` : `
          <span style="font-size: 11px; font-family: monospace; color: #86efac; font-weight: bold;">✓ Concluída</span>
        `}
      </div>
    `;

    const btnOpen = row.querySelector('.btn-rev-open');
    if (btnOpen) btnOpen.onclick = () => app.workspace.openLinkText(rev.materiaPath, "", false);

    const btnDone = row.querySelector('.btn-rev-done');
    if (btnDone) {
      btnDone.onclick = async () => {
        const proxMap = { 1: 7, 7: 14, 14: 30, 30: 30 };
        const novoIntervalo = proxMap[rev.intervaloDias || 1] || 7;
        
        if (rev.intervaloDias === 30) {
          rev.status = 'concluida';
        } else {
          const proxD = new Date(now.getTime() + novoIntervalo * 86400000);
          rev.proximaRevisao = `${proxD.getFullYear()}-${padTime(proxD.getMonth() + 1)}-${padTime(proxD.getDate())}`;
          rev.intervaloDias = novoIntervalo;
          rev.ultimaRevisao = todayStr;
        }

        await salvarEstadoEstudos(estadoAtual);
        new Notice(`🎉 Revisão concluída! Próxima em ${novoIntervalo} dias.`);
        renderFrameworkEstudos();
      };
    }
  });
}

// ---------------------------------------------------------------------------
// 7. VISÃO: CICLO DE ESTUDOS DINÂMICO
// ---------------------------------------------------------------------------
function renderAbaCicloEstudos() {
  const container = root.createEl('div', { cls: 'abyssal-card-box', attr: { style: 'display: flex; flex-direction: column; gap: 14px;' } });
  
  let currentIdx = estadoAtual.disciplinaAtualIdx || 0;
  if (currentIdx >= materias.length) currentIdx = 0;
  const materiaVez = materias[currentIdx];

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="abyssal-section-title">CICLO DE ESTUDOS ATIVO</span>
      <span style="font-size: 11.5px; font-family: monospace; color: var(--text-muted);">${materias.length} matérias no ciclo</span>
    </div>
  `;

  if (materiaVez) {
    const vez = container.createEl('div', {
      attr: {
        style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 4px solid var(--interactive-accent, #60a5fa); border-radius: 8px; padding: 14px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;'
      }
    });

    vez.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 3px;">
        <span style="font-size: 10.5px; font-family: monospace; font-weight: 700; color: var(--interactive-accent, #60a5fa); text-transform: uppercase;">
          ▶ MATÉRIA DA VEZ NO CICLO (${currentIdx + 1}/${materias.length})
        </span>
        <span style="font-size: 16px; font-weight: 700; color: var(--text-normal);">${materiaVez.title || materiaVez.file.name}</span>
        <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">${materiaVez.disciplina || 'Geral'} • Status: ${materiaVez.status || 'Em Andamento'}</span>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <button id="btn-ciclo-open" class="abyssal-btn-action" style="font-size: 11.5px; padding: 5px 12px;">📖 Abrir Nota</button>
        <button id="btn-ciclo-reg" class="abyssal-btn-action" style="font-size: 11.5px; padding: 5px 12px;">+ Registrar Foco</button>
        <button id="btn-ciclo-next" class="abyssal-btn-primary" style="font-size: 11.5px; padding: 5px 14px;">✓ Concluir & Avançar</button>
      </div>
    `;

    vez.querySelector('#btn-ciclo-open').onclick = () => app.workspace.openLinkText(materiaVez.file.path, "", false);
    vez.querySelector('#btn-ciclo-reg').onclick = () => abrirModalSessao(materiaVez);
    vez.querySelector('#btn-ciclo-next').onclick = async () => {
      const prox = (currentIdx + 1) % materias.length;
      estadoAtual.disciplinaAtualIdx = prox;
      await salvarEstadoEstudos(estadoAtual);
      new Notice(`🎉 Ciclo avançado! Próxima: ${materias[prox].title || materias[prox].file.name}`);
      renderFrameworkEstudos();
    };

    // Trilha
    const trilha = container.createEl('div', {
      attr: { style: 'display: flex; align-items: center; gap: 6px; overflow-x: auto; padding-bottom: 2px;' }
    });

    materias.forEach((m, idx) => {
      const isAtual = idx === currentIdx;
      const pill = trilha.createEl('div', {
        cls: `abyssal-nav-pill ${isAtual ? 'active' : ''}`,
        attr: { style: `font-size: 11px; padding: 4px 10px; cursor: pointer; flex-shrink: 0; ${isAtual ? 'border-color: var(--interactive-accent, #60a5fa); font-weight: bold;' : 'opacity: 0.7;'}` },
        text: `${idx + 1}. ${m.title || m.file.name}`
      });
      pill.onclick = async () => {
        estadoAtual.disciplinaAtualIdx = idx;
        await salvarEstadoEstudos(estadoAtual);
        renderFrameworkEstudos();
      };
    });
  }
}

renderFrameworkEstudos();
