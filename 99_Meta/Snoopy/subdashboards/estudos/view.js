/**
 * Snoopy Vault - Orquestrador do Framework de Estudos
 * Gerencia a navegação entre abas (Painel, Planner, Revisões, Ciclo),
 * carrega dinamicamente os submódulos e compõe o cabeçalho global.
 *
 * @module subdashboards/estudos/view
 */

(async () => {
  const root = dv.container;
  root.innerHTML = '';

  /**
   * Carrega um submódulo do Vault DataviewJS de forma segura e defensiva.
   *
   * @param {string} caminho - Caminho relativo do arquivo no Vault.
   * @returns {Promise<any>} Módulo instanciado ou exportado.
   */
  async function carregarModulo(caminho) {
    try {
      const file = app.vault.getAbstractFileByPath(caminho);
      if (file) {
        const code = await app.vault.read(file);
        return (new Function(code))();
      }
    } catch (err) {
      console.error(`[Snoopy Estudos] Falha ao carregar submódulo: ${caminho}`, err);
    }
    return null;
  }

  // Carregamento assíncrono dos submódulos
  const EstudosEstado = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/estado.js");
  const GraficosSVG = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/graficos_svg.js");
  const ModaisEstudosClass = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/modais.js");
  const { renderAbaPainel } = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/abas/aba_painel.js") || {};
  const { renderAbaPlanner } = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/abas/aba_planner.js") || {};
  const { renderAbaRevisoes } = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/abas/aba_revisoes.js") || {};
  const { renderAbaCiclo } = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/abas/aba_ciclo.js") || {};

  if (!EstudosEstado || !ModaisEstudosClass) {
    root.innerHTML = `<div class="snoopy-meta" style="color: #fca5a5; padding: 20px;">Erro ao carregar submódulos do Framework de Estudos.</div>`;
    return;
  }

  // Estado em memória e navegação
  const estadoAtual = await EstudosEstado.carregar(app);
  let abaAtiva = 'painel';
  let categoriaFiltroAtiva = 'Todas';
  let revisaoFiltro = 'programadas';
  const now = new Date();
  let plannerAno = now.getFullYear();
  let plannerMes = now.getMonth();

  const salvarEstado = async () => {
    await EstudosEstado.salvar(app, estadoAtual);
  };

  const obterDisciplinas = () => {
    return EstudosEstado.obterDisciplinasProcessadas(dv);
  };

  const obterFilaDoCiclo = (todasDisciplinas) => {
    if (Array.isArray(estadoAtual.cicloOrdem) && estadoAtual.cicloOrdem.length > 0) {
      const ordenadas = [];
      estadoAtual.cicloOrdem.forEach(nome => {
        const match = todasDisciplinas.find(d => d.nome === nome);
        if (match) ordenadas.push(match);
      });
      if (ordenadas.length > 0) return ordenadas;
    }
    return todasDisciplinas;
  };

  // Instanciação dos modais
  const modais = new ModaisEstudosClass({
    app,
    dv,
    estadoModulo: EstudosEstado,
    getEstado: () => estadoAtual,
    salvarEstado,
    obterDisciplinas,
    onReload: () => renderFramework()
  });

  /**
   * Renderiza a interface do Framework de Estudos.
   */
  function renderFramework() {
    root.innerHTML = '';
    const todasDisciplinas = obterDisciplinas();

    // Cabeçalho Global
    const header = root.createEl('div', { cls: 'snoopy-card-header', attr: { style: 'margin-bottom: 16px;' } });

    header.innerHTML = `
      <div class="snoopy-toolbar">
        <button id="btn-back-home" class="snoopy-btn-action snoopy-btn-sm">← HOME</button>
        <div>
          <div class="snoopy-section-title">FRAMEWORK DE ESTUDOS</div>
          <div class="snoopy-meta">${todasDisciplinas.length} matérias cadastradas</div>
        </div>
      </div>

      <div class="snoopy-toolbar">
        <button id="btn-cfg-ciclo-top" class="snoopy-btn-action snoopy-btn-sm" title="Configurar e ordenar fila do ciclo">FILA DO CICLO</button>
        <button id="btn-add-materia" class="snoopy-nav-pill-btn snoopy-btn-sm">+ NOVA MATÉRIA</button>
        <button id="btn-registrar-sessao-top" class="snoopy-btn-primary snoopy-btn-sm">+ REGISTRAR ESTUDO</button>
      </div>
    `;

    const btnHome = header.querySelector('#btn-back-home');
    if (btnHome) btnHome.onclick = () => app.workspace.openLinkText("00_Home/Home.md", "", false);
    const btnCfgTop = header.querySelector('#btn-cfg-ciclo-top');
    if (btnCfgTop) btnCfgTop.onclick = () => modais.abrirModalOrganizarCiclo(todasDisciplinas);
    const btnAddMat = header.querySelector('#btn-add-materia');
    if (btnAddMat) btnAddMat.onclick = () => modais.abrirModalNovaMateria();
    const btnRegSess = header.querySelector('#btn-registrar-sessao-top');
    if (btnRegSess) btnRegSess.onclick = () => modais.abrirModalSessao();

    // Barra de Navegação entre Abas
    const navTabs = root.createEl('div', {
      cls: 'snoopy-toolbar',
      attr: {
        style: 'border-bottom: 1px solid var(--background-modifier-border); margin-bottom: 18px; overflow-x: auto; padding-bottom: 6px;'
      }
    });

    const abas = [
      { id: 'painel', label: 'PAINEL DE CONTROLE' },
      { id: 'planner', label: 'MEU PLANNER' },
      { id: 'revisoes', label: 'REVISÕES ESPAÇADAS' },
      { id: 'ciclo', label: 'CICLO DE ESTUDOS' }
    ];

    abas.forEach(aba => {
      const isAtiva = abaAtiva === aba.id;
      const btn = navTabs.createEl('button', {
        cls: `snoopy-btn-mode snoopy-btn-sm ${isAtiva ? 'active' : ''}`,
        text: aba.label
      });
      btn.onclick = () => {
        abaAtiva = aba.id;
        renderFramework();
      };
    });

    // Conteúdo da Aba Ativa
    const tabContent = root.createEl('div', { attr: { class: 'snoopy-tab-content' } });

    const sharedCtx = {
      app,
      dv,
      estado: estadoAtual,
      disciplinas: todasDisciplinas,
      graficosSvg: GraficosSVG,
      modais,
      categoriaFiltroAtiva,
      setCategoriaFiltroAtiva: (cat) => { categoriaFiltroAtiva = cat; },
      plannerAno,
      plannerMes,
      setPlannerData: (ano, mes) => {
        plannerAno = ano;
        plannerMes = mes;
      },
      revisaoFiltro,
      setRevisaoFiltro: (rf) => { revisaoFiltro = rf; },
      obterFilaDoCiclo,
      salvarEstado,
      onReload: () => renderFramework()
    };

    if (abaAtiva === 'painel' && renderAbaPainel) {
      renderAbaPainel(tabContent, sharedCtx);
    } else if (abaAtiva === 'planner' && renderAbaPlanner) {
      renderAbaPlanner(tabContent, sharedCtx);
    } else if (abaAtiva === 'revisoes' && renderAbaRevisoes) {
      renderAbaRevisoes(tabContent, sharedCtx);
    } else if (abaAtiva === 'ciclo' && renderAbaCiclo) {
      renderAbaCiclo(tabContent, sharedCtx);
    }
  }

  renderFramework();
})();
