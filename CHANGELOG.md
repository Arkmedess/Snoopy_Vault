# Changelog

Todas as alterações notáveis neste projeto serão documentadas neste arquivo.

O formato é baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.0.0/),
e este projeto adere ao [Semantic Versioning](https://semver.org/lang/pt-BR/).

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

[0.9.1]: https://github.com/Arkmedess/Snoopy_Vault/compare/v0.9.0...v0.9.1
[0.9.0]: https://github.com/Arkmedess/Snoopy_Vault/releases/tag/v0.9.0
