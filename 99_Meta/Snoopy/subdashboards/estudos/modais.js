/**
 * Snoopy Vault - Submódulo: Modais do Dashboard de Estudos
 * Gerencia a criação, edição rápida, ordenação do ciclo de estudos,
 * registro manual de sessões e vinculação de PDFs/apostilas.
 *
 * @module subdashboards/estudos/modais
 */

class ModaisEstudos {
  /**
   * Inicializa o gerenciador de modais de estudos.
   *
   * @param {object} ctx - Contexto de execução e dependências.
   * @param {object} ctx.app - Instância do Obsidian App.
   * @param {object} [ctx.dv] - Instância da API do Dataview.
   * @param {object} [ctx.estadoModulo] - Módulo de persistência e scanner (EstudosEstado).
   * @param {Function} ctx.getEstado - Função que retorna o estado atual em memória.
   * @param {Function} ctx.salvarEstado - Função assíncrona que persiste o estado atual.
   * @param {Function} [ctx.obterDisciplinas] - Função que retorna a lista de matérias processadas.
   * @param {Function} [ctx.onReload] - Callback para recarregar o framework após alterações.
   */
  constructor(ctx = {}) {
    this.app = ctx.app;
    this.dv = ctx.dv;
    this.estadoModulo = ctx.estadoModulo;
    this.getEstado = ctx.getEstado || (() => ({}));
    this.salvarEstado = ctx.salvarEstado || (async () => {});
    this.obterDisciplinas = ctx.obterDisciplinas || (() => []);
    this.onReload = ctx.onReload || (() => {});
  }

  /**
   * Formata números com dois dígitos (zero à esquerda).
   *
   * @private
   * @param {number} n - Número a formatar.
   * @returns {string}
   */
  _padTime(n) {
    return String(n).padStart(2, '0');
  }

  /**
   * Retorna a data atual no formato YYYY-MM-DD.
   *
   * @private
   * @returns {string}
   */
  _getTodayStr() {
    const d = new Date();
    return `${d.getFullYear()}-${this._padTime(d.getMonth() + 1)}-${this._padTime(d.getDate())}`;
  }

  /**
   * Exibe uma notificação no Obsidian de forma defensiva.
   *
   * @private
   * @param {string} msg - Mensagem a ser exibida.
   */
  _notify(msg) {
    if (typeof Notice !== 'undefined') {
      new Notice(msg);
    } else {
      console.warn(`[Snoopy Estudos] ${msg}`);
    }
  }

  /**
   * Abre o modal para cadastro de uma nova matéria.
   *
   * @param {string} [areaPadrao='Programação'] - Área inicial pré-selecionada.
   */
  abrirModalNovaMateria(areaPadrao = 'Programação') {
    const areaInicial = (areaPadrao && areaPadrao !== 'Todas') ? areaPadrao : 'Programação';
    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.82); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 480px; width: 100%; padding: 24px; display: flex; flex-direction: column; gap: 14px; font-family: var(--snoopy-font-sans);';

    const areasSugeridas = ['Programação', 'ENEM', 'Concurso', 'Vestibular', 'Economia', 'Faculdade', 'Geral'];

