/**
 * Snoopy Vault - Orquestrador Central da Dashboard Home
 * Carrega e executa os módulos independentes do Snoopy Vault de forma segura, rápida e reativa.
 */

// 1. Contexto Base e Utilitários Compartilhados
const root = dv.container.createEl('div', { cls: 'abyssal-container' });
const now = new Date();
const padTime = (n) => String(n).padStart(2, '0');
const todayStr = `${now.getFullYear()}-${padTime(now.getMonth() + 1)}-${padTime(now.getDate())}`;
const dailyPath = `01_Inbox/Diário/${todayStr}.md`;

const dateOptions = { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' };
const formattedDate = now.toLocaleDateString('pt-BR', dateOptions);

// 2. Leitura dos Dados Históricos de Foco
const dailyPages = dv.pages('"01_Inbox/Diário"');
let completedCyclesToday = 0;
let mapaFoco = {};

dailyPages.forEach(p => {
  const dStr = p.file.name;
  if (/^\d{4}-\d{2}-\d{2}$/.test(dStr)) {
    let pomos = p.pomodoros;
    if (pomos === undefined || pomos === null) pomos = 0;
    const val = Number(pomos) || 0;
    mapaFoco[dStr] = val;
    if (dStr === todayStr) {
      completedCyclesToday = val;
    }
  }
});

// 3. Funções Utilitárias Globais
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

// 4. Montagem do Contexto Unificado
let _bottomGrid = null;
const ctx = {
  root,
  get bottomGrid() {
    if (!_bottomGrid) {
      _bottomGrid = root.createEl('div', { cls: 'abyssal-bottom-grid' });
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
  mapaFoco,
  completedCyclesToday
};

// 5. Configurações Centrais do Snoopy Vault (Frontmatter de 99_Meta/⚙️ Configurações.md)
let config = {
  tempo_foco: 25,
  tempo_pausa_curta: 5,
  tempo_pausa_longa: 15,
  meta_ciclos_diarios: 4,
  banner_imagem: "99_Meta/Attachments/snoopy_panoramic.jpg",
  tema_preset: "abyssal",
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

// 6. Lista Ordenada de Módulos Oficiais Snoopy Vault
const modulosSnoopy = [
  "99_Meta/Snoopy/modulos/01_snoopy_banner_cabecalho.js",
  "99_Meta/Snoopy/modulos/04_snoopy_daily_tracker.js",
  "99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js",
  "99_Meta/Snoopy/modulos/05_snoopy_leituras_estudos.js",
  "99_Meta/Snoopy/modulos/03_snoopy_kanban_projetos.js"
];

// 7. Execução Modular dos Componentes
for (const moduloPath of modulosSnoopy) {
  try {
    const fileExiste = app.vault.getAbstractFileByPath(moduloPath);
    const code = fileExiste ? await app.vault.read(fileExiste) : await app.vault.adapter.read(moduloPath);
    const moduloFactory = new Function(code);
    const modulo = moduloFactory();
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
