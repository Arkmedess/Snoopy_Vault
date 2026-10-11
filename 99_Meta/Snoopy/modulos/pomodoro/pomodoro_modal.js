/**
 * Snoopy Vault - Submódulo: Modais e Persistência do Pomodoro
 * Gerencia a janela modal de aprendizado pós-ciclo, criação de flashcards,
 * registro em notas diárias e sincronização do histórico com o ciclo de estudos.
 *
 * @module modulos/pomodoro/pomodoro_modal
 */

class PomodoroModal {
  /**
   * Inicializa o gerenciador de anotações e persistência de sessões de foco.
   *
   * @param {object} ctx - Contexto compartilhado.
   * @param {object} ctx.app - Instância global do Obsidian.
   * @param {object} ctx.ModalFactory - Fábrica de modais do Vault.
   * @param {object} ctx.VaultStore - Microsserviço de manipulação de Markdown.
   * @param {Function} ctx.garantirNotaDiaria - Função assíncrona que retorna TFile da nota diária.
   * @param {string} ctx.todayStr - Data atual ISO.
   * @param {Function} [ctx.padTime] - Função de formatação de 2 dígitos.
   * @param {Function} [ctx.onPausaIniciar] - Callback para iniciar a pausa após fechar/salvar.
   */
  constructor(ctx = {}) {
    this.app = ctx.app;
    this.ModalFactory = ctx.ModalFactory;
    this.VaultStore = ctx.VaultStore;
    this.garantirNotaDiaria = ctx.garantirNotaDiaria || (async () => null);
    this.todayStr = ctx.todayStr || '';
    this.padTime = ctx.padTime || ((n) => String(n).padStart(2, '0'));
    this.onPausaIniciar = ctx.onPausaIniciar || (() => {});
  }

  /**
   * Exibe notificação de forma defensiva.
   *
   * @private
   * @param {string} msg - Mensagem a exibir.
   */
  _notify(msg) {
    if (typeof Notice !== 'undefined') {
      new Notice(msg);
    } else {
      console.warn(`[Snoopy Pomodoro] ${msg}`);
    }
  }

  /**
   * Grava linha de log e flashcards na nota diária correspondente.
   *
   * @param {string} texto - Resumo do que foi aprendido.
   * @param {string|null} perguntaFc - Pergunta ou conceito do flashcard.
   * @param {string|null} respostaFc - Resposta ou definição do flashcard.
   */
  async registrarLogNaNotaDiaria(texto, perguntaFc, respostaFc) {
    const dailyFile = await this.garantirNotaDiaria();
    if (!dailyFile || !this.VaultStore) return;

    const d = new Date();
    const hora = `${this.padTime(d.getHours())}:${this.padTime(d.getMinutes())}`;

    if (texto) {
      await this.VaultStore.adicionarLinhaEmSecao(this.app, dailyFile, '### Sessões de Foco', `- **[${hora}]** ${texto}`);
    }
    if (perguntaFc && respostaFc) {
      await this.VaultStore.adicionarLinhaEmSecao(this.app, dailyFile, '## Flashcards do Dia', `${perguntaFc}::${respostaFc}`);
    }
  }

  /**
   * Atualiza a propriedade 'pomodoros' no frontmatter da nota diária.
   *
   * @param {number} completedCyclesToday - Total de ciclos concluídos hoje.
   */
  async salvarPomodoroNaNotaDiaria(completedCyclesToday) {
    try {
      const dailyFile = await this.garantirNotaDiaria();
      if (dailyFile && this.app.fileManager && this.app.fileManager.processFrontMatter) {
        await this.app.fileManager.processFrontMatter(dailyFile, (fm) => {
          fm.pomodoros = completedCyclesToday;
        });
      }
    } catch (e) {
      console.warn('[Snoopy Pomodoro] Falha ao atualizar frontmatter da nota diária:', e);
    }
  }

  /**
   * Sincroniza os minutos focados no histórico de estudos em ciclo-estudos.json.
   *
   * @param {number} focusMin - Duração do ciclo concluído em minutos.
   */
  async sincronizarComCicloEstudos(focusMin = 25) {
    try {
      const cicloPath = "99_Meta/ciclo-estudos.json";
      const cFile = this.app.vault.getAbstractFileByPath(cicloPath);
      if (cFile) {
        const raw = await this.app.vault.read(cFile);
        const cState = JSON.parse(raw);
        if (!cState.historicoDiario) cState.historicoDiario = {};
        if (!cState.historicoDiario[this.todayStr]) {
          cState.historicoDiario[this.todayStr] = { minutosFoco: 0, questoesFeitas: 0, questoesAcertos: 0 };
        }
        cState.historicoDiario[this.todayStr].minutosFoco += focusMin;
        await this.app.vault.modify(cFile, JSON.stringify(cState, null, 2));
      }
    } catch (e) {
      console.warn('[Snoopy Pomodoro] Falha ao sincronizar com ciclo-estudos.json:', e);
    }
  }

