/**
 * Snoopy Vault - Subdashboard Especializado de Estudos
 * Framework Analítico Completo (Inspirado no Estudei):
 * - Painel de Controle Unificado: Donut Real, Gráfico de 7 Dias Real, KPIs Limpos e Radar Integrado (Ciclo + Revisões)
 * - Tabela Analítica com layout fluido, alinhamento vertical perfeito, chips de PDFs e Menu de Edição Rápida (⋮)
 * - Meu Planner: Calendário Mensal Completo (7 colunas alinhadas, navegação mensal e clique direto no dia)
 * - Popups de facilitação para editar categorias, subtópicos, provas e métricas sem tocar no frontmatter
 */

const root = dv.container.createEl('div', { 
  cls: 'abyssal-container',
  attr: { style: 'width: 100%; max-width: 100%; color: var(--text-normal); font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Inter, var(--font-interface);' }
});

const now = new Date();
const padTime = (n) => String(n).padStart(2, '0');
const todayStr = `${now.getFullYear()}-${padTime(now.getMonth() + 1)}-${padTime(now.getDate())}`;

function formatarDataBR(dStr) {
  if (!dStr) return '';
  const matchIso = String(dStr).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (matchIso) {
    return `${matchIso[3].padStart(2, '0')}-${matchIso[2].padStart(2, '0')}-${matchIso[1]}`;
  }
  const matchBr = String(dStr).match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);
  if (matchBr) {
    return `${matchBr[1].padStart(2, '0')}-${matchBr[2].padStart(2, '0')}-${matchBr[3]}`;
  }
  return String(dStr);
}

// ---------------------------------------------------------------------------
// 1. ESTADO E PERSISTÊNCIA REAL
// ---------------------------------------------------------------------------
const cicloMetaPath = "99_Meta/ciclo-estudos.json";

const defaultState = {
  disciplinaAtualIdx: 0,
  cicloOrdem: [],
  metaHorasSemanal: 20,
  metaQuestoesSemanal: 150,
  nomeMetaProva: "Geral",
  dataMetaProva: "",
  historicoDiario: {},
  revisoes: [],
  planner: {}
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
let categoriaFiltroAtiva = 'Todas';

// Controle de navegação do calendário mensal
let plannerAno = now.getFullYear();
let plannerMes = now.getMonth(); // 0 a 11

// ---------------------------------------------------------------------------
// 2. PROCESSAMENTO DAS DISCIPLINAS DO VAULT
// ---------------------------------------------------------------------------
function obterDisciplinasProcessadas() {
  const rawPages = dv.pages('"03_Estudos"')
    .where(p => p.file && !p.file.name.includes("Template") && !p.file.name.includes("Painel"));

  return rawPages.map(p => {
    const minFoco = Number(p.minutos_foco) || (Number(p.tempo_foco) ? Number(p.tempo_foco) * 60 : 0);
    const feitas = Number(p.questoes_feitas) || 0;
    const acertos = Number(p.questoes_acertos) || 0;
    const erros = Math.max(0, feitas - acertos);
    const area = p.area || p.categoria || p.disciplina || "Geral";
    const sub = p.modulo || p.subtopico || "";
    
    let provas = [];
    if (Array.isArray(p.provas)) provas = p.provas;
    else if (p.provas && typeof p.provas === 'string') provas = [p.provas];
    else if (p.pdf) provas = [p.pdf];

    return {
      file: p.file,
      nome: p.title || p.file.name,
      path: p.file.path,
      area: area,
      categoria: area, // compatibilidade retroativa
      subtopico: sub,
      minutos: minFoco,
      feitas: feitas,
      acertos: acertos,
      erros: erros,
      pct: feitas > 0 ? Math.round((acertos / feitas) * 100) : 0,
      status: p.status || "Ativo",
      provas: provas
    };
  });
}

// ---------------------------------------------------------------------------
// 3. POPUPS DE FACILITAÇÃO (CRIAÇÃO, EDIÇÃO RÁPIDA, ORGANIZAÇÃO DO CICLO & FOCO)
// ---------------------------------------------------------------------------

// Popup 1: Nova Matéria (Simplificado e Intuitivo)
function abrirModalNovaMateria() {
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.82); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 480px; width: 100%; padding: 24px; box-shadow: 0 12px 45px rgba(0,0,0,0.85); display: flex; flex-direction: column; gap: 14px; font-family: sans-serif;';

  const areasSugeridas = ['Programação', 'ENEM', 'Concurso', 'Vestibular', 'Economia', 'Faculdade', 'Geral'];

  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 15px; font-weight: bold; color: #ffffff;">+ Nova Matéria de Estudo</div>
        <div style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">Cadastre uma matéria para cronometrar, agendar e revisar</div>
      </div>
      <button id="modal-close-mat" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 16px;">✕</button>
    </div>

    <div>
      <div style="font-size: 11px; font-family: monospace; color: #d4d4d8; font-weight: bold; margin-bottom: 4px;">1. Nome da Matéria:</div>
      <input id="modal-mat-nome" type="text" placeholder="Ex: Algoritmos, Física Mecânica, Direito Constitucional..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 9px; color: #ffffff; font-size: 12.5px; outline: none;">
    </div>

    <div>
      <div style="font-size: 11px; font-family: monospace; color: #d4d4d8; font-weight: bold; margin-bottom: 6px;">2. Área / Objetivo:</div>
      <div id="modal-chips-area" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
        ${areasSugeridas.map(a => `
          <button type="button" class="chip-area-opt" data-area="${a}" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; padding: 3px 9px; font-size: 11px; color: #e4e4e7; cursor: pointer;">
            ${a}
          </button>
        `).join('')}
      </div>
      <input id="modal-mat-area" type="text" value="Programação" placeholder="Ou digite outra área personalizada..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 11.5px; outline: none;">
    </div>

    <div>
      <div style="font-size: 11px; font-family: monospace; color: #d4d4d8; font-weight: bold; margin-bottom: 4px;">3. Material / Provas / Apostila (Opcional):</div>
      <input id="modal-mat-pdf" type="text" placeholder="Ex: [[provas/ENEM_2024.pdf]] ou Simulado.pdf" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 11.5px; outline: none;">
      <div style="font-size: 10px; color: #71717a; margin-top: 3px;">Você poderá abrir os PDFs diretamente pela tabela.</div>
    </div>

    <div style="background: rgba(96, 165, 250, 0.08); border: 1px solid rgba(96, 165, 250, 0.2); border-radius: 6px; padding: 10px; display: flex; align-items: center; gap: 8px;">
      <input id="modal-mat-ciclo" type="checkbox" checked style="cursor: pointer; width: 15px; height: 15px;">
      <label for="modal-mat-ciclo" style="font-size: 11.5px; color: #e0e7ff; cursor: pointer;">
        <b>Incluir na Fila do Ciclo de Estudos</b> (para estudar na rotação contínua)
      </label>
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
      <button id="modal-cancel-mat" class="abyssal-btn-action" style="font-size: 11.5px; padding: 6px 14px;">Cancelar</button>
      <button id="modal-save-mat" class="abyssal-btn-primary" style="font-size: 11.5px; padding: 6px 16px;">Criar Matéria</button>
    </div>
  `;

  modalBg.appendChild(modalBox);
  document.body.appendChild(modalBg);

  const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
  modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });
  modalBox.querySelector('#modal-close-mat').onclick = fechar;
  modalBox.querySelector('#modal-cancel-mat').onclick = fechar;

  const areaInput = modalBox.querySelector('#modal-mat-area');
  modalBox.querySelectorAll('.chip-area-opt').forEach(chip => {
    chip.onclick = () => {
      areaInput.value = chip.dataset.area;
      modalBox.querySelectorAll('.chip-area-opt').forEach(c => c.style.background = 'rgba(255,255,255,0.06)');
      chip.style.background = 'var(--interactive-accent, #60a5fa)';
      chip.style.color = '#000000';
      chip.style.fontWeight = 'bold';
    };
  });

  modalBox.querySelector('#modal-save-mat').onclick = async () => {
    const nome = modalBox.querySelector('#modal-mat-nome').value.trim();
    const area = areaInput.value.trim() || "Geral";
    const pdf = modalBox.querySelector('#modal-mat-pdf').value.trim();
    const incluirCiclo = modalBox.querySelector('#modal-mat-ciclo').checked;

    if (!nome) {
      new Notice("Informe o nome da matéria.");
      return;
    }

    const cleanNome = nome.replace(/[\\/:*?"<>|]/g, '-').trim();
    const filePath = `03_Estudos/${cleanNome}.md`;

    if (!app.vault.getAbstractFileByPath("03_Estudos")) {
      await app.vault.createFolder("03_Estudos").catch(() => {});
    }

    let provasArrayStr = pdf ? `["${pdf}"]` : `[]`;

    const content = `---
title: "${cleanNome}"
area: "${area}"
categoria: "${area}"
status: "Ativo"
minutos_foco: 0
questoes_feitas: 0
questoes_acertos: 0
provas: ${provasArrayStr}
tags:
  - estudo
---

# ${cleanNome}

> **Área:** \`${area}\` | **Status:** \`Ativo\`

---

## Provas, Simulados & PDFs
${pdf ? `- [[${pdf.replace(/^\[\[|\]\]$/g, '')}]]` : '- Nenhum PDF anexado ainda.'}

---

## Ideia Central
- 

---

## Conteúdo & Anotações
### 1. Tópicos Principais
- 

---

## Flashcards (Repetição Espaçada)
Conceito::Definição

---

[[03_Estudos/Painel de Estudos|← Voltar ao Painel de Estudos]]
`;

    await app.vault.create(filePath, content);

    // Se marcado para incluir no ciclo, insere na ordem do ciclo se não existir
    if (incluirCiclo) {
      if (!Array.isArray(estadoAtual.cicloOrdem)) estadoAtual.cicloOrdem = [];
      if (!estadoAtual.cicloOrdem.includes(cleanNome)) {
        estadoAtual.cicloOrdem.push(cleanNome);
        await salvarEstadoEstudos(estadoAtual);
      }
    }

    new Notice(`Matéria "${cleanNome}" cadastrada com sucesso!`);
    fechar();
    renderFrameworkEstudos();
  };

  setTimeout(() => modalBox.querySelector('#modal-mat-nome').focus(), 50);
}

