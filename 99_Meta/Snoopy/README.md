# 🐾 Snoopy Vault — Arquitetura de Módulos & Subdashboards

Este diretório contém os componentes modulares e subdashboards do ecossistema Snoopy para o Obsidian, desenvolvidos em JavaScript puro com renderização sob demanda via DataviewJS.

---

## 🏛️ Estrutura de Diretórios

```text
99_Meta/Snoopy/
├── modulos/
│   ├── 01_snoopy_header.js              # Banner de boas-vindas e data formatada
│   ├── 02_snoopy_cockpit_pomodoro.js    # Timer Pomodoro cíclico com sincronização
│   ├── 03_snoopy_daily_tracker.js       # Registro diário e hábitos
│   ├── 04_snoopy_kanban_todo.js         # Integração bidirecional To-Do ↔ Kanban
│   └── 05_snoopy_leituras_estudos.js    # Vitrine 50/50 com Mini Hero KOReader e KPIs
└── subdashboards/
    ├── estudos/
    │   └── view.js                      # Framework analítico Estudei (4 abas)
    └── leituras/
        └── view.js                      # Bookshelf autêntico KOReader (AndyHazz)
```

---

## 📚 1. Subdashboard de Estudos (`subdashboards/estudos/view.js`)

Inspirado nas plataformas analíticas de estudo e concursos (ex: *Estudei*):
- **Aba 1 (Painel de Controle):**
  - Gráfico Donut SVG de distribuição de horas por disciplina com legenda interativa.
  - Gráfico de Linha/Área SVG nativo dos últimos 7 dias, consolidando minutos de foco (Pomodoro + sessões manuais).
  - 6 Cards de KPIs (Questões Feitas, Acertos, Erros, Taxa Geral %, Horas Líquidas, Matérias Ativas).
  - Tabela analítica completa com assertividade colorida e links diretos para cada disciplina.
- **Aba 2 (Meu Planner):**
  - Cronograma semanal de blocos com modal de agendamento por matéria, duração e modalidade (Teoria/Questões/Revisão).
- **Aba 3 (Revisões Espaçadas):**
  - Abas *Programadas*, *Atrasadas* e *Concluídas*, com avanço automático da curva de esquecimento (1d ➔ 7d ➔ 14d ➔ 30d).
- **Aba 4 (Ciclo de Estudos):**
  - Rotação contínua da Matéria da Vez, com conclusão e avanço cíclico.

---

## 📖 2. Subdashboard de Leituras (`subdashboards/leituras/view.js`)

Inspirado no plugin *Bookshelf* do KOReader (`AndyHazz/bookshelf.koplugin`):
- **Hero Card:** Destaque do livro ativo no topo com capa 3D, perspectiva e sombra, autor em itálico, sinopse, progresso em porcentagem, páginas restantes e tempo estimado de leitura.
- **Abas E-Reader:** Filtros rápidos entre `HOME (Todos)`, `RECENT (Lendo)`, `QUERO LER` e `FAVOURITES (Lidos)`.
- **The Shelf Grid:** Grade de capas com marcadores de fita (*ribbons*), selos de conclusão e barras de progresso embutidas.
- **Busca na Nuvem:** Integração direta com a API pública da Open Library para pesquisa e cadastro instantâneo de metadados sem dependências externas.
- **Atualização Rápida:** Modal para alterar página atual, total e status diretamente pela interface.
