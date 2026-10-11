# Guia de Estilo & Diretrizes de Design do Snoopy Vault
**Versão:** 1.0  
**Stack de Interface:** Obsidian CSS Snippet + DataviewJS  
**Inspiração Tipográfica & Visual:** Anthropic Design Language (Anthropic Sans / Styrene / Modern Minimal Clean Tech)

---

## 1. Filosofia de Design & Identidade Visual

O design do Snoopy Vault segue os princípios de **clareza técnica, legibilidade estrita e minimalismo moderno**:
1. **Zero Efeito "IA Genérica":** Sem gradientes roxos/rosas genéricos, sem sombras volumosas falsas e sem layouts engessados.
2. **Preto Profundo & Tons Monocromáticos:** Fundo primário `#070709`, painéis `#0d0d12`, bordas semitransparentes elegantes (`rgba(255, 255, 255, 0.08)` a `0.14`), com realces sutis em verde menta (`#86efac` / `#4ade80`) e azul técnico (`#60a5fa`).
3. **Centralização Estrita de Tokens:** Nenhuma propriedade de fonte, tamanho de cabeçalho ou cor arbitrária deve ser declarada inline diretamente no JavaScript. Tudo deve derivar das variáveis CSS e de classes utilitárias semânticas.

---

## 2. Tipografia Global Centralizada

A tipografia é configurada em um único ponto através de CSS Custom Properties (`:root`), permitindo substituição simples para o vault inteiro com fallback automático.

### 2.1 Pilhas Tipográficas (Font Stacks)

| Categoria | Propriedade CSS | Stack Padrão (Anthropic Style) | Fallback |
| :--- | :--- | :--- | :--- |
| **Geral / UI** | `--snoopy-font-sans` | `"Anthropic Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` | Sistema Nativo |
| **Títulos & Destaques** | `--snoopy-font-heading` | `"Anthropic Sans", "Inter Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif` | Sans Serif |
| **Dados & Metadados** | `--snoopy-font-mono` | `"JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, monospace` | Monospace Nativo |

### 2.2 Escala Tipográfica Padronizada

| Nível / Uso | Classe Semântica | Tamanho | Peso | Letter-Spacing | Transform |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Título Principal (H1)** | `.snoopy-h1` | `20px` | `700` | `-0.02em` | Normal |
| **Título de Seção (H2)** | `.snoopy-section-title` | `14.5px` | `700` | `+0.05em` | `uppercase` |
| **Subtítulo / Módulo** | `.snoopy-sub-title` | `11px` | `700` | `+0.05em` | `uppercase` |
| **Corpo / Cards** | `.snoopy-text-body` | `13px` | `400` / `500`| `normal` | Normal |
| **Metadados / Badges** | `.snoopy-meta` | `11px` | `500` | `normal` | Normal (Mono) |
| **Micro-labels / Status** | `.snoopy-micro` | `10px` | `600` | `+0.03em` | `uppercase` (Mono) |

---

## 3. Tokens de Cor e Contraste

Todas as cores são semânticas e sincronizadas com as variáveis do Obsidian e Snippet:

```css
:root {
  /* Tipografia */
  --snoopy-font-sans: "Anthropic Sans", "Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  --snoopy-font-heading: "Anthropic Sans", "Inter Display", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  --snoopy-font-mono: "JetBrains Mono", "Fira Code", "SF Mono", Menlo, Consolas, monospace;

  /* Superfícies & Cores de Fundo */
  --snoopy-bg-main: #070709;
  --snoopy-bg-card: #0d0d12;
  --snoopy-bg-card-hover: #121217;
  --snoopy-bg-input: #121218;

  /* Bordas */
  --snoopy-border: rgba(255, 255, 255, 0.08);
  --snoopy-border-subtle: rgba(255, 255, 255, 0.05);
  --snoopy-border-hover: rgba(255, 255, 255, 0.16);

  /* Texto */
  --snoopy-text-primary: #ffffff;
  --snoopy-text-normal: #e4e4e7;
  --snoopy-text-muted: #a1a1aa;
  --snoopy-text-faint: #71717a;

  /* Realces Semânticos */
  --snoopy-accent-blue: #60a5fa;
  --snoopy-accent-green: #86efac;
  --snoopy-accent-orange: #fdba74;
}
```

---

