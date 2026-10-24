/**
 * Snoopy Vault - Testes Unitários de Estado do Framework de Estudos
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const EstudosEstado = require('../../../99_Meta/Snoopy/subdashboards/estudos/estado.js');

describe('Subdashboard Estudos - EstudosEstado', () => {
  test('Exporta constantes e métodos essenciais', () => {
    assert.strictEqual(EstudosEstado.CICLO_META_PATH, '99_Meta/ciclo-estudos.json');
    assert.ok(EstudosEstado.DEFAULT_STATE);
    assert.strictEqual(typeof EstudosEstado.carregar, 'function');
    assert.strictEqual(typeof EstudosEstado.salvar, 'function');
    assert.strictEqual(typeof EstudosEstado.obterDisciplinasProcessadas, 'function');
  });

  describe('carregar()', () => {
    test('retorna estado padrão quando o arquivo não existe', async () => {
      const mockApp = {
        vault: {
          getAbstractFileByPath: () => null
        }
      };

      const estado = await EstudosEstado.carregar(mockApp);
      assert.deepEqual(estado.disciplinaAtualIdx, 0);
      assert.deepEqual(estado.revisoes, []);
      assert.deepEqual(estado.historicoDiario, {});
      assert.strictEqual(estado.metaHorasSemanal, 20);
    });

    test('carrega e mescla dados existentes do arquivo ciclo-estudos.json', async () => {
      const mockData = {
        disciplinaAtualIdx: 2,
        metaHorasSemanal: 25,
        revisoes: [{ id: 'rev-1', materia: 'Direito Constitucional', dataIso: '2026-10-30' }],
        historicoDiario: { '2026-10-24': 120 }
      };

      const mockApp = {
        vault: {
          getAbstractFileByPath: (path) => (path === EstudosEstado.CICLO_META_PATH ? { path } : null),
          read: async () => JSON.stringify(mockData)
        }
      };

      const estado = await EstudosEstado.carregar(mockApp);
      assert.strictEqual(estado.disciplinaAtualIdx, 2);
      assert.strictEqual(estado.metaHorasSemanal, 25);
      assert.strictEqual(estado.revisoes.length, 1);
      assert.strictEqual(estado.revisoes[0].materia, 'Direito Constitucional');
      assert.strictEqual(estado.historicoDiario['2026-10-24'], 120);
      // Garante que campos não especificados assumem defaults seguros
      assert.strictEqual(estado.metaQuestoesSemanal, 150);
      assert.deepEqual(estado.planner, {});
    });

    test('recupera com segurança e retorna defaults se o JSON estiver corrompido', async () => {
      const mockApp = {
        vault: {
          getAbstractFileByPath: () => ({ path: 'corrompido.json' }),
          read: async () => 'JSON INVALIDO {{{'
        }
      };

      const estado = await EstudosEstado.carregar(mockApp);
      assert.strictEqual(estado.disciplinaAtualIdx, 0);
      assert.deepEqual(estado.revisoes, []);
    });
  });

  describe('salvar()', () => {
    test('modifica arquivo existente se ele já estiver criado no cofre', async () => {
      let arquivoModificado = null;
      let conteudoGravado = null;

      const fakeFile = { path: EstudosEstado.CICLO_META_PATH };
      const mockApp = {
        vault: {
          getAbstractFileByPath: (path) => (path === EstudosEstado.CICLO_META_PATH ? fakeFile : null),
          modify: async (file, data) => {
            arquivoModificado = file;
            conteudoGravado = data;
          }
        }
      };

      const estado = { ...EstudosEstado.DEFAULT_STATE, disciplinaAtualIdx: 3 };
      await EstudosEstado.salvar(mockApp, estado);

      assert.strictEqual(arquivoModificado, fakeFile);
      const parsed = JSON.parse(conteudoGravado);
      assert.strictEqual(parsed.disciplinaAtualIdx, 3);
    });

    test('cria novo arquivo se ele ainda não existir no cofre', async () => {
      let caminhoCriado = null;
      let conteudoCriado = null;

      const mockApp = {
        vault: {
          getAbstractFileByPath: () => null,
          create: async (path, data) => {
            caminhoCriado = path;
            conteudoCriado = data;
          }
        }
      };

      const estado = { ...EstudosEstado.DEFAULT_STATE, metaHorasSemanal: 30 };
      await EstudosEstado.salvar(mockApp, estado);

      assert.strictEqual(caminhoCriado, EstudosEstado.CICLO_META_PATH);
      const parsed = JSON.parse(conteudoCriado);
      assert.strictEqual(parsed.metaHorasSemanal, 30);
    });
  });

  describe('obterDisciplinasProcessadas()', () => {
    test('processa metadados de disciplinas e calcula assertividade e erros corretamente', () => {
      const mockPages = [
        {
          file: { name: 'Direito Penal', path: '03_Estudos/Direito Penal.md' },
          area: 'Jurídica',
          minutos_foco: 90,
          questoes_feitas: 50,
          questoes_acertos: 40,
          provas: ['CESPE 2024']
        },
        {
          file: { name: 'Português', path: '03_Estudos/Português.md' },
          categoria: 'Geral',
          tempo_foco: 2, // 2 horas -> 120 minutos
          questoes_feitas: 20,
          questoes_acertos: 20,
          pdf: 'Gramatica.pdf'
        },
        {
          file: { name: 'Template - Estudo', path: '03_Estudos/Template - Estudo.md' }
        },
        {
          file: { name: 'Painel de Estudos', path: '03_Estudos/Painel de Estudos.md' }
        }
      ];

      const mockDv = {
        pages: (query) => {
          assert.strictEqual(query, '"03_Estudos"');
          return {
            where: (pred) => {
              const filtradas = mockPages.filter(pred);
              return {
                map: (transform) => filtradas.map(transform)
              };
            }
          };
        }
      };

      const resultado = EstudosEstado.obterDisciplinasProcessadas(mockDv);

      // Deve ignorar notas de Template e Painel
      assert.strictEqual(resultado.length, 2);

      // Primeira disciplina
      assert.strictEqual(resultado[0].nome, 'Direito Penal');
      assert.strictEqual(resultado[0].area, 'Jurídica');
      assert.strictEqual(resultado[0].minutos, 90);
      assert.strictEqual(resultado[0].feitas, 50);
      assert.strictEqual(resultado[0].acertos, 40);
      assert.strictEqual(resultado[0].erros, 10);
      assert.strictEqual(resultado[0].pct, 80);
      assert.deepEqual(resultado[0].provas, ['CESPE 2024']);

      // Segunda disciplina (tempo_foco em horas convertido para minutos)
      assert.strictEqual(resultado[1].nome, 'Português');
      assert.strictEqual(resultado[1].area, 'Geral');
      assert.strictEqual(resultado[1].minutos, 120);
      assert.strictEqual(resultado[1].feitas, 20);
      assert.strictEqual(resultado[1].acertos, 20);
      assert.strictEqual(resultado[1].erros, 0);
      assert.strictEqual(resultado[1].pct, 100);
      assert.deepEqual(resultado[1].provas, ['Gramatica.pdf']);
    });
  });
});