    modalBox.innerHTML = `
      <div class="snoopy-card-header">
        <div>
          <div class="snoopy-section-title">Nova Matéria de Estudo</div>
          <div class="snoopy-meta">Cadastre uma matéria para cronometrar, agendar e revisar</div>
        </div>
        <button id="modal-close-mat" class="snoopy-modal-close" title="Fechar"></button>
      </div>

      <div>
        <div class="snoopy-modal-label">1. Nome da Matéria:</div>
        <input id="modal-mat-nome" type="text" placeholder="Ex: Algoritmos, Física Mecânica, Direito Constitucional..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 9px; color: #ffffff; font-size: 12.5px; outline: none;">
      </div>

      <div>
        <div class="snoopy-modal-label">2. Área / Objetivo:</div>
        <div id="modal-chips-area" style="display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 8px;">
          ${areasSugeridas.map(a => `
            <button type="button" class="chip-area-opt" data-area="${a}" style="background: rgba(255,255,255,0.06); border: 1px solid rgba(255,255,255,0.12); border-radius: 4px; padding: 3px 9px; font-size: 11px; color: #e4e4e7; cursor: pointer;">
              ${a}
            </button>
          `).join('')}
        </div>
        <input id="modal-mat-area" type="text" value="${areaInicial}" placeholder="Ou digite outra área personalizada..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>

      <div>
        <div class="snoopy-modal-label">3. Material / Provas / Apostila (Opcional):</div>
        <input id="modal-mat-pdf" type="text" placeholder="Ex: [[provas/ENEM_2024.pdf]] ou Simulado.pdf" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 11.5px; outline: none;">
        <div style="font-size: 10px; color: #71717a; margin-top: 3px;">Você poderá abrir os PDFs diretamente pela tabela.</div>
      </div>

      <div style="background: rgba(96, 165, 250, 0.08); border: 1px solid rgba(96, 165, 250, 0.2); border-radius: 6px; padding: 10px; display: flex; align-items: center; gap: 8px;">
        <input id="modal-mat-ciclo" type="checkbox" checked style="cursor: pointer; width: 15px; height: 15px;">
        <label for="modal-mat-ciclo" style="font-size: 11.5px; color: #e0e7ff; cursor: pointer;">
          <b>Incluir na Fila do Ciclo de Estudos</b> (para estudar na rotação contínua)
        </label>
      </div>

      <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 6px;">
        <button id="modal-cancel-mat" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
        <button id="modal-save-mat" class="snoopy-btn-primary snoopy-btn-sm">Criar Matéria</button>
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
        this._notify("Informe o nome da matéria.");
        return;
      }

      const cleanNome = nome.replace(/[\\/:*?"<>|]/g, '-').trim();
      const filePath = `03_Estudos/${cleanNome}.md`;

      if (!this.app.vault.getAbstractFileByPath("03_Estudos")) {
        await this.app.vault.createFolder("03_Estudos").catch(() => {});
      }

      const provasArrayStr = pdf ? `["${pdf}"]` : `[]`;

      const content = `---
title: "${cleanNome}"
area: "${area}"
categoria: "${area}"
disciplina: "${area}"
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

      await this.app.vault.create(filePath, content);

      const estado = this.getEstado();
      if (incluirCiclo) {
        if (!Array.isArray(estado.cicloOrdem)) estado.cicloOrdem = [];
        if (!estado.cicloOrdem.includes(cleanNome)) {
          estado.cicloOrdem.push(cleanNome);
          await this.salvarEstado();
        }
      }

