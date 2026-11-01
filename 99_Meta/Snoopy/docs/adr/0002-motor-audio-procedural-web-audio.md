# 0002: Motor de Áudio Procedural de Foco via Web Audio API

* **Status:** aceito
* **Data:** 2026-10-31
* **Decisores:** Equipe de Arquitetura e Engenharia do Snoopy Vault
* **Módulos Afetados:** `99_Meta/Snoopy/core/pomodoro_audio.js`, `99_Meta/Snoopy/modulos/02_snoopy_cockpit_pomodoro.js`, `99_Meta/Snoopy/modulos/shop/shop_modal.js`

## 1. Contexto e Declaração do Problema
O modo de foco imersivo no Cockpit Pomodoro necessitava de estímulo acústico contínuo (ruídos de mascaramento de ruído ambiente e tons binaurais para foco e concentração). A abordagem convencional de empacotar arquivos de áudio pré-gravados (MP3, OGG ou WAV) ou transmitir via CDN apresenta sérios problemas para um cofre Obsidian:
1. **Sobrecarga de Armazenamento:** Arquivos de áudio pesados aumentam consideravelmente o tamanho do repositório, encarecendo e lentificando a sincronização (Obsidian Sync, Git).
2. **Dependência de Conectividade:** CDNs ou streams remotos inviabilizam o uso offline do sistema.
3. **Fadiga Auditiva e Loops Imperfeitos:** Arquivos pré-gravados contêm ciclos repetitivos identificáveis pelo cérebro e geram cliques/estalos na junção dos loops.
4. **Licenciamento de Mídia:** Riscos de direitos autorais associados à redistribuição de arquivos sonoros.

## 2. Direcionadores de Decisão (Drivers)
* **Pegada Zero de Armazenamento (Zero Disk Footprint):** Nenhuma dependência de arquivos binários ou buffers estáticos persistidos em disco (0 MB).
* **Operação Offline-First:** Síntese sonora algorítmica local garantida em qualquer ambiente operacional.
* **Diversidade Acústica Baseada em Evidências:** Disponibilidade de ruídos coloridos (branco, rosa, marrom), simulação meteorológica (chuva estocástica) e estimulação neuroacústica por batimentos binaurais (ondas alfa de 10Hz e beta de 16Hz).
* **Desempenho e Eficiência Energética:** Baixo consumo de CPU/RAM em threads dedicadas de áudio, sem interferir na renderização fluida do DOM do Obsidian.
* **Governança de Autoplay:** Respeito à política de segurança de navegadores modernos/Chromium, exigindo gesto deliberado do usuário antes de iniciar o `AudioContext`.

## 3. Opções Consideradas
* **Opção 1:** Downloads sob demanda de arquivos MP3 hospedados em infraestrutura de nuvem.
* **Opção 2:** Empacotamento de amostras curtas de áudio em formato compactado dentro do cofre.
* **Opção 3:** Síntese procedural em tempo real 100% matemática em memória através da Web Audio API nativa do navegador/Electron.

## 4. Decisão Escolhida
Escolhida a **Opção 3**, implementando o microsserviço `PomodoroAudio` (`99_Meta/Snoopy/core/pomodoro_audio.js`).

A arquitetura do motor procedural adota os seguintes padrões técnicos:
1. **Geradores de Ruído por `AudioBufferSourceNode` com ruído contínuo e filtros biquad:**
   - *Ruído Branco:* Distribuição uniforme de números aleatórios normalizados.
   - *Ruído Rosa:* Filtro de polo triplo (aproximação de Paul Kellet) com decaimento de -3dB/oitava.
   - *Ruído Marrom/Vermelho:* Integração com decaimento de -6dB/oitava para frequências graves relaxantes.
   - *Chuva Procedural:* Modulação de ruído marrom com filtros passa-banda e rajadas estocásticas de amplitude simétricas simulando gotas aleatórias.
2. **Sintetizadores Binaurais Estéreo:** Dois osciladores sinusoidais independentes conectados a `StereoPannerNode` dedicados (um no canal esquerdo com frequência base e outro no canal direito com frequência base + delta de 10Hz ou 16Hz), estimulando a sincronia hemisférica.
3. **Gerenciamento de Volume e Envelope:** Rampa exponencial suave com `linearRampToValueAtTime` para evitar cliques acústicos em play/pause/mute.
4. **Persistência de Preferências:** Volume, estado de mudo e faixa ativa são gravados em `localStorage` para resposta instantânea na inicialização.

## 5. Prós e Contras das Opções

### Opção 1: Streaming Remoto
* Boa, porque não consome armazenamento local de imediato.
* Ruim, porque falha completamente em modo offline e introduz latência de rede e dependência externa.

### Opção 2: Arquivos de Áudio Locais
* Boa, porque permite sons instrumentais gravados complexos.
* Ruim, porque adiciona dezenas de megabytes ao cofre e introduz artefatos perceptíveis de loop.

### Opção 3: Síntese Procedural via Web Audio API
* Boa, porque tem pegada zero de disco (0 MB adicionados ao repositório).
* Boa, porque gera áudio verdadeiramente infinito e estocástico, sem jamais repetir padrões sonoros.
* Boa, porque opera perfeitamente sem conexão com a internet.
* Ruim, porque exige implementação cuidadosa de nós matemáticos de áudio e desbloqueio manual sob interação do usuário.

## 6. Consequências e Trade-offs
* **Impacto Positivo:**
  - Carregamento instantâneo sem I/O de disco.
  - Controle cirúrgico de frequências, ganho e modulação estéreo em tempo real.
  - Integração nativa com o timer Pomodoro (início/pausa automáticos configuráveis via `autoSync`).
* **Impacto Negativo / Débito Aceito:**
  - O motor de áudio procedural sintetiza sons abstratos e tons de foco, não músicas orquestradas com instrumentos reais.
* **Ações Mitigatórias:**
  - O catálogo de faixas procedurais oferece 6 perfis sonoros distintos, cobrindo as necessidades fundamentais de estudo, relaxamento e trabalho focado.
