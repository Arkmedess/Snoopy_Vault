# 0001: Desacoplamento da Loja Central e Criação do ShopStore

* **Status:** aceito
* **Data:** 2026-10-31
* **Decisores:** Equipe de Arquitetura e Engenharia do Snoopy Vault
* **Módulos Afetados:** `99_Meta/Snoopy/core/shop_store.js`, `99_Meta/Snoopy/core/jardim_store.js`, `99_Meta/Snoopy/modulos/shop/shop_modal.js`, `99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js`

## 1. Contexto e Declaração do Problema
Anteriormente, o sistema de economia de foco e compra de itens estava rigidamente acoplado ao Jardim Botânico de Constância (`core/jardim_store.js` e `99_Meta/jardim-constancia.json`). O catálogo de itens permitia apenas árvores botânicas e a gestão de moedas de foco estava restrita à gamificação do jardim. Com a introdução de áudios de foco sintetizados e personalizações cosméticas de interface, tornou-se impraticável manter o Jardim como proprietário da economia geral do cofre. Esse acoplamento violava o Princípio da Responsabilidade Única (SRP) e impedia a expansão autônoma da loja como uma Central de Customizações do ecossistema.

## 2. Direcionadores de Decisão (Drivers)
* **Autonomia Modular:** A Loja deve atuar como uma central autônoma e extensível para qualquer categoria de item (botânica, áudio, temas visuais e cosméticos).
* **Retrocompatibilidade Inegociável:** Código legado e testes existentes que consomem `JardimStore` não podem quebrar nem exigir refatoração imediata em chamadas consumidoras.
* **Integridade Concorrente:** Prevenção determinística de condições de corrida (*race conditions*) em operações assíncronas concorrentes de leitura e escrita do estado persistido em disco.
* **Desacoplamento de UI:** A interface da Loja (`modulos/shop/shop_modal.js`) deve ser aberta sob demanda a partir de múltiplos pontos de entrada (Cockpit Pomodoro, Banner, atalhos).

## 3. Opções Consideradas
* **Opção 1:** Expandir `JardimStore` para incluir áudios e temas cosméticos, mantendo a economia dentro do módulo botânico.
* **Opção 2:** Quebrar a interface legada, removendo `JardimStore` e forçando todos os módulos a migrarem para uma nova API de imediato.
* **Opção 3:** Criar um microsserviço autônomo `ShopStore` com persistência primária em `99_Meta/snoopy-shop.json`, convertendo `JardimStore` em uma Fachada (*Facade Pattern*) retrocompatível que delega 100% de suas operações transacionais para `ShopStore`.

## 4. Decisão Escolhida
Escolhida a **Opção 3**, porque estabelece uma separação arquitetural limpa orientada a domínio (Domain-Driven Design), desacopla a gamificação botânica da infraestrutura econômica do sistema e garante 100% de retrocompatibilidade com a suíte de testes legada através do padrão GoF Facade.

Para garantir atomicidade e evitar sobreposições de escrita em disco, o `ShopStore` implementa:
1. Uma fila de execução assíncrona serializada (*mutex lógico*) atrelada à instância do `app` via `WeakMap`.
2. Um catálogo heterogêneo multi-categoria (`botanica`, `audio`, `tema`).
3. Emissão de eventos reativos via `EventBus` (`economy:balance_updated`, `shop:item_purchased`, `inventory:item_equipped`).
4. Espelhamento retrocompatível para `99_Meta/jardim-constancia.json`, permitindo leitura legada consistente.

## 5. Prós e Contras das Opções

### Opção 1: Sobrecarga do JardimStore
* Boa, porque evita a criação de novos arquivos de persistência.
* Ruim, porque perpetua o acoplamento conceitual; um usuário que compra um sintetizador de som de foco estaria operando regras de negócio dentro de uma classe botânica.

### Opção 2: Quebra e Migração Forçada
* Boa, porque remove a camada de fachada imediatamente.
* Ruim, porque quebra testes e código em produção sem período de transição, aumentando o risco de regressão.

### Opção 3: ShopStore Autônomo com Fachada JardimStore
* Boa, porque atende a todos os requisitos de extensibilidade com zero quebra retroativa.
* Boa, porque encapsula a consistência transacional e o inventário em um único ponto confiável.
* Ruim, porque exige manter temporariamente a camada de delegação em `JardimStore`.

## 6. Consequências e Trade-offs
* **Impacto Positivo:**
  - Código limpo, testável e aderente ao SRP e OCP.
  - Catálogo expansível para novos tipos de recompensas e itens cosméticos.
  - Sincronização em tempo real de saldo e inventário entre diferentes componentes via `EventBus`.
* **Impacto Negativo / Débito Aceito:**
  - Existência de dois arquivos JSON de estado no cofre (`snoopy-shop.json` e o legado `jardim-constancia.json`).
* **Ações Mitigatórias:**
  - O `ShopStore` assume o papel de fonte da verdade (*single source of truth*), mantendo o arquivo legado atualizado apenas para leitura por componentes antigos não migrados.
