/**
 * Snoopy Vault - Testes Adversariais do Milestone M2:
 * Estresse de Sanitização de Emojis, Parsing de Tarefas Markdown (Exceção 2.1)
 * e Integridade Criptográfica do Manifesto SHA-256.
 *
 * Executado nativamente via `node --test`.
 */
const { test, describe, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');

const { createMockEl, carregarModulo, createMockDataview } = require('../helpers/test_utils.js');
const DateUtils = require('../../99_Meta/Snoopy/core/date_utils.js');
const TaskParser = require('../../99_Meta/Snoopy/core/task_parser.js');
const UIKit = require('../../99_Meta/Snoopy/core/ui_kit.js');

describe('M2 Adversarial Suite - Exceção 2.1 e Sanitização Visual', () => {
  const todayStr = '2026-10-31';
  const hojeBR = '31-10-2026';
  let origNotice;

  before(() => {
    origNotice = global.Notice;
    global.Notice = class MockNotice {
      constructor(message) {
        this.message = message;
      }
    };
  });

  after(() => {
    global.Notice = origNotice;
  });

  // ---------------------------------------------------------------------------
  // 1. Parsing Adversarial de Metadados de Tarefas (Exceção 2.1)
  // ---------------------------------------------------------------------------
  describe('Parsing de Tarefas com Metadados Legados (📅, ⏫, 🔼, 🔽, ✅, due:)', () => {
    test('TaskParser extrai data ISO, prioridade alta e remove tags mantendo texto limpo', () => {
      const raw = 'Corrigir bug crítico no cockpit 📅 2026-10-31 ⏫';
      const meta = TaskParser.parseMetadata(raw, todayStr, DateUtils);

      assert.strictEqual(meta.cleanText, 'Corrigir bug crítico no cockpit');
      assert.strictEqual(meta.dueStr, '2026-10-31');
      assert.strictEqual(meta.prio, 'alta');
      assert.strictEqual(meta.statusPrazo, 'hoje');
    });

    test('TaskParser extrai data brasileira DD-MM-YYYY, prioridade média e pomodoros', () => {
      const raw = 'Escrever documentação técnica 📅 31-10-2026 🔼 🍅 3';
      const meta = TaskParser.parseMetadata(raw, todayStr, DateUtils);

      assert.strictEqual(meta.cleanText, 'Escrever documentação técnica');
      assert.strictEqual(meta.dueStr, '2026-10-31');
      assert.strictEqual(meta.prio, 'media');
      assert.strictEqual(meta.pomosEst, '3');
      assert.strictEqual(meta.statusPrazo, 'hoje');
    });

    test('TaskParser lida com tarefa atrasada com prioridade baixa e período', () => {
      const raw = 'Revisar notas antigas 📅 2026-10-20 🔽 🌙 Noite';
      const meta = TaskParser.parseMetadata(raw, todayStr, DateUtils);

      assert.strictEqual(meta.cleanText, 'Revisar notas antigas');
      assert.strictEqual(meta.dueStr, '2026-10-20');
      assert.strictEqual(meta.prio, 'baixa');
      assert.strictEqual(meta.statusPrazo, 'atrasada');
      assert.strictEqual(meta.periodo, '🌙 Noite');
    });

    test('TaskParser limpa data de conclusão ✅ no formato ISO ou brasileiro', () => {
      const rawIso = 'Estudo completado 📅 2026-10-31 ✅ 2026-10-31 ⏫';
      const metaIso = TaskParser.parseMetadata(rawIso, todayStr, DateUtils);
      assert.strictEqual(metaIso.cleanText, 'Estudo completado');
      assert.strictEqual(metaIso.prio, 'alta');

      const rawBr = 'Estudo completado 📅 31-10-2026 ✅ 31-10-2026 🔼';
      const metaBr = TaskParser.parseMetadata(rawBr, todayStr, DateUtils);
      assert.strictEqual(metaBr.cleanText, 'Estudo completado');
      assert.strictEqual(metaBr.prio, 'media');
    });

    test('CalendarioView e Planner reconhecem tanto "due:" quanto "📅" em formato ISO e BR', () => {
      const CalendarioView = carregarModulo('99_Meta/Snoopy/modulos/daily_tracker/calendario_view.js');
      assert.ok(CalendarioView, 'CalendarioView deve carregar corretamente');

      const mockTasks = [
        { text: 'Tarefa Due ISO due: 2026-10-31', completed: false },
        { text: 'Tarefa Due BR due: 31-10-2026', completed: false },
        { text: 'Tarefa Emoji ISO 📅 2026-10-31', completed: false },
        { text: 'Tarefa Emoji BR 📅 31-10-2026', completed: false }
      ];

      const mockPages = [
        {
          file: {
            path: '02_Projetos/ProjetoTest.md',
            name: 'ProjetoTest',
            tasks: mockTasks
          }
        }
      ];

      const calContainer = createMockEl('div');
      const mockCtx = {
        app: {},
        dv: createMockDataview(mockPages),
        todayStr,
        DateUtils,
        renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts)
      };

      CalendarioView.montar({
        container: calContainer,
        ctx: mockCtx,
        dataInicial: todayStr,
        onSelectData: () => {}
      });

      // No calendário, o dia 31 de Outubro (hoje) deve contabilizar 4 tarefas pendentes
      const cells = calContainer.querySelectorAll('.snoopy-cal-day');
      const cellHoje = cells.find(c => c.className && c.className.includes('today'));
      assert.ok(cellHoje, 'Célula de hoje deve existir no calendário');

      const dot = cellHoje.querySelector('.snoopy-cal-dot');
      assert.ok(dot, 'Indicador dot deve existir na célula de hoje');
      const titleAttr = dot.getAttribute('title');
      assert.ok(titleAttr && titleAttr.includes('4 tarefa(s) marcadas (4 pendentes)'), `Deve contabilizar as 4 tarefas: ${titleAttr}`);
    });
  });

  // ---------------------------------------------------------------------------
  // 2. Comportamento e Ciclo de Vida em tarefas_view.js
  // ---------------------------------------------------------------------------
  describe('Central de Tarefas (tarefas_view.js) com Exceção 2.1', () => {
    const TarefasView = carregarModulo('99_Meta/Snoopy/modulos/daily_tracker/tarefas_view.js');

    test('Renderiza tarefas com 📅, ⏫, 🔼, 🔽 sem exibir emojis crus no DOM (aplica Lucide)', async () => {
      const tasksCard = createMockEl('div');

      const mockPages = [
        {
          file: {
            path: '02_Projetos/ProjetoA.md',
            name: 'ProjetoA',
            tasks: [
              { text: 'Tarefa Alta 📅 2026-10-31 ⏫ 🌅 Manhã', completed: false, path: '02_Projetos/ProjetoA.md', line: 1 },
              { text: 'Tarefa Média 📅 2026-10-31 🔼 ☀️ Tarde', completed: false, path: '02_Projetos/ProjetoA.md', line: 2 },
              { text: 'Tarefa Baixa 📅 2026-10-31 🔽 🌙 Noite', completed: false, path: '02_Projetos/ProjetoA.md', line: 3 },
              { text: 'Tarefa Concluída Hoje 📅 2026-10-31 ✅ 2026-10-31', completed: true, path: '02_Projetos/ProjetoA.md', line: 4 }
            ]
          }
        }
      ];

      const mockCtx = {
        app: {},
        dv: createMockDataview(mockPages),
        todayStr,
        DateUtils,
        TaskParser,
        UIKit,
        renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts),
        VaultStore: {}
      };

      await TarefasView.montar({
        tasksCard,
        ctx: mockCtx,
        abrirModalNovaTarefa: () => {},
        abrirModalTemplateTarefa: () => {},
        abrirModalMenuTarefa: () => {}
      });

      const listBox = tasksCard.querySelector('.snoopy-tasks-list-box');
      assert.ok(listBox, 'Lista de tarefas deve existir');

      // Verifica que as 3 tarefas pendentes aparecem na aba HOJE
      assert.ok(listBox.innerText.includes('Tarefa Alta'));
      assert.ok(listBox.innerText.includes('Tarefa Média'));
      assert.ok(listBox.innerText.includes('Tarefa Baixa'));

      // Verifica ausência de emojis nos rótulos de texto das tarefas
      const taskLabels = listBox.querySelectorAll('label span');
      for (const lbl of taskLabels) {
        assert.doesNotMatch(lbl.innerText, /[📅⏫🔼🔽✅✕✓🪙]/, 'Texto da tarefa não deve conter emojis residuais');
      }

      // Verifica ícones Lucide nos badges de período
      const icons = listBox.querySelectorAll('.snoopy-icon');
      assert.ok(icons.length >= 3, 'Deve conter ícones Lucide para períodos e botões');
    });

    test('Transição de conclusão: checkbox grava "- [x] ✅ <data>" e reabertura limpa data', async () => {
      const tasksCard = createMockEl('div');
      let linhaSubstituida = null;

      const mockFile = { path: '02_Projetos/Teste.md' };
      const mockVaultStore = {
        substituirLinha: async (app, file, matchFn, replaceFn) => {
          const original = '- [ ] Tarefa Para Concluir 📅 2026-10-31 ⏫';
          if (matchFn(original)) {
            linhaSubstituida = replaceFn(original);
          }
        }
      };

      const mockApp = {
        vault: {
          getAbstractFileByPath: (p) => (p === mockFile.path ? mockFile : null)
        }
      };

      const mockPages = [
        {
          file: {
            path: mockFile.path,
            name: 'Teste',
            tasks: [
              { text: 'Tarefa Para Concluir 📅 2026-10-31 ⏫', completed: false, path: mockFile.path, line: 10 }
            ]
          }
        }
      ];

      const mockCtx = {
        app: mockApp,
        dv: createMockDataview(mockPages),
        todayStr,
        DateUtils,
        TaskParser,
        UIKit,
        renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts),
        VaultStore: mockVaultStore
      };

      await TarefasView.montar({
        tasksCard,
        ctx: mockCtx,
        abrirModalNovaTarefa: () => {},
        abrirModalTemplateTarefa: () => {},
        abrirModalMenuTarefa: () => {}
      });

      const cb = tasksCard.querySelector('input[type="checkbox"]');
      assert.ok(cb, 'Checkbox da tarefa deve existir');

      // 1. Simula conclusão da tarefa
      cb.checked = true;
      await cb.onchange();

      assert.strictEqual(
        linhaSubstituida,
        `- [x] ✅ ${todayStr} Tarefa Para Concluir 📅 2026-10-31 ⏫`,
        'Conclusão deve produzir marcação com "- [x] ✅ YYYY-MM-DD"'
      );

      // 2. Simula reabertura da tarefa
      cb.checked = false;
      const mockVaultStoreReabrir = {
        substituirLinha: async (app, file, matchFn, replaceFn) => {
          const concluida = `- [x] ✅ ${todayStr} Tarefa Para Concluir 📅 2026-10-31 ⏫`;
          linhaSubstituida = replaceFn(concluida);
        }
      };
      mockCtx.VaultStore = mockVaultStoreReabrir;

      await cb.onchange();
      assert.strictEqual(
        linhaSubstituida,
        '- [ ] Tarefa Para Concluir 📅 2026-10-31 ⏫',
        'Reabertura deve remover "- [x] ✅ <data>" e restaurar "- [ ]" preservando metadados'
      );
    });

    test('Ordenação estrita por prioridade em tarefas sem prazo definido (alta > media > baixa)', async () => {
      const tasksCard = createMockEl('div');

      // Insere propositalmente em ordem invertida: baixa, media, alta (todas sem prazo)
      const mockPages = [
        {
          file: {
            path: '02_Projetos/Ordem.md',
            name: 'Ordem',
            tasks: [
              { text: 'Item Baixa 🔽', completed: false, path: '02_Projetos/Ordem.md', line: 1 },
              { text: 'Item Média 🔼', completed: false, path: '02_Projetos/Ordem.md', line: 2 },
              { text: 'Item Alta ⏫', completed: false, path: '02_Projetos/Ordem.md', line: 3 }
            ]
          }
        }
      ];

      const mockCtx = {
        app: {},
        dv: createMockDataview(mockPages),
        todayStr,
        DateUtils,
        TaskParser,
        UIKit,
        renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts),
        VaultStore: {}
      };

      await TarefasView.montar({
        tasksCard,
        ctx: mockCtx,
        abrirModalNovaTarefa: () => {},
        abrirModalTemplateTarefa: () => {},
        abrirModalMenuTarefa: () => {}
      });

      // Clica na aba "PRÓXIMAS" (todas as tarefas)
      const tabTodas = tasksCard.querySelectorAll('.snoopy-btn-tab').find(b => b.innerText.includes('PRÓXIMAS'));
      assert.ok(tabTodas, 'Aba PRÓXIMAS deve existir');
      tabTodas.onclick();

      const cards = tasksCard.querySelectorAll('.snoopy-task-card');
      assert.strictEqual(cards.length, 3);
      assert.ok(cards[0].innerText.includes('Item Alta'), 'Primeiro card deve ser Item Alta');
      assert.ok(cards[1].innerText.includes('Item Média'), 'Segundo card deve ser Item Média');
      assert.ok(cards[2].innerText.includes('Item Baixa'), 'Terceiro card deve ser Item Baixa');
    });

    test('Ordenação de tarefas por data crescente (atrasada antes de hoje antes de futura)', async () => {
      const tasksCard = createMockEl('div');

      const mockPages = [
        {
          file: {
            path: '02_Projetos/Prazos.md',
            name: 'Prazos',
            tasks: [
              { text: 'Futura 📅 2026-11-05', completed: false, path: '02_Projetos/Prazos.md', line: 1 },
              { text: 'Hoje 📅 2026-10-31', completed: false, path: '02_Projetos/Prazos.md', line: 2 },
              { text: 'Atrasada 📅 2026-10-15', completed: false, path: '02_Projetos/Prazos.md', line: 3 }
            ]
          }
        }
      ];

      const mockCtx = {
        app: {},
        dv: createMockDataview(mockPages),
        todayStr,
        DateUtils,
        TaskParser,
        UIKit,
        renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts),
        VaultStore: {}
      };

      await TarefasView.montar({
        tasksCard,
        ctx: mockCtx,
        abrirModalNovaTarefa: () => {},
        abrirModalTemplateTarefa: () => {},
        abrirModalMenuTarefa: () => {}
      });

      // Aba HOJE lista tarefas atrasadas e de hoje: atrasada deve vir antes de hoje
      const cardsHoje = tasksCard.querySelectorAll('.snoopy-task-card');
      assert.strictEqual(cardsHoje.length, 2);
      assert.ok(cardsHoje[0].innerText.includes('Atrasada'), 'Primeiro item deve ser Atrasada');
      assert.ok(cardsHoje[1].innerText.includes('Hoje'), 'Segundo item deve ser Hoje');
    });
  });

  // ---------------------------------------------------------------------------
  // 3. Integração Pomodoro Cockpit e Central de Tarefas
  // ---------------------------------------------------------------------------
  describe('Integração Pomodoro Cockpit & Conclusão Exceção 2.1', () => {
    test('Carregar tarefa de foco e concluir via evento grava "- [x] ✅ DD-MM-YYYY"', async () => {
      const TarefasView = carregarModulo('99_Meta/Snoopy/modulos/daily_tracker/tarefas_view.js');

      let linhaModificada = null;
      const mockFile = { path: '02_Projetos/ProjetoFoco.md' };
      const mockApp = {
        vault: {
          getAbstractFileByPath: (p) => (p === mockFile.path ? mockFile : null)
        }
      };

      const mockVaultStore = {
        substituirLinha: async (app, file, matchFn, replaceFn) => {
          const original = '- [ ] Algoritmo Dijkstra 🍅 2 📅 2026-10-31 ⏫';
          if (matchFn(original)) {
            linhaModificada = replaceFn(original);
          }
        }
      };

      const listeners = {};
      const mockEvents = {
        on: (evt, fn) => {
          if (!listeners[evt]) listeners[evt] = [];
          listeners[evt].push(fn);
          return () => {
            listeners[evt] = listeners[evt].filter(f => f !== fn);
          };
        },
        emit: (evt, data) => {
          (listeners[evt] || []).forEach(fn => fn(data));
        }
      };

      const mockPages = [
        {
          file: {
            path: mockFile.path,
            name: 'ProjetoFoco',
            tasks: [
              { text: 'Algoritmo Dijkstra 🍅 2 📅 2026-10-31 ⏫', completed: false, path: mockFile.path, line: 5 }
            ]
          }
        }
      ];

      const mockCtx = {
        app: mockApp,
        dv: createMockDataview(mockPages),
        todayStr,
        DateUtils,
        TaskParser,
        UIKit,
        renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts),
        VaultStore: mockVaultStore,
        events: mockEvents
      };

      const tasksCard = createMockEl('div');
      await TarefasView.montar({
        tasksCard,
        ctx: mockCtx,
        abrirModalNovaTarefa: () => {},
        abrirModalTemplateTarefa: () => {},
        abrirModalMenuTarefa: () => {}
      });

      // Dispara o evento de conclusão emitido pelo Pomodoro Cockpit ao terminar ciclo
      await mockEvents.emit('tarefa:concluir', {
        texto: 'Algoritmo Dijkstra',
        path: mockFile.path,
        line: 5
      });

      assert.ok(linhaModificada, 'A linha da tarefa deve ser modificada no arquivo markdown');
      assert.strictEqual(
        linhaModificada,
        `- [x] ✅ ${hojeBR} Algoritmo Dijkstra 🍅 2 📅 2026-10-31 ⏫`,
        'Conclusão via Pomodoro deve produzir marcação canônica com data DD-MM-YYYY'
      );
    });

    test('Adicionar à Playlist do Pomodoro sanitiza o título e preserva quantidade de pomodoros', async () => {
      const TarefasView = carregarModulo('99_Meta/Snoopy/modulos/daily_tracker/tarefas_view.js');
      let itemEnfileirado = null;

      const mockEvents = {
        on: () => () => {},
        emit: (evt, data) => {
          if (evt === 'pomodoro:enfileirar') {
            itemEnfileirado = data;
          }
        }
      };

      const mockPages = [
        {
          file: {
            path: '02_Projetos/Algoritmos.md',
            name: 'Algoritmos',
            tasks: [
              { text: 'Estudar Grafos 🍅 3 📅 2026-10-31 ⏫', completed: false, path: '02_Projetos/Algoritmos.md', line: 12 }
            ]
          }
        }
      ];

      const mockCtx = {
        app: {},
        dv: createMockDataview(mockPages),
        todayStr,
        DateUtils,
        TaskParser,
        UIKit,
        renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts),
        VaultStore: {},
        events: mockEvents
      };

      const tasksCard = createMockEl('div');
      await TarefasView.montar({
        tasksCard,
        ctx: mockCtx,
        abrirModalNovaTarefa: () => {},
        abrirModalTemplateTarefa: () => {},
        abrirModalMenuTarefa: () => {}
      });

      const btnFila = tasksCard.querySelector('button[title*="Playlist"]');
      assert.ok(btnFila, 'Botão de enfileirar na playlist deve existir');
      btnFila.onclick({ stopPropagation: () => {} });

      assert.ok(itemEnfileirado, 'Item deve ser enfileirado');
      assert.strictEqual(itemEnfileirado.titulo, 'Estudar Grafos', 'Título deve ser limpo de emojis e metadados');
      assert.strictEqual(itemEnfileirado.pomosTotal, 3, 'Deve extrair pomodoros numéricos');
      assert.strictEqual(itemEnfileirado.path, '02_Projetos/Algoritmos.md');
    });
  });

  // ---------------------------------------------------------------------------
  // 4. Verificação Criptográfica SHA-256 do Manifesto (54 Motor + 5 Seed)
  // ---------------------------------------------------------------------------
  describe('Integridade Criptográfica do Manifesto (manifest.json)', () => {
    test('todos os 54 arquivos de motor e 5 arquivos seed batem 100% com o hash em disco', () => {
      const manifestPath = path.resolve(__dirname, '../../99_Meta/Snoopy/manifest.json');
      assert.ok(fs.existsSync(manifestPath), 'manifest.json deve existir');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      const motorFiles = Object.keys(manifest.motor);
      const seedFiles = Object.keys(manifest.seed);

      assert.ok(motorFiles.length >= 54, 'Deve conter pelo menos 54 arquivos de motor');
      assert.strictEqual(seedFiles.length, 5, 'Deve conter exatamente 5 arquivos seed');

      const discrepancias = [];

      for (const relPath of motorFiles) {
        const fullPath = path.resolve(__dirname, '../../', relPath);
        if (!fs.existsSync(fullPath)) {
          discrepancias.push(`Arquivo motor ausente: ${relPath}`);
          continue;
        }
        const buf = fs.readFileSync(fullPath);
        const actualHash = 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
        if (actualHash !== manifest.motor[relPath]) {
          discrepancias.push(`Mismatch motor em ${relPath}: esperado ${manifest.motor[relPath]}, obtido ${actualHash}`);
        }
      }

      for (const relPath of seedFiles) {
        const fullPath = path.resolve(__dirname, '../../', relPath);
        if (!fs.existsSync(fullPath)) {
          discrepancias.push(`Arquivo seed ausente: ${relPath}`);
          continue;
        }
        const buf = fs.readFileSync(fullPath);
        const actualHash = 'sha256:' + crypto.createHash('sha256').update(buf).digest('hex');
        if (actualHash !== manifest.seed[relPath]) {
          discrepancias.push(`Mismatch seed em ${relPath}: esperado ${manifest.seed[relPath]}, obtido ${actualHash}`);
        }
      }

      assert.deepEqual(discrepancias, [], `Erros de hash SHA-256 detectados:\n${discrepancias.join('\n')}`);
    });
  });
});
