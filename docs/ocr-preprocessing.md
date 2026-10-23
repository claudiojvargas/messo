# Enquadramento assistido e pré-processamento visual

Implementação em `feat/ocr-framing-preprocessing`, continuando o enquadramento da Issue #28. Sem alteração de Tesseract, Label Parser, Product Resolver, regras monetárias, catálogo, dependências ou lockfile.

## Fluxo e responsabilidades

`camera-view.ts` gerencia preview, seletor e revisão; `camera.ts` captura o recorte; `camera-framing.ts` converte coordenadas. O módulo novo `image-preprocessing.ts` prepara um único recorte. `ocr-view.ts` coordena essa preparação antes de chamar o adaptador existente `tesseract-ocr.ts`, seguido do parser, resolver e confirmação. A adição ao carrinho permanece no fluxo existente.

```text
Câmera → captura/recorte nativo → revisão da foto → pré-processamento
       → Tesseract existente → Label Parser → Product Resolver → confirmação/formulário
```

O recorte original continua intacto em memória. Repetir a leitura começa desse original, nunca de uma imagem já filtrada. A preparação não ocorre durante o preview nem processa continuamente os frames.

## Enquadramento

A instrução é “Posicione toda a etiqueta dentro da moldura”. A moldura agora tem proporção 3:2, limitada a 88% da largura e 76% da altura da imagem visível; permite enquadrar nome, preços e condições em conjunto. A área externa recebe sombra de 35%, sem interceptar os controles. Etiquetas com outra proporção exigem ajustar a distância/enquadramento ou girar o aparelho, sem zoom digital introduzido pelo código.

O preview padrão permanece `contain`, centralizado e sem espelhamento. A captura e o posicionamento consultam o `object-fit` computado e também suportam `cover`: nesse caso a moldura fica dentro da interseção visível do vídeo, sem usar as partes escondidas pelo elemento. Não há suporte a espelhamento, rotação CSS ou `object-position` arbitrário; o CSS do produto continua centralizado e sem transformações.

A escala é `min(elementWidth/videoWidth, elementHeight/videoHeight)` para `contain` e `max(...)` para `cover`. O código desconta o deslocamento da imagem centralizada, converte os limites CSS da moldura em pixels reais, limita à imagem/elemento e arredonda para dentro. Não multiplica por `devicePixelRatio`. O canvas do recorte mantém a resolução nativa; não há alongamento, redimensionamento ou overlay codificado.

## Pré-processamento conservador

- **Orientação:** `createImageBitmap(blob, {imageOrientation: 'from-image'})` usa a orientação do decoder nativo. As dimensões decodificadas são preservadas. JPEGs produzidos pelo canvas da câmera não recebem outra rotação. Falta de suporte ao decoder/opção cai no fallback.
- **Contraste:** fator fixo moderado 1,08 em torno de 128, limitado a 0–255. A API rejeita fatores fora de 1–1,15, retornando o original. Nenhum parâmetro é ajustado por fotografia.
- **Tons de cinza:** opcionais, desligados por padrão. Luminância 0,299R + 0,587G + 0,114B. O alpha é preservado.
- **Ruído:** não foi adicionado filtro espacial. A redução de ruído não foi considerada segura nesta etapa, pois pode apagar vírgulas, pontos e traços pequenos. Também não há limiarização, sharpening ou perspectiva automática.
- **Saída:** PNG sem perdas, evitando uma segunda compressão JPEG. O recorte de entrada continua JPEG 0,92. PNG aumenta bytes e memória; é uma escolha explícita de preservar detalhes, não uma promessa de ganho universal.
- **Responsividade:** processamento em faixas de 64 linhas; o loop cede ao navegador após aproximadamente 8 ms de trabalho entre faixas. Há uma cessão inicial para pintar o diálogo. Isso evita um grande buffer RGBA adicional e permite eventos entre faixas. Decode, draw/readback e encode nativos ainda têm custos dependentes do dispositivo.
- **Recursos:** `ImageBitmap.close()` e dimensões do canvas zeradas em `finally`, inclusive nas falhas. Cancelar/nova foto aborta a preparação; o controlador verifica a tentativa antes de chamar o OCR, evitando leitura tardia após fechar o diálogo.
- **Fallback:** falha de decode, contexto/pixels, parâmetros, encode ou cancelamento retorna exatamente o mesmo objeto e Blob originais. Erro técnico do Tesseract continua sendo tratado pela interface OCR existente. Texto ruim ou vazio não dispara outra tentativa automática.

