/**
 * Snoopy Vault - Núcleo de Componentes de Interface (UIKit)
 * Fornece métodos estáticos para criação programática e padronizada de
 * botões, cabeçalhos de cards e blocos estruturais sem inline styles ad-hoc.
 *
 * @module core/ui_kit
 */

class UIKit {
  /**
   * Mapeamento de variantes semânticas para as classes CSS correspondentes.
   */
  static VARIANTES_BOTAO = {
    primary: 'snoopy-btn-primary',
    action: 'snoopy-btn-action',
    mode: 'snoopy-btn-mode',
    tab: 'snoopy-btn-tab',
    pill: 'snoopy-nav-pill-btn',
    icon: 'snoopy-btn-icon',
    danger: 'snoopy-btn-danger'
  };

  /**
   * Cria um elemento de botão padronizado com suporte a ícones Lucide, estilos semânticos e estados.
   *
   * @param {HTMLElement} parent - Contêiner pai onde o botão será anexado.
   * @param {object} options - Opções de configuração do botão.
   * @param {string} [options.label] - Rótulo de texto do botão.
   * @param {string} [options.icon] - Nome do ícone Lucide no catálogo do sistema.
   * @param {number} [options.iconSize] - Dimensões do ícone em pixels.
   * @param {'primary'|'action'|'mode'|'tab'|'pill'|'icon'|'danger'} [options.variant='action'] - Estilo semântico.
   * @param {'sm'|'md'|'lg'} [options.size='md'] - Modificador de escala/tamanho.
   * @param {string} [options.cls=''] - Classes CSS complementares.
   * @param {string} [options.title] - Texto de tooltip/hover.
   * @param {boolean} [options.active=false] - Se o botão inicia no estado ativo (para abas/modos).
   * @param {boolean} [options.block=false] - Se o botão ocupa largura total (100%).
   * @param {function(MouseEvent): (void|Promise<void>)} [options.onClick] - Callback executado ao clicar.
   * @param {object} [ctx] - Contexto contendo a função renderIcon (opcional).
   * @returns {HTMLButtonElement} Elemento de botão configurado e inserido no DOM.
   */
  static criarBotao(parent, options = {}, ctx = null) {
    const {
      label,
      icon,
      iconSize,
      variant = 'action',
      size = 'md',
      cls = '',
      title,
      active = false,
      block = false,
      onClick
    } = options;

    const baseClass = this.VARIANTES_BOTAO[variant] || 'snoopy-btn-action';
    const sizeClass = size && size !== 'md' ? `snoopy-btn-${size}` : '';
    const activeClass = active ? 'active' : '';
    const blockClass = block ? 'snoopy-btn-block' : '';

    const classNames = [baseClass, sizeClass, activeClass, blockClass, cls]
      .filter(Boolean)
      .join(' ');

    const btn = parent.createEl('button', { cls: classNames });

    if (title) {
      btn.title = title;
    }

    // Injeção de ícone Lucide se disponível
    if (icon) {
      const renderFn = (ctx && typeof ctx.renderIcon === 'function')
        ? ctx.renderIcon
        : (typeof renderIcon === 'function' ? renderIcon : null);

      const defaultIconSize = size === 'sm' ? 11 : (size === 'lg' ? 14 : 12);
      const computedIconSize = iconSize || defaultIconSize;

      if (renderFn) {
        renderFn(btn, icon, { size: computedIconSize });
      }
    }

    if (label) {
      btn.createEl('span', { text: label });
    }

    if (typeof onClick === 'function') {
      btn.addEventListener('click', async (e) => {
        try {
          await onClick(e);
        } catch (err) {
          console.error('[UIKit] Erro ao executar handler de clique do botão:', err);
        }
      });
    }

    return btn;
  }

  /**
   * Cria um cabeçalho estrutural de card ou painel com título, metadados e contêiner de ações.
   *
   * @param {HTMLElement} parent - Contêiner pai onde o cabeçalho será anexado.
   * @param {object} options - Configuração do cabeçalho.
   * @param {string} options.title - Título principal da seção.
   * @param {string} [options.subtitle] - Subtítulo ou badge textual.
   * @param {string} [options.meta] - Metadado secundário exibido ao lado do título.
   * @returns {{ container: HTMLElement, titleBox: HTMLElement, actionsBox: HTMLElement }} Elementos criados.
   */
  static criarCardHeader(parent, options = {}) {
    const { title, subtitle, meta } = options;

    const container = parent.createEl('div', { cls: 'snoopy-card-header' });
    const titleBox = container.createEl('div', { cls: 'snoopy-toolbar' });

    if (title) {
      titleBox.createEl('span', { cls: 'snoopy-section-title', text: title });
    }

    if (meta) {
      titleBox.createEl('span', { cls: 'snoopy-meta', text: meta });
    }

    if (subtitle) {
      titleBox.createEl('span', { cls: 'snoopy-sub-title', text: subtitle });
    }

    const actionsBox = container.createEl('div', { cls: 'snoopy-toolbar' });

    return { container, titleBox, actionsBox };
  }
}

return UIKit;

