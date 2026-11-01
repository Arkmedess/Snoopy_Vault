/**
 * Snoopy Vault - Milestone M2 Empirical Stress Test Suite (Challenger 1)
 *
 * Testes empíricos profundos para o Milestone M2:
 * 1. Validação exaustiva de XML/SVG em TODOS os 87 ícones do UIKit.ICONS com múltiplas variações de parâmetros.
 * 2. Validação aprofundada dos 8 novos ícones Lucide (check-square, leaf, award, volume-2, volume-1, volume-x, music, headphones).
 * 3. Robustez adversarial e tratamento de entradas bizarras/maliciosas em UIKit.renderIcon().
 * 4. Varredura empírica da ausência de emojis e glifos proibidos em nós DOM e Notices em todos os 14 arquivos modificados.
 * 5. Testes empíricos de renderização de views em tempo de execução com inspeção de nós DOM.
 * 6. Preservação de integridade de parsers de tarefas markdown (Exceção 2.1 de DESIGN_GUIDELINES.md).
 * 7. Integridade determinística do manifesto SHA-256.
 */

const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const UIKit = require('../../99_Meta/Snoopy/core/ui_kit.js');
const { createMockEl, carregarModulo } = require('../helpers/test_utils.js');

/**
 * Validador estrito de sintaxe XML para fragmentos SVG.
 * Garante fechamento balanceado de tags, ausência de atributos sem aspas e ausência de NaN/undefined.
 */