## Comparação e reversão

- `/app`: pré-processamento ligado, contraste 1,08 e cores preservadas.
- `/app?ocrPreprocess=off`: usa diretamente o recorte original, sem decoder/canvas de pré-processamento.
- `/app?ocrGrayscale=1`: contraste com tons de cinza.
- Acrescentar `cameraDebug` para ver a imagem efetivamente enviada e metadados. Exemplos: `/app?cameraDebug&ocrPreprocess=off` e `/app?cameraDebug&ocrGrayscale=1`.

O diagnóstico registra estado `processed`, `disabled` ou `fallback`, opções, duração e erro quando houver, além das dimensões/tipo/bytes reais da imagem enviada. Não há upload nem persistência automática. O painel normal e as regras de seleção/correção permanecem os mesmos. O processamento pode ser desligado por URL; o commit que o adiciona também pode ser revertido sem trocar o motor.

## Testes executados

- **143 testes Vitest passaram em 15 arquivos**, incluindo os testes existentes de produto, preço, parser, resolução e armazenamento.
- Testes novos de pixels/contraste e grayscale opcional; opção desligada sem decode; dimensões orientadas; PNG sem perdas; retorno do Blob idêntico em falhas de decode/contexto/pixels/encode; encoder que lança exceção; rejeição de contraste agressivo; cancelamento antes/durante decode e liberação de recursos. A captura ganhou teste específico de `cover` real.
- **Build passou:** TypeScript, Vite e PWA.
- **Chromium, oito cenários de câmera:** diferentes telas, resoluções e proporções, com `contain` e `cover`, rotação por mudança de dimensões, troca de câmera, redimensionamento e nova foto. Os pixels do recorte foram comparados a um gradiente conhecido, junto com coordenadas, controles e encerramento das tracks.
- **Oito cenários de OCR/UI:** vazio, texto sem preço, candidato sintético, diagnóstico desligado, erro técnico/repetição, nova foto, pré-processamento desligado e falha forçada do decoder com fallback. Verificados o MIME enviado, estado, confirmação/correção e liberação das URLs de diagnóstico.
- **Verificações adicionais no browser:** JPEG real com EXIF 6 foi normalizado de 4000×3000 codificados para 3000×4000; amostras de pixels com contraste 1 permaneceram idênticas. Cancelamento durante decode liberou o bitmap e não fez requisição ao módulo do motor.

Vídeo sintético não valida câmera física, foco/exposição, sensor/lente, memória ou barras dinâmicas reais do S23. Os testes de interface com texto artificial não contam como reconhecimento de etiquetas reais.

## Seis fotografias: resultados observados

[Resultados brutos e metadados](ocr-preprocessing-results.json). Os originais preservam os hashes da análise anterior. Foram realizadas 18 leituras sequenciais com o mesmo motor/modelo/PSM 6: original, contraste e contraste+grayscale, sempre a partir do mesmo recorte JPEG. As ROIs de controle da etapa anterior foram reutilizadas apenas no experimento, sem entrar no código de produção. Não são uma simulação de alinhamento de câmera real.

