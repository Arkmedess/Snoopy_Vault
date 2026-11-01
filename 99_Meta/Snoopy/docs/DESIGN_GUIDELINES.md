# Guia de Estilo & Diretrizes de Design do Snoopy Vault
**Versão:** 2.2  
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
5. **Centralização Estrita de Tokens:** Nenhuma propriedade de tipografia, espaçamento ou cor pode ser escrita inline em código JavaScript. Todo estilo deve derivar exclusivamente das variáveis CSS do snippet `05_Snoopy_Theme.css` e das classes semânticas utilitárias.

---

## 2. Política Estrita de Zero Emojis na Interface

Para garantir um ambiente de alta concentração, profissionalismo e estética sóbria, vigora a seguinte regra inegociável:

1. **Proibição Absoluta de Emojis em Elementos de Interface:**
   - É expressamente proibido o uso de caracteres de emoji gráficos (ex.: alvos, foguetes, lupas, lixeiras, engrenagens, brilhos, sol, lua, marcas de check/x, calendários, raios, escudos, retrocesso) em botões, títulos de seções, cartões, abas, diálogos modais, cabeçalhos, barras de ferramentas e mensagens `new Notice()`.
   - Elementos visuais de status, ação ou identificação devem ser representados exclusivamente pelo **catálogo de ícones vetoriais SVG (Lucide)**.
2. **Exceção Estrita e Controlada (Exceção 2.1):**
   - Emojis só são permitidos quando fizerem parte da sintaxe de metadados em texto markdown de plugins legados de terceiros no corpo de notas (ex.: sintaxe legada de data, prioridade e repetição no padrão do plugin Obsidian Tasks). Mesmo nesses casos, quando parseados pelo motor DataviewJS, devem ser exibidos na UI através de ícones vetoriais correspondentes.

### 2.1 Tabela Canônica de De/Para (Substituição de Emojis por Ícones SVG)

| Conceito / Intenção | Emoji Obsoleto (Codepoint) | Ícone SVG Lucide Canônico | Caso de Uso na Interface |
| :--- | :---: | :--- | :--- |
| **Data / Calendário / Prazo** | `U+1F4C5` (Calendário) | `calendar` | Datas de entrega, agendamento de tarefas e notas diárias. |
| **Meta / Alvo Quantitativo** | `U+1F3AF` (Alvo) | `target` | Objetivos de estudo, metas de páginas e limites numéricos. |
| **Modo Foco / Energia** | `U+26A1` (Raio) | `zap` | Disparo do Modo Foco imersivo em tela cheia. |
| **Excluir / Descartar** | `U+1F5D1` (Lixeira) | `trash-2` | Ação destrutiva no menu contextual e remoção de tarefas/notas. |
| **Configurações / Sistema** | `U+2699` (Engrenagem) | `settings` | Subdashboard de manutenção, parâmetros e integrações. |
| **Pesquisa / Busca** | `U+1F50D` (Lupa) | `search` | Campo de filtro de templates e busca de anotações. |
| **Ações / Mocks / Demonstração** | `U+2728` (Brilhos) | `sparkles` | Criação de dados de demonstração ou geração assistida. |
| **Manhã** | `U+1F305` (Nascer do Sol) | `sunrise` | Aba e filtro de tarefas programadas para a manhã. |
| **Tarde** | `U+2600` (Sol) | `sun` | Aba e filtro de tarefas programadas para a tarde. |
| **Noite** | `U+1F319` (Lua) | `moon` | Aba e filtro de tarefas programadas para a noite. |
| **Rotina / Hábitos Diários** | `U+1F501` (Repetir) | `repeat` | Rastreador de hábitos com recorrência cíclica. |
| **Segurança / Backup / Zonas** | `U+1F6E1` (Escudo) | `shield` | Mecanismo de proteção de dados e rollback do atualizador. |
| **Rollback / Desfazer** | `U+23EA` (Rebobinar) | `undo-2` | Restauração atômica de versão anterior do cofre. |
| **Sincronizar / Atualizar** | `U+1F504` (Atualizar) | `refresh-cw` | Verificação de novas versões do motor no GitHub. |
| **Concluído / Sucesso** | `U+2705` / `U+2713` (Check) | `check` / `check-circle` | Marcação de tarefa finalizada ou hábito cumprido. |
| **Fechar / Cancelar** | `U+274C` / `U+2715` (Fechar) | `x` | Botão de encerramento de modais e cancelamento. |
| **Atenção / Atraso** | `U+26A0` (Alerta) | `alert-circle` | Sinalização de tarefa vencida ou erro operacional. |
| **Leitura / Livro** | `U+1F4DA` / `U+1F4D6` (Livros) | `book` / `book-open` / `library` | Estante Koreader e vitrine de leituras ativas. |
| **Estudos / Aprendizado** | `U+1F393` (Capelo) | `graduation-cap` | Módulo de ciclo de estudos e planejamento acadêmico. |
| **Ideia / Insight** | `U+1F4A1` (Lâmpada) | `lightbulb` | Notas conceituais e sínteses de aprendizagem. |
| **Métricas / Unidades** | `U+1F4CF` (Régua) | `ruler` | Configuração de unidade de medida (páginas, minutos, blocos). |

