---
title: "Guia do Usuário"
tags:
  - documentacao
  - guia
banner: "99_Meta/Attachments/snoopy_panoramic.jpg"
---

# Guia do Usuário • Snoopy Vault

Bem-vindo ao **Snoopy Vault**, seu ambiente integrado de foco, estudos, gestão de projetos e leituras no Obsidian. Este guia apresenta a operação completa dos módulos e boas práticas de uso.

---

## 1. Painel Principal (Home)

Acessível em [[00_Home/Home|00_Home/Home.md]]:
- **Ações Rápidas (Banner):** Pílulas no topo para abrir a nota de hoje, acessar o Framework de Estudos, criar notas no Inbox, projetos ou livros em 1 toque.
- **Cockpit Pomodoro:**
  - Timer circular com modos de **Foco** e **Pausa**.
  - **🎯 Foco Ativo da Tarefa:** Ao clicar em `▶ Foco` em qualquer tarefa da Central de Tarefas, ela é assumida no Cockpit com um banner exclusivo, permitindo focar 25 minutos especificamente naquela entrega e concluí-la em 1 clique ao final.
  - O tempo concluído de foco alimenta automaticamente o seu **Jardim Botânico**, a nota diária e o gráfico semanal de estudos reais.
  - Ao término de uma sessão, um modal permite registrar o aprendizado e criar flashcards (`Pergunta::Resposta`) na nota diária.
- **Vitrine 50/50 (Estudos & Bookshelf):**
  - **Coluna da Esquerda (Estudos & Ciclo Ativo):** Exibe o tempo de foco real do dia, questões resolvidas, a Matéria da Vez no Ciclo de Estudos e link direto ao framework analítico.
  - **Coluna da Direita (Bookshelf):** Destaque visual do livro em leitura ativa com barra de progresso, páginas restantes e botão para busca online de novos títulos.
- **Kanban de Iniciativas:**
  - Quadro visual com colunas personalizáveis (*Em Andamento*, *Planejamento*, *Concluído*).
  - Alternância rápida de escopo entre *Projetos*, *Estudos* e *Todos*.
  - Controle tátil no mobile e desktop via botão `⋮` e exibição limpa de prazos no padrão `DD/MM/AAAA`.
- **Hábitos & Central de Tarefas (Mini-Framework de Execução):**
  - Barra de progresso dos hábitos diários da nota de hoje.
  - **+ TAREFA:** Popup amigável com chips rápidos de 1 toque para Prazos (*Hoje*, *Amanhã*, *Esta Semana*), Prioridade (*Alta ⏫*, *Média 🔼*, *Baixa 🔽*) e Estimativa de Pomodoros (*🍅 1*, *🍅 2*, etc.).
  - **Abas Inteligentes:** `🔥 HOJE & ATRASADAS`, `📋 ESTA SEMANA`, `📥 TODAS` e `✓ CONCLUÍDAS HOJE` (feed de entregas do dia).
  - **Ações na Tarefa:** Botão `▶ Foco` para carregar direto no timer do Pomodoro e menu `⋮` para adiar prazo ou alterar prioridade sem abrir o arquivo Markdown.

---

## 2. Framework de Estudos

Acessível pelo link **ESTUDOS & CICLO ATIVO ↗** na Home ou em [[03_Estudos/Painel de Estudos|03_Estudos/Painel de Estudos.md]].

### A. Modelo Mental Unificado (Matéria & Área)
- **Matéria:** É o conteúdo ou disciplina que você estuda (ex: *Física Mecânica*, *Direito Constitucional*, *Algoritmos*).
- **Área:** É o grande grupo de foco (ex: *Programação*, *ENEM*, *Vestibular*, *Concurso*, *Faculdade*, *Economia*).
- **+ NOVA MATÉRIA:** Botão no cabeçalho com popup intuitivo de 1 toque:
  - Nome da Matéria
  - Chips rápidos de Área (`Programação`, `ENEM`, `Concurso`, `Vestibular`, `Economia`, etc.)
  - Provas & PDFs Vinculados (`[[provas/ENEM_2024.pdf]]`)
  - Checkbox para já incluir a matéria na fila rotativa do Ciclo.
