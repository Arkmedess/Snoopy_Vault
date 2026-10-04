/**
 * Snoopy Vault - Subdashboard Especializado de Estudos
 * Framework Completo inspirado na plataforma Estudei (estudei.com.br):
 * - Metas semanais de estudo (horas e questões) e contagem regressiva
 * - Gráfico semanal interativo com alternância entre [ TEMPO ] e [ QUESTÕES ]
 * - Ciclo de estudos dinâmico com vinculação direta ao Pomodoro
 * - Central de revisões espaçadas programadas (1d, 7d, 14d, 30d) com abas
 * - Catálogo analítico de disciplinas com taxas de assertividade
 */

const root = dv.container.createEl('div', { cls: 'abyssal-container' });
const now = new Date();
const padTime = (n) => String(n).padStart(2, '0');
const todayStr = `${now.getFullYear()}-${padTime(now.getMonth() + 1)}-${padTime(now.getDate())}`;

// ---------------------------------------------------------------------------
// 1. GERENCIAMENTO DE ESTADO E PERSISTÊNCIA (CICLO & METAS)
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
  revisoes: []
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
let graficoModo = 'tempo'; // 'tempo' | 'questoes'
let revisaoAba = 'programadas'; // 'programadas' | 'atrasadas' | 'concluidas'

// ---------------------------------------------------------------------------
// 2. CABEÇALHO SUPERIOR (COM CONTAGEM REGRESSIVA)
// ---------------------------------------------------------------------------
const headerBox = root.createEl('div', {
  attr: { 
    style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; padding: 12px 18px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 10px; flex-wrap: wrap; gap: 14px;' 
  }
});

function calcularDiasRestantes(dataStr) {
  if (!dataStr) return null;
  const target = new Date(dataStr + 'T00:00:00');
  const hoje = new Date(todayStr + 'T00:00:00');
  const diffTime = target - hoje;
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  return diffDays;
}

function renderHeader() {
  const diasRestantes = calcularDiasRestantes(estadoAtual.dataMetaProva);
  headerBox.innerHTML = `
    <div style="display: flex; align-items: center; gap: 14px; flex-wrap: wrap;">
      <button id="btn-voltar-home" class="abyssal-btn-action" style="font-size: 11px; padding: 4px 10px;" title="Retornar ao Dashboard Central">← HOME</button>
      <div>
        <div style="font-size: 15px; font-weight: 700; color: var(--text-normal); text-transform: uppercase; letter-spacing: 0.05em; display: flex; align-items: center; gap: 8px;">
          <span>📚</span> PAINEL DE ESTUDOS • FRAMEWORK ESTUDEI
        </div>
        <div style="font-size: 11px; font-family: monospace; color: var(--text-muted);">Ciclo de Rotação • Métricas Semanais • Revisões Espaçadas</div>
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
      ${diasRestantes !== null ? `
        <div style="display: flex; align-items: center; gap: 6px; padding: 4px 10px; border-radius: 6px; background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); font-family: monospace; font-size: 11px;">
          <span style="color: var(--text-muted);">${estadoAtual.nomeMetaProva || 'Prova'}:</span>
          <span style="color: ${diasRestantes > 15 ? 'var(--text-normal)' : '#fca5a5'}; font-weight: bold;">
            ${diasRestantes >= 0 ? `${diasRestantes} dias restantes` : 'Data concluída'}
          </span>
        </div>
      ` : ''}
      <button id="btn-ajustar-metas" class="abyssal-btn-action" style="font-size: 11px; padding: 4px 9px;" title="Ajustar metas semanais e data de prova">⚙️ METAS</button>
      <button id="btn-add-sessao" class="abyssal-btn-primary" style="font-size: 11px; padding: 4px 12px;" title="Registrar sessão de estudo">+ REGISTRAR SESSÃO</button>
      <button id="btn-add-disciplina" class="abyssal-btn-action" style="font-size: 11px; padding: 4px 10px;" title="Cadastrar nova disciplina">+ DISCIPLINA</button>
    </div>
  `;

  const btnVoltarHome = headerBox.querySelector('#btn-voltar-home');
  if (btnVoltarHome) {
    btnVoltarHome.addEventListener('click', () => {
      app.workspace.openLinkText("00_Home/Home.md", "", false);
    });
  }

  const btnMetas = headerBox.querySelector('#btn-ajustar-metas');
  if (btnMetas) btnMetas.addEventListener('click', abrirModalMetas);

  const btnSessao = headerBox.querySelector('#btn-add-sessao');
  if (btnSessao) btnSessao.addEventListener('click', abrirModalSessao);

  const btnDisc = headerBox.querySelector('#btn-add-disciplina');
  if (btnDisc) btnDisc.addEventListener('click', abrirModalDisciplina);
}