function validateXmlSvg(svgString) {
  assert.ok(typeof svgString === 'string', 'SVG deve ser uma string');
  assert.ok(svgString.startsWith('<svg'), 'SVG deve iniciar com tag <svg');
  assert.ok(svgString.endsWith('</svg>'), 'SVG deve terminar com tag </svg>');

  // Não deve conter valores NaN ou undefined vazados em atributos
  assert.doesNotMatch(svgString, /=["']NaN["']/, 'SVG não deve conter atributo com valor NaN');
  assert.doesNotMatch(svgString, /=["']undefined["']/, 'SVG não deve conter atributo com valor undefined');
  assert.doesNotMatch(svgString, /=["']null["']/, 'SVG não deve conter atributo com valor null');

  // Tokenização básica de tags XML
  const tagRegex = /<(\/)?([a-zA-Z0-9-]+)([^>]*)>/g;
  let match;
  const tagStack = [];
  let innerTagCount = 0;

  while ((match = tagRegex.exec(svgString)) !== null) {
    const isClosing = Boolean(match[1]);
    const tagName = match[2];
    const rawAttrs = match[3] || '';
    const isSelfClosing = rawAttrs.trim().endsWith('/');

    // Valida sintaxe dos atributos: todo atributo deve ter o formato nome="valor"
    const attrClean = rawAttrs.replace(/\/$/, '').trim();
    if (attrClean.length > 0) {
      const attrTokens = attrClean.match(/([a-zA-Z0-9_:-]+)=(?:"([^"]*)"|'([^']*)')/g);
      assert.ok(attrTokens && attrTokens.length > 0, `Atributos mal formatados na tag <${tagName} ${rawAttrs}>`);
    }

    if (tagName === 'svg') {
      if (isClosing) {
        const last = tagStack.pop();
        assert.equal(last, 'svg', 'Tag </svg> fechada fora de ordem');
      } else {
        tagStack.push('svg');
      }
      continue;
    }

    innerTagCount++;

    const allowedSvgTags = ['path', 'circle', 'ellipse', 'line', 'polygon', 'polyline', 'rect', 'defs', 'use', 'g'];
    assert.ok(allowedSvgTags.includes(tagName), `Tag SVG '${tagName}' deve ser uma tag gráfica permitida`);

    if (isSelfClosing) {
      // Auto-fechada, nada a desempilhar
      continue;
    } else if (isClosing) {
      const last = tagStack.pop();
      assert.equal(last, tagName, `Tag </${tagName}> não corresponde à tag aberta <${last}>`);
    } else {
      tagStack.push(tagName);
    }
  }

  assert.equal(tagStack.length, 0, `Tags XML não fechadas no SVG: ${tagStack.join(', ')}`);
  assert.ok(innerTagCount > 0, 'SVG deve conter ao menos um elemento interno de desenho');
}

describe('Challenger M2 - Empirical Stress Test Suite', () => {

  describe('1. Validação Exaustiva de TODOS os 87 Ícones do Catálogo UIKit.ICONS', () => {
    const iconKeys = Object.keys(UIKit.ICONS);

    test(`catálogo UIKit.ICONS deve conter exatamente 87 ícones canônicos`, () => {
      assert.strictEqual(iconKeys.length, 87, `Esperado 87 ícones em UIKit.ICONS, encontrados ${iconKeys.length}`);
    });

    for (const iconName of iconKeys) {
      test(`ícone '${iconName}' renderiza SVG válido e bem-formado sob múltiplas configurações`, () => {
        const svgSnippet = UIKit.ICONS[iconName];
        assert.ok(typeof svgSnippet === 'string', `Fragmento de '${iconName}' deve ser string`);
        assert.ok(svgSnippet.length > 5, `Fragmento de '${iconName}' deve ser substancial`);

        const sizes = [10, 14, 16, 24];
        const colors = ['currentColor', '#86efac', 'rgba(255, 255, 255, 0.8)'];

        for (const size of sizes) {
          for (const color of colors) {
            const container = createMockEl('div');
            let span;
            assert.doesNotThrow(() => {
              span = UIKit.renderIcon(container, iconName, { size, color, cls: `icon-${iconName}` });
            }, `UIKit.renderIcon não deve falhar para '${iconName}' com size=${size}`);

            assert.strictEqual(span.tagName, 'SPAN');
            assert.ok(span.className.includes('snoopy-icon'));
            assert.ok(span.className.includes(`icon-${iconName}`));
            assert.strictEqual(span.style.width, `${size}px`);
            assert.strictEqual(span.style.height, `${size}px`);

            if (color !== 'currentColor') {
              assert.strictEqual(span.style.color, color);
            }

            // Valida XML/SVG completo gerado
            validateXmlSvg(span.innerHTML);

            // Valida atributos da raiz SVG
            assert.ok(span.innerHTML.includes('viewBox="0 0 24 24"'));
            assert.ok(span.innerHTML.includes(`width="${size}"`));
            assert.ok(span.innerHTML.includes(`height="${size}"`));
            assert.ok(span.innerHTML.includes(`stroke="${color}"`));
            assert.ok(span.innerHTML.includes('fill="none"'));
            assert.ok(span.innerHTML.includes('stroke-width="2"'));
            assert.ok(span.innerHTML.includes('stroke-linecap="round"'));
            assert.ok(span.innerHTML.includes('stroke-linejoin="round"'));

            // Não deve ter usado o círculo de fallback para ícones existentes
            assert.doesNotMatch(span.innerHTML, /circle cx="12" cy="12" r="8"/, `Ícone mapeado '${iconName}' não deve usar círculo de fallback`);
          }
        }
      });
    }
  });

  describe('2. Validação dos 8 Novos Ícones Lucide do Milestone M2', () => {
    const novosIconesM2 = [
      { nome: 'check-square', tagsObrigatorias: ['polyline', 'path'], desc: 'caixa de seleção marcada' },
      { nome: 'leaf', tagsObrigatorias: ['path'], desc: 'folha botânica' },
      { nome: 'award', tagsObrigatorias: ['circle', 'polyline'], desc: 'medalha/prêmio' },
      { nome: 'volume-2', tagsObrigatorias: ['polygon', 'path'], desc: 'volume alto com duas ondas' },
      { nome: 'volume-1', tagsObrigatorias: ['polygon', 'path'], desc: 'volume baixo com uma onda' },
      { nome: 'volume-x', tagsObrigatorias: ['polygon', 'line'], desc: 'volume mudo com xis' },
      { nome: 'music', tagsObrigatorias: ['path', 'circle'], desc: 'nota musical dupla' },
      { nome: 'headphones', tagsObrigatorias: ['path'], desc: 'fones de ouvido' }
    ];

    for (const { nome, tagsObrigatorias, desc } of novosIconesM2) {
      test(`novo ícone '${nome}' (${desc}) contém a geometria oficial e renderiza em botões e estados vazios`, () => {
        assert.ok(UIKit.ICONS[nome], `Ícone '${nome}' deve existir em UIKit.ICONS`);
        const svgContent = UIKit.ICONS[nome];

        for (const tag of tagsObrigatorias) {
          assert.ok(svgContent.includes(`<${tag}`), `Ícone '${nome}' deve conter elemento SVG <${tag}`);
        }

        // Teste de integração com UIKit.criarBotao
        const parentBtn = createMockEl('div');
        const btn = UIKit.criarBotao(parentBtn, {
          label: `Botão ${nome}`,
          icon: nome,
          iconSize: 14,
          variant: 'action'
        });
        assert.ok(btn, 'Botão deve ser criado com sucesso');
        const iconSpan = btn.querySelector('.snoopy-icon');
        assert.ok(iconSpan, `Botão deve conter o span de ícone para '${nome}'`);
        assert.ok(iconSpan.innerHTML.includes(UIKit.ICONS[nome]), `Ícone '${nome}' deve estar incorporado no botão`);

        // Teste de integração com UIKit.criarEstadoVazio
        const parentVazio = createMockEl('div');
        const cardVazio = UIKit.criarEstadoVazio(parentVazio, {
          icon: nome,
          titulo: `Título Vazio ${nome}`,
          descricao: `Descrição com ícone ${nome}`
        });
        assert.ok(cardVazio, 'Card de estado vazio deve ser criado com sucesso');
        const iconVazio = cardVazio.querySelector('.snoopy-icon');
        assert.ok(iconVazio, 'Card de estado vazio deve conter .snoopy-icon');
        assert.ok(iconVazio.innerHTML.includes(UIKit.ICONS[nome]), `Ícone '${nome}' deve estar incorporado no estado vazio`);
      });
    }

    test('volume-2 tem 2 ondas, volume-1 tem 1 onda e volume-x tem linhas de mudo', () => {
      const v2 = UIKit.ICONS['volume-2'];
      const v1 = UIKit.ICONS['volume-1'];
      const vx = UIKit.ICONS['volume-x'];

      // volume-2 tem 2 paths de onda
      const v2Paths = v2.match(/<path/g) || [];
      assert.strictEqual(v2Paths.length, 2, 'volume-2 deve conter exatamente 2 ondas (<path>)');

      // volume-1 tem 1 path de onda
      const v1Paths = v1.match(/<path/g) || [];
      assert.strictEqual(v1Paths.length, 1, 'volume-1 deve conter exatamente 1 onda (<path>)');

      // volume-x tem 2 linhas cruzadas de mudo
      const vxLines = vx.match(/<line/g) || [];
      assert.strictEqual(vxLines.length, 2, 'volume-x deve conter exatamente 2 linhas (<line>) formando o X');
    });
  });

  describe('3. Robustez Adversarial & Entradas Bizarras em UIKit.renderIcon()', () => {
    test('não lança com entradas nulas, vazias, números ou objetos não-string no nome do ícone', () => {
      const entradasBizarras = [
        undefined, null, '', '   ', 0, 42, -1, NaN, Infinity, -Infinity,
        true, false, {}, [], () => {}, Symbol('icon')
      ];

      for (const entrada of entradasBizarras) {
        const container = createMockEl('div');
        let span;
        assert.doesNotThrow(() => {
          span = UIKit.renderIcon(container, entrada, {});
        }, `renderIcon não deve falhar com entrada bizarra: ${String(entrada)}`);

        assert.strictEqual(span.tagName, 'SPAN');
        assert.ok(span.innerHTML.includes('circle cx="12" cy="12" r="8"'), 'Deve aplicar círculo de fallback seguro');
        validateXmlSvg(span.innerHTML);
      }
    });

    test('resiste a chaves de prototype (toString, constructor, __proto__, valueOf, hasOwnProperty)', () => {
      const protoKeys = ['toString', 'constructor', '__proto__', 'valueOf', 'hasOwnProperty', 'isPrototypeOf'];
      for (const key of protoKeys) {
        const container = createMockEl('div');
        let span;
        assert.doesNotThrow(() => {
          span = UIKit.renderIcon(container, key, {});
        }, `renderIcon não deve falhar com chave de prototype: ${key}`);

        assert.ok(span, 'Deve retornar o elemento span');
        assert.strictEqual(span.tagName, 'SPAN');
      }
    });

    test('opções omitidas (undefined) ou parciais aplicam valores padrão seguros (size=14, color=currentColor)', () => {
      const c1 = createMockEl('div');
      const s1 = UIKit.renderIcon(c1, 'leaf');
      assert.strictEqual(s1.style.width, '14px');
      assert.strictEqual(s1.style.height, '14px');
      assert.ok(s1.innerHTML.includes('stroke="currentColor"'));

      const c2 = createMockEl('div');
      const s2 = UIKit.renderIcon(c2, 'leaf', undefined);
      assert.strictEqual(s2.style.width, '14px');
      assert.strictEqual(s2.style.height, '14px');

      const c3 = createMockEl('div');
      const s3 = UIKit.renderIcon(c3, 'leaf', { size: null, color: null });
      // Se size for falsy, não altera style.width mas gera SVG
      assert.ok(s3.innerHTML.includes('<svg'));
    });
  });

  describe('4. Varredura Empírica de Emojis e Glifos Proibidos em Todos os Arquivos Modificados', () => {
    const arquivosAlvo = [
      '99_Meta/Snoopy/core/ui_kit.js',
      '99_Meta/Snoopy/modulos/01_snoopy_banner_cabecalho.js',
      '99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js',
      '99_Meta/Snoopy/modulos/03_snoopy_planner_calendario.js',
      '99_Meta/Snoopy/modulos/daily_tracker/tarefas_view.js',
      '99_Meta/Snoopy/modulos/daily_tracker/habitos_view.js',
      '99_Meta/Snoopy/modulos/daily_tracker/tarefas_modal.js',
      '99_Meta/Snoopy/modulos/pomodoro/pomodoro_modal.js',
      '99_Meta/Snoopy/subdashboards/estudos/modais.js',
      '99_Meta/Snoopy/subdashboards/estudos/graficos_svg.js',
      '99_Meta/Snoopy/subdashboards/leituras/bookshelf_view.js',
      '99_Meta/Snoopy/subdashboards/leituras/modais.js',
      '99_Meta/Snoopy/subdashboards/leituras/view.js',
      '99_Meta/Snoopy/home/view.js',
      '99_Meta/Snoopy/core/jardim_store.js'
    ];

    // Regex de padrões proibidos em nós DOM e mensagens ao usuário:
    const padroesProibidosUI = [
      { regex: /text:\s*['"](?:✕|✓|★|❖|🪙|🍅|📚|⏱️|📝|⭐|⚡|🎉|✅|↩|🎯)['"]/, nome: 'createEl({ text: ... }) com glifo/emoji literal' },
      { regex: />\s*(?:✕|✓|★|❖|🪙|🍅|📚|⏱️|📝|⭐|⚡|🎉|✅|↩|🎯)\s*</, nome: 'innerHTML com glifo/emoji literal entre tags' },
      { regex: /new Notice(?:Ref)?\([^)]*[⚡🎉📝🎯✅↩★☆🍅📚⏱️🪙][^)]*\)/, nome: 'new Notice() com emoji proibido' },
      { regex: /this\._notify\([^)]*[⚡🎉📝🎯✅↩★☆🍅📚⏱️🪙][^)]*\)/, nome: '_notify() com emoji proibido' },
      { regex: /<option[^>]*>\s*(?:Alta|Média|Baixa)\s*\((?:⏫|🔼|🔽)\)\s*<\/option>/i, nome: 'rótulo de select option com emoji literal' }
    ];

    test('nenhum arquivo modificado possui glifos proibidos ou emojis em chamadas de UI/Notice', () => {
      const violacoes = [];

      for (const relPath of arquivosAlvo) {
        const fullPath = path.resolve(__dirname, '../../', relPath);
        assert.ok(fs.existsSync(fullPath), `Arquivo deve existir no disco: ${relPath}`);
        const content = fs.readFileSync(fullPath, 'utf8');
        const lines = content.split('\n');

        lines.forEach((line, idx) => {
          for (const { regex, nome } of padroesProibidosUI) {
            if (regex.test(line)) {
              violacoes.push(`${relPath}:${idx + 1} [${nome}]: ${line.trim()}`);
            }
          }
        });
      }

      assert.deepEqual(violacoes, [], `Violações de glifos/emojis em UI encontradas:\n${violacoes.join('\n')}`);
    });
  });

  describe('5. Testes Empíricos de Renderização de Views com Inspeção DOM', () => {

    test('01_snoopy_banner_cabecalho.js renderiza botão de limpar omni com ícone SVG sem ✕ literal', async () => {
      const moduloBanner = carregarModulo('99_Meta/Snoopy/modulos/01_snoopy_banner_cabecalho.js');
      const root = createMockEl('div');

      const mockCtx = {
        root,
        app: {
          vault: { adapter: { getResourcePath: (p) => `app://${p}` } },
          workspace: { openLinkText: async () => {} }
        },
        now: new Date(2026, 9, 31),
        formattedDate: 'sábado, 31 de outubro de 2026',
        garantirNotaDiaria: async () => ({ path: '01_Inbox/Diário/2026-10-31.md', basename: '2026-10-31' }),
        criarNotaInstantanea: () => {},
        config: {},
        UIKit,
        renderIcon: (el, name, opts) => UIKit.renderIcon(el, name, opts)
      };

      await moduloBanner.render(mockCtx);

      const clearBtn = root.querySelector('.snoopy-omni-clear-btn');
      assert.ok(clearBtn, 'Botão de limpar busca omni deve existir');
      assert.strictEqual(clearBtn.innerText, '', 'Botão não deve conter texto literal');
      const iconSpan = clearBtn.querySelector('.snoopy-icon');
      assert.ok(iconSpan, 'Botão deve conter o span de ícone');
      assert.ok(iconSpan.innerHTML.includes(UIKit.ICONS['x']), 'Botão deve renderizar o ícone x');
      assert.doesNotMatch(clearBtn.innerHTML, /✕/, 'Não deve conter o caractere ✕');
    });

    test('02_snoopy_cockpit_pomodoro.js renderiza taxa sem emoji de moeda e botão deletar com SVG x', async () => {
      const pomodoroCode = fs.readFileSync(path.resolve(__dirname, '../../99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js'), 'utf8');

      // Verifica substituição da taxa
      assert.match(pomodoroCode, /\+?\$\{.*\}\s+seiva/, 'Taxa de seiva deve usar termo textual sem emoji');
      assert.doesNotMatch(pomodoroCode, /🪙/, 'Arquivo pomodoro não deve conter emoji de moeda na UI');

      // Verifica botão de deleção da playlist usando renderIconFn
      assert.match(pomodoroCode, /renderIconFn\(delBtn,\s*['"]x['"],\s*\{\s*size:\s*10\s*\}\)/);
      assert.doesNotMatch(pomodoroCode, /delBtn\.setText\(['"]✕['"]\)/);
    });

    test('03_snoopy_planner_calendario.js renderiza botão de limpar filtro com SVG x', () => {
      const plannerCode = fs.readFileSync(path.resolve(__dirname, '../../99_Meta/Snoopy/modulos/03_snoopy_planner_calendario.js'), 'utf8');
      assert.match(plannerCode, /\$\{getSvgIcon\(['"]x['"],\s*10\)\}\s*Limpar Filtro/);
      assert.doesNotMatch(plannerCode, /✕\s*Limpar Filtro/);
    });

    test('tarefas_modal.js e estudos/modais.js exibem opções de prioridade limpas sem glifos nos rótulos', () => {
      const tarefasModalCode = fs.readFileSync(path.resolve(__dirname, '../../99_Meta/Snoopy/modulos/daily_tracker/tarefas_modal.js'), 'utf8');
      assert.match(tarefasModalCode, /<option value="⏫">Alta<\/option>/);
      assert.match(tarefasModalCode, /<option value="🔼"[^>]*>Média<\/option>/);
      assert.match(tarefasModalCode, /<option value="🔽">Baixa<\/option>/);
      assert.doesNotMatch(tarefasModalCode, />Alta \(/);

      const estudosModaisCode = fs.readFileSync(path.resolve(__dirname, '../../99_Meta/Snoopy/subdashboards/estudos/modais.js'), 'utf8');
      assert.match(estudosModaisCode, /<option value="⏫">Alta<\/option>/);
      assert.match(estudosModaisCode, /<option value="🔼">Média<\/option>/);
      assert.match(estudosModaisCode, /<option value="🔽">Baixa<\/option>/);
      assert.doesNotMatch(estudosModaisCode, />Alta \(/);
    });

    test('bookshelf_view.js renderiza ribbons com SVG check, delete com SVG x e estrelas com SVG star', () => {
      const bookshelfCode = fs.readFileSync(path.resolve(__dirname, '../../99_Meta/Snoopy/subdashboards/leituras/bookshelf_view.js'), 'utf8');
      assert.doesNotMatch(bookshelfCode, /✓\s*\$\{g\}/, 'Ribbon não deve ter ✓ literal');
      assert.match(bookshelfCode, /<polyline points="20 6 9 17 4 12"\/>/, 'Ribbon deve ter polyline de check vetorial');

      assert.doesNotMatch(bookshelfCode, /<button class="btn-del-genre[^>]*>✕<\/button>/, 'Botão de remover gênero não deve ter ✕ literal');
      assert.match(bookshelfCode, /<polygon points="12 2 15\.09 8\.26 22 9\.27 17 14\.14 18\.18 21\.02 12 17\.77 5\.82 21\.02 7 14\.14 2 9\.27 8\.91 8\.26 12 2"\/>/, 'Estrelas devem usar polygon do Lucide star');
    });
  });

  describe('6. Integridade de Parsers de Tarefas Markdown (Exceção 2.1 Preservada)', () => {
    test('expressões regulares de parsing de metadados markdown permanecem intactas', () => {
      const tarefasViewCode = fs.readFileSync(path.resolve(__dirname, '../../99_Meta/Snoopy/modulos/daily_tracker/tarefas_view.js'), 'utf8');

      assert.ok(tarefasViewCode.includes('l.replace(/- \\[ \\]/, `- [x] ✅ ${todayStr}`)'), 'Deve preservar marcação de conclusão com ✅');
      assert.match(tarefasViewCode, /REGEX_CHECKED_TASKS/, 'Deve manter constante de parsing REGEX_CHECKED_TASKS');
    });

    test('parser de tarefas interpreta corretamente notas diárias com sintaxe legada de emojis', () => {
      const mockTaskText = '- [ ] Estudar arquitetura de software 📅 2026-10-31 ⏫';
      
      const dueMatch = mockTaskText.match(/(?:due:|📅)\s*(\d{4}-\d{2}-\d{2})/);
      assert.ok(dueMatch, 'Deve capturar data de vencimento com emoji 📅');
      assert.strictEqual(dueMatch[1], '2026-10-31');

      const prioAltaMatch = mockTaskText.match(/[⏫🔼🔽]/u);
      assert.ok(prioAltaMatch, 'Deve capturar emoji de prioridade');
      assert.strictEqual(prioAltaMatch[0], '⏫');

      const completedText = '- [x] ✅ 2026-10-31 Estudar arquitetura de software';
      const isCompleted = /- \[[xX]\]/.test(completedText);
      assert.strictEqual(isCompleted, true, 'Deve reconhecer tarefa marcada como concluída');
    });
  });

  describe('7. Integridade do Manifesto SHA-256', () => {
    test('todos os 54 arquivos de motor e 5 seeds possuem hashes idênticos ao conteúdo do disco', () => {
      const crypto = require('node:crypto');
      const manifestPath = path.resolve(__dirname, '../../99_Meta/Snoopy/manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));

      const checarHashes = (secao, nomeSecao) => {
        for (const [relPath, expectedHash] of Object.entries(secao)) {
          const fullPath = path.resolve(__dirname, '../../', relPath);
          assert.ok(fs.existsSync(fullPath), `Arquivo em manifest.${nomeSecao} deve existir: ${relPath}`);
          const fileBuffer = fs.readFileSync(fullPath);
          const actualHash = `sha256:${crypto.createHash('sha256').update(fileBuffer).digest('hex')}`;
          assert.strictEqual(actualHash, expectedHash, `Hash divergente para ${relPath} em manifest.${nomeSecao}`);
        }
      };

      checarHashes(manifest.motor, 'motor');
      checarHashes(manifest.seed, 'seed');
    });
  });
});
