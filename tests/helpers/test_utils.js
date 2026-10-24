/**
 * Snoopy Vault - Utilitários de Mock para Testes Unitários
 * Executado nativamente via `node --test`.
 */
const fs = require('node:fs');
const path = require('node:path');

function parseHTMLIntoMockElements(html, parentEl) {
  if (!html || typeof html !== 'string') return;
  const cleanHtml = html.replace(/<!--[\s\S]*?-->/g, '');
  const tagTokenRegex = /<\/?([a-zA-Z0-9-]+)([^>]*)>/g;
  let match;
  let lastIndex = 0;
  const stack = [parentEl];

  while ((match = tagTokenRegex.exec(cleanHtml)) !== null) {
    const isClosing = match[0].startsWith('</');
    const isSelfClosing = match[0].endsWith('/>') || ['img', 'input', 'br', 'hr'].includes(match[1].toLowerCase());
    const tagName = match[1].toLowerCase();
    const rawAttrs = match[2] || '';

    const textBefore = cleanHtml.slice(lastIndex, match.index).trim();
    if (textBefore && stack.length > 0) {
      const top = stack[stack.length - 1];
      if (!top.innerText) top.innerText = textBefore;
    }
    lastIndex = tagTokenRegex.lastIndex;

    if (['svg', 'path', 'circle', 'line', 'polygon', 'polyline', 'rect', 'defs', 'linearGradient', 'stop'].includes(tagName)) {
      continue;
    }

    if (isClosing) {
      if (stack.length > 1 && stack[stack.length - 1].tagName.toLowerCase() === tagName) {
        stack.pop();
      }
    } else {
      const attrs = {};
      const idMatch = rawAttrs.match(/id=["']([^"']+)["']/);
      if (idMatch) attrs.id = idMatch[1];
      const classMatch = rawAttrs.match(/class=["']([^"']+)["']/);
      if (classMatch) attrs.cls = classMatch[1];

      const currentParent = stack[stack.length - 1];
      const child = createMockEl(tagName, attrs);
      child.parentElement = currentParent;
      currentParent.children.push(child);

      if (!isSelfClosing) {
        stack.push(child);
      }
    }
  }
}

/**
 * Cria um mock leve de elemento DOM compatível com as extensões do Obsidian (createEl, empty, etc).
 *
 * @param {string} [tag='div'] - Tag do elemento.
 * @param {object} [attrs={}] - Atributos iniciais.
 * @returns {object}
 */