const abrirModalNovaDisciplina = abrirModalNovaMateria; // compatibilidade

// Popup 2: Edição Rápida da Matéria (Botão ⋮ - Layout Humano e Direto)
function abrirModalEditarMateria(disc) {
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.82); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 460px; width: 100%; padding: 24px; box-shadow: 0 12px 45px rgba(0,0,0,0.85); display: flex; flex-direction: column; gap: 14px; font-family: sans-serif;';

  const provasStr = (disc.provas || []).join(', ');
  const estaNoCiclo = Array.isArray(estadoAtual.cicloOrdem) && estadoAtual.cicloOrdem.includes(disc.nome);

  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 15px; font-weight: bold; color: #ffffff;">Editar Matéria: ${disc.nome}</div>
        <div style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">Ajuste área, materiais anexos e métricas reais</div>
      </div>
      <button id="modal-close-edit" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 16px;">✕</button>
    </div>

    <div>
      <div style="font-size: 11px; font-family: monospace; color: #d4d4d8; font-weight: bold; margin-bottom: 4px;">Área / Objetivo:</div>
      <input id="modal-edit-area" type="text" value="${disc.area || disc.categoria}" placeholder="Ex: Programação, ENEM, Concurso..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;">
    </div>

    <div>
      <div style="font-size: 11px; font-family: monospace; color: #d4d4d8; font-weight: bold; margin-bottom: 4px;">Provas & PDFs Anexos (separados por vírgula):</div>
      <input id="modal-edit-provas" type="text" value="${provasStr}" placeholder="Ex: [[ENEM_2024.pdf]], [[Simulado.pdf]]" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 11.5px; outline: none;">
    </div>

    <div>
      <div style="font-size: 11px; font-family: monospace; color: #d4d4d8; font-weight: bold; margin-bottom: 4px;">Métricas Acumuladas:</div>
      <div style="display: flex; gap: 8px;">
        <div style="flex: 1;">
          <div style="font-size: 10px; color: #a1a1aa; margin-bottom: 2px;">Minutos de Foco:</div>
          <input id="modal-edit-min" type="number" min="0" value="${disc.minutos}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 12px; outline: none;">
        </div>
        <div style="flex: 1;">
          <div style="font-size: 10px; color: #a1a1aa; margin-bottom: 2px;">Questões Feitas:</div>
          <input id="modal-edit-feitas" type="number" min="0" value="${disc.feitas}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 12px; outline: none;">
        </div>
        <div style="flex: 1;">
          <div style="font-size: 10px; color: #a1a1aa; margin-bottom: 2px;">Acertos:</div>
          <input id="modal-edit-acertos" type="number" min="0" value="${disc.acertos}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 12px; outline: none;">
        </div>
      </div>
    </div>

    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 10px; display: flex; align-items: center; gap: 8px;">
      <input id="modal-edit-ciclo" type="checkbox" ${estaNoCiclo ? 'checked' : ''} style="cursor: pointer; width: 15px; height: 15px;">
      <label for="modal-edit-ciclo" style="font-size: 11.5px; color: #e4e4e7; cursor: pointer;">
        Participa da Fila do Ciclo de Estudos
      </label>
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
      <button id="modal-open-note" class="abyssal-btn-action" style="font-size: 11px;">Abrir Arquivo Físico</button>
      <div style="display: flex; gap: 8px;">
        <button id="modal-cancel-edit" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
        <button id="modal-save-edit" class="abyssal-btn-primary" style="font-size: 11px;">Salvar Alterações</button>
      </div>
    </div>
  `;

  modalBg.appendChild(modalBox);
  document.body.appendChild(modalBg);

  const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
  modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });
  modalBox.querySelector('#modal-close-edit').onclick = fechar;
  modalBox.querySelector('#modal-cancel-edit').onclick = fechar;

  modalBox.querySelector('#modal-open-note').onclick = () => {
    fechar();
    app.workspace.openLinkText(disc.path, "", false);
  };

  modalBox.querySelector('#modal-save-edit').onclick = async () => {
    const nArea = modalBox.querySelector('#modal-edit-area').value.trim() || "Geral";
    const nProvasRaw = modalBox.querySelector('#modal-edit-provas').value.trim();
    const nMin = parseInt(modalBox.querySelector('#modal-edit-min').value, 10) || 0;
    const nFeitas = parseInt(modalBox.querySelector('#modal-edit-feitas').value, 10) || 0;
    const nAcertos = parseInt(modalBox.querySelector('#modal-edit-acertos').value, 10) || 0;
    const querNoCiclo = modalBox.querySelector('#modal-edit-ciclo').checked;

    const nProvas = nProvasRaw ? nProvasRaw.split(',').map(s => s.trim()).filter(Boolean) : [];
    const nProvasJson = JSON.stringify(nProvas);

    const file = app.vault.getAbstractFileByPath(disc.path);
    if (file) {
      const raw = await app.vault.read(file);
      let updated = raw;

      // Atualiza area
      if (/area:\s*["'][^"']*["']/.test(updated)) updated = updated.replace(/area:\s*["'][^"']*["']/, `area: "${nArea}"`);
      else if (updated.startsWith('---')) updated = updated.replace(/^---\n/, `---\narea: "${nArea}"\n`);

      // Atualiza categoria (compatibilidade)
      if (/categoria:\s*["'][^"']*["']/.test(updated)) updated = updated.replace(/categoria:\s*["'][^"']*["']/, `categoria: "${nArea}"`);
      else if (/categoria:\s*[^\n]+/.test(updated)) updated = updated.replace(/categoria:\s*[^\n]+/, `categoria: "${nArea}"`);

      // Atualiza minutos_foco
      if (/minutos_foco:\s*\d+/.test(updated)) updated = updated.replace(/minutos_foco:\s*\d+/, `minutos_foco: ${nMin}`);
      else if (updated.startsWith('---')) updated = updated.replace(/^---\n/, `---\nminutos_foco: ${nMin}\n`);

      // Atualiza questoes_feitas
      if (/questoes_feitas:\s*\d+/.test(updated)) updated = updated.replace(/questoes_feitas:\s*\d+/, `questoes_feitas: ${nFeitas}`);
      else if (updated.startsWith('---')) updated = updated.replace(/^---\n/, `---\nquestoes_feitas: ${nFeitas}\n`);

      // Atualiza questoes_acertos
      if (/questoes_acertos:\s*\d+/.test(updated)) updated = updated.replace(/questoes_acertos:\s*\d+/, `questoes_acertos: ${nAcertos}`);
      else if (updated.startsWith('---')) updated = updated.replace(/^---\n/, `---\nquestoes_acertos: ${nAcertos}\n`);

      // Atualiza provas
      if (/provas:\s*\[[^\]]*\]/.test(updated)) updated = updated.replace(/provas:\s*\[[^\]]*\]/, `provas: ${nProvasJson}`);
      else if (updated.startsWith('---')) updated = updated.replace(/^---\n/, `---\nprovas: ${nProvasJson}\n`);

      await app.vault.modify(file, updated);
    }

    // Atualiza estado do ciclo
    if (!Array.isArray(estadoAtual.cicloOrdem)) estadoAtual.cicloOrdem = [];
    const indexNoCiclo = estadoAtual.cicloOrdem.indexOf(disc.nome);
    if (querNoCiclo && indexNoCiclo === -1) {
      estadoAtual.cicloOrdem.push(disc.nome);
      await salvarEstadoEstudos(estadoAtual);
    } else if (!querNoCiclo && indexNoCiclo !== -1) {
      estadoAtual.cicloOrdem.splice(indexNoCiclo, 1);
      await salvarEstadoEstudos(estadoAtual);
    }

    new Notice(`Matéria "${disc.nome}" atualizada!`);
    fechar();
    renderFrameworkEstudos();
  };
}

const abrirModalEditarDisciplina = abrirModalEditarMateria; // compatibilidade

// Popup 3: Organizar Fila do Ciclo de Estudos
function abrirModalOrganizarCiclo(todasDisciplinas) {
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 520px; width: 100%; padding: 24px; box-shadow: 0 12px 45px rgba(0,0,0,0.85); display: flex; flex-direction: column; gap: 14px; font-family: sans-serif;';

  // Se cicloOrdem estiver vazio, inicializa com as matérias existentes
  let filaTemp = Array.isArray(estadoAtual.cicloOrdem) && estadoAtual.cicloOrdem.length > 0
    ? [...estadoAtual.cicloOrdem]
    : todasDisciplinas.map(d => d.nome);

  // Garante que não haja nomes duplicados e inclui opções não selecionadas
  filaTemp = Array.from(new Set(filaTemp)).filter(nome => todasDisciplinas.some(d => d.nome === nome));

  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <div>
        <div style="font-size: 15px; font-weight: bold; color: #ffffff;">⚙ Organizar Fila do Ciclo</div>
        <div style="font-size: 11px; color: #a1a1aa; margin-top: 2px;">Defina a ordem contínua em que as matérias serão estudadas</div>
      </div>
      <button id="modal-close-ciclo-cfg" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 16px;">✕</button>
    </div>

    <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 6px; padding: 10px; font-size: 11.5px; color: #d4d4d8; line-height: 1.4;">
      💡 <b>Como funciona:</b> A fila roda do item 1 até o último e recomeça. Use as setas para ajustar quem vem primeiro. Desmarque matérias que você não deseja estudar nesta fase.
    </div>

    <div id="modal-ciclo-lista" style="display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; padding-right: 4px;">
    </div>

    <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 8px;">
      <button id="modal-ciclo-reset" class="abyssal-btn-action" style="font-size: 11px;">Restaurar Padrão</button>
      <div style="display: flex; gap: 8px;">
        <button id="modal-ciclo-cancel" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
        <button id="modal-ciclo-save" class="abyssal-btn-primary" style="font-size: 11px;">Salvar Fila do Ciclo</button>
      </div>
    </div>
  `;

  modalBg.appendChild(modalBox);
  document.body.appendChild(modalBg);

  const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
  modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });
  modalBox.querySelector('#modal-close-ciclo-cfg').onclick = fechar;
  modalBox.querySelector('#modal-ciclo-cancel').onclick = fechar;

  const renderLista = () => {
    const listEl = modalBox.querySelector('#modal-ciclo-lista');
    listEl.innerHTML = '';

    if (todasDisciplinas.length === 0) {
      listEl.innerHTML = '<div style="font-size: 11px; color: #71717a; text-align: center; padding: 20px;">Nenhuma matéria cadastrada.</div>';
      return;
    }

    // Renderiza primeiro as que estão na fila ordenada
    filaTemp.forEach((nome, idx) => {
      const disc = todasDisciplinas.find(d => d.nome === nome);
      if (!disc) return;

      const item = document.createElement('div');
      item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 10px;';
      item.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
          <span style="font-size: 11px; font-family: monospace; font-weight: bold; color: var(--interactive-accent, #60a5fa); width: 22px;">${idx + 1}º</span>
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 12px; font-weight: bold; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${disc.nome}</span>
            <span style="font-size: 9.5px; font-family: monospace; color: #a1a1aa;">${disc.area || disc.categoria}</span>
          </div>
        </div>
        <div style="display: flex; align-items: center; gap: 4px;">
          <button class="btn-subir" data-idx="${idx}" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #ffffff; border-radius: 4px; padding: 2px 7px; font-size: 10px; cursor: pointer;" ${idx === 0 ? 'disabled style="opacity: 0.3;"' : ''}>▲</button>
          <button class="btn-descer" data-idx="${idx}" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); color: #ffffff; border-radius: 4px; padding: 2px 7px; font-size: 10px; cursor: pointer;" ${idx === filaTemp.length - 1 ? 'disabled style="opacity: 0.3;"' : ''}>▼</button>
          <button class="btn-remover-fila" data-idx="${idx}" style="background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #fca5a5; border-radius: 4px; padding: 2px 7px; font-size: 10px; cursor: pointer;" title="Remover da rotação">✕</button>
        </div>
      `;

      item.querySelector('.btn-subir').onclick = () => {
        if (idx > 0) {
          const tmp = filaTemp[idx];
          filaTemp[idx] = filaTemp[idx - 1];
          filaTemp[idx - 1] = tmp;
          renderLista();
        }
      };

      item.querySelector('.btn-descer').onclick = () => {
        if (idx < filaTemp.length - 1) {
          const tmp = filaTemp[idx];
          filaTemp[idx] = filaTemp[idx + 1];
          filaTemp[idx + 1] = tmp;
          renderLista();
        }
      };

      item.querySelector('.btn-remover-fila').onclick = () => {
        filaTemp.splice(idx, 1);
        renderLista();
      };

      listEl.appendChild(item);
    });

    // Renderiza matérias que estão fora da fila
    const foraDaFila = todasDisciplinas.filter(d => !filaTemp.includes(d.nome));
    if (foraDaFila.length > 0) {
      const sep = document.createElement('div');
      sep.style.cssText = 'font-size: 10.5px; font-family: monospace; color: #71717a; text-transform: uppercase; margin-top: 8px; margin-bottom: 2px;';
      sep.innerText = 'Matérias fora da rotação (clique em + para incluir):';
      listEl.appendChild(sep);

      foraDaFila.forEach(disc => {
        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.08); border-radius: 6px; padding: 6px 10px; opacity: 0.8;';
        item.innerHTML = `
          <div style="display: flex; flex-direction: column;">
            <span style="font-size: 11.5px; color: #d4d4d8;">${disc.nome}</span>
            <span style="font-size: 9.5px; font-family: monospace; color: #71717a;">${disc.area || disc.categoria}</span>
          </div>
          <button class="btn-add-fila" style="background: rgba(96, 165, 250, 0.15); border: 1px solid rgba(96, 165, 250, 0.3); color: #93c5fd; border-radius: 4px; padding: 3px 8px; font-size: 10.5px; cursor: pointer;">+ Incluir na Fila</button>
        `;

        item.querySelector('.btn-add-fila').onclick = () => {
          filaTemp.push(disc.nome);
          renderLista();
        };

        listEl.appendChild(item);
      });
    }
  };

  renderLista();

  modalBox.querySelector('#modal-ciclo-reset').onclick = () => {
    filaTemp = todasDisciplinas.map(d => d.nome);
    renderLista();
  };

  modalBox.querySelector('#modal-ciclo-save').onclick = async () => {
    estadoAtual.cicloOrdem = [...filaTemp];
    if (estadoAtual.disciplinaAtualIdx >= estadoAtual.cicloOrdem.length) {
      estadoAtual.disciplinaAtualIdx = 0;
    }
    await salvarEstadoEstudos(estadoAtual);
    new Notice("Fila do Ciclo de Estudos atualizada!");
    fechar();
    renderFrameworkEstudos();
  };
}

// Popup 3: Registrar Foco / Sessão
function abrirModalSessao(materiaPreSelecionada = null) {
  const disciplinas = obterDisciplinasProcessadas();
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 440px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';

  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 14px; font-weight: bold; color: #ffffff;">Registrar Estudo & Questões</span>
      <button id="modal-close-sess" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
    </div>

    <div>
      <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Disciplina:</div>
      <select id="modal-sess-mat" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
        ${disciplinas.map(m => `
          <option value="${m.path}" ${materiaPreSelecionada && materiaPreSelecionada.path === m.path ? 'selected' : ''}>
            ${m.nome} (${m.categoria})
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
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Modalidade:</div>
        <select id="modal-sess-tipo" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
          <option value="Teoria + Questões" selected>Teoria + Questões</option>
          <option value="Apenas Teoria">Apenas Teoria</option>
          <option value="Apenas Questões">Apenas Questões</option>
          <option value="Simulado / Prova">Simulado / Prova</option>
          <option value="Revisão">Revisão</option>
        </select>
      </div>
    </div>

    <div style="display: flex; gap: 8px;">
      <div style="flex: 1;">
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Questões Resolvidas:</div>
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

    if (!estadoAtual.historicoDiario[todayStr]) {
      estadoAtual.historicoDiario[todayStr] = { minutosFoco: 0, questoesFeitas: 0, questoesAcertos: 0 };
    }
    estadoAtual.historicoDiario[todayStr].minutosFoco += minutos;
    estadoAtual.historicoDiario[todayStr].questoesFeitas += feitas;
    estadoAtual.historicoDiario[todayStr].questoesAcertos += acertos;

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

    if (file) {
      const raw = await app.vault.read(file);
      let updated = raw;
      
      let fTotal = feitas;
      let aTotal = acertos;
      const mF = raw.match(/questoes_feitas:\s*(\d+)/);
      if (mF) fTotal += parseInt(mF[1], 10);
      const mA = raw.match(/questoes_acertos:\s*(\d+)/);
      if (mA) aTotal += parseInt(mA[1], 10);

      if (/questoes_feitas:\s*\d+/.test(updated)) updated = updated.replace(/questoes_feitas:\s*\d+/, `questoes_feitas: ${fTotal}`);
      else if (updated.startsWith('---')) updated = updated.replace(/^---\n/, `---\nquestoes_feitas: ${fTotal}\n`);

      if (/questoes_acertos:\s*\d+/.test(updated)) updated = updated.replace(/questoes_acertos:\s*\d+/, `questoes_acertos: ${aTotal}`);
      else if (updated.startsWith('---')) updated = updated.replace(/^---\n/, `---\nquestoes_acertos: ${aTotal}\n`);

      let minMatTotal = minutos;
      const mMin = raw.match(/minutos_foco:\s*(\d+)/);
      if (mMin) minMatTotal += parseInt(mMin[1], 10);
      if (/minutos_foco:\s*\d+/.test(updated)) updated = updated.replace(/minutos_foco:\s*\d+/, `minutos_foco: ${minMatTotal}`);
      else if (updated.startsWith('---')) updated = updated.replace(/^---\n/, `---\nminutos_foco: ${minMatTotal}\n`);

      await app.vault.modify(file, updated);
    }

    new Notice(`Sessão registrada: ${minutos}m em ${nomeMateria}!`);
    fechar();
    renderFrameworkEstudos();
  };
}

