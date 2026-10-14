import { test } from 'node:test';
import assert from 'node:assert/strict';
import HabitosView from '../../../99_Meta/Snoopy/modulos/daily_tracker/habitos_view.js';
import TaskParser from '../../../99_Meta/Snoopy/core/task_parser.js';

function createMockEl(tag = 'div', options = {}) {
  const el = {
    tagName: tag,
    className: options.cls || '',
    children: [],
    style: {},
    innerHTML: '',
    textContent: options.text || '',
    createEl(childTag, childOpts = {}) {
      const child = createMockEl(childTag, childOpts);
      this.children.push(child);
      return child;
    },
    querySelector(selector) {
      if (selector === '#snoopy-habit-pct') {
        return { textContent: '' };
      }
      return null;
    },
    querySelectorAll() {
      return [];
    },
    appendChild(child) {
      this.children.push(child);
      return child;
    },
    addEventListener() {}
  };
  return el;
}

test('HabitosView - montar() inicializa sem erros e expõe renderHabitos', async () => {
  const habitsCard = createMockEl('div');

  const mockApp = {
    vault: {
      getAbstractFileByPath: () => null,
      read: async () => ''
    }
  };

  const ctx = {
    app: mockApp,
    dailyPath: '01_Inbox/Diário/2026-10-13.md',
    garantirNotaDiaria: async () => null,
    TaskParser,
    VaultStore: {},
    ModalFactory: {}
  };

  const controller = await HabitosView.montar({ habitsCard, ctx });
  assert.ok(controller, 'Deve retornar o controlador de hábitos');
  assert.equal(typeof controller.renderHabitos, 'function');
  assert.equal(typeof controller.abrirModalGerenciarHabitos, 'function');
});

