/**
 * Snoopy Vault - Testes Unitários do Orquestrador de Estudos
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { renderEstudos } = require('../../../99_Meta/Snoopy/subdashboards/estudos/view.js');
const { createMockEl, createMockDataview } = require('../../helpers/test_utils.js');

describe('Subdashboard Estudos - Orquestrador View', () => {
  test('Exporta a função renderEstudos', () => {
    assert.strictEqual(typeof renderEstudos, 'function');
  });

  test('Renderiza cabeçalho, abas de navegação (Painel, Planner, Revisões, Ciclo) e conteúdo', async () => {
    const rootContainer = createMockEl('div');

    const mockApp = {
      vault: {
        getAbstractFileByPath: (relPath) => {
          const fullPath = path.resolve(__dirname, '../../../', relPath);
          return fs.existsSync(fullPath) ? { path: relPath } : null;
        },
        read: async (file) => {
          const fullPath = path.resolve(__dirname, '../../../', file.path);
          return fs.readFileSync(fullPath, 'utf8');
        }
      },
      workspace: {
        openLinkText: () => {}
      }
    };

    const mockDv = {
      container: rootContainer,
      ...createMockDataview([])
    };

    await renderEstudos(mockDv, mockApp);

    assert.ok(rootContainer.children.length > 0);

    function findText(el, text) {
      const target = text.toUpperCase();
      if (el.innerText && el.innerText.toUpperCase().includes(target)) return true;
      if (el.innerHTML && el.innerHTML.toUpperCase().includes(target)) return true;
      return el.children.some(c => findText(c, text));
    }

    // Verifica presença das abas principais
    assert.ok(findText(rootContainer, 'PAINEL DE CONTROLE'));
    assert.ok(findText(rootContainer, 'MEU PLANNER'));
    assert.ok(findText(rootContainer, 'REVISÕES ESPAÇADAS'));
    assert.ok(findText(rootContainer, 'CICLO DE ESTUDOS'));
  });
});
