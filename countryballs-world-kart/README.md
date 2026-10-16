# Countryballs World Kart — Copa Mundial

Jogo 3D com oito países, Rio, Paris e Times Square. Esta pasta é independente; o `index.html` da raiz do repositório oferece o acesso pelo portal.

## Modo normal — individual

Abra `countryballs-world-kart/index.html` pelo site do repositório. Não precisa instalar Node.js, iniciar servidor local ou usar Termux. O jogo roda no navegador, com sete adversários, corrida rápida, Copa e contra o tempo. Recursos gráficos e áudio estão incluídos, sem CDN. A PWA pode ser instalada em HTTPS ou localhost e guarda os recursos para uso offline. Não abra o HTML com `file://`: os módulos precisam de uma hospedagem HTTP/HTTPS (por exemplo, o próprio site).

Teclado: WASD/setas, Espaço para salto/drift, E para item, Escape para pausa. Controle padrão: analógico esquerdo, R2/RT acelerar, L2/LT frear, Cruz/A drift, Quadrado/X item, Start pausa. Configurações do modo normal permitem remapear o controle e personalizar botões de toque.

## Modo local — TV e até oito celulares

1. Baixe o repositório e abra esta pasta em um computador com Node.js 22 ou mais recente. No Termux: `pkg install nodejs`.
2. Execute `npm ci`, depois `npm start`. No Windows também pode executar `iniciar-local.bat`; Linux/Termux: `sh iniciar-local.sh`.
3. O terminal mostra o link reservado à **TV**, com `?host=...`. Abra-o no navegador do computador ligado à TV, ou no aparelho cuja tela será espelhada. Para exibir o link correto dos celulares, use o endereço com o IP da rede, não `localhost`.
4. Todos os celulares devem estar na mesma rede Wi-Fi. Cada um abre o endereço `?room=...` mostrado na TV, informa o nome e escolhe um país livre.
5. O primeiro celular é o jogador 1: escolhe pista, dificuldade e corrida rápida/Copa; inicia, pausa, avança as etapas e volta à sala. A TV mostra a corrida em tela dividida, uma câmera por pessoa. As vagas restantes são preenchidas por IA, até oito corredores no total.
6. Na TV, clique uma vez em “Ativar som e tela cheia” para liberar áudio. Durante a corrida, não há menu de configuração sobre a pista.

Se o IP não puder ser detectado automaticamente (pode acontecer no Android), consulte o endereço IPv4 nas informações da rede Wi-Fi do aparelho e substitua `localhost` por ele no link da TV. Permita a porta 8080 no firewall da rede local. Redes de convidados com isolamento entre dispositivos impedem a conexão. HDMI evita o atraso adicional do espelhamento sem fio.

### Celular como controle

Os botões aceitam vários dedos ao mesmo tempo. Comandos seguem por WebSocket a 30 Hz; a física da TV usa passos fixos de 60 Hz. Entradas sem atualização por 500 ms são liberadas. Não se acumula uma fila de comandos antigos para reproduzir depois.

Ao detectar um gamepad, a tela oculta os botões e mostra “Use agora o seu controle”. Para teclado, a troca ocorre ao pressionar uma tecla de direção, aceleração, drift ou item; navegadores não oferecem uma detecção universal da conexão física de teclados. “Usar toque” permite retornar manualmente. Na desconexão de gamepad, o toque volta. Alguns navegadores só expõem o controle depois de apertar um botão.

**Gamepad em rede local:** navegadores podem exigir HTTPS para a Gamepad API. Toque e teclado funcionam pelo HTTP local. Para gamepad onde essa restrição existir, use um certificado HTTPS confiável nos celulares e inicie o servidor com `TLS_CERT` e `TLS_KEY` apontando para os arquivos PEM:

```sh
TLS_CERT=/caminho/cert.pem TLS_KEY=/caminho/key.pem npm start
```

O certificado precisa ser válido/confiável para o nome ou IP acessado; simplesmente ignorar um alerta de certificado pode não liberar a API. Referência: https://developer.mozilla.org/en-US/docs/Web/API/GamepadEvent/gamepad .

### Reconexão e sala

O mesmo celular pode reconectar/recarregar na mesma aba, recuperando a vaga via sessionStorage. O kart para quando não recebe comandos. Entradas novas só são aceitas na sala antes da corrida; o limite é oito. Só o jogador 1 organiza. O link da TV deve ficar com o organizador; os jogadores recebem o link da sala. Não publique a porta do servidor na internet.

Voltar à sala mantém os participantes. Para zerar vagas e trocar o jogador 1, encerre e reinicie o servidor; novos links serão gerados. Se a TV recarregar ou desconectar, a corrida em andamento é perdida; a sala retorna ao início. O jogador 1 pode voltar à sala se alguém abandonar antes de terminar. Resultados locais da Copa duram a sessão; os recordes persistentes do modo normal permanecem separados.

## Arquitetura

- `js/core.js`: física, IA, itens, voltas e posições; aceita um mapa independente de controles humanos.
- `js/render.js`: cenário Three.js, câmera individual e renderização dividida em um único contexto WebGL.
- `js/app.js`: experiência individual original.
- `js/local.js`, `local.html`, `local.css`: sala, TV, celulares, Copa local e reconexão.
- `server.mjs`: arquivos HTTP/HTTPS e relay WebSocket autenticado. A simulação roda na TV; o servidor encaminha entradas.
- `vendor/`: Three.js incluído e sua licença. `ws` é a única dependência do servidor, instalada por `npm ci`.

## Verificação e limites

Execute `npm test` para testes de corrida, itens, entradas, cenários, persistência e protocolo local. Os testes de oito entradas usam um piloto automatizado na interface de controle para verificar conclusão e checkpoints; não substituem uma sessão com oito pessoas.

Ainda é necessário validar aparência e desempenho em TV/celulares reais, controles Bluetooth/USB físicos, áudio e HTTPS em cada navegador. Oito câmeras aumentam a carga gráfica; o modo TV usa qualidade baixa. Não há garantia de 30/60 FPS em aparelhos intermediários com oito telas. O modo local não tem personalização de posição dos botões ou remapeamento próprio; usa o mapeamento padrão acima. A configuração avançada permanece no modo normal.
