/**
 * Snoopy Vault - Central de Economia, Catálogo & Inventário Autônomo (ShopStore)
 * Gerencia catálogo multi-categoria (botânica, áudio de foco, personalização cosmética),
 * saldo de moedas de foco, desbloqueios e itens equipados de forma desacoplada do jardim.
 *
 * @module core/shop_store
 */

const CAMINHO_STORE = '99_Meta/snoopy-shop.json';
const CAMINHO_STORE_LEGADO = '99_Meta/jardim-constancia.json';

const CATALOGO_LOJA = [
  // --- BOTÂNICA (6 itens) ---
  {
    id: 'sprout',
    nome: 'Brotinho Verdejante',
    categoria: 'botanical',
    subtipo: 'Inicial',
    preco: 0,
    iconName: 'sprout',
    cor: '#86efac',
    lore: 'Toda grande floresta começa com um simples broto buscando o sol.',
    beneficio: 'Espécie nativa inicial de foco'
  },
  {
    id: 'flower-2',
    nome: 'Cerejeira Sakura',
    categoria: 'botanical',
    subtipo: 'Árvore Floral',
    preco: 50,
    iconName: 'flower-2',
    cor: '#f472b6',
    lore: 'Tome um gole de Matcha e aprecie as flores da sua disciplina diária.',
    beneficio: 'Floresce em sessões calmas e meditativas'
  },
  {
    id: 'tree-pine',
    nome: 'Pinheiro Alpino',
    categoria: 'botanical',
    subtipo: 'Resistente',
    preco: 100,
    iconName: 'tree-pine',
    cor: '#4ade80',
    lore: 'Raízes profundas no solo rochoso. Imune a qualquer tempestade de distrações.',
    beneficio: 'Símbolo de foco prolongado e ininterrupto'
  },
  {
    id: 'sparkles',
    nome: 'Árvore Estelar',
    categoria: 'botanical',
    subtipo: 'Mística',
    preco: 200,
    iconName: 'sparkles',
    cor: '#facc15',
    lore: 'Se uma estrela cadente realiza um desejo, que tal cultivar um céu estrelado em sua copa?',
    beneficio: 'Ilumina o bosque com partículas douradas'
  },
  {
    id: 'library',
    nome: 'Bonsai Filosófico',
    categoria: 'botanical',
    subtipo: 'Sabedoria',
    preco: 300,
    iconName: 'library',
    cor: '#38bdf8',
    lore: 'Cultivado com a serenidade de séculos de leitura e reflexão estoica.',
    beneficio: 'Ideal para sessões de estudos densos'
  },
  {
    id: 'trees',
    nome: 'Floresta Mágica Ancestral',
    categoria: 'botanical',
    subtipo: 'Mestre',
    preco: 500,
    iconName: 'trees',
    cor: '#a78bfa',
    lore: 'O ápice da constância. Um bioma sagrado de máxima produtividade.',
    beneficio: 'Consagra seu status como Mestre do Foco'
  },

  // --- ÁUDIOS DE FOCO PROCEDURAIS (6 itens) ---
  {
    id: 'audio-white-noise',
    nome: 'Ruído Branco Puro',
    categoria: 'audio',
    subtipo: 'Ruído Estocástico',
    preco: 0,
    iconName: 'volume-2',
    cor: '#86efac',
    lore: 'Mascaramento acústico uniforme em todo o espectro de frequências audíveis.',
    beneficio: 'Silencia distrações sonoras imprevisíveis do ambiente',
    config: { trackId: 'white_noise', tipo: 'buffer' }
  },
  {
    id: 'audio-pink-noise',
    nome: 'Ruído Rosa Relaxante',
    categoria: 'audio',
    subtipo: 'Ruído Balanceado',
    preco: 40,
    iconName: 'volume-1',
    cor: '#f472b6',
    lore: 'Densidade espectral balanceada com atenuação suave de 3dB por oitava.',
    beneficio: 'Ideal para leitura densa, escrita e relaxamento sereno',
    config: { trackId: 'pink_noise', tipo: 'buffer' }
  },
  {
    id: 'audio-brown-noise',
    nome: 'Ruído Marrom Profundo',
    categoria: 'audio',
    subtipo: 'Grave Aveludado',
    preco: 80,
    iconName: 'headphones',
    cor: '#ca8a04',
    lore: 'Atenuação profunda de 6dB por oitava gerando graves cálidos e contínuos.',
    beneficio: 'Flow profundo e imersão contra pensamentos acelerados',
    config: { trackId: 'brown_noise', tipo: 'buffer' }
  },
  {
    id: 'audio-procedural-rain',
    nome: 'Chuva Zen Procedural',
    categoria: 'audio',
    subtipo: 'Clima Dinâmico',
    preco: 120,
    iconName: 'cloud-rain',
    cor: '#38bdf8',
    lore: 'Gotas geradas estocasticamente sobre um leito sutil de ruído rosa.',
    beneficio: 'Atmosfera meditativa reconfortante para longas sessões de estudo',
    config: { trackId: 'procedural_rain', tipo: 'buffer' }
  },
  {
    id: 'audio-binaural-alpha',
    nome: 'Ondas Alfa 10Hz',
    categoria: 'audio',
    subtipo: 'Batimento Binaural',
    preco: 150,
    iconName: 'music',
    cor: '#a78bfa',
    lore: 'Batimento estéreo de 10 Hz estimulando alerta sereno e retenção mnemônica.',
    beneficio: 'Excelente para revisões espaçadas e consolidação de memória',
    config: { trackId: 'binaural_alpha', tipo: 'oscillator', freqL: 200, freqR: 210 }
  },
  {
    id: 'audio-binaural-beta',
    nome: 'Ondas Beta 16Hz',
    categoria: 'audio',
    subtipo: 'Batimento Binaural',
    preco: 180,
    iconName: 'sparkles',
    cor: '#fbbf24',
    lore: 'Pulsos de 16 Hz gerados para foco analítico, velocidade mental e resolução lógica.',
    beneficio: 'Máxima performance em matemática, programação e raciocínio denso',
    config: { trackId: 'binaural_beta', tipo: 'oscillator', freqL: 200, freqR: 216 }
  },

  // --- CUSTOMIZAÇÕES COSMÉTICAS (4 itens) ---
  {
    id: 'theme-preset-snoopy',
    nome: 'Obsidian Classic Dark',
    categoria: 'cosmetic',
    subtipo: 'Tema Padrão',
    preco: 0,
    iconName: 'layout',
    cor: '#86efac',
    lore: 'A sobriedade definitiva do Snoopy Vault com acentos em verde menta técnico.',
    beneficio: 'Visual escuro de alto contraste nativo do sistema',
    config: { acento: '#86efac' }
  },
  {
    id: 'theme-preset-cyber',
    nome: 'Cyber Minimalist',
    categoria: 'cosmetic',
    subtipo: 'Acento Cirúrgico',
    preco: 150,
    iconName: 'terminal',
    cor: '#38bdf8',
    lore: 'Linhas precisas e acentos em azul ciano neon cirúrgico para foco tecnológico.',
    beneficio: 'Destaque ciano brilhante para timers e badges de estatística',
    config: { acento: '#38bdf8' }
  },
  {
    id: 'theme-preset-solar',
    nome: 'Solar Amber',
    categoria: 'cosmetic',
    subtipo: 'Acento Cálido',
    preco: 200,
    iconName: 'sun',
    cor: '#fbbf24',
    lore: 'Tons quentes de âmbar e ouro técnico inspirados na luz do amanhecer produtivo.',
    beneficio: 'Acento solar dourado para botões e anéis de progresso',
    config: { acento: '#fbbf24' }
  },
  {
    id: 'theme-preset-rose',
    nome: 'Velvet Sakura',
    categoria: 'cosmetic',
    subtipo: 'Acento Aveludado',
    preco: 250,
    iconName: 'flower-2',
    cor: '#f472b6',
    lore: 'Delicadeza estética com paleta pastel suave de flores de cerejeira orientais.',
    beneficio: 'Acentos em rosa suave para dial e bordas aveludadas',
    config: { acento: '#f472b6' }
  }
];

