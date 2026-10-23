# Issue #28 — moldura e recorte para OCR

Registro histórico da etapa de 19/10/2026. Para a moldura 3:2 e o pré-processamento posteriores, consulte [ocr-preprocessing.md](ocr-preprocessing.md).

Implementação da seção “Decisão aprovada — otimização final do Tesseract” da Issue #28 (19/10/2026), sobre a main `a15db78`. Branch: `feat/issue-28-ocr-framing`.

**A geometria do recorte foi validada. A melhora de reconhecimento nas etiquetas reais ainda não foi demonstrada. A issue permanece aberta para validação humana no Galaxy S23.** Não houve mudança de motor, modelo, PSM de produção, parser, resolver, dependências ou lockfile.

## Comportamento implementado

- Moldura central com 84% da largura e 76% da altura da imagem efetivamente visível do vídeo. As proporções seguem o vídeo, não a tela nem as faixas pretas. Não são coordenadas fixas de texto ou das fotos de teste.
- Instrução para incluir a etiqueta inteira: nome, todos os preços, unidades e condições promocionais. A área externa é escurecida, sem interceptar os controles.
- Preview preservado em `object-fit: contain`, `object-position: center`, sem transformação CSS nem espelhamento, inclusive para câmera frontal. Não foi introduzido `cover` no produto.
- `ResizeObserver` e o evento `resize` do vídeo reposicionam a moldura quando muda a tela, a resolução/orientação do stream ou a câmera. A geometria é lida novamente ao fotografar.
- A fotografia é um JPEG 0,92 apenas do interior da moldura, na resolução nativa daquela região. Não há upscale, redução adicional, correção de perspectiva, rotação explícita nem recorte manual posterior. O overlay não é desenhado no canvas.
- A revisão da foto já apresenta o recorte que será enviado ao OCR. “Tirar novamente”, seletor de câmera, confirmação, opção manual e preenchimento do formulário continuam no fluxo existente.
- Geometria inválida ou sem interseção útil gera erro de captura; não há fallback silencioso para enviar o quadro inteiro.
- Observadores, streams e URLs de preview são liberados ao encerrar. A URL adicional do diagnóstico também é revogada.

## Conversão de coordenadas

As medidas de `getBoundingClientRect()` estão em pixels CSS. Para o preview `contain` centralizado:

```text
scale = min(elementWidth / videoWidth, elementHeight / videoHeight)
contentLeft = elementLeft + (elementWidth - videoWidth * scale) / 2
contentTop  = elementTop  + (elementHeight - videoHeight * scale) / 2
sourceX = (frameLeft - contentLeft) / scale
sourceY = (frameTop  - contentTop)  / scale
```

O recorte é limitado simultaneamente à moldura, ao elemento visível e à imagem. Arredonda o início para cima e o fim para baixo: nunca inclui pixels externos à moldura; pode perder menos de um pixel de origem por borda. O tamanho do canvas é exatamente o tamanho resultante em pixels do vídeo. Não se multiplica por `devicePixelRatio`.

`camera-framing.ts` mantém a matemática independente do DOM. O teste de `cover` verifica a fórmula alternativa do helper; o preview/captura de produção continuam fixados em `contain`. Se futuramente o CSS mudar de fit, posição, espelhamento ou transformação, o mapeamento da captura também precisa ser revisado.

## Diagnóstico local opcional

Abrir a rota `/app?cameraDebug` na versão de revisão habilita “Diagnóstico local da leitura” no resultado do OCR. Sem a opção, o painel fica oculto e o texto bruto não é escrito nele.

O painel mostra a imagem recortada efetivamente enviada, dimensões, MIME/tamanho, resolução original e retângulo de origem, texto bruto, linhas/confiança, candidatos e duração da tentativa. Estados: `processing`, `empty-text`, `text-without-price`, `candidates`, `technical-error`. O último inclui o erro capturado. Não há upload nem persistência automática de fotos ou texto. Isso complementa o diagnóstico de câmera já existente em `cameraDebug`.

O diagnóstico não altera os candidatos nem resolve dígitos por presunção. A confiança permanece um escore do motor/parser, não uma garantia de exatidão. A distinção de estados está no painel opcional; a interface normal mantém suas mensagens atuais.

## Validação automatizada

