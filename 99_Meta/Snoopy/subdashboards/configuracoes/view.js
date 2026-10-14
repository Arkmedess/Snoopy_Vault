/**
 * Snoopy Vault - Subdashboard de Configurações, Atualizações e Dados
 * Fornece interface interativa para verificação de versão, atualização segura em 1 clique,
 * rollback de backups e limpeza/restauração de notas de demonstração (mocks).
 *
 * @module subdashboards/configuracoes/view
 */

(async () => {
  // 1. Carregamento Dinâmico via ModuleLoader
  let ModuleLoader = null;
  try {
    const _mlFile = app.vault.getAbstractFileByPath("99_Meta/Snoopy/core/module_loader.js");
    if (_mlFile) {
      const _mlCode = await app.vault.read(_mlFile);
      ModuleLoader = (new Function(_mlCode))();
    }
  } catch (e) {
    console.warn("[Snoopy Config] Falha ao carregar core/module_loader.js:", e);
  }

  if (!ModuleLoader) {
    ModuleLoader = class {
      static async carregar(app, path) {
        const f = app.vault.getAbstractFileByPath ? app.vault.getAbstractFileByPath(path) : null;
        if (!f) return null;
        const c = await app.vault.read(f);
        return (new Function(c))();
      }
    };
  }

  const UIKit = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/ui_kit.js");
  const ModalFactory = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/modal_factory.js");
  const ConfigController = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/config_controller.js");
  const Updater = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/updater.js");
  const MockManager = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/mock_manager.js");
  let Lifecycle = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/lifecycle.js");

  if (!Lifecycle) {
    Lifecycle = class {
      static onDispose() { return () => {}; }
      static dispose() {}
      static contagem() { return 0; }
    };
  }

  Lifecycle.dispose('configuracoes');

  const root = dv.container.createEl('div', { cls: 'snoopy-container snoopy-configuracoes-root' });

  // 2. Estado e Dados do Painel
  const statusCofre = await ConfigController.verificarStatus(app, MockManager);

  // 3. Renderização do Painel de Atualizações e Mocks
  const containerCard = root.createEl('div', {
    cls: 'snoopy-config-hub',
    attr: {
      style: 'display: flex; flex-direction: column; gap: 18px; margin-bottom: 24px;'
    }
  });

  // CARD 1: Central de Atualização do Cofre
  const cardUpdate = containerCard.createEl('div', {
    cls: 'snoopy-card-interactive',
    attr: {
      style: 'border: 1px solid var(--background-modifier-border); border-radius: 12px; padding: 20px; background: var(--background-secondary);'
    }
  });

  const headerUpdate = cardUpdate.createEl('div', {
    attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;' }
  });

  const titleBoxUpdate = headerUpdate.createEl('div', { cls: 'snoopy-toolbar' });
  UIKit.renderIcon(titleBoxUpdate, 'refresh-cw', { size: 16, color: '#60a5fa' });
  titleBoxUpdate.createEl('h3', {
    text: 'Atualização do Snoopy Vault',
    attr: { style: 'margin: 0; font-size: 1.15rem; font-weight: 600;' }
  });

  const badgeVersao = headerUpdate.createEl('span', {
    text: `v${statusCofre.versao}`,
    attr: {
      style: 'background: var(--interactive-accent); color: var(--text-on-accent); padding: 4px 10px; border-radius: 12px; font-size: 0.82rem; font-weight: bold;'
    }
  });

  cardUpdate.createEl('p', {
    text: 'Atualize o motor do Snoopy Vault (dashboards, scripts e templates) diretamente do GitHub sem risco de conflito ou perda das suas anotações pessoais.',
    attr: { style: 'color: var(--text-muted); font-size: 0.9rem; margin-bottom: 16px; line-height: 1.4;' }
  });

  const msgStatus = cardUpdate.createEl('div', {
    cls: 'snoopy-update-status',
    attr: { style: 'margin-bottom: 16px; font-size: 0.88rem;' }
  });

  const rowBotoesUpdate = cardUpdate.createEl('div', {
    attr: { style: 'display: flex; gap: 12px; flex-wrap: wrap;' }
  });

  // Botão: Verificar Atualizações
  const btnVerificar = UIKit.criarBotao(rowBotoesUpdate, {
    label: 'Verificar Atualizações',
    icon: 'search',
    variant: 'primary',
    size: 'md'
  });

  // Botão: Desfazer Atualização (Rollback)
  const btnRollback = UIKit.criarBotao(rowBotoesUpdate, {
    label: `Desfazer Última Atualização (${statusCofre.backups.length})`,
    icon: 'undo-2',
    variant: 'danger',
    size: 'md'
  });

  if (statusCofre.backups.length === 0) {
    btnRollback.disabled = true;
    btnRollback.style.opacity = '0.5';
    btnRollback.style.cursor = 'not-allowed';
  }

  // Ação: Verificar Atualizações
  btnVerificar.addEventListener('click', async () => {
    btnVerificar.disabled = true;
    btnVerificar.innerHTML = '';
    UIKit.renderIcon(btnVerificar, 'refresh-cw', { size: 13 });
    btnVerificar.createEl('span', { text: 'Verificando no GitHub...' });
    msgStatus.innerHTML = '<span style="color: var(--text-muted);">Consultando repositório oficial...</span>';

    try {
      // Busca manifesto remoto na release
      const repo = 'Arkmedess/Snoopy_Vault';
      const tag = `v${statusCofre.versao}`;
      const manifestoRemoto = await Updater.buscarManifestoRemoto(repo, tag).catch(() => null);

      if (!manifestoRemoto) {
        msgStatus.innerHTML = `<span style="color: var(--text-accent);">Não foi possível conectar ao GitHub Releases no momento ou você já possui a versão estável mais recente (v${statusCofre.versao}).</span>`;
        btnVerificar.disabled = false;
        btnVerificar.innerHTML = '';
        UIKit.renderIcon(btnVerificar, 'search', { size: 13 });
        btnVerificar.createEl('span', { text: 'Verificar Atualizações' });
        return;
      }

      // Calcula mapa de hashes locais
      const mapaLocal = await Updater.construirMapaLocal(app);
      const plano = Updater.planejarAtualizacao(manifestoRemoto, mapaLocal);

      const precisaAtualizar = plano.arquivosParaAdicionar.length > 0 ||
                               plano.arquivosParaAtualizar.length > 0 ||
                               plano.arquivosPreservadosNovo.length > 0;

      if (!precisaAtualizar && manifestoRemoto.versao === statusCofre.versao) {
        msgStatus.innerHTML = `<span style="color: var(--color-green, #4ade80); font-weight: 500;">Seu cofre já está 100% atualizado na versão v${statusCofre.versao}!</span>`;
      } else {
        msgStatus.innerHTML = `
          <div style="background: var(--background-primary); border-left: 4px solid var(--interactive-accent); padding: 12px; border-radius: 4px; margin-top: 8px;">
            <strong>Nova versão disponível: v${manifestoRemoto.versao}</strong><br>
            <span style="font-size: 0.85rem; color: var(--text-muted);">
              • ${plano.arquivosParaAtualizar.length} arquivos para atualizar<br>
              • ${plano.arquivosParaAdicionar.length} novos arquivos<br>
              • ${plano.arquivosPreservadosNovo.length} arquivos locais com suas edições (serão preservados e gravados com sufixo .novo)<br>
              • Backup atômico ativado por padrão.
            </span>
            <div id="btn-aplicar-container" style="margin-top: 10px;"></div>
          </div>
        `;

        const containerAplicar = msgStatus.querySelector('#btn-aplicar-container');
        if (containerAplicar) {
          const btnAplicar = UIKit.criarBotao(containerAplicar, {
            label: 'Instalar Atualização com Backup',
            icon: 'refresh-cw',
            variant: 'primary',
            size: 'md'
          });

          btnAplicar.addEventListener('click', async () => {
            btnAplicar.disabled = true;
            btnAplicar.innerHTML = '';
            UIKit.renderIcon(btnAplicar, 'refresh-cw', { size: 13 });
            btnAplicar.createEl('span', { text: 'Baixando e aplicando...' });
            try {
              const res = await Updater.aplicarAtualizacao(app, manifestoRemoto, `v${manifestoRemoto.versao}`, true);
              new Notice(`[Snoopy] Vault atualizado para v${manifestoRemoto.versao}! Backup salvo em: ${res.backupCriado}`);
              msgStatus.innerHTML = `<span style="color: var(--color-green, #4ade80); font-weight: bold;">Atualizado com sucesso para v${manifestoRemoto.versao}! Recarregue a nota ou o Obsidian para ver os novos recursos.</span>`;
            } catch (err) {
              new Notice(`[Snoopy Erro] Falha na atualização: ${err.message}`);
              msgStatus.innerHTML = `<span style="color: var(--color-red, #f87171);">Erro ao aplicar atualização: ${err.message}</span>`;
            }
          });
        }
      }
    } catch (e) {
      msgStatus.innerHTML = `<span style="color: var(--color-red, #f87171);">Erro ao verificar: ${e.message}</span>`;
    } finally {
      btnVerificar.disabled = false;
      btnVerificar.innerHTML = '';
      UIKit.renderIcon(btnVerificar, 'search', { size: 13 });
      btnVerificar.createEl('span', { text: 'Verificar Atualizações' });
    }
  });

  // Ação: Rollback
  btnRollback.addEventListener('click', async () => {
    if (!statusCofre.ultimoBackup) {
      new Notice('[Snoopy] Nenhum backup encontrado para restauração.');
      return;
    }

    const confirmar = confirm(`Deseja restaurar o cofre a partir do último backup (${statusCofre.ultimoBackup})?\nOs arquivos do motor voltarão ao estado anterior.`);
    if (!confirmar) return;

    btnRollback.disabled = true;
    btnRollback.innerHTML = '';
    UIKit.renderIcon(btnRollback, 'refresh-cw', { size: 13 });
    btnRollback.createEl('span', { text: 'Restaurando...' });

    try {
      const res = await Updater.desfazerAtualizacao(app, statusCofre.ultimoBackup);
      new Notice(`[Snoopy] Rollback concluído! ${res.restaurados.length} arquivos restaurados.`);
      msgStatus.innerHTML = `<span style="color: var(--color-green, #4ade80);">Backup restaurado com sucesso!</span>`;
    } catch (e) {
      new Notice(`[Snoopy Erro] Falha no rollback: ${e.message}`);
      msgStatus.innerHTML = `<span style="color: var(--color-red, #f87171);">Erro: ${e.message}</span>`;
    } finally {
      btnRollback.disabled = false;
      btnRollback.innerHTML = '';
      UIKit.renderIcon(btnRollback, 'undo-2', { size: 13 });
      btnRollback.createEl('span', { text: `Desfazer Última Atualização (${statusCofre.backups.length})` });
    }
  });

  // CARD 2: Gestão de Dados & Modo de Demonstração (Mocks)
  const cardMocks = containerCard.createEl('div', {
    cls: 'snoopy-card-interactive',
    attr: {
      style: 'border: 1px solid var(--background-modifier-border); border-radius: 12px; padding: 20px; background: var(--background-secondary);'
    }
  });

  const headerMocks = cardMocks.createEl('div', {
    attr: { style: 'display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;' }
  });

  const titleBoxMocks = headerMocks.createEl('div', { cls: 'snoopy-toolbar' });
  UIKit.renderIcon(titleBoxMocks, 'trash-2', { size: 16, color: '#fdba74' });
  titleBoxMocks.createEl('h3', {
    text: 'Gestão de Exemplos & Cofre Limpo',
    attr: { style: 'margin: 0; font-size: 1.15rem; font-weight: 600;' }
  });

  const badgeMocks = headerMocks.createEl('span', {
    text: `${statusCofre.mocks.length} notas de exemplo`,
    attr: {
      style: 'background: var(--background-modifier-border); color: var(--text-normal); padding: 4px 10px; border-radius: 12px; font-size: 0.82rem;'
    }
  });

  cardMocks.createEl('p', {
    text: 'O cofre vem com notas ilustrativas (com prefixo "Exemplo - ") para demonstrar os dashboards. Você pode removê-las para começar 100% limpo com suas anotações, ou restaurá-las caso queira testar recursos.',
    attr: { style: 'color: var(--text-muted); font-size: 0.9rem; margin-bottom: 16px; line-height: 1.4;' }
  });

  const msgMocks = cardMocks.createEl('div', {
    cls: 'snoopy-mock-status',
    attr: { style: 'margin-bottom: 16px; font-size: 0.88rem;' }
  });

  const rowBotoesMocks = cardMocks.createEl('div', {
    attr: { style: 'display: flex; gap: 12px; flex-wrap: wrap;' }
  });

  const btnLimparMocks = UIKit.criarBotao(rowBotoesMocks, {
    label: 'Limpar Exemplos (Cofre Limpo)',
    icon: 'trash-2',
    variant: 'danger',
    size: 'md'
  });

  const btnRestaurarMocks = UIKit.criarBotao(rowBotoesMocks, {
    label: 'Restaurar Exemplos (Modo Demonstração)',
    icon: 'sparkles',
    variant: 'action',
    size: 'md'
  });

  // Ação: Limpar Mocks
  btnLimparMocks.addEventListener('click', async () => {
    const total = statusCofre.mocks.length;
    const msgConfirma = total > 0
      ? `Atenção: ${total} nota(s) de exemplo com prefixo "Exemplo - " serão movidas para a lixeira do Obsidian e o ciclo de estudos será zerado.\n\nSuas anotações pessoais NUNCA serão apagadas!\n\nDeseja continuar?`
      : `Não há notas de exemplo pendentes. Deseja mesmo assim garantir que o ciclo de estudos esteja no estado inicial limpo?`;

    const confirmar = confirm(msgConfirma);
    if (!confirmar) return;

    btnLimparMocks.disabled = true;
    btnLimparMocks.innerHTML = '';
    UIKit.renderIcon(btnLimparMocks, 'refresh-cw', { size: 13 });
    btnLimparMocks.createEl('span', { text: 'Limpando...' });

    try {
      const res = await MockManager.removerMocks(app);
      new Notice(`[Snoopy] Cofre limpo! ${res.removidos.length} exemplo(s) movido(s) para a lixeira.`);
      msgMocks.innerHTML = `<span style="color: var(--color-green, #4ade80); font-weight: 500;">Cofre limpo! Mocks removidos e ciclo zerado. Você já pode criar suas próprias matérias e projetos.</span>`;
      badgeMocks.textContent = '0 notas de exemplo';
    } catch (e) {
      new Notice(`[Snoopy Erro] Falha ao limpar mocks: ${e.message}`);
      msgMocks.innerHTML = `<span style="color: var(--color-red, #f87171);">Erro: ${e.message}</span>`;
    } finally {
      btnLimparMocks.disabled = false;
      btnLimparMocks.innerHTML = '';
      UIKit.renderIcon(btnLimparMocks, 'trash-2', { size: 13 });
      btnLimparMocks.createEl('span', { text: 'Limpar Exemplos (Cofre Limpo)' });
    }
  });

  // Ação: Restaurar Mocks
  btnRestaurarMocks.addEventListener('click', async () => {
    btnRestaurarMocks.disabled = true;
    btnRestaurarMocks.innerHTML = '';
    UIKit.renderIcon(btnRestaurarMocks, 'refresh-cw', { size: 13 });
    btnRestaurarMocks.createEl('span', { text: 'Restaurando...' });

    try {
      const res = await MockManager.restaurarMocks(app);
      new Notice(`[Snoopy] ${res.restaurados.length} nota(s) de demonstração restaurada(s)!`);
      msgMocks.innerHTML = `<span style="color: var(--color-green, #4ade80);">Exemplos recriados com sucesso! Verifique a aba de Estudos e Leituras.</span>`;
      const mocksAtualizados = await MockManager.detectarMocks(app);
      badgeMocks.textContent = `${mocksAtualizados.length} notas de exemplo`;
    } catch (e) {
      new Notice(`[Snoopy Erro] Falha ao restaurar mocks: ${e.message}`);
      msgMocks.innerHTML = `<span style="color: var(--color-red, #f87171);">Erro: ${e.message}</span>`;
    } finally {
      btnRestaurarMocks.disabled = false;
      btnRestaurarMocks.innerHTML = '';
      UIKit.renderIcon(btnRestaurarMocks, 'sparkles', { size: 13 });
      btnRestaurarMocks.createEl('span', { text: 'Restaurar Exemplos (Modo Demonstração)' });
    }
  });

  // CARD 3: Arquitetura de Proteção e 3 Zonas
  const cardZonas = containerCard.createEl('div', {
    cls: 'snoopy-card-interactive',
    attr: {
      style: 'border: 1px solid var(--background-modifier-border); border-radius: 12px; padding: 20px; background: var(--background-secondary);'
    }
  });

  const headerZonas = cardZonas.createEl('div', { cls: 'snoopy-toolbar', attr: { style: 'margin-bottom: 10px;' } });
  UIKit.renderIcon(headerZonas, 'shield', { size: 16, color: '#86efac' });
  headerZonas.createEl('h3', {
    text: 'Garantia de Proteção de Dados (3 Zonas)',
    attr: { style: 'margin: 0; font-size: 1.15rem; font-weight: 600;' }
  });

  cardZonas.createEl('div', {
    attr: { style: 'font-size: 0.88rem; color: var(--text-muted); line-height: 1.5;' },
    innerHTML: `
      <ul style="padding-left: 20px; margin: 0;">
        <li><strong style="color: var(--text-normal);">Zona 1 (Seus Dados Pessoais):</strong> Suas pastas <code>01_Inbox/</code>, <code>02_Projetos/</code>, <code>03_Estudos/</code> e <code>04_Leituras/</code> nunca são tocadas nem alteradas por atualizações.</li>
        <li><strong style="color: var(--text-normal);">Zona 2 (Motor do Cofre):</strong> O diretório <code>99_Meta/Snoopy/</code> e os snippets visuais são atualizados de forma segura. Se você editou um script do motor, ele é preservado e a nova versão é salva como <code>.novo</code>.</li>
        <li><strong style="color: var(--text-normal);">Zona 3 (Sementes & Guias):</strong> Guias e painéis raiz são criados apenas se não existirem, nunca sobrescrevendo seus ajustes.</li>
      </ul>
    `
  });
})();
