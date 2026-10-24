/**
 * Snoopy Vault - Orquestrador Central da Dashboard Home
 * Carrega e executa os módulos independentes do Snoopy Vault de forma segura,
 * com Barramento de Eventos, microsserviços transversais e Cache de Compilação.
 */

// =============================================================================
// 1. BARRAMENTO REATIVO DE EVENTOS (Desacoplamento Total de Módulos)
// =============================================================================
/**
 * Barramento Reativo de Eventos para comunicação desacoplada entre módulos.
 */
class SnoopyEventBus {
  constructor() {
    /** @type {Object.<string, Function[]>} */
    this.listeners = {};
  }

  /**
   * Registra um ouvinte para um evento específico.
   *
   * @param {string} event - Nome do evento a ser escutado.
   * @param {Function} fn - Função de callback executada ao disparar o evento.
   * @returns {Function} Função para cancelar a inscrição do ouvinte.
   */
  on(event, fn) {
    if (!this.listeners[event]) this.listeners[event] = [];
    this.listeners[event].push(fn);
    return () => this.off(event, fn);
  }

  /**
   * Remove um ouvinte previamente registrado.
   *
   * @param {string} event - Nome do evento.
   * @param {Function} fn - Referência da função de callback a ser removida.
   */
  off(event, fn) {
    if (this.listeners[event]) {
      this.listeners[event] = this.listeners[event].filter(h => h !== fn);
    }
  }

  /**
   * Emite um evento síncrono para todos os ouvintes inscritos.
   *
   * @param {string} event - Nome do evento a emitir.
   * @param {*} [data] - Carga útil de dados enviada aos ouvintes.
   */
  emit(event, data) {
    if (this.listeners[event]) {
      this.listeners[event].forEach(fn => {
        try { fn(data); } catch (err) { console.error(`[SnoopyEventBus] Erro ao emitir "${event}":`, err); }
      });
    }
  }
}

// =============================================================================
// 2. MICROSSERVIÇOS TRANSVERSAIS COMPARTILHADOS (Injetados no ctx)
// =============================================================================

