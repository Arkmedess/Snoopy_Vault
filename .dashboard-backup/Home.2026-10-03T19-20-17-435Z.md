---
dashboard: true
banner:
  quote: "A coragem não precisa ser lembrada, pois ela jamais é esquecida."
  author: "Princesa Zelda — Breath of the Wild"
  image: "99_Meta/Attachments/zelda_botw_wallpaper.jpg"
quickActions:
  - name: "🗡️ Missões (Projetos)"
    icon: "file-text"
    type: file
    target: "02_Projetos"
  - name: "📜 Santuários (Estudos)"
    icon: "file-text"
    type: file
    target: "03_Estudos"
  - name: "📖 Compêndio (Leituras)"
    icon: "file-text"
    type: file
    target: "04_Leituras"
  - name: "🧭 Sheikah Slate (Inbox)"
    icon: "file-text"
    type: file
    target: "01_Inbox"
columns:
  - name: 📜 Sheikah Notes
    color: "#0ea5e9"
    type: memo
  - name: 🎯 Missões do Dia
    color: "#eab308"
    type: projects
    height: 160
  - name: 🗡️ Projetos Ativos
    color: "#10b981"
    type: projects
    library:
      viewMode: kanban
      sortBy: "modified"
      sortDesc: true
      folders:
        - "02_Projetos"
      kanbanGroupBy: "status"
      kanbanShowCovers: true
  - name: 📚 Santuários de Estudo
    color: "#6366f1"
    type: projects
    library:
      viewMode: grid
      sortBy: "modified"
      sortDesc: true
      folders:
        - "03_Estudos"
---

## 📜 Sheikah Notes

### 🗡️ Registro de Aventura
id: card-1kxk5q
type: generic
Use este espaço para registrar pensamentos imediatos, links rápidos e anotações de estudo sem precisar sair do painel central.
Suporta conexões diretas como [[02_Projetos/Exemplo - Estruturar Meu Vault|Missão Atual]] e notas de matérias.

### 💡 Lembrete de Herói
id: card-6nc8yf
type: generic
Pequenos blocos consistentes de estudo (Pomodoro) geram um progresso massivo ao longo das semanas.

## 🎯 Missões do Dia

## 🗡️ Projetos Ativos

## 📚 Santuários de Estudo
