# Snoopy Vault — Arquitetura de Módulos & Subdashboards

Este diretório contém os componentes modulares, microsserviços centrais e subdashboards do ecossistema Snoopy para o Obsidian, desenvolvidos em JavaScript puro com renderização sob demanda via DataviewJS.

---

## Estrutura de Diretórios

```text
99_Meta/Snoopy/
├── core/                                # Microsserviços centrais e motores de estado
│   ├── config_controller.js             # Gerenciamento de propriedades e configurações
│   ├── date_utils.js                    # Utilitários de manipulação temporal e ISO
│   ├── jardim_store.js                  # Fachada de compatibilidade para o Jardim Botânico
│   ├── lifecycle.js                     # Ciclo de vida e montagem de componentes
│   ├── mock_manager.js                  # Gerenciador de mocks de demonstração
│   ├── modal_factory.js                 # Fábrica centralizada de janelas modais
│   ├── module_loader.js                 # Carregador assíncrono de módulos DataviewJS
│   ├── pomodoro_audio.js                # Motor de áudio procedural de foco (Web Audio API)
│   ├── shop_store.js                    # Central de economia, catálogo e inventário
│   ├── task_parser.js                   # Parser cirúrgico de tarefas markdown
│   ├── task_templates.js                # Instanciação de templates conectados de tarefas
│   ├── ui_kit.js                        # Catálogo canônico de 87 ícones Lucide SVG e helpers
│   ├── updater.js                       # Mecanismo de verificação e atualização em 3 zonas
│   └── vault_store.js                   # Persistência e manipulação atômica de arquivos
├── docs/                                # Documentação técnica aprofundada
│   ├── adr/                             # Architecture Decision Records (MADR)
│   ├── ARCHITECTURE.md                  # Mapa topológico, C4 Mermaid e contratos de microsserviços
│   └── DESIGN_GUIDELINES.md             # Guia de estilo, escala tipográfica e catálogo de ícones
├── home/
│   └── view.js                          # Orquestrador central e injetor do objeto ctx
├── modulos/                             # Fatias verticais do dashboard principal
│   ├── 01_snoopy_banner_cabecalho.js    # Banner de boas-vindas e ações rápidas
│   ├── 02_snoopy_cockpit_pomodoro.js    # Cockpit Pomodoro circular, heatmap e dock de áudio
│   ├── 03_snoopy_kanban_projetos.js     # Quadro Kanban interativo com drag & drop
│   ├── 03_snoopy_planner_calendario.js  # Calendário mensal e agenda semanal de blocos
│   ├── 04_snoopy_daily_tracker.js       # Rastreador de hábitos diários e central de tarefas
│   ├── 05_snoopy_leituras_estudos.js    # Vitrine 50/50 de estudos e bookshelf KOReader
│   ├── daily_tracker/                   # Componentes internos de tarefas e hábitos
│   ├── pomodoro/                        # Componentes do pomodoro (timer, playlist, modal)
│   └── shop/                            # Modal da Central de Customizações & Loja
│       └── shop_modal.js                # Interface da loja multi-categoria e inventário
└── subdashboards/                       # Aplicações dedicadas em tela cheia
    ├── configuracoes/                   # Subdashboard de parâmetros e atualizações
    ├── estudos/                         # Framework analítico de estudos (4 abas)
    └── leituras/                        # Bookshelf autêntico KOReader com Open Library API
```

---

## Núcleo de Microsserviços Centrais (`core/`)

O ecossistema adota uma arquitetura desacoplada onde a lógica de domínio, economia, manipulação de arquivos e áudio é centralizada em microsserviços injetados no objeto global `ctx`:

1. **`ShopStore` (`core/shop_store.js`):**
   - Autoridade única sobre o saldo de moedas de foco, catálogo multi-categoria (`botanica`, `audio`, `tema`) e inventário do usuário.
   - Persistência em `99_Meta/snoopy-shop.json` com fila assíncrona serializada via `WeakMap` para garantia de integridade concorrente contra race conditions.
   - Emite eventos de economia e inventário no barramento reativo `EventBus`.

