const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const JardimStore = require('../../99_Meta/Snoopy/core/jardim_store.js');

describe('JardimStore - Economia e Inventário Botânico', () => {
  const criarMockApp = (dadosIniciais = null) => {
    let storage = dadosIniciais ? JSON.stringify(dadosIniciais) : null;
    return {
      vault: {
        getAbstractFileByPath: (p) => storage !== null ? { path: p } : null,
        read: async () => storage,
        modify: async (f, conteudo) => { storage = conteudo; },
        create: async (p, conteudo) => { storage = conteudo; return { path: p }; }
      }
    };
  };

  test('carregar() retorna estado padrão caso arquivo não exista', async () => {
    const mockApp = criarMockApp(null);
    const estado = await JardimStore.carregar(mockApp);
    assert.strictEqual(estado.moedas, 0);
    assert.strictEqual(estado.arvoreAtiva, 'sprout');
    assert.deepStrictEqual(estado.desbloqueadas, ['sprout']);
  });

  test('creditarFoco() adiciona moedas proporcionais ao tempo de foco (1 a cada 5m)', async () => {
    const mockApp = criarMockApp(null);
    const r1 = await JardimStore.creditarFoco(mockApp, 25, 1);
    assert.strictEqual(r1.moedasGanhas, 5);
    assert.strictEqual(r1.base, 5);
    assert.strictEqual(r1.bonusCombo, 0);
    assert.strictEqual(r1.saldoAtual, 5);

    const r2 = await JardimStore.creditarFoco(mockApp, 50, 1);
    assert.strictEqual(r2.moedasGanhas, 10);
    assert.strictEqual(r2.saldoAtual, 15);
  });

  test('creditarFoco() aplica bônus progressivo por combo de ciclos (+1 p/ 3x, +2 p/ 5x, +3 p/ 10x)', async () => {
    const mockApp = criarMockApp({ moedas: 0 });
    
    // Combo 3: 25m base=5 + 1 bônus = 6 moedas
    const c3 = await JardimStore.creditarFoco(mockApp, 25, 3);
    assert.strictEqual(c3.moedasGanhas, 6);
    assert.strictEqual(c3.bonusCombo, 1);
    assert.strictEqual(c3.combo, 3);

    // Combo 5: 25m base=5 + 2 bônus = 7 moedas
    const c5 = await JardimStore.creditarFoco(mockApp, 25, 5);
    assert.strictEqual(c5.moedasGanhas, 7);
    assert.strictEqual(c5.bonusCombo, 2);

    // Combo 10: 25m base=5 + 3 bônus = 8 moedas
    const c10 = await JardimStore.creditarFoco(mockApp, 25, 10);
    assert.strictEqual(c10.moedasGanhas, 8);
    assert.strictEqual(c10.bonusCombo, 3);
  });

  test('comprarArvore() valida saldo e desbloqueia espécie corretamente', async () => {
    const mockApp = criarMockApp({ moedas: 60, desbloqueadas: ['sprout'] });
    
    // Tenta comprar espécie cara demais
    const fail = await JardimStore.comprarArvore(mockApp, 'tree-pine'); // 100 moedas
    assert.strictEqual(fail.sucesso, false);
    assert.ok(fail.mensagem.includes('Moedas insuficientes'));

    // Compra espécie válida (Cerejeira - 50 moedas)
    const ok = await JardimStore.comprarArvore(mockApp, 'flower-2');
    assert.strictEqual(ok.sucesso, true);
    assert.strictEqual(ok.estado.moedas, 10);
    assert.ok(ok.estado.desbloqueadas.includes('flower-2'));
    assert.strictEqual(ok.estado.arvoreAtiva, 'flower-2');
  });

  test('selecionarArvore() permite equipar apenas espécies desbloqueadas', async () => {
    const mockApp = criarMockApp({ moedas: 10, desbloqueadas: ['sprout', 'flower-2'], arvoreAtiva: 'sprout' });

    const ok = await JardimStore.selecionarArvore(mockApp, 'flower-2');
    assert.strictEqual(ok.sucesso, true);
    assert.strictEqual(ok.estado.arvoreAtiva, 'flower-2');

    const bloq = await JardimStore.selecionarArvore(mockApp, 'tree-pine');
    assert.strictEqual(bloq.sucesso, false);
    assert.strictEqual(bloq.estado.arvoreAtiva, 'flower-2');
  });
});
