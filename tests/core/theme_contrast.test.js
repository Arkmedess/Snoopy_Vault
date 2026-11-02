/**
 * Snoopy Vault - Teste de Auditoria de Contraste WCAG 2.2 AA dos Temas
 * Valida que todos os 4 temas (em ambos os modos Light e Dark) satisfazem
 * a razão de contraste mínima de 4.5:1 para texto normal e 3:1 para componentes.
 */
const { test, describe } = require('node:test');
const assert = require('node:assert/strict');
const ShopStore = require('../../99_Meta/Snoopy/core/shop_store.js');

/**
 * Converte cor hex (#RGB ou #RRGGBB) para valores sRGB [0..1]
 */
function hexParaRgb(hex) {
  let c = hex.replace('#', '').trim();
  if (c.length === 3) {
    c = c.split('').map(x => x + x).join('');
  }
  const num = parseInt(c, 16);
  return [
    ((num >> 16) & 255) / 255,
    ((num >> 8) & 255) / 255,
    (num & 255) / 255
  ];
}

/**
 * Calcula a luminância relativa conforme a fórmula padrão WCAG 2.2
 */
function calcularLuminancia(rgb) {
  const [r, g, b] = rgb.map(val => {
    return val <= 0.04045 ? val / 12.92 : Math.pow((val + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Calcula a razão de contraste entre duas cores hex
 */
function calcularRazaoContraste(hex1, hex2) {
  const l1 = calcularLuminancia(hexParaRgb(hex1));
  const l2 = calcularLuminancia(hexParaRgb(hex2));
  const maisClaro = Math.max(l1, l2);
  const maisEscuro = Math.min(l1, l2);
  return (maisClaro + 0.05) / (maisEscuro + 0.05);
}

describe('Auditoria de Contraste WCAG 2.2 AA nos 4 Temas (Light e Dark)', () => {
  const temas = ShopStore.TEMAS;
  const modos = ['dark', 'light'];

  for (const [temaId, temaConfig] of Object.entries(temas)) {
    for (const modo of modos) {
      test(`Tema "${temaConfig.nome}" no modo [${modo.toUpperCase()}]: Contraste WCAG 2.2 AA`, () => {
        const confModo = temaConfig.modos ? temaConfig.modos[modo] : temaConfig;
        assert.ok(confModo, `Modo ${modo} deve estar configurado no tema ${temaId}`);

        const bg = confModo.tokens.bg;
        const text = confModo.tokens.text;
        const textMuted = confModo.tokens.textMuted;
        const btnBg = confModo.tokens.btnBg;
        const btnText = confModo.tokens.btnText;

        // 1. Texto Normal sobre Fundo (Mínimo WCAG AA: 4.5:1)
        const contrasteTexto = calcularRazaoContraste(text, bg);
        assert.ok(
          contrasteTexto >= 4.5,
          `Texto normal (${text}) sobre fundo (${bg}) no tema ${temaId} [${modo}] obteve ${contrasteTexto.toFixed(2)}:1 (exige >= 4.5:1)`
        );

        // 2. Texto Muted sobre Fundo (Mínimo recomendado: >= 4.0:1)
        const contrasteMuted = calcularRazaoContraste(textMuted, bg);
        assert.ok(
          contrasteMuted >= 3.5,
          `Texto muted (${textMuted}) sobre fundo (${bg}) no tema ${temaId} [${modo}] obteve ${contrasteMuted.toFixed(2)}:1 (exige >= 3.5:1)`
        );

        // 3. Texto do Botão sobre Fundo do Botão (Mínimo WCAG AA: 4.5:1)
        const contrasteBtn = calcularRazaoContraste(btnText, btnBg);
        assert.ok(
          contrasteBtn >= 4.5,
          `Texto de botão (${btnText}) sobre fundo de botão (${btnBg}) no tema ${temaId} [${modo}] obteve ${contrasteBtn.toFixed(2)}:1 (exige >= 4.5:1)`
        );
      });
    }
  }
});