// ---------------------------------------------------------------------------
// 3. MODAIS: REGISTRAR SESSÃO, METAS E NOVA DISCIPLINA
// ---------------------------------------------------------------------------

// Modal de Metas Semanais & Prova
function abrirModalMetas() {
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 400px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';
  
  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 14px; font-weight: bold; color: #ffffff;">⚙️ Metas de Estudo & Alvo</span>
      <button id="modal-close-metas" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
    </div>
    
    <div style="display: flex; gap: 8px;">
      <div style="flex: 1;">
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Meta Horas/Semana:</div>
        <input id="modal-meta-horas" type="number" min="1" value="${estadoAtual.metaHorasSemanal || 20}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>
      <div style="flex: 1;">
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Meta Questões/Semana:</div>
        <input id="modal-meta-quest" type="number" min="1" value="${estadoAtual.metaQuestoesSemanal || 150}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>
    </div>

    <div>
      <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Nome da Prova / Concurso (Opcional):</div>
      <input id="modal-meta-nome" type="text" value="${estadoAtual.nomeMetaProva || ''}" placeholder="Ex: PRF, Concurso TI, Exame OAB" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
    </div>

    <div>
      <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Data da Prova (Contagem Regressiva):</div>
      <input id="modal-meta-data" type="date" value="${estadoAtual.dataMetaProva || ''}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
      <button id="modal-cancel-metas" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
      <button id="modal-save-metas" class="abyssal-btn-primary" style="font-size: 11px;">Salvar Metas</button>
    </div>
  `;

  modalBg.appendChild(modalBox);
  document.body.appendChild(modalBg);

  const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
  modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });
  modalBox.querySelector('#modal-close-metas').onclick = fechar;
  modalBox.querySelector('#modal-cancel-metas').onclick = fechar;

  modalBox.querySelector('#modal-save-metas').onclick = async () => {
    const h = parseInt(modalBox.querySelector('#modal-meta-horas').value, 10) || 20;
    const q = parseInt(modalBox.querySelector('#modal-meta-quest').value, 10) || 150;
    const nome = modalBox.querySelector('#modal-meta-nome').value.trim();
    const data = modalBox.querySelector('#modal-meta-data').value;

    estadoAtual.metaHorasSemanal = h;
    estadoAtual.metaQuestoesSemanal = q;
    estadoAtual.nomeMetaProva = nome;
    estadoAtual.dataMetaProva = data;

    await salvarEstadoEstudos(estadoAtual);
    new Notice('⚙️ Metas atualizadas com sucesso!');
    fechar();
    renderHeader();
    renderFrameworkCompleto();
  };
}

// Modal de Registro de Sessão (Tempo + Questões + Agendamento de Revisão)
function abrirModalSessao(disciplinaPreSelecionada = null) {
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 440px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';

  const materias = dv.pages('"03_Estudos"')
    .where(p => p.file && !p.file.name.includes("Template") && !p.file.name.includes("Painel"));

  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 14px; font-weight: bold; color: #ffffff;">⏱️ Registro de Estudo & Questões</span>
      <button id="modal-close-sess" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
    </div>

    <div>
      <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Disciplina:</div>
      <select id="modal-sess-mat" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
        ${[...materias].map(m => `
          <option value="${m.file.path}" ${disciplinaPreSelecionada && disciplinaPreSelecionada.file.path === m.file.path ? 'selected' : ''}>
            ${m.title || m.file.name}
          </option>
        `).join('')}
      </select>
    </div>

    <div style="display: flex; gap: 8px;">
      <div style="flex: 1;">
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Tempo Estudado (minutos):</div>
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
        Programar Revisão Espaçada inicial (daqui a 1 dia)
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

    // 1. Atualiza histórico diário
    if (!estadoAtual.historicoDiario[todayStr]) {
      estadoAtual.historicoDiario[todayStr] = { minutosFoco: 0, questoesFeitas: 0, questoesAcertos: 0 };
    }
    estadoAtual.historicoDiario[todayStr].minutosFoco += minutos;
    estadoAtual.historicoDiario[todayStr].questoesFeitas += feitas;
    estadoAtual.historicoDiario[todayStr].questoesAcertos += acertos;

    // 2. Se agendar revisão espaçada
    if (agendarRev && file) {
      const amanha = new Date(now.getTime() + 86400000);
      const amanhaStr = `${amanha.getFullYear()}-${padTime(amanha.getMonth() + 1)}-${padTime(amanha.getDate())}`;
      
      // Remove revisão anterior da mesma matéria para reprogramar
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

    // 3. Atualiza nota da matéria
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

      const registro = `\n- 📅 ${todayStr}: ${minutos}m de foco • ${feitas > 0 ? `${acertos}/${feitas} questões (${Math.round((acertos/feitas)*100)}%)` : tipo}`;
      if (updated.includes('## Histórico de Estudos')) {
        updated = updated.replace('## Histórico de Estudos', `## Histórico de Estudos${registro}`);
      } else {
        updated += `\n\n## Histórico de Estudos${registro}\n`;
      }
      await app.vault.modify(file, updated);
    }

    new Notice(`🎉 Sessão registrada: ${minutos}m focados em ${nomeMateria}!`);
    fechar();
    renderFrameworkCompleto();
  };
}

