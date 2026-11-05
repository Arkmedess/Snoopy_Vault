# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

---

## [0.9.2] - 2026-11-04

### Adicionado
- **Arrasto Fluido no Kanban da Central de Tarefas:** Implementação nativa de HTML5 Drag and Drop entre colunas (*A Fazer*, *Hoje / Em Andamento*, *Concluído*) com atualização otimista imediata do DOM e ordenação canônica sem saltos.
- **Anti-Jump Gate na Dashboard Home:** Rastreamento contínuo de scroll do workspace ativo do Obsidian e estabilização de altura (`minHeight`) para impedir colapso de página e salto involuntário para o topo durante re-renderizações.
- **Alinhamento Esticado & Scroll Vertical no Planner Mensal:** Calibração com `align-items: stretch` nivelando perfeitamente a grade do calendário e o painel lateral de *Próximos Blocos*, com rolagem vertical independente e truncamento elíptico de títulos longos.

### Modificado & Corrigido
- **Normalização de Loudness em Sons do Pomodoro:** Calibração empírica dos ruídos de foco (*Brown Noise*, *Forest Quiet*) em -16 LUFS, evitando disparidades sonoras ao soar o alarme de encerramento do ciclo.
- **Refinamento Visual Minimalista no Jardim da Constância:** Remoção de áreas vazias, agrupamento da célula vegetal no topo do cartão da planta e compactação do histórico de 30 dias com métricas de constância harmonizadas.
- **Arquitetura Otimista em Memória:** Eliminação de consultas prematuras ao cache do Dataview e desacoplamento do I/O de persistência em segundo plano, garantindo transições instantâneas a 60 FPS.
- **Higienização de Tarefas Concluídas:** Remoção automática de prefixos e datas legadas (`✅ 2026-11-04`) do título de exibição em atividades concluídas.

---

## [0.9.1] - 2026-11-03

### Adicionado
- **Popup de Encerramento do Pomodoro:** Modal inteligente que oferece adicionar +5 minutos extras de tempo de foco ou iniciar a pausa imediatamente, com contagem regressiva e início automático da pausa após 30 segundos de inatividade.
- **Popup de Atualização Disponível na Home:** Verificador não-bloqueante em segundo plano na Home com deduplicação por sessão, alertando quando houver nova versão no GitHub com atalho direto para as Configurações.
- **Exibição do Changelog Pós-Atualização:** Janela de diálogo que apresenta o resumo das novidades da versão recém-instalada com link direto para o repositório e notas no GitHub.
- **Motor Criptográfico de Atualização (`Updater`):** Funções `calcularSha256`, `buscarManifestoRemoto`, `baixarArquivoRemoto`, `construirMapaLocal` e `verificarAtualizacaoDisponivel`, garantindo downloads atômicos com geração de backup prévio.

### Modificado & Corrigido
- **Painel de Configurações:** Botão "Verificar Atualizações" restaurado com cálculo de divergências em tempo real, exibindo contadores de arquivos a atualizar, adicionar ou preservar; botão "Instalar Atualização com Backup" com indicador dinâmico de progresso.
- **Design Tokens & Contraste no Modo Claro (Light):** Calibração de contraste no tema claro para cartões de Hábitos, Heatmap de Constância e elementos de texto secundários, além de propagação homogênea de background e remoção de redundâncias de layout.
- **Persistência Híbrida de Moedas e Customizações:** Reconciliação robusta ao fechar e reiniciar o Obsidian, garantindo que saldo de moedas, itens adquiridos na loja e tema ativo persistam sem perda de estado.
- **Dock de Áudio no Cockpit:** Reexibição e reparo do input de link do YouTube com reprodução via MPV e sincronização com o timer.

---

## [0.9.0] - 2026-11-01

### Adicionado
- **Fontes Embutidas Offline-First:** Integração tipográfica local com Inter, JetBrains Mono e Source Serif 4 via snippet CSS.
- **Catálogo Vetorial UIKit v2:** 87 ícones canônicos SVG Lucide sem dependências externas, eliminando caracteres literais de emoji no DOM.
- **Central de Customizações & Loja (ShopStore):** Desacoplamento arquitetural com suporte multi-categoria (temas, sementes, utilitários) e fachada `JardimStore` retrocompatível.
- **Áudio Procedural Web Audio API:** Síntese sonora pura de ruídos coloridos (marrom, rosa, branco), chuva e tons binaurais para foco sem dependência de internet.
- **Documentação Docs-as-Code:** Diagramas C4 Mermaid, arquitetura de fatias verticais e registros de decisão arquitetural (ADRs 0001, 0002 e 0003).

---

[0.9.2]: https://github.com/Arkmedess/Snoopy_Vault/compare/v0.9.1...v0.9.2
[0.9.1]: https://github.com/Arkmedess/Snoopy_Vault/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/Arkmedess/Snoopy_Vault/releases/tag/v0.9.0