2. **`PomodoroAudio` (`core/pomodoro_audio.js`):**
   - Motor de síntese procedural em tempo real 100% puro via Web Audio API (zero dependências ou arquivos de áudio pesados).
   - Disponibiliza 6 perfis acústicos infinitos: ruído branco, ruído rosa, ruído marrom profundo, chuva estocástica procedural e tons binaurais estéreo (ondas alfa de 10Hz e beta de 16Hz).
   - Integração com `localStorage` para volume, estado de mudo e faixa ativa, além de sincronização automática com o timer do Pomodoro (`autoSync`).

3. **`JardimStore` (`core/jardim_store.js`):**
   - Fachada de retrocompatibilidade para componentes legados que ainda consomem a API botânica histórica.
   - Delega 100% de consultas de saldo, bonificações e compras de espécies para o `ShopStore`, mantendo compatibilidade total sem replicação de lógica.

4. **`UIKit` (`core/ui_kit.js`):**
   - Catálogo canônico de 87 ícones Lucide SVG embutidos, eliminando qualquer dependência de emojis literais na interface.
   - Fornece helpers declarativos para criação padronizada de estados vazios (`UIKit.criarEstadoVazio()`), badges semânticas e concordância gramatical (`UIKit.pluralizar()`).

---

## Módulos do Dashboard Principal (`modulos/`)

### Cockpit Pomodoro & Modo Foco Imersivo (`02_snoopy_cockpit_pomodoro.js`)
- Temporizador circular SVG preciso com modo foco, controle de sessões e micro-diário.
- **Dock de Áudio Integrado (`.snoopy-audio-dock`):** Permite alternar faixas sintetizadas, ajustar volume, mutar e configurar sincronização automática com a contagem regressiva.
- **Integração com a Loja:** Acesso em 1 clique à Central de Customizações (`ShopModal`), exibindo saldo atual de moedas ganhas e permitindo desbloqueio e equipamento de novas faixas sonoras ou espécies botânicas.

### Central de Customizações & Loja Autônoma (`modulos/shop/shop_modal.js`)
- Modal multi-categoria para aquisição e equipamento de personalizações acústicas, espécies botânicas e temas visuais.
- Prévia de áudio em tempo real diretamente pelo cartão de cada faixa da loja antes da compra.
- Linha de KPIs responsiva com saldo de moedas, total de itens desbloqueados e catálogo disponível.

---

## 1. Subdashboard de Estudos (`subdashboards/estudos/view.js`)

Inspirado nas plataformas analíticas de estudo e concursos:
- **Aba 1 (Painel de Controle):**
  - Gráfico Donut SVG de distribuição de horas por disciplina com legenda interativa.
  - Gráfico de Linha/Área SVG nativo dos últimos 7 dias, consolidando minutos de foco (Pomodoro + sessões manuais).
  - 6 Cards de KPIs (Questões Feitas, Acertos, Erros, Taxa Geral %, Horas Líquidas, Matérias Ativas).
  - Tabela analítica completa com assertividade colorida e links diretos para cada disciplina.
- **Aba 2 (Meu Planner):**
  - Cronograma semanal de blocos com modal de agendamento por matéria, duração e modalidade (Teoria/Questões/Revisão).
- **Aba 3 (Revisões Espaçadas):**
  - Abas *Programadas*, *Atrasadas* e *Concluídas*, com avanço automático da curva de esquecimento (1d -> 7d -> 14d -> 30d).
- **Aba 4 (Ciclo de Estudos):**
  - Rotação contínua da Matéria da Vez, com conclusão e avanço cíclico.

---

## 2. Subdashboard de Leituras (`subdashboards/leituras/view.js`)

Inspirado no plugin *Bookshelf* do KOReader:
- **Hero Card:** Destaque do livro ativo no topo com capa 3D, perspectiva e sombra, autor em itálico, sinopse, progresso em porcentagem, páginas restantes e tempo estimado de leitura.
- **Abas E-Reader:** Filtros rápidos entre `HOME (Todos)`, `RECENT (Lendo)`, `QUERO LER` e `FAVOURITES (Lidos)`.
- **The Shelf Grid:** Grade de capas com marcadores de fita (*ribbons*), selos de conclusão e barras de progresso embutidas.
- **Busca na Nuvem:** Integração direta com a API pública da Open Library para pesquisa e cadastro instantâneo de metadados sem dependências externas.
- **Atualização Rápida:** Modal para alterar página atual, total e status diretamente pela interface.
