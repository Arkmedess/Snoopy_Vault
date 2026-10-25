/**
 * Snoopy Vault - Núcleo de Componentes de Interface (UIKit)
 * Fornece métodos estáticos para criação programática e padronizada de
 * botões, cabeçalhos de cards e blocos estruturais sem inline styles ad-hoc,
 * além de centralizar o catálogo canônico de ícones vetoriais SVG (Lucide).
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
   * Catálogo canônico de vetores Lucide Icons (SVG puro, autônomo e de alta performance).
   * Elimina completamente a necessidade de emojis gráficos na interface.
   */
  static ICONS = {
    'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>',
    'book-open': '<path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/>',
    'inbox': '<polyline points="22 12 16 12 14 15 10 15 8 12 2 12"/><path d="M5.45 5.11L2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z"/>',
    'folder-plus': '<path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/><line x1="12" y1="11" x2="12" y2="17"/><line x1="9" y1="14" x2="15" y2="14"/>',
    'book-plus': '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/><line x1="12" y1="8" x2="12" y2="14"/><line x1="9" y1="11" x2="15" y2="11"/>',
    'settings': '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
    'play': '<polygon points="5 3 19 12 5 21 5 3"/>',
    'pause': '<rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/>',
    'rotate-ccw': '<path d="M1 4v6h6"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/>',
    'zap': '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
    'pencil': '<path d="M17 3a2.828 2.828 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5L17 3z"/>',
    'brain': '<path d="M9.5 2A2.5 2.5 0 0 1 12 4.5v15a2.5 2.5 0 0 1-4.96.44 2.5 2.5 0 0 1-2.96-3.08 3 3 0 0 1-.34-5.58 2.5 2.5 0 0 1 1.32-4.24 2.5 2.5 0 0 1 4.44-5.04z"/><path d="M14.5 2A2.5 2.5 0 0 0 12 4.5v15a2.5 2.5 0 0 0 4.96.44 2.5 2.5 0 0 0 2.96-3.08 3 3 0 0 0 .34-5.58 2.5 2.5 0 0 0-1.32-4.24 2.5 2.5 0 0 0-4.44-5.04z"/>',
    'sprout': '<path d="M7 20h10"/><path d="M10 20c5.5-2.5.8-6.4 3-10"/><path d="M9.5 9.4c1.1.8 1.8 2.2 2.3 3.7-2 .4-3.5.4-4.8-.3-1.2-.6-2.3-1.9-3-4.2 2.8-.5 4.4.1 5.5.8z"/><path d="M14.1 6a7 7 0 0 0-1.1 4c1.9-.1 3.3-.6 4.3-1.4 1-1 1.6-2.3 1.7-4.6-2.7.1-4 1-4.9 2z"/>',
    'trees': '<path d="M10 10v.2A3 3 0 0 1 8.9 16H5a3 3 0 0 1-1-5.8V10a3 3 0 0 1 6 0z"/><path d="M7 16v6"/><path d="M13 19v3"/><path d="M12 19h8.3a1 1 0 0 0 .7-1.7L18 14h.3a1 1 0 0 0 .7-1.7L16 9h.2a1 1 0 0 0 .8-1.7l-3.3-4.3a1 1 0 0 0-1.4 0L9 7.3a1 1 0 0 0 .8 1.7H10l-3 3.3a1 1 0 0 0 .7 1.7H8l-3 3.3a1 1 0 0 0 .7 1.7H12"/>',
    'clock': '<circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>',
    'more-vertical': '<circle cx="12" cy="12" r="1"/><circle cx="12" cy="5" r="1"/><circle cx="12" cy="19" r="1"/>',
    'arrow-up': '<line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/>',
    'code-2': '<polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/>',
    'database': '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>',
    'ruler': '<path d="M21.3 8.7 8.7 21.3c-1 1-2.5 1-3.4 0l-2.6-2.6c-1-1-1-2.5 0-3.4L15.3 2.7c1-1 2.5-1 3.4 0l2.6 2.6c1 1 1 2.5 0 3.4Z"/><path d="m14.5 3.5 2 2"/><path d="m11.5 6.5 2 2"/><path d="m8.5 9.5 2 2"/><path d="m5.5 12.5 2 2"/>',
    'microscope': '<path d="M6 18h8"/><path d="M3 22h18"/><path d="M14 22a7 7 0 1 0 0-14h-1"/><path d="M9 14h2"/><path d="M9 12a2 2 0 0 1-2-2V6h6v4a2 2 0 0 1-2 2Z"/><path d="M12 6V3a1 1 0 0 0-1-1H9a1 1 0 0 0-1 1v3"/>',
    // Vetores de padronização sem emojis:
    'check': '<polyline points="20 6 9 17 4 12"/>',
    'check-circle': '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/>',
    'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
    'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>',
    'star-half': '<path d="M12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
    'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="6" r="6"/><circle cx="12" cy="12" r="2"/>',
    'trash-2': '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
    'search': '<circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>',
    'sparkles': '<path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3L12 3z"/>',
    'refresh-cw': '<polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
    'undo-2': '<path d="M9 14 4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/>',
    'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
    'sunrise': '<path d="M12 2v6"/><path d="M4.93 10.93l1.41 1.41"/><path d="M20 18h2"/><path d="M2 18h2"/><path d="M17.66 12.34l1.41-1.41"/><path d="M16 18a4 4 0 0 0-8 0"/><path d="M1 22h22"/>',
    'sun': '<circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
    'moon': '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
    'repeat': '<polyline points="17 1 21 5 17 9"/><path d="M3 11V9a4 4 0 0 1 4-4h14"/><polyline points="7 23 3 19 7 15"/><path d="M21 13v2a4 4 0 0 1-4 4H3"/>',
    'lightbulb': '<path d="M15 14c.2-1 .7-1.7 1.5-2.5 1-1 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5"/><path d="M9 18h6"/><path d="M10 22h4"/>',
    'book': '<path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1-2.5-2.5Z"/><path d="M6 2v20"/>',
    'arrow-left': '<line x1="19" y1="12" x2="5" y2="12"/><polyline points="12 19 5 12 12 5"/>',
    'arrow-right': '<line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>',
    'alert-circle': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>',
    'plus': '<line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>',
    'minus': '<line x1="5" y1="12" x2="19" y2="12"/>',
    'layout': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="3" y1="9" x2="21" y2="9"/><line x1="9" y1="21" x2="9" y2="9"/>',
    'layers': '<polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/>',
    'filter': '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"/>',
    'external-link': '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
    'calendar-plus': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>',
    'file-x': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="9.5" y1="12.5" x2="14.5" y2="17.5"/><line x1="14.5" y1="12.5" x2="9.5" y2="17.5"/>',
    'bookmark': '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
    'columns': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>',
    'trello': '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><rect width="3" height="9" x="7" y="7"/><rect width="3" height="5" x="14" y="7"/>',
    // Ícones da Padronização v2 (Lucide SVG nativo)
    'plus-circle': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/>',
    'arrow-up-right': '<line x1="7" y1="17" x2="17" y2="7"/><polyline points="7 7 17 7 17 17"/>',
    'skip-forward': '<polygon points="5 4 15 12 5 20 5 4"/><line x1="19" y1="5" x2="19" y2="19"/>',
    'skip-back': '<polygon points="19 20 9 12 19 4 19 20"/><line x1="5" y1="19" x2="5" y2="5"/>',
    'list-plus': '<path d="M11 12H3"/><path d="M16 6H3"/><path d="M16 18H3"/><path d="M18 9v6"/><path d="M21 12h-6"/>',
    'maximize-2': '<polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/>',
    'sliders': '<line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/>',
    'list-music': '<path d="M21 15V6"/><path d="M18.5 18a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z"/><path d="M12 12H3"/><path d="M16 6H3"/><path d="M12 18H3"/>',
    'list': '<line x1="8" y1="6" x2="21" y2="6"/><line x1="8" y1="12" x2="21" y2="12"/><line x1="8" y1="18" x2="21" y2="18"/><line x1="3" y1="6" x2="3.01" y2="6"/><line x1="3" y1="12" x2="3.01" y2="12"/><line x1="3" y1="18" x2="3.01" y2="18"/>',
    'list-checks': '<path d="m3 17 2 2 4-4"/><path d="m3 7 2 2 4-4"/><path d="M13 6h8"/><path d="M13 12h8"/><path d="M13 18h8"/>',
    'timer': '<line x1="10" y1="2" x2="14" y2="2"/><line x1="12" y1="14" x2="15" y2="11"/><circle cx="12" cy="14" r="8"/>',
    'library': '<path d="m16 6 4 14"/><path d="M12 6v14"/><path d="M8 8v12"/><path d="M4 4v16"/>',
    'graduation-cap': '<path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
    'bar-chart-3': '<path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/>',
    'percent': '<line x1="19" y1="5" x2="5" y2="19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
    'file-text': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><line x1="10" y1="9" x2="8" y2="9"/>',
    'info': '<circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/>',
    'grip-vertical': '<circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/>',
    'chevron-left': '<polyline points="15 18 9 12 15 6"/>',
    'chevron-right': '<polyline points="9 18 15 12 9 6"/>',
    'circle-dot': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="1"/>',
    'kanban': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M8 7v7"/><path d="M12 7v4"/><path d="M16 7v9"/>',
    'tree-pine': '<path d="m17 14 3 3.3a1 1 0 0 1-.7 1.7H4.7a1 1 0 0 1-.7-1.7L7 14h-.3a1 1 0 0 1-.7-1.7L9 9h-.2A1 1 0 0 1 8 7.3L12 2l4 5.3a1 1 0 0 1-.8 1.7H15l3 3.3a1 1 0 0 1-.7 1.7H17Z"/><path d="M12 22v-3"/>',
    'flower-2': '<path d="M12 5a3 3 0 1 1 3 3m-3-3a3 3 0 1 0-3 3m3-3v1m3 2a3 3 0 1 1-3 3m3-3h-1m-2 3a3 3 0 1 1-3-3m3 3v-1m-3-2a3 3 0 1 1 3-3m-3 3h1"/><circle cx="12" cy="12" r="2"/><path d="M12 14v8"/>'
  };

  /**
   * Renderiza um ícone vetorial SVG do catálogo canônico dentro de um contêiner DOM.
   *
   * @param {HTMLElement} container - Elemento pai onde o ícone será inserido.
   * @param {string} iconName - Identificador do ícone no catálogo UIKit.ICONS.
   * @param {object} [options] - Opções de estilização e dimensões.
   * @param {number} [options.size=14] - Largura e altura em pixels.
   * @param {string} [options.color='currentColor'] - Cor do traçado SVG (stroke).
   * @param {string} [options.cls=''] - Classes CSS adicionais.
   * @returns {HTMLElement} Elemento span (.snoopy-icon) contendo o SVG renderizado.
   */
  static renderIcon(container, iconName, { size = 14, color = 'currentColor', cls = '' } = {}) {
    const span = container.createEl('span', { cls: `snoopy-icon ${cls}`.trim() });
    const innerSvg = this.ICONS[iconName] || '<circle cx="12" cy="12" r="8"/>';

    span.innerHTML = `<svg viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="${size}" height="${size}" style="display: block;">${innerSvg}</svg>`;

    if (size) {
      span.style.width = `${size}px`;
      span.style.height = `${size}px`;
    }
    if (color && color !== 'currentColor') {
      span.style.color = color;
    }
    return span;
  }

  /**
   * Cria um elemento de botão padronizado com suporte a ícones vetoriais, estilos semânticos e estados.
   *
   * @param {HTMLElement} parent - Contêiner pai onde o botão será anexado.
   * @param {object} options - Opções de configuração do botão.
   * @param {string} [options.label] - Rótulo de texto do botão.
   * @param {string} [options.icon] - Nome do ícone no catálogo UIKit.ICONS.
   * @param {number} [options.iconSize] - Dimensões do ícone em pixels.
   * @param {'primary'|'action'|'mode'|'tab'|'pill'|'icon'|'danger'} [options.variant='action'] - Estilo semântico.
   * @param {'sm'|'md'|'lg'} [options.size='md'] - Modificador de escala/tamanho.
   * @param {string} [options.cls=''] - Classes CSS complementares.
   * @param {string} [options.title] - Texto de tooltip/hover.
   * @param {boolean} [options.active=false] - Se o botão inicia no estado ativo (para abas/modos).
   * @param {boolean} [options.block=false] - Se o botão ocupa largura total (100%).
   * @param {function(MouseEvent): (void|Promise<void>)} [options.onClick] - Callback executado ao clicar.
   * @param {object} [ctx] - Contexto contendo a função renderIcon (opcional, fallback para UIKit.renderIcon).
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

    // Injeção de ícone vetorial se disponível
    if (icon) {
      const renderFn = (ctx && typeof ctx.renderIcon === 'function')
        ? ctx.renderIcon
        : (typeof renderIcon === 'function' ? renderIcon : (c, name, opts) => this.renderIcon(c, name, opts));

      const defaultIconSize = size === 'sm' ? 12 : (size === 'lg' ? 15 : 13);
      const computedIconSize = iconSize || defaultIconSize;

      renderFn(btn, icon, { size: computedIconSize });
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
   * Retorna texto com concordância gramatical adequada em singular ou plural.
   *
   * @param {number} quantidade - Quantidade avaliada.
   * @param {string} singular - Termo no singular.
   * @param {string} plural - Termo no plural.
   * @param {object} [opcoes] - Opções de formatação.
   * @param {boolean} [opcoes.incluirNumero=true] - Se deve prefixar o número ao termo retornado.
   * @returns {string} String com o termo concordado.
   */
  static pluralizar(quantidade, singular, plural, { incluirNumero = true } = {}) {
    const termo = Math.abs(quantidade) === 1 ? singular : plural;
    return incluirNumero ? `${quantidade} ${termo}` : termo;
  }

  /**
   * Renderiza um bloco estruturado de estado vazio com ícone, título, descrição e botão opcional.
   *
   * @param {HTMLElement} parent - Contêiner pai onde o estado vazio será inserido.
   * @param {object} options - Configurações do estado vazio.
   * @param {string} [options.icon='info'] - Nome do ícone SVG.
   * @param {string} options.titulo - Mensagem de título destacada.
   * @param {string} [options.descricao] - Explicação técnica ou instrução de apoio.
   * @param {object} [options.acao] - Configuração de botão CTA para resolver o estado vazio.
   * @param {string} options.acao.label - Rótulo do botão.
   * @param {string} [options.acao.icon] - Ícone do botão.
   * @param {Function} options.acao.onClick - Callback de clique.
   * @returns {HTMLElement} Elemento container criado com a classe .snoopy-empty.
   */
  static criarEstadoVazio(parent, { icon = 'info', titulo, descricao, acao } = {}) {
    const container = parent.createEl('div', { cls: 'snoopy-empty' });
    if (icon) {
      this.renderIcon(container, icon, { size: 24, color: 'var(--snoopy-muted, #71717a)' });
    }
    if (titulo) {
      container.createEl('span', { cls: 'snoopy-empty-title', text: titulo });
    }
    if (descricao) {
      container.createEl('span', { cls: 'snoopy-empty-desc', text: descricao });
    }
    if (acao && acao.label) {
      this.criarBotao(container, {
        label: acao.label,
        icon: acao.icon,
        variant: acao.variant || 'action',
        size: acao.size || 'sm',
        onClick: acao.onClick
      });
    }
    return container;
  }

  /**
   * Cria um cabeçalho estrutural de card ou painel com título, ícone, metadados e contêiner de ações.
   * Suporta o novo padrão anatômico com subtítulo abaixo do título quando icon for informado.
   *
   * @param {HTMLElement} parent - Contêiner pai onde o cabeçalho será anexado.
   * @param {object} options - Configuração do cabeçalho.
   * @param {string} options.title - Título principal da seção.
   * @param {string} [options.icon] - Ícone vetorial Lucide para acompanhar o título.
   * @param {string} [options.subtitle] - Subtítulo ou badge textual.
   * @param {string} [options.meta] - Metadado secundário exibido ao lado do título.
   * @returns {{ container: HTMLElement, titleBox: HTMLElement, actionsBox: HTMLElement }} Elementos criados.
   */
  static criarCardHeader(parent, options = {}) {
    const { title, subtitle, meta, icon } = options;

    const container = parent.createEl('div', { cls: 'snoopy-card-header' });

    if (icon) {
      const titleBox = container.createEl('div', { cls: 'snoopy-card-header-main' });
      const linha = titleBox.createEl('div', { cls: 'snoopy-toolbar' });
      this.renderIcon(linha, icon, { size: 16, color: 'var(--snoopy-muted, #a1a1aa)' });
      if (title) {
        linha.createEl('span', { cls: 'snoopy-section-title', text: title });
      }
      if (meta) {
        linha.createEl('span', { cls: 'snoopy-meta', text: meta });
      }
      if (subtitle) {
        titleBox.createEl('span', { cls: 'snoopy-card-subtitle', text: subtitle });
      }
      const actionsBox = container.createEl('div', { cls: 'snoopy-toolbar' });
      return { container, titleBox, actionsBox };
    }

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

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UIKit;
}

return UIKit;