async function renderHome(dv, app) {
// Carregamento dinâmico do ModuleLoader (Cache V8 de Compilação & Economia de RAM)
let ModuleLoader = null;
try {
  const _mlFile = app.vault.getAbstractFileByPath("99_Meta/Snoopy/core/module_loader.js");
  if (_mlFile) {
    const _mlCode = await app.vault.read(_mlFile);
    ModuleLoader = (new Function(_mlCode))();
  }
} catch (e) {
  console.warn("[Snoopy] Falha ao carregar core/module_loader.js dinamicamente:", e);
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

// Carregamento dos módulos core via ModuleLoader com cache por mtime
let DateUtils = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/date_utils.js");
let VaultStore = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/vault_store.js");
let ModalFactory = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/modal_factory.js");
let TaskParser = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/task_parser.js");
let Lifecycle = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/lifecycle.js");
let UIKit = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/ui_kit.js");
let TaskTemplates = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/task_templates.js");

if (!Lifecycle) {
  Lifecycle = class {
    static onDispose() { return () => {}; }
    static dispose() {}
    static contagem() { return 0; }
  };
}

// Limpa recursos registrados na renderização anterior para impedir vazamento de RAM
Lifecycle.dispose('home');

// =============================================================================
// 3. CONTEXTO BASE E DADOS HISTÓRICOS
// =============================================================================
const root = dv.container.createEl('div', { cls: 'snoopy-container' });
const now = new Date();
const padTime = (n) => String(n).padStart(2, '0');
const todayStr = `${now.getFullYear()}-${padTime(now.getMonth() + 1)}-${padTime(now.getDate())}`;
const dailyPath = `01_Inbox/Diário/${todayStr}.md`;

const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
const formattedDate = now.toLocaleDateString('pt-BR', dateOptions);

const diasJanela = new Set();
for (let i = 0; i < 30; i++) {
  diasJanela.add(DateUtils.somarDias(todayStr, -i));
}

const dailyPages = dv.pages('"01_Inbox/Diário"');
let completedCyclesToday = 0;
let mapaFoco = {};

dailyPages.forEach(p => {
  const dStr = p.file.name;
  if (diasJanela.has(dStr)) {
    let pomos = p.pomodoros;
    if (pomos === undefined || pomos === null) pomos = 0;
    const val = Number(pomos) || 0;
    mapaFoco[dStr] = val;
    if (dStr === todayStr) {
      completedCyclesToday = val;
    }
  }
});

/**
 * Garante a existência da nota diária do dia corrente, criando-a a partir do template se necessário.
 *
 * @returns {Promise<TFile>} Referência do arquivo diário.
 */
async function garantirNotaDiaria() {
  let file = app.vault.getAbstractFileByPath(dailyPath);
  if (!file) {
    if (!app.vault.getAbstractFileByPath("01_Inbox/Diário")) {
      await app.vault.createFolder("01_Inbox/Diário").catch(() => {});
    }
    const tplFile = app.vault.getAbstractFileByPath("99_Meta/Templates/Template - Diário.md");
    let content = "";
    if (tplFile) {
      const raw = await app.vault.read(tplFile);
      content = raw.replace(/{{date}}/g, todayStr);
    } else {
      content = `---\ndate: ${todayStr}\ntags: [diario]\n---\n\n# 📅 ${todayStr}\n\n## Hábitos\n- [ ] Leitura 20 min\n- [ ] Estudo Algoritmos\n- [ ] Pomodoro 4x\n- [ ] Exercício Físico\n\n`;
    }
    file = await app.vault.create(dailyPath, content);
  }
  return file;
}

/**
 * Cria instantaneamente uma nova nota em uma pasta alvo usando template predefinido e a abre.
 *
 * @param {string} folder - Pasta destino (ex: '01_Inbox', '02_Projetos').
 * @param {string} templatePath - Caminho relativo do arquivo de template.
 * @param {string} prefix - Prefixo para geração do título automático.
 * @returns {Promise<void>}
 */
async function criarNotaInstantanea(folder, templatePath, prefix) {
  if (!app.vault.getAbstractFileByPath(folder)) {
    await app.vault.createFolder(folder).catch(() => {});
  }
  const timeStr = `${todayStr} ${padTime(now.getHours())}${padTime(now.getMinutes())}`;
  const baseTitle = `${prefix} ${timeStr}`;
  const targetPath = `${folder}/${baseTitle}.md`;
  
  const tplFile = app.vault.getAbstractFileByPath(templatePath);
  let content = "";
  if (tplFile) {
    const raw = await app.vault.read(tplFile);
    content = raw.replace(/{{title}}/g, baseTitle)
                 .replace(/{{date}}/g, todayStr);
  } else {
    content = `---\ntitle: "${baseTitle}"\ndate: "${todayStr}"\n---\n\n# ${baseTitle}\n\n`;
  }
  
  const newFile = await app.vault.create(targetPath, content);
  new Notice(`⚡ Criado em ${folder}: ${baseTitle}`);
  await app.workspace.openLinkText(newFile.path, "", false);
}

// Catálogo nativo de vetores Lucide Icons (SVG puro, autônomo e de alta performance)
const SNOOPY_LUCIDE_ICONS = {
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
  'external-link': '<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/>',
  'calendar-plus': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/><line x1="12" y1="14" x2="12" y2="18"/><line x1="10" y1="16" x2="14" y2="16"/>',
  'file-x': '<path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z"/><polyline points="14 2 14 8 20 8"/><line x1="9.5" y1="12.5" x2="14.5" y2="17.5"/><line x1="14.5" y1="12.5" x2="9.5" y2="17.5"/>',
  'bookmark': '<path d="m19 21-7-4-7 4V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16z"/>',
  'columns': '<rect width="18" height="18" x="3" y="3" rx="2"/><path d="M12 3v18"/>',
  'trello': '<rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><rect width="3" height="9" x="7" y="7"/><rect width="3" height="5" x="14" y="7"/>',
  'check': '<polyline points="20 6 9 17 4 12"/>',
  'x': '<line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>',
  'trash-2': '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/><line x1="10" y1="11" x2="10" y2="17"/><line x1="14" y1="11" x2="14" y2="17"/>',
  'trash': '<polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>',
  'target': '<circle cx="12" cy="12" r="10"/><circle cx="12" cy="6" r="6"/><circle cx="12" cy="12" r="2"/>'
};

/**
 * Renderiza um ícone vetorial SVG do catálogo Lucide nativo dentro de um contêiner DOM.
 *
 * @param {HTMLElement} container - Elemento pai onde o ícone será inserido.
 * @param {string} iconName - Identificador do ícone no catálogo SNOOPY_LUCIDE_ICONS.
 * @param {object} [options] - Opções de estilização e dimensões.
 * @param {number} [options.size=14] - Largura e altura em pixels.
 * @param {string} [options.color='currentColor'] - Cor do traçado SVG (stroke).
 * @param {string} [options.cls=''] - Classes CSS adicionais.
 * @returns {HTMLElement} Elemento span contendo o SVG renderizado.
 */
function renderIcon(container, iconName, { size = 14, color = 'currentColor', cls = '' } = {}) {
  const span = container.createEl('span', { cls: `snoopy-icon ${cls}`.trim() });
  const innerSvg = SNOOPY_LUCIDE_ICONS[iconName] || '<circle cx="12" cy="12" r="8"/>';
  
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

// Montagem do Contexto
let _bottomGrid = null;
const ctx = {
  root,
  get bottomGrid() {
    if (!_bottomGrid) {
      _bottomGrid = root.createEl('div', { cls: 'snoopy-bottom-grid' });
    }
    return _bottomGrid;
  },
  app,
  dv,
  now,
  padTime,
  todayStr,
  dailyPath,
  dateOptions,
  formattedDate,
  garantirNotaDiaria,
  criarNotaInstantanea,
  renderIcon,
  mapaFoco,
  completedCyclesToday,
  // Barramento e Serviços Centrais
  events: (typeof window !== 'undefined' ? (window._snoopyEvents || (window._snoopyEvents = new SnoopyEventBus())) : new SnoopyEventBus()),
  DateUtils,
  VaultStore,
  ModalFactory,
  TaskParser,
  TaskTemplates,
  Lifecycle,
  UIKit,
  ModuleLoader
};

// Configurações
let config = {
  tempo_foco: 25,
  tempo_pausa_curta: 5,
  tempo_pausa_longa: 15,
  meta_ciclos_diarios: 4,
  banner_imagem: "99_Meta/Attachments/snoopy_panoramic.jpg",
  tema_preset: "snoopy",
  modulos_ativos: [
    "snoopy_banner_cabecalho",
    "snoopy_daily_tracker",
    "snoopy_cockpit_pomodoro",
    "snoopy_leituras_estudos",
    "snoopy_kanban_projetos"
  ]
};

try {
  const cfgPage = dv.page('99_Meta/⚙️ Configurações.md');
  if (cfgPage) {
    if (cfgPage.tempo_foco) config.tempo_foco = Number(cfgPage.tempo_foco);
    if (cfgPage.tempo_pausa_curta) config.tempo_pausa_curta = Number(cfgPage.tempo_pausa_curta);
    if (cfgPage.tempo_pausa_longa) config.tempo_pausa_longa = Number(cfgPage.tempo_pausa_longa);
    if (cfgPage.meta_ciclos_diarios) config.meta_ciclos_diarios = Number(cfgPage.meta_ciclos_diarios);
    if (cfgPage.banner_imagem) config.banner_imagem = String(cfgPage.banner_imagem);
    if (cfgPage.tema_preset) config.tema_preset = String(cfgPage.tema_preset);
    if (Array.isArray(cfgPage.modulos_ativos) && cfgPage.modulos_ativos.length > 0) {
      config.modulos_ativos = cfgPage.modulos_ativos;
    }
  }
} catch (e) {}

ctx.config = config;

// =============================================================================
// 4. EXECUÇÃO MODULAR COM CACHE DE COMPILAÇÃO (Zero Recompilação V8)
// =============================================================================
const modulosSnoopy = [
  "99_Meta/Snoopy/modulos/01_snoopy_banner_cabecalho.js",
  "99_Meta/Snoopy/modulos/04_snoopy_daily_tracker.js",
  "99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js",
  "99_Meta/Snoopy/modulos/05_snoopy_leituras_estudos.js",
  "99_Meta/Snoopy/modulos/03_snoopy_kanban_projetos.js"
];

  for (const moduloPath of modulosSnoopy) {
    try {
      const modulo = await ModuleLoader.carregar(app, moduloPath);
      if (modulo && typeof modulo.render === 'function') {
        if (Array.isArray(config.modulos_ativos) && !config.modulos_ativos.includes(modulo.id)) {
          continue;
        }
        await modulo.render(ctx);
      }
    } catch (err) {
      console.error(`[Snoopy Vault] Erro ao carregar módulo "${moduloPath}":`, err);
    }
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { SnoopyEventBus, renderHome };
}

if (typeof dv !== 'undefined' && typeof app !== 'undefined') {
  (async () => {
    await renderHome(dv, app);
  })();
}