function createMockEl(tag = 'div', attrs = {}) {
  const listeners = {};
  const classListSet = new Set();
  let innerHtmlVal = attrs.innerHTML || '';

  if (attrs.cls) {
    attrs.cls.split(/\s+/).filter(Boolean).forEach(c => classListSet.add(c));
  }

  let customInnerText = attrs.text || '';

  const el = {
    tagName: tag.toUpperCase(),
    attrs: { ...attrs },
    style: {},
    children: [],
    parentElement: null,
    get innerText() {
      if (customInnerText) return customInnerText;
      if (el.children.length > 0) {
        return el.children.map(c => c.innerText || '').join(' ').trim();
      }
      return '';
    },
    set innerText(val) {
      customInnerText = val || '';
    },
    value: attrs.value || '',
    disabled: false,
    focus: () => {},
    blur: () => {},

    get innerHTML() {
      if (el.children.length > 0) {
        return innerHtmlVal + el.children.map(c => c.innerHTML || c.innerText || '').join('');
      }
      return innerHtmlVal;
    },
    set innerHTML(val) {
      innerHtmlVal = val || '';
      el.children = [];
      if (innerHtmlVal) {
        parseHTMLIntoMockElements(innerHtmlVal, el);
      }
    },

    get className() {
      return Array.from(classListSet).join(' ');
    },
    set className(val) {
      classListSet.clear();
      if (val) val.split(/\s+/).filter(Boolean).forEach(c => classListSet.add(c));
    },

    classList: {
      add: (...classes) => classes.forEach(c => classListSet.add(c)),
      remove: (...classes) => classes.forEach(c => classListSet.delete(c)),
      toggle: (c, force) => {
        if (typeof force === 'boolean') {
          if (force) classListSet.add(c);
          else classListSet.delete(c);
          return force;
        }
        if (classListSet.has(c)) {
          classListSet.delete(c);
          return false;
        }
        classListSet.add(c);
        return true;
      },
      contains: (c) => classListSet.has(c)
    },

    setAttribute: (k, v) => {
      el.attrs[k] = String(v);
    },
    getAttribute: (k) => el.attrs[k] || null,

    addEventListener: (evt, fn) => {
      if (!listeners[evt]) listeners[evt] = [];
      listeners[evt].push(fn);
    },
    dispatchEvent: (evt, data = {}) => {
      const handlers = listeners[evt] || [];
      handlers.forEach(fn => fn({ type: evt, target: el, preventDefault: () => {}, stopPropagation: () => {}, ...data }));
    },

    createEl: (childTag, opts = {}) => {
      const child = createMockEl(childTag, opts.attr || {});
      child.parentElement = el;
      if (opts.cls) child.className = opts.cls;
      if (opts.text) child.innerText = opts.text;
      if (opts.innerHTML) child.innerHTML = opts.innerHTML;
      if (opts.title) child.setAttribute('title', opts.title);
      if (opts.value) child.value = opts.value;
      el.children.push(child);
      return child;
    },

    appendChild: (child) => {
      if (child) {
        child.parentElement = el;
        el.children.push(child);
      }
      return child;
    },

    empty: () => {
      el.children = [];
      innerHtmlVal = '';
      el.innerText = '';
    },

    querySelector: (sel) => {
      return findInSubtree(el, sel);
    },
    querySelectorAll: (sel) => {
      const results = [];
      findAllInSubtree(el, sel, results);
      return results;
    }
  };

  if (innerHtmlVal) {
    parseHTMLIntoMockElements(innerHtmlVal, el);
  }

  return el;
}

function matchesSelector(node, sel) {
  if (sel.startsWith('#')) return node.attrs.id === sel.slice(1);
  if (sel.startsWith('.')) return node.classList && node.classList.contains(sel.slice(1));
  return node.tagName.toLowerCase() === sel.toLowerCase();
}

function findInSubtree(root, sel) {
  for (const child of root.children) {
    if (matchesSelector(child, sel)) return child;
    const found = findInSubtree(child, sel);
    if (found) return found;
  }
  return null;
}

function findAllInSubtree(root, sel, list) {
  for (const child of root.children) {
    if (matchesSelector(child, sel)) list.push(child);
    findAllInSubtree(child, sel, list);
  }
}

/**
 * Carrega dinamicamente um arquivo do motor DataviewJS como módulo.
 *
 * @param {string} relativePath - Caminho relativo a partir da raiz do repositório.
 * @returns {any}
 */
function carregarModulo(relativePath) {
  const fullPath = path.resolve(__dirname, '../../', relativePath);
  const code = fs.readFileSync(fullPath, 'utf8');
  return (new Function(code))();
}

/**
 * Cria um mock estruturado da API Dataview.
 *
 * @param {Array<object>} [pagesData=[]] - Páginas virtuais para consulta.
 * @returns {object}
 */
function createMockDataview(pagesData = []) {
  function wrapDataArray(items) {
    const arr = [...items];
    arr.where = (predicate) => wrapDataArray(arr.filter(predicate));

    const allTasks = [];
    arr.forEach(p => {
      if (p.file && Array.isArray(p.file.tasks)) {
        allTasks.push(...p.file.tasks);
      }
    });
    allTasks.where = (subPredicate) => {
      const res = allTasks.filter(subPredicate);
      res.where = (p2) => res.filter(p2);
      return res;
    };

    arr.file = {
      tasks: allTasks
    };

    return arr;
  }

  return {
    page: (pathOrName) => {
      return pagesData.find(p => p.file && (p.file.path === pathOrName || p.file.name === pathOrName)) || null;
    },
    pages: (folderQuery = '') => {
      const filtered = pagesData.filter(p => {
        if (folderQuery && p.file && p.file.folder && !folderQuery.includes(p.file.folder)) {
          return false;
        }
        return true;
      });
      return wrapDataArray(filtered);
    }
  };
}

module.exports = {
  createMockEl,
  carregarModulo,
  createMockDataview
};
