/**
 * Snoopy Vault - E2E Testing Utilities & Environment Mocks
 * Pure Node.js runner compatible with `node --test`.
 */
const fs = require('node:fs');
const path = require('node:path');

// Re-use core DOM mock helpers from existing helper
const { createMockEl, createMockDataview, carregarModulo } = require('../../helpers/test_utils.js');

/**
 * Creates an in-memory mock of the Obsidian App Vault.
 * Supports file reading, writing, creation, and path lookup.
 *
 * @param {object|string|null} [dadosIniciais=null] - Initial file contents or JSON-serializable object
 * @returns {object} Mock Obsidian App
 */
function criarMockApp(dadosIniciais = null) {
  const fileStore = new Map();

  if (dadosIniciais !== null) {
    const serialized = typeof dadosIniciais === 'string' ? dadosIniciais : JSON.stringify(dadosIniciais);
    fileStore.set('99_Meta/jardim-constancia.json', serialized);
    fileStore.set('99_Meta/snoopy-shop.json', serialized);
  }

  const vault = {
    getAbstractFileByPath: (p) => {
      if (fileStore.has(p)) {
        return { path: p, name: path.basename(p) };
      }
      return null;
    },
    read: async (file) => {
      const p = typeof file === 'string' ? file : file.path;
      if (!fileStore.has(p)) {
        throw new Error(`File not found: ${p}`);
      }
      return fileStore.get(p);
    },
    modify: async (file, content) => {
      const p = typeof file === 'string' ? file : file.path;
      fileStore.set(p, typeof content === 'string' ? content : JSON.stringify(content));
    },
    create: async (filePath, content) => {
      fileStore.set(filePath, typeof content === 'string' ? content : JSON.stringify(content));
      return { path: filePath, name: path.basename(filePath) };
    },
    adapter: {
      exists: async (p) => fileStore.has(p),
      read: async (p) => fileStore.get(p),
      write: async (p, content) => fileStore.set(p, content)
    },
    _getRawStore: () => fileStore
  };

  return { vault };
}

/**
 * In-memory mock of browser/Electron localStorage.
 */
function createMockLocalStorage() {
  const store = new Map();
  return {
    getItem: (key) => store.has(String(key)) ? store.get(String(key)) : null,
    setItem: (key, val) => store.set(String(key), String(val)),
    removeItem: (key) => store.delete(String(key)),
    clear: () => store.clear(),
    key: (index) => Array.from(store.keys())[index] || null,
    get length() { return store.size; },
    _dump: () => Object.fromEntries(store.entries())
  };
}

/**
 * Deterministic Mock of the Web Audio API AudioContext for headless testing.
 */
class MockAudioContext {
  constructor() {
    this.state = 'suspended';
    this.currentTime = 0;
    this.sampleRate = 44100;
    this.destination = {
      connect: () => {},
      disconnect: () => {}
    };
    this.nodesCreated = [];
  }

  async resume() {
    this.state = 'running';
  }

  async suspend() {
    this.state = 'suspended';
  }

  async close() {
    this.state = 'closed';
  }

  createGain() {
    const gainNode = {
      type: 'gain',
      gain: {
        value: 1,
        setValueAtTime: function(v) { this.value = v; },
        linearRampToValueAtTime: function(v) { this.value = v; }
      },
      connect: (target) => { gainNode._target = target; },
      disconnect: () => { gainNode._target = null; }
    };
    this.nodesCreated.push(gainNode);
    return gainNode;
  }

  createBufferSource() {
    const sourceNode = {
      type: 'bufferSource',
      buffer: null,
      loop: false,
      playbackRate: { value: 1 },
      connect: (target) => { sourceNode._target = target; },
      disconnect: () => { sourceNode._target = null; },
      start: () => { sourceNode._started = true; },
      stop: () => { sourceNode._stopped = true; }
    };
    this.nodesCreated.push(sourceNode);
    return sourceNode;
  }

  createBuffer(channels, length, sampleRate) {
    const channelData = Array.from({ length: channels }, () => new Float32Array(length));
    return {
      numberOfChannels: channels,
      length,
      sampleRate: sampleRate || this.sampleRate,
      duration: length / (sampleRate || this.sampleRate),
      getChannelData: (ch) => channelData[ch]
    };
  }

  createBiquadFilter() {
    const filter = {
      type: 'lowpass',
      frequency: {
        value: 1000,
        setValueAtTime: function(v) { this.value = v; }
      },
      Q: {
        value: 1,
        setValueAtTime: function(v) { this.value = v; }
      },
      connect: (target) => { filter._target = target; },
      disconnect: () => { filter._target = null; }
    };
    this.nodesCreated.push(filter);
    return filter;
  }

  createStereoPanner() {
    const panner = {
      pan: {
        value: 0,
        setValueAtTime: function(v) { this.value = v; }
      },
      connect: (target) => { panner._target = target; },
      disconnect: () => { panner._target = null; }
    };
    this.nodesCreated.push(panner);
    return panner;
  }

  createOscillator() {
    const osc = {
      type: 'sine',
      frequency: {
        value: 440,
        setValueAtTime: function(v) { this.value = v; }
      },
      connect: (target) => { osc._target = target; },
      disconnect: () => { osc._target = null; },
      start: () => { osc._started = true; },
      stop: () => { osc._stopped = true; }
    };
    this.nodesCreated.push(osc);
    return osc;
  }
}

/**
 * Dynamic module loader with safety fallbacks for progressive milestone verification.
 */
function getModuleIfPresent(relPath) {
  const fullPath = path.resolve(__dirname, '../../../', relPath);
  if (fs.existsSync(fullPath)) {
    try {
      return require(fullPath);
    } catch (e) {
      return null;
    }
  }
  return null;
}

function getUIKit() {
  return require('../../../99_Meta/Snoopy/core/ui_kit.js');
}

function getJardimStore() {
  return require('../../../99_Meta/Snoopy/core/jardim_store.js');
}

function getShopStore() {
  return getModuleIfPresent('99_Meta/Snoopy/core/shop_store.js');
}

function getPomodoroAudio() {
  return getModuleIfPresent('99_Meta/Snoopy/core/pomodoro_audio.js');
}

module.exports = {
  createMockEl,
  createMockDataview,
  carregarModulo,
  criarMockApp,
  createMockLocalStorage,
  MockAudioContext,
  getModuleIfPresent,
  getUIKit,
  getJardimStore,
  getShopStore,
  getPomodoroAudio
};