- `npm test`: 129 testes em 14 arquivos passaram, incluindo 16 novos testes de geometria e captura.
- `npm run build`: TypeScript, build Vite e geração da PWA passaram.
- Chromium 154, com Playwright já disponível no ambiente e sem adicioná-lo ao projeto: oito cenários de tela/vídeo. Telas: 393×852, 360×640, 320×568, 852×393, 640×360, 568×320 e 1024×768. Vídeos: 640×480, 1920×1080, 1080×1920, 4000×3000 e 3000×4000.
- Os cenários verificaram a correspondência do JPEG por amostragem de pixels de um gradiente conhecido, além das coordenadas: nenhuma borda do overlay foi codificada e o recorte ficou dentro da moldura, com arredondamento inferior a um pixel por borda.
- Foram exercitados troca de câmera com mudança de resolução, redimensionamento durante o preview, nova foto, revisão/confirmar, encerramento das tracks e ausência de sobreposição dos controles.
- Seis cenários adicionais da interface OCR: texto vazio, texto sem preço, candidato sintético conhecido, diagnóstico desligado, erro técnico controlado com nova tentativa, e retorno para tirar outra foto. Foram verificados correção do nome, confirmação do valor, opção manual, revogação da URL de imagem e acesso aos controles com o diagnóstico aberto em telas pequenas/retrato e paisagem.

Esses cenários usam vídeo sintético e não validam sensor, foco, exposição, seleção de lente, orientação física ou memória de um celular. Os testes de interface com texto sintético não contam como sucesso nas fotos reais.

## Comparação das seis fotos

Resultados brutos, metadados, hashes e anotações visuais estão em [issue-28-ocr-framing-results.json](issue-28-ocr-framing-results.json). Valores anotados para comparação não são substituídos nos resultados do motor.

Protocolo: o navegador decodifica cada JPEG original com sua orientação EXIF; um vídeo sintético na resolução nativa alimenta a função real `captureVideoFrame`. Baseline e recorte usam JPEG 0,92 e o mesmo Tesseract/PSM 6. Isso evita confundir o defeito EXIF da leitura direta de arquivos com o efeito do recorte. Não é o mesmo protocolo de alimentar os JPEGs originais diretamente ao worker do diagnóstico anterior, portanto os textos podem diferir.

Os controles 01–05 usam limites escolhidos manualmente sobre a foto orientada, apenas para isolar a etiqueta. Coordenadas `[x, y, largura, altura]`: 01 `[150,780,2450,1240]`; 02 `[370,1640,1800,910]`; 03 `[20,780,2770,2050]`; 04 `[650,1170,1910,1000]`; 05 `[1360,1630,670,1130]`. A 06 é uma cena de compras sem alvo único; usa controle central `[320,360,3360,2280]` e não recebe pontuação de acerto de produto/preço.

**Essas regiões não são constantes de produção, nem simulam o alinhamento real de uma etiqueta dentro da moldura no S23.** Fotos da câmera nativa têm 12 MP e processamento distinto do vídeo web. Os originais permaneceram intactos.

| Foto | PSM 6, antes | PSM 6, depois do recorte de controle | Tempo antes → depois |
|---|---|---|---|
| 01 | Sem preço | `71,39`, número incorreto; descrição parcial | 1,24 → 1,47 s |
| 02 | Nome aparece no bruto; `8,33`, referência por litro | Sem preço; perdeu o nome exato no bruto | 1,63 → 0,91 s |
| 03 | Sem preço | Sem preço; texto ruidoso | 9,27 → 3,72 s |
| 04 | `92,12` de caixa, `20,66` e `21,81` de referência/kg | `92,17` e `20,68`, números incorretos | 4,84 → 1,14 s |
| 05 | Sem preço | Sem preço; manuscrito não recuperado | 15,00 → 0,70 s |
| 06 | Sem preço | Sem preço; cena sem alvo único | 20,56 → 18,96 s |

Nenhum dos dois caminhos recuperou integralmente nome, preços de compra e condições nas cinco etiquetas. No recorte/PSM 6, não houve preço de compra exato e surgiram três candidatos numéricos incorretos. Houve regressão de conteúdo na foto 02 e de valores de referência na 04. Tempos são observações individuais deste desktop, incluindo preparação na primeira chamada, e não permitem prometer desempenho no S23.

### Experimento posterior separado: PSM 3 e 11

Depois da comparação de recorte, outro worker do mesmo motor/modelo avaliou os mesmos controles e JPEG 0,92, somente no experimento. Não houve alteração de configuração de produção ou tentativas automáticas adicionais.

| Foto | PSM 3: candidatos / tempo | PSM 11: candidatos / tempo |
|---|---|---|
| 01 | Nenhum / 0,99 s | `1,39` incorreto / 0,92 s |
| 02 | Nenhum / 0,68 s | `8,33`, referência por litro / 0,73 s |
| 03 | Nenhum / 0,52 s | Nenhum / 1,83 s |
| 04 | `92,12`, caixa / 0,49 s | `3,49` correto numericamente, mas tipo `UNKNOWN`; `92,17` incorreto; `20,66` de referência / 1,07 s |
| 05 | Nenhum / 0,09 s | Nenhum / 0,33 s |
| 06 | Nenhum / 0,73 s | Nenhum / 5,12 s |

