# 0003: Política de Zero Emojis e Padronização Iconográfica com UIKit e Lucide SVG

* **Status:** aceito
* **Data:** 2026-10-31
* **Decisores:** Equipe de Arquitetura, Design e Engenharia do Snoopy Vault
* **Módulos Afetados:** `99_Meta/Snoopy/core/ui_kit.js`, `99_Meta/Snoopy/docs/DESIGN_GUIDELINES.md`, `99_Meta/Snoopy/modulos/`, `99_Meta/Snoopy/subdashboards/`

## 1. Contexto e Declaração do Problema
Historicamente, o vault empregava caracteres Unicode de emojis gráficos dispersos em títulos, botões, modais e mensagens de notificação (alvos, tomates de pomodoro, brilhos, brotos botânicos, engrenagens, lixeiras). Essa prática gerava sérios problemas de consistência e higiene de engenharia de software:
1. **Inconsistência de Plataforma:** A renderização de emojis depende das fontes nativas do sistema operacional (Apple Color Emoji no macOS, Segoe UI Emoji no Windows, Noto Color Emoji no Linux). O mesmo caractere exibia cores, traços e proporções radicalmente distintas para diferentes usuários.
2. **Incompatibilidade Estética:** Glifos de emojis coloridos e brilhantes colidiam com a paleta minimalista de cockpit técnico profundo (`#070709`, `#0d0d12`, acentos discretos e bordas sutis `rgba(255, 255, 255, 0.08)`), conferindo um aspecto amador e infantilizado.
3. **Inflexibilidade CSS:** Caracteres de emoji não respondem adequadamente a propriedades tipográficas como `currentColor`, espessura de traço (`stroke-width`), transições de hover ou filtros monocromáticos de opacidade.
4. **Alinhamento e Geometria:** Emojis introduzem variações imprevisíveis de baseline e padding, prejudicando alinhamentos rigorosos em tabelas, dashboards e KPIs compactos.

## 2. Direcionadores de Decisão (Drivers)
* **Consistência Visual e Identidade Técnica Sóbria:** Conformidade integral com `DESIGN_GUIDELINES.md` v2.2 (estética de alta densidade informacional e elegância monocromática).
* **Controle Total por CSS Tokens:** Cada elemento gráfico deve herdar cores do tema e permitir ajustes responsivos via classes do snippet `05_Snoopy_Theme.css`.
* **Zero Dependências Externas em Runtime:** Nenhuma chamada a CDNs ou download dinâmico de webfonts durante o carregamento de views.
* **Compatibilidade com Tarefas Markdown Legadas (Exceção 2.1):** Preservar suporte determinístico de parsing para metadados de notas dos usuários (como sintaxe legada de data, prioridade e repetição), garantindo que o motor converta esses tokens em ícones vetoriais durante a exibição na interface.

## 3. Opções Consideradas
* **Opção 1:** Manter emojis nativos em conjunto com CSS customizado para forçar escalas de cinza ou filtros.
* **Opção 2:** Importar webfonts de fontes de terceiros (FontAwesome ou Material Symbols) via CSS remoto.
* **Opção 3:** Estabelecer uma política estrita de Zero Emojis na UI e na documentação, centralizando 100% dos vetores em um catálogo canônico de SVG Lucide empacotado no módulo `UIKit` (`core/ui_kit.js`).

## 4. Decisão Escolhida
Escolhida a **Opção 3**, estabelecendo a política de Zero Emojis e a consolidação do `UIKit.ICONS` com 87 ícones canônicos em vetores SVG limpos e otimizados.

A política técnica define:
1. **Proibição Absoluta em UI e Documentação:** Nenhum elemento DOM renderizado (botões, cabeçalhos, títulos de abas, chips, avisos `new Notice()`) e nenhum cabeçalho markdown pode conter caracteres Unicode gráficos de emoji.
2. **Catálogo Canônico Lucide (`UIKit.ICONS`):** O módulo `core/ui_kit.js` disponibiliza 87 ícones SVG embutidos em strings limpas com atributos de acessibilidade, viewBox padronizado `0 0 24 24` e `stroke="currentColor"`.
3. **Helper Centralizado:** A renderização é realizada exclusivamente via `UIKit.icon(name, options)` ou `ctx.uiKit.icon(name, options)`.
4. **Tratamento da Exceção 2.1:** Metadados literais em notas diárias existentes são lidos pelo `task_parser.js` sem corromper o texto da nota, mas a renderização na UI transforma esses marcadores em ícones SVG correspondentes (ex.: o token de data vira o ícone `calendar`).

## 5. Prós e Contras das Opções

### Opção 1: Emojis com Filtros CSS
* Boa, porque não exigiria migração de strings no código.
* Ruim, porque a silhueta gráfica continua variando entre sistemas operacionais e o alinhamento de texto permanece defeituoso.

### Opção 2: Webfonts / CDNs de Terceiros
* Boa, porque possui um acervo enorme de símbolos.
* Ruim, porque quebra o princípio offline-first do Obsidian e introduz latência de rede e dependência externa.

### Opção 3: Catálogo Embutido Lucide SVG no UIKit
* Boa, porque proporciona renderização vetorial cristalina e idêntica em qualquer plataforma e resolução.
* Boa, porque permite herança perfeita de cor via `stroke="currentColor"` e animações CSS limpas.
* Boa, porque opera 100% offline e com validação automatizada em suítes de teste (testes E2E e unitários de conformidade).
* Ruim, porque exigiu migração e auditoria cuidadosa de todos os módulos de interface para eliminar resíduos gráficos.

## 6. Consequências e Trade-offs
* **Impacto Positivo:**
  - Interface madura, profissional, sóbria e consistente.
  - Alinhamento pixel-perfect em todos os componentes (Cockpit, Modais, Kanbans, Booksheets e Tabelas).
  - Testabilidade automatizada: suítes verificam a ausência de emojis literais em regexes de auditoria.
* **Impacto Negativo / Débito Aceito:**
  - Adição de strings SVG embutidas em `ui_kit.js` (gerenciada e deduplicada para manter o arquivo conciso).
* **Ações Mitigatórias:**
  - O catálogo de 87 ícones foi completamente documentado em `DESIGN_GUIDELINES.md` para referência contínua de novos módulos e funcionalidades.