const TEMAS_CONFIG = {
  'theme-preset-snoopy': {
    id: 'theme-preset-snoopy',
    nome: 'Obsidian Classic Dark',
    descricao: 'Minimalismo clássico com acentos esmeralda e constelações serenas.',
    acento: '#86efac',
    acentoHover: '#4ade80',
    bg: '#070709',
    panel: '#0f1015',
    card: '#13141a',
    cardHover: '#1a1b22',
    border: 'rgba(255, 255, 255, 0.08)',
    text: '#f4f4f5',
    textMuted: '#a1a1aa',
    btnBg: '#86efac',
    btnText: '#070709',
    focusRing: '0 0 0 2px rgba(134, 239, 172, 0.55)',
    doneColor: '#86efac',
    patternBg: `url("data:image/svg+xml,%3Csvg width='90' height='90' viewBox='0 0 90 90' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2386efac' opacity='0.035'%3E%3Ccircle cx='15' cy='15' r='1'/%3E%3Ccircle cx='75' cy='45' r='1.2'/%3E%3Ccircle cx='45' cy='75' r='1'/%3E%3Cline x1='15' y1='15' x2='75' y2='45' stroke='%2386efac' stroke-width='0.5'/%3E%3Cline x1='75' y1='45' x2='45' y2='75' stroke='%2386efac' stroke-width='0.5'/%3E%3C/g%3E%3C/svg%3E")`,
    modos: {
      dark: {
        colorScheme: 'dark',
        palette: {
          primary: '#86efac',
          primaryHover: '#4ade80',
          baseBg: '#070709',
          surface1: '#0f1015',
          surface2: '#13141a',
          surface3: '#1a1b22',
          textHigh: '#f4f4f5',
          textMuted: '#a1a1aa'
        },
        tokens: {
          bg: '#070709',
          panel: '#0f1015',
          card: '#13141a',
          cardHover: '#1a1b22',
          border: 'rgba(255, 255, 255, 0.08)',
          text: '#f4f4f5',
          textMuted: '#a1a1aa',
          accent: '#86efac',
          accentHover: '#4ade80',
          btnBg: '#86efac',
          btnText: '#070709',
          focusRing: '0 0 0 2px rgba(134, 239, 172, 0.55)',
          doneColor: '#86efac',
          shadow: '0 8px 30px rgba(0, 0, 0, 0.7)',
          patternBg: `url("data:image/svg+xml,%3Csvg width='90' height='90' viewBox='0 0 90 90' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2386efac' opacity='0.035'%3E%3Ccircle cx='15' cy='15' r='1'/%3E%3Ccircle cx='75' cy='45' r='1.2'/%3E%3Ccircle cx='45' cy='75' r='1'/%3E%3Cline x1='15' y1='15' x2='75' y2='45' stroke='%2386efac' stroke-width='0.5'/%3E%3Cline x1='75' y1='45' x2='45' y2='75' stroke='%2386efac' stroke-width='0.5'/%3E%3C/g%3E%3C/svg%3E")`
        },
        shape: {
          radiusSm: '6px',
          radiusMd: '8px',
          radiusLg: '10px',
          borderWidth: '1px'
        },
        typography: {
          family: 'var(--snoopy-font-sans)',
          headingFamily: 'var(--snoopy-font-heading)',
          weightNormal: '400',
          weightBold: '600'
        },
        scene: [
          { tipo: 'base', estilo: 'background: radial-gradient(circle at 50% 0%, #10151c 0%, #070709 70%);' },
          { tipo: 'ornament', estilo: "background-image: url(\"data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2386efac' opacity='0.08'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3Ccircle cx='80' cy='50' r='2'/%3E%3Ccircle cx='40' cy='90' r='1.5'/%3E%3Ccircle cx='105' cy='15' r='1'/%3E%3Ccircle cx='15' cy='105' r='1.2'/%3E%3Cline x1='20' y1='20' x2='80' y2='50' stroke='%2386efac' stroke-width='0.5' stroke-dasharray='3 3'/%3E%3Cline x1='80' y1='50' x2='40' y2='90' stroke='%2386efac' stroke-width='0.5' stroke-dasharray='3 3'/%3E%3C/g%3E%3C/svg%3E\");" },
          { tipo: 'texture', estilo: 'opacity: 0.02; filter: contrast(120%);' },
          { tipo: 'vignette', estilo: 'background: radial-gradient(circle, transparent 60%, rgba(0, 0, 0, 0.7) 100%);' }
        ],
        ambient: { tipo: 'stars', velocidade: 'lenta', ativo: false }
      },
      light: {
        colorScheme: 'light',
        palette: {
          primary: '#16a34a',
          primaryHover: '#15803d',
          baseBg: '#f8fafc',
          surface1: '#f1f5f9',
          surface2: '#ffffff',
          surface3: '#e2e8f0',
          textHigh: '#0f172a',
          textMuted: '#475569'
        },
        tokens: {
          bg: '#f8fafc',
          panel: '#f1f5f9',
          card: '#ffffff',
          cardHover: '#e2e8f0',
          border: 'rgba(15, 23, 42, 0.1)',
          text: '#0f172a',
          textMuted: '#475569',
          accent: '#15803d',
          accentHover: '#166534',
          btnBg: '#15803d',
          btnText: '#ffffff',
          focusRing: '0 0 0 2px rgba(22, 163, 74, 0.45)',
          doneColor: '#16a34a',
          shadow: '0 4px 15px rgba(15, 23, 42, 0.08)',
          patternBg: `url("data:image/svg+xml,%3Csvg width='90' height='90' viewBox='0 0 90 90' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2316a34a' opacity='0.035'%3E%3Ccircle cx='15' cy='15' r='1'/%3E%3Ccircle cx='75' cy='45' r='1.2'/%3E%3Ccircle cx='45' cy='75' r='1'/%3E%3Cline x1='15' y1='15' x2='75' y2='45' stroke='%2316a34a' stroke-width='0.5'/%3E%3Cline x1='75' y1='45' x2='45' y2='75' stroke='%2316a34a' stroke-width='0.5'/%3E%3C/g%3E%3C/svg%3E")`
        },
        shape: {
          radiusSm: '6px',
          radiusMd: '8px',
          radiusLg: '10px',
          borderWidth: '1px'
        },
        typography: {
          family: 'var(--snoopy-font-sans)',
          headingFamily: 'var(--snoopy-font-heading)',
          weightNormal: '400',
          weightBold: '600'
        },
        scene: [
          { tipo: 'base', estilo: 'background: radial-gradient(circle at 50% 0%, #ffffff 0%, #f1f5f9 100%);' },
          { tipo: 'ornament', estilo: "background-image: url(\"data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%2316a34a' opacity='0.06'%3E%3Ccircle cx='20' cy='20' r='1.5'/%3E%3Ccircle cx='80' cy='50' r='2'/%3E%3Ccircle cx='40' cy='90' r='1.5'/%3E%3Cline x1='20' y1='20' x2='80' y2='50' stroke='%2316a34a' stroke-width='0.5' stroke-dasharray='3 3'/%3E%3C/g%3E%3C/svg%3E\");" },
          { tipo: 'texture', estilo: 'opacity: 0.015;' },
          { tipo: 'vignette', estilo: 'background: radial-gradient(circle, transparent 65%, rgba(15, 23, 42, 0.04) 100%);' }
        ],
        ambient: { tipo: 'stars', velocidade: 'lenta', ativo: false }
      }
    }
  },
  'theme-preset-cyber': {
    id: 'theme-preset-cyber',
    nome: 'Cyber Minimalist',
    descricao: 'Linhas isométricas, malha cirúrgica neon e contraste cibernético.',
    acento: '#38bdf8',
    acentoHover: '#0ea5e9',
    bg: '#040711',
    panel: '#0a1020',
    card: '#0f172a',
    cardHover: '#152238',
    border: 'rgba(56, 189, 248, 0.18)',
    text: '#f0f9ff',
    textMuted: '#7dd3fc',
    btnBg: '#38bdf8',
    btnText: '#040711',
    focusRing: '0 0 0 2px rgba(56, 189, 248, 0.55)',
    doneColor: '#38bdf8',
    patternBg: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2338bdf8' stroke-width='0.75' opacity='0.045'%3E%3Crect x='0' y='0' width='80' height='80'/%3E%3Ccircle cx='40' cy='40' r='1.5' fill='%2338bdf8'/%3E%3Cline x1='35' y1='40' x2='45' y2='40'/%3E%3Cline x1='40' y1='35' x2='40' y2='45'/%3E%3Cpath d='M0,0 L8,0 L8,8'/%3E%3Cpath d='M80,80 L72,80 L72,72'/%3E%3C/g%3E%3C/svg%3E")`,
    modos: {
      dark: {
        colorScheme: 'dark',
        palette: {
          primary: '#38bdf8',
          primaryHover: '#0ea5e9',
          baseBg: '#040711',
          surface1: '#0a1020',
          surface2: '#0f172a',
          surface3: '#152238',
          textHigh: '#f0f9ff',
          textMuted: '#7dd3fc'
        },
        tokens: {
          bg: '#040711',
          panel: '#0a1020',
          card: '#0f172a',
          cardHover: '#152238',
          border: 'rgba(56, 189, 248, 0.18)',
          text: '#f0f9ff',
          textMuted: '#7dd3fc',
          accent: '#38bdf8',
          accentHover: '#0ea5e9',
          btnBg: '#38bdf8',
          btnText: '#040711',
          focusRing: '0 0 0 2px rgba(56, 189, 248, 0.55)',
          doneColor: '#38bdf8',
          shadow: '0 8px 30px rgba(4, 7, 17, 0.85)',
          patternBg: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2338bdf8' stroke-width='0.75' opacity='0.045'%3E%3Crect x='0' y='0' width='80' height='80'/%3E%3Ccircle cx='40' cy='40' r='1.5' fill='%2338bdf8'/%3E%3Cline x1='35' y1='40' x2='45' y2='40'/%3E%3Cline x1='40' y1='35' x2='40' y2='45'/%3E%3Cpath d='M0,0 L8,0 L8,8'/%3E%3Cpath d='M80,80 L72,80 L72,72'/%3E%3C/g%3E%3C/svg%3E")`
        },
        shape: {
          radiusSm: '4px',
          radiusMd: '6px',
          radiusLg: '8px',
          borderWidth: '1px'
        },
        typography: {
          family: 'var(--snoopy-font-mono), var(--snoopy-font-sans)',
          headingFamily: 'var(--snoopy-font-heading)',
          weightNormal: '400',
          weightBold: '700'
        },
        scene: [
          { tipo: 'base', estilo: 'background: radial-gradient(circle at 50% 0%, #08162e 0%, #040711 75%);' },
          { tipo: 'ornament', estilo: "background-image: url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%2338bdf8' stroke-width='0.7' opacity='0.08'%3E%3Cpath d='M0,20 L40,20 L60,40 L100,40'/%3E%3Cpath d='M10,80 L50,80 L70,60 L90,60'/%3E%3Ccircle cx='60' cy='40' r='2' fill='%2338bdf8'/%3E%3Ccircle cx='70' cy='60' r='2' fill='%2338bdf8'/%3E%3C/g%3E%3C/svg%3E\");" },
          { tipo: 'texture', estilo: 'opacity: 0.03;' },
          { tipo: 'vignette', estilo: 'background: radial-gradient(circle, transparent 60%, rgba(2, 6, 23, 0.8) 100%);' }
        ],
        ambient: { tipo: 'cyber_rain', velocidade: 'rapida', ativo: false }
      },
      light: {
        colorScheme: 'light',
        palette: {
          primary: '#0284c7',
          primaryHover: '#0369a1',
          baseBg: '#f0f7ff',
          surface1: '#e0f0fe',
          surface2: '#ffffff',
          surface3: '#dbeafe',
          textHigh: '#031930',
          textMuted: '#0369a1'
        },
        tokens: {
          bg: '#f0f7ff',
          panel: '#e0f0fe',
          card: '#ffffff',
          cardHover: '#dbeafe',
          border: 'rgba(2, 132, 199, 0.2)',
          text: '#031930',
          textMuted: '#0369a1',
          accent: '#0369a1',
          accentHover: '#075985',
          btnBg: '#0369a1',
          btnText: '#ffffff',
          focusRing: '0 0 0 2px rgba(2, 132, 199, 0.45)',
          doneColor: '#0284c7',
          shadow: '0 4px 15px rgba(2, 132, 199, 0.1)',
          patternBg: `url("data:image/svg+xml,%3Csvg width='80' height='80' viewBox='0 0 80 80' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%230284c7' stroke-width='0.75' opacity='0.05'%3E%3Crect x='0' y='0' width='80' height='80'/%3E%3Ccircle cx='40' cy='40' r='1.5' fill='%230284c7'/%3E%3Cline x1='35' y1='40' x2='45' y2='40'/%3E%3Cline x1='40' y1='35' x2='40' y2='45'/%3E%3C/g%3E%3C/svg%3E")`
        },
        shape: {
          radiusSm: '4px',
          radiusMd: '6px',
          radiusLg: '8px',
          borderWidth: '1px'
        },
        typography: {
          family: 'var(--snoopy-font-mono), var(--snoopy-font-sans)',
          headingFamily: 'var(--snoopy-font-heading)',
          weightNormal: '400',
          weightBold: '700'
        },
        scene: [
          { tipo: 'base', estilo: 'background: radial-gradient(circle at 50% 0%, #ffffff 0%, #e0f2fe 100%);' },
          { tipo: 'ornament', estilo: "background-image: url(\"data:image/svg+xml,%3Csvg width='100' height='100' viewBox='0 0 100 100' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%230284c7' stroke-width='0.7' opacity='0.07'%3E%3Cpath d='M0,20 L40,20 L60,40 L100,40'/%3E%3Cpath d='M10,80 L50,80 L70,60 L90,60'/%3E%3Ccircle cx='60' cy='40' r='2' fill='%230284c7'/%3E%3C/g%3E%3C/svg%3E\");" },
          { tipo: 'texture', estilo: 'opacity: 0.02;' },
          { tipo: 'vignette', estilo: 'background: radial-gradient(circle, transparent 65%, rgba(2, 132, 199, 0.05) 100%);' }
        ],
        ambient: { tipo: 'cyber_rain', velocidade: 'rapida', ativo: false }
      }
    }
  },
  'theme-preset-solar': {
    id: 'theme-preset-solar',
    nome: 'Solar Amber',
    descricao: 'Âmbar cálido, mandalas geométricas e detalhes de sóis dourados radiantes.',
    acento: '#fbbf24',
    acentoHover: '#f59e0b',
    bg: '#0e0b08',
    panel: '#17130e',
    card: '#1f1a13',
    cardHover: '#282118',
    border: 'rgba(251, 191, 36, 0.18)',
    text: '#fffbeb',
    textMuted: '#d4a373',
    btnBg: '#fbbf24',
    btnText: '#0e0b08',
    focusRing: '0 0 0 2px rgba(251, 191, 36, 0.55)',
    doneColor: '#fbbf24',
    patternBg: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23fbbf24' stroke-width='1' opacity='0.05'%3E%3Ccircle cx='60' cy='60' r='14'/%3E%3Ccircle cx='60' cy='60' r='6'/%3E%3Cline x1='60' y1='36' x2='60' y2='42'/%3E%3Cline x1='60' y1='78' x2='60' y2='84'/%3E%3Cline x1='36' y1='60' x2='42' y2='60'/%3E%3Cline x1='78' y1='60' x2='84' y2='60'/%3E%3Cline x1='43' y1='43' x2='47' y2='47'/%3E%3Cline x1='73' y1='73' x2='77' y2='77'/%3E%3Cline x1='77' y1='43' x2='73' y2='47'/%3E%3Cline x1='47' y1='73' x2='43' y2='77'/%3E%3C/g%3E%3C/svg%3E")`,
    modos: {
      dark: {
        colorScheme: 'dark',
        palette: {
          primary: '#fbbf24',
          primaryHover: '#f59e0b',
          baseBg: '#0e0b08',
          surface1: '#17130e',
          surface2: '#1f1a13',
          surface3: '#282118',
          textHigh: '#fffbeb',
          textMuted: '#d4a373'
        },
        tokens: {
          bg: '#0e0b08',
          panel: '#17130e',
          card: '#1f1a13',
          cardHover: '#282118',
          border: 'rgba(251, 191, 36, 0.18)',
          text: '#fffbeb',
          textMuted: '#d4a373',
          accent: '#fbbf24',
          accentHover: '#f59e0b',
          btnBg: '#fbbf24',
          btnText: '#0e0b08',
          focusRing: '0 0 0 2px rgba(251, 191, 36, 0.55)',
          doneColor: '#fbbf24',
          shadow: '0 8px 30px rgba(14, 11, 8, 0.8)',
          patternBg: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23fbbf24' stroke-width='1' opacity='0.05'%3E%3Ccircle cx='60' cy='60' r='14'/%3E%3Ccircle cx='60' cy='60' r='6'/%3E%3Cline x1='60' y1='36' x2='60' y2='42'/%3E%3Cline x1='60' y1='78' x2='60' y2='84'/%3E%3Cline x1='36' y1='60' x2='42' y2='60'/%3E%3Cline x1='78' y1='60' x2='84' y2='60'/%3E%3Cline x1='43' y1='43' x2='47' y2='47'/%3E%3Cline x1='73' y1='73' x2='77' y2='77'/%3E%3Cline x1='77' y1='43' x2='73' y2='47'/%3E%3Cline x1='47' y1='73' x2='43' y2='77'/%3E%3C/g%3E%3C/svg%3E")`
        },
        shape: {
          radiusSm: '8px',
          radiusMd: '10px',
          radiusLg: '14px',
          borderWidth: '1px'
        },
        typography: {
          family: 'var(--snoopy-font-sans)',
          headingFamily: 'var(--snoopy-font-heading)',
          weightNormal: '400',
          weightBold: '600'
        },
        scene: [
          { tipo: 'base', estilo: 'background: radial-gradient(circle at 50% 0%, #241708 0%, #0e0b08 75%);' },
          { tipo: 'ornament', estilo: "background-image: url(\"data:image/svg+xml,%3Csvg width='160' height='160' viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23fbbf24' stroke-width='1.2' opacity='0.09'%3E%3Ccircle cx='80' cy='80' r='24'/%3E%3Ccircle cx='80' cy='80' r='10' fill='%23fbbf24' fill-opacity='0.15'/%3E%3Cline x1='80' y1='40' x2='80' y2='50'/%3E%3Cline x1='80' y1='110' x2='80' y2='120'/%3E%3Cline x1='40' y1='80' x2='50' y2='80'/%3E%3Cline x1='110' y1='80' x2='120' y2='80'/%3E%3Cline x1='52' y1='52' x2='59' y2='59'/%3E%3Cline x1='101' y1='101' x2='108' y2='108'/%3E%3Cline x1='108' y1='52' x2='101' y2='59'/%3E%3Cline x1='59' y1='101' x2='52' y2='108'/%3E%3C/g%3E%3C/svg%3E\");" },
          { tipo: 'texture', estilo: 'opacity: 0.025;' },
          { tipo: 'vignette', estilo: 'background: radial-gradient(circle, transparent 60%, rgba(0, 0, 0, 0.7) 100%);' }
        ],
        ambient: { tipo: 'solar_glow', velocidade: 'suave', ativo: false }
      },
      light: {
        colorScheme: 'light',
        palette: {
          primary: '#b45309',
          primaryHover: '#92400e',
          baseBg: '#fef9ee',
          surface1: '#fef3c7',
          surface2: '#ffffff',
          surface3: '#fde68a',
          textHigh: '#261c14',
          textMuted: '#78350f'
        },
        tokens: {
          bg: '#fef9ee',
          panel: '#fef3c7',
          card: '#ffffff',
          cardHover: '#fde68a',
          border: 'rgba(180, 83, 9, 0.2)',
          text: '#261c14',
          textMuted: '#78350f',
          accent: '#b45309',
          accentHover: '#92400e',
          btnBg: '#b45309',
          btnText: '#ffffff',
          focusRing: '0 0 0 2px rgba(180, 83, 9, 0.45)',
          doneColor: '#b45309',
          shadow: '0 4px 15px rgba(180, 83, 9, 0.1)',
          patternBg: `url("data:image/svg+xml,%3Csvg width='120' height='120' viewBox='0 0 120 120' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23b45309' stroke-width='1' opacity='0.05'%3E%3Ccircle cx='60' cy='60' r='14'/%3E%3Ccircle cx='60' cy='60' r='6'/%3E%3Cline x1='60' y1='36' x2='60' y2='42'/%3E%3Cline x1='60' y1='78' x2='60' y2='84'/%3E%3Cline x1='36' y1='60' x2='42' y2='60'/%3E%3Cline x1='78' y1='60' x2='84' y2='60'/%3E%3C/g%3E%3C/svg%3E")`
        },
        shape: {
          radiusSm: '8px',
          radiusMd: '10px',
          radiusLg: '14px',
          borderWidth: '1px'
        },
        typography: {
          family: 'var(--snoopy-font-sans)',
          headingFamily: 'var(--snoopy-font-heading)',
          weightNormal: '400',
          weightBold: '600'
        },
        scene: [
          { tipo: 'base', estilo: 'background: radial-gradient(circle at 50% 0%, #fffdf7 0%, #fef3c7 100%);' },
          { tipo: 'ornament', estilo: "background-image: url(\"data:image/svg+xml,%3Csvg width='160' height='160' viewBox='0 0 160 160' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23b45309' stroke-width='1.2' opacity='0.08'%3E%3Ccircle cx='80' cy='80' r='24'/%3E%3Ccircle cx='80' cy='80' r='10' fill='%23b45309' fill-opacity='0.1'/%3E%3Cline x1='80' y1='40' x2='80' y2='50'/%3E%3Cline x1='80' y1='110' x2='80' y2='120'/%3E%3Cline x1='40' y1='80' x2='50' y2='80'/%3E%3Cline x1='110' y1='80' x2='120' y2='80'/%3E%3C/g%3E%3C/svg%3E\");" },
          { tipo: 'texture', estilo: 'opacity: 0.02;' },
          { tipo: 'vignette', estilo: 'background: radial-gradient(circle, transparent 65%, rgba(180, 83, 9, 0.04) 100%);' }
        ],
        ambient: { tipo: 'solar_glow', velocidade: 'suave', ativo: false }
      }
    }
  },
  'theme-preset-rose': {
    id: 'theme-preset-rose',
    nome: 'Velvet Sakura',
    descricao: 'Rosa oriental com pétalas e ramos de cerejeira em suave contraste aveludado.',
    acento: '#f472b6',
    acentoHover: '#ec4899',
    bg: '#0d080b',
    panel: '#160e13',
    card: '#1d1319',
    cardHover: '#261821',
    border: 'rgba(244, 114, 182, 0.18)',
    text: '#fdf2f8',
    textMuted: '#f472b6',
    btnBg: '#f472b6',
    btnText: '#0d080b',
    focusRing: '0 0 0 2px rgba(244, 114, 182, 0.55)',
    doneColor: '#f472b6',
    patternBg: `url("data:image/svg+xml,%3Csvg width='140' height='140' viewBox='0 0 140 140' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23f472b6' stroke-width='1.2' opacity='0.055'%3E%3Cpath d='M70,52 C65,42 55,46 58,58 C62,70 70,76 70,76 C70,76 78,70 82,58 C85,46 75,42 70,52 Z'/%3E%3Ccircle cx='70' cy='62' r='2' fill='%23f472b6'/%3E%3Cpath d='M25,115 C22,108 14,112 16,120 C19,128 25,132 25,132 C25,132 31,128 34,120 C36,112 28,108 25,115 Z' transform='rotate(25 25 120)'/%3E%3C/g%3E%3C/svg%3E")`,
    modos: {
      dark: {
        colorScheme: 'dark',
        palette: {
          primary: '#f472b6',
          primaryHover: '#ec4899',
          baseBg: '#0d080b',
          surface1: '#160e13',
          surface2: '#1d1319',
          surface3: '#261821',
          textHigh: '#fdf2f8',
          textMuted: '#f472b6'
        },
        tokens: {
          bg: '#0d080b',
          panel: '#160e13',
          card: '#1d1319',
          cardHover: '#261821',
          border: 'rgba(244, 114, 182, 0.18)',
          text: '#fdf2f8',
          textMuted: '#f472b6',
          accent: '#f472b6',
          accentHover: '#ec4899',
          btnBg: '#f472b6',
          btnText: '#0d080b',
          focusRing: '0 0 0 2px rgba(244, 114, 182, 0.55)',
          doneColor: '#f472b6',
          shadow: '0 8px 30px rgba(13, 8, 11, 0.85)',
          patternBg: `url("data:image/svg+xml,%3Csvg width='140' height='140' viewBox='0 0 140 140' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23f472b6' stroke-width='1.2' opacity='0.055'%3E%3Cpath d='M70,52 C65,42 55,46 58,58 C62,70 70,76 70,76 C70,76 78,70 82,58 C85,46 75,42 70,52 Z'/%3E%3Ccircle cx='70' cy='62' r='2' fill='%23f472b6'/%3E%3Cpath d='M25,115 C22,108 14,112 16,120 C19,128 25,132 25,132 C25,132 31,128 34,120 C36,112 28,108 25,115 Z' transform='rotate(25 25 120)'/%3E%3C/g%3E%3C/svg%3E")`
        },
        shape: {
          radiusSm: '8px',
          radiusMd: '12px',
          radiusLg: '16px',
          borderWidth: '1px'
        },
        typography: {
          family: 'var(--snoopy-font-sans)',
          headingFamily: 'var(--snoopy-font-heading)',
          weightNormal: '400',
          weightBold: '600'
        },
        scene: [
          { tipo: 'base', estilo: 'background: radial-gradient(circle at 50% 0%, #20101a 0%, #0d080b 75%);' },
          { tipo: 'ornament', estilo: "background-image: url(\"data:image/svg+xml,%3Csvg width='140' height='140' viewBox='0 0 140 140' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23f472b6' opacity='0.09'%3E%3Cpath d='M70,40 C65,30 55,34 58,46 C62,58 70,64 70,64 C70,64 78,58 82,46 C85,34 75,30 70,40 Z'/%3E%3Cpath d='M25,100 C22,93 14,97 16,105 C19,113 25,117 25,117 C25,117 31,113 34,105 C36,97 28,93 25,100 Z' transform='rotate(30 25 105)'/%3E%3Ccircle cx='110' cy='85' r='3'/%3E%3C/g%3E%3C/svg%3E\");" },
          { tipo: 'texture', estilo: 'opacity: 0.025;' },
          { tipo: 'vignette', estilo: 'background: radial-gradient(circle, transparent 60%, rgba(0, 0, 0, 0.7) 100%);' }
        ],
        ambient: { tipo: 'sakura_drift', velocidade: 'suave', ativo: false }
      },
      light: {
        colorScheme: 'light',
        palette: {
          primary: '#db2777',
          primaryHover: '#be185d',
          baseBg: '#faf7f5',
          surface1: '#fce7f3',
          surface2: '#ffffff',
          surface3: '#fbcfe8',
          textHigh: '#2d1b24',
          textMuted: '#9d174d'
        },
        tokens: {
          bg: '#faf7f5',
          panel: '#fce7f3',
          card: '#ffffff',
          cardHover: '#fbcfe8',
          border: 'rgba(190, 24, 93, 0.2)',
          text: '#2d1b24',
          textMuted: '#9d174d',
          accent: '#db2777',
          accentHover: '#be185d',
          btnBg: '#db2777',
          btnText: '#ffffff',
          focusRing: '0 0 0 2px rgba(219, 39, 119, 0.45)',
          doneColor: '#db2777',
          shadow: '0 4px 15px rgba(190, 24, 93, 0.08)',
          patternBg: `url("data:image/svg+xml,%3Csvg width='140' height='140' viewBox='0 0 140 140' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' stroke='%23db2777' stroke-width='1.2' opacity='0.05'%3E%3Cpath d='M70,52 C65,42 55,46 58,58 C62,70 70,76 70,76 C70,76 78,70 82,58 C85,46 75,42 70,52 Z'/%3E%3C/g%3E%3C/svg%3E")`
        },
        shape: {
          radiusSm: '8px',
          radiusMd: '12px',
          radiusLg: '16px',
          borderWidth: '1px'
        },
        typography: {
          family: 'var(--snoopy-font-sans)',
          headingFamily: 'var(--snoopy-font-heading)',
          weightNormal: '400',
          weightBold: '600'
        },
        scene: [
          { tipo: 'base', estilo: 'background: radial-gradient(circle at 50% 0%, #fffbfc 0%, #fce7f3 100%);' },
          { tipo: 'ornament', estilo: "background-image: url(\"data:image/svg+xml,%3Csvg width='140' height='140' viewBox='0 0 140 140' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='%23db2777' opacity='0.07'%3E%3Cpath d='M70,40 C65,30 55,34 58,46 C62,58 70,64 70,64 C70,64 78,58 82,46 C85,34 75,30 70,40 Z'/%3E%3C/g%3E%3C/svg%3E\");" },
          { tipo: 'texture', estilo: 'opacity: 0.02;' },
          { tipo: 'vignette', estilo: 'background: radial-gradient(circle, transparent 65%, rgba(190, 24, 93, 0.04) 100%);' }
        ],
        ambient: { tipo: 'sakura_drift', velocidade: 'suave', ativo: false }
      }
    }
  }
};