O PSM 3 recuperou o nome do óleo no texto bruto da 02, mas o parser selecionou outro trecho; o PSM 11 também reconheceu esse nome, porém incluiu condições no nome selecionado. Não houve nome completo exato no produto final dessas execuções. O PSM 11 recuperou um dos nove valores de compra anotados nas cinco fotos e nenhum caso completo de nome/preços/condições; também gerou dois valores numéricos incorretos. Referências por litro/kg/caixa não são contadas como preços de compra. Esses dados não sustentam trocar o PSM global ou escolher automaticamente a tentativa com mais números.

## Revisão técnica e regressões

- O motor, modelo, fila, parser e resolver permanecem separados e sem alteração. Não há fallback que invente preço ou relaxe a leitura monetária.
- A captura recebe a moldura obrigatoriamente; a resolução do resultado reflete o recorte e os metadados de origem permitem auditar o mapeamento.
- O recorte limita o contexto disponível. É obrigatório enquadrar nome, todos os preços, unidades e condições; conteúdo fora da moldura será perdido. O usuário pode refazer a foto e girar o aparelho antes de capturar etiquetas de outras proporções.
- A moldura conserva a proporção do vídeo. Não foi introduzido recorte ajustável ou detector automático de etiqueta. A adequação do tamanho no S23 é parte da validação humana.
- O cabeçalho explicativo reduz a área do preview, especialmente em paisagem. O CSS compacto e os testes verificam acesso aos controles nas telas indicadas; browsers físicos e barras dinâmicas ainda precisam de teste.
- Resultados de OCR não melhoram de forma monotônica com recorte/recompressão. O comportamento observado não autoriza declarar a falha de campo resolvida. Foco/reflexos/manuscrito e os limites do Tesseract continuam relevantes.
- Não foram alteradas regras de promoções, referências por unidade/kg ou canonização do produto. Problemas dessas etapas já diagnosticados permanecem visíveis e não foram mascarados por esta implementação.

## Validação manual no Galaxy S23

1. Disponibilizar esta branch em um ambiente HTTPS de revisão. Confirmar que o navegador/PWA está usando o build deste commit, aplicando a atualização da PWA quando indicada. Registrar versão do Android e se o teste usa Chrome ou Samsung Internet, com suas versões.
2. Abrir `/app?cameraDebug`, permitir câmera e acionar “Escanear”. Selecionar a câmera traseira pelo seletor existente. Verificar se a moldura aparece sobre a imagem e não sobre faixas pretas; os botões devem permanecer acessíveis.
3. Enquadrar uma etiqueta completa e legível, incluindo nome, todos os preços, unidade e condição. Para etiquetas largas, testar também paisagem. Comparar a região dentro da moldura imediatamente antes da captura com a foto recortada apresentada para revisão: nenhum conteúdo externo ou borda branca pode aparecer; conteúdo interno não pode se deslocar.
4. Usar “Tirar novamente”; trocar de câmera/lente quando o navegador disponibilizar outras opções; girar o aparelho enquanto o preview estiver aberto e repetir a captura. Conferir o recorte após cada mudança, inclusive com barras do navegador variando de tamanho.
5. Confirmar a foto. Abrir “Diagnóstico local da leitura” e registrar dimensões de origem/recorte, texto bruto, estado, erro se houver e tempo. Comparar visualmente a imagem do painel com a foto aprovada: é a mesma área enviada ao OCR.
6. Conferir nome, valores e condições contra a etiqueta. Não considerar qualquer número detectado como acerto. Registrar separadamente reconhecimento do texto, valor correto e interpretação correta. Testar correção do nome, escolha de outro candidato, opção manual e edição de nome/preço no formulário antes de adicionar à compra.
7. Repetir com múltiplos preços, referências por kg/litro, etiqueta inclinada e reflexo; depois testar sem `cameraDebug` para confirmar a experiência normal. Se uma leitura falhar, anotar a mensagem literal e a versão usada. O teste deve usar a câmera da Messo; fotografias feitas pelo aplicativo de câmera do telefone são apenas controles diferentes.
8. Enviar os resultados para revisão do responsável. Merge e encerramento da Issue #28 continuam pendentes dessa validação humana. Nenhuma tentativa múltipla, novo motor ou mudança de arquitetura foi ativada.
