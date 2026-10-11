# Arquitetura Técnica & Guia de Modificação do Snoopy Vault
**Público-Alvo:** Engenheiros de Software e Modelos de IA (LLMs)  
**Objetivo:** Permitir navegação cirúrgica, redução drástica do consumo de tokens e edições seguras sem necessidade de ler arquivos inteiros.

---

## 1. Mapa Topológico do Repositório & Índice Rápido

Para economizar tokens, consulte este mapa antes de inspecionar arquivos longos:

| Caminho do Arquivo | Responsabilidade Principal | Símbolos / Métodos Exportados |
| :--- | :--- | :--- |
| [`99_Meta/Snoopy/home/view.js`](file:///home/arthur/Documents/Snoopy_Vault/99_Meta/Snoopy/home/view.js) | Orquestrador Central, Cache de Boot, EventBus e Microsserviços Globais | `SnoopyEventBus`, `DateUtils`, `VaultStore`, `ModalFactory`, `renderIcon`, `ctx` |
| [`99_Meta/Snoopy/modulos/01_snoopy_banner_cabecalho.js`](file:///home/arthur/Documents/Snoopy_Vault/99_Meta/Snoopy/modulos/01_snoopy_banner_cabecalho.js) | Banner superior, data dinâmica formatada e botões de ação rápida | `render(ctx)` |
| [`99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js`](file:///home/arthur/Documents/Snoopy_Vault/99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js) | Temporizador Pomodoro circular SVG, heatmap de foco e micro-diário | `render(ctx)`, `iniciarPomodoro()`, `registrarCiclo()` |
| [`99_Meta/Snoopy/modulos/03_snoopy_kanban_projetos.js`](file:///home/arthur/Documents/Snoopy_Vault/99_Meta/Snoopy/modulos/03_snoopy_kanban_projetos.js) | Kanban interativo com Drag-and-Drop (Backlog, Execução, Concluídos) | `render(ctx)`, `atualizarStatusProjeto()` |
| [`99_Meta/Snoopy/modulos/04_snoopy_daily_tracker.js`](file:///home/arthur/Documents/Snoopy_Vault/99_Meta/Snoopy/modulos/04_snoopy_daily_tracker.js) | Rastreador de Hábitos com recorrência & Central de Tarefas com abas e badges | `render(ctx)`, `abrirModalNovoHabito()`, `abrirModalNovaTarefa()` |
| [`99_Meta/Snoopy/modulos/05_snoopy_leituras_estudos.js`](file:///home/arthur/Documents/Snoopy_Vault/99_Meta/Snoopy/modulos/05_snoopy_leituras_estudos.js) | Vitrine de Ciclo de Estudos & Bookshelf Koreader de Leituras Ativas | `render(ctx)`, `abrirModalNovoLivro()` |
| [`.obsidian/snippets/05_Snoopy_Theme.css`](file:///home/arthur/Documents/Snoopy_Vault/.obsidian/snippets/05_Snoopy_Theme.css) | Variáveis CSS em `:root`, tokens tipográficos (Anthropic Sans) e estilos unificados | `:root`, `.snoopy-container`, `.snoopy-icon`, `.snoopy-meta`, etc. |
| [`99_Meta/Snoopy/docs/DESIGN_GUIDELINES.md`](file:///home/arthur/Documents/Snoopy_Vault/99_Meta/Snoopy/docs/DESIGN_GUIDELINES.md) | Diretrizes tipográficas, contraste e regras estéticas do design | Guia de Tokens e Classes Utilitárias |

---

## 2. Contratos dos Microsserviços Centrais (`ctx`)

Todos os módulos recebem um objeto `ctx` injetado pelo [view.js](file:///home/arthur/Documents/Snoopy_Vault/99_Meta/Snoopy/home/view.js). **Nunca recrie estas funções dentro dos módulos**:

### `ctx.eventBus` (Barramento Reativo)
- **`emit(event: string, data: any): void`**: Dispara eventos desacoplados (ex: `pomodoro:start`, `pomodoro:complete`).
- **`on(event: string, handler: Function): () => void`**: Inscreve ouvinte. Retorna função para `unsubscribe`.

### `ctx.dateUtils` (Manipulação Temporal Padronizada)
- **`somarDias(dataIso: string, qtdDias: number): string`** -> Retorna `YYYY-MM-DD`.
- **`formatarDDMMYYYY(dataStr: string): string`** -> Converte ISO ou string para formato brasileiro `DD-MM-YYYY`.
- **`normalizarParaISO(dataStr: string): string`** -> Converte `DD-MM-YYYY` para `YYYY-MM-DD`.
- **`obterRangeSemana(dataRef: Date): { inicioIso: string, fimIso: string }`**

### `ctx.vaultStore` (Persistência & Manipulação de Arquivos Markdown)
- **`obterFrontmatter(file: TFile): Promise<object>`**
- **`atualizarFrontmatter(file: TFile, updates: object): Promise<void>`**
- **`modificarLinhaMarkdown(file: TFile, transformFn: (linhas: string[]) => string[]): Promise<void>`**

### `ctx.modalFactory` (Criação Declarativa de Janelas Modais)
- **`abrir({ htmlContent: string, maxWidth?: string, onMontar?: Function, onConfirmar?: Function }): { modalBox: HTMLElement, fechar: Function }`**

### `ctx.renderIcon(container: HTMLElement, iconName: string, options?: { size?: number, color?: string, cls?: string }): HTMLElement`
- Renderiza vetor SVG puro nativo do catálogo Lucide embutido (`calendar`, `settings`, `play`, `pause`, `rotate-ccw`, `zap`, `pencil`, `brain`, `clock`, `more-vertical`, `arrow-up`, etc.).

---

## 3. Padrão Estrito de Docstrings & Comentários JSDoc

Ao criar ou editar funções nos módulos do Snoopy Vault, siga rigorosamente a convenção JSDoc em Português:

```javascript
/**
 * Adiciona uma nova tarefa à nota de projeto ou nota diária.
 *
 * @param {string} titulo - Descrição da tarefa a ser executada.
 * @param {string} [prazoIso] - Data limite opcional no formato YYYY-MM-DD.
 * @param {string} [periodo] - Período do dia ('manha' | 'tarde' | 'noite' | 'livre').
 * @param {number} [pomodoros=1] - Estimativa de blocos de foco.
 * @returns {Promise<TFile>} Retorna a referência da nota modificada.
 * @throws {Error} Lança erro caso o arquivo alvo não possa ser acessado.
 */
async function criarTarefa(titulo, prazoIso, periodo, pomodoros = 1) {
  // Implementação mínima
}
```

---

## 4. Regras para Edição Rápida com Baixo Custo de Contexto (Tokens)

1. **Evite inspecionar arquivos inteiros:** Se a tarefa for alterar a cor de um botão ou fonte, altere apenas [.obsidian/snippets/05_Snoopy_Theme.css](file:///home/arthur/Documents/Snoopy_Vault/.obsidian/snippets/05_Snoopy_Theme.css) ou use as classes utilitárias já prontas (`.snoopy-meta`, `.snoopy-micro`, `.snoopy-section-title`).
2. **Não redeclare CSS inline nos scripts:** Sempre referencie variáveis CSS (`var(--snoopy-font-mono)`, `var(--snoopy-border)`) ou adicione classes CSS centralizadas no snippet de tema.
3. **Preserve a Atomicidade dos Módulos:** Os módulos `01` a `05` são autocontidos e comunicam-se exclusivamente via `ctx.eventBus`.
4. **Verificação de Sintaxe Obrigatória:** Sempre execute `node -c <arquivo>` após qualquer modificação em JavaScript.

