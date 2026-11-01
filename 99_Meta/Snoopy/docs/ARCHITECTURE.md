# Arquitetura Técnica & Guia de Modificação do Snoopy Vault
**Público-Alvo:** Engenheiros de Software e Modelos de IA (LLMs)  
**Objetivo:** Permitir navegação cirúrgica, redução drástica do consumo de tokens e edições seguras sem necessidade de ler arquivos inteiros.

---

## 1. Mapa Topológico do Repositório & Índice Rápido

Para economizar tokens, consulte este mapa antes de inspecionar arquivos longos:

| Caminho do Arquivo | Responsabilidade Principal | Símbolos / Métodos Exportados |
| :--- | :--- | :--- |
| [`99_Meta/Snoopy/home/view.js`](../home/view.js) | Orquestrador Central, Cache de Boot, EventBus e Microsserviços Globais | `SnoopyEventBus`, `DateUtils`, `VaultStore`, `ModalFactory`, `renderIcon`, `ctx` |
| [`99_Meta/Snoopy/core/shop_store.js`](../core/shop_store.js) | Central de Economia, Catálogo Multi-Categoria, Inventário & Mutex com WeakMap | `ShopStore`, `carregar`, `obterSaldo`, `creditarFoco`, `comprarItem`, `equiparItem` |
| [`99_Meta/Snoopy/core/pomodoro_audio.js`](../core/pomodoro_audio.js) | Motor de Síntese Procedural de Áudio de Foco puro via Web Audio API | `PomodoroAudio`, `iniciar`, `tocar`, `pausar`, `ajustarVolume`, `obterFaixas` |
| [`99_Meta/Snoopy/core/jardim_store.js`](../core/jardim_store.js) | Fachada de Retrocompatibilidade para o Jardim Botânico delegando a ShopStore | `JardimStore`, `obterSaldo`, `creditarFoco`, `comprarArvore`, `obterEstado` |
| [`99_Meta/Snoopy/core/ui_kit.js`](../core/ui_kit.js) | Catálogo Canônico de 87 Ícones Lucide SVG, componentes vazios e helpers de DOM | `UIKit`, `icon`, `badge`, `emptyState`, `ICONS` |
| [`99_Meta/Snoopy/modulos/shop/shop_modal.js`](../modulos/shop/shop_modal.js) | Modal da Central de Customizações, prévia sonora, catálogo e inventário | `ShopModal`, `abrirModalLoja` |
| [`99_Meta/Snoopy/modulos/01_snoopy_banner_cabecalho.js`](../modulos/01_snoopy_banner_cabecalho.js) | Banner superior, data dinâmica formatada e botões de ação rápida | `render(ctx)` |
| [`99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js`](../modulos/02_snoopy_cockpit_pomodoro.js) | Temporizador Pomodoro circular SVG, heatmap de foco, dock de áudio e modal da loja | `render(ctx)`, `iniciarPomodoro()`, `registrarCiclo()` |
| [`99_Meta/Snoopy/modulos/03_snoopy_kanban_projetos.js`](../modulos/03_snoopy_kanban_projetos.js) | Kanban interativo com Drag-and-Drop (Backlog, Execução, Concluídos) | `render(ctx)`, `atualizarStatusProjeto()` |
| [`99_Meta/Snoopy/modulos/03_snoopy_planner_calendario.js`](../modulos/03_snoopy_planner_calendario.js) | Calendário mensal de foco e agenda semanal integrada de tarefas | `render(ctx)` |
| [`99_Meta/Snoopy/modulos/04_snoopy_daily_tracker.js`](../modulos/04_snoopy_daily_tracker.js) | Rastreador de Hábitos com recorrência & Central de Tarefas com abas e badges | `render(ctx)`, `abrirModalNovoHabito()`, `abrirModalNovaTarefa()` |
| [`99_Meta/Snoopy/modulos/05_snoopy_leituras_estudos.js`](../modulos/05_snoopy_leituras_estudos.js) | Vitrine de Ciclo de Estudos & Bookshelf Koreader de Leituras Ativas | `render(ctx)`, `abrirModalNovoLivro()` |
| [`.obsidian/snippets/05_Snoopy_Theme.css`](../../../.obsidian/snippets/05_Snoopy_Theme.css) | Variáveis CSS em `:root`, tokens tipográficos (Anthropic Sans) e estilos unificados | `:root`, `.snoopy-container`, `.snoopy-audio-dock`, `.snoopy-shop-card` |
| [`99_Meta/Snoopy/docs/DESIGN_GUIDELINES.md`](DESIGN_GUIDELINES.md) | Diretrizes tipográficas, contraste, catálogo de 87 ícones e política zero emojis | Guia de Tokens, Classes Utilitárias e Catálogo SVG |

---

## 2. Diagrama Arquitetural de Componentes (Mermaid C4)