// Popup 4: Vincular PDF Direto
function abrirModalVincularPdf(disc) {
  const modalBg = document.createElement('div');
  modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
  
  const modalBox = document.createElement('div');
  modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 420px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';

  modalBox.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span style="font-size: 14px; font-weight: bold; color: #ffffff;">Vincular Prova / PDF</span>
      <button id="modal-close-vinc" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
    </div>
    <div style="font-size: 12px; color: #a1a1aa;">Disciplina: <b>${disc.nome}</b></div>

    <div>
      <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Link ou Nome do Arquivo PDF:</div>
      <input id="modal-vinc-input" type="text" placeholder="Ex: [[provas/ENEM_2024.pdf]] ou Simulado.pdf" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 11.5px; outline: none;">
    </div>

    <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
      <button id="modal-cancel-vinc" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
      <button id="modal-save-vinc" class="abyssal-btn-primary" style="font-size: 11px;">Salvar Vínculo</button>
    </div>
  `;

  modalBg.appendChild(modalBox);
  document.body.appendChild(modalBg);

  const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
  modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });
  modalBox.querySelector('#modal-close-vinc').onclick = fechar;
  modalBox.querySelector('#modal-cancel-vinc').onclick = fechar;

  modalBox.querySelector('#modal-save-vinc').onclick = async () => {
    const val = modalBox.querySelector('#modal-vinc-input').value.trim();
    if (!val) return;

    const file = app.vault.getAbstractFileByPath(disc.path);
    if (file) {
      const raw = await app.vault.read(file);
      let updated = raw;
      if (/provas:\s*\[[^\]]*\]/.test(updated)) {
        updated = updated.replace(/provas:\s*\[(.*?)\]/, (match, p1) => {
          const items = p1.trim() ? `${p1.trim()}, "${val}"` : `"${val}"`;
          return `provas: [${items}]`;
        });
      } else if (updated.startsWith('---')) {
        updated = updated.replace(/^---\n/, `---\nprovas: ["${val}"]\n`);
      }
      await app.vault.modify(file, updated);
      new Notice(`Prova / PDF vinculado a ${disc.nome}!`);
      fechar();
      renderFrameworkEstudos();
    }
  };
}

// ---------------------------------------------------------------------------
function obterFilaDoCiclo(todasDisciplinas) {
  if (Array.isArray(estadoAtual.cicloOrdem) && estadoAtual.cicloOrdem.length > 0) {
    const ordenadas = [];
    estadoAtual.cicloOrdem.forEach(nome => {
      const match = todasDisciplinas.find(d => d.nome === nome);
      if (match) ordenadas.push(match);
    });
    if (ordenadas.length > 0) return ordenadas;
  }
  return todasDisciplinas;
}

// ---------------------------------------------------------------------------
// 4. RENDERIZADOR PRINCIPAL DO FRAMEWORK DE ESTUDOS
// ---------------------------------------------------------------------------
function renderFrameworkEstudos() {
  root.innerHTML = '';
  const todasDisciplinas = obterDisciplinasProcessadas();

  // 4.1. CABEÇALHO GLOBAL COM AÇÕES CONSOLIDADAS
  const header = root.createEl('div', {
    attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; padding: 12px 18px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 10px; flex-wrap: wrap; gap: 12px;' }
  });

  header.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <button id="btn-back-home" class="abyssal-btn-action" style="font-size: 11px; padding: 4px 10px;">← HOME</button>
      <div>
        <div style="font-size: 15px; font-weight: 700; color: var(--text-normal); text-transform: uppercase; letter-spacing: 0.05em;">
          FRAMEWORK DE ESTUDOS
        </div>
        <div style="font-size: 11px; font-family: monospace; color: var(--text-muted);">${todasDisciplinas.length} matérias cadastradas</div>
      </div>
    </div>

    <div style="display: flex; align-items: center; gap: 8px;">
      <button id="btn-cfg-ciclo-top" class="abyssal-btn-action" style="font-size: 11px; padding: 5px 12px;" title="Configurar e ordenar fila do ciclo">⚙ FILA DO CICLO</button>
      <button id="btn-add-materia" class="abyssal-nav-pill-btn" style="font-size: 11px; padding: 5px 12px;">+ NOVA MATÉRIA</button>
      <button id="btn-registrar-sessao-top" class="abyssal-btn-primary" style="font-size: 11px; padding: 5px 14px;">+ REGISTRAR ESTUDO</button>
    </div>
  `;

  header.querySelector('#btn-back-home').onclick = () => app.workspace.openLinkText("00_Home/Home.md", "", false);
  header.querySelector('#btn-cfg-ciclo-top').onclick = () => abrirModalOrganizarCiclo(todasDisciplinas);
  header.querySelector('#btn-add-materia').onclick = () => abrirModalNovaMateria();
  header.querySelector('#btn-registrar-sessao-top').onclick = () => abrirModalSessao();

  // 4.2. BARRA DE ABAS MODULARES DO FRAMEWORK
  const navTabs = root.createEl('div', {
    attr: {
      style: 'display: flex; gap: 6px; border-bottom: 2px solid var(--background-modifier-border); margin-bottom: 18px; overflow-x: auto; padding-bottom: 2px;'
    }
  });

  const abas = [
    { id: 'painel', label: 'PAINEL DE CONTROLE' },
    { id: 'planner', label: 'MEU PLANNER' },
    { id: 'revisoes', label: 'REVISÕES ESPAÇADAS' },
    { id: 'ciclo', label: 'CICLO DE ESTUDOS' }
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

  if (abaModulo === 'painel') {
    renderAbaPainelDeControle(todasDisciplinas);
  } else if (abaModulo === 'planner') {
    renderAbaMeuPlanner(todasDisciplinas);
  } else if (abaModulo === 'revisoes') {
    renderAbaRevisoes(todasDisciplinas);
  } else if (abaModulo === 'ciclo') {
    renderAbaCicloEstudos(todasDisciplinas);
  }
}

// ---------------------------------------------------------------------------
// 5. ABA: PAINEL DE CONTROLE (DONUT, LINHA 7D, RADAR INTEGRADO E TABELA LIMPA)
// ---------------------------------------------------------------------------
function renderAbaPainelDeControle(todasDisciplinas) {
  const container = root.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 18px;' } });

  // Coleta lista única de áreas
  const categoriasSet = new Set(['Todas']);
  todasDisciplinas.forEach(d => { if (d.area || d.categoria) categoriasSet.add(d.area || d.categoria); });
  ['Programação', 'ENEM', 'Concurso', 'Economia'].forEach(c => categoriasSet.add(c));
  const categoriasLista = Array.from(categoriasSet);

  // FILTRO HORIZONTAL POR ÁREA
  const filterRow = container.createEl('div', {
    attr: { style: 'display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 8px;' }
  });

  const filterLeft = filterRow.createEl('div', { attr: { style: 'display: flex; align-items: center; gap: 8px; flex-wrap: wrap;' } });
  filterLeft.createEl('span', {
    attr: { style: 'font-size: 10.5px; font-family: monospace; font-weight: bold; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;' },
    text: 'Filtrar por Área:'
  });

  const pillsContainer = filterLeft.createEl('div', { attr: { style: 'display: flex; gap: 6px; flex-wrap: wrap;' } });
  categoriasLista.forEach(cat => {
    const isAtiva = categoriaFiltroAtiva === cat;
    const pill = pillsContainer.createEl('button', {
      cls: `abyssal-btn-mode ${isAtiva ? 'active' : ''}`,
      attr: { style: `font-size: 10.5px; padding: 3px 10px; border-radius: 4px; ${isAtiva ? 'background: var(--text-normal); color: var(--background-primary); font-weight: bold;' : ''}` },
      text: cat
    });
    pill.onclick = () => {
      categoriaFiltroAtiva = cat;
      renderFrameworkEstudos();
    };
  });

  const disciplinasFiltradas = categoriaFiltroAtiva === 'Todas' 
    ? todasDisciplinas 
    : todasDisciplinas.filter(d => (d.area || d.categoria).toLowerCase() === categoriaFiltroAtiva.toLowerCase());

  let totalMinutosGlobal = 0;
  let totalQuestoesGlobal = 0;
  let totalAcertosGlobal = 0;
  let totalErrosGlobal = 0;

  disciplinasFiltradas.forEach(d => {
    totalMinutosGlobal += d.minutos;
    totalQuestoesGlobal += d.feitas;
    totalAcertosGlobal += d.acertos;
    totalErrosGlobal += d.erros;
  });

  const totalHorasTxt = `${Math.floor(totalMinutosGlobal / 60)}h${totalMinutosGlobal % 60}m`;
  const pctAcertosGeral = totalQuestoesGlobal > 0 ? Math.round((totalAcertosGlobal / totalQuestoesGlobal) * 100) : 0;

  // CÁLCULO DOS ÚLTIMOS 7 DIAS REAIS (Sem Mocks)
  const ultimos7Dias = [];
  const diasSemanaNomesCurtos = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  let somaMinutos7d = 0;

  for (let i = 6; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const dStr = `${d.getFullYear()}-${padTime(d.getMonth() + 1)}-${padTime(d.getDate())}`;
    const isHoje = dStr === todayStr;

    let minDia = 0;
    let questDia = 0;

    if (estadoAtual.historicoDiario && estadoAtual.historicoDiario[dStr]) {
      minDia += Number(estadoAtual.historicoDiario[dStr].minutosFoco) || 0;
      questDia += Number(estadoAtual.historicoDiario[dStr].questoesFeitas) || 0;
    }

    const dailyPage = dv.page(`"01_Inbox/Diário/${dStr}"`);
    if (dailyPage && dailyPage.pomodoros) {
      const pMin = Number(dailyPage.pomodoros) * 25;
      if (pMin > minDia) minDia = pMin;
    }

    somaMinutos7d += minDia;

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
  const mediaHorasTxt = mediaMinutosDia >= 60 ? `${Math.floor(mediaMinutosDia / 60)}h${mediaMinutosDia % 60}m` : `${mediaMinutosDia}m`;
  const maxMinutosPlot = Math.max(60, ...ultimos7Dias.map(p => p.minutos)) * 1.15;

  // FAIXA SUPERIOR: DONUT POR MATÉRIA & LINHA DE 7 DIAS (50/50)
  const topControlGrid = container.createEl('div', {
    cls: 'abyssal-showcase-grid',
    attr: { style: 'margin-bottom: 0;' }
  });

  // CARD 1: DONUT SVG
  const donutCard = topControlGrid.createEl('div', {
    cls: 'abyssal-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 12px;' }
  });

  donutCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="abyssal-section-title">HORAS POR MATÉRIA</span>
      <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">Total: ${totalHorasTxt}</span>
    </div>
  `;

  const donutContent = donutCard.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: 130px 1fr; gap: 16px; align-items: center; min-height: 135px;' }
  });

  const coresPaleta = ['#2DCDAA', '#6735BC', '#2196F3', '#FF6347', '#E7D827', '#93c5fd', '#86efac', '#f472b6'];
  const svgWrapper = donutContent.createEl('div', { attr: { style: 'position: relative; width: 130px; height: 130px; display: flex; align-items: center; justify-content: center;' } });

  const raio = 50;
  const circunferencia = 2 * Math.PI * raio;
  let offsetAcumulado = 0;
  let circlesHtml = '';

  if (totalMinutosGlobal === 0) {
    circlesHtml = `<circle cx="65" cy="65" r="${raio}" fill="none" stroke="rgba(255,255,255,0.08)" stroke-width="12" />`;
  } else {
    disciplinasFiltradas.forEach((d, idx) => {
      if (d.minutos <= 0) return;
      const proporcao = d.minutos / totalMinutosGlobal;
      const strokeDash = proporcao * circunferencia;
      const strokeOffset = -offsetAcumulado;
      offsetAcumulado += strokeDash;
      const cor = coresPaleta[idx % coresPaleta.length];

      circlesHtml += `
        <circle cx="65" cy="65" r="${raio}" fill="none" stroke="${cor}" stroke-width="14"
          stroke-dasharray="${strokeDash} ${circunferencia - strokeDash}"
          stroke-dashoffset="${strokeOffset}" style="transition: stroke-dasharray 0.3s ease;" />
      `;
    });
  }

  svgWrapper.innerHTML = `
    <svg width="130" height="130" viewBox="0 0 130 130" style="transform: rotate(-90deg);">
      <circle cx="65" cy="65" r="${raio}" fill="none" stroke="rgba(255,255,255,0.04)" stroke-width="14" />
      ${circlesHtml}
    </svg>
    <div style="position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; pointer-events: none; text-align: center;">
      <span style="font-size: 9px; font-family: monospace; color: var(--text-muted); text-transform: uppercase;">Total</span>
      <span style="font-size: 13px; font-weight: 800; color: var(--text-normal); font-family: monospace;">${totalHorasTxt}</span>
    </div>
  `;

  const legendaBox = donutContent.createEl('div', {
    attr: { style: 'display: flex; flex-direction: column; gap: 6px; max-height: 130px; overflow-y: auto; padding-right: 4px;' }
  });

  if (disciplinasFiltradas.length === 0) {
    legendaBox.innerHTML = '<div style="font-size: 11px; font-family: monospace; color: var(--text-muted);">Nenhuma matéria nesta área.</div>';
  } else {
    disciplinasFiltradas.forEach((d, idx) => {
      const cor = coresPaleta[idx % coresPaleta.length];
      const hTxt = `${Math.floor(d.minutos / 60)}h${d.minutos % 60}m`;
      const pctTxt = totalMinutosGlobal > 0 ? Math.round((d.minutos / totalMinutosGlobal) * 100) : 0;

      const row = legendaBox.createEl('div', {
        attr: { style: 'display: flex; justify-content: space-between; align-items: center; font-size: 11px; font-family: monospace;' }
      });
      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
          <span style="width: 7px; height: 7px; border-radius: 50%; background: ${cor}; flex-shrink: 0;"></span>
          <span style="color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${d.nome}</span>
        </div>
        <span style="color: var(--text-muted); flex-shrink: 0;">${hTxt} (${pctTxt}%)</span>
      `;
    });
  }

  // CARD 2: GRÁFICO DE LINHA/ÁREA SVG REAL
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
          <stop offset="0%" stop-color="var(--interactive-accent, #60a5fa)" stop-opacity="0.28" />
          <stop offset="100%" stop-color="var(--interactive-accent, #60a5fa)" stop-opacity="0.0" />
        </linearGradient>
      </defs>

      <line x1="${padL}" y1="${baseLineY}" x2="${padL + plotW}" y2="${baseLineY}" stroke="var(--background-modifier-border)" stroke-width="1" />
      <line x1="${padL}" y1="${yMediaLine.toFixed(1)}" x2="${padL + plotW}" y2="${yMediaLine.toFixed(1)}" stroke="rgba(255,255,255,0.12)" stroke-dasharray="3,3" stroke-width="1" />

      <path d="${areaPathD}" fill="url(#areaGradEstudos)" />
      <path d="${linePathD}" fill="none" stroke="var(--interactive-accent, #60a5fa)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />

      ${pontosCoord.map(pt => `
        <text x="${pt.cx.toFixed(1)}" y="${baseLineY + 14}" text-anchor="middle" font-size="9" fill="${pt.isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-muted)'}" font-family="monospace" font-weight="${pt.isHoje ? 'bold' : 'normal'}">
          ${pt.diaSemana}
        </text>

        ${pt.minutos > 0 ? `
          <text x="${pt.cx.toFixed(1)}" y="${(pt.cy - 6).toFixed(1)}" text-anchor="middle" font-size="8.5" fill="${pt.isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-normal)'}" font-family="monospace" font-weight="bold">
            ${pt.minutos >= 60 ? `${Math.floor(pt.minutos / 60)}h${pt.minutos % 60 ? `${pt.minutos % 60}m` : ''}` : `${pt.minutos}m`}
          </text>
        ` : ''}

        <circle cx="${pt.cx.toFixed(1)}" cy="${pt.cy.toFixed(1)}" r="${pt.isHoje ? 4.5 : 3}" fill="${pt.isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-normal)'}" stroke="var(--background-secondary, #111118)" stroke-width="1.5" />
      `).join('')}
    </svg>
  `;

  // FAIXA DE KPIS: 6 CARDS LIMPOS EM GRADE HORIZONTAL HOMOGÊNEA
  const kpiGrid = container.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: repeat(auto-fit, minmax(130px, 1fr)); gap: 10px;' }
  });

  const kpis = [
    { label: 'TEMPO DE FOCO', val: totalHorasTxt, sub: 'Tempo líquido real', cor: 'var(--text-normal)' },
    { label: 'QUESTÕES', val: totalQuestoesGlobal, sub: 'Total resolvidas', cor: 'var(--text-normal)' },
    { label: 'ACERTOS', val: totalAcertosGlobal, sub: 'Corretas', cor: '#86efac' },
    { label: 'ERROS', val: totalErrosGlobal, sub: 'A revisar', cor: totalErrosGlobal > 0 ? '#fca5a5' : 'var(--text-muted)' },
    { label: 'ASSERTIVIDADE', val: `${pctAcertosGeral}%`, sub: 'Taxa geral', cor: pctAcertosGeral >= 80 ? '#86efac' : 'var(--text-normal)' },
    { label: 'MATÉRIAS', val: disciplinasFiltradas.length, sub: 'Na categoria', cor: 'var(--interactive-accent, #60a5fa)' }
  ];

  kpis.forEach(k => {
    const cardEl = kpiGrid.createEl('div', {
      attr: { style: 'background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 8px; padding: 12px 14px; display: flex; flex-direction: column; gap: 4px;' }
    });
    cardEl.innerHTML = `
      <span style="font-size: 9.5px; font-family: monospace; color: var(--text-muted); font-weight: 700; letter-spacing: 0.05em;">${k.label}</span>
      <span style="font-size: 20px; font-weight: 800; color: ${k.cor}; font-family: monospace; line-height: 1.2;">${k.val}</span>
      <span style="font-size: 10px; font-family: monospace; color: var(--text-muted);">${k.sub}</span>
    `;
  });

  // RADAR INTEGRADO (CICLO ATIVO & REVISÕES DO DIA NO PRÓPRIO PAINEL)
  const radarGrid = container.createEl('div', {
    cls: 'abyssal-showcase-grid',
    attr: { style: 'margin-bottom: 0;' }
  });

  // Radar Esquerdo: Matéria da Vez no Ciclo (Respeitando Fila Ordenada)
  const filaCiclo = obterFilaDoCiclo(todasDisciplinas);
  let currentIdx = estadoAtual.disciplinaAtualIdx || 0;
  if (currentIdx >= filaCiclo.length) currentIdx = 0;
  const materiaVez = filaCiclo[currentIdx];

  const cicloCard = radarGrid.createEl('div', {
    cls: 'abyssal-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 10px;' }
  });

  if (materiaVez) {
    cicloCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="abyssal-section-title">CICLO ATIVO • MATÉRIA DA VEZ</span>
        <div style="display: flex; align-items: center; gap: 6px;">
          <span style="font-size: 10.5px; font-family: monospace; color: var(--interactive-accent, #60a5fa); font-weight: bold;">${currentIdx + 1} de ${filaCiclo.length}</span>
          <button id="btn-radar-cfg-ciclo" class="abyssal-btn-action" style="font-size: 10px; padding: 2px 6px;" title="Organizar Fila do Ciclo">⚙</button>
        </div>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 3px solid var(--interactive-accent, #60a5fa); border-radius: 6px; padding: 10px 12px;">
        <div style="display: flex; flex-direction: column; gap: 2px; overflow: hidden; padding-right: 8px;">
          <span style="font-size: 13.5px; font-weight: 700; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${materiaVez.nome}</span>
          <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">${materiaVez.area || materiaVez.categoria}</span>
        </div>
        <div style="display: flex; gap: 6px; flex-shrink: 0;">
          <button id="btn-radar-foco" class="abyssal-btn-primary" style="font-size: 10.5px; padding: 4px 10px;">+ Foco</button>
          <button id="btn-radar-next" class="abyssal-btn-action" style="font-size: 10.5px; padding: 4px 8px;" title="Avançar ciclo">Avançar →</button>
        </div>
      </div>
    `;

    cicloCard.querySelector('#btn-radar-cfg-ciclo').onclick = () => abrirModalOrganizarCiclo(todasDisciplinas);
    cicloCard.querySelector('#btn-radar-foco').onclick = () => abrirModalSessao(materiaVez);
    cicloCard.querySelector('#btn-radar-next').onclick = async () => {
      const prox = (currentIdx + 1) % filaCiclo.length;
      estadoAtual.disciplinaAtualIdx = prox;
      await salvarEstadoEstudos(estadoAtual);
      new Notice(`Ciclo avançado! Próxima: ${filaCiclo[prox].nome}`);
      renderFrameworkEstudos();
    };
  } else {
    cicloCard.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span class="abyssal-section-title">CICLO ATIVO</span>
        <button id="btn-radar-cfg-vazio" class="abyssal-btn-action" style="font-size: 10px; padding: 2px 6px;">⚙ Organizar</button>
      </div>
      <div style="font-size: 11px; font-family: monospace; color: var(--text-muted); padding: 12px 0;">Cadastre matérias para iniciar a fila rotativa.</div>
    `;
    const btnVazio = cicloCard.querySelector('#btn-radar-cfg-vazio');
    if (btnVazio) btnVazio.onclick = () => abrirModalOrganizarCiclo(todasDisciplinas);
  }

  // Radar Direito: Revisões Vencidas / Para Hoje
  const revsHoje = (estadoAtual.revisoes || []).filter(r => r.status === 'programada' && r.proximaRevisao <= todayStr);
  const revCard = radarGrid.createEl('div', {
    cls: 'abyssal-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 10px;' }
  });

  revCard.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="abyssal-section-title">REVISÕES PARA HOJE</span>
      <span style="font-size: 10.5px; font-family: monospace; color: ${revsHoje.length > 0 ? '#fca5a5' : '#86efac'}; font-weight: bold;">${revsHoje.length} pendente(s)</span>
    </div>
  `;

  if (revsHoje.length === 0) {
    revCard.createEl('div', {
      attr: { style: 'font-size: 11px; font-family: monospace; color: var(--text-muted); padding: 14px 0; text-align: center;' },
      text: 'Nenhuma revisão pendente para hoje. Curva de retenção em dia!'
    });
  } else {
    const revList = revCard.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 6px; max-height: 120px; overflow-y: auto;' } });
    revsHoje.slice(0, 3).forEach(r => {
      const rItem = revList.createEl('div', {
        attr: { style: 'display: flex; justify-content: space-between; align-items: center; background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 6px 10px;' }
      });
      rItem.innerHTML = `
        <div style="display: flex; align-items: center; gap: 6px; overflow: hidden;">
          <span style="font-size: 9.5px; padding: 1px 5px; border-radius: 3px; background: rgba(96, 165, 250, 0.2); color: #93c5fd; font-family: monospace;">${r.intervaloDias || 1}d</span>
          <span style="font-size: 11.5px; font-weight: bold; color: var(--text-normal); white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${r.nome}</span>
        </div>
        <button class="abyssal-btn-primary btn-concluir-rev" data-path="${r.materiaPath}" style="font-size: 10px; padding: 3px 8px;">✓ Concluir</button>
      `;

      rItem.querySelector('.btn-concluir-rev').onclick = async () => {
        const proxMap = { 1: 7, 7: 14, 14: 30, 30: 30 };
        const novoIntervalo = proxMap[r.intervaloDias || 1] || 7;
        if (r.intervaloDias === 30) {
          r.status = 'concluida';
        } else {
          const proxD = new Date(now.getTime() + novoIntervalo * 86400000);
          r.proximaRevisao = `${proxD.getFullYear()}-${padTime(proxD.getMonth() + 1)}-${padTime(proxD.getDate())}`;
          r.intervaloDias = novoIntervalo;
          r.ultimaRevisao = todayStr;
        }
        await salvarEstadoEstudos(estadoAtual);
        new Notice(`Revisão concluída! Próxima em ${novoIntervalo} dias.`);
        renderFrameworkEstudos();
      };
    });
  }

  // TABELA ANALÍTICA DE MATÉRIAS (REESTRUTURADA COM ALINHAMENTO PERFEITO E BOTÃO ⋮)
  const tableSection = container.createEl('div', { 
    cls: 'abyssal-card-box', 
    attr: { style: 'display: flex; flex-direction: column; gap: 12px;' } 
  });
  
  tableSection.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center;">
      <span class="abyssal-section-title">TABELA DE MATÉRIAS & SIMULADOS</span>
      <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">${disciplinasFiltradas.length} matérias</span>
    </div>
  `;

  if (disciplinasFiltradas.length === 0) {
    tableSection.createEl('div', {
      attr: { style: 'font-size: 12px; font-family: monospace; color: var(--text-muted); text-align: center; padding: 24px 0;' },
      text: 'Nenhuma matéria encontrada nesta área. Clique em "+ NOVA MATÉRIA" para adicionar!'
    });
    return;
  }

  const tableWrapper = tableSection.createEl('div', { attr: { style: 'overflow-x: auto;' } });
  const tableEl = tableWrapper.createEl('table', {
    attr: { style: 'width: 100%; border-collapse: collapse; font-size: 12px; font-family: monospace; text-align: left;' }
  });

  tableEl.innerHTML = `
    <thead>
      <tr style="border-bottom: 2px solid var(--background-modifier-border); color: var(--text-muted); font-size: 10.5px; text-transform: uppercase;">
        <th style="padding: 10px 12px; vertical-align: middle;">Matéria</th>
        <th style="padding: 10px 12px; vertical-align: middle;">Área</th>
        <th style="padding: 10px 12px; vertical-align: middle;">Provas & PDFs</th>
        <th style="padding: 10px 12px; vertical-align: middle;">Tempo Focado</th>
        <th style="padding: 10px 12px; vertical-align: middle;">Questões</th>
        <th style="padding: 10px 12px; vertical-align: middle;">Assertividade</th>
        <th style="padding: 10px 12px; text-align: right; vertical-align: middle;">Ações</th>
      </tr>
    </thead>
    <tbody>
      ${disciplinasFiltradas.map((d, dIdx) => {
        const hTxt = `${Math.floor(d.minutos / 60)}h${d.minutos % 60}m`;
        
        let provasChips = '';
        if (d.provas && d.provas.length > 0) {
          provasChips = d.provas.map(p => {
            const cleanLink = p.replace(/^\[\[|\]\]$/g, '');
            const shortName = cleanLink.split('/').pop();
            return `<span class="btn-open-pdf" data-link="${cleanLink}" style="display: inline-flex; align-items: center; gap: 4px; padding: 2px 7px; border-radius: 4px; background: rgba(96, 165, 250, 0.14); color: #93c5fd; font-size: 10.5px; cursor: pointer; text-decoration: underline; white-space: nowrap; max-width: 140px; overflow: hidden; text-overflow: ellipsis;" title="Abrir PDF: ${shortName}">📄 ${shortName}</span>`;
          }).join(' ');
        } else {
          provasChips = `<span class="btn-add-pdf" data-idx="${dIdx}" style="font-size: 10.5px; color: var(--text-muted); cursor: pointer; text-decoration: underline; white-space: nowrap;">+ Vincular PDF</span>`;
        }

        return `
          <tr style="border-bottom: 1px solid var(--background-modifier-border); transition: background 0.12s ease;">
            <td style="padding: 12px 12px; vertical-align: middle;">
              <div style="font-size: 13px; font-weight: 700; color: var(--text-normal);">${d.nome}</div>
            </td>
            <td style="padding: 12px 12px; vertical-align: middle; white-space: nowrap;">
              <span style="font-size: 10.5px; padding: 3px 8px; border-radius: 4px; background: rgba(255,255,255,0.06); color: var(--text-normal); border: 1px solid var(--background-modifier-border); display: inline-block;">
                ${d.area || d.categoria}
              </span>
            </td>
            <td style="padding: 12px 12px; vertical-align: middle;">
              <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
                ${provasChips}
              </div>
            </td>
            <td style="padding: 12px 12px; vertical-align: middle; color: var(--text-normal); white-space: nowrap;">${hTxt}</td>
            <td style="padding: 12px 12px; vertical-align: middle; white-space: nowrap;">${d.acertos}/${d.feitas}</td>
            <td style="padding: 12px 12px; vertical-align: middle; white-space: nowrap;">
              <div style="display: flex; align-items: center; gap: 8px; width: 100px;">
                <div class="abyssal-prog-track" style="height: 5px; flex: 1;">
                  <div class="abyssal-prog-fill" style="width: ${d.pct}%; background: ${d.pct >= 80 ? '#86efac' : d.pct >= 60 ? 'var(--text-normal)' : '#fca5a5'};"></div>
                </div>
                <span style="font-weight: bold; color: ${d.pct >= 80 ? '#86efac' : 'var(--text-normal)'}; font-size: 11px;">${d.pct}%</span>
              </div>
            </td>
            <td style="padding: 12px 12px; text-align: right; vertical-align: middle; white-space: nowrap;">
              <div style="display: flex; justify-content: flex-end; align-items: center; gap: 6px;">
                <button class="abyssal-btn-primary btn-foco-mat" data-idx="${dIdx}" style="font-size: 11px; padding: 4px 10px;">+ Foco</button>
                <button class="abyssal-btn-action btn-menu-disc" data-idx="${dIdx}" style="font-size: 13px; padding: 3px 8px; font-weight: bold;" title="Editar matéria e materiais">⋮</button>
              </div>
            </td>
          </tr>
        `;
      }).join('')}
    </tbody>
  `;

  tableEl.querySelectorAll('.btn-foco-mat').forEach(btn => {
    const idx = parseInt(btn.dataset.idx, 10);
    btn.onclick = () => abrirModalSessao(disciplinasFiltradas[idx]);
  });

  tableEl.querySelectorAll('.btn-menu-disc').forEach(btn => {
    const idx = parseInt(btn.dataset.idx, 10);
    btn.onclick = () => abrirModalEditarMateria(disciplinasFiltradas[idx]);
  });

  tableEl.querySelectorAll('.btn-add-pdf').forEach(btn => {
    const idx = parseInt(btn.dataset.idx, 10);
    btn.onclick = () => abrirModalVincularPdf(disciplinasFiltradas[idx]);
  });

  tableEl.querySelectorAll('.btn-open-pdf').forEach(span => {
    span.onclick = () => app.workspace.openLinkText(span.dataset.link, "", false);
  });
}

// ---------------------------------------------------------------------------
// 6. ABA: MEU PLANNER (CALENDÁRIO MENSAL COMPLETO - 7 COLUNAS ALINHADAS)
// ---------------------------------------------------------------------------
function renderAbaMeuPlanner(todasDisciplinas) {
  const container = root.createEl('div', { attr: { style: 'display: flex; flex-direction: column; gap: 14px;' } });
  const mesesNomes = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
  const diasSemanaNomes = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Cabeçalho do Calendário com Navegação Mensal
  const calHeader = container.createEl('div', { 
    cls: 'abyssal-card-box', 
    attr: { style: 'display: flex; justify-content: space-between; align-items: center; padding: 12px 18px; flex-wrap: wrap; gap: 10px;' } 
  });

  calHeader.innerHTML = `
    <div style="display: flex; align-items: center; gap: 12px;">
      <span class="abyssal-section-title">MEU PLANNER • CALENDÁRIO MENSAL</span>
      <span style="font-size: 11px; font-family: monospace; color: var(--text-muted);">Clique direto no dia para agendar estudo</span>
    </div>

    <div style="display: flex; align-items: center; gap: 8px;">
      <button id="btn-cal-prev" class="abyssal-btn-action" style="font-size: 11px; padding: 4px 10px;">←</button>
      <span id="cal-mes-atual" style="font-size: 13px; font-weight: 700; color: var(--text-normal); font-family: monospace; min-width: 140px; text-align: center;">
        ${mesesNomes[plannerMes]} de ${plannerAno}
      </span>
      <button id="btn-cal-next" class="abyssal-btn-action" style="font-size: 11px; padding: 4px 10px;">→</button>
      <button id="btn-cal-hoje" class="abyssal-nav-pill-btn" style="font-size: 10.5px; padding: 3px 8px; margin-left: 4px;">Hoje</button>
    </div>
  `;

  calHeader.querySelector('#btn-cal-prev').onclick = () => {
    if (plannerMes === 0) { plannerMes = 11; plannerAno--; }
    else { plannerMes--; }
    renderFrameworkEstudos();
  };

  calHeader.querySelector('#btn-cal-next').onclick = () => {
    if (plannerMes === 11) { plannerMes = 0; plannerAno++; }
    else { plannerMes++; }
    renderFrameworkEstudos();
  };

  calHeader.querySelector('#btn-cal-hoje').onclick = () => {
    plannerAno = now.getFullYear();
    plannerMes = now.getMonth();
    renderFrameworkEstudos();
  };

  // Grade do Calendário Mensal (Grid de 7 Colunas Perfeitas)
  const calGridWrapper = container.createEl('div', {
    cls: 'abyssal-card-box',
    attr: { style: 'padding: 14px; display: flex; flex-direction: column; gap: 8px;' }
  });

  // Cabeçalho dos 7 dias da semana
  const calWeekHeader = calGridWrapper.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px; text-align: center; border-bottom: 1px solid var(--background-modifier-border); padding-bottom: 8px;' }
  });

  diasSemanaNomes.forEach(dNome => {
    calWeekHeader.createEl('div', {
      attr: { style: 'font-size: 11px; font-family: monospace; font-weight: 700; color: var(--text-muted); text-transform: uppercase;' },
      text: dNome
    });
  });

  // Cálculos do Mês
  const primeiroDiaSemana = new Date(plannerAno, plannerMes, 1).getDay(); // 0 a 6
  const totalDiasMes = new Date(plannerAno, plannerMes + 1, 0).getDate();
  const diasMesAnterior = new Date(plannerAno, plannerMes, 0).getDate();

  const calDaysGrid = calGridWrapper.createEl('div', {
    attr: { style: 'display: grid; grid-template-columns: repeat(7, 1fr); gap: 6px;' }
  });

  // Células vazias do mês anterior
  for (let i = primeiroDiaSemana - 1; i >= 0; i--) {
    const diaNum = diasMesAnterior - i;
    const cellOut = calDaysGrid.createEl('div', {
      attr: { style: 'min-height: 80px; padding: 6px; border-radius: 6px; background: rgba(255,255,255,0.01); border: 1px dashed rgba(255,255,255,0.04); opacity: 0.35; display: flex; flex-direction: column; justify-content: space-between;' }
    });
    cellOut.innerHTML = `<span style="font-size: 10px; font-family: monospace; color: var(--text-muted); text-align: right;">${diaNum}</span>`;
  }

  // Células dos dias do mês atual
  for (let dia = 1; dia <= totalDiasMes; dia++) {
    const dStr = `${plannerAno}-${padTime(plannerMes + 1)}-${padTime(dia)}`;
    const isHoje = dStr === todayStr;
    const blocosDoDia = (estadoAtual.planner && estadoAtual.planner[dStr]) ? estadoAtual.planner[dStr] : [];

    const dayCell = calDaysGrid.createEl('div', {
      attr: {
        style: `min-height: 85px; padding: 6px 8px; border-radius: 6px; background: ${isHoje ? 'var(--background-secondary-alt)' : 'var(--background-secondary)'}; border: 1px solid ${isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--background-modifier-border)'}; display: flex; flex-direction: column; gap: 4px; cursor: pointer; transition: border-color 0.15s ease; position: relative;`
      }
    });

    dayCell.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        ${isHoje ? `<span style="font-size: 8.5px; padding: 1px 4px; border-radius: 3px; background: var(--interactive-accent, #60a5fa); color: #000000; font-weight: bold; font-family: monospace;">HOJE</span>` : '<span></span>'}
        <span style="font-size: 11px; font-family: monospace; font-weight: ${isHoje ? '800' : '600'}; color: ${isHoje ? 'var(--interactive-accent, #60a5fa)' : 'var(--text-normal)'}; text-align: right;">
          ${dia}
        </span>
      </div>
      <div class="day-blocos-box" style="display: flex; flex-direction: column; gap: 3px; flex: 1; overflow-y: auto;">
        ${blocosDoDia.map((b, bIdx) => `
          <div class="cal-bloco-pill" data-dia="${dStr}" data-idx="${bIdx}" style="padding: 2px 5px; border-radius: 3px; background: rgba(96, 165, 250, 0.16); border-left: 2px solid var(--interactive-accent, #60a5fa); font-size: 9.5px; font-family: monospace; color: var(--text-normal); display: flex; justify-content: space-between; align-items: center; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;" title="${b.materia} (${b.tempo || '1h'})">
            <span style="overflow: hidden; text-overflow: ellipsis;">${b.materia}</span>
            <span style="color: var(--text-muted); font-size: 8.5px; margin-left: 4px;">${b.tempo || '1h'}</span>
          </div>
        `).join('')}
      </div>
    `;

    // Clicar na célula abre popup para agendar bloco naquele dia
    dayCell.onclick = (e) => {
      if (e.target.closest('.cal-bloco-pill')) return;
      abrirModalAgendarBloco(todasDisciplinas, dStr);
    };

    // Clicar no bloco abre popup de ações do bloco
    dayCell.querySelectorAll('.cal-bloco-pill').forEach(pill => {
      pill.onclick = (e) => {
        e.stopPropagation();
        const dKey = pill.dataset.dia;
        const bIdx = parseInt(pill.dataset.idx, 10);
        abrirModalGerenciarBloco(dKey, bIdx, estadoAtual.planner[dKey][bIdx], todasDisciplinas);
      };
    });
  }

  // Popup de Agendamento de Bloco para a data clicada
  function abrirModalAgendarBloco(disciplinas, dataInicial = todayStr) {
    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
    
    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 400px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';

    modalBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; font-weight: bold; color: #ffffff;">Agendar Estudo • ${formatarDataBR(dataInicial)}</span>
        <button id="modal-close-plan" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
      </div>

      <div>
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Data:</div>
        <input id="modal-plan-data" type="date" value="${dataInicial}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>

      <div>
        <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Disciplina:</div>
        <select id="modal-plan-mat" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
          ${disciplinas.map(m => `<option value="${m.nome}">${m.nome} (${m.categoria})</option>`).join('')}
        </select>
      </div>

      <div style="display: flex; gap: 8px;">
        <div style="flex: 1;">
          <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Duração Estimada:</div>
          <input id="modal-plan-tempo" type="text" value="1h30m" placeholder="Ex: 50m, 1h, 2h" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
        </div>
        <div style="flex: 1;">
          <div style="font-size: 11px; font-family: monospace; color: #a1a1aa; margin-bottom: 4px;">Modalidade:</div>
          <select id="modal-plan-tipo" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
            <option value="Teoria">Teoria</option>
            <option value="Questões">Questões</option>
            <option value="Simulado / Prova">Simulado / Prova</option>
            <option value="Revisão">Revisão</option>
          </select>
        </div>
      </div>

      <div style="display: flex; justify-content: flex-end; gap: 8px; margin-top: 6px;">
        <button id="modal-cancel-plan" class="abyssal-btn-action" style="font-size: 11px;">Cancelar</button>
        <button id="modal-save-plan" class="abyssal-btn-primary" style="font-size: 11px;">Agendar Bloco</button>
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
      new Notice(`Bloco agendado para ${formatarDataBR(dataVal)}!`);
      fechar();
      renderFrameworkEstudos();
    };
  }

  // Popup para Gerenciar / Iniciar Foco de um Bloco Existente
  function abrirModalGerenciarBloco(dia, idx, bloco, disciplinas) {
    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';
    
    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 360px; width: 100%; padding: 20px; box-shadow: 0 10px 40px rgba(0,0,0,0.8); display: flex; flex-direction: column; gap: 12px; font-family: sans-serif;';

    const discObj = disciplinas.find(d => d.nome === bloco.materia);

    modalBox.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <span style="font-size: 14px; font-weight: bold; color: #ffffff;">Bloco de Estudo • ${formatarDataBR(dia)}</span>
        <button id="modal-close-mbloco" style="background: none; border: none; color: #71717a; cursor: pointer; font-size: 14px;">✕</button>
      </div>

      <div style="background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-radius: 6px; padding: 10px; display: flex; flex-direction: column; gap: 3px;">
        <div style="font-size: 13.5px; font-weight: bold; color: var(--text-normal);">${bloco.materia}</div>
        <div style="font-size: 11px; font-family: monospace; color: var(--text-muted);">${bloco.tempo} • ${bloco.tipo}</div>
      </div>

      <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 6px;">
        <button id="btn-del-bloco-act" class="abyssal-btn-action" style="font-size: 11px; color: #fca5a5;">Excluir Bloco</button>
        <button id="btn-foco-bloco-act" class="abyssal-btn-primary" style="font-size: 11px;">▶ Iniciar Foco</button>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });
    modalBox.querySelector('#modal-close-mbloco').onclick = fechar;

    modalBox.querySelector('#btn-del-bloco-act').onclick = async () => {
      estadoAtual.planner[dia].splice(idx, 1);
      await salvarEstadoEstudos(estadoAtual);
      new Notice("Bloco removido!");
      fechar();
      renderFrameworkEstudos();
    };

    modalBox.querySelector('#btn-foco-bloco-act').onclick = () => {
      fechar();
      abrirModalSessao(discObj);
    };
  }
}

// ---------------------------------------------------------------------------
// 7. ABA: REVISÕES ESPAÇADAS
// ---------------------------------------------------------------------------
function renderAbaRevisoes(todasDisciplinas) {
  const container = root.createEl('div', { cls: 'abyssal-card-box', attr: { style: 'display: flex; flex-direction: column; gap: 14px;' } });
  
  const revisoes = estadoAtual.revisoes || [];
  const revProgramadas = revisoes.filter(r => r.status === 'programada' && r.proximaRevisao >= todayStr);
  const revAtrasadas = revisoes.filter(r => r.status === 'programada' && r.proximaRevisao < todayStr);
  const revConcluidas = revisoes.filter(r => r.status === 'concluida');

  container.innerHTML = `
    <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
      <span class="abyssal-section-title">REVISÕES ESPAÇADAS • CURVA DE ESQUECIMENTO</span>
      <div style="display: flex; gap: 6px;">
        <button id="rev-tab-prog" class="abyssal-btn-mode ${revisaoFiltro === 'programadas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 8px;">
          PROGRAMADAS (${revProgramadas.length})
        </button>
        <button id="rev-tab-atra" class="abyssal-btn-mode ${revisaoFiltro === 'atrasadas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 8px;">
          ATRASADAS (${revAtrasadas.length})
        </button>
        <button id="rev-tab-conc" class="abyssal-btn-mode ${revisaoFiltro === 'concluidas' ? 'active' : ''}" style="font-size: 11px; padding: 3px 8px;">
          CONCLUÍDAS (${revConcluidas.length})
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
        ${revisaoFiltro === 'atrasadas' ? 'Nenhuma revisão atrasada.' : 'Nenhuma revisão nesta aba. Registre sessões para alimentar a repetição espaçada.'}
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
        <span style="font-size: 10px; font-family: monospace; padding: 2px 6px; border-radius: 4px; background: rgba(96, 165, 250, 0.15); color: #93c5fd; font-weight: bold;">
          ${rev.proximaRevisao === todayStr ? 'HOJE' : formatarDataBR(rev.proximaRevisao)}
        </span>
        <span class="prio-badge prio-media" style="font-size: 9.5px;">${badgeIntervalo}</span>
        <div style="display: flex; flex-direction: column;">
          <span style="font-size: 13px; font-weight: 700; color: var(--text-normal);">${rev.nome}</span>
          <span style="font-size: 10.5px; font-family: monospace; color: var(--text-muted);">${rev.tipo || 'Teoria + Questões'}</span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 8px;">
        ${rev.status !== 'concluida' ? `
          <button class="abyssal-btn-action btn-rev-open" style="font-size: 10.5px; padding: 3px 8px;">Abrir Nota</button>
          <button class="abyssal-btn-primary btn-rev-done" style="font-size: 10.5px; padding: 3px 10px;">✓ Concluir</button>
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
        new Notice(`Revisão concluída! Próxima em ${novoIntervalo} dias.`);
        renderFrameworkEstudos();
      };
    }
  });
}

// ---------------------------------------------------------------------------
// 8. ABA: CICLO DE ESTUDOS CONTÍNUO
// ---------------------------------------------------------------------------
function renderAbaCicloEstudos(todasDisciplinas) {
  const container = root.createEl('div', { cls: 'abyssal-card-box', attr: { style: 'display: flex; flex-direction: column; gap: 16px;' } });
  
  const filaCiclo = obterFilaDoCiclo(todasDisciplinas);
  let currentIdx = estadoAtual.disciplinaAtualIdx || 0;
  if (currentIdx >= filaCiclo.length) currentIdx = 0;
  const materiaVez = filaCiclo[currentIdx];

  // 8.1. CABEÇALHO DA ABA & BOTÃO DE ORGANIZAÇÃO
  const cicloHeader = container.createEl('div', {
    attr: { style: 'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;' }
  });

  cicloHeader.innerHTML = `
    <div>
      <span class="abyssal-section-title">CICLO DE ESTUDOS CONTÍNUO</span>
      <div style="font-size: 11px; font-family: monospace; color: var(--text-muted); margin-top: 2px;">
        ${filaCiclo.length} matéria(s) ativas na sua rotação de estudos
      </div>
    </div>
    <button id="btn-ciclo-organizar" class="abyssal-btn-action" style="font-size: 11px; padding: 5px 12px;">
      ⚙ Organizar Fila do Ciclo
    </button>
  `;

  cicloHeader.querySelector('#btn-ciclo-organizar').onclick = () => abrirModalOrganizarCiclo(todasDisciplinas);

  // 8.2. CARD DIDÁTICO: COMO FUNCIONA O CICLO DE ESTUDOS (Micro-Onboarding UX)
  const guiaCard = container.createEl('div', {
    attr: {
      style: 'background: rgba(96, 165, 250, 0.05); border: 1px solid rgba(96, 165, 250, 0.18); border-radius: 8px; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px;'
    }
  });

  guiaCard.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <span style="font-size: 11px; font-family: monospace; font-weight: bold; color: var(--interactive-accent, #60a5fa); text-transform: uppercase; letter-spacing: 0.05em;">
        💡 COMO FUNCIONA O CICLO DE ESTUDOS?
      </span>
      <span style="font-size: 10px; font-family: monospace; color: var(--text-muted);">Adeus à grade rígida de dias da semana</span>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 11.5px; color: var(--text-normal); line-height: 1.4;">
      <div style="background: rgba(255,255,255,0.02); border-radius: 6px; padding: 8px 10px; border: 1px solid rgba(255,255,255,0.05);">
        <b>1. Estude a Matéria da Vez:</b> Você não precisa decidir o que estudar hoje. Apenas clique em <i>▶ Iniciar Foco</i> na matéria indicada na fila.
      </div>
      <div style="background: rgba(255,255,255,0.02); border-radius: 6px; padding: 8px 10px; border: 1px solid rgba(255,255,255,0.05);">
        <b>2. Registre sua Sessão:</b> O tempo e as questões alimentam suas estatísticas reais e já agendam a revisão para a data certa (1d, 7d, 30d).
      </div>
      <div style="background: rgba(255,255,255,0.02); border-radius: 6px; padding: 8px 10px; border: 1px solid rgba(255,255,255,0.05);">
        <b>3. A Fila Avança Automaticamente:</b> Ao clicar em <i>Concluir & Avançar</i>, a próxima matéria entra na vez, garantindo ritmo contínuo em todas as áreas.
      </div>
    </div>
  `;

  // 8.3. CARD EM DESTAQUE: MATÉRIA DA VEZ
  if (materiaVez) {
    const vez = container.createEl('div', {
      attr: {
        style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 4px solid var(--interactive-accent, #60a5fa); border-radius: 8px; padding: 16px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;'
      }
    });

    vez.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <span style="font-size: 10.5px; font-family: monospace; font-weight: 700; color: var(--interactive-accent, #60a5fa); text-transform: uppercase;">
          MATÉRIA DA VEZ • POSIÇÃO ${currentIdx + 1} DE ${filaCiclo.length}
        </span>
        <span style="font-size: 18px; font-weight: 800; color: var(--text-normal);">${materiaVez.nome}</span>
        <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; font-family: monospace; color: var(--text-muted);">
          <span>Área: <b style="color: var(--text-normal);">${materiaVez.area || materiaVez.categoria}</b></span>
          <span>•</span>
          <span>Tempo focado acumulado: <b style="color: var(--text-normal);">${Math.floor(materiaVez.minutos / 60)}h${materiaVez.minutos % 60}m</b></span>
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
        <button id="btn-ciclo-open" class="abyssal-btn-action" style="font-size: 11px; padding: 6px 12px;">Abrir Nota</button>
        <button id="btn-ciclo-skip" class="abyssal-btn-action" style="font-size: 11px; padding: 6px 12px;" title="Pular matéria temporariamente">Pular Matéria ↷</button>
        <button id="btn-ciclo-reg" class="abyssal-btn-action" style="font-size: 11px; padding: 6px 14px;">▶ Iniciar Foco</button>
        <button id="btn-ciclo-next" class="abyssal-btn-primary" style="font-size: 11px; padding: 6px 16px;">✓ Concluir & Próxima →</button>
      </div>
    `;

    vez.querySelector('#btn-ciclo-open').onclick = () => app.workspace.openLinkText(materiaVez.path, "", false);
    vez.querySelector('#btn-ciclo-reg').onclick = () => abrirModalSessao(materiaVez);

    vez.querySelector('#btn-ciclo-skip').onclick = async () => {
      const prox = (currentIdx + 1) % filaCiclo.length;
      estadoAtual.disciplinaAtualIdx = prox;
      await salvarEstadoEstudos(estadoAtual);
      new Notice(`Matéria pulada. Agora na vez: ${filaCiclo[prox].nome}`);
      renderFrameworkEstudos();
    };

    vez.querySelector('#btn-ciclo-next').onclick = async () => {
      const prox = (currentIdx + 1) % filaCiclo.length;
      estadoAtual.disciplinaAtualIdx = prox;
      await salvarEstadoEstudos(estadoAtual);
      new Notice(`Ciclo avançado! Próxima matéria: ${filaCiclo[prox].nome}`);
      renderFrameworkEstudos();
    };

    // 8.4. TRILHA VISUAL DA FILA DO CICLO
    const trilhaBox = container.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 8px;' }
    });

    trilhaBox.createEl('span', {
      attr: { style: 'font-size: 10.5px; font-family: monospace; font-weight: bold; color: var(--text-muted); text-transform: uppercase; letter-spacing: 0.05em;' },
      text: 'Sequência da Fila (clique para pular direto para uma matéria):'
    });

    const trilha = trilhaBox.createEl('div', {
      attr: { style: 'display: flex; align-items: center; gap: 6px; overflow-x: auto; padding-bottom: 4px;' }
    });

    filaCiclo.forEach((m, idx) => {
      const isAtual = idx === currentIdx;
      const pill = trilha.createEl('div', {
        cls: `abyssal-nav-pill ${isAtual ? 'active' : ''}`,
        attr: {
          style: `font-size: 11px; font-family: monospace; padding: 5px 12px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; gap: 6px; ${isAtual ? 'border-color: var(--interactive-accent, #60a5fa); background: rgba(96, 165, 250, 0.15); font-weight: bold; color: var(--interactive-accent, #60a5fa);' : 'opacity: 0.75;'}`
        }
      });
      pill.innerHTML = `<span>${idx + 1}º</span> <span>${m.nome}</span>`;

      pill.onclick = async () => {
        estadoAtual.disciplinaAtualIdx = idx;
        await salvarEstadoEstudos(estadoAtual);
        renderFrameworkEstudos();
      };
    });
  } else {
    const vazio = container.createEl('div', {
      attr: { style: 'text-align: center; padding: 30px; font-size: 12px; font-family: monospace; color: var(--text-muted);' }
    });
    vazio.innerHTML = `
      Nenhuma matéria está ativa na fila do ciclo atualmente.<br>
      <button id="btn-ciclo-organizar-vazio" class="abyssal-btn-primary" style="margin-top: 12px; font-size: 11px; padding: 6px 14px;">
        ⚙ Organizar Fila do Ciclo
      </button>
    `;
    vazio.querySelector('#btn-ciclo-organizar-vazio').onclick = () => abrirModalOrganizarCiclo(todasDisciplinas);
  }
}

renderFrameworkEstudos();
