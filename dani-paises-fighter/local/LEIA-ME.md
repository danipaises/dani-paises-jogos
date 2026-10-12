# Dani Países • TV e controles na rede local

O servidor funciona em Windows, Linux e Android com Termux. Python 3.10+ é o único runtime; o pacote inclui a biblioteca de QR code e todos os arquivos do jogo. Depois da primeira instalação, não depende de internet ou de serviços externos.

## Instalação

- **Linux e Termux:** execute `bash install.sh`. O mesmo instalador detecta Termux. Ele instala Python quando necessário, baixa e verifica o pacote e abre o servidor.
- **Windows:** execute `install-windows.ps1` com PowerShell. Se scripts baixados estiverem bloqueados, abra PowerShell na pasta do arquivo e use `powershell -ExecutionPolicy Bypass -File .\install-windows.ps1`. O script instala Python via winget quando possível e cria um atalho na área de trabalho.
- **Pacote ZIP:** extraia e execute `python3 server.py` no Linux/Termux ou `py -3 server.py` no Windows. O QR code já vem incluído; não é necessário pip.

No Termux, deixe o processo aberto e desative a otimização de bateria para ele. Se o instalador conseguir, ativa o wake lock enquanto o servidor roda. Não feche o terminal durante o jogo.

## TV e QR code

1. Abra o endereço **TELA PRINCIPAL** mostrado no terminal do servidor.
2. Espelhe esta tela na TV com o recurso do celular, ou abra o segundo endereço em um navegador de TV/computador na mesma rede. Não abra duas telas principais simultaneamente.
3. A TV mostra um lobby simples com QR code e participantes. Os celulares escaneiam e entram com nome e personagem. O primeiro celular que entrar será o jogador 1 e terá a aba Organizar.
4. Todos os aparelhos ficam no mesmo Wi-Fi. Redes de convidados que isolam aparelhos podem bloquear a conexão.
5. No celular do jogador 1, abra Organizar, selecione jogadores e inicie. Formato, regras, torneios, pausa e próxima partida ficam nesse celular. Na TV aparecem apenas lobby, jogo e resultados; quem entra pelo QR usa o celular como controle.

Ao espelhar a tela inteira de um celular, tudo que aparecer nele também aparece na TV. Para manter o painel privado do jogador 1 separado, use outro celular como controle de J1, ou abra a tela principal no navegador da TV e o controle no celular servidor.

O pacote não implementa Chromecast/Miracast. Use o espelhamento disponível no seu aparelho/TV, um receptor compatível ou o navegador da TV. No celular servidor, a tela principal pode usar touchscreen, controle físico ou só mostrar o jogo. Cadastre essa opção no celular de J1, em **Organizar → Controle físico ou teclado na tela principal**. Teclados e gamepads se conectam ao aparelho da tela principal; celulares remotos usam os botões do navegador.

## Partidas e torneios

- Duelo para 2 jogadores.
- Todos contra todos para 4.
- Equipes 2 × 2: J1/J3 azuis; J2/J4 vermelhos.
- Campanha em dupla: dois jogadores contra o computador, com rotas das Américas e bosses Brasil, Panamá e EUA.
- Rounds, 3/5 vidas ou tempo de 1/2/3 minutos. Vence quem morre menos no modo tempo.
- Todos os personagens estão liberados na versão local.
- Mata-mata e liga para 2–32 participantes, com duelos por rodada. Liga: vitória 3, empate 1, derrota 0. Empates da liga são permitidos em partidas por tempo; nos outros formatos há desempate. Em igualdade de pontos, compara vitórias; se continuar igual, o painel mostra líderes empatados.
- Jogadores aguardando continuam com os celulares no lobby. O celular de J1 escolhe a próxima partida.
- Inputs antigos expiram em 400 ms. Desconexão de celular durante a partida pausa o jogo, e o anfitrião continua depois da reconexão.
- Torneios são guardados no navegador da tela principal enquanto a mesma sala do servidor existir. Ao recarregar a tela, a partida em andamento recomeça; resultados já registrados continuam. Reiniciar o servidor cria outra sala.

## Resolver conexão

Se o QR mostrar um IP incorreto, escolha outro no campo Endereço da rede. Ou execute `python3 server.py --ip 192.168.1.100` usando o IP real do servidor no Wi-Fi. Se a porta 8765 estiver ocupada, feche o outro servidor ou use `--port 8766`. Não precisa abrir portas no roteador. No Windows, permita o servidor na rede privada.

O navegador da tela principal faz a simulação e desenho do jogo; o servidor retransmite os comandos locais. A fluidez depende do aparelho principal, do Wi-Fi e do atraso do espelhamento. Prefira conexão direta da tela quando disponível.

QR: python-qrcode 8.2 (BSD), licença incluída em vendor. Mapas: Natural Earth, domínio público.

