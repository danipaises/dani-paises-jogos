# Dani Países — Americas Fighter

Jogo estático em `index.html`, integrado ao portal em `../index.html`.

## Regras

- **Rounds:** melhor de três. Cada round tem 60 segundos; ao acabar, vence a maior porcentagem de vida restante.
- **Vidas:** 3 ou 5 vidas por jogador, sem limite de tempo. Cada KO consome uma vida. Vence quem sobreviver.
- **Tempo:** 60, 120 ou 180 segundos. Vence quem morreu menos. O relógio continua durante os especiais finais e o reaparecimento; fica parado ao pausar.
- Empate no modo de vidas ou tempo: morte súbita. O próximo KO decide; KO duplo mantém o desempate.
- Reaparecimento após KO com 1,2 segundo de proteção, indicado pelo personagem piscando.

## Campanha

Selecione um continente ou o tour completo. São 23 adversários: 12 países da América do Sul e Guiana Francesa como bônus, 7 países da América Central continental, 3 da América do Norte.

Cada rota termina no boss: **Brasil**, **Panamá** e **Estados Unidos**. O boss tem 150 HP, anuncia os especiais e entra em fúria abaixo de metade da vida. O final tira 55% da vida máxima do alvo. Vencer libera o personagem, com progresso salvo no navegador. A animação de viagem usa contornos de países do Natural Earth, incluídos no HTML.

## Comandos

Controles: analógico esquerdo move, X/Y pulam, A ataca, B usa especial (ou final com barra cheia), gatilhos defendem, L/R agarram. Layouts Nintendo, Xbox e PlayStation disponíveis. Analógico direito faz golpes fortes. START pausa.

J1: setas, J ataque, L especial, H agarrar, Shift escudo, K forte, U gancho e I final.
J2: WASD, F ataque, G especial, T agarrar, R escudo, Z/X/Espaço salto, V forte e C final.

Multiplayer local: dois controles, dois teclados no mesmo teclado físico, ou controle + teclado. Celular: paisagem com comandos de toque; eles se escondem quando um controle é detectado.

## Verificação

Execute `node dani-paises-fighter/tests/regression.cjs` na raiz do repositório. A verificação cobre regras, KOs, reaparecimento, proteção, empate, pausa, timer, habilidades, bosses e campanha. Ela simula o DOM e canvas e não substitui teste em hardware.

Geografia: https://www.naturalearthdata.com/downloads/110m-cultural-vectors/110m-admin-0-countries/ (domínio público).
