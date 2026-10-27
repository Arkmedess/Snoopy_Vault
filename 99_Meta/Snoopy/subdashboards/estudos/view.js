/**
 * Snoopy Vault - Orquestrador do Framework de Estudos
 * Gerencia a navegação entre abas (Painel, Planner, Revisões, Ciclo),
 * carrega dinamicamente os submódulos e compõe o cabeçalho global.
 *
 * @module subdashboards/estudos/view
 */

async function renderEstudos(dv, app) {
  const root = dv.container;
  root.innerHTML = '';

  // Aplica contêiner estrutural do design system com margens e respiro lateral
  if (root.classList && root.classList.add) {
    root.classList.add('snoopy-container');
  } else if (!root.className || !root.className.includes('snoopy-container')) {
    root.className = (root.className ? root.className + ' ' : '') + 'snoopy-container';
  }
  if (root.style) {
    root.style.padding = '16px 20px';
    root.style.boxSizing = 'border-box';
    root.style.maxWidth = '1400px';
    root.style.margin = '0 auto';
    root.style.display = 'flex';
    root.style.flexDirection = 'column';
    root.style.gap = '16px';
  }

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
  const UIKit = await carregarModulo("99_Meta/Snoopy/core/ui_kit.js");
  const EstudosEstado = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/estado.js");
  const GraficosSVG = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/graficos_svg.js");
  const ModaisEstudosClass = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/modais.js");
  const { renderAbaPainel } = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/abas/aba_painel.js") || {};
  const { renderAbaCicloRevisoes } = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/abas/aba_ciclo_revisoes.js") || {};
  const { renderAbaPlanner } = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/abas/aba_planner.js") || {};
  const { renderAbaRevisoes } = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/abas/aba_revisoes.js") || {};
  const { renderAbaCiclo } = await carregarModulo("99_Meta/Snoopy/subdashboards/estudos/abas/aba_ciclo.js") || {};

  /**
   * Helper para renderizar ícone SVG puro em strings HTML com resiliência.
   *
   * @param {string} iconName - Chave do ícone no UIKit.
   * @param {number} [size=14] - Dimensão ótica.
   * @returns {string} String contendo o span e svg do ícone.
   */
  function getIconHtml(iconName, size = 14) {
    if (UIKit && UIKit.ICONS && UIKit.ICONS[iconName]) {
      return `<span class="snoopy-icon" style="width: ${size}px; height: ${size}px; display: inline-flex; align-items: center; justify-content: center;"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}">${UIKit.ICONS[iconName]}</svg></span>`;
    }
    return '';
  }

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

  const paraArray = (col) => {
    if (!col) return [];
    const out = [];
    if (typeof col.forEach === 'function') {
      col.forEach(i => out.push(i));
      return out;
    }
    if (typeof col.length === 'number') {
      for (let i = 0; i < col.length; i++) out.push(col[i]);
      return out;
    }
    return out;
  };

  const obterDisciplinas = () => {
    return paraArray(EstudosEstado.obterDisciplinasProcessadas(dv));
  };

  const obterFilaDoCiclo = (todasDisciplinas) => {
    const lista = paraArray(todasDisciplinas);
    if (Array.isArray(estadoAtual.cicloOrdem) && estadoAtual.cicloOrdem.length > 0) {
      const ordenadas = [];
      estadoAtual.cicloOrdem.forEach(chave => {
        const match = lista.find(d => d.nome === chave || d.path === chave || (d.file && d.file.name === chave));
        if (match && !ordenadas.includes(match)) ordenadas.push(match);
      });
      if (ordenadas.length > 0) return ordenadas;
    }
    return lista;
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

    // Cabeçalho Global com iconografia SVG padronizada e distâncias consistentes
    const header = root.createEl('div', {
      cls: 'snoopy-card-header',
      attr: { style: 'margin-bottom: 16px; padding: 12px 14px; background: var(--background-secondary); border: 1px solid var(--background-modifier-border); border-radius: 8px;' }
    });

    header.innerHTML = `
      <div class="snoopy-toolbar" style="gap: 12px; align-items: center;">
        <button id="btn-back-home" class="snoopy-btn-action snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 6px;" title="Voltar à Home">
          ${getIconHtml('arrow-left', 13)}
          <span>Home</span>
        </button>
        <div>
          <div class="snoopy-section-title" style="display: flex; align-items: center; gap: 6px; letter-spacing: 0.05em;">
            ${getIconHtml('graduation-cap', 15)}
            <span>FRAMEWORK DE ESTUDOS</span>
          </div>
          <div class="snoopy-meta">${todasDisciplinas.length} matéria(s) cadastrada(s) • Meta Semanal: ${estadoAtual.metaHorasSemanal || 20}h</div>
        </div>
      </div>

      <div class="snoopy-toolbar" style="gap: 8px; align-items: center;">
        <button id="btn-cfg-ciclo-top" class="snoopy-btn-action snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 6px;" title="Configurar e ordenar fila do ciclo">
          ${getIconHtml('repeat', 13)}
          <span>Fila do Ciclo</span>
        </button>
        <button id="btn-add-materia" class="snoopy-nav-pill-btn snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
          ${getIconHtml('plus', 13)}
          <span>Nova Matéria</span>
        </button>
        <button id="btn-registrar-sessao-top" class="snoopy-btn-primary snoopy-btn-sm" style="display: inline-flex; align-items: center; gap: 6px;">
          ${getIconHtml('play', 13)}
          <span>Registrar Estudo</span>
        </button>
      </div>
    `;

    const btnHome = header.querySelector('#btn-back-home');
    if (btnHome) btnHome.onclick = () => app.workspace.openLinkText("00_Home/Home.md", "", false);
    const btnCfgTop = header.querySelector('#btn-cfg-ciclo-top');
    if (btnCfgTop) btnCfgTop.onclick = () => modais.abrirModalOrganizarCiclo(todasDisciplinas);
    const btnAddMat = header.querySelector('#btn-add-materia');
    if (btnAddMat) btnAddMat.onclick = () => modais.abrirModalNovaMateria(categoriaFiltroAtiva);
    const btnRegSess = header.querySelector('#btn-registrar-sessao-top');
    if (btnRegSess) btnRegSess.onclick = () => modais.abrirModalSessao();

    // Barra de Navegação entre Abas com respiro e bordas alinhadas
    const navTabs = root.createEl('div', {
      cls: 'snoopy-toolbar',
      attr: {
        style: 'border-bottom: 1px solid var(--background-modifier-border); margin-bottom: 16px; overflow-x: auto; padding: 0 2px 10px 2px; gap: 8px;'
      }
    });

    const abas = [
      { id: 'painel', label: 'PAINEL DE CONTROLE' },
      { id: 'ciclo_revisoes', label: 'CICLO & REVISÕES' }
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
      uiKit: UIKit,
      getIconHtml,
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
      renderAbaCiclo,
      renderAbaRevisoes,
      onReload: () => renderFramework()
    };

    try {
      if (abaAtiva === 'painel' && renderAbaPainel) {
        renderAbaPainel(tabContent, sharedCtx);
      } else if ((abaAtiva === 'ciclo_revisoes' || abaAtiva === 'ciclo' || abaAtiva === 'revisoes') && renderAbaCicloRevisoes) {
        renderAbaCicloRevisoes(tabContent, sharedCtx);
      } else if (abaAtiva === 'planner' && renderAbaPlanner) {
        renderAbaPlanner(tabContent, sharedCtx);
      } else if (abaAtiva === 'revisoes' && renderAbaRevisoes) {
        renderAbaRevisoes(tabContent, sharedCtx);
      } else if (abaAtiva === 'ciclo' && renderAbaCiclo) {
        renderAbaCiclo(tabContent, sharedCtx);
      }
    } catch (err) {
      console.error('[Snoopy Estudos] Erro ao renderizar aba:', err);
      tabContent.createEl('div', {
        attr: { class: 'snoopy-meta', style: 'color: #fca5a5; padding: 16px; border: 1px solid rgba(248,113,113,0.3); border-radius: 8px;' },
        text: `Erro ao renderizar visualização: ${err && err.message ? err.message : String(err)}`
      });
    }
  }

  renderFramework();
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { renderEstudos };
}

if (typeof dv !== 'undefined' && typeof app !== 'undefined') {
  (async () => {
    await renderEstudos(dv, app);
  })();
}