---

## 3. Sistema de Design Iconográfico (Lucide SVG Nativo)

Todos os ícones da interface derivam do catálogo de vetores SVG puros, embutidos diretamente no microsserviço [`UIKit`](../core/ui_kit.js) e consumíveis via `ctx.renderIcon()` ou `UIKit.renderIcon()`.

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

### 3.3 Catálogo Canônico Completo de 87 Ícones (`UIKit.ICONS`)

| Chave do Ícone | Categoria Semântica | Descrição & Caso de Uso |
| :--- | :--- | :--- |
| `calendar` | Tempo & Navegação | Representação de datas, notas diárias e prazos. |
| `calendar-plus` | Tempo & Ação | Adiar prazo (+1 dia) no editor contextual. |
| `clock` | Tempo | Indicador de estimativa temporal e duração de tarefas. |
| `timer` | Tempo & Pomodoro | Dial do temporizador Pomodoro e contagem regressiva. |
| `play` | Execução | Iniciar contagem de foco Pomodoro ou reprodução sonora. |
| `pause` | Execução | Pausar temporariamente o timer ou áudio ativo. |
| `rotate-ccw` | Execução | Resetar ciclo de foco para o tempo inicial. |
| `zap` | Foco & Energia | Ativar o Modo Foco imersivo em tela cheia. |
| `target` | Metas | Alvo numérico de execução quantitativa e objetivos. |
| `skip-forward` | Fluxo | Pular matéria no ciclo contínuo ou avançar etapa. |
| `skip-back` | Fluxo | Retornar etapa anterior em fluxos guiados. |
| `volume-2` | Áudio & Som | Volume alto do motor procedural de foco. |
| `volume-1` | Áudio & Som | Volume moderado do motor de som. |
| `volume-x` | Áudio & Som | Áudio mutado no cockpit e controles sonoros. |
| `music` | Áudio & Som | Faixas musicais sintetizadas e áudios de foco. |
| `headphones` | Áudio & Som | Modo imersivo neuroacústico e batimentos binaurais. |
| `list-music` | Áudio & Som | Seletor e playlist de faixas de foco disponíveis. |
| `coins` | Economia & Loja | Saldo de moedas de foco acumuladas. |
| `shopping-bag` | Economia & Loja | Central de Customizações & Loja Autônoma. |
| `sprout` | Flora & Gamificação | Estágio inicial de broto no Jardim de Constância. |
| `trees` | Flora & Gamificação | Estágio avançado de floresta botânica acumulada. |
| `tree-pine` | Flora & Gamificação | Espécie Pinheiro Alpino na loja e jardim. |
| `flower-2` | Flora & Gamificação | Espécie Cerejeira Sakura e flores botânicas. |
| `leaf` | Flora & Gamificação | Elemento botânico natural e indicador ecológico. |
| `check-square` | Gamificação | Conquista de hábito ou tarefa concluída. |
| `award` | Gamificação | Selos de consistência e marcos atingidos. |
| `sparkles` | Sistema & Mocks | Ações assistidas, novos itens e geração de mocks. |
| `list-checks` | Tarefas | Central de tarefas e checklist de execução diária. |
| `list` | Tarefas & Listas | Visualização de itens e listagens gerais. |
| `list-plus` | Tarefas & Listas | Criação rápida de item ou tarefa na lista. |
| `repeat` | Hábitos | Rotina recorrente cíclica e rastreador de hábitos. |
| `check` | Validação | Conclusão rápida de item em lista ou modal. |
| `check-circle` | Validação | Status de projeto concluído ou meta batida. |
| `plus` | Operação | Criação de novo projeto, tarefa ou hábito. |
| `plus-circle` | Operação | Ação aditiva em formulários e cards modais. |
| `minus` | Operação | Decremento de valor numérico ou minimização. |
| `pencil` | Edição | Abertura do editor contextual de tarefa ou nota. |
| `trash-2` | Destrutivo | Exclusão de card no Kanban ou remoção de item. |
| `x` | Fechamento | Fechar modal, limpar filtro ou descartar janela. |
| `more-vertical` | Ação Contextual | Menu de três pontinhos (⋮) sempre visível. |
| `grip-vertical` | Interação | Alça tátil de arrasto para reordenação drag & drop. |
| `graduation-cap` | Conhecimento | Subdashboard e módulo de Estudos. |
| `library` | Leituras | Módulo Estante de Livros e catálogo de volumes. |
| `book` | Leituras | Volume literário individual no Bookshelf. |
| `book-open` | Leituras | Leitura em andamento e notas de capítulo. |
| `book-plus` | Leituras | Cadastrar novo livro na estante KOReader. |
| `brain` | Aprendizado | Planejamento cognitivo e revisões espaçadas. |
| `microscope` | Análise | Investigação detalhada e revisões profundas. |
| `lightbulb` | Ideias | Captura de notas e conceitos no Inbox. |
| `bar-chart-3` | Métricas | Indicadores de desempenho e gráficos de assertividade. |
| `percent` | Métricas | Taxa percentual de conclusão e acertos. |
| `star` | Avaliação | Classificação por estrela cheia de volumes lidos. |
| `star-half` | Avaliação | Classificação por meia estrela de livros. |
| `inbox` | Navegação | Captura rápida e caixa de entrada de notas. |
| `folder-plus` | Estrutura | Criação de nova pasta ou projeto estruturado. |
| `file-text` | Documentação | Origem de nota diária ou vínculo de arquivo. |
| `file-x` | Arquivo | Exclusão física ou descarte de nota do cofre. |
| `bookmark` | Marcação | Fixação de item prioritário ou favorito. |
| `layout` | Layout | Disposição estrutural de painéis do dashboard. |
| `layers` | Layout | Camadas visuais e fatias modulares do sistema. |
| `columns` | Layout | Visualização em colunas paralelas e grades. |
| `kanban` | Estrutura | Quadro Kanban de fluxo de projetos e iniciativas. |
| `trello` | Estrutura | Variante de representação de cartões em colunas. |
| `settings` | Sistema | Subdashboard de manutenção, parâmetros e atualizações. |
| `search` | Filtro & Busca | Consulta textual instantânea em listas e templates. |
| `filter` | Filtro & Busca | Alternância de critérios de visualização em painéis. |
| `external-link` | Navegação | Atalho para abrir a nota Markdown nativa no Obsidian. |
| `arrow-up` | Navegação | Indicador de subida ou prioridade alta. |
| `arrow-up-right` | Navegação | Salto para subdashboard (substitui o glifo de seta diagonal `U+2197`). |
| `arrow-left` | Navegação | Retorno de navegação e página anterior. |
| `arrow-right` | Navegação | Avanço de navegação e próxima página. |
| `chevron-left` | Navegação | Controle de paginação e paginação para a esquerda. |
| `chevron-right` | Navegação | Controle de paginação e paginação para a direita. |
| `circle-dot` | Status | Marcador de estado pontual ou indicador de foco. |
| `refresh-cw` | Sistema | Verificação e sincronização de dados do cofre. |
| `undo-2` | Sistema | Reversão atômica de atualização (Rollback). |
| `shield` | Sistema | Segurança arquitetural de 3 zonas e proteção de dados. |
| `alert-circle` | Status | Alerta de item em atraso ou falha operacional. |
| `database` | Sistema | Manutenção e limpeza de mocks de demonstração. |
| `ruler` | Metrologia | Unidades de medida quantitativa configuráveis. |
| `code-2` | Engenharia | Tarefas técnicas de desenvolvimento de software. |
| `sliders` | Configuração | Controles deslizantes e preferências avançadas. |
| `maximize-2` | Janela | Expansão para tela cheia e modo estendido. |
| `info` | Ajuda | Blocos orientadores e estados vazios com dicas operacionais. |
| `sunrise` | Período | Período matutino no Daily Tracker (Manhã). |
| `sun` | Período | Período vespertino no Daily Tracker (Tarde). |
| `moon` | Período | Período noturno no Daily Tracker (Noite). |

