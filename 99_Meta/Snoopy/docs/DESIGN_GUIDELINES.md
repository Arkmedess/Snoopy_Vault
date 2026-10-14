# Guia de Estilo & Diretrizes de Design do Snoopy Vault
**Versão:** 2.1  
**Stack de Interface:** Obsidian CSS Snippet + DataviewJS  
**Inspiração Tipográfica & Visual:** Anthropic Design Language (Anthropic Sans / Tech Minimal Clean) + Editorial Serif Accent

---

## 1. Filosofia de Design & Identidade Visual

O design do Snoopy Vault é construído com base em **precisão técnica, legibilidade estrita e minimalismo funcional de cockpit**:
1. **Zero Efeito "IA Genérica":** Rejeição categórica de gradientes roxos/rosas genéricos, bordas neon espalhafatosas, ilustrações decorativas infladas e sombras volumosas falsas.
2. **Preto Profundo & Tons Monocromáticos:**
   - **Superfície Primária (Mestre):** `#070709` (preto profundo absorvente).
   - **Superfície Secundária (Painéis/Cartões):** `#0d0d12` (cinza escuro técnico neutro).
   - **Superfície Interativa (Hover de Cartões):** `#121217`.
   - **Campos de Entrada (Inputs/Selects):** `#121218`.
3. **Bordas Semitransparentes Cirúrgicas:**
   - Linhas estruturais com `rgba(255, 255, 255, 0.08)` em repouso e `rgba(255, 255, 255, 0.16)` no estado hover.
4. **Paleta Semântica de Realce Focado:** Cores puramente utilitárias para sinalização de estado:
   - **Verde Menta (`#86efac` / `#4ade80`):** Conclusão, progresso ativo e confirmação.
   - **Laranja Técnico (`#fdba74`):** Atenção moderada, tarefas em andamento e prazos próximos.
   - **Azul Técnico (`#60a5fa`):** Navegação, referências cruzadas e identificação de fontes.
   - **Vermelho Discreto (`#f87171`):** Atrasos críticos e ações destrutivas irreversíveis.