// Modal de Nova Disciplina
function abrirModalDisciplina() {
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 400px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';
  
  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 14px; font-weight: bold; color: #ffffff;">📚 Nova Disciplina</span>
      <button id="modal-close-d" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
    </div>
    <div style="font-size: 11px; font-family: monospace; color: #a1a1aa;">Nome da matéria:</div>
    <input id="modal-d-nome" type="text" placeholder="Ex: Direito Constitucional, Algoritmos..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;">
    
    <div>
      <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Área / Módulo:</div>
      <input id="modal-d-area" type="text" placeholder="Ex: Tecnologia, Jurídica" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
      <button id="modal-cancel-d" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
      <button id="modal-save-d" class="abyssal-btn-primary" style="font-size: 11px;">Cadastrar</button>
    </div>
  `;

  modalBg.appendChild(modalBox);
  document.body.appendChild(modalBg);

  const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
  modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });
  modalBox.querySelector('#modal-close-d').onclick = fechar;
  modalBox.querySelector('#modal-cancel-d').onclick = fechar;

  modalBox.querySelector('#modal-save-d').onclick = async () => {
    const nome = modalBox.querySelector('#modal-d-nome').value.trim();
    const area = modalBox.querySelector('#modal-d-area').value.trim() || 'Geral';
    if (nome) {
      const path = `03_Estudos/${nome}.md`;
      const tpl = app.vault.getAbstractFileByPath("99_Meta/Templates/Template - Estudo.md");
      let content = "";
      if (tpl) {
        const raw = await app.vault.read(tpl);
        content = raw.replace(/{{title}}/g, nome).replace(/{{date}}/g, todayStr);
      } else {
        content = `---\ntitle: "${nome}"\ndisciplina: "${area}"\ndata: ${todayStr}\nstatus: "Em Andamento"\ntags: [estudo]\n---\n\n# 📚 ${nome}\n\n`;
      }
      await app.vault.create(path, content);
      new Notice(`📚 Disciplina "${nome}" cadastrada!`);
      fechar();
      renderFrameworkCompleto();
    }
  };
}

// ---------------------------------------------------------------------------
// 4. CONTAINER PRINCIPAL E RENDERIZAÇÃO
// ---------------------------------------------------------------------------
const mainContainer = root.createEl('div', {
  attr: { style: 'display: flex; flex-direction: column; gap: 20px;' }
});