```mermaid
graph TB
  subgraph Obsidian Host ["Ecossistema Obsidian & DataviewJS"]
    APP[Obsidian App / TFile / Vault]
    LOCAL_STORAGE[localStorage (Preferências Rápidas)]
  end

  subgraph Orquestração ["Orquestrador da Home"]
    VIEW[home/view.js]
    CTX[Objeto ctx / Injeção de Dependências]
  end

  subgraph Core Engine ["99_Meta/Snoopy/core/ (Microsserviços)"]
    EVENTBUS[EventBus (Barramento Reativo)]
    SHOP_STORE[ShopStore (Economia, Loja & Inventário)]
    JARDIM_STORE[JardimStore (Fachada Retrocompatível)]
    POMO_AUDIO[PomodoroAudio (Web Audio API Procedural)]
    UI_KIT[UIKit (87 Ícones SVG Lucide & Helpers)]
    DATE_UTILS[DateUtils]
    VAULT_STORE[VaultStore]
    MODAL_FACTORY[ModalFactory]
    CONFIG_CTRL[ConfigController]
  end

  subgraph Módulos de Interface ["99_Meta/Snoopy/modulos/"]
    MOD_POMO[02_snoopy_cockpit_pomodoro.js]
    MOD_SHOP[shop/shop_modal.js]
    MOD_BANNER[01_snoopy_banner_cabecalho.js]
    MOD_TRACKER[04_snoopy_daily_tracker.js]
    MOD_VITRINE[05_snoopy_leituras_estudos.js]
    MOD_PLANNER[03_snoopy_planner_calendario.js]
    MOD_KANBAN[03_snoopy_kanban_projetos.js]
  end

  subgraph Persistência em Cofre ["Arquivos JSON de Estado"]
    FILE_SHOP[(99_Meta/snoopy-shop.json)]
    FILE_JARDIM[(99_Meta/jardim-constancia.json - Legado)]
    FILE_CICLO[(99_Meta/ciclo-estudos.json)]
  end

  VIEW --> CTX
  CTX --> EVENTBUS
  CTX --> VAULT_STORE
  CTX --> DATE_UTILS
  CTX --> MODAL_FACTORY
  CTX --> UI_KIT
  CTX --> SHOP_STORE
  CTX --> POMO_AUDIO
  CTX --> JARDIM_STORE

  MOD_POMO --> POMO_AUDIO
  MOD_POMO --> SHOP_STORE
  MOD_POMO --> MOD_SHOP
  MOD_POMO --> EVENTBUS

  JARDIM_STORE -.->|Delega Transações| SHOP_STORE
  SHOP_STORE --> FILE_SHOP
  SHOP_STORE -.->|Espelha Retrocompatibilidade| FILE_JARDIM

  POMO_AUDIO --> LOCAL_STORAGE
  POMO_AUDIO -.->|Consulta Faixas Desbloqueadas| SHOP_STORE

  MOD_SHOP --> SHOP_STORE
  MOD_SHOP --> POMO_AUDIO
  MOD_SHOP --> MODAL_FACTORY
```

---

## 3. Contratos dos Microsserviços Centrais (`ctx`)

Todos os módulos recebem um objeto `ctx` injetado pelo [`home/view.js`](../home/view.js). **Nunca recrie estas funções dentro dos módulos**:

### `ctx.eventBus` (Barramento Reativo)
- **`emit(event: string, data: any): void`**: Dispara eventos desacoplados.
- **`on(event: string, handler: Function): () => void`**: Inscreve ouvinte. Retorna função para `unsubscribe`.
- **Tópicos Padronizados do Ecossistema:**
  - `economy:balance_updated`: `{ saldoAtual: number, delta: number, motivo: string }`
  - `shop:item_purchased`: `{ item: object, saldoAtual: number }`
  - `inventory:item_equipped`: `{ categoria: string, itemId: string, item: object }`
  - `pomodoro:start`: `{ taskId?: string, duration: number }`
  - `pomodoro:complete`: `{ duration: number, taskId?: string, coinsEarned?: number }`
  - `pomodoro:tick`: `{ tempoRestante: number, total: number, percentual: number }`

### `ctx.shopStore` / `ShopStore` (Economia, Catálogo Multi-Categoria & Inventário)
Microsserviço de autoridade única sobre saldo de moedas de foco, catálogo heterogêneo e itens equipados com proteção transacional por `WeakMap`.
- **`carregar(app): Promise<ShopState>`**: Carrega e normaliza o estado persistido de `99_Meta/snoopy-shop.json`.
- **`obterSaldo(app): number`**: Retorna síncronamente o saldo em cache de moedas de foco.
- **`obterItensDesbloqueados(app, categoria?): string[]`**: Retorna array com IDs de itens adquiridos (opcionalmente filtrado por categoria).
- **`obterEquipado(app, categoria): Promise<string|null>`**: Retorna o ID do item atualmente equipado na categoria (`botanica`, `audio`, `tema`).
- **`creditarMoedas(app, quantidade: number, motivo?: string, eventBus?: object): Promise<number>`**: Adiciona moedas ao saldo com escrita atômica.
- **`creditarFoco(app, minutos?: number, comboCiclos?: number, eventBus?: object): Promise<{ moedasGanhas: number, base: number, bonusCombo: number, combo: number, saldoAtual: number }>`**: Calcula moedas ganhas por ciclo de foco com bônus de combo e atualiza o saldo.
- **`comprarItem(app, itemId: string, eventBus?: object): Promise<{ sucesso: boolean, mensagem: string, estado?: object, item?: object, erro?: string }>`**: Debita saldo, adiciona ao inventário e emite evento reativo.
- **`equiparItem(app, itemId: string, eventBus?: object): Promise<{ sucesso: boolean, mensagem: string, estado?: object, item?: object }>`**: Equipa item desbloqueado na sua respectiva categoria.
- **`obterCatalogo(categoria?: string): Array<object>`**: Retorna o catálogo completo ou filtrado por categoria (`botanica`, `audio`, `tema`).
- **`obterItemPorId(itemId: string): object|null`**: Busca metadados de um item no catálogo.