      this._notify(`Matéria "${cleanNome}" cadastrada com sucesso!`);
      fechar();
      this.onReload();
    };

    setTimeout(() => {
      const el = modalBox.querySelector('#modal-mat-nome');
      if (el) el.focus();
    }, 50);
  }

  /**
   * Abre o modal de edição rápida de uma matéria existente.
   *
   * @param {object} disc - Objeto da disciplina selecionada.
   */
  abrirModalEditarMateria(disc) {
    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.82); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 460px; width: 100%; padding: 24px; display: flex; flex-direction: column; gap: 14px; font-family: var(--snoopy-font-sans);';

    const provasStr = (disc.provas || []).join(', ');
    const estado = this.getEstado();
    const estaNoCiclo = Array.isArray(estado.cicloOrdem) && estado.cicloOrdem.includes(disc.nome);

    modalBox.innerHTML = `
      <div class="snoopy-card-header">
        <div>
          <div class="snoopy-section-title">Editar Matéria: ${disc.nome}</div>
          <div class="snoopy-meta">Ajuste área, materiais anexos e métricas reais</div>
        </div>
        <button id="modal-close-edit" class="snoopy-modal-close" title="Fechar"></button>
      </div>

      <div>
        <div class="snoopy-modal-label">Área / Objetivo:</div>
        <input id="modal-edit-area" type="text" value="${disc.area || disc.categoria || ''}" placeholder="Ex: Programação, ENEM, Concurso..." style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;">
      </div>

      <div>
        <div class="snoopy-modal-label">Provas & PDFs Anexos (separados por vírgula):</div>
        <input id="modal-edit-provas" type="text" value="${provasStr}" placeholder="Ex: [[ENEM_2024.pdf]], [[Simulado.pdf]]" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>

      <div>
        <div class="snoopy-modal-label">Métricas Acumuladas:</div>
        <div style="display: flex; gap: 8px;">
          <div style="flex: 1;">
            <div style="font-size: 10px; color: #a1a1aa; margin-bottom: 2px;">Minutos de Foco:</div>
            <input id="modal-edit-min" type="number" min="0" value="${disc.minutos || 0}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 12px; outline: none;">
          </div>
          <div style="flex: 1;">
            <div style="font-size: 10px; color: #a1a1aa; margin-bottom: 2px;">Questões Feitas:</div>
            <input id="modal-edit-feitas" type="number" min="0" value="${disc.feitas || 0}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 12px; outline: none;">
          </div>
          <div style="flex: 1;">
            <div style="font-size: 10px; color: #a1a1aa; margin-bottom: 2px;">Acertos:</div>
            <input id="modal-edit-acertos" type="number" min="0" value="${disc.acertos || 0}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 12px; outline: none;">
          </div>
        </div>
      </div>

      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.08); border-radius: 6px; padding: 10px; display: flex; align-items: center; gap: 8px;">
        <input id="modal-edit-ciclo" type="checkbox" ${estaNoCiclo ? 'checked' : ''} style="cursor: pointer; width: 15px; height: 15px;">
        <label for="modal-edit-ciclo" style="font-size: 11.5px; color: #e4e4e7; cursor: pointer;">
          Participa da Fila do Ciclo de Estudos
        </label>
      </div>

      <div class="snoopy-card-header" style="margin-top: 6px; margin-bottom: 0;">
        <button id="modal-open-note" class="snoopy-btn-action snoopy-btn-sm">Abrir Arquivo Físico</button>
        <div class="snoopy-toolbar">
          <button id="modal-cancel-edit" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
          <button id="modal-save-edit" class="snoopy-btn-primary snoopy-btn-sm">Salvar Alterações</button>
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
      if (this.app.workspace && this.app.workspace.openLinkText) {
        this.app.workspace.openLinkText(disc.path, "", false);
      }
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

      const file = this.app.vault.getAbstractFileByPath(disc.path);
      if (file) {
        const raw = await this.app.vault.read(file);
        let updated = raw;

        if (/area:\s*["'][^"']*["']/.test(updated)) updated = updated.replace(/area:\s*["'][^"']*["']/, `area: "${nArea}"`);
        else if (updated.startsWith('---')) updated = updated.replace(/^---\n/, `---\narea: "${nArea}"\n`);

        if (/categoria:\s*["'][^"']*["']/.test(updated)) updated = updated.replace(/categoria:\s*["'][^"']*["']/, `categoria: "${nArea}"`);
        else if (/categoria:\s*[^\n]+/.test(updated)) updated = updated.replace(/categoria:\s*[^\n]+/, `categoria: "${nArea}"`);

        if (/disciplina:\s*["'][^"']*["']/.test(updated)) updated = updated.replace(/disciplina:\s*["'][^"']*["']/, `disciplina: "${nArea}"`);
        else if (updated.startsWith('---')) updated = updated.replace(/^---\n/, `---\ndisciplina: "${nArea}"\n`);

        if (/minutos_foco:\s*\d+/.test(updated)) updated = updated.replace(/minutos_foco:\s*\d+/, `minutos_foco: ${nMin}`);
        else if (updated.startsWith('---')) updated = updated.replace(/^---\n/, `---\nminutos_foco: ${nMin}\n`);

        if (/questoes_feitas:\s*\d+/.test(updated)) updated = updated.replace(/questoes_feitas:\s*\d+/, `questoes_feitas: ${nFeitas}`);
        else if (updated.startsWith('---')) updated = updated.replace(/^---\n/, `---\nquestoes_feitas: ${nFeitas}\n`);

        if (/questoes_acertos:\s*\d+/.test(updated)) updated = updated.replace(/questoes_acertos:\s*\d+/, `questoes_acertos: ${nAcertos}`);
        else if (updated.startsWith('---')) updated = updated.replace(/^---\n/, `---\nquestoes_acertos: ${nAcertos}\n`);

        if (/provas:\s*\[[^\]]*\]/.test(updated)) updated = updated.replace(/provas:\s*\[[^\]]*\]/, `provas: ${nProvasJson}`);
        else if (updated.startsWith('---')) updated = updated.replace(/^---\n/, `---\nprovas: ${nProvasJson}\n`);

        await this.app.vault.modify(file, updated);
      }

      const st = this.getEstado();
      if (!Array.isArray(st.cicloOrdem)) st.cicloOrdem = [];
      const indexNoCiclo = st.cicloOrdem.indexOf(disc.nome);
      if (querNoCiclo && indexNoCiclo === -1) {
        st.cicloOrdem.push(disc.nome);
        await this.salvarEstado();
      } else if (!querNoCiclo && indexNoCiclo !== -1) {
        st.cicloOrdem.splice(indexNoCiclo, 1);
        await this.salvarEstado();
      }

      this._notify(`Matéria "${disc.nome}" atualizada!`);
      fechar();
      this.onReload();
    };
  }

  /**
   * Abre o modal para ordenar e configurar as matérias do ciclo contínuo de estudos.
   *
   * @param {Array<object>} todasDisciplinas - Lista de todas as disciplinas cadastradas.
   */
  abrirModalOrganizarCiclo(rawDisciplinas) {
    const todasDisciplinas = [];
    if (rawDisciplinas && typeof rawDisciplinas.forEach === 'function') {
      rawDisciplinas.forEach(d => todasDisciplinas.push(d));
    }

    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.85); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 520px; width: 100%; padding: 24px; display: flex; flex-direction: column; gap: 14px; font-family: var(--snoopy-font-sans);';

    const estado = this.getEstado();
    let filaTemp = Array.isArray(estado.cicloOrdem) && estado.cicloOrdem.length > 0
      ? estado.cicloOrdem.map(chave => {
          const found = todasDisciplinas.find(d => d.nome === chave || d.path === chave || (d.file && d.file.name === chave));
          return found ? found.nome : chave;
        })
      : todasDisciplinas.map(d => d.nome);

    filaTemp = Array.from(new Set(filaTemp)).filter(nome => todasDisciplinas.some(d => d.nome === nome));

    modalBox.innerHTML = `
      <div class="snoopy-card-header">
        <div>
          <div class="snoopy-section-title">Organizar Fila do Ciclo</div>
          <div class="snoopy-meta">Defina a ordem contínua em que as matérias serão estudadas</div>
        </div>
        <button id="modal-close-ciclo-cfg" class="snoopy-modal-close" title="Fechar"></button>
      </div>

      <div style="background: rgba(255,255,255,0.03); border: 1px solid rgba(255,255,255,0.07); border-radius: 6px; padding: 10px; font-size: 11.5px; color: #d4d4d8; line-height: 1.4;">
        <b>Como funciona:</b> A fila roda do item 1 até o último e recomeça. Use as setas para ajustar quem vem primeiro. Desmarque matérias que você não deseja estudar nesta fase.
      </div>

      <div id="modal-ciclo-lista" style="display: flex; flex-direction: column; gap: 6px; max-height: 280px; overflow-y: auto; padding-right: 4px;">
      </div>

      <div class="snoopy-card-header" style="margin-top: 8px; margin-bottom: 0;">
        <button id="modal-ciclo-reset" class="snoopy-btn-action snoopy-btn-sm">Restaurar Padrão</button>
        <div class="snoopy-toolbar">
          <button id="modal-ciclo-cancel" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
          <button id="modal-ciclo-save" class="snoopy-btn-primary snoopy-btn-sm">Salvar Fila do Ciclo</button>
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
        listEl.innerHTML = '<div class="snoopy-meta" style="text-align: center; padding: 20px;">Nenhuma matéria cadastrada.</div>';
        return;
      }

      filaTemp.forEach((nome, idx) => {
        const disc = todasDisciplinas.find(d => d.nome === nome);
        if (!disc) return;

        const item = document.createElement('div');
        item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 7px 10px;';
        item.innerHTML = `
          <div style="display: flex; align-items: center; gap: 8px; overflow: hidden;">
            <span class="snoopy-meta" style="font-size: 11px; font-weight: bold; color: var(--interactive-accent, #60a5fa); width: 22px;">${idx + 1}º</span>
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 12px; font-weight: bold; color: #ffffff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${disc.nome}</span>
              <span class="snoopy-micro" style="color: #a1a1aa;">${disc.area || disc.categoria}</span>
            </div>
          </div>
          <div class="snoopy-toolbar">
            <button class="btn-subir snoopy-btn-icon" data-idx="${idx}" ${idx === 0 ? 'disabled style="opacity: 0.3;"' : ''}>▲</button>
            <button class="btn-descer snoopy-btn-icon" data-idx="${idx}" ${idx === filaTemp.length - 1 ? 'disabled style="opacity: 0.3;"' : ''}>▼</button>
            <button class="btn-remover-fila snoopy-btn-icon snoopy-btn-danger" data-idx="${idx}" title="Remover da rotação">✕</button>
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

      const foraDaFila = todasDisciplinas.filter(d => !filaTemp.includes(d.nome));
      if (foraDaFila.length > 0) {
        const sep = document.createElement('div');
        sep.className = 'snoopy-micro';
        sep.style.cssText = 'color: #71717a; text-transform: uppercase; margin-top: 8px; margin-bottom: 2px;';
        sep.innerText = 'Matérias fora da rotação (clique em + para incluir):';
        listEl.appendChild(sep);

        foraDaFila.forEach(disc => {
          const item = document.createElement('div');
          item.style.cssText = 'display: flex; justify-content: space-between; align-items: center; background: rgba(255,255,255,0.02); border: 1px dashed rgba(255,255,255,0.08); border-radius: 6px; padding: 6px 10px; opacity: 0.8;';
          item.innerHTML = `
            <div style="display: flex; flex-direction: column;">
              <span style="font-size: 11.5px; color: #d4d4d8;">${disc.nome}</span>
              <span class="snoopy-micro" style="color: #71717a;">${disc.area || disc.categoria}</span>
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
      const st = this.getEstado();
      st.cicloOrdem = [...filaTemp];
      if (st.disciplinaAtualIdx >= st.cicloOrdem.length) {
        st.disciplinaAtualIdx = 0;
      }
      await this.salvarEstado();
      this._notify("Fila do Ciclo de Estudos atualizada!");
      fechar();
      this.onReload();
    };
  }

  /**
   * Abre o modal para registrar uma sessão de foco e questões.
   *
   * @param {object} [materiaPreSelecionada=null] - Disciplina opcionalmente pré-selecionada.
   */
  abrirModalSessao(materiaPreSelecionada = null) {
    const rawDiscs = this.obterDisciplinas();
    const disciplinas = [];
    if (rawDiscs && typeof rawDiscs.forEach === 'function') {
      rawDiscs.forEach(d => disciplinas.push(d));
    }
    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 440px; width: 100%; padding: 20px; display: flex; flex-direction: column; gap: 12px; font-family: var(--snoopy-font-sans);';

    modalBox.innerHTML = `
      <div class="snoopy-card-header">
        <span class="snoopy-section-title">Registrar Estudo & Questões</span>
        <button id="modal-close-sess" class="snoopy-modal-close" title="Fechar"></button>
      </div>

      <div>
        <div class="snoopy-modal-label">Disciplina:</div>
        <select id="modal-sess-mat" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
          ${disciplinas.map(m => `
            <option value="${m.path}" ${materiaPreSelecionada && materiaPreSelecionada.path === m.path ? 'selected' : ''}>
              ${m.nome} (${m.categoria || m.area || 'Geral'})
            </option>
          `).join('')}
        </select>
      </div>

      <div style="display: flex; gap: 8px;">
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Tempo de Foco (minutos):</div>
          <input id="modal-sess-min" type="number" min="0" value="50" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
        </div>
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Modalidade:</div>
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
          <div class="snoopy-modal-label">Questões Feitas:</div>
          <input id="modal-sess-feitas" type="number" min="0" value="10" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #ffffff; font-size: 11.5px; outline: none;">
        </div>
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Acertos:</div>
          <input id="modal-sess-acertos" type="number" min="0" value="8" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #86efac; font-weight: bold; font-size: 11.5px; outline: none;">
        </div>
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Erros:</div>
          <input id="modal-sess-erros" type="number" min="0" value="2" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 6px; color: #fca5a5; font-weight: bold; font-size: 11.5px; outline: none;">
        </div>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; margin-top: 4px;">
        <input id="modal-sess-rev" type="checkbox" checked style="accent-color: var(--text-normal); cursor: pointer;">
        <label for="modal-sess-rev" style="font-size: 11.5px; color: #a1a1aa; cursor: pointer;">
          Programar Revisão Espaçada inicial (1 dia)
        </label>
      </div>

      <div style="display: flex; align-items: center; gap: 8px; margin-top: 2px;">
        <input id="modal-sess-sync-home" type="checkbox" checked style="accent-color: var(--text-normal); cursor: pointer;">
        <label for="modal-sess-sync-home" style="font-size: 11.5px; color: #e0e7ff; cursor: pointer;">
          Registrar sessão concluída na Nota Diária da Home
        </label>
      </div>

      <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 6px;">
        <button id="modal-cancel-sess" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
        <button id="modal-save-sess" class="snoopy-btn-primary snoopy-btn-sm">Salvar Sessão</button>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });
    modalBox.querySelector('#modal-close-sess').onclick = fechar;
    modalBox.querySelector('#modal-cancel-sess').onclick = fechar;

    const inpFeitasMod = modalBox.querySelector('#modal-sess-feitas');
    const inpAcertosMod = modalBox.querySelector('#modal-sess-acertos');
    const inpErrosMod = modalBox.querySelector('#modal-sess-erros');
    const syncErrosMod = () => {
      if (!inpFeitasMod || !inpAcertosMod || !inpErrosMod) return;
      const f = parseInt(inpFeitasMod.value, 10) || 0;
      const a = parseInt(inpAcertosMod.value, 10) || 0;
      inpErrosMod.value = String(Math.max(0, f - a));
    };
    if (inpFeitasMod) inpFeitasMod.oninput = syncErrosMod;
    if (inpAcertosMod) inpAcertosMod.oninput = syncErrosMod;

    modalBox.querySelector('#modal-save-sess').onclick = async () => {
      const matPath = modalBox.querySelector('#modal-sess-mat').value;
      const minutos = parseInt(modalBox.querySelector('#modal-sess-min').value, 10) || 0;
      const tipo = modalBox.querySelector('#modal-sess-tipo').value;
      const feitas = parseInt(modalBox.querySelector('#modal-sess-feitas').value, 10) || 0;
      const acertos = parseInt(modalBox.querySelector('#modal-sess-acertos').value, 10) || 0;
      const agendarRev = modalBox.querySelector('#modal-sess-rev').checked;
      const syncHomeEl = modalBox.querySelector('#modal-sess-sync-home');
      const syncHome = syncHomeEl ? syncHomeEl.checked : true;

      const file = this.app.vault.getAbstractFileByPath(matPath);
      const nomeMateria = file ? file.basename : "Estudos";
      const todayStr = this._getTodayStr();
      const st = this.getEstado();

      if (!st.historicoDiario) st.historicoDiario = {};
      if (!st.historicoDiario[todayStr]) {
        st.historicoDiario[todayStr] = { minutosFoco: 0, questoesFeitas: 0, questoesAcertos: 0 };
      }
      st.historicoDiario[todayStr].minutosFoco += minutos;
      st.historicoDiario[todayStr].questoesFeitas += feitas;
      st.historicoDiario[todayStr].questoesAcertos += acertos;

      if (agendarRev && file) {
        const agora = new Date();
        const amanha = new Date(agora.getTime() + 86400000);
        const amanhaStr = `${amanha.getFullYear()}-${this._padTime(amanha.getMonth() + 1)}-${this._padTime(amanha.getDate())}`;
        if (!Array.isArray(st.revisoes)) st.revisoes = [];
        st.revisoes = st.revisoes.filter(r => r.materiaPath !== matPath);
        st.revisoes.push({
          materiaPath: matPath,
          nome: nomeMateria,
          ultimaRevisao: todayStr,
          proximaRevisao: amanhaStr,
          intervaloDias: 1,
          tipo: tipo,
          status: 'programada'
        });
      }

      await this.salvarEstado();

      if (file) {
        const raw = await this.app.vault.read(file);
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

        await this.app.vault.modify(file, updated);
      }

      if (syncHome && this.app && this.app.vault) {
        try {
          const dailyPath = `01_Inbox/Diário/${todayStr}.md`;
          const resumoQuestoes = feitas > 0 ? ` • ${acertos}/${feitas} questões` : '';
          const linhaSessao = `- [x] Sessão de estudo: [[03_Estudos/${nomeMateria}.md|${nomeMateria}]] (${minutos}m${resumoQuestoes}) 📅 ${todayStr} ✅ ${todayStr} #estudo`;
          const dailyFile = this.app.vault.getAbstractFileByPath(dailyPath);
          if (dailyFile) {
            let content = await this.app.vault.read(dailyFile);
            if (/##\s+Tarefas/i.test(content)) {
              content = content.replace(/(##\s+Tarefas[^\n]*\n)/i, `$1${linhaSessao}\n`);
            } else {
              content = `${content.trimEnd()}\n\n## Tarefas\n${linhaSessao}\n`;
            }
            await this.app.vault.modify(dailyFile, content);
          }
        } catch (err) {
          console.error('[Snoopy Estudos] Erro ao sincronizar sessão com Nota Diária:', err);
        }
      }

      this._notify(`Sessão registrada: ${minutos}m em ${nomeMateria}!`);
      fechar();
      this.onReload();
    };
  }

  /**
   * Abre o modal para vincular um PDF diretamente a uma disciplina.
   *
   * @param {object} disc - Objeto da disciplina selecionada.
   */
  abrirModalVincularPdf(disc) {
    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.8); backdrop-filter: blur(4px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 420px; width: 100%; padding: 20px; display: flex; flex-direction: column; gap: 12px; font-family: var(--snoopy-font-sans);';

    modalBox.innerHTML = `
      <div class="snoopy-card-header">
        <span class="snoopy-section-title">Vincular Prova / PDF</span>
        <button id="modal-close-vinc" class="snoopy-modal-close" title="Fechar"></button>
      </div>
      <div style="font-size: 12px; color: #a1a1aa;">Disciplina: <b>${disc.nome}</b></div>

      <div>
        <div class="snoopy-modal-label">Link ou Nome do Arquivo PDF:</div>
        <input id="modal-vinc-input" type="text" placeholder="Ex: [[provas/ENEM_2024.pdf]] ou Simulado.pdf" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.1); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 11.5px; outline: none;">
      </div>

      <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 6px;">
        <button id="modal-cancel-vinc" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
        <button id="modal-save-vinc" class="snoopy-btn-primary snoopy-btn-sm">Salvar Vínculo</button>
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

      const file = this.app.vault.getAbstractFileByPath(disc.path);
      if (file) {
        const raw = await this.app.vault.read(file);
        let updated = raw;
        if (/provas:\s*\[[^\]]*\]/.test(updated)) {
          updated = updated.replace(/provas:\s*\[(.*?)\]/, (match, p1) => {
            const items = p1.trim() ? `${p1.trim()}, "${val}"` : `"${val}"`;
            return `provas: [${items}]`;
          });
        } else if (updated.startsWith('---')) {
          updated = updated.replace(/^---\n/, `---\nprovas: ["${val}"]\n`);
        }
        await this.app.vault.modify(file, updated);
        this._notify(`Prova / PDF vinculado a ${disc.nome}!`);
        fechar();
        this.onReload();
      }
    };
  }

  /**
   * Abre o modal para criar uma tarefa vinculada à matéria na nota diária.
   * A tarefa é persistida com metadados padrão do cofre (data, pomodoros e tag #estudo)
   * integrando-se nativamente com a tabela principal de tarefas da Home.
   *
   * @param {object} disc - Objeto da matéria selecionada.
   */
  abrirModalCriarTarefaMateria(disc = {}) {
    if (!disc || !disc.nome) return;

    const modalBg = document.createElement('div');
    modalBg.style.cssText = 'position: fixed; inset: 0; background: rgba(0,0,0,0.82); backdrop-filter: blur(5px); display: flex; align-items: center; justify-content: center; z-index: 9999; padding: 20px;';

    const modalBox = document.createElement('div');
    modalBox.style.cssText = 'background: #111118; border: 1px solid rgba(255,255,255,0.15); border-radius: 12px; max-width: 440px; width: 100%; padding: 22px; display: flex; flex-direction: column; gap: 14px; font-family: var(--snoopy-font-sans);';

    const todayStr = this._getTodayStr();
    const cleanNome = disc.nome;

    modalBox.innerHTML = `
      <div class="snoopy-card-header">
        <div>
          <div class="snoopy-section-title">Agendar Tarefa de Estudo</div>
          <div class="snoopy-meta">Vincular ${cleanNome} à lista principal de tarefas</div>
        </div>
        <button id="modal-close-task" class="snoopy-modal-close" title="Fechar"></button>
      </div>

      <div>
        <div class="snoopy-modal-label">Descrição da Tarefa:</div>
        <input id="modal-task-desc" type="text" value="Estudar [[03_Estudos/${cleanNome}.md|${cleanNome}]]" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 8px; color: #ffffff; font-size: 12px; outline: none;">
      </div>

      <div style="display: flex; gap: 10px;">
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Data Agendada:</div>
          <input id="modal-task-date" type="date" value="${todayStr}" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
        </div>
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Período:</div>
          <select id="modal-task-period" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
            <option value="">Geral</option>
            <option value="🌅 Manhã">Manhã</option>
            <option value="☀️ Tarde">Tarde</option>
            <option value="🌙 Noite">Noite</option>
          </select>
        </div>
      </div>

      <div style="display: flex; gap: 10px;">
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Prioridade:</div>
          <select id="modal-task-prio" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
            <option value="">Normal</option>
            <option value="⏫">Alta (⏫)</option>
            <option value="🔼">Média (🔼)</option>
            <option value="🔽">Baixa (🔽)</option>
          </select>
        </div>
        <div style="flex: 1;">
          <div class="snoopy-modal-label">Pomodoros (Estimativa):</div>
          <input id="modal-task-pomos" type="number" min="1" max="12" value="2" style="width: 100%; background: #181824; border: 1px solid rgba(255,255,255,0.12); border-radius: 6px; padding: 7px; color: #ffffff; font-size: 11.5px; outline: none;">
        </div>
      </div>

      <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 6px;">
        <button id="modal-cancel-task" class="snoopy-btn-action snoopy-btn-sm">Cancelar</button>
        <button id="modal-save-task" class="snoopy-btn-primary snoopy-btn-sm">Agendar Tarefa</button>
      </div>
    `;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => { if (modalBg.parentNode) document.body.removeChild(modalBg); };
    modalBg.addEventListener('click', (e) => { if (e.target === modalBg) fechar(); });

    modalBox.querySelector('#modal-close-task').onclick = fechar;
    modalBox.querySelector('#modal-cancel-task').onclick = fechar;

    modalBox.querySelector('#modal-save-task').onclick = async () => {
      const desc = modalBox.querySelector('#modal-task-desc').value.trim();
      const dateVal = modalBox.querySelector('#modal-task-date').value || todayStr;
      const periodVal = modalBox.querySelector('#modal-task-period').value;
      const prioVal = modalBox.querySelector('#modal-task-prio').value;
      const pomosVal = parseInt(modalBox.querySelector('#modal-task-pomos').value, 10) || 2;

      if (!desc) {
        this._notify("A descrição da tarefa não pode estar vazia.");
        return;
      }

      let taskLine = `- [ ] ${desc} 📅 ${dateVal}`;
      if (prioVal) taskLine += ` ${prioVal}`;
      if (periodVal) taskLine += ` ${periodVal}`;
      taskLine += ` 🍅 ${pomosVal} #estudo`;

      const dailyFolder = "01_Inbox/Diário";
      const dailyPath = `${dailyFolder}/${dateVal}.md`;

      if (!this.app.vault.getAbstractFileByPath(dailyFolder)) {
        await this.app.vault.createFolder(dailyFolder).catch(() => {});
      }

      let dailyFile = this.app.vault.getAbstractFileByPath(dailyPath);
      if (!dailyFile) {
        const defaultDailyContent = `# Diário - ${dateVal}\n\n## Tarefas\n${taskLine}\n\n## Notas do Dia\n`;
        await this.app.vault.create(dailyPath, defaultDailyContent);
      } else {
        const raw = await this.app.vault.read(dailyFile);
        let updated = raw;
        const regexTarefas = /(^##\s+.*Tarefas.*$)/m;
        const match = updated.match(regexTarefas);
        if (match) {
          updated = updated.replace(match[0], `${match[0]}\n${taskLine}`);
        } else {
          updated += `\n\n## Tarefas\n${taskLine}\n`;
        }
        await this.app.vault.modify(dailyFile, updated);
      }

      // Vinculação total: Adiciona também ao Planner do ciclo de estudos
      const estadoAtual = typeof this.getEstado === 'function' ? this.getEstado() : null;
      if (estadoAtual) {
        if (!estadoAtual.planner) estadoAtual.planner = {};
        if (!Array.isArray(estadoAtual.planner[dateVal])) estadoAtual.planner[dateVal] = [];
        const jaPlanejado = estadoAtual.planner[dateVal].some(b => b.materia === cleanNome);
        if (!jaPlanejado) {
          estadoAtual.planner[dateVal].push({
            materia: cleanNome,
            tipo: 'TEORIA',
            duracaoMin: pomosVal * 25,
            concluido: false
          });
          if (typeof this.salvarEstado === 'function') {
            await this.salvarEstado();
          }
        }
      }

      this._notify(`Tarefa de ${cleanNome} agendada para ${dateVal}!`);
      fechar();
      this.onReload();
    };
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModaisEstudos;
}

return ModaisEstudos;

