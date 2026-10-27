/**
 * Snoopy Vault - Submódulo: Aba Ciclo de Estudos
 * Organizado segundo a ordem sequencial de uso:
 * 1º Selecionar o Tema & Executar a Matéria/Estudo da Vez;
 * 2º Acompanhar/Reordenar a Sequência da Fila do Tema;
 * 3º Adicionar novos estudos específicos ou matérias na base da fila.
 *
 * @module subdashboards/estudos/abas/aba_ciclo
 */

/**
 * Renderiza a aba de Ciclo de Estudos dentro do container fornecido.
 *
 * @param {HTMLElement} rootContainer - Elemento pai onde o ciclo será desenhado.
 * @param {object} ctx - Contexto compartilhado.
 */
function renderAbaCiclo(rootContainer, ctx) {
  const {
    app,
    estado = {},
    disciplinas: rawDisciplinas = [],
    modais,
    obterFilaDoCiclo = (d) => d,
    salvarEstado = async () => {},
    onReload = () => {},
    getIconHtml,
    uiKit
  } = ctx;

  const paraArrayNativo = (col) => {
    if (!col) return [];
    const out = [];
    if (typeof col.forEach === 'function') {
      col.forEach(item => out.push(item));
      return out;
    }
    if (typeof col.length === 'number') {
      for (let i = 0; i < col.length; i++) out.push(col[i]);
      return out;
    }
    return out;
  };

  const getDataAttr = (el, key) => {
    if (el && el.dataset && el.dataset[key] !== undefined) return el.dataset[key];
    if (el && typeof el.getAttribute === 'function') return el.getAttribute(`data-${key}`);
    if (el && el.attrs && el.attrs[`data-${key}`] !== undefined) return el.attrs[`data-${key}`];
    return '';
  };

  const disciplinas = paraArrayNativo(rawDisciplinas);
  const filaBase = paraArrayNativo(obterFilaDoCiclo(disciplinas));
  const estudosCustom = paraArrayNativo(estado.estudosCiclo);

  const temasSet = new Set(['Todos']);
  disciplinas.forEach(d => {
    if (d.area || d.categoria) temasSet.add(d.area || d.categoria);
  });
  estudosCustom.forEach(e => {
    if (e && e.tema) temasSet.add(e.tema);
  });
  const listaTemas = Array.from(temasSet);
  const temaAtivo = (estado.temaCicloAtivo && temasSet.has(estado.temaCicloAtivo))
    ? estado.temaCicloAtivo
    : 'Todos';

  const filaCiclo = temaAtivo === 'Todos'
    ? filaBase
    : filaBase.filter(m =>
        (m.area || m.categoria || '').toLowerCase() === temaAtivo.toLowerCase() ||
        (m.nome || '').toLowerCase() === temaAtivo.toLowerCase()
      );

  const estudosDoTema = temaAtivo === 'Todos'
    ? estudosCustom
    : estudosCustom.filter(e =>
        (e.tema || '').toLowerCase() === temaAtivo.toLowerCase() ||
        (e.materia || '').toLowerCase() === temaAtivo.toLowerCase()
      );

  const getIcon = (name, size = 13) => {
    if (typeof getIconHtml === 'function') {
      const res = getIconHtml(name, size);
      if (res) return res;
    }
    if (uiKit && uiKit.ICONS && uiKit.ICONS[name]) {
      return `<span class="snoopy-icon" style="width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}">${uiKit.ICONS[name]}</svg></span>`;
    }
    const fallbackMap = {
      'repeat': '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
      'check': '<polyline points="20 6 9 17 4 12"/>',
      'skip-forward': '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
      'play': '<polygon points="5 3 19 12 5 21 5 3"/>',
      'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
      'chevron-up': '<polyline points="18 15 12 9 6 15"/>',
      'chevron-down': '<polyline points="6 9 12 15 18 9"/>',
      'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
      'calendar-plus': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>',
      'file-text': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/>'
    };
    const inner = fallbackMap[name] || '<circle cx="12" cy="12" r="8"/>';
    return `<span class="snoopy-icon" style="width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}">${inner}</svg></span>`;
  };

  let currentIdx = estado.disciplinaAtualIdx || 0;
  if (currentIdx >= filaCiclo.length) currentIdx = 0;
  const materiaVez = filaCiclo[currentIdx] || filaBase[0];
  const proximaVez = filaCiclo.length > 1 ? filaCiclo[(currentIdx + 1) % filaCiclo.length] : null;
  const obterOrdemNomes = () => filaBase.map(m => m.nome);

  const container = rootContainer.createEl('div', {
    cls: 'snoopy-card-box',
    attr: { style: 'display: flex; flex-direction: column; gap: 14px; padding: 16px;' }
  });

  // 1º PASSO: CABEÇALHO & FILTRO DE TEMA
  const cicloHeader = container.createEl('div', {
    attr: { style: 'display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;' }
  });

  cicloHeader.innerHTML = `
    <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap;">
      <span class="snoopy-section-title" style="display: inline-flex; align-items: center; gap: 6px; font-size: 15px;">
        ${getIcon('repeat', 14)}
        <span>CICLO DE ESTUDOS CONTÍNUO</span>
      </span>
      <div style="display: flex; gap: 5px; flex-wrap: wrap; align-items: center;">
        ${listaTemas.map(t => `
          <button class="snoopy-btn-mode btn-tema-ciclo ${temaAtivo === t ? 'active' : ''}" data-tema="${t}" style="font-size: 10.5px; padding: 2px 8px; border-radius: 4px; ${temaAtivo === t ? 'background: var(--text-normal); color: var(--background-primary); font-weight: bold;' : ''}">
            ${t}
          </button>
        `).join('')}
      </div>
    </div>
    <button id="btn-ciclo-organizar" class="snoopy-btn-action snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 5px;">
      ${getIcon('repeat', 11)}
      <span>Organizar Fila</span>
    </button>
  `;

  cicloHeader.querySelectorAll('.btn-tema-ciclo').forEach(btn => {
    btn.onclick = async () => {
      estado.temaCicloAtivo = getDataAttr(btn, 'tema') || 'Todos';
      await salvarEstado();
      onReload();
    };
  });

  const btnOrg = cicloHeader.querySelector('#btn-ciclo-organizar');
  if (btnOrg) {
    btnOrg.onclick = () => {
      if (modais && modais.abrirModalOrganizarCiclo) {
        modais.abrirModalOrganizarCiclo(disciplinas);
      }
    };
  }

  // 2º PASSO: EXECUÇÃO IMEDIATA (MATÉRIA / ESTUDO DA VEZ)
  if (materiaVez) {
    const vez = container.createEl('div', {
      attr: {
        style: 'background: var(--background-secondary-alt); border: 1px solid var(--background-modifier-border); border-left: 4px solid var(--interactive-accent, #60a5fa); border-radius: 8px; padding: 12px 16px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px;'
      }
    });

    const minVez = Number(materiaVez.minutos) || 0;
    const hVezTxt = `${Math.floor(minVez / 60)}h${minVez % 60}m`;
    const questVezTxt = `${materiaVez.acertos || 0}/${materiaVez.feitas || 0} questões (${materiaVez.pct || 0}%)`;

    vez.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 3px;">
        <div style="display: flex; align-items: center; gap: 8px;">
          <span class="snoopy-micro" style="padding: 1px 6px; border-radius: 3px; background: rgba(96, 165, 250, 0.2); color: #93c5fd; font-weight: 800;">
            NA VEZ • #${currentIdx + 1} DE ${filaCiclo.length}
          </span>
          <span class="snoopy-micro" style="color: var(--text-muted);">${materiaVez.area || materiaVez.categoria || 'Geral'}${proximaVez ? ` • Próxima: ${proximaVez.nome}` : ''}</span>
        </div>
        <span style="font-size: 17px; font-weight: 800; color: var(--text-normal);">${materiaVez.nome}</span>
        <div style="display: flex; align-items: center; gap: 10px; font-size: 11px; color: var(--text-muted);">
          <span>Foco acumulado: <b style="color: var(--text-normal);">${hVezTxt}</b></span>
          <span>•</span>
          <span>Desempenho: <b style="color: ${(materiaVez.pct || 0) >= 80 ? '#86efac' : 'var(--text-normal)'};">${questVezTxt}</b></span>
        </div>
      </div>

      <div class="snoopy-toolbar" style="flex-wrap: wrap; gap: 6px;">
        <button id="btn-ciclo-open" class="snoopy-btn-action snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 4px;">
          ${getIcon('file-text', 11)}
          <span>Nota</span>
        </button>
        <button id="btn-ciclo-task" class="snoopy-btn-action snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 4px;" title="Gerar tarefa de hoje na Home">
          ${getIcon('calendar-plus', 11)}
          <span>+ Tarefa Home</span>
        </button>
        <button id="btn-ciclo-skip" class="snoopy-btn-action snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 4px;">
          ${getIcon('skip-forward', 11)}
          <span>Pular</span>
        </button>
        <button id="btn-ciclo-reg" class="snoopy-btn-action snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 4px;">
          ${getIcon('play', 11)}
          <span>Iniciar Foco</span>
        </button>
        <button id="btn-ciclo-next" class="snoopy-btn-primary snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 5px;">
          ${getIcon('check', 11)}
          <span>Concluir & Avançar</span>
        </button>
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

    const btnTask = vez.querySelector('#btn-ciclo-task');
    if (btnTask) {
      btnTask.onclick = () => {
        if (modais && modais.abrirModalCriarTarefaMateria) {
          modais.abrirModalCriarTarefaMateria(materiaVez);
        }
      };
    }

    const btnReg = vez.querySelector('#btn-ciclo-reg');
    if (btnReg) {
      btnReg.onclick = () => {
        if (modais && modais.abrirModalSessao) modais.abrirModalSessao(materiaVez);
      };
    }

    const avancarCiclo = async (msgPrefix) => {
      const prox = filaCiclo.length > 0 ? (currentIdx + 1) % filaCiclo.length : 0;
      estado.disciplinaAtualIdx = prox;
      await salvarEstado();
      if (typeof Notice !== 'undefined' && filaCiclo[prox]) new Notice(`${msgPrefix}: ${filaCiclo[prox].nome}`);
      onReload();
    };

    const btnSkip = vez.querySelector('#btn-ciclo-skip');
    if (btnSkip) btnSkip.onclick = () => avancarCiclo('Matéria pulada. Na vez');

    const btnNext = vez.querySelector('#btn-ciclo-next');
    if (btnNext) btnNext.onclick = () => avancarCiclo('Ciclo avançado! Próxima');

    // 3º PASSO: SEQUÊNCIA DA FILA & ESTUDOS DO TEMA
    const queueList = container.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 6px;' }
    });

    filaCiclo.forEach((m, idx) => {
      const isAtual = idx === currentIdx;
      const min = Number(m.minutos) || 0;
      const hTxt = `${Math.floor(min / 60)}h${min % 60}m`;
      const pct = Number(m.pct) || 0;
      const topicosMateria = estudosDoTema.filter(e => e.materia === m.nome || e.tema === m.nome);

      const row = queueList.createEl('div', {
        attr: {
          style: `display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 8px; padding: 8px 12px; border-radius: 6px; background: ${isAtual ? 'rgba(96, 165, 250, 0.1)' : 'var(--background-secondary)'}; border: 1px solid ${isAtual ? 'rgba(96, 165, 250, 0.4)' : 'var(--background-modifier-border)'};`
        }
      });

      row.innerHTML = `
        <div style="display: flex; align-items: center; gap: 10px; flex: 1; min-width: 200px;">
          <span class="snoopy-meta" style="font-size: 11.5px; font-weight: 800; width: 26px; color: ${isAtual ? '#93c5fd' : 'var(--text-muted)'};">#${idx + 1}</span>
          <div style="display: flex; flex-direction: column; gap: 2px;">
            <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
              <span class="btn-ciclo-select-vez" data-idx="${idx}" style="font-size: 12.5px; font-weight: 700; color: var(--text-normal); cursor: pointer;" title="Definir como Matéria da Vez">${m.nome}</span>
              ${isAtual ? `<span class="snoopy-micro" style="padding: 1px 5px; border-radius: 3px; background: #60a5fa; color: #000000; font-weight: 800; font-size: 8.5px;">DA VEZ</span>` : ''}
              ${topicosMateria.map(t => `<span class="snoopy-micro" style="padding: 1px 6px; border-radius: 3px; background: rgba(168, 85, 247, 0.14); color: #d8b4fe; font-size: 9px;">${t.titulo} (${t.metaMin || 60}m)</span>`).join('')}
            </div>
            <span class="snoopy-meta" style="font-size: 10px;">${m.area || m.categoria || 'Geral'} • ${hTxt} acumulados • ${m.acertos || 0}/${m.feitas || 0} questões (${pct}%)</span>
          </div>
        </div>

        <div style="display: flex; align-items: center; gap: 6px;">
          <button class="snoopy-btn-action btn-ciclo-up" data-idx="${idx}" style="padding: 3px 6px; display: inline-flex; align-items: center;" title="Subir na fila" ${idx === 0 ? 'disabled' : ''}>
            ${getIcon('chevron-up', 12)}
          </button>
          <button class="snoopy-btn-action btn-ciclo-down" data-idx="${idx}" style="padding: 3px 6px; display: inline-flex; align-items: center;" title="Descer na fila" ${idx === filaCiclo.length - 1 ? 'disabled' : ''}>
            ${getIcon('chevron-down', 12)}
          </button>
          <button class="snoopy-btn-primary btn-ciclo-row-foco" data-idx="${idx}" style="font-size: 10.5px; padding: 3px 8px; display: inline-flex; align-items: center; gap: 4px;">
            ${getIcon('play', 10)}
            <span>Foco</span>
          </button>
          <button class="snoopy-btn-action btn-ciclo-remove" data-idx="${idx}" style="padding: 3px 6px; display: inline-flex; align-items: center;" title="Remover da rotação">
            ${getIcon('x', 11)}
          </button>
        </div>
      `;

      const btnSelVez = row.querySelector('.btn-ciclo-select-vez');
      if (btnSelVez) {
        btnSelVez.onclick = async () => {
          estado.disciplinaAtualIdx = idx;
          await salvarEstado();
          onReload();
        };
      }

      const btnUp = row.querySelector('.btn-ciclo-up');
      if (btnUp) {
        btnUp.onclick = async () => {
          if (idx <= 0) return;
          const ordem = obterOrdemNomes();
          const tmp = ordem[idx];
          ordem[idx] = ordem[idx - 1];
          ordem[idx - 1] = tmp;
          estado.cicloOrdem = ordem;
          if (estado.disciplinaAtualIdx === idx) estado.disciplinaAtualIdx = idx - 1;
          else if (estado.disciplinaAtualIdx === idx - 1) estado.disciplinaAtualIdx = idx;
          await salvarEstado();
          onReload();
        };
      }

      const btnDown = row.querySelector('.btn-ciclo-down');
      if (btnDown) {
        btnDown.onclick = async () => {
          if (idx >= filaCiclo.length - 1) return;
          const ordem = obterOrdemNomes();
          const tmp = ordem[idx];
          ordem[idx] = ordem[idx + 1];
          ordem[idx + 1] = tmp;
          estado.cicloOrdem = ordem;
          if (estado.disciplinaAtualIdx === idx) estado.disciplinaAtualIdx = idx + 1;
          else if (estado.disciplinaAtualIdx === idx + 1) estado.disciplinaAtualIdx = idx;
          await salvarEstado();
          onReload();
        };
      }

      const btnRowFoco = row.querySelector('.btn-ciclo-row-foco');
      if (btnRowFoco) {
        btnRowFoco.onclick = () => {
          if (modais && modais.abrirModalSessao) modais.abrirModalSessao(m);
        };
      }

      const btnRem = row.querySelector('.btn-ciclo-remove');
      if (btnRem) {
        btnRem.onclick = async () => {
          const ordem = obterOrdemNomes().filter((nome) => nome !== m.nome);
          estado.cicloOrdem = ordem;
          if (estado.disciplinaAtualIdx >= ordem.length) estado.disciplinaAtualIdx = 0;
          await salvarEstado();
          onReload();
        };
      }
    });

    // 4º PASSO (RODAPÉ DISCRETO): ADICIONAR ESTUDO ESPECÍFICO AO TEMA OU INCLUIR MATÉRIA FORA DA ROTAÇÃO
    const footerBox = container.createEl('div', {
      attr: { style: 'display: flex; flex-direction: column; gap: 8px; padding-top: 8px; border-top: 1px dashed var(--background-modifier-border);' }
    });

    const nomesNaFila = obterOrdemNomes();
    const foraDaFila = disciplinas.filter(d => !nomesNaFila.includes(d.nome));

    footerBox.innerHTML = `
      <div style="display: flex; align-items: center; flex-wrap: wrap; gap: 6px;">
        <span class="snoopy-micro" style="font-weight: 700; color: var(--text-muted); text-transform: uppercase;">+ Estudo no Tema:</span>
        <input id="quick-ciclo-estudo-titulo" type="text" placeholder="Ex: Clean Architecture, Bateria de Questões..." style="flex: 2; min-width: 170px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 8px; font-size: 11px; color: var(--text-normal); outline: none;">
        <select id="quick-ciclo-estudo-mat" style="flex: 1; min-width: 130px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 7px; font-size: 11px; color: var(--text-normal); outline: none;">
          ${disciplinas.map(d => `<option value="${d.nome}">${d.nome}</option>`).join('')}
        </select>
        <input id="quick-ciclo-estudo-meta" type="number" min="10" value="60" placeholder="Min" style="width: 55px; background: var(--background-primary); border: 1px solid var(--background-modifier-border); border-radius: 4px; padding: 4px 6px; font-size: 11px; color: var(--text-normal); text-align: center; outline: none;">
        <button id="btn-quick-ciclo-add" class="snoopy-btn-action snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 4px; padding: 4px 10px;">
          ${getIcon('plus', 11)}
          <span>Incluir Estudo</span>
        </button>
      </div>
      ${foraDaFila.length > 0 ? `
        <div style="display: flex; align-items: center; gap: 6px; flex-wrap: wrap;">
          <span class="snoopy-micro" style="color: var(--text-muted); text-transform: uppercase;">Fora da rotação (${foraDaFila.length}):</span>
          ${foraDaFila.map(d => `
            <button class="snoopy-btn-action snoopy-btn-sm btn-incluir-ciclo-inline" data-nome="${d.nome}" style="font-size: 10.5px; padding: 2px 8px; display: inline-flex; align-items: center; gap: 4px;">
              ${getIcon('plus', 10)}
              <span>${d.nome}</span>
            </button>
          `).join('')}
        </div>
      ` : ''}
    `;

    const btnAddEstudoTema = footerBox.querySelector('#btn-quick-ciclo-add');
    if (btnAddEstudoTema) {
      btnAddEstudoTema.onclick = async () => {
        const inpTitulo = footerBox.querySelector('#quick-ciclo-estudo-titulo');
        const selMat = footerBox.querySelector('#quick-ciclo-estudo-mat');
        const inpMeta = footerBox.querySelector('#quick-ciclo-estudo-meta');
        const titulo = (inpTitulo && inpTitulo.value.trim()) || '';
        if (!titulo) return;
        const matNome = (selMat && selMat.value) || (disciplinas[0]?.nome || 'Geral');
        const discRef = disciplinas.find(d => d.nome === matNome);
        const temaNome = discRef ? (discRef.area || discRef.categoria || matNome) : 'Geral';
        const metaMin = parseInt((inpMeta && inpMeta.value) || '60', 10) || 60;

        if (!Array.isArray(estado.estudosCiclo)) estado.estudosCiclo = [];
        estado.estudosCiclo.push({ id: `est-${Date.now()}`, titulo, materia: matNome, tema: temaNome, metaMin, concluidos: 0 });
        await salvarEstado();
        onReload();
      };
    }

    footerBox.querySelectorAll('.btn-incluir-ciclo-inline').forEach(btn => {
      btn.onclick = async () => {
        const nomeAdd = getDataAttr(btn, 'nome');
        if (!nomeAdd) return;
        const ordem = obterOrdemNomes();
        if (!ordem.includes(nomeAdd)) ordem.push(nomeAdd);
        estado.cicloOrdem = ordem;
        await salvarEstado();
        onReload();
      };
    });
  } else {
    const vazio = container.createEl('div', {
      attr: { class: 'snoopy-meta', style: 'text-align: center; padding: 24px; font-size: 12px;' }
    });
    vazio.innerHTML = `
      Nenhuma matéria está ativa na fila do ciclo atualmente.<br>
      <button id="btn-ciclo-organizar-vazio" class="snoopy-btn-primary snoopy-btn-sm" style="margin-top: 10px;">
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
