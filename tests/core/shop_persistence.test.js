const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

function criarMockApp(fileStore = new Map()) {
  const vault = {
    getAbstractFileByPath: (p) => {
      if (fileStore.has(p)) {
        return { path: p, name: path.basename(p) };
      }
      return null;
    },
    read: async (file) => {
      const p = typeof file === 'string' ? file : file.path;
      if (!fileStore.has(p)) throw new Error(`File not found: ${p}`);
      return fileStore.get(p);
    },
    modify: async (file, content) => {
      const p = typeof file === 'string' ? file : file.path;
      fileStore.set(p, typeof content === 'string' ? content : JSON.stringify(content));
    },
    create: async (filePath, content) => {
      if (fileStore.has(filePath)) throw new Error(`File already exists: ${filePath}`);
      fileStore.set(filePath, typeof content === 'string' ? content : JSON.stringify(content));
      return { path: filePath, name: path.basename(filePath) };
    },
    adapter: {
      exists: async (filePath) => fileStore.has(filePath),
      read: async (filePath) => fileStore.get(filePath),
      write: async (filePath, content) => {
        fileStore.set(filePath, typeof content === 'string' ? content : JSON.stringify(content));
      }
    },
    _getRawStore: () => fileStore
  };

  return { vault };
}

describe('ShopStore - Persistência Resiliente entre Sessões (Fechamento e Reabertura)', () => {
  let ShopStore;

  test('Configura ShopStore e mock de localStorage', () => {
    ShopStore = require('../../99_Meta/Snoopy/core/shop_store.js');
    assert.strictEqual(typeof ShopStore, 'object');
  });

  test('Moedas, compras, tema equipado e colorScheme persistem ao fechar e recriar instância de App', async () => {
    const discoCompartilhado = new Map();
    const appSessao1 = criarMockApp(discoCompartilhado);

    // 1. Carrega sessão 1
    const estado1 = await ShopStore.carregar(appSessao1);
    assert.strictEqual(estado1.saldo, 0);

    // 2. Credita 250 moedas de foco
    await ShopStore.creditarMoedas(appSessao1, 250, 'foco');
    assert.strictEqual(ShopStore.obterSaldo(appSessao1), 250);

    // 3. Compra e equipa tema solar (preco: 200)
    const resCompra = await ShopStore.comprarItem(appSessao1, 'theme-preset-solar');
    assert.strictEqual(resCompra.sucesso, true);

    // 4. Define modo claro (light)
    await ShopStore.definirColorScheme(appSessao1, 'light');
    await ShopStore.definirAmbientEnabled(appSessao1, true);

    // Validações na Sessão 1
    assert.strictEqual(ShopStore.obterSaldo(appSessao1), 250 - resCompra.item.preco);
    assert.strictEqual(await ShopStore.obterTemaEquipado(appSessao1), 'theme-preset-solar');
    assert.strictEqual(await ShopStore.obterColorScheme(appSessao1), 'light');
    assert.strictEqual(await ShopStore.obterAmbientEnabled(appSessao1), true);

    // --- SIMULAÇÃO DE FECHAMENTO COMPLETO DO OBSIDIAN ---
    // Limpa o cache em memória (simulando encerramento do processo V8)
    if (typeof ShopStore.limparCacheMemoria === 'function') {
      ShopStore.limparCacheMemoria();
    }

    // Cria nova instância de App (Sessão 2) lendo do mesmo disco persistido
    const appSessao2 = criarMockApp(discoCompartilhado);

    // Carrega sessão 2
    const estado2 = await ShopStore.carregar(appSessao2);

    // 5. Assegura que saldo, compras, tema equipado, colorScheme e ambientEnabled continuam intactos
    assert.strictEqual(estado2.saldo, 250 - resCompra.item.preco);
    assert.ok(estado2.desbloqueados.includes('theme-preset-solar'));
    assert.strictEqual(estado2.equipados.cosmetic, 'theme-preset-solar');
    assert.strictEqual(estado2.colorScheme, 'light');
    assert.strictEqual(estado2.ambientEnabled, true);

    assert.strictEqual(ShopStore.obterSaldo(appSessao2), 250 - resCompra.item.preco);
    assert.strictEqual(await ShopStore.obterTemaEquipado(appSessao2), 'theme-preset-solar');
    assert.strictEqual(await ShopStore.obterColorScheme(appSessao2), 'light');
    assert.strictEqual(await ShopStore.obterAmbientEnabled(appSessao2), true);
  });

  test('Persistência resiliente com LocalStorage quando disco temporariamente ausente', async () => {
    // Simula ambiente de navegador/Electron com window.localStorage
    const storageMemoria = new Map();
    global.window = {
      localStorage: {
        getItem: (k) => storageMemoria.get(k) || null,
        setItem: (k, v) => storageMemoria.set(k, String(v)),
        removeItem: (k) => storageMemoria.delete(k)
      }
    };

    const disco = new Map();
    const app = criarMockApp(disco);

    // Credita moedas e equipa tema cyber
    await ShopStore.creditarMoedas(app, 300, 'pomodoro');
    await ShopStore.comprarItem(app, 'theme-preset-cyber');
    await ShopStore.definirColorScheme(app, 'dark');

    // Valida que foi salvo no localStorage
    assert.ok(storageMemoria.has('snoopy_vault_shop_state'));
    assert.strictEqual(storageMemoria.get('snoopy_vault_theme'), 'theme-preset-cyber');

    // Limpa cache de memória
    if (typeof ShopStore.limparCacheMemoria === 'function') {
      ShopStore.limparCacheMemoria();
    }

    // Cria nova sessão de app onde o arquivo de cofre foi temporariamente perdido
    const discoVazio = new Map();
    const appRecuperado = criarMockApp(discoVazio);

    // Ao carregar, o ShopStore deve restaurar os dados do localStorage e re-gravar no cofre
    const estadoRecuperado = await ShopStore.carregar(appRecuperado);

    assert.ok(estadoRecuperado.saldo > 0);
    assert.ok(estadoRecuperado.desbloqueados.includes('theme-preset-cyber'));
    assert.strictEqual(estadoRecuperado.equipados.cosmetic, 'theme-preset-cyber');
    assert.strictEqual(estadoRecuperado.colorScheme, 'dark');

    // Assegura que o arquivo no cofre vazio foi restaurado e gravado
    assert.ok(discoVazio.has('99_Meta/snoopy-shop.json'));

    // Limpeza
    delete global.window;
  });
});
