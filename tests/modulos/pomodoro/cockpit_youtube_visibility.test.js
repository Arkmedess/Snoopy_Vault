/**
 * Snoopy Vault - Testes de Visibilidade e Comportamento da Barra do YouTube no Cockpit
 * Garante que a barra do YouTube NÃO apareça a menos que custom_url esteja explicitamente selecionada.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createMockEl, carregarModulo } = require('../../helpers/test_utils.js');

describe('Cockpit Pomodoro - Visibilidade Condicional da Barra do YouTube', () => {
  const moduloPomodoro = carregarModulo('99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js');

  test('Barra de URL do YouTube fica oculta com faixa padrão e só aparece quando custom_url for selecionada', async () => {
    const root = createMockEl('div');

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
      }
    };

    const mockEvents = {
      listeners: {},
      on: () => () => {},
      emit: () => {}
    };

    const mockCtx = {
      root,
      app: mockApp,
      now: new Date(2026, 9, 24),
      padTime: (n) => String(n).padStart(2, '0'),
      todayStr: '2026-10-24',
      dailyPath: '01_Inbox/Diário/2026-10-24.md',
      garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-24.md' }),
      mapaFoco: { '2026-10-24': 1 },
      completedCyclesToday: 1,
      events: mockEvents,
      config: {
        tempo_foco: 25,
        tempo_pausa_curta: 5,
        tempo_pausa_longa: 15,
        meta_ciclos_diarios: 4
      }
    };

    await moduloPomodoro.render(mockCtx);

    const customUrlWrap = root.querySelector('.snoopy-audio-custom-url-wrap');
    assert.ok(customUrlWrap, 'O container da URL customizada deve existir no DOM');

    const trackSelect = root.querySelector('.snoopy-audio-track-selector');
    assert.ok(trackSelect, 'O seletor de faixas deve existir');

    // Ao iniciar com faixa que não é custom_url (por padrão white_noise), a barra DEVE estar oculta!
    if (trackSelect.value !== 'custom_url') {
      assert.strictEqual(
        customUrlWrap.style.display,
        'none',
        'A barra do YouTube deve estar oculta (display: none) quando outra faixa estiver selecionada'
      );
    }

    // Ao selecionar custom_url no trackSelect, a barra deve passar para display: flex
    trackSelect.value = 'custom_url';
    trackSelect.dispatchEvent('change');

    assert.strictEqual(
      customUrlWrap.style.display,
      'flex',
      'A barra do YouTube deve ficar visível (display: flex) ao selecionar custom_url'
    );

    // Ao voltar para outra faixa (ex: white_noise), a barra deve voltar a ficar oculta
    trackSelect.value = 'white_noise';
    trackSelect.dispatchEvent('change');

    assert.strictEqual(
      customUrlWrap.style.display,
      'none',
      'A barra do YouTube deve voltar a ficar oculta (display: none) ao alternar para faixa padrão'
    );
  });
});
