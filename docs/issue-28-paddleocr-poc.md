# Issue #28 — POC isolada do PaddleOCR

**Resultado: execução local e offline demonstrada em Chromium desktop; precisão insuficiente para migração. Galaxy S23 não testado.** O Tesseract continua sendo o motor do carrinho. Não há backend, upload de imagens, serviço pago, tentativas múltiplas automáticas, merge ou encerramento da issue.

Base: `origin/main` em `a15db78bb117f9fa87fd181ddde5d01ef6e85173`. Branch: `feat/issue-28-paddleocr-poc`. A Issue #28 e o diagnóstico em `feat/issue-28-ocr-framing:docs/issue-28-ocr-framing.md` foram consultados. Nenhum código dessa branch foi incorporado. O pedido atual autoriza esta POC, embora o texto anterior da issue ainda exclua PaddleOCR.

## Resultados confirmados

- SDK **oficial** `@paddleocr/paddleocr-js@0.4.2`, repositório [PaddlePaddle/PaddleOCR](https://github.com/PaddlePaddle/PaddleOCR/tree/main/paddleocr-js). Nenhum pacote homônimo de terceiros.
- A rota `/app/ocr-lab` permite selecionar arquivo ou capturar pela câmera existente, escolher **um** motor, reconhecer, inspecionar texto bruto/linhas/coordenadas/confiança/tempos e ver o parser/resolver. Não adiciona itens ao carrinho; confirmação e correção manual continuam no fluxo normal.
- Captura existente preservada. Preparação experimental independente: navegador aplica EXIF e gera PNG sem perdas na resolução nativa, sem recorte/redimensionamento. Ambos recebem os mesmos pixels. Isso evita confundir orientação JPEG com diferença de motor. Não replica processamento do vídeo/câmera física.
- `adapter.ts` conserva texto e polígonos originais em `raw`; deriva caixas envolventes e converte confiança 0–1 para 0–100. Não junta dígitos separados, completa números ou altera regras de preço, parser e resolver. Confiança do motor é um escore, não garantia de correção.
- SDK inicializado sob demanda, inferência em Web Worker, backend WASM, um thread e batches de uma imagem/região. Sem requisito de WebGPU ou COOP/COEP para multithreading. Preparação PNG e importação inicial do SDK ainda usam a thread principal.
- Dependências e scripts instalaram novamente com `npm ci`. Os 113 testes anteriores continuam passando; foram acrescentados 15 testes de adaptador, inicialização/reuso/liberação, retry, erros, resultado vazio, compatibilidade monetária, recursos ausentes, fallback HTML e integridade do cache. Total: **128 testes em 15 arquivos**. `npm run build` passa.
- Chromium 154 desktop: erro de manifesto ausente foi mostrado; botão voltou a funcionar e a tentativa seguinte reconheceu a foto. Em viewport 393×852 não houve overflow horizontal; um timer da UI executou 135 vezes durante a tentativa real. Isso não substitui medição de responsividade no Android.

## Seleção dos modelos e compatibilidade

As [instruções oficiais do SDK](https://github.com/PaddlePaddle/PaddleOCR/blob/main/paddleocr-js/packages/core/README.md), os tipos publicados e o catálogo de idiomas do pacote foram consultados. A versão 0.4.2 mapeia `pt` para **PP-OCRv6**; não oferece mapeamento português para PP-OCRv5. A POC fixa explicitamente `PP-OCRv6_tiny_det` e `PP-OCRv6_tiny_rec`, com `lang: pt`. Tiny é o ponto inicial de menor custo de armazenamento; não foi escolhido por demonstrar maior precisão. Não foi comparado com `PP-OCRv6_small`.

Os arquivos oficiais ONNX são arquivos ustar com `inference.onnx` e `inference.yml`, incluindo dicionário de reconhecimento. O SDK valida a identidade do modelo. `npm run ocr:prepare` baixa somente no preparo, com TLS, verifica os hashes SHA-256 fixados, reutiliza downloads válidos e copia WASM/MJS do npm. Os hashes e tamanhos observados estão em [issue-28-paddle-resources.json](issue-28-paddle-resources.json). A licença do SDK é Apache-2.0; os modelos vêm do catálogo oficial PaddleOCR.

O worker pré-compilado do SDK embute ONNX Runtime **1.24.3**. Foi necessário fixar `onnxruntime-web@1.24.3` e hospedar **`ort-wasm-simd-threaded.jsep.mjs/.wasm`** dessa versão: mesmo com backend WASM, esse worker solicita o runtime JSEP. Copiar apenas a variante WASM simples causou falha real de importação; essa configuração foi corrigida e o reconhecimento/offline reexecutados. Atualizar ORT independentemente do SDK é incompatível.

Vite/TypeScript/build PWA foram verificados. A API exige navegador moderno com Worker de módulo, OffscreenCanvas, createImageBitmap, WASM/SIMD e contexto seguro para câmera/Service Worker. Chromium desktop foi exercitado; Chrome Android e Samsung Internet permanecem sem validação física. O SDK avisa que **DocPreprocessor e TextLineOrientation ainda não são suportados**; não há correção automática de orientação de linhas/documento nesta POC.

### Tamanho e memória

Tamanhos sem compressão HTTP:

| Recurso | MB decimais |
|---|---:|
| Detector tiny | 1,792 |
| Reconhecedor tiny | 4,526 |
| Runtime JSEP WASM | 25,015 |
| Runtime JSEP MJS | 0,047 |
| Chunk SDK/OpenCV no cliente | 10,885 |
| Worker pré-compilado SDK/OpenCV | 11,341 |
| Total experimental solicitado/cacheado, aproximadamente | **53,606** |

O `dist` completo ocupa aproximadamente **113,2 MB**. Inclui também um WASM de aproximadamente 25 MB emitido pelo bundle do SDK, duplicando o runtime servido por URL explícita; essa cópia não é solicitada no caminho worker testado. Não foi feita reescrita do SDK para remover essa duplicação. O chunk SDK também carrega código OpenCV no cliente, além do worker. São limitações relevantes do empacotamento atual.

Os recursos grandes são excluídos do precache geral e armazenados sob demanda somente no experimento. Foi verificado que abrir `/app` não solicita SDK/worker/modelos Paddle. O precache geral ficou em cerca de 32,27 MB, contra 32,26 MB no build anterior. `playwright@1.57.0` foi adicionado somente como dependência de desenvolvimento para reproduzir a comparação e o teste offline; não integra o bundle da aplicação.

O relatório registra heap JS principal e a soma de RSS dos processos deste Chromium após cada chamada. Heap principal: aproximadamente **18,4–49,4 MB**, sem representar a memória dos workers/WASM. RSS agregado: **623 MB antes dos motores**, **1.118 MB após a primeira leitura Tesseract**, **3.041 MB após a primeira Paddle**, chegando a **3.487 MB** ao final. Ambos os motores permaneciam residentes; RSS soma páginas compartilhadas mais de uma vez. Não é PSS, pico transitório ou alocação isolada por motor, e não permite prever consumo no S23. “Liberar motor PaddleOCR” encerra seu worker, mas a liberação física depende do navegador.

## Comparação das seis fotografias

[Relatório completo com texto bruto dos dois motores, linhas, polígonos, candidatos, resolver, tempos, heap, RSS e hashes](issue-28-paddle-results.json). As [referências visuais](ocr-reference.json) foram extraídas das anotações do diagnóstico anterior e conferidas nas fotos; não alimentam os motores nem o parser. O final do nome da 04 permanece sem anotação segura. A 06 permanece **contextual**, sem produto/preço esperado.

Protocolo: seis originais intactos, PNG orientado na resolução nativa, um passe sequencial sem warmup. A primeira chamada inclui inicialização e importação do motor; preparação PNG é medida separadamente. Execução Linux/Chromium 154 desktop, não Galaxy S23. A medição final foi feita sem outro teste de OCR em execução. Os resultados são observações únicas, sem distribuição estatística ou promessa de latência.

| Foto | Tesseract: reconhecimento útil | Paddle tiny: reconhecimento útil e falhas | Tesseract / Paddle |
|---|---|---|---|
| 01 | Sem preço; descrição não recuperada | Nome do óleo e `900ML` corretos no bruto; `39`/`49` perdem os inteiros dos preços 7,39/7,49. Recupera 8,33/L, referência e não preço de compra. Condição de quantidade parcial. | 1,14 / 6,59 s |
| 02 | Nome do óleo correto no bruto, mas parser escolhe outro trecho; só referência 8,33/L | `90OML` contém letra O; condição “a partir de 3 unidades” aparece. Recupera 7,39, mas tipo `UNKNOWN`; 7,49 vira `49`. Recupera referência 8,33/L. | 1,41 / 4,13 s |
| 03 | Texto ruidoso, sem os preços 2,89/2,17 | Recupera descrição do macarrão; `400G` vira `4006`. Não recupera os dois preços nem as quantidades da oferta. Parser inclui texto de fundo no nome. | 6,35 / 4,10 s |
| 04 | Recupera referências 20,66/21,81 por kg; sem preços de compra | Recupera 3,29 e 3,49, ambos `UNKNOWN`; não recupera corretamente a condição a partir de 4. Recupera 92,12/caixa e 20,66/21,81/kg, também `UNKNOWN`. Surge candidato **5,88** alheio à etiqueta alvo. Nome parcial/contaminado. | 2,87 / 4,45 s |
| 05 | Sem preço 14,98 e sem nome útil | “OVOS”, “BRANCOS” e “30UN” aparecem no bruto, mas o parser escolhe texto do fundo. Não recupera 14,98. A relação unidade/embalagem continua dependendo de confirmação humana. | 10,42 / 4,11 s |
| 06 | Cena contextual com texto ruidoso; não pontuada | Vários rótulos e número `24.91` sem contexto suficiente. Não associar a produto/preço específico nem contar como acerto. | 13,79 / 5,46 s |

**Exatidão:** nas cinco etiquetas há nove valores de compra anotados. Tesseract recuperou **0/9** como candidatos; Paddle **3/9**. Esses três valores Paddle ficaram com tipo `UNKNOWN`; nenhum caso recuperou integralmente nome, preços e condições corretos. Houve um candidato numérico falso para o alvo na 04 (`5,88`); não foi estabelecido se sua origem é o fundo ou erro de reconhecimento. Referências por litro/kg/caixa não contam como acerto de preço de compra. A 06 não entra nos denominadores.

Paddle reconhece exatamente os nomes completos anotados das fotos 01 e 05 no bruto, mas o nome final do parser fica contaminado. Na 02 erra o volume, na 03 erra a unidade, e a 04 não dispõe de nome completo anotado. O Tesseract reconhece o nome do óleo na 02 no bruto e também falha na seleção final. Não foi obtido nome completo correto no produto final nas quatro referências completas. Não classificar sucesso por quantidade de caracteres ou confiança elevada: há resultados incorretos com confiança agregada 100.

O parser atual classifica a referência por litro 8,33 como `REGULAR_PRICE` e deixa preços de compra/referências da 04 como `UNKNOWN`. Essas limitações ficaram visíveis e **não foram corrigidas nem compensadas** para favorecer o experimento.

## Offline: confirmado no desktop, pendente no S23

[Registro reproduzível do teste offline](issue-28-paddle-offline.json):

1. Build de produção servido pelo Vite preview. Instalação do Service Worker e controle da página confirmados.
2. Botão “Preparar PaddleOCR e cache offline”: valida manifesto, tamanho e SHA-256 dos recursos, armazena em `messo-paddle-042-ort1243-v1` e inicializa o worker. SDK/worker são cacheados nas requisições locais sob controle do SW. Inicialização interna reportada pelo SDK: aproximadamente 677 ms, excluindo partes do download/importação do cliente.
3. Reconhecimento online da foto 01 (Paddle, 5,69 s após preparo).
4. **Processo do navegador completamente encerrado.** Perfil persistente reaberto; rede desativada antes de navegar.
5. Rota experimental abriu pelo cache; foto **03**, diferente da primeira, foi selecionada e reconhecida por Paddle (6,52 s incluindo reinicialização) e Tesseract (6,85 s).
6. **Zero requisições externas e zero requisições falhadas** no teste. O resultado comprova disponibilidade do motor/recursos offline, não melhora de precisão.

Nenhuma imagem é enviada ao servidor: os scripts de comparação usam arquivos locais, a UI cria Blob/bitmap local e os workers recebem pixels. Somente recursos estáticos/modelos são requisitados da própria origem. URLs padrão de CDN existem no código distribuído do SDK, mas a POC fornece caminhos explícitos; não foram utilizadas nos testes.

O navegador pode remover caches por pressão de armazenamento, limpeza do usuário ou modo privado. O manifesto e seus digests detectam conteúdo incompleto; não garantem persistência contra remoção. A UI mostra falha técnica e permite retry/preparo, liberação do motor e limpeza **somente** do cache experimental. Não houve teste de pressão/evicção ou atualização entre versões. Ao trocar SDK, runtime ou modelos, regenere os recursos, altere o namespace do cache e repita o teste; o cache geral de uma versão anterior não valida a próxima. Não eleve globalmente o limite de precache para incluir todos os modelos.

## Como reproduzir

Use o checkout existente e esta branch, sem worktree adicional. Ambiente verificado: Node 24.19.0, npm 11.9.0, Chromium 154. Requer `curl` no preparo; o download respeita o proxy HTTPS existente.

```sh
npm ci
npm run ocr:prepare
npm test
npm run build
npm run preview -- --host 0.0.0.0 --port 4173 --strictPort
```

Em outro terminal, na raiz do checkout:

```sh
CHROMIUM_PATH=/usr/bin/chromium npm run ocr:benchmark
CHROMIUM_PATH=/usr/bin/chromium npm run ocr:offline
```

Ambos usam o build de produção já em execução. `OCR_BASE_URL` permite selecionar a origem; `OCR_REPORT` altera o destino JSON do benchmark. O navegador pode ser instalado com o procedimento oficial do Playwright se não houver Chromium local. Os scripts encerram com erro quando algum motor/teste obrigatório não executa; texto vazio é distinguido de falha técnica. Os arquivos JSON são sobrescritos por cada execução, preservando evidência da rodada atual.

`public/ocr-paddle.local/` é gerado e ignorado pelo padrão `*.local` existente. Não versionar os binários. **Toda implantação de revisão deve executar `npm run ocr:prepare` antes de `npm run build` e publicar o `dist` completo.** Sem o manifesto/arquivos, a rota mostra a falha com instrução de preparo. O fluxo normal Tesseract não requer esse download. Desenvolvimento: `npm run dev`; validação offline exige build/Service Worker, não apenas dev.

Durante o setup houve HTTP 403 no domínio oficial dos modelos e na API GitHub. Os domínios `paddle-model-ecology.bj.bcebos.com` e `api.github.com` foram adicionados ao rascunho do ambiente, preservando os presets de gerenciadores de pacotes. Após a alteração, download e leitura da API funcionaram. Nenhum token/segredo foi solicitado ou salvo no repositório.

## Validação humana no Galaxy S23 — não executada

1. Publicar esta branch em origem **HTTPS** de revisão, com os recursos preparados. Registrar commit/build, Android, navegador e versão, Chrome/Samsung Internet ou PWA instalada. Aplicar a atualização da PWA se o botão aparecer. Não usar o build da branch de enquadramento.
2. Abrir `/app/ocr-lab`. Selecionar uma foto ou usar “Capturar com a câmera”, permitindo o acesso; incluir etiqueta inteira, nome, preços, unidades e condições. Conferir a imagem exibida. Testar câmera traseira e orientações, sem assumir que o desktop valida foco/sensor.
3. Escolher PaddleOCR e clicar “Preparar PaddleOCR e cache offline”. Se o SW acabou de ser instalado e ainda não controla a página, recarregar e preparar novamente. Guardar o diagnóstico de inicialização, recursos e armazenamento.
4. Executar uma primeira leitura. Copiar o JSON local com texto bruto, polígonos, preços/classificações, nome/resolver, confiança e tempos. Conferir visualmente na etiqueta. Não aceitar referências como preço de compra nem completar dígitos ausentes. Escolher Tesseract para comparar a mesma foto, uma execução por vez.
5. Fechar completamente a PWA. Desligar Wi-Fi **e** dados móveis. Reabrir a PWA offline e entrar na rota experimental. Capturar **outra** etiqueta, escolher PaddleOCR e reconhecer. Verificar texto, preço e tempo, sem exigir que a precisão seja maior que no teste online.
6. Usar a inspeção remota do Chrome Android por USB, com log de rede preservado, para conferir ausência de pedidos externos e falhas de recursos; registrar como a rede foi desativada. A UI sozinha não prova ausência de tentativas externas. Exportar logs/JSON com consentimento do responsável; não há envio automático.
7. Repetir com Tesseract, com reflexo/desfoque/ofertas/referências por kg/litro, fechar/reabrir e testar atualização da PWA. Anotar travamento, fechamento pelo sistema e armazenamento. Testar “Liberar motor” e, online, “Limpar cache experimental” seguido de novo preparo. Limpeza do cache exige novo download antes de funcionar offline.
8. Enviar as evidências para revisão técnica. Não fazer merge, migrar definitivamente ou encerrar a #28 antes da aprovação e validação humana.

## Hipóteses

- Omissão de dígitos grandes/estilizados pode envolver detecção de regiões, escala e reconhecimento; os dados atuais não isolam a causa. Os polígonos/bruto permitem investigação posterior.
- `PP-OCRv6_small`, parâmetros de escala do detector e outros modelos latinos oficiais podem melhorar precisão, com custos distintos de memória/latência. Não foram comparados nem adotados automaticamente.
- A execução worker/WASM pode funcionar no S23 moderno; consumo de memória, aquecimento, câmera e evicção podem inviabilizar uso estável. Somente o teste físico poderá decidir.

## Testes não executados e decisão

Não executados: Galaxy S23/câmera física, Samsung Internet, captura offline real no telefone, estabilidade prolongada/temperatura/bateria, memória física isolada por motor/picos, pressão de armazenamento, atualização de modelos em perfil previamente instalado, outros modelos e navegadores não Chromium.

Não há bloqueador de ambiente pendente para a POC desktop. A falha de precisão é resultado do experimento, não um teste desativado. **Manter Tesseract na produção e usar esta branch apenas para revisão e validação humana.** A POC demonstra viabilidade técnica local/offline no desktop; não demonstra substituição adequada no mobile ou solução da falha de campo.