5. **Centralização Estrita de Tokens:** Nenhuma propriedade de tipografia, espaçamento ou cor pode ser escrita inline em código JavaScript. Todo estilo deve derivar exclusivamente das variáveis CSS do snippet [`05_Snoopy_Theme.css`](file:///home/arthur/Documents/Snoopy_Vault/.obsidian/snippets/05_Snoopy_Theme.css) e das classes semânticas utilitárias.

---

## 2. Política Estrita de Zero Emojis na Interface

Para garantir um ambiente de alta concentração, profissionalismo e estética sóbria, vigora a seguinte regra inegociável:

1. **Proibição Absoluta de Emojis em Elementos de Interface:**
   - É expressamente proibido o uso de caracteres de emoji gráficos (ex.: 🎯, 🚀, 🔍, 🗑️, ⚙️, ✨, 🌅, ☀️, 🌙, ✓, ✕, 📅, ⚡, 🛡️, ⏪) em botões, títulos de seções, cartões, abas, diálogos modais, cabeçalhos, barras de ferramentas e mensagens `new Notice()`.
   - Elementos visuais de status, ação ou identificação devem ser representados exclusivamente pelo **catálogo de ícones vetoriais SVG (Lucide)**.
2. **Exceção Estrita e Controlada:**
   - Emojis só são permitidos quando fizerem parte da sintaxe de metadados em texto markdown de plugins legados de terceiros no corpo de notas (ex.: `📅 YYYY-MM-DD`, `⏫`, `🔁` no padrão do plugin Obsidian Tasks). Mesmo nesses casos, quando parseados pelo motor DataviewJS, devem ser exibidos na UI através de ícones vetoriais correspondentes.

### 2.1 Tabela Canônica de De/Para (Substituição de Emojis por Ícones SVG)

| Conceito / Intenção | Emoji Obsoleto | Ícone SVG Lucide Canônico | Caso de Uso na Interface |
| :--- | :---: | :--- | :--- |
| **Data / Calendário / Prazo** | 📅 | `calendar` | Datas de entrega, agendamento de tarefas e notas diárias. |
| **Meta / Alvo Quantitativo** | 🎯 | `target` | Objetivos de estudo, metas de páginas e limites numéricos. |
| **Modo Foco / Energia** | ⚡ | `zap` | Disparo do Modo Foco imersivo em tela cheia. |
| **Excluir / Descartar** | 🗑️ | `trash-2` | Ação destrutiva no menu contextual e remoção de tarefas/notas. |
| **Configurações / Sistema** | ⚙️ | `settings` | Subdashboard de manutenção, parâmetros e integrações. |
| **Pesquisa / Busca** | 🔍 | `search` | Campo de filtro de templates e busca de anotações. |
| **Ações / Mocks / Demonstração** | ✨ | `sparkles` | Criação de dados de demonstração ou geração assistida. |
| **Manhã** | 🌅 | `sunrise` | Aba e filtro de tarefas programadas para a manhã. |
| **Tarde** | ☀️ | `sun` | Aba e filtro de tarefas programadas para a tarde. |
| **Noite** | 🌙 | `moon` | Aba e filtro de tarefas programadas para a noite. |
| **Rotina / Hábitos Diários** | 🔁 | `repeat` | Rastreador de hábitos com recorrência cíclica. |
| **Segurança / Backup / Zonas** | 🛡️ | `shield` | Mecanismo de proteção de dados e rollback do atualizador. |
| **Rollback / Desfazer** | ⏪ | `undo-2` | Restauração atômica de versão anterior do cofre. |
| **Sincronizar / Atualizar** | 🔄 | `refresh-cw` | Verificação de novas versões do motor no GitHub. |
| **Concluído / Sucesso** | ✅ / ✓ | `check` / `check-circle` | Marcação de tarefa finalizada ou hábito cumprido. |
| **Fechar / Cancelar** | ❌ / ✕ | `x` | Botão de encerramento de modais e cancelamento. |
| **Atenção / Atraso** | ⚠️ | `alert-circle` | Sinalização de tarefa vencida ou erro operacional. |
| **Leitura / Livro** | 📚 / 📖 | `book` / `book-open` / `library` | Estante Koreader e vitrine de leituras ativas. |
| **Estudos / Aprendizado** | 🎓 | `graduation-cap` | Módulo de ciclo de estudos e planejamento acadêmico. |
| **Ideia / Insight** | 💡 | `lightbulb` | Notas conceituais e sínteses de aprendizagem. |
| **Métricas / Unidades** | 📏 | `ruler` | Configuração de unidade de medida (páginas, minutos, blocos). |

---

## 3. Sistema de Design Iconográfico (Lucide SVG Nativo)

Todos os ícones da interface derivam do catálogo de vetores SVG puros, embutidos diretamente no microsserviço [`UIKit`](file:///home/arthur/Documents/Snoopy_Vault/99_Meta/Snoopy/core/ui_kit.js) e consumíveis via `ctx.renderIcon()` ou `UIKit.renderIcon()`.

### 3.1 Especificação Técnica dos Vetores

- **Formato:** SVG embutido nativo (sem requisições externas de rede e sem dependência de fontes de ícones).
- **ViewBox:** `0 0 24 24`.
- **Preenchimento:** `fill="none"`.
- **Traçado (Stroke):** `stroke="currentColor"` com `stroke-width="2"`, `stroke-linecap="round"` e `stroke-linejoin="round"`.
- **Comportamento no DOM:** O container do ícone é um elemento `<span class="snoopy-icon">` estilizado com `display: inline-flex; align-items: center; justify-content: center; vertical-align: middle; line-height: 1;`.

### 3.2 Escala Dimensional Ótica de Ícones

| Classificação | Dimensão (`width` x `height`) | Aplicação no Sistema |
| :--- | :--- | :--- |
| **Micro** | `10px` a `12px` | Badges densas de metadados, indicadores em linhas de tabela, chips compactos. |
| **Padrão (Botões)** | `14px` x `14px` | Botões `.snoopy-btn-action`, `.snoopy-btn-primary`, abas e botões de cabeçalho. |
| **Barra de Ações (Action Bar)**| `15px` x `15px` | Botões de ícone `.snoopy-btn-icon` em cabeçalhos de modais e menus rápidos. |
| **Seção / Cabeçalho de Card** | `16px` x `16px` | Títulos de painéis (ex.: `.snoopy-card-title`) e colunas do Kanban. |
| **Destaque / Hero** | `20px` a `24px` | Controles centrais do Cockpit Pomodoro, estados vazios e Modo Foco. |

### 3.3 Catálogo Canônico de Ícones (`UIKit.ICONS`)

| Chave do Ícone | Categoria | Descrição Semântica |
| :--- | :--- | :--- |
| `calendar` | Navegação / Tempo | Representação de datas, notas diárias e agendamentos. |
| `calendar-plus` | Ação / Tempo | Adiar prazo (+1 dia) no editor contextual. |
| `clock` / `timer` | Tempo | Indicador de estimativa temporal e dial do Pomodoro. |
| `play` | Pomodoro / Execução | Iniciar contagem do ciclo de foco ou carregar tarefa no cockpit. |
| `pause` | Pomodoro | Pausar temporariamente o timer ativo. |
| `rotate-ccw` | Pomodoro | Resetar o ciclo para o tempo inicial padrão. |
| `zap` | Pomodoro / Foco | Ativar o Modo Foco imersivo em tela cheia com escurecimento profundo. |
| `target` | Metas | Alvo numérico de execução quantitativa. |
| `plus` | Operação | Criação de nova tarefa, novo projeto ou novo hábito. |
| `plus-circle` | Operação | Ação aditiva em formulários e cards modais. |
| `minus` | Operação | Decremento de valor ou minimização de bloco. |
| `pencil` | Edição | Abertura do editor contextual de tarefa ou nota. |
| `trash-2` | Destrutivo | Exclusão de card no Kanban ou descarte de item. |
| `check` | Validação | Conclusão rápida de item. |
| `check-circle` | Validação | Status de projeto concluído ou meta batida. |
| `x` | Fechamento | Fechar modal, limpar filtro ou descartar janela. |
| `more-vertical` | Ação Contextual | Menu de três pontinhos (`⋮`) **sempre visível** para ações do item. |
| `external-link` | Navegação | Atalho para abrir a nota Markdown nativa no Obsidian. |
| `arrow-up-right` | Navegação Externa | Indicador de salto para subdashboard (substitui o glifo `↗`). |
| `skip-forward` | Fluxo | Pular matéria no ciclo de estudos contínuo. |
| `list-checks` | Tarefas | Central e módulo de tarefas em execução. |
| `library` | Leituras | Módulo Estante de livros e catálogo de volumes. |
| `graduation-cap` | Conhecimento | Subdashboard e módulo de Estudos. |
| `kanban` / `trello` | Estrutura | Quadro Kanban de fluxo de projetos e iniciativas. |
| `bar-chart-3` | Métricas | Indicadores de desempenho e gráficos de assertividade. |
| `percent` | Métricas | Taxa percentual de conclusão e acertos. |
| `file-text` | Documentação | Origem de nota diária ou vínculo de arquivo. |
| `info` | Ajuda / Instrução | Blocos orientadores e estados vazios com dicas operacionais. |
| `grip-vertical` | Interação | Alça tátil de arrasto para reordenação de elementos (drag-and-drop). |
| `search` | Filtro | Consulta textual instantânea em listas e templates. |
| `filter` | Filtro | Alternância de critérios de visualização em painéis. |
| `refresh-cw` | Sistema | Verificação e sincronização de dados do cofre. |
| `undo-2` | Sistema | Reversão atômica de atualização (Rollback). |
| `shield` | Sistema | Segurança arquitetural de 3 zonas e proteção de dados. |
| `alert-circle` | Status | Alerta de item em atraso ou falha operacional. |
| `book` / `book-open` | Conhecimento | Leituras do Bookshelf Koreader e anotações literárias. |
| `book-plus` | Operação | Cadastrar novo livro na estante. |
| `brain` | Aprendizado | Planejamento cognitivo e revisões espaçadas. |
| `sprout` / `trees` | Aprendizado | Estágios do Jardim de Constância e níveis de Bloom. |
| `code-2` | Domínio | Tarefas técnicas de engenharia e desenvolvimento de software. |
| `database` | Sistema | Manutenção e limpeza de mocks de demonstração. |
| `ruler` | Metrologia | Unidades de medida quantitativa configuráveis. |
| `microscope` | Análise | Investigação detalhada e revisões profundas. |
| `lightbulb` | Ideias | Captura de notas e conceitos no Inbox. |
| `sunrise` / `sun` / `moon` | Período | Períodos do dia (Manhã, Tarde, Noite). |
| `repeat` | Hábitos | Rotina recorrente de acompanhamento diário. |
| `columns` | Estrutura | Organização em colunas e grades de alta densidade. |
| `folder-plus` | Arquivo | Criação de novo projeto estruturado em pasta. |
| `file-x` | Arquivo | Exclusão física ou descarte de nota do cofre. |
| `bookmark` | Marcação | Fixação de item prioritário ou favorito. |
| `star` / `star-half` | Avaliação | Classificação por estrelas de volumes lidos. |

---

## 4. Tipografia Global, Fontes Embutidas e Tokens CSS

A tipografia do cofre foi projetada em **três camadas de resiliência**, garantindo independência completa de conexão com a internet e consistência em qualquer sistema operacional:

1. **Camada 1 (Proprietária):** Caso instalada no sistema operacional, a fonte `"Anthropic Sans"` é assumida no topo da pilha.
2. **Camada 2 (Embutida Offline-First):** O snippet [`00_Snoopy_Fonts.css`](file:///home/arthur/Documents/Snoopy_Vault/.obsidian/snippets/00_Snoopy_Fonts.css) embute em formato WOFF2 base64 as famílias `Snoopy Inter` (UI), `Snoopy Mono` (dados e códigos) e `Snoopy Display` (serif editorial para a data do banner).
3. **Camada 3 (Fallbacks de Sistema):** Reconhecimento nativo de `JetBrainsMono Nerd Font`, `Inter`, `SF Mono`, `Menlo` e fallbacks do sistema.

### 4.1 Pilhas Tipográficas (Font Stacks)

| Categoria | Variável CSS | Pilha Declarada | Fallback de Último Nível |
| :--- | :--- | :--- | :--- |
| **Interface / UI** | `--snoopy-font-sans` | `"Anthropic Sans", "Snoopy Inter", "Inter", "Geist"` | `-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif` |
| **Display (Banner)** | `--snoopy-font-display` | `"Snoopy Display", "Source Serif 4", "Fraunces", Georgia` | `"Noto Serif", serif` |
| **Dados / Metadados** | `--snoopy-font-mono` | `"Snoopy Mono", "JetBrains Mono", "JetBrainsMono Nerd Font"` | `"Fira Code", "SF Mono", Menlo, monospace` |

### 4.2 Escala Tipográfica Estrita (Tokens Fechados)

| Token CSS | Tamanho | Peso | Letter-Spacing | Transform | Finalidade |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--snoopy-fs-hero` | `54px` | `700` | Normal | Normal | Mostrador gigante do Cockpit Pomodoro em repouso. |
| `--snoopy-fs-display` | `26px` / `2.25rem` | `700` | `-0.01em` | Normal | Data por extenso no banner central (Serif). |
| `--snoopy-fs-h1` | `18px` | `700` | `-0.02em` | Normal | Título de subdashboards em tela cheia. |
| `--snoopy-fs-h2` | `14px` | `700` | `+0.05em` | `uppercase` | Título de card/painel (.snoopy-section-title). |
| `--snoopy-fs-body` | `13px` | `400`/`500`| Normal | Normal | Texto corrido de tarefas, cartões e inputs. |
| `--snoopy-fs-small` | `12px` | `500` | Normal | Normal | Subtítulos de painéis (.snoopy-card-subtitle), botões e abas. |
| `--snoopy-fs-meta` | `11px` | `500` | Normal | Normal | Metadados mono, badges de arquivos e tags. |
| `--snoopy-fs-micro` | `10px` | `600` | `+0.05em` | `uppercase` | Overlines (.snoopy-overline) e cabeçalhos de tabela (Mono). |

---

## 5. Anatomia Canônica de Cabeçalhos e Nomenclatura dos Módulos

Para erradicar a mistura de idiomas e eliminar títulos genéricos, os 6 módulos do dashboard adotam títulos concisos em português e anatomia em duas linhas:

### 5.1 Nomenclatura dos Módulos

| Título Oficial (H2) | Ícone Lucide (16px) | Subtítulo Descritivo (.snoopy-card-subtitle) | Substituição de Nome Antigo |
| :--- | :--- | :--- | :--- |
| **TAREFAS** | `list-checks` | *O que precisa sair hoje* | Substitui *Central de Tarefas · Núcleo de Execução* |
| **HÁBITOS** | `repeat` | *Rituais diários e frequência* | Substitui *Hábitos de Hoje* |
| **POMODORO** | `timer` | *Sessão de foco e intervalo* | Substitui *Pomodoro Focus Cockpit* |
| **JARDIM DE CONSTÂNCIA** | `sprout` | *Histórico e ciclos acumulados* | Substitui *Histórico & Constância de Foco* |
| **ESTUDOS** | `graduation-cap` | *Ciclo de estudos e matérias ativas* | Substitui *Estudos & Ciclo Ativo* |
| **ESTANTE** | `library` | *Leituras ativas e biblioteca* | Substitui *Bookshelf de Leituras* |
| **KANBAN** | `kanban` | *Fluxo contínuo de iniciativas* | Substitui *Iniciativas em Andamento* |

### 5.2 Anatomia Visual do Cabeçalho (.snoopy-card-header)

```text
┌─────────────────────────────────────────────────────────────────────────────┐
│ [ícone 16px] TÍTULO DO MÓDULO (H2)                     [+ AÇÃO PRINCIPAL]   │
│ Subtítulo descritivo em sans 12px muted (sem caixa alta)                    │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 6. Design System de Botões e Interações

### 6.1 Regra de Capitalização e Proeminência

1. **Botões Principais (CTAs Primários e Criação):**
   - Rótulo **sempre em maiúsculo**, acompanhado de ícone vetorial à esquerda:
   - Exemplo: `+ NOVA TAREFA`, `+ NOVO HÁBITO`, `+ TEMPLATE`, `+ NOVO PROJETO`, `+ BUSCAR NA NUVEM`.
2. **Botões Secundários, Abas e Ações de Linha:**
   - Rótulo em **caixa normal (Sentence case)**:
   - Exemplo: `Iniciar Foco`, `Reset`, `Modo Foco`, `Foco`, `Abrir nota`, `Avançar`, `Cancelar`, `Salvar alterações`.
3. **Menu Contextual de Três Pontinhos (`more-vertical`):**
   - Deve permanecer **sempre visível** (sem ocultação por hover), assegurando descobrimento imediato em telas desktop e mobile.

---

## 7. Componentes de Resiliência: Estado Vazio e Concordância Gramatical

### 7.1 Componente Padronizado de Estado Vazio (`.snoopy-empty`)

Quando uma coluna do Kanban, lista de tarefas ou estante não contiver itens, é expressamente proibido exibir textos crus soltos. Deve ser invocado `UIKit.criarEstadoVazio()`:
- Ícone de 24px em `--snoopy-muted`.
- Título em `--snoopy-fs-body` (`600`, alto contraste).
- Descrição de apoio orientando a ação do usuário em `--snoopy-fs-small`.
- Botão CTA integrado para resolver o estado vazio imediatamente (ex.: `+ NOVA TAREFA`).

### 7.2 Helper de Concordância Gramatical (`UIKit.pluralizar()`)

Para evitar anomalias de microcopy como *"1 matérias"* ou *"1 pendente(s)"*, todo contador textual deve passar por `UIKit.pluralizar(qtd, singular, plural)`:
- `UIKit.pluralizar(1, 'matéria', 'matérias')` → `"1 matéria"`
- `UIKit.pluralizar(4, 'matéria', 'matérias')` → `"4 matérias"`
- `UIKit.pluralizar(0, 'matéria', 'matérias')` → `"0 matérias"`

---

## 8. Modais de Referência: Action Bars Compactas

Conforme demonstrado no modal **Editar Tarefa**, o cabeçalho superior direito deve concentrar as ações de atalho da entidade:
1. **Ordem de Ações:**
   - Botão de Foco (`play`)
   - Botão de Adiar/Prazo (`calendar` ou `calendar-plus`)
   - Botão de Abrir Nota Externa (`external-link`)
   - Botão de Exclusão (`trash-2` em tom avermelhado)
   - Divisor vertical fino (`width: 1px; height: 16px; background: rgba(255,255,255,0.12);`)
   - Botão de Fechar (`x`)
2. **Inputs e Formulários:**
   - Inputs com cantos de `4px`, fundo `#121218`, borda sutil `rgba(255, 255, 255, 0.08)`.
   - Foco com anel visível por teclado (`:focus-visible` com `box-shadow: var(--snoopy-focus-ring)`).
