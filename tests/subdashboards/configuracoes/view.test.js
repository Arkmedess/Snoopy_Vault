/**
 * Snoopy Vault - Testes Unitários do Subdashboard de Configurações
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderConfiguracoes } = require('../../../99_Meta/Snoopy/subdashboards/configuracoes/view.js');

function createMockEl(tag = 'div', attrs = {}) {
  const el = {
    tagName: tag,
    attrs: { ...attrs },
    style: {},
    innerHTML: '',
    children: [],
    className: attrs.cls || '',
    innerText: attrs.text || '',
    createEl: (childTag, opts = {}) => {
      const child = createMockEl(childTag, opts.attr || {});
      if (opts.cls) child.className = opts.cls;
      if (opts.text) child.innerText = opts.text;
      if (opts.innerHTML) child.innerHTML = opts.innerHTML;
      el.children.push(child);
      return child;
    },
    empty: () => {
      el.children = [];
      el.innerHTML = '';
      el.innerText = '';
    },
    addEventListener: () => {}
  };
  return el;
}

describe('Subdashboard Configurações - View', () => {
  test('Exporta a função renderConfiguracoes', () => {
    assert.strictEqual(typeof renderConfiguracoes, 'function');
  });

  test('Renderiza os 3 cards fundamentais (Atualização, Mocks e 3 Zonas) sem erros', async () => {
    const rootContainer = createMockEl('div');
    const mockDv = { container: rootContainer };

    // Mock seguro do Vault que lê arquivos reais do projeto em disco
    const mockApp = {
      vault: {
        getAbstractFileByPath: (filePath) => {
          const fullPath = path.resolve(__dirname, '../../../', filePath);
          return fs.existsSync(fullPath) ? { path: filePath } : null;
        },
        read: async (file) => {
          const fullPath = path.resolve(__dirname, '../../../', file.path);
          return fs.readFileSync(fullPath, 'utf8');
        },
        adapter: {
          exists: async (p) => {
            const fullPath = path.resolve(__dirname, '../../../', p);
            return fs.existsSync(fullPath);
          },
          list: async () => ({ files: [], folders: [] })
        }
      }
    };

    await renderConfiguracoes(mockDv, mockApp);

    assert.strictEqual(rootContainer.children.length, 1);
    const snoopyRoot = rootContainer.children[0];
    assert.ok(snoopyRoot.className.includes('snoopy-configuracoes-root'));

    const hub = snoopyRoot.children[0];
    assert.ok(hub.className.includes('snoopy-config-hub'));

    // Verifica se os 3 cards foram renderizados
    assert.strictEqual(hub.children.length, 3);

    function findText(el, text) {
      if (el.innerText && el.innerText.includes(text)) return true;
      if (el.innerHTML && el.innerHTML.includes(text)) return true;
      return el.children.some(c => findText(c, text));
    }

    // Card 1: Atualização
    const cardUpdate = hub.children[0];
    assert.ok(findText(cardUpdate, 'Atualização do Snoopy Vault'));

    // Card 2: Mocks / Demonstração
    const cardMocks = hub.children[1];
    assert.ok(findText(cardMocks, 'Gestão de Exemplos & Cofre Limpo') || findText(cardMocks, 'Cofre Limpo'));

    // Card 3: 3 Zonas de Proteção
    const cardZonas = hub.children[2];
    assert.ok(findText(cardZonas, 'Garantia de Proteção de Dados (3 Zonas)'));
    assert.ok(findText(cardZonas, 'Zona 1 (Seus Dados Pessoais)'));
    assert.ok(findText(cardZonas, 'Zona 2 (Motor do Cofre)'));
    assert.ok(findText(cardZonas, 'Zona 3 (Sementes & Guias)') || findText(cardZonas, 'Zona 3 (Sementes &amp; Guias)'));
  });
});
