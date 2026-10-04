---
dashboard: true
banner:
  quote: ""
  author: ""
  image: "99_Meta/Attachments/snoopy_reading_banner.png"
  imagePos:
    "99_Meta/Attachments/snoopy_reading_banner.png": "82,78"
quickActions:
  - name: "Projetos"
    icon: "file-text"
    type: file
    target: "02_Projetos"
  - name: "Estudos"
    icon: "file-text"
    type: file
    target: "03_Estudos"
  - name: "Leituras"
    icon: "file-text"
    type: file
    target: "04_Leituras"
  - name: "Inbox"
    icon: "file-text"
    type: file
    target: "01_Inbox"
columns:
  - name: Projetos
    color: "#52525b"
    type: projects
    library:
      viewMode: kanban
      sortBy: "modified"
      sortDesc: true
      folders:
        - "02_Projetos"
      templatePaths:
        - "99_Meta/Templates/Template - Projeto.md"
      templatePath: "99_Meta/Templates/Template - Projeto.md"
      kanbanGroupBy: "status"
      kanbanShowCovers: true
  - name: Estudos
    color: "#71717a"
    type: projects
    library:
      viewMode: grid
      sortBy: "modified"
      sortDesc: true
      folders:
        - "03_Estudos"
      templatePaths:
        - "99_Meta/Templates/Template - Estudo.md"
      templatePath: "99_Meta/Templates/Template - Estudo.md"
  - name: Leituras
    color: "#a1a1aa"
    type: projects
    library:
      viewMode: gallery
      sortBy: "modified"
      sortDesc: true
      folders:
        - "04_Leituras/Livros"
      templatePaths:
        - "99_Meta/Templates/Template - Livro.md"
      templatePath: "99_Meta/Templates/Template - Livro.md"
  - name: Tarefas
    color: "#e4e4e7"
    type: projects
  - name: Notas
    color: "#71717a"
    type: memo
---

## Projetos

## Estudos

## Leituras

## Tarefas

## Notas

### Foco & Produtividade
id: card-3pai9m
type: generic
Visão macro consolidada. Use os cards acima para gerenciar matérias, projetos e livros.