## 4. Componentes de Ação (Botões & Controles)

Todos os botões do Snoopy Vault seguem classes semânticas e modificadores de escala, eliminando paddings e font-sizes inline.

### 4.1 Variantes de Botão

| Classe CSS | Descrição e Caso de Uso |
| :--- | :--- |
| `.snoopy-btn-action` | Botão secundário/neutro padrão (transparente com borda sutil e hover claro). |
| `.snoopy-btn-primary` | Botão de destaque/ação primária (fundo com acento e alto contraste). |
| `.snoopy-btn-mode` | Botão de alternância/modo (usado em abas compactas, timers e filtros). |
| `.snoopy-btn-tab` | Botão de abas de escopo e navegação de segundo nível. |
| `.snoopy-btn-icon` | Botão quadrado para ícones/ações pontuais (`padding: 0; min-width: 28px`). |
| `.snoopy-btn-danger` | Variante de perigo/destrutiva (combina com `.snoopy-btn-action` ou `.snoopy-btn-icon`). |

### 4.2 Modificadores de Escala

| Classe Modificadora | Altura / Padding | Uso Típico |
| :--- | :--- | :--- |
| `.snoopy-btn-sm` | `padding: 3px 8px; font-size: 11px` | Linhas de tabelas, cartões densos, itens de lista. |
| `.snoopy-btn-md` | `padding: 5px 12px; font-size: 12px` | Modais, toolbars principais, ações de formulário. |
| `.snoopy-btn-lg` | `padding: 8px 16px; font-size: 13px` | Cockpit principal, CTAs de destaque. |
| `.snoopy-btn-block` | `width: 100%` | Botões que ocupam toda a largura do container. |

---

## 5. Estrutura de Layout e Containers

| Classe Utilitária | Propósito | Comportamento CSS |
| :--- | :--- | :--- |
| `.snoopy-card-header` | Cabeçalho padronizado de painéis | `display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--snoopy-border);` |
| `.snoopy-toolbar` | Barra horizontal de ações e botões | `display: flex; align-items: center; gap: 8px; flex-wrap: wrap;` |
| `.snoopy-modal-close` | Botão de fechamento no topo de modais | Posicionamento ou alinhamento com hover transparente |

---

## 6. Microsserviço UIKit (`core/ui_kit.js`)

Para módulos dinâmicos DataviewJS, o helper `UIKit` encapsula a criação declarativa de elementos padronizados:

```javascript
// Criar botão padronizado
const botao = UIKit.criarBotao(container, {
  texto: "Nova Tarefa",
  icone: "plus",
  variante: "primary", // 'action' | 'primary' | 'mode' | 'tab' | 'icon' | 'danger'
  tamanho: "md",       // 'sm' | 'md' | 'lg'
  onClick: () => abrirModal()
});

// Criar cabeçalho de cartão com título e toolbar
const header = UIKit.criarCardHeader(container, {
  titulo: "Quadro Kanban",
  icone: "trello",
  acoes: [
    { texto: "+ Item", variante: "primary", tamanho: "sm", onClick: () => novoItem() }
  ]
});
```

---

## 7. Regras de Engenharia para os Módulos (JavaScript)

1. **Proibição de `font-family` inline:** Nunca injetar `style="font-family: monospace;"` ou `font-family: sans-serif;` em templates de strings JS.
2. **Proibição de paddings e fontes inline em botões:** Sempre utilizar variantes `.snoopy-btn-*` e modificadores `.snoopy-btn-sm|md|lg`.
3. **Uso de Classes Utilitárias:**
   - Para metadados e chips com tipografia mono: usar a classe `.snoopy-meta` ou `.snoopy-micro`.
   - Para títulos de cartões: usar `.snoopy-card-title` ou `.snoopy-section-title`.
   - Para rótulos de campos em modais: usar `.snoopy-modal-label`.
   - Para cabeçalhos e barras de botões: usar `.snoopy-card-header` e `.snoopy-toolbar`.
4. **Modificação Única e Central:**
   - Se o usuário desejar alternar a tipografia do Vault para qualquer outra fonte no futuro (ex.: `Geist Sans`, `Departure Mono`, `SF Pro`), basta editar as variáveis no topo do arquivo `.obsidian/snippets/05_Snoopy_Theme.css`. Todo o sistema responderá instantaneamente.