| Foto | Recorte sem pré-processar | Contraste 1,08 | Contraste + grayscale |
|---|---|---|---|
| 01 | `71,39` incorreto | `7,39` correto numericamente, mas tipo `UNKNOWN` e nome/condição incompletos | Nenhum preço |
| 02 | Nenhum preço | Nenhum preço | `7,39` correto numericamente, mas `REGULAR_PRICE` em vez de condição de quantidade; nome incorreto |
| 03 | Nenhum preço | Recuperou parte legível do título; nenhum preço | Nenhum preço |
| 04 | `92,17` e `20,68` incorretos | Nenhum preço | Nenhum preço |
| 05 | Nenhum preço | Nenhum preço | Nenhum preço |
| 06 | Nenhum preço | Nenhum preço | Nenhum preço; cena sem etiqueta única |

Nas cinco etiquetas, nenhum modo recuperou integralmente nome, preços e condições. O modo padrão recuperou um dos nove valores de compra anotados (foto 01), removendo os três candidatos numéricos incorretos desta comparação. O modo grayscale recuperou outro caso (foto 02), mas perdeu o valor da 01. Isso não prova superioridade geral de filtros e não autoriza compensar caracteres ausentes no parser. A foto 06 não é pontuada por não ter alvo único.

| Foto | Tempo OCR original | Pré-processamento contraste + OCR | Pré-processamento grayscale + OCR |
|---|---:|---:|---:|
| 01 | 1.847 ms | 111 + 1.586 ms | 110 + 1.380 ms |
| 02 | 894 ms | 83 + 1.169 ms | 65 + 833 ms |
| 03 | 3.872 ms | 315 + 4.450 ms | 237 + 2.748 ms |
| 04 | 1.017 ms | 103 + 894 ms | 76 + 1.049 ms |
| 05 | 743 ms | 47 + 512 ms | 40 + 327 ms |
| 06 | 18.918 ms | 486 + 20.282 ms | 359 + 17.856 ms |

Medições individuais neste desktop, não benchmark estatístico nem garantia mobile. O primeiro OCR inclui a inicialização do worker. Callbacks de um timer aconteceram durante a preparação; os maiores intervalos observados ficaram entre 16 e 49 ms. Essa medição parcial não exclui pausas não amostradas de decode/encode e não garante fluidez num telefone.

Os PNGs coloridos ficaram entre 1,66 e 16,02 MB, contra 0,21–2,22 MB nos JPEGs de entrada deste conjunto; o maior caso é uma cena geral de compras de alta resolução. PNG e buffers do motor ainda podem pressionar memória em dispositivos móveis. Nenhum filtro de escala/redução foi introduzido para ocultar esse custo. A opção `ocrPreprocess=off` permite comparar ou desativar o custo imediatamente.

## Validação manual no Galaxy S23

1. Usar build HTTPS desta branch; confirmar Android e navegador/versão e atualizar a PWA. O roteiro de captura da Issue #28 continua aplicável.
2. Conferir a instrução, moldura 3:2, sombra suave e acesso a seletor/captura/cancelar em retrato e paisagem. Incluir toda a etiqueta e comparar a área visível com a foto revisada.
3. Abrir `/app?cameraDebug`, fotografar pela própria Messo e conferir a imagem enviada, dimensões, tempo e estado `processed`. Conferir nomes, valores e condições contra a etiqueta; não aceitar qualquer número como sucesso.
4. Comparar com `/app?cameraDebug&ocrPreprocess=off` e, opcionalmente, com `/app?cameraDebug&ocrGrayscale=1`, mantendo iluminação/enquadramento comparáveis. Capturas diferentes não são um A/B pixel a pixel; isso foi feito no experimento com arquivos.
5. Testar etiquetas com vários preços, vírgulas/pontos pequenos e reflexo; cancelar durante “Preparando imagem...”, repetir, refazer a foto e trocar câmera. Conferir que não aparece resultado tardio após cancelar.
6. Validar correção do nome, opção manual, edição de preço/nome no formulário e inclusão no carrinho; repetir sem diagnóstico.
7. Registrar legibilidade, erros, latência e eventuais travamentos/memória. A precisão completa e a responsividade no S23 permanecem pendentes de validação humana. Sem merge automático ou encerramento da Issue #28.
