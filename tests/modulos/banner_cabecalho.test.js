/**
 * Snoopy Vault - Testes Unitários do Módulo 01: Banner e Cabeçalho
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const { createMockEl, carregarModulo } = require('../helpers/test_utils.js');
const UIKit = require('../../99_Meta/Snoopy/core/ui_kit.js');

// Mock global de Notice do Obsidian
global.Notice = class {
  constructor(msg) {
    this.message = msg;
  }
};

describe('Módulo 01 - Banner e Cabeçalho (01_snoopy_banner_cabecalho)', () => {
  const moduloBanner = carregarModulo('99_Meta/Snoopy/modulos/01_snoopy_banner_cabecalho.js');

  test('Exporta metadados canônicos do módulo', () => {
    assert.strictEqual(moduloBanner.id, 'snoopy_banner_cabecalho');
    assert.strictEqual(moduloBanner.titulo, 'Banner & Cabeçalho');
    assert.strictEqual(typeof moduloBanner.render, 'function');
  });

  test('Renderiza banner panorâmico, data formatada e pílulas de navegação', async () => {
    const root = createMockEl('div');
    const linksAbertos = [];
    const notasCriadas = [];

    const mockApp = {
      vault: {
        adapter: {
          getResourcePath: (p) => `app://local/${p}`
        }
      },
      workspace: {
        openLinkText: async (path) => {
          linksAbertos.push(path);
        }
      }
    };

    const mockCtx = {
      root,
      app: mockApp,
      now: new Date(2026, 9, 24), // 24 de Outubro de 2026
      formattedDate: 'sábado, 24 de outubro de 2026',
      garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-24.md', basename: '2026-10-24' }),
      criarNotaInstantanea: (folder, tpl, prefix) => {
        notasCriadas.push({ folder, tpl, prefix });
      },
      config: {
        banner_imagem: '99_Meta/Attachments/snoopy_panoramic.jpg'
      },
      UIKit,
      renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts)
    };

    await moduloBanner.render(mockCtx);

    // 1. Validação do Banner
    const bannerBox = root.querySelector('.snoopy-banner-box');
    assert.ok(bannerBox, 'Contêiner do banner deve existir');
    const img = bannerBox.querySelector('img');
    assert.ok(img);
    assert.strictEqual(img.alt, 'Snoopy Lendo Panorâmico');
    assert.strictEqual(img.src, 'app://local/99_Meta/Attachments/snoopy_panoramic.jpg');

    // 2. Validação da Data
    const dateTitle = root.querySelector('.snoopy-date-title');
    assert.ok(dateTitle);
    assert.strictEqual(dateTitle.innerText, 'Sábado, 24 de outubro de 2026');

    const metaSub = root.querySelector('.snoopy-meta');
    assert.ok(metaSub);
    assert.ok(metaSub.innerText.includes('24-10-2026'));

    // 3. Validação das Ações de Navegação
    const navPills = root.querySelector('.snoopy-nav-pills');
    assert.ok(navPills);
    assert.strictEqual(navPills.children.length, 6);

    // Disparar clique em HOJE
    const btnHoje = navPills.children[0];
    btnHoje.dispatchEvent('click');
    await new Promise(r => setImmediate(r));
    assert.strictEqual(linksAbertos.length, 1);
    assert.strictEqual(linksAbertos[0], '01_Inbox/Diário/2026-10-24.md');

    // Disparar clique em ESTUDOS
    const btnEstudos = navPills.children[1];
    btnEstudos.dispatchEvent('click');
    await new Promise(r => setImmediate(r));
    assert.strictEqual(linksAbertos.length, 2);
    assert.strictEqual(linksAbertos[1], '03_Estudos/Painel de Estudos.md');

    // Disparar clique em + PROJETO
    const btnProjeto = navPills.children[3];
    btnProjeto.dispatchEvent('click');
    await new Promise(r => setImmediate(r));
    assert.strictEqual(notasCriadas.length, 1);
    assert.strictEqual(notasCriadas[0].folder, '02_Projetos');
    assert.strictEqual(notasCriadas[0].prefix, 'Novo Projeto');

    // Disparar clique em CONFIG
    const btnConfig = navPills.children[5];
    btnConfig.dispatchEvent('click');
    await new Promise(r => setImmediate(r));
    assert.strictEqual(linksAbertos.length, 3);
    assert.strictEqual(linksAbertos[2], '99_Meta/⚙️ Configurações.md');
  });
});
