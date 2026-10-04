---
title: "Guia do Usuário"
tags:
  - documentacao
  - guia
banner: "99_Meta/Attachments/snoopy_panoramic.jpg"
---

# Guia do Usuário • Snoopy Vault

Bem-vindo ao **Snoopy Vault**, seu ambiente integrado de foco, estudos, gestão de projetos e leituras no Obsidian. Este guia foi elaborado para apoiá-lo no uso diário, apresentando todos os módulos e boas práticas operacionais.

---

## 1. Painel Principal (Home)

Acessível em [[00_Home/Home|00_Home/Home.md]]:
- **Ações Rápidas (Banner):** Pílulas no topo para abrir a nota de hoje, acessar o Framework de Estudos, criar notas no Inbox, projetos ou livros em 1 toque.
- **Cockpit Pomodoro:**
  - Timer circular com modos de **Foco** e **Pausa**.
  - O tempo concluído de foco alimenta automaticamente o seu **Jardim Botânico**, a nota diária e o gráfico semanal de estudos.
  - Ao terminar uma sessão de foco, um modal permite registrar o que foi aprendido e criar flashcards com sintaxe de dois pontos duplos (`Pergunta::Resposta`).
- **Vitrine 50/50 (Estudos & Bookshelf):**
  - **Coluna da Esquerda (Estudos & Ciclo Ativo):** Exibe o tempo de foco do dia (sincronizado com o Pomodoro), questões resolvidas, a Matéria da Vez no Ciclo de Estudos e atalho para o subdashboard completo.
  - **Coluna da Direita (Bookshelf):** Destaque visual do livro em leitura ativa com barra de progresso, páginas restantes e botão para busca online de novos títulos.
- **Kanban de Iniciativas:**
  - Quadro visual com colunas personalizáveis (*Em Andamento*, *Planejamento*, *Concluído*).
  - Suporta alternância de escopo entre *Projetos*, *Estudos* e *Todos*.
  - No mobile e desktop, o botão `⋮` em cada card permite mover status instantaneamente.
- **Hábitos & Central de Tarefas:**
  - Barra de progresso dos hábitos diários da nota de hoje.
  - Abas de tarefas: *Hoje*, *Próximas* e *Todas*.
  - Ao criar uma tarefa, você pode vinculá-la diretamente a um projeto do Kanban ou à nota diária.

---

## 2. Framework de Estudos (Estudei)

Acessível pelo link **ESTUDOS & CICLO ATIVO ↗** na Home ou em [[03_Estudos/Painel de Estudos|03_Estudos/Painel de Estudos.md]].

O módulo opera em 4 abas especializadas:

### Aba 1: Painel de Controle
- **Horas por Disciplina:** Gráfico Donut em SVG nativo exibindo a fatia de tempo líquido dedicada a cada matéria.
- **Tempo de Estudo & Foco (7 Dias):** Gráfico de linha e área SVG mostrando a curva de evolução diária, sincronizado com sessões e Pomodoros dos últimos 7 dias.
- **Cards de Métricas:** Total de Questões, Acertos, Erros, Taxa Geral de Assertividade (%), Horas Líquidas e Matérias Ativas.
- **Tabela Analítica:** Relação detalhada de cada disciplina com barra de assertividade colorida e botão de acesso direto.

### Aba 2: Meu Planner
- Cronograma semanal (Domingo a Sábado) distribuindo blocos agendados de estudo.
- Use o botão **+ AGENDAR BLOCO** para definir a data, matéria, duração estimada e modalidade (*Teoria*, *Questões*, *Revisão*).

### Aba 3: Revisões Espaçadas
- Curva de esquecimento baseada em repetição espaçada:
  - Abas: *Programadas*, *Atrasadas* e *Concluídas*.
  - Ao clicar em **✓ Marcar Revisado**, o sistema avança automaticamente o intervalo de repetição (1 dia ➔ 7 dias ➔ 14 dias ➔ 30 dias).

### Aba 4: Ciclo de Estudos
- Método de estudo contínuo onde você avança matéria por matéria.
- Exibe a *Matéria da Vez*, permitindo registrar foco, abrir a anotação ou clicar em **✓ Concluir & Avançar** para passar à próxima disciplina do ciclo.

---

## 3. Bookshelf (Estante de Leituras)

Acessível pelo link **BOOKSHELF ↗** na Home ou em [[04_Leituras/Painel de Leituras|04_Leituras/Painel de Leituras.md]].

Inspirado na interface do Bookshelf do KOReader:
- **Hero Card:** O livro em leitura ativa ganha destaque editorial no topo com capa 3D, perspectiva, sinopse, percentual de progresso e estimativa de horas restantes para conclusão.
- **Navegação E-Reader:**
  - `HOME (Todos)`: Visão geral de todos os livros cadastrados.
  - `RECENT (Lendo)`: Livros que estão atualmente em andamento.
  - `QUERO LER`: Fila de próximas leituras.
  - `FAVOURITES (Lidos)`: Obras concluídas com marcador especial de fita verde (*ribbon*).
- **Busca na Nuvem via API:**
  - Clique em **+ BUSCAR NA NUVEM**.
  - Digite o título ou autor para consultar em tempo real a Open Library.
  - Com 1 clique em **Salvar +**, o livro é criado em `04_Leituras/Livros/` com capa de alta resolução, total de páginas e metadados oficiais, sem dependências de pacotes locais.
- **Atualização Rápida de Páginas:**
  - No Hero Card, clique em **Atualizar Página** para registrar o progresso de leitura. Ao atingir o total de páginas, o livro é automaticamente promovido para *Lido*.

---

## 4. Estrutura de Pastas e Mocks Oficiais

O cofre foi configurado de forma limpa, mantendo exatamente **um mock completo de exemplo por módulo**:

| Pasta | Mock Oficial de Exemplo | Função |
| :--- | :--- | :--- |
| `00_Home/` | `Home.md` | Painel central do cofre. |
| `01_Inbox/Diário/` | `2026-10-04.md` | Nota diária modelo com hábitos, pomodoros e tarefas. |
| `02_Projetos/` | `Exemplo - Estruturar Meu Vault.md` | Projeto modelo com objetivos e tarefas no Kanban. |
| `03_Estudos/` | `Exemplo - Arquitetura de Software.md` | Disciplina modelo com flashcards, tempo de foco e questões. |
| `04_Leituras/Livros/` | `Exemplo - Hábitos Atômicos - James Clear.md` | Livro modelo com capa, sinopse e status "Lendo". |
| `99_Meta/` | `ciclo-estudos.json` | Base de persistência histórica do ciclo e planner. |

---

## 5. Boas Práticas e Sincronização Mobile

- **Economia de Recursos:** Todos os gráficos do sistema (Donut, Linha SVG, Anel do Pomodoro) foram desenhados em SVG nativo puro, consumindo zero conexões de backend e poupando bateria e memória RAM tanto no computador quanto no celular.
- **Sincronização via Obsidian Git:** Todas as modificações são salvas em arquivos locais de texto (`.md` e `.json`), garantindo sincronização sem conflitos entre Desktop e Mobile via GitHub.

---

[[00_Home/Home|← Voltar ao Painel Central]]
