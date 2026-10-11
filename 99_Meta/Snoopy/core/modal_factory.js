/**
 * Snoopy Vault - Fábrica Central de Modais com Ciclo de Vida Determinado
 * Garante remoção estrita de listeners, prevenção de memory leaks no Electron
 * e uso padronizado dos tokens do Design System Snoopy.
 *
 * @module core/modal_factory
 */
const ModalFactory = {
  /**
   * Abre uma janela modal na interface do Obsidian.
   *
   * @param {object} params - Configurações do modal.
   * @param {string} params.htmlContent - String HTML contendo a interface interna do modal.
   * @param {string} [params.maxWidth='450px'] - Largura máxima suportada pela caixa de diálogo.
   * @param {function(HTMLElement, Function): void} [params.onMontar] - Callback executado após montagem no DOM.
   * @param {function(HTMLElement, Function): void} [params.onConfirmar] - Callback acionado via atalho Ctrl/Cmd+Enter.
   * @returns {{ modalBox: HTMLElement, fechar: Function }} Objeto contendo o elemento do modal e o despachante de fechamento.
   */
  abrir({ htmlContent, maxWidth = '450px', onMontar, onConfirmar }) {
    const modalBg = document.createElement('div');
    modalBg.className = 'snoopy-modal-overlay';

    const modalBox = document.createElement('div');
    modalBox.className = 'snoopy-modal-box';
    modalBox.style.maxWidth = maxWidth;
    modalBox.innerHTML = htmlContent;

    modalBg.appendChild(modalBox);
    document.body.appendChild(modalBg);

    const fechar = () => {
      document.removeEventListener('keydown', handleKey);
      if (modalBg.parentNode) {
        modalBg.parentNode.removeChild(modalBg);
      }
    };

    const handleKey = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        fechar();
      } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
        if (typeof onConfirmar === 'function') {
          e.preventDefault();
          onConfirmar(modalBox, fechar);
        }
      }
    };

    document.addEventListener('keydown', handleKey);
    modalBg.addEventListener('click', (e) => {
      if (e.target === modalBg) fechar();
    });

    if (typeof onMontar === 'function') {
      onMontar(modalBox, fechar);
    }

    return { modalBox, fechar };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ModalFactory;
}

return ModalFactory;