---

## 4. Tipografia Global, Fontes Embutidas e Tokens CSS

A tipografia do cofre foi projetada em **três camadas de resiliência**, garantindo independência completa de conexão com a internet e consistência em qualquer sistema operacional:

1. **Camada 1 (Proprietária):** Caso instalada no sistema operacional, a fonte `"Anthropic Sans"` é assumida no topo da pilha.
2. **Camada 2 (Embutida Offline-First):** O snippet `00_Snoopy_Fonts.css` embute em formato WOFF2 base64 as famílias `Snoopy Inter` (UI), `Snoopy Mono` (dados e códigos) e `Snoopy Display` (serif editorial para a data do banner).
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

Para erradicar a mistura de idiomas e eliminar títulos genéricos, os módulos do dashboard adotam títulos concisos em português e anatomia em duas linhas:

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
| **CENTRAL DE CUSTOMIZAÇÕES & LOJA** | `shopping-bag` | *Personalize seu ambiente, espécies botânicas e áudio de foco* | Módulo autônomo de personalização e economia |

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

---

## 9. Componentes de Áudio Procedural e Central de Customizações (Loja)

### 9.1 Dock de Áudio do Cockpit Pomodoro (`.snoopy-audio-dock`)
Disposto diretamente no Cockpit Pomodoro para gerenciamento da sintetização sonora procedural em tempo real:
- **Container (`.snoopy-audio-dock`):** Alinhamento flexbox horizontal, background `#0d0d12`, borda `1px solid rgba(255, 255, 255, 0.08)`, border-radius de `6px`, padding compacto de `6px 10px`.
- **Seletor de Faixa (`.snoopy-audio-track-selector`):** Menu dropdown limpo, sem contorno invasivo, fonte mono `11px`, background `#121218` e texto `--snoopy-text-dim`.
- **Controles de Volume & Mudo (`.snoopy-audio-vol-txt`, `.snoopy-btn-icon`):** Ícones `volume-2`, `volume-1`, `volume-x` dinâmicos com slider sem folga lateral.
- **Sincronização com Timer (`.snoopy-audio-sync-label`):** Checkbox integrado com tipografia micro para alternância de `autoSync` (iniciar e pausar áudio junto com o timer).
- **Botão de Acesso à Loja (`.snoopy-audio-shop-btn`):** Atalho compacto com ícone `shopping-bag` para abrir a Central de Customizações.