let cachePorApp = new WeakMap();
let filaExecucaoPorApp = new WeakMap();

/**
 * Executa uma operação assíncrona serializada por instância de app usando fila em cadeia de Promises.
 * Garante exclusão mútua e atomicidade lógica para operações mutadoras de estado.
 *
 * @param {object} app - Instância do Obsidian App (chave do WeakMap).
 * @param {() => Promise<any>} operacaoAsync - Função que executa a transação.
 * @returns {Promise<any>}
 */
function executarSerializado(app, operacaoAsync) {
  if (!app || typeof app !== 'object') {
    return Promise.resolve().then(operacaoAsync);
  }

  const filaAtual = filaExecucaoPorApp.get(app) || Promise.resolve();
  const proximaFila = filaAtual
    .catch(() => {})
    .then(() => operacaoAsync());

  filaExecucaoPorApp.set(app, proximaFila.catch(() => {}));
  return proximaFila;
}

const ShopStore = {
  executarSerializado,
  CAMINHO_STORE,
  CAMINHO_STORE_LEGADO,
  CATALOGO: CATALOGO_LOJA,

  /**
   * Retorna os itens do catálogo, opcionalmente filtrados por categoria.
   *
   * @param {'botanical'|'audio'|'cosmetic'|null} [categoria=null]
   * @returns {Array<object>}
   */
  obterCatalogo(categoria = null) {
    if (!categoria) return [...CATALOGO_LOJA];
    return CATALOGO_LOJA.filter(i => i.categoria === categoria);
  },

  /**
   * Busca um item específico do catálogo pelo seu identificador único.
   *
   * @param {string} itemId
   * @returns {object|null}
   */
  obterItemPorId(itemId) {
    return CATALOGO_LOJA.find(i => i.id === itemId) || null;
  },

  /**
   * Retorna o estado padrão canônico da loja (schema v1).
   *
   * @returns {object}
   */
  obterEstadoPadrao() {
    return {
      versao: 1,
      saldo: 0,
      totalGanhosHistoricos: 0,
      colorScheme: 'dark',
      ambientEnabled: false,
      desbloqueados: ['sprout', 'audio-white-noise', 'theme-preset-snoopy'],
      equipados: {
        botanical: 'sprout',
        audio: 'audio-white-noise',
        cosmetic: 'theme-preset-snoopy'
      },
      estatisticasBotanicas: {
        totalPlantadas: 0
      },
      historicoTransacoes: []
    };
  },

  /**
   * Normaliza dados brutos lidos de arquivo (seja v1 ou legado) para o esquema padrão.
   * @private
   */
  _normalizarEstado(raw) {
    const padrao = this.obterEstadoPadrao();
    if (!raw || typeof raw !== 'object') return padrao;

    const saldoRaw = (raw.saldo !== undefined && raw.saldo !== null)
      ? raw.saldo
      : raw.moedas;
    const saldoNum = Number(saldoRaw);
    const saldo = (saldoRaw !== undefined && saldoRaw !== null && !Number.isNaN(saldoNum) && Number.isFinite(saldoNum))
      ? Math.max(0, Math.floor(saldoNum))
      : 0;

    let totalGanhosHistoricos = saldo;
    if (raw.totalGanhosHistoricos !== undefined && raw.totalGanhosHistoricos !== null) {
      const totNum = Number(raw.totalGanhosHistoricos);
      if (!Number.isNaN(totNum) && Number.isFinite(totNum)) {
        totalGanhosHistoricos = Math.max(saldo, Math.floor(totNum));
      }
    }

    const desbloqueadosRaw = (Array.isArray(raw.desbloqueados)
      ? raw.desbloqueados
      : (Array.isArray(raw.desbloqueadas) ? raw.desbloqueadas : []))
      .filter(id => typeof id === 'string' && id.trim().length > 0)
      .map(id => id.trim());

    const desbloqueados = [...new Set([...padrao.desbloqueados, ...desbloqueadosRaw])];

    const equipados = {
      botanical: (raw.equipados && typeof raw.equipados.botanical === 'string' && raw.equipados.botanical.trim().length > 0)
        ? raw.equipados.botanical.trim()
        : ((typeof raw.arvoreAtiva === 'string' && raw.arvoreAtiva.trim().length > 0) ? raw.arvoreAtiva.trim() : 'sprout'),
      audio: (raw.equipados && typeof raw.equipados.audio === 'string' && raw.equipados.audio.trim().length > 0)
        ? raw.equipados.audio.trim()
        : 'audio-white-noise',
      cosmetic: (raw.equipados && typeof raw.equipados.cosmetic === 'string' && raw.equipados.cosmetic.trim().length > 0)
        ? raw.equipados.cosmetic.trim()
        : 'theme-preset-snoopy'
    };

    const rawPlantadas = (raw.estatisticasBotanicas && raw.estatisticasBotanicas.totalPlantadas !== undefined && raw.estatisticasBotanicas.totalPlantadas !== null)
      ? raw.estatisticasBotanicas.totalPlantadas
      : raw.totalPlantadas;
    const numPlantadas = Number(rawPlantadas);
    const totalPlantadas = (rawPlantadas !== undefined && rawPlantadas !== null && !Number.isNaN(numPlantadas) && Number.isFinite(numPlantadas))
      ? Math.max(0, Math.floor(numPlantadas))
      : 0;

    const historicoTransacoes = Array.isArray(raw.historicoTransacoes)
      ? raw.historicoTransacoes.filter(t => t && typeof t === 'object')
      : (Array.isArray(raw.historicoCompras)
          ? raw.historicoCompras
              .filter(h => h && typeof h === 'object')
              .map((h, idx) => {
                const itemId = (h.id !== undefined && h.id !== null && String(h.id).trim().length > 0)
                  ? String(h.id).trim()
                  : 'desconhecido';
                const precoNum = Number(h.preco);
                const valor = (!Number.isNaN(precoNum) && Number.isFinite(precoNum)) ? Math.max(0, Math.floor(precoNum)) : 0;
                const dataIso = (typeof h.data === 'string' && h.data.trim().length > 0)
                  ? h.data
                  : new Date().toISOString();

                return {
                  id: `migracao_${itemId}_${Date.now()}_${idx}`,
                  tipo: 'compra_item',
                  itemId,
                  valor,
                  saldoResultante: saldo,
                  dataIso,
                  detalhes: { migrado: true }
                };
              })
          : []);

    const colorScheme = (raw.colorScheme === 'light' || raw.colorScheme === 'dark') ? raw.colorScheme : 'dark';
    const ambientEnabled = raw.ambientEnabled === true;

    return {
      versao: 1,
      saldo,
      totalGanhosHistoricos,
      colorScheme,
      ambientEnabled,
      desbloqueados,
      equipados,
      estatisticasBotanicas: { totalPlantadas },
      historicoTransacoes
    };
  },

  /**
   * Obtém o estado de forma síncrona através do cache de memória ou do mock de testes.
   * @private
   */
  _obterEstadoSincrono(app) {
    if (!app || typeof app !== 'object') return this.obterEstadoPadrao();
    if (cachePorApp.has(app)) return cachePorApp.get(app);

    // Suporte síncrono para testes automatizados via mock vault._getRawStore()
    if (app.vault && typeof app.vault._getRawStore === 'function') {
      try {
        const storeMap = app.vault._getRawStore();
        const rawShop = storeMap.get(CAMINHO_STORE);
        const rawLegado = storeMap.get(CAMINHO_STORE_LEGADO);
        const raw = rawShop || rawLegado;
        if (raw) {
          const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
          const estado = this._normalizarEstado(parsed);
          cachePorApp.set(app, estado);
          return estado;
        }
      } catch (_) {
        // Fallback para estado padrão
      }
    }

    return this.obterEstadoPadrao();
  },

  /**
   * Lê o estado da loja a partir do cofre ou realiza migração do arquivo legado.
   *
   * @param {object} app - Instância do Obsidian App.
   * @returns {Promise<object>}
   */
  async carregar(app) {
    if (!app || !app.vault) return this.obterEstadoPadrao();

    try {
      const fileShop = app.vault.getAbstractFileByPath(CAMINHO_STORE);
      if (fileShop) {
        const conteudo = await app.vault.read(fileShop);
        const parsed = JSON.parse(conteudo);
        const estado = this._normalizarEstado(parsed);
        cachePorApp.set(app, estado);
        return estado;
      }

      // Migração automática a partir do arquivo legado se o shop store ainda não existir
      const fileLegado = app.vault.getAbstractFileByPath(CAMINHO_STORE_LEGADO);
      if (fileLegado) {
        const conteudoLegado = await app.vault.read(fileLegado);
        const parsedLegado = JSON.parse(conteudoLegado);
        const estadoMigrado = this._normalizarEstado(parsedLegado);
        await this.salvar(app, estadoMigrado);
        cachePorApp.set(app, estadoMigrado);
        return estadoMigrado;
      }
    } catch (e) {
      console.warn('[ShopStore] Falha ao ler store, inicializando padrão seguro:', e);
    }

    const padrao = this.obterEstadoPadrao();
    if (typeof app === 'object') {
      cachePorApp.set(app, padrao);
    }
    return padrao;
  },

  /**
   * Salva o estado da loja no cofre e atualiza o cache local.
   *
   * @param {object} app - Instância do Obsidian App.
   * @param {object} estado - Estado completo a persistir.
   */
  async salvar(app, estado) {
    if (!app || !app.vault) return;

    try {
      if (typeof app === 'object') {
        cachePorApp.set(app, estado);
      }
      const jsonStr = JSON.stringify(estado, null, 2);
      const file = app.vault.getAbstractFileByPath(CAMINHO_STORE);
      if (file) {
        await app.vault.modify(file, jsonStr);
      } else if (typeof app.vault.create === 'function') {
        await app.vault.create(CAMINHO_STORE, jsonStr);
      }

      // Sincronização defensiva com arquivo legado para retrocompatibilidade
      const legacyFile = app.vault.getAbstractFileByPath(CAMINHO_STORE_LEGADO);
      const saldoLegado = (!Number.isNaN(Number(estado.saldo)) && Number.isFinite(Number(estado.saldo)))
        ? Math.max(0, Math.floor(Number(estado.saldo)))
        : 0;
      const desbloqueadasLegadas = (Array.isArray(estado.desbloqueados) ? estado.desbloqueados : [])
        .filter(id => typeof id === 'string' && id.trim().length > 0)
        .filter(id => !id.startsWith('audio-') && !id.startsWith('theme-'));
      const transacoesLegadas = (Array.isArray(estado.historicoTransacoes) ? estado.historicoTransacoes : [])
        .filter(t => t && typeof t === 'object')
        .map(t => ({
          id: t.itemId || 'desconhecido',
          preco: (!Number.isNaN(Number(t.valor)) && Number.isFinite(Number(t.valor)))
            ? Math.max(0, Math.floor(Number(t.valor)))
            : 0,
          data: typeof t.dataIso === 'string' ? t.dataIso : new Date().toISOString()
        }));

      const legacyJson = JSON.stringify({
        moedas: saldoLegado,
        arvoreAtiva: (estado.equipados && typeof estado.equipados.botanical === 'string') ? estado.equipados.botanical : 'sprout',
        desbloqueadas: desbloqueadasLegadas,
        totalPlantadas: (estado.estatisticasBotanicas && !Number.isNaN(Number(estado.estatisticasBotanicas.totalPlantadas)) && Number.isFinite(Number(estado.estatisticasBotanicas.totalPlantadas)))
          ? Math.max(0, Math.floor(Number(estado.estatisticasBotanicas.totalPlantadas)))
          : 0,
        historicoCompras: transacoesLegadas
      }, null, 2);

      if (legacyFile) {
        await app.vault.modify(legacyFile, legacyJson);
      } else if (typeof app.vault.create === 'function') {
        await app.vault.create(CAMINHO_STORE_LEGADO, legacyJson);
      }
    } catch (e) {
      console.error('[ShopStore] Falha ao salvar estado:', e);
    }
  },


  /**
   * Retorna o saldo atual de moedas de foco de forma síncrona.
   *
   * @param {object} app
   * @returns {number}
   */
  obterSaldo(app) {
    return this._obterEstadoSincrono(app).saldo;
  },

  /**
   * Retorna a lista de identificadores desbloqueados, opcionalmente filtrada por categoria.
   *
   * @param {object} app
   * @param {'botanical'|'audio'|'cosmetic'|null} [categoria=null]
   * @returns {Array<string>}
   */
  obterItensDesbloqueados(app, categoria = null) {
    const estado = this._obterEstadoSincrono(app);
    const lista = (Array.isArray(estado.desbloqueados) ? estado.desbloqueados : [])
      .filter(id => typeof id === 'string' && id.trim().length > 0);

    if (!categoria) return [...lista];

    return lista.filter(id => {
      if (typeof id !== 'string' || id.trim().length === 0) return false;
      const item = this.obterItemPorId(id);
      if (item) return item.categoria === categoria;
      if (categoria === 'audio') return id.startsWith('audio-');
      if (categoria === 'cosmetic') return id.startsWith('theme-');
      if (categoria === 'botanical') return !id.startsWith('audio-') && !id.startsWith('theme-');
      return false;
    });
  },

  /**
   * Retorna o identificador do item equipado em uma dada categoria.
   *
   * @param {object} app
   * @param {'botanical'|'audio'|'cosmetic'} categoria
   * @returns {Promise<string|null>}
   */
  async obterEquipado(app, categoria) {
    const estado = await this.carregar(app);
    return (estado.equipados && estado.equipados[categoria]) || null;
  },

  /**
   * Credita moedas de foco na economia do usuário.
   *
   * @param {object} app
   * @param {number} quantidade
   * @param {string} [motivo='credito_manual']
   * @param {object|null} [eventBus=null]
   * @returns {Promise<number>} Novo saldo
   */
  async creditarMoedas(app, quantidade, motivo = 'credito_manual', eventBus = null) {
    return executarSerializado(app, async () => {
      const estado = await this.carregar(app);
      const qtdNum = Number(quantidade);
      const qtd = (!Number.isNaN(qtdNum) && Number.isFinite(qtdNum)) ? Math.max(0, Math.floor(qtdNum)) : 0;

      estado.saldo += qtd;
      estado.totalGanhosHistoricos += qtd;
      estado.historicoTransacoes.push({
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tipo: 'credito_foco',
        valor: qtd,
        saldoResultante: estado.saldo,
        dataIso: new Date().toISOString(),
        detalhes: { motivo }
      });

      await this.salvar(app, estado);

      if (eventBus && typeof eventBus.emit === 'function') {
        try {
          eventBus.emit('economy:balance_updated', {
            saldoAtual: estado.saldo,
            delta: qtd,
            motivo
          });
        } catch (err) {
          console.warn('[ShopStore] Erro ao emitir evento de saldo:', err);
        }
      }

      return estado.saldo;
    });
  },

  /**
   * Credita moedas ganhas por conclusão de ciclo de foco no Pomodoro,
   * calculando a base (1 moeda a cada 5m) e bônus progressivo por combo.
   *
   * @param {object} app
   * @param {number} [minutos=25]
   * @param {number} [comboCiclos=1]
   * @param {object|null} [eventBus=null]
   * @returns {Promise<{ moedasGanhas: number, base: number, bonusCombo: number, combo: number, saldoAtual: number }>}
   */
  async creditarFoco(app, minutos = 25, comboCiclos = 1, eventBus = null) {
    return executarSerializado(app, async () => {
      const estado = await this.carregar(app);
      const mNum = Number(minutos);
      const m = (!Number.isNaN(mNum) && Number.isFinite(mNum)) ? Math.max(0, mNum) : 25;
      const base = Math.max(1, Math.floor(m / 5));

      const comboNum = Number(comboCiclos);
      const combo = (!Number.isNaN(comboNum) && Number.isFinite(comboNum)) ? Math.max(1, comboNum) : 1;

      let bonusCombo = 0;
      if (combo >= 10) bonusCombo = 3;
      else if (combo >= 5) bonusCombo = 2;
      else if (combo >= 3) bonusCombo = 1;

      const moedasGanhas = base + bonusCombo;
      estado.saldo += moedasGanhas;
      estado.totalGanhosHistoricos += moedasGanhas;

      if (!estado.estatisticasBotanicas) {
        estado.estatisticasBotanicas = { totalPlantadas: 0 };
      }
      estado.estatisticasBotanicas.totalPlantadas += 1;

      estado.historicoTransacoes.push({
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tipo: 'credito_foco',
        valor: moedasGanhas,
        saldoResultante: estado.saldo,
        dataIso: new Date().toISOString(),
        detalhes: { minutos: m, comboCiclos: combo, bonusCombo, base }
      });

      await this.salvar(app, estado);

      if (eventBus && typeof eventBus.emit === 'function') {
        try {
          eventBus.emit('economy:balance_updated', {
            saldoAtual: estado.saldo,
            delta: moedasGanhas,
            motivo: 'foco_pomodoro'
          });
        } catch (err) {
          console.warn('[ShopStore] Erro ao emitir evento de foco:', err);
        }
      }

      return {
        moedasGanhas,
        base,
        bonusCombo,
        combo,
        saldoAtual: estado.saldo
      };
    });
  },

  /**
   * Executa a compra e desbloqueio de um item do catálogo.
   *
   * @param {object} app
   * @param {string} itemId
   * @param {object|null} [eventBus=null]
   * @returns {Promise<{ sucesso: boolean, mensagem: string, estado?: object, item?: object, erro?: string }>}
   */
  async comprarItem(app, itemId, eventBus = null) {
    return executarSerializado(app, async () => {
      const item = this.obterItemPorId(itemId);
      if (!item) {
        return { sucesso: false, mensagem: 'Item não encontrado no catálogo.', erro: 'ITEM_NOT_FOUND' };
      }

      const estado = await this.carregar(app);
      if (estado.desbloqueados.includes(itemId)) {
        return { sucesso: false, mensagem: 'Este item já foi desbloqueado!', erro: 'ALREADY_UNLOCKED', estado, item };
      }

      if (estado.saldo < item.preco) {
        const faltam = item.preco - estado.saldo;
        return { sucesso: false, mensagem: `Moedas insuficientes. Faltam ${faltam} moedas de foco.`, erro: 'INSUFFICIENT_FUNDS', estado, item };
      }

      estado.saldo -= item.preco;
      estado.desbloqueados.push(itemId);

      if (item.categoria && estado.equipados[item.categoria] !== undefined) {
        estado.equipados[item.categoria] = itemId;
      }

      estado.historicoTransacoes.push({
        id: `tx_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        tipo: 'compra_item',
        itemId,
        valor: item.preco,
        saldoResultante: estado.saldo,
        dataIso: new Date().toISOString(),
        detalhes: { categoria: item.categoria, nome: item.nome }
      });

      await this.salvar(app, estado);

      if (eventBus && typeof eventBus.emit === 'function') {
        try {
          eventBus.emit('shop:item_purchased', { item, saldoAtual: estado.saldo });
          eventBus.emit('economy:balance_updated', { saldoAtual: estado.saldo, delta: -item.preco, motivo: 'compra_item' });
          eventBus.emit('inventory:item_equipped', { categoria: item.categoria, itemId, item });
          if (item.categoria === 'cosmetic') {
            eventBus.emit('theme:changed', { themeId: itemId, tema: this.obterConfigTema(itemId) });
          }
        } catch (err) {
          console.warn('[ShopStore] Erro ao emitir eventos de compra:', err);
        }
      }

      if (item.categoria === 'cosmetic') {
        this.aplicarTema(itemId);
      }

      return {
        sucesso: true,
        mensagem: `[Snoopy Loja] ${item.nome} desbloqueado com sucesso!`,
        estado,
        item
      };
    });
  },

  /**
   * Equipa um item já desbloqueado na respectiva categoria.
   *
   * @param {object} app
   * @param {string} itemId
   * @param {object|null} [eventBus=null]
   * @returns {Promise<{ sucesso: boolean, mensagem: string, estado?: object, item?: object }>}
   */
  async equiparItem(app, itemId, eventBus = null) {
    return executarSerializado(app, async () => {
      const item = this.obterItemPorId(itemId);
      const estado = await this.carregar(app);

      if (!item || !estado.desbloqueados.includes(itemId)) {
        return { sucesso: false, mensagem: 'Item bloqueado. Compre na loja primeiro.', estado };
      }

      if (item.categoria && estado.equipados[item.categoria] !== undefined) {
        estado.equipados[item.categoria] = itemId;
      }

      await this.salvar(app, estado);

      if (eventBus && typeof eventBus.emit === 'function') {
        try {
          eventBus.emit('inventory:item_equipped', { categoria: item.categoria, itemId, item });
          if (item.categoria === 'cosmetic') {
            eventBus.emit('theme:changed', { themeId: itemId, tema: this.obterConfigTema(itemId) });
          }
        } catch (err) {
          console.warn('[ShopStore] Erro ao emitir evento de equipamento:', err);
        }
      }

      if (item.categoria === 'cosmetic') {
        this.aplicarTema(itemId);
      }

      return {
        sucesso: true,
        mensagem: `Item ${item.nome} equipado com sucesso.`,
        estado,
        item
      };
    });
  },

  /**
   * Dicionário canônico de configurações e tokens visuais por tema cosmético.
   */
  TEMAS: TEMAS_CONFIG,

  /**
   * Retorna a configuração de tokens de um tema específico pelo ID e modo opcional ('dark'|'light').
   *
   * @param {string} [temaId='theme-preset-snoopy']
   * @param {string|null} [modo=null]
   * @returns {object}
   */
  obterConfigTema(temaId = 'theme-preset-snoopy', modo = null) {
    const raw = TEMAS_CONFIG[temaId] || TEMAS_CONFIG['theme-preset-snoopy'];
    if (!modo) return raw;
    if (raw.modos && raw.modos[modo]) {
      return {
        ...raw,
        ...raw.modos[modo],
        id: raw.id,
        nome: raw.nome,
        colorScheme: modo
      };
    }
    return raw;
  },

  /**
   * Aplica dinamicamente os design tokens do tema equipado no documento HTML sem necessidade de recarregar,
   * estendendo-se por toda a interface global do Obsidian (workspace, modais, painéis e ribbon).
   *
   * @param {string} temaId
   * @param {Document|null} [targetDoc=null]
   * @param {string|null} [schemeOverride=null]
   * @returns {boolean}
   */
  aplicarTema(temaId, targetDoc = null, schemeOverride = null) {
    const doc = targetDoc || (typeof document !== 'undefined' ? document : null);
    if (!doc || !doc.documentElement) return false;

    let scheme = schemeOverride;
    if (!scheme && doc.documentElement.getAttribute) {
      scheme = doc.documentElement.getAttribute('data-snoopy-scheme') || 'dark';
    }
    if (scheme !== 'light' && scheme !== 'dark') scheme = 'dark';

    const cfgBase = TEMAS_CONFIG[temaId] || TEMAS_CONFIG['theme-preset-snoopy'];
    const cfgModo = (cfgBase.modos && cfgBase.modos[scheme]) ? cfgBase.modos[scheme] : null;
    const tokens = cfgModo ? cfgModo.tokens : cfgBase;

    try {
      doc.documentElement.setAttribute('data-snoopy-theme', cfgBase.id);
      doc.documentElement.setAttribute('data-snoopy-scheme', scheme);
      if (doc.body) {
        doc.body.setAttribute('data-snoopy-theme', cfgBase.id);
        doc.body.setAttribute('data-snoopy-scheme', scheme);
        ['snoopy-theme-snoopy', 'snoopy-theme-cyber', 'snoopy-theme-solar', 'snoopy-theme-rose'].forEach(cls => {
          doc.body.classList.remove(cls);
        });
        const sufixo = cfgBase.id.replace('theme-preset-', '');
        doc.body.classList.add(`snoopy-theme-${sufixo}`);
        doc.body.classList.remove('snoopy-scheme-dark', 'snoopy-scheme-light');
        doc.body.classList.add(`snoopy-scheme-${scheme}`);
      }

      const rootStyle = doc.documentElement.style;
      const acento = tokens.accent || cfgBase.acento;
      const acentoHover = tokens.accentHover || cfgBase.acentoHover;

      // 1. Tokens Semânticos do Snoopy Vault
      rootStyle.setProperty('--snoopy-module-accent', acento);
      rootStyle.setProperty('--snoopy-accent-hover', acentoHover);
      rootStyle.setProperty('--snoopy-focus-ring', tokens.focusRing);
      rootStyle.setProperty('--snoopy-green-done', tokens.doneColor);
      rootStyle.setProperty('--snoopy-green-bright', acento);
      rootStyle.setProperty('--snoopy-bg', tokens.bg);
      rootStyle.setProperty('--snoopy-panel', tokens.panel);
      rootStyle.setProperty('--snoopy-card', tokens.card);
      rootStyle.setProperty('--snoopy-card-hover', tokens.cardHover);
      rootStyle.setProperty('--snoopy-border', tokens.border);
      rootStyle.setProperty('--snoopy-text', tokens.text);
      rootStyle.setProperty('--snoopy-text-body', tokens.text);
      rootStyle.setProperty('--snoopy-muted', tokens.textMuted);
      rootStyle.setProperty('--snoopy-btn-bg', tokens.btnBg);
      rootStyle.setProperty('--snoopy-btn-text', tokens.btnText);
      rootStyle.setProperty('--snoopy-pattern-bg', tokens.patternBg);

      // 2. Tokens Nativos do Obsidian (Efeito em TODA a interface global)
      rootStyle.setProperty('--background-primary', tokens.bg);
      rootStyle.setProperty('--background-primary-alt', tokens.panel);
      rootStyle.setProperty('--background-secondary', tokens.panel);
      rootStyle.setProperty('--background-secondary-alt', tokens.cardHover);
      rootStyle.setProperty('--background-modifier-border', tokens.border);
      rootStyle.setProperty('--text-normal', tokens.text);
      rootStyle.setProperty('--text-muted', tokens.textMuted);
      rootStyle.setProperty('--text-accent', acento);
      rootStyle.setProperty('--interactive-accent', acento);
      rootStyle.setProperty('--interactive-accent-hover', acentoHover);

      // 3. Montar / Atualizar Elemento de Fundo Artístico de Camadas (#snoopy-theme-scene)
      if (doc.body && typeof doc.getElementById === 'function' && typeof doc.createElement === 'function' && cfgModo && Array.isArray(cfgModo.scene)) {
        let sceneEl = doc.getElementById('snoopy-theme-scene');
        if (!sceneEl) {
          sceneEl = doc.createElement('div');
          sceneEl.id = 'snoopy-theme-scene';
          sceneEl.className = 'snoopy-theme-scene-container';
          doc.body.prepend(sceneEl);
        }
        sceneEl.innerHTML = '';
        cfgModo.scene.forEach(camada => {
          const lDiv = doc.createElement('div');
          lDiv.className = `snoopy-scene-layer snoopy-scene-layer-${camada.tipo}`;
          if (camada.estilo) {
            lDiv.setAttribute('style', camada.estilo);
          }
          sceneEl.appendChild(lDiv);
        });
      }

      return true;
    } catch (err) {
      console.warn('[ShopStore] Erro ao aplicar design tokens do tema:', err);
      return false;
    }
  },

  /**
   * Retorna o esquema de cores atual ('dark' ou 'light').
   *
   * @param {object} app
   * @returns {Promise<'dark'|'light'>}
   */
  async obterColorScheme(app) {
    const estado = await this.carregar(app);
    return estado.colorScheme || 'dark';
  },

  /**
   * Define e persiste o esquema de cores ('dark' ou 'light'), aplicando imediatamente.
   *
   * @param {object} app
   * @param {'dark'|'light'} scheme
   * @param {Document|null} [targetDoc=null]
   * @returns {Promise<'dark'|'light'>}
   */
  async definirColorScheme(app, scheme, targetDoc = null) {
    const val = (scheme === 'light') ? 'light' : 'dark';
    await executarSerializado(app, async () => {
      const estado = await this.carregar(app);
      estado.colorScheme = val;
      await this.salvar(app, estado);
    });
    const temaId = await this.obterTemaEquipado(app);
    this.aplicarTema(temaId, targetDoc, val);
    return val;
  },

  /**
   * Alterna entre modo claro e escuro, persistindo e aplicando sem recarregar.
   *
   * @param {object} app
   * @param {Document|null} [targetDoc=null]
   * @returns {Promise<'dark'|'light'>}
   */
  async alternarColorScheme(app, targetDoc = null) {
    const atual = await this.obterColorScheme(app);
    const novo = (atual === 'light') ? 'dark' : 'light';
    return await this.definirColorScheme(app, novo, targetDoc);
  },

  /**
   * Retorna se a animação ambiente de fundo está habilitada.
   *
   * @param {object} app
   * @returns {Promise<boolean>}
   */
  async obterAmbientEnabled(app) {
    const estado = await this.carregar(app);
    return estado.ambientEnabled === true;
  },

  /**
   * Habilita ou desabilita animações de fundo ambiente e sincroniza classe CSS no body.
   *
   * @param {object} app
   * @param {boolean} enabled
   * @param {Document|null} [targetDoc=null]
   * @returns {Promise<boolean>}
   */
  async definirAmbientEnabled(app, enabled, targetDoc = null) {
    const val = enabled === true;
    await executarSerializado(app, async () => {
      const estado = await this.carregar(app);
      estado.ambientEnabled = val;
      await this.salvar(app, estado);
    });
    const doc = targetDoc || (typeof document !== 'undefined' ? document : null);
    if (doc && doc.body) {
      if (val) {
        doc.body.classList.add('snoopy-ambient-active');
      } else {
        doc.body.classList.remove('snoopy-ambient-active');
      }
    }
    return val;
  },

  /**
   * Retorna o ID do tema cosmético atualmente equipado no cofre.
   *
   * @param {object} app
   * @returns {Promise<string>}
   */
  async obterTemaEquipado(app) {
    const estado = await this.carregar(app);
    return (estado.equipados && estado.equipados.cosmetic) || 'theme-preset-snoopy';
  },

  /**
   * Limpa a referência de cache em memória para a instância de app informada.
   *
   * @param {object|null} [app=null]
   */
  limparCacheMemoria(app = null) {
    if (app && typeof app === 'object') {
      cachePorApp.delete(app);
      filaExecucaoPorApp.delete(app);
    } else {
      cachePorApp = new WeakMap();
      filaExecucaoPorApp = new WeakMap();
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = ShopStore;
}
if (typeof window !== 'undefined') {
  window.ShopStore = ShopStore;
}

return ShopStore;
