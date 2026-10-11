/**
 * Snoopy Vault - Teste de Execução e Vínculos de TaskTemplates
 * Executado nativamente via `node --test`.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const TaskTemplates = require('../../99_Meta/Snoopy/core/task_templates.js');

describe('TaskTemplates - Execução de Criação e Vínculos', () => {
  test('executarCriacao() gera nota com frontmatter correto e conecta vínculos', async () => {
    let arquivosCriados = {};
    let arquivosModificados = {};
    let eventoDisparado = null;

    // Simula ciclo-estudos.json já existente
    arquivosCriados['99_Meta/ciclo-estudos.json'] = JSON.stringify({
      disciplinaAtualIdx: 0,
      cicloOrdem: [],
      revisoes: []
    });

    const mockApp = {
      vault: {
        getAbstractFileByPath: (p) => arquivosCriados[p] ? { path: p } : null,
        create: async (p, c) => { arquivosCriados[p] = c; return { path: p }; },
        modify: async (f, c) => { arquivosModificados[f.path] = c; arquivosCriados[f.path] = c; },
        read: async (f) => arquivosCriados[f.path] || '',
        createFolder: async () => {}
      }
    };

    const mockEvents = {
      emit: (nome, dados) => { eventoDisparado = { nome, dados }; }
    };

    const templateEstudo = {
      id: 'estudo-ingles',
      nome: 'Estudo de Inglês',
      tipo: 'estudo',
      pasta: '03_Estudos',
      frontmatter: { area: 'Idiomas', status: 'Ativo' },
      corpo: '# {{title}}\n- [ ] Prática de Listening',
      vinculos: {
        estudos: { adicionar_ao_ciclo: true, revisao_espacada: true },
        kanban: { status: 'Em Andamento', prioridade: 'Alta' },
        pomodoro: { tempo_foco: 25, auto_apontar: true }
      }
    };

    const res = await TaskTemplates.executarCriacao(mockApp, templateEstudo, {
      title: 'Gramática e Vocabulário',
      date: '2026-10-11'
    }, mockEvents);

    assert.equal(res.notaPath, '03_Estudos/Gramática e Vocabulário.md');
    assert.ok(arquivosCriados['03_Estudos/Gramática e Vocabulário.md']);
    
    // Verifica se inseriu no ciclo-estudos.json
    const cicloAtualizado = JSON.parse(arquivosCriados['99_Meta/ciclo-estudos.json']);
    assert.ok(cicloAtualizado.cicloOrdem.includes('03_Estudos/Gramática e Vocabulário.md'));
    assert.ok(cicloAtualizado.revisoes.some(r => r.materiaPath === '03_Estudos/Gramática e Vocabulário.md'));

    // Verifica emissão do evento para o Pomodoro
    assert.equal(eventoDisparado?.nome, 'pomodoro:foco');
    assert.equal(eventoDisparado?.dados?.texto, 'Gramática e Vocabulário');
    assert.equal(eventoDisparado?.dados?.tempo_foco, 25);
  });
});