### 9.2 Central de Customizações & Loja Autônoma (`.snoopy-shop-*`)
Interface modal e vitrine multi-categoria de economia e customizações visuais/acústicas:
- **Linha de Indicadores (`.snoopy-shop-kpi-row`):** Grid responsivo exibindo cards `.snoopy-kpi-card`:
  - `.is-balance`: Exibe o saldo atual de moedas com ícone `coins` e destaque em verde menta (`#86efac`).
  - `.is-unlocked`: Contador de itens adquiridos e inventário total.
  - `.is-catalog`: Total de espécies, faixas e temas disponíveis no cofre.
- **Grade da Loja (`.snoopy-shop-grid-wrap`, `.snoopy-shop-grid`):** Layout em grade CSS (`grid-template-columns: repeat(auto-fill, minmax(220px, 1fr))`) com espaçamento de `12px`.
- **Cartões de Item (`.snoopy-shop-card`):** Fundo `#0d0d12`, borda `rgba(255, 255, 255, 0.08)` e cantos arredondados de `8px`. Variantes semânticas de estado:
  - `.is-equipped`: Borda acentuada em verde menta (`rgba(134, 239, 172, 0.35)`), background `#101814` e badge `.snoopy-shop-badge-equipped`.
  - `.is-unlocked`: Item no inventário pronto para ser equipado (botão "Equipar").
  - `.is-affordable`: Item bloqueado com saldo suficiente para compra.
  - `.is-locked`: Item bloqueado com saldo insuficiente (botão desabilitado).
- **Badges e Preços (`.snoopy-shop-price`, `.snoopy-shop-category-tag`):** Tipografia mono compacta de 11px em tom dourado/âmbar para moedas e tags sutis de categoria.
