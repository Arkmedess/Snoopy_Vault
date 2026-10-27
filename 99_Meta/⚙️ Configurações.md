---
tempo_foco: 25
tempo_pausa_curta: 5
tempo_pausa_longa: 15
meta_ciclos_diarios: 4
banner_imagem: "99_Meta/Attachments/snoopy_panoramic.jpg"
tema_preset: "snoopy"
modulos_ativos:
  - snoopy_banner_cabecalho
  - snoopy_cockpit_pomodoro
  - snoopy_daily_tracker
  - snoopy_leituras_estudos
  - snoopy_planner_calendario
---

# ⚙️ Configurações do Snoopy Vault

```dataviewjs
await dv.view("99_Meta/Snoopy/subdashboards/configuracoes");
```

---

Bem-vindo ao painel de configurações da sua área de trabalho! 
Todas as opções podem ser configuradas no painel **Propriedades** (na barra lateral ou no cabeçalho desta nota) de forma simples e intuitiva, sem necessidade de tocar em código.

---

### 🍅 Parâmetros de Produtividade & Foco
- **`tempo_foco`**: Duração da sessão de foco Pomodoro em minutos (padrão: `25`).
- **`tempo_pausa_curta`**: Duração da pausa curta após cada ciclo em minutos (padrão: `5`).
- **`tempo_pausa_longa`**: Duração do descanso longo após 4 ciclos em minutos (padrão: `15`).
- **`meta_ciclos_diarios`**: Meta de sessões de foco por dia para o crescimento completo da sua árvore no Jardim (padrão: `4`).

---

### 🎨 Personalização Visual
- **`banner_imagem`**: Imagem exibida no topo do painel principal (padrão: `99_Meta/Attachments/snoopy_panoramic.jpg`).
- **`tema_preset`**: Preset de estilo visual aplicado (opções: `snoopy`, `snoopy_classico`, `lavanda`, `floresta`).

---

### 🧩 Módulos do Dashboard (Liga / Desliga)
Remova ou adicione itens na lista **`modulos_ativos`** para escolher quais blocos aparecem na sua tela inicial:
- `snoopy_banner_cabecalho`: Banner panorâmico e botões rápidos de criação.
- `snoopy_cockpit_pomodoro`: Temporizador circular, métricas dinâmicas, histórico de 30 dias e Jardim Botânico.
- `snoopy_kanban_projetos`: Quadro Kanban interativo com drag & drop e tarefas.
- `snoopy_daily_tracker`: Daily Tracker com hábitos do dia e tarefas prioritárias do vault.
- `snoopy_leituras_estudos`: Estante de livros com leitura ativa e cards de matérias.
- `snoopy_planner_calendario`: Planner & Calendário Mensal integrado com blocos de estudo, tarefas e revisões.
- `snoopy_kanban_projetos`: Quadro Kanban interativo com drag & drop e tarefas (opcional).

---

[[00_Home/Home|← Voltar ao Painel Principal]]