async function renderFrameworkCompleto() {
  mainContainer.innerHTML = '';

  const rawPages = dv.pages('"03_Estudos"')
    .where(p => p.file && !p.file.name.includes("Template") && !p.file.name.includes("Painel"));
  const materias = [...rawPages];

  // =========================================================================
  // FAIXA 1: METAS DA SEMANA & RESUMO CONSOLIDADO (IMAGEM 1 DO ESTUDEI)
  // =========================================================================
  const ultimos7Dias = [];
  const diasSemanaNomes = ['DOM', 'SEG', 'TER', 'QUA', 'QUI', 'SEX', 'SÁB'];
  let totalMinutosSemana = 0;
  let totalQuestoesSemana = 0;
  let totalAcertosSemana = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dStr = `${d.getFullYear()}-${padTime(d.getMonth() + 1)}-${padTime(d.getDate())}`;
    const diaReg = estadoAtual.historicoDiario[dStr] || { minutosFoco: 0, questoesFeitas: 0, questoesAcertos: 0 };
    totalMinutosSemana += diaReg.minutosFoco;
    totalQuestoesSemana += diaReg.questoesFeitas;
    totalAcertosSemana += diaReg.questoesAcertos;

    ultimos7Dias.push({
      dataStr: dStr,
      labelDia: diasSemanaNomes[d.getDay()],
      isHoje: dStr === todayStr,
      minutos: diaReg.minutosFoco,
      questoes: diaReg.questoesFeitas,
      acertos: diaReg.questoesAcertos
    });
  }

  const horasSemana = (totalMinutosSemana / 60).toFixed(1);
  const metaHoras = estadoAtual.metaHorasSemanal || 20;
  const pctHoras = Math.min(100, Math.round(((totalMinutosSemana / 60) / metaHoras) * 100));

  const metaQuestoes = estadoAtual.metaQuestoesSemanal || 150;
  const pctQuestoes = Math.min(100, Math.round((totalQuestoesSemana / metaQuestoes) * 100));
  const pctAcertosSemana = totalQuestoesSemana > 0 ? Math.round((totalAcertosSemana / totalQuestoesSemana) * 100) : 0;

  // Grid Superior 50/50: Metas Semanais à Esquerda + Gráfico Semanal à Direita
  const topMetricsGrid = mainContainer.createEl('div', {
    cls: 'abyssal-showcase-grid',
    attr: { style: 'margin-bottom: 0;' }
  });

  // CARD 1: METAS DA SEMANA
  const metasBox = topMetricsGrid.createEl('div', { cls: 'abyssal-card-box', attr: { style: 'display: flex; flex-direction: column; gap: 14px;' } });
  metasBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="abyssal-section-title">METAS DE ESTUDO DA SEMANA</span>
      <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">${horasSemana}h / ${metaHoras}h</span>
    </div>

    <!-- Barra de Horas de Estudo -->
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-family: monospace;">
        <span style="color: var(--text-normal);">⏱️ Horas de Estudo Líquidas</span>
        <span style="font-weight: bold; color: ${pctHoras >= 100 ? '#86efac' : 'var(--text-normal)'};">${horasSemana}h / ${metaHoras}h (${pctHoras}%)</span>
      </div>
      <div class="abyssal-prog-track" style="height: 6px; width: 100%;">
        <div class="abyssal-prog-fill" style="width: ${pctHoras}%; background: ${pctHoras >= 100 ? '#86efac' : 'var(--text-normal)'};"></div>
      </div>
    </div>

    <!-- Barra de Questões Resolvidas -->
    <div style="display: flex; flex-direction: column; gap: 4px;">
      <div style="display: flex; justify-content: space-between; font-size: 11.5px; font-family: monospace;">
        <span style="color: var(--text-normal);">🎯 Questões Resolvidas</span>
        <span style="font-weight: bold; color: ${pctQuestoes >= 100 ? '#86efac' : 'var(--text-normal)'};">${totalQuestoesSemana} / ${metaQuestoes} (${pctQuestoes}%)</span>
      </div>
      <div class="abyssal-prog-track" style="height: 6px; width: 100%;">
        <div class="abyssal-prog-fill" style="width: ${pctQuestoes}%; background: ${pctQuestoes >= 100 ? '#86efac' : 'var(--interactive-accent, #60a5fa)'};"></div>
      </div>
    </div>

    <!-- Mini KPI de Assertividade Semanal -->
    <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 8px; border-top: 1px solid var(--background-modifier-border); font-size: 11.5px; font-family: monospace; color: var(--text-muted);">
      <span>Taxa de Acertos na Semana:</span>
      <span style="font-weight: bold; color: ${pctAcertosSemana >= 75 ? '#86efac' : 'var(--text-normal)'};">${pctAcertosSemana}% (${totalAcertosSemana}/${totalQuestoesSemana})</span>
    </div>
  `;

  // CARD 2: GRÁFICO SEMANAL (TEMPO vs QUESTÕES)
  const chartBox = topMetricsGrid.createEl('div', { cls: 'abyssal-card-box', attr: { style: 'display: flex; flex-direction: column; gap: 12px;' } });
  
  const chartHeader = chartBox.createEl('div', {
    attr: { style: 'display: flex; justify-content: space-between; align-items: center;' }
  });
  chartHeader.innerHTML = `
    <span class="abyssal-section-title">RESUMO SEMANAL</span>
    <div style="display: flex; gap: 4px;">
      <button id="btn-chart-tempo" class="abyssal-btn-mode ${graficoModo === 'tempo' ? 'active' : ''}" style="font-size: 10.5px; padding: 2px 7px;">TEMPO</button>
      <button id="btn-chart-quest" class="abyssal-btn-mode ${graficoModo === 'questoes' ? 'active' : ''}" style="font-size: 10.5px; padding: 2px 7px;">QUESTÕES</button>
    </div>
  `;

  chartHeader.querySelector('#btn-chart-tempo').onclick = () => {
    graficoModo = 'tempo';
    renderFrameworkCompleto();
  };
  chartHeader.querySelector('#btn-chart-quest').onclick = () => {
    graficoModo = 'questoes';
    renderFrameworkCompleto();
  };

  // Renderização das Barras do Gráfico Semanal (Estilo Imagem 1 Estudei)
  const chartPlot = chartBox.createEl('div', {
    attr: { style: 'display: flex; align-items: flex-end; justify-content: space-between; gap: 8px; height: 110px; padding-top: 16px; border-bottom: 1px solid var(--background-modifier-border);' }
  });

  const maxVal = graficoModo === 'tempo' 
    ? Math.max(120, ...ultimos7Dias.map(d => d.minutos))
    : Math.max(30, ...ultimos7Dias.map(d => d.questoes));

  ultimos7Dias.forEach(dia => {
    const val = graficoModo === 'tempo' ? dia.minutos : dia.questoes;
    const pctBar = maxVal > 0 ? Math.max(8, Math.round((val / maxVal) * 100)) : 8;
    const colLabel = graficoModo === 'tempo' 
      ? (val >= 60 ? `${(val/60).toFixed(1)}h` : `${val}m`)
      : `${val}q`;

    const colEl = chartPlot.createEl('div', {
      attr: { style: 'flex: 1; display: flex; flex-direction: column; align-items: center; height: 100%; justify-content: flex-end; gap: 4px;' }
    });

    if (val > 0) {
      colEl.createEl('span', {
        text: colLabel,
        attr: { style: 'font-size: 9.5px; font-family: monospace; color: var(--text-muted);' }
      });
    }

    const barEl = colEl.createEl('div', {
      attr: { 
        style: `width: 100%; max-width: 28px; height: ${val > 0 ? pctBar : 4}%; background: ${dia.isHoje ? 'var(--interactive-accent, #60a5fa)' : (val > 0 ? 'var(--text-normal)' : 'rgba(255,255,255,0.06)')}; border-radius: 4px 4px 0 0; transition: height 0.2s ease;` 
      }
    });

    colEl.createEl('span', {
      text: dia.labelDia,
      attr: { style: `font-size: 10px; font-family: monospace; margin-top: 4px; ${dia.isHoje ? 'color: var(--interactive-accent, #60a5fa); font-weight: bold;' : 'color: var(--text-muted);'}` }
    });
  });

  const chartFooter = chartBox.createEl('div', {
    attr: { style: 'display: flex; justify-content: space-between; font-size: 11px; font-family: monospace; color: var(--text-muted);' }
  });
  chartFooter.innerHTML = `
    <span>Total Estudado: <strong>${Math.floor(totalMinutosSemana/60)}h ${totalMinutosSemana%60}min</strong></span>
    <span>Total de Questões: <strong>${totalQuestoesSemana}</strong></span>
  `;

  // =========================================================================
  // FAIXA 2: CICLO DE ROTAÇÃO ATIVO (COM VÍNCULO AO POMODORO)
  // =========================================================================
  const cicloBox = mainContainer.createEl('div', { cls: 'abyssal-card-box', attr: { style: 'display: flex; flex-direction: column; gap: 12px;' } });
  
  let currentIdx = estadoAtual.disciplinaAtualIdx || 0;
  if (currentIdx >= materias.length) currentIdx = 0;
  const materiaVez = materias[currentIdx];

  cicloBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="abyssal-section-title">CICLO DE ESTUDOS DINÂMICO</span>
      <span style="font-size: 11.5px; font-family: monospace; color: var(--text-muted);">${materias.length} matérias na rotação</span>
    </div>
  `;

  if (materiaVez) {
    const vezBox = cicloBox.createEl('div', {
      attr: {
        style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 4px solid var(--interactive-accent, #60a5fa); border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;'
      }
    });

    vezBox.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 3px;">
        <span style="font-size: 10.5px; font-family: monospace; font-weight: 700; color: var(--interactive-accent, #60a5fa); text-transform: uppercase;">
          ▶ MATÉRIA DA VEZ NO CICLO (${currentIdx + 1}/${materias.length})
        </span>
        <span style="font-size: 16px; font-weight: 700; color: var(--text-normal);">${materiaVez.title || materiaVez.file.name}</span>
        <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">${materiaVez.disciplina || 'Geral'} • Status: ${materiaVez.status || 'Em Andamento'}</span>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        <button id="btn-iniciar-foco" class="abyssal-btn-action" style="font-size: 11.5px; padding: 5px 12px;">🍅 Estudar no Pomodoro</button>
        <button id="btn-registrar-mat" class="abyssal-btn-action" style="font-size: 11.5px; padding: 5px 12px;">+ Registrar Sessão</button>
        <button id="btn-concluir-ciclo" class="abyssal-btn-primary" style="font-size: 11.5px; padding: 5px 14px;">✓ Concluir & Avançar</button>
      </div>
    `;

    vezBox.querySelector('#btn-iniciar-foco').onclick = () => {
      // Abre a nota da matéria e convida a iniciar foco
      app.workspace.openLinkText(materiaVez.file.path, "", false);
      new Notice(`🍅 Foco engatilhado para: ${materiaVez.title || materiaVez.file.name}`);
    };

    vezBox.querySelector('#btn-registrar-mat').onclick = () => {
      abrirModalSessao(materiaVez);
    };

    vezBox.querySelector('#btn-concluir-ciclo').onclick = async () => {
      const proximoIdx = (currentIdx + 1) % materias.length;
      estadoAtual.disciplinaAtualIdx = proximoIdx;
      await salvarEstadoEstudos(estadoAtual);
      new Notice(`🎉 Matéria avançada! Próxima: ${materias[proximoIdx].title || materias[proximoIdx].file.name}`);
      renderFrameworkCompleto();
    };

    // Trilha Sequencial
    const trilhaRow = cicloBox.createEl('div', {
      attr: { style: 'display: flex; align-items: center; gap: 6px; overflow-x: auto; padding-bottom: 2px;' }
    });

    materias.forEach((m, idx) => {
      const isAtual = idx === currentIdx;
      const pill = trilhaRow.createEl('div', {
        cls: `abyssal-nav-pill ${isAtual ? 'active' : ''}`,
        attr: { style: `font-size: 11px; padding: 4px 10px; cursor: pointer; flex-shrink: 0; ${isAtual ? 'border-color: var(--interactive-accent, #60a5fa); font-weight: bold;' : 'opacity: 0.7;'}` },
        text: `${idx + 1}. ${m.title || m.file.name}`
      });
      pill.onclick = async () => {
        estadoAtual.disciplinaAtualIdx = idx;
        await salvarEstadoEstudos(estadoAtual);
        renderFrameworkCompleto();
      };
    });
  }

  // =========================================================================
  // FAIXA 3: CENTRAL DE REVISÕES ESPAÇADAS (IMAGEM 2 DO ESTUDEI)
  // =========================================================================
  const revBox = mainContainer.createEl('div', { cls: 'abyssal-card-box', attr: { style: 'display: flex; flex-direction: column; gap: 14px;' } });
  
  // Categorização das revisões
  const revisoes = estadoAtual.revisoes || [];
  const revProgramadas = revisoes.filter(r => r.status === 'programada' && r.proximaRevisao >= todayStr);
  const revAtrasadas = revisoes.filter(r => r.status === 'programada' && r.proximaRevisao < todayStr);
  const revConcluidas = revisoes.filter(r => r.status === 'concluida');

  revBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <span class="abyssal-section-title">REVISÕES ESPAÇADAS • SAIBA O QUE REVISAR</span>
      <div style="display: flex; gap: 6px;">
        <button id="rev-tab-prog" class="abyssal-btn-mode ${revisaoAba === 'programadas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 8px;">
          📅 PROGRAMADAS (${revProgramadas.length})
        </button>
        <button id="rev-tab-atra" class="abyssal-btn-mode ${revisaoAba === 'atrasadas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 8px;">
          ⚠️ ATRASADAS (${revAtrasadas.length})
        </button>
        <button id="rev-tab-conc" class="abyssal-btn-mode ${revisaoAba === 'concluidas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 8px;">
          ✅ CONCLUÍDAS (${revConcluidas.length})
        </button>
      </div>
    </div>
  `;

  revBox.querySelector('#rev-tab-prog').onclick = () => { revisaoAba = 'programadas'; renderFrameworkCompleto(); };
  revBox.querySelector('#rev-tab-atra').onclick = () => { revisaoAba = 'atrasadas'; renderFrameworkCompleto(); };
  revBox.querySelector('#rev-tab-conc').onclick = () => { revisaoAba = 'concluidas'; renderFrameworkCompleto(); };

  const revList = revBox.createEl('div', {
    attr: { style: 'display: flex; flex-direction: column; gap: 8px;' }
  });

  const listaExibir = revisaoAba === 'programadas' ? revProgramadas : (revisaoAba === 'atrasadas' ? revAtrasadas : revConcluidas);

  if (listaExibir.length === 0) {
    revList.innerHTML = `
      <div style="font-size: 12px; font-family: monospace; color: var(--text-muted); text-align: center; padding: 24px 0;">
        ${revisaoAba === 'atrasadas' ? '🎉 Parabéns! Nenhuma revisão atrasada.' : 'Nenhuma revisão nesta aba. Registre sessões de estudo para alimentar a repetição espaçada.'}
      </div>
    `;
  } else {
    // Agrupamento por prazo
    listaExibir.forEach(rev => {
      const itemRow = revList.createEl('div', {
        attr: {
          style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 10px 14px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;'
        }
      });

      const isAtrasada = rev.proximaRevisao < todayStr;
      const badgeIntervalo = `${rev.intervaloDias || 1} dia${rev.intervaloDias > 1 ? 's' : ''}`;

      itemRow.innerHTML = `
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
            <button class="abyssal-btn-action btn-abrir-rev" style="font-size: 10.5px; padding: 3px 8px;">Abrir Nota</button>
            <button class="abyssal-btn-primary btn-concluir-rev" style="font-size: 10.5px; padding: 3px 10px;">✓ Marcar Revisado</button>
          ` : `
            <span style="font-size: 11px; font-family: monospace; color: #86efac; font-weight: bold;">✓ Concluída</span>
          `}
        </div>
      `;

      const btnAbrir = itemRow.querySelector('.btn-abrir-rev');
      if (btnAbrir) {
        btnAbrir.onclick = () => app.workspace.openLinkText(rev.materiaPath, "", false);
      }

      const btnConcluir = itemRow.querySelector('.btn-concluir-rev');
      if (btnConcluir) {
        btnConcluir.onclick = async () => {
          // Progressão espaçada: 1d -> 7d -> 14d -> 30d
          const proxIntervaloMap = { 1: 7, 7: 14, 14: 30, 30: 30 };
          const novoIntervalo = proxIntervaloMap[rev.intervaloDias || 1] || 7;
          
          if (rev.intervaloDias === 30) {
            rev.status = 'concluida';
          } else {
            const proxData = new Date(now.getTime() + novoIntervalo * 86400000);
            rev.proximaRevisao = `${proxData.getFullYear()}-${padTime(proxData.getMonth() + 1)}-${padTime(proxData.getDate())}`;
            rev.intervaloDias = novoIntervalo;
            rev.ultimaRevisao = todayStr;
          }

          await salvarEstadoEstudos(estadoAtual);
          new Notice(`🎉 Revisão concluída! Próxima marcada para daqui a ${novoIntervalo} dias.`);
          renderFrameworkCompleto();
        };
      }
    });
  }

  // =========================================================================
  // FAIXA 4: DESEMPENHO POR DISCIPLINA (GRADE COMPLETA)
  // =========================================================================
  const gridSection = mainContainer.createEl('div');
  gridSection.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <span class="abyssal-section-title">DISCIPLINAS CADASTRADAS</span>
      <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">Assertividade & Flashcards</span>
    </div>
  `;

  const cardsGrid = gridSection.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 14px;' }
  });

  for (const m of materias) {
    const card = cardsGrid.createEl('div', { cls: 'abyssal-kanban-card', attr: { style: 'cursor: default; padding: 12px 14px;' } });
    
    let totalFlashcards = 0;
    try {
      const fFile = app.vault.getAbstractFileByPath(m.file.path);
      if (fFile) {
        const raw = await app.vault.read(fFile);
        const matches = raw.match(/::/g);
        if (matches) totalFlashcards = matches.length;
      }
    } catch(e) {}

    const tasks = m.file.tasks;
    const totalTasks = tasks.length;
    const completedTasks = tasks.where(t => t.completed).length;

    const feitas = Number(m.questoes_feitas) || 0;
    const acertos = Number(m.questoes_acertos) || 0;
    const pctAcertos = feitas > 0 ? Math.round((acertos / feitas) * 100) : null;

    card.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 8px;">
        <div style="display: flex; flex-direction: column; gap: 2px;">
          <span style="font-size: 13.5px; font-weight: 700; color: var(--text-normal);">${m.title || m.file.name}</span>
          <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">${m.disciplina || 'Geral'}</span>
        </div>
        <span class="prio-badge prio-media" style="font-size: 10px;">${m.status || 'Ativo'}</span>
      </div>

      <div style="margin-bottom: 8px; padding: 8px; background: var(--background-secondary-alt); border-radius: 6px; border: 1px solid var(--background-modifier-border);">
        ${feitas > 0 ? `
          <div style="display: flex; justify-content: space-between; font-size: 11px; font-family: monospace; margin-bottom: 4px;">
            <span style="color: var(--text-muted);">🎯 Questões: ${acertos}/${feitas}</span>
            <span style="font-weight: bold; color: ${pctAcertos >= 75 ? '#86efac' : 'var(--text-normal)'};">${pctAcertos}%</span>
          </div>
          <div class="abyssal-prog-track" style="height: 4px; width: 100%;">
            <div class="abyssal-prog-fill" style="width: ${pctAcertos}%; background: ${pctAcertos >= 75 ? '#86efac' : 'var(--text-normal)'};"></div>
          </div>
        ` : `
          <div style="font-size: 11px; font-family: monospace; color: var(--text-muted);">
            🎯 Questões: Nenhuma registrada
          </div>
        `}
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; padding-top: 6px; border-top: 1px solid var(--background-modifier-border); font-size: 11px; font-family: monospace;">
        <span style="color: var(--text-muted);">📋 ${completedTasks}/${totalTasks} tarefas • 🧠 ${totalFlashcards} cards</span>
        <a class="abyssal-todo-source btn-card-open" style="font-size: 10.5px; padding: 1px 6px;">Abrir →</a>
      </div>
    `;

    const btnOpen = card.querySelector('.btn-card-open');
    if (btnOpen) {
      btnOpen.onclick = (e) => {
        e.preventDefault();
        e.stopPropagation();
        app.workspace.openLinkText(m.file.path, "", false);
      };
    }
  }
}

renderHeader();
await renderFrameworkCompleto();
