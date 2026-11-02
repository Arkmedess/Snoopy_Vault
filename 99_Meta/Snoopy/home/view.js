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
let ShopStore = await ModuleLoader.carregar(app, "99_Meta/Snoopy/core/shop_store.js");

// Aplicação do tema equipado a partir dos design tokens
if (ShopStore && typeof ShopStore.carregar === 'function') {
  try {
    const estadoShop = await ShopStore.carregar(app);
    const temaId = (estadoShop.equipados && estadoShop.equipados.cosmetic) || 'theme-preset-snoopy';
    const scheme = estadoShop.colorScheme || 'dark';
    if (typeof ShopStore.aplicarTema === 'function') {
      ShopStore.aplicarTema(temaId, null, scheme);
    }
    if (typeof ShopStore.definirAmbientEnabled === 'function') {
      ShopStore.definirAmbientEnabled(app, estadoShop.ambientEnabled === true);
    }
  } catch (err) {
    console.warn('[Snoopy Home] Falha ao carregar tema inicial:', err);
  }
}

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
  new Notice(`[Snoopy] Criado em ${folder}: ${baseTitle}`);
  await app.workspace.openLinkText(newFile.path, "", false);
}

/**
 * Renderiza um ícone vetorial SVG do catálogo Lucide nativo dentro de um contêiner DOM.
 * Utiliza UIKit.renderIcon() ou UIKit.ICONS.
 *
 * @param {HTMLElement} container - Elemento pai onde o ícone será inserido.
 * @param {string} iconName - Identificador do ícone no catálogo do UIKit.
 * @param {object} [options] - Opções de estilização e dimensões.
 * @param {number} [options.size=14] - Largura e altura em pixels.
 * @param {string} [options.color='currentColor'] - Cor do traçado SVG (stroke).
 * @param {string} [options.cls=''] - Classes CSS adicionais.
 * @returns {HTMLElement} Elemento span contendo o SVG renderizado.
 */
function renderIcon(container, iconName, { size = 14, color = 'currentColor', cls = '' } = {}) {
  if (UIKit && typeof UIKit.renderIcon === 'function') {
    return UIKit.renderIcon(container, iconName, { size, color, cls });
  }
  const span = container.createEl('span', { cls: `snoopy-icon ${cls}`.trim() });
  const innerSvg = (UIKit && UIKit.ICONS && UIKit.ICONS[iconName]) || '';
  
  if (!innerSvg) {
    span.style.display = 'none';
    return span;
  }
  
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
  ShopStore,
  DateUtils,
  VaultStore,
  ModalFactory,
  TaskParser,
  TaskTemplates,
  Lifecycle,
  UIKit,
  ModuleLoader
};

if (ctx.events && typeof ctx.events.on === 'function') {
  ctx.events.on('theme:changed', (dados) => {
    if (dados && dados.themeId && ShopStore && typeof ShopStore.aplicarTema === 'function') {
      ShopStore.aplicarTema(dados.themeId);
    }
  });
}

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
    "snoopy_planner_calendario"
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
      config.modulos_ativos = cfgPage.modulos_ativos.map(m => m === 'snoopy_kanban_projetos' ? 'snoopy_planner_calendario' : m);
      if (!config.modulos_ativos.includes('snoopy_planner_calendario') && cfgPage.modulos_ativos.includes('snoopy_kanban_projetos')) {
        config.modulos_ativos.push('snoopy_planner_calendario');
      }
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
  "99_Meta/Snoopy/modulos/03_snoopy_planner_calendario.js",
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