### `ctx.pomodoroAudio` / `PomodoroAudio` (Motor de Áudio Procedural Web Audio API)
Síntese sonora estocástica e algorítmica puramente procedural em memória (ruídos coloridos, chuva e tons binaurais).
- **`iniciar(): Promise<void>`**: Desbloqueia o `AudioContext` nativo em resposta a gesto do usuário.
- **`tocar(trackId?: string): void`** / **`tocarFaixa(trackId?: string): void`**: Inicia síntese em tempo real da faixa informada ou ativa.
- **`pausar(): void`** / **`parar(): void`**: Interrompe a síntese com rampa exponencial suave de volume.
- **`ajustarVolume(valor: number): void`**: Define ganho mestre (0.0 a 1.0) e persiste em `localStorage`.
- **`mutar(isMuted: boolean): void`**: Alterna mudo preservando o nível anterior de volume no `localStorage`.
- **`definirAutoSync(habilitado: boolean): void`**: Ativa/desativa sincronização automática com o timer Pomodoro.
- **`obterAutoSync(): boolean`**: Retorna preferência de sincronização automática com timer.
- **`obterEstado(): { isPlaying: boolean, currentTrack: string, volume: number, isMuted: boolean, autoSync: boolean, contextState: string }`**: Snapshot completo do motor.
- **`obterFaixas(): Array<object>`**: Lista completa das 6 faixas procedurais implementadas.
- **`obterFaixasDisponiveis(app): Promise<Array<object>>`**: Retorna faixas filtradas pelo inventário de desbloqueios do `ShopStore`.
- **`destroy(): void`**: Encerra nós de áudio e fecha o `AudioContext`.

### `ctx.jardimStore` / `JardimStore` (Fachada Retrocompatível)
Camada de preservação para componentes legados, delegando 100% de sua lógica e dados para o `ShopStore`.
- **`obterSaldo(app): Promise<number>`**: Delega para `ShopStore.obterSaldo()`.
- **`creditarFoco(app, minutos, comboCiclos, eventBus): Promise<object>`**: Delega para `ShopStore.creditarFoco()`.
- **`comprarArvore(app, arvoreId, eventBus): Promise<object>`**: Delega para `ShopStore.comprarItem()`.
- **`obterEstado(app): Promise<object>`**: Delega para `ShopStore.carregar()`, normalizando para o formato histórico.

### `ctx.uiKit` / `UIKit` (Catálogo Canônico de Ícones Lucide SVG)
- **`icon(iconName: string, options?: { size?: number, color?: string, cls?: string }): string`**: Retorna string HTML de vetor SVG Lucide puro (87 ícones canônicos).
- **`renderIcon(container: HTMLElement, iconName: string, options?: object): HTMLElement`**: Injeta ícone diretamente no container DOM.
- **`emptyState(container: HTMLElement, options: { icon: string, title: string, message: string }): HTMLElement`**: Renderiza padrão de estado vazio padronizado.

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

---

## 4. Padrão Estrito de Docstrings & Comentários JSDoc

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

## 5. Regras para Edição Rápida com Baixo Custo de Contexto (Tokens)

1. **Evite inspecionar arquivos inteiros:** Se a tarefa for alterar a cor de um botão ou fonte, altere apenas [.obsidian/snippets/05_Snoopy_Theme.css](../../../.obsidian/snippets/05_Snoopy_Theme.css) ou use as classes utilitárias já prontas (`.snoopy-meta`, `.snoopy-micro`, `.snoopy-section-title`).
2. **Não redeclare CSS inline nos scripts:** Sempre referencie variáveis CSS (`var(--snoopy-font-mono)`, `var(--snoopy-border)`) ou adicione classes CSS centralizadas no snippet de tema.
3. **Preserve a Atomicidade dos Módulos:** Os módulos comunicam-se de forma desacoplada via `ctx.eventBus`.
4. **Política de Zero Emojis:** É estritamente proibido introduzir glifos de emojis gráficos no DOM ou em cabeçalhos de markdown. Utilize exclusivamente `UIKit.icon()` com os 87 ícones canônicos.
5. **Verificação de Sintaxe Obrigatória:** Sempre execute `node -c <arquivo>` após qualquer modificação em JavaScript.