  /**
   * Abre o modal de consolidação pós-foco ("O que você aprendeu?").
   *
   * @param {boolean} [abrirComFc=false] - Se true, já abre com a caixa de flashcards expandida.
   */
  abrirModalAnotacao(abrirComFc = false) {
    if (!this.ModalFactory || !this.ModalFactory.abrir) return;

    const modalHtml = `
      <div class="snoopy-card-header">
        <span class="snoopy-section-title">Ciclo Concluído! O que você aprendeu?</span>
        <button id="modal-close-btn" class="snoopy-modal-close" title="Fechar">✕</button>
      </div>
      <div class="snoopy-modal-label">Consolidação rápida registrada na nota diária (01_Inbox/Diário):</div>
      <textarea id="modal-log-text" rows="2" placeholder="Ex: Fixei estrutura de grafos e complexidade..." class="snoopy-form-input"></textarea>
      <div style="padding-top: 6px; border-top: 1px solid rgba(255,255,255,0.06);">
        <label style="display: flex; align-items: center; gap: 8px; font-size: 11.5px; color: #d4d4d8; cursor: pointer;">
          <input type="checkbox" id="modal-fc-toggle" class="snoopy-circle-check">
          <span>Criar Flashcard deste aprendizado?</span>
        </label>
        <div id="modal-fc-box" style="display: none; flex-direction: column; gap: 6px; margin-top: 8px;">
          <input id="modal-fc-p" type="text" placeholder="Pergunta / Conceito" class="snoopy-form-input" style="font-size: 11px; padding: 6px;">
          <input id="modal-fc-r" type="text" placeholder="Resposta / Definição" class="snoopy-form-input" style="font-size: 11px; padding: 6px;">
        </div>
      </div>
      <div class="snoopy-toolbar" style="justify-content: flex-end; margin-top: 6px;">
        <button id="modal-skip-btn" class="snoopy-btn-action snoopy-btn-sm">Apenas Pausar</button>
        <button id="modal-save-btn" class="snoopy-btn-primary snoopy-btn-sm">Salvar & Iniciar Pausa</button>
      </div>
    `;

    this.ModalFactory.abrir({
      htmlContent: modalHtml,
      maxWidth: '430px',
      onMontar: (box, fechar) => {
        const btnClose = box.querySelector('#modal-close-btn');
        if (btnClose) {
          btnClose.onclick = () => {
            fechar();
            this.onPausaIniciar();
          };
        }

        const btnSkip = box.querySelector('#modal-skip-btn');
        if (btnSkip) {
          btnSkip.onclick = () => {
            fechar();
            this.onPausaIniciar();
          };
        }

        const fcToggle = box.querySelector('#modal-fc-toggle');
        const fcBox = box.querySelector('#modal-fc-box');
        if (abrirComFc && fcToggle && fcBox) {
          fcToggle.checked = true;
          fcBox.style.display = 'flex';
        }
        if (fcToggle && fcBox) {
          fcToggle.onchange = () => {
            fcBox.style.display = fcToggle.checked ? 'flex' : 'none';
          };
        }

        const btnSave = box.querySelector('#modal-save-btn');
        if (btnSave) {
          btnSave.onclick = async () => {
            const txt = box.querySelector('#modal-log-text') ? box.querySelector('#modal-log-text').value.trim() : '';
            const p = (fcToggle && fcToggle.checked && box.querySelector('#modal-fc-p')) ? box.querySelector('#modal-fc-p').value.trim() : null;
            const r = (fcToggle && fcToggle.checked && box.querySelector('#modal-fc-r')) ? box.querySelector('#modal-fc-r').value.trim() : null;

            if (txt || (p && r)) {
              await this.registrarLogNaNotaDiaria(txt, p, r);
              this._notify('📝 Aprendizado registrado na Nota Diária!');
            }
            fechar();
            this.onPausaIniciar();
          };
        }

        setTimeout(() => {
          const txtF = box.querySelector('#modal-log-text');
          if (txtF) txtF.focus();
        }, 40);
      }
    });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PomodoroModal;
}

return PomodoroModal;

