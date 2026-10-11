/**
 * Snoopy Vault - Submódulo: Aba Ciclo de Estudos
 * Gerencia a visualização do ciclo rotativo contínuo, matéria da vez em destaque,
 * trilha horizontal navegável de rotação e avanços sequenciais.
 *
 * @module subdashboards/estudos/abas/aba_ciclo
 */

/**
 * Renderiza a aba de Ciclo de Estudos dentro do container fornecido.
 *
 * @param {HTMLElement} rootContainer - Elemento pai onde o ciclo será desenhado.
 * @param {object} ctx - Contexto compartilhado.
 * @param {object} ctx.app - Instância do Obsidian App.
 * @param {object} ctx.estado - Estado atual de estudos em memória.
 * @param {Array<object>} ctx.disciplinas - Lista de matérias processadas.
 * @param {object} ctx.modais - Instância do gerenciador de modais de estudos.
 * @param {Function} [ctx.obterFilaDoCiclo] - Função para ordenar matérias conforme o ciclo configurado.
 * @param {Function} ctx.salvarEstado - Função assíncrona para persistir o estado.
 * @param {Function} ctx.onReload - Callback de re-renderização.
 */
function renderAbaCiclo(rootContainer, ctx) {
  const {
    app,
    estado,
    disciplinas = [],
    modais,
    obterFilaDoCiclo = (d) => d,
    salvarEstado = async () => {},
    onReload = () => {}
  } = ctx;

  const container = rootContainer.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 16px;' }
  });

  const filaCiclo = obterFilaDoCiclo(disciplinas);
  let currentIdx = estado.disciplinaAtualIdx || 0;
  if (currentIdx >= filaCiclo.length) currentIdx = 0;
  const materiaVez = filaCiclo[currentIdx];

  // Cabeçalho da Aba & Botão de Organização
  const cicloHeader = container.createEl('div', {
    attr: { style: 'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px;' }
  });

  cicloHeader.innerHTML = `
    <div>
      <span class="snoopy-section-title">CICLO DE ESTUDOS CONTÍNUO</span>
      <div class="snoopy-meta" style="margin-top: 2px;">
        ${filaCiclo.length} matéria(s) ativas na sua rotação de estudos
      </div>
    </div>
    <button id="btn-ciclo-organizar" class="snoopy-btn-action snoopy-btn-sm">
      Organizar Fila do Ciclo
    </button>
  `;

  const btnOrg = cicloHeader.querySelector('#btn-ciclo-organizar');
  if (btnOrg) {
    btnOrg.onclick = () => {
      if (modais && modais.abrirModalOrganizarCiclo) {
        modais.abrirModalOrganizarCiclo(disciplinas);
      }
    };
  }

  // Card didático: Como funciona o ciclo de estudos
  const guiaCard = container.createEl('div', {
    attr: {
      style: 'background: rgba(96, 165, 250, 0.05); border: 1px solid rgba(96, 165, 250, 0.18); border-radius: 8px; padding: 12px 16px; display: flex; flex-direction: column; gap: 8px;'
    }
  });

  guiaCard.innerHTML = `
    <div style="display: flex; align-items: center; justify-content: space-between;">
      <span class="snoopy-meta" style="font-weight: bold; color: var(--interactive-accent, #60a5fa); text-transform: uppercase; letter-spacing: 0.05em;">
        💡 COMO FUNCIONA O CICLO DE ESTUDOS?
      </span>
      <span class="snoopy-meta" style="font-size: 10px;">Adeus à grade rígida de dias da semana</span>
    </div>
    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px; font-size: 11.5px; color: var(--text-normal); line-height: 1.4;">
      <div style="background: rgba(255,255,255,0.02); border-radius: 6px; padding: 8px 10px; border: 1px solid rgba(255,255,255,0.05);">
        <b>1. Estude a Matéria da Vez:</b> Você não precisa decidir o que estudar hoje. Apenas clique em <i>Iniciar Foco</i> na matéria indicada na fila.
      </div>
      <div style="background: rgba(255,255,255,0.02); border-radius: 6px; padding: 8px 10px; border: 1px solid rgba(255,255,255,0.05);">
        <b>2. Registre sua Sessão:</b> O tempo e as questões alimentam suas estatísticas reais e já agendam a revisão para a data certa (1d, 7d, 30d).
      </div>
      <div style="background: rgba(255,255,255,0.02); border-radius: 6px; padding: 8px 10px; border: 1px solid rgba(255,255,255,0.05);">
        <b>3. A Fila Avança Automaticamente:</b> Ao clicar em <i>Concluir & Avançar</i>, a próxima matéria entra na vez, garantindo ritmo contínuo em todas as áreas.
      </div>
    </div>
  `;

  // Matéria da vez em destaque
  if (materiaVez) {
    const vez = container.createEl('div', {
      attr: {
        style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 4px solid var(--interactive-accent, #60a5fa); border-radius: 8px; padding: 16px 18px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 14px;'
      }
    });

    vez.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 4px;">
        <span class="snoopy-meta" style="font-size: 10.5px; font-weight: 700; color: var(--interactive-accent, #60a5fa); text-transform: uppercase;">
          MATÉRIA DA VEZ • POSIÇÃO ${currentIdx + 1} DE ${filaCiclo.length}
        </span>
        <span style="font-size: 18px; font-weight: 800; color: var(--text-normal);">${materiaVez.nome}</span>
        <div style="display: flex; align-items: center; gap: 8px; font-size: 11px; color: var(--text-muted);">
          <span>Área: <b style="color: var(--text-normal);">${materiaVez.area || materiaVez.categoria || 'Geral'}</b></span>
          <span>•</span>
          <span>Tempo focado acumulado: <b style="color: var(--text-normal);">${Math.floor((materiaVez.minutos || 0) / 60)}h${(materiaVez.minutos || 0) % 60}m</b></span>
        </div>
      </div>

      <div class="snoopy-toolbar" style="flex-wrap: wrap;">
        <button id="btn-ciclo-open" class="snoopy-btn-action snoopy-btn-sm">Abrir Nota</button>
        <button id="btn-ciclo-skip" class="snoopy-btn-action snoopy-btn-sm" title="Pular matéria temporariamente">Pular Matéria ↷</button>
        <button id="btn-ciclo-reg" class="snoopy-btn-action snoopy-btn-sm">Iniciar Foco</button>
        <button id="btn-ciclo-next" class="snoopy-btn-primary snoopy-btn-sm">✓ Concluir & Próxima →</button>
      </div>
    `;

    const btnOpen = vez.querySelector('#btn-ciclo-open');
    if (btnOpen) {
      btnOpen.onclick = () => {
        if (app && app.workspace && app.workspace.openLinkText) {
          app.workspace.openLinkText(materiaVez.path, "", false);
        }
      };
    }

    const btnReg = vez.querySelector('#btn-ciclo-reg');
    if (btnReg) {
      btnReg.onclick = () => {
        if (modais && modais.abrirModalSessao) {
          modais.abrirModalSessao(materiaVez);
        }
      };
    }

    const btnSkip = vez.querySelector('#btn-ciclo-skip');
    if (btnSkip) {
      btnSkip.onclick = async () => {
        const prox = (currentIdx + 1) % filaCiclo.length;
        estado.disciplinaAtualIdx = prox;
        await salvarEstado();
        if (typeof Notice !== 'undefined') new Notice(`Matéria pulada. Agora na vez: ${filaCiclo[prox].nome}`);
        onReload();
      };
    }

    const btnNext = vez.querySelector('#btn-ciclo-next');
    if (btnNext) {
      btnNext.onclick = async () => {
        const prox = (currentIdx + 1) % filaCiclo.length;
        estado.disciplinaAtualIdx = prox;
        await salvarEstado();
        if (typeof Notice !== 'undefined') new Notice(`Ciclo avançado! Próxima matéria: ${filaCiclo[prox].nome}`);
        onReload();
      };
    }

    // Trilha visual da fila do ciclo
    const trilhaBox = container.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 8px;' }
    });

    trilhaBox.createEl('span', {
      attr: { class: 'snoopy-meta', style: 'font-size: 10.5px; font-weight: bold; text-transform: uppercase; letter-spacing: 0.05em;' },
      text: 'Sequência da Fila (clique para pular direto para uma matéria):'
    });

    const trilha = trilhaBox.createEl('div', {
      attr: { style: 'display: flex; align-items: center; gap: 6px; overflow-x: auto; padding-bottom: 4px;' }
    });

    filaCiclo.forEach((m, idx) => {
      const isAtual = idx === currentIdx;
      const pill = trilha.createEl('div', {
        cls: `snoopy-nav-pill ${isAtual ? 'active' : ''}`,
        attr: {
          style: `font-size: 11px; padding: 5px 12px; cursor: pointer; flex-shrink: 0; display: flex; align-items: center; gap: 6px; ${isAtual ? 'border-color: var(--interactive-accent, #60a5fa); background: rgba(96, 165, 250, 0.15); font-weight: bold; color: var(--interactive-accent, #60a5fa);' : 'opacity: 0.75;'}`
        }
      });
      pill.innerHTML = `<span>${idx + 1}º</span> <span>${m.nome}</span>`;

      pill.onclick = async () => {
        estado.disciplinaAtualIdx = idx;
        await salvarEstado();
        onReload();
      };
    });
  } else {
    const vazio = container.createEl('div', {
      attr: { class: 'snoopy-meta', style: 'text-align: center; padding: 30px; font-size: 12px;' }
    });
    vazio.innerHTML = `
      Nenhuma matéria está ativa na fila do ciclo atualmente.<br>
      <button id="btn-ciclo-organizar-vazio" class="snoopy-btn-primary snoopy-btn-sm" style="margin-top: 12px;">
        Organizar Fila do Ciclo
      </button>
    `;
    const btnVazio = vazio.querySelector('#btn-ciclo-organizar-vazio');
    if (btnVazio) {
      btnVazio.onclick = () => {
        if (modais && modais.abrirModalOrganizarCiclo) {
          modais.abrirModalOrganizarCiclo(disciplinas);
        }
      };
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderAbaCiclo };
}

return { renderAbaCiclo };

