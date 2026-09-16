# Mosca Cerebral Países — modo real local

O site público continua usando a rede demonstrativa pequena para abrir rápido em celular e computador.

O **Modo Real Local** permite carregar arquivos científicos que já estão no seu aparelho. Esses arquivos são lidos pelo navegador e não são enviados ao Cloudflare, GitHub ou a outro backend.

## O que funciona diretamente

### 1. Esqueletos de neurônios reais (`.swc`)

A MaleCNS/Janelia disponibiliza esqueletos de neurônios em formato SWC. Você pode selecionar um ou vários arquivos `.swc`, ou escolher uma pasta que contenha esses arquivos.

O navegador desenha a morfologia real em projeção XY, XZ ou YZ.

> Isso representa a morfologia real do neurônio. Não significa que o navegador esteja reproduzindo toda a dinâmica biológica da célula.

## Conectividade real

A conectividade completa MaleCNS v1.0 é distribuída principalmente em Apache Arrow Feather. O arquivo completo é grande demais para ser uma dependência normal do site público.

Por isso, o modo local aceita um **pack JSON pequeno**, preparado no próprio computador a partir do Feather oficial.

Formato aceito:

```json
{
  "meta": {
    "source": "MaleCNS v1.0",
    "scientific": true
  },
  "nodes": [
    {"id":"12781", "label":"DNge104_R", "x":0.1, "y":0.3},
    {"id":"556329", "label":"DNge104_L", "x":0.8, "y":0.6}
  ],
  "edges": [
    ["12781", "556329", 12]
  ]
}
```

O terceiro valor de cada conexão é o peso/número de sinapses da conexão.

## Gerar um pack real no computador

Há um utilitário em:

`tools/build-real-pack.py`

Ele recebe o arquivo oficial de pesos, o arquivo de anotações e uma lista de IDs de neurônios.

Instale apenas Python nativo e as bibliotecas necessárias:

```bash
pip install pyarrow numpy
```

Exemplo:

```bash
python tools/build-real-pack.py ^
  --weights "connectome-weights-male-cns-v1.0-minconf-0.5.feather" ^
  --annotations "body-annotations-male-cns-v1.0-minconf-0.5.feather" ^
  --ids "12781,556329" ^
  --out "meu-pack-real.json"
```

No Linux/macOS, use `\` em vez de `^` para quebrar linhas, ou escreva tudo em uma linha só.

Depois abra o Mosca Cerebral Países, vá em **Dados reais** e selecione `meu-pack-real.json`.

## Estrutura recomendada para teste local

Você pode organizar seus downloads assim:

```text
Mosca-Cerebral-Paises/
├── index.html
├── app.js
├── real-loader.js
├── data/
│   └── flybrain-demo.json
└── meus-dados-reais/
    ├── 12781.swc
    ├── 556329.swc
    └── meu-pack-real.json
```

A pasta `meus-dados-reais` não precisa ir para o GitHub.

## Sobre os modos Vida e Simulador

O modo real desta versão serve para **visualizar neurônios e conectividade reais localmente**. Os modos `Vida`, `Simulador`, `Laboratório` e `Evolução` continuam usando o controlador demonstrativo por padrão.

Uma próxima etapa pode ligar um pack de conectividade real ao motor de propagação de sinais. Mesmo assim, esse motor continuará sendo um modelo computacional sobre o conectoma, e não uma reprodução completa de toda a biofísica do cérebro vivo.

## Fonte científica

Dataset: **MaleCNS v1.0 — HHMI Janelia / colaboradores, incluindo Google Research**.

Página oficial: `https://male-cns.janelia.org/download/`

O dataset MaleCNS é disponibilizado sob licença CC-BY; consulte a página oficial para detalhes e atribuição.