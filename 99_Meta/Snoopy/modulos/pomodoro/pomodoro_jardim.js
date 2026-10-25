/**
 * Snoopy Vault - Submódulo: Jardim Botânico & Heatmap Pomodoro
 * Gerencia a progressão evolutiva da planta de foco, o cálculo de constância (streak),
 * e a geração da grade de calor de 30 dias com métricas de tempo.
 *
 * @module modulos/pomodoro/pomodoro_jardim
 */

const PomodoroJardim = {
  /**
   * Determina o estágio evolutivo da plantinha com base na quantidade de ciclos de foco de hoje.
   *
   * @param {number} ciclos - Quantidade de ciclos concluídos hoje.
   * @returns {{ iconName: string, titulo: string, descricao: string, badge: string, pct: number }}
   */
  calcularEstagioPlanta(ciclos = 0) {
    const c = Number(ciclos) || 0;
    if (c >= 8) {
      return {
        iconName: 'trees',
        titulo: 'Floresta Mágica',
        descricao: 'Mestria absoluta! Você construiu um ecossistema produtivo.',
        badge: 'MESTRE',
        pct: 100
      };
    }
    if (c >= 6) {
      return {
        iconName: 'tree-pine',
        titulo: 'Pinheiro Robusto',
        descricao: 'Foco inabalável. Raízes profundas e resiliência.',
        badge: 'NÍVEL 4',
        pct: 85
      };
    }
    if (c >= 4) {
      return {
        iconName: 'flower-2',
        titulo: 'Cerejeira em Flor',
        descricao: 'Meta diária batida com primor! Florescimento mental.',
        badge: 'NÍVEL 3',
        pct: 65
      };
    }
    if (c >= 2) {
      return {
        iconName: 'sprout',
        titulo: 'Brotinho Verdejante',
        descricao: 'Constância em desenvolvimento acelerado.',
        badge: 'NÍVEL 2',
        pct: 40
      };
    }
    if (c >= 1) {
      return {
        iconName: 'sprout',
        titulo: 'Plântula Ativa',
        descricao: 'Primeiro ciclo do dia consolidado com sucesso.',
        badge: 'NÍVEL 1',
        pct: 20
      };
    }
    return {
      iconName: 'sprout',
      titulo: 'Semente Plantada',
      descricao: 'Inicie seu primeiro foco para germinar a plantinha.',
      badge: 'NÍVEL 1',
      pct: 0
    };
  },

  /**
   * Calcula as métricas agregadas de constância para o histórico dos últimos 30 dias.
   *
   * @param {object} mapaFoco - Dicionário de foco no formato { 'YYYY-MM-DD': totalCiclos }.
   * @param {string} todayStr - Data atual em formato ISO ('YYYY-MM-DD').
   * @param {Date} [dataReferencia] - Data base para a retroação dos 30 dias.
   * @returns {{ totalPomos: number, weekPomos: number, peakPomos: number, streak: number, dias: Array<{ dataStr: string, valor: number, nivel: number }> }}
   */
  calcularHistorico30Dias(mapaFoco = {}, todayStr = '', dataReferencia = new Date()) {
    const pad = (n) => String(n).padStart(2, '0');
    const dias = [];

    for (let i = 29; i >= 0; i--) {
      const d = new Date(dataReferencia);
      d.setDate(d.getDate() - i);
      const dStr = `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
      const val = Number(mapaFoco[dStr]) || 0;

      let nivel = 0;
      if (val >= 4) nivel = 4;
      else if (val === 3) nivel = 3;
      else if (val === 2) nivel = 2;
      else if (val === 1) nivel = 1;

      dias.push({ dataStr: dStr, valor: val, nivel });
    }

    let totalPomos = 0;
    let weekPomos = 0;
    let peakPomos = 0;
    let streak = 0;
    let streakCounted = false;

    // Cálculo da sequência (streak) a partir do dia mais recente
    for (let i = dias.length - 1; i >= 0; i--) {
      const dStr = dias[i].dataStr;
      const val = dias[i].valor;
      if (!streakCounted) {
        if (val > 0) {
          streak++;
        } else if (dStr !== todayStr) {
          streakCounted = true;
        }
      }
    }

    // Totais e semana
    dias.forEach((item, idx) => {
      totalPomos += item.valor;
      if (idx >= 23) weekPomos += item.valor;
      if (item.valor > peakPomos) peakPomos = item.valor;
    });

    return { totalPomos, weekPomos, peakPomos, streak, dias };
  },

  /**
   * Atualiza a renderização visual do jardim botânico no DOM.
   *
   * @param {HTMLElement} root - Elemento raiz contendo o card do jardim.
   * @param {object} params - Parâmetros de renderização.
   * @param {number} params.completedCyclesToday - Ciclos completados hoje.
   * @param {number} params.dailyGoal - Meta de ciclos diários.
   * @param {number} params.focusMin - Duração em minutos de cada ciclo.
   * @param {Function} [params.renderIcon] - Função utilitária para renderizar ícones Lucide.
   */
  atualizarVisualPlanta(root, params = {}) {
    if (!root) return;
    const { completedCyclesToday = 0, dailyGoal = 4, focusMin = 25, renderIcon } = params;

    const pAv = root.querySelector('#snoopy-plant-avatar');
    const pTit = root.querySelector('#snoopy-stage-title');
    const pDesc = root.querySelector('#snoopy-stage-desc');
    const pBdg = root.querySelector('#snoopy-stage-badge');
    const pBar = root.querySelector('#snoopy-plant-bar');
    const cLabel = root.querySelector('#snoopy-cycle-label');
    const tStats = root.querySelector('#snoopy-today-stats');

    if (!pAv) return;

    if (cLabel) cLabel.textContent = `Ciclo ${completedCyclesToday + 1} de ${dailyGoal}`;
    if (tStats) tStats.textContent = `${completedCyclesToday} ciclos hoje (${completedCyclesToday * focusMin} min)`;

    const estagio = this.calcularEstagioPlanta(completedCyclesToday);

    if (renderIcon) {
      pAv.innerHTML = '';
      renderIcon(pAv, estagio.iconName, { size: 24, color: '#86efac' });
    }
    if (pTit) pTit.textContent = estagio.titulo;
    if (pDesc) pDesc.textContent = estagio.descricao;
    if (pBdg) pBdg.textContent = estagio.badge;
    if (pBar) pBar.style.width = `${estagio.pct}%`;
  },

  /**
   * Renderiza os quadrinhos do Heatmap de 30 dias e preenche as métricas laterais.
   *
   * @param {HTMLElement} root - Elemento raiz contendo o container do heatmap.
   * @param {object} params - Parâmetros de renderização.
   * @param {object} params.mapaFoco - Dicionário histórico { 'YYYY-MM-DD': totalCiclos }.
   * @param {string} params.todayStr - Data atual ISO.
   * @param {number} params.focusMin - Duração do ciclo em minutos.
   * @param {Date} [params.now] - Instância de data atual.
   */
  renderizarHeatmap(root, params = {}) {
    if (!root) return;
    const { mapaFoco = {}, todayStr = '', focusMin = 25, now = new Date() } = params;

    const pomoHeatGrid = root.querySelector('.snoopy-heat-grid');
    const stats = this.calcularHistorico30Dias(mapaFoco, todayStr, now);

    if (pomoHeatGrid) {
      pomoHeatGrid.innerHTML = '';
      stats.dias.forEach((d) => {
        pomoHeatGrid.createEl('div', {
          cls: `snoopy-heat-cell heat-lvl-${d.nivel}`,
          attr: { title: `${d.dataStr}: ${d.valor} ciclo(s) (${d.valor * focusMin} min)` }
        });
      });
    }

    const mWeek = root.querySelector('#metric-week');
    const mPeak = root.querySelector('#metric-peak');
    const mStreak = root.querySelector('#metric-streak');
    const mTotal = root.querySelector('#metric-total');

    if (mWeek) mWeek.textContent = `${stats.weekPomos * focusMin}m`;
    if (mPeak) mPeak.textContent = `${stats.peakPomos * focusMin}m`;
    if (mStreak) mStreak.textContent = `${stats.streak} dias`;
    if (mTotal) mTotal.textContent = `${stats.totalPomos} ciclos`;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = PomodoroJardim;
}

return PomodoroJardim;

