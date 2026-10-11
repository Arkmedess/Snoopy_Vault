/**
 * Snoopy Vault - Testes Unitários de ModalFactory
 * Valida a integridade da API, ciclo de vida e dispatchers.
 */
const { test, describe, beforeEach } = require('node:test');
const assert = require('node:assert/strict');

// Mock mínimo de ambiente DOM para testes em Node
class MockElement {
  constructor(tag = 'div') {
    this.tagName = tag.toUpperCase();
    this.className = '';
    this.style = {};
    this.children = [];
    this.parentNode = null;
    this.innerHTML = '';
    this.listeners = {};
  }

  appendChild(el) {
    el.parentNode = this;
    this.children.push(el);
    return el;
  }

  removeChild(el) {
    const idx = this.children.indexOf(el);
    if (idx !== -1) this.children.splice(idx, 1);
    el.parentNode = null;
    return el;
  }

  addEventListener(evt, fn) {
    if (!this.listeners[evt]) this.listeners[evt] = [];
    this.listeners[evt].push(fn);
  }

  removeEventListener(evt, fn) {
    if (this.listeners[evt]) {
      this.listeners[evt] = this.listeners[evt].filter(f => f !== fn);
    }
  }

  dispatchEvent(evt) {
    if (this.listeners[evt.type]) {
      this.listeners[evt.type].forEach(f => f(evt));
    }
  }
}

// Configura o mock global
global.document = {
  createElement: (tag) => new MockElement(tag),
  body: new MockElement('body'),
  addEventListener: (evt, fn) => global.document.body.addEventListener(evt, fn),
  removeEventListener: (evt, fn) => global.document.body.removeEventListener(evt, fn),
  dispatchEvent: (evt) => global.document.body.dispatchEvent(evt)
};

const ModalFactory = require('../../99_Meta/Snoopy/core/modal_factory.js');

describe('ModalFactory - Ciclo de Vida e Segurança DOM', () => {
  beforeEach(() => {
    global.document.body.children = [];
    global.document.body.listeners = {};
  });

  test('cria elemento de modal com classes e adiciona ao body', () => {
    let montou = false;
    const { modalBox, fechar } = ModalFactory.abrir({
      htmlContent: '<p>Teste</p>',
      maxWidth: '500px',
      onMontar: (box) => {
        montou = true;
        assert.equal(box.innerHTML, '<p>Teste</p>');
      }
    });

    assert.equal(montou, true);
    assert.equal(modalBox.style.maxWidth, '500px');
    assert.equal(modalBox.className, 'snoopy-modal-box');
    assert.equal(global.document.body.children.length, 1);

    fechar();
    assert.equal(global.document.body.children.length, 0);
  });

  test('fecha o modal ao disparar tecla Escape', () => {
    const { fechar } = ModalFactory.abrir({
      htmlContent: '<p>Teste ESC</p>'
    });

    assert.equal(global.document.body.children.length, 1);

    // Dispara ESC
    let defaultPrevented = false;
    global.document.dispatchEvent({
      type: 'keydown',
      key: 'Escape',
      preventDefault: () => { defaultPrevented = true; }
    });

    assert.equal(defaultPrevented, true);
    assert.equal(global.document.body.children.length, 0);
  });

  test('aciona callback onConfirmar ao pressionar Ctrl+Enter', () => {
    let confirmou = false;
    ModalFactory.abrir({
      htmlContent: '<p>Teste Confirmar</p>',
      onConfirmar: (box, fechar) => {
        confirmou = true;
        fechar();
      }
    });

    global.document.dispatchEvent({
      type: 'keydown',
      key: 'Enter',
      ctrlKey: true,
      preventDefault: () => {}
    });

    assert.equal(confirmou, true);
    assert.equal(global.document.body.children.length, 0);
  });
});

