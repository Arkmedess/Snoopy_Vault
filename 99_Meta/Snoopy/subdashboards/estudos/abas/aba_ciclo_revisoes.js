/**
 * Snoopy Vault - Submódulo: Aba Unificada Ciclo & Revisões (Estudos)
 * Renderiza de forma coesa a fila do Ciclo de Estudos e a Curva de Revisões Espaçadas.
 *
 * @module subdashboards/estudos/abas/aba_ciclo_revisoes
 */

function renderAbaCicloRevisoes(rootContainer, ctx) {
  rootContainer.innerHTML = '';

  const wrapper = rootContainer.createEl('div', {
    attr: { style: 'display: flex; flex-direction: column; gap: 18px;' }
  });

  // 1. Bloco de Ciclo de Estudos (Fila Sequencial)
  const cicloBox = wrapper.createEl('div', {
    attr: { class: 'snoopy-card-box', style: 'padding: 16px;' }
  });
  
  let renderCicloFn = ctx && ctx.renderAbaCiclo;
  if (!renderCicloFn && typeof require !== 'undefined') {
    try {
      const mod = require('./aba_ciclo.js');
      renderCicloFn = mod.renderAbaCiclo;
    } catch (e) {}
  }
  if (typeof renderCicloFn === 'function') {
    renderCicloFn(cicloBox, ctx);
  } else {
    cicloBox.createEl('div', { text: 'CICLO DE ESTUDOS - FILA SEQUENCIAL' });
  }

  // 2. Bloco de Revisões Espaçadas (Curva de Retenção)
  const revisoesBox = wrapper.createEl('div', {
    attr: { class: 'snoopy-card-box', style: 'padding: 16px;' }
  });

  let renderRevFn = ctx && ctx.renderAbaRevisoes;
  if (!renderRevFn && typeof require !== 'undefined') {
    try {
      const mod = require('./aba_revisoes.js');
      renderRevFn = mod.renderAbaRevisoes;
    } catch (e) {}
  }
  if (typeof renderRevFn === 'function') {
    renderRevFn(revisoesBox, ctx);
  } else {
    revisoesBox.createEl('div', { text: 'REVISÕES ESPAÇADAS - CURVA DE ESQUECIMENTO' });
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderAbaCicloRevisoes };
}

return { renderAbaCicloRevisoes };
