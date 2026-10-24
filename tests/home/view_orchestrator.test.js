/**
 * Snoopy Vault - Testes Unitários do Orquestrador Central Home
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { SnoopyEventBus, renderHome } = require('../../99_Meta/Snoopy/home/view.js');
const { createMockEl, createMockDataview } = require('../helpers/test_utils.js');

describe('Orquestrador Central Home (home/view.js)', () => {
  describe('SnoopyEventBus - Barramento Reativo', () => {
    test('registra e dispara eventos desacoplados entre módulos', () => {
      const bus = new SnoopyEventBus();
      const chamadas = [];

      const unsubscribe = bus.on('tarefa:focar', (data) => {
        chamadas.push(data);
      });

      bus.emit('tarefa:focar', { id: 'tarefa-1', titulo: 'Estudar Rust' });
      assert.strictEqual(chamadas.length, 1);
      assert.strictEqual(chamadas[0].titulo, 'Estudar Rust');

      // Testa cancelamento de inscrição
      unsubscribe();
      bus.emit('tarefa:focar', { id: 'tarefa-2', titulo: 'Ler Clean Code' });
      assert.strictEqual(chamadas.length, 1, 'Não deve receber evento após desinscrição');
    });

    test('isola erros de listeners individuais sem interromper outros ouvintes', () => {
      const bus = new SnoopyEventBus();
      let listener2Executou = false;

      bus.on('pomodoro:complete', () => {
        throw new Error('Falha simulada em listener com erro');
      });

      bus.on('pomodoro:complete', () => {
        listener2Executou = true;
      });

      assert.doesNotThrow(() => {
        bus.emit('pomodoro:complete', { minutos: 25 });
      });

      assert.strictEqual(listener2Executou, true);
    });
  });

  describe('renderHome() - Ciclo de Inicialização', () => {
    test('inicializa contêiner root e injeta microsserviços transversais no contexto', async () => {
      const rootContainer = createMockEl('div');
      const mockDv = {
        container: rootContainer,
        ...createMockDataview([]),
        page: (p) => {
          if (p === '99_Meta/⚙️ Configurações.md') {
            return {
              modulos_ativos: ['snoopy_banner_cabecalho']
            };
          }
          return null;
        }
      };

      const mockApp = {
        vault: {
          getAbstractFileByPath: (relPath) => {
            const fullPath = path.resolve(__dirname, '../../', relPath);
            return fs.existsSync(fullPath) ? { path: relPath } : null;
          },
          read: async (file) => {
            const fullPath = path.resolve(__dirname, '../../', file.path);
            return fs.readFileSync(fullPath, 'utf8');
          },
          adapter: {
            getResourcePath: (p) => `app://local/${p}`
          }
        },
        workspace: {
          openLinkText: () => {}
        }
      };

      await renderHome(mockDv, mockApp);

      assert.strictEqual(rootContainer.children.length, 1);
      const snoopyContainer = rootContainer.children[0];
      assert.ok(snoopyContainer.className.includes('snoopy-container'));

      // Como apenas o banner foi ativado na configuração, o banner box deve estar montado
      const banner = snoopyContainer.querySelector('.snoopy-banner-box');
      assert.ok(banner, 'Banner deve ser renderizado quando ativo na lista de módulos');
    });
  });
});