- **Menu Contextual (⋮):** Na tabela analítica, clique no botão `⋮` para abrir o popup de edição rápida, alterando área, anexos de PDFs, minutos de foco e questões sem precisar editar o frontmatter manualmente.

### B. Ciclo de Estudos Desmistificado
Ao contrário de uma grade rígida com horários semanais fixos (que quebra se você faltar um dia), o Ciclo é uma **esteira contínua**:
1. **Matéria da Vez:** Você estuda apenas a matéria em destaque no card principal (clique em `▶ Iniciar Foco`).
2. **Registrar Estudo:** Tempo e questões alimentam seu histórico real e geram agendamento de repetição espaçada automática (1d, 7d, 30d).
3. **Concluir & Avançar:** A fila roda para a próxima matéria da sequência.
- **⚙ Organizar Fila do Ciclo:** Botão para escolher quais matérias rodam na fila e definir a ordem exata de estudo usando os botões `▲ Subir` e `▼ Descer`.

### C. Abas Especializadas
1. **PAINEL DE CONTROLE:**
   - **Horas por Matéria (Real):** Gráfico Donut SVG proporcional ao tempo líquido real de cada matéria.
   - **Tempo de Estudo & Foco (7 Dias Real):** Curva SVG mostrando o tempo real diário acumulado via Pomodoro e sessões.
   - **6 Cards de KPIs Limpos:** *Tempo de Foco*, *Questões*, *Acertos*, *Erros*, *Assertividade (%)* e *Matérias*.
   - **Radar Integrado:** Matéria da Vez e Revisões de Hoje diretamente no painel.
   - **Tabela de Matérias & Simulados:** Alinhamento perfeito, chips de PDFs clicáveis e menu contextual `⋮`.
2. **MEU PLANNER:**
   - Calendário Mensal Completo (7 colunas alinhadas: Dom a Sáb).
   - Clique em qualquer dia para agendar blocos ou nos blocos para gerenciá-los.
3. **REVISÕES ESPAÇADAS:**
   - Abas *Programadas*, *Atrasadas* e *Concluídas*, com curva de esquecimento (1d ➔ 7d ➔ 14d ➔ 30d).
4. **CICLO DE ESTUDOS:**
   - Card didático explicativo, Matéria da Vez com opções de `Iniciar Foco`, `Pular Matéria ↷`, `Concluir & Próxima →` e organização visual da fila.

---

## 3. Bookshelf (Estante de Leituras)

Acessível pelo link **BOOKSHELF ↗** na Home ou em [[04_Leituras/Painel de Leituras|04_Leituras/Painel de Leituras.md]].

- **Hero Card 3D:** Destaque do livro em leitura ativa no topo com capa proporcional, sinopse editorial, barra de progresso e páginas/horas restantes.
- **Abas E-Reader:** Filtros rápidos entre `HOME (Todos)`, `RECENT (Lendo)`, `QUERO LER` e `FAVOURITES (Lidos)`.
- **The Shelf Grid:** Grade de capas com marcadores de fita (*ribbons*) e barras embutidas.
- **Busca na Nuvem via API:** Consulta em tempo real à Open Library API para cadastrar novos livros com capa oficial e metadados instantaneamente.

---

## 4. Estrutura de Pastas e Mocks Oficiais

O cofre mantém estritamente **um mock oficial e completo por módulo**:

| Pasta | Mock Oficial | Função |
| :--- | :--- | :--- |
| `00_Home/` | `Home.md` | Painel central do cofre. |
| `01_Inbox/Diário/` | `2026-10-04.md` | Nota diária com hábitos, pomodoros e tarefas. |
| `02_Projetos/` | `Exemplo - Estruturar Meu Vault.md` | Projeto com objetivos e tarefas no Kanban. |
| `03_Estudos/` | `Exemplo - Arquitetura de Software.md` | Disciplina na área de Programação com flashcards e status real. |
| `04_Leituras/Livros/` | `Exemplo - Hábitos Atômicos - James Clear.md` | Livro com capa, sinopse e status "Lendo". |
| `99_Meta/` | `ciclo-estudos.json` | Base de persistência histórica do ciclo e planner. |

---

[[00_Home/Home|← Voltar ao Painel Central]]
