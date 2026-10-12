#!/usr/bin/env bash
set -eu
echo 'DANI PAÍSES • INSTALADOR LINUX / TERMUX'
if [ -n "${PREFIX:-}" ] && [ -d "$PREFIX/etc/apt" ]; then
  pkg install -y python
  dp_install_dir="$HOME/dani-paises-fighter"
else
  dp_install_dir="${XDG_DATA_HOME:-$HOME/.local/share}/dani-paises-fighter"
  if ! command -v python3 >/dev/null 2>&1; then
    if command -v apt-get >/dev/null 2>&1; then sudo apt-get update; sudo apt-get install -y python3
    elif command -v dnf >/dev/null 2>&1; then sudo dnf install -y python3
    elif command -v pacman >/dev/null 2>&1; then sudo pacman -S --needed python
    else echo 'Instale Python 3.10 ou mais recente e execute este instalador novamente.'; exit 1; fi
  fi
fi
export DP_INSTALL_DIR="$dp_install_dir"
python3 - <<'PY'
import hashlib, os, pathlib, sys, tempfile, urllib.request, zipfile
if sys.version_info<(3,10):sys.exit('Este servidor requer Python 3.10 ou mais recente.')
url='https://raw.githubusercontent.com/danipaises/dani-paises-jogos/main/dani-paises-fighter/local/dani-fighter-local.zip'
expected='cd1816bec5014397676141e5de4103626c902da86e0433b98ead30e876af52f1'
dest=pathlib.Path(os.environ['DP_INSTALL_DIR'])
print('Baixando o pacote local…')
with tempfile.TemporaryDirectory() as temp:
    archive=pathlib.Path(temp)/'game.zip'
    urllib.request.urlretrieve(url,archive)
    if hashlib.sha256(archive.read_bytes()).hexdigest()!=expected:sys.exit('O pacote mudou. Baixe o instalador atual e tente novamente.')
    with zipfile.ZipFile(archive) as z:
        for item in z.namelist():
            if pathlib.PurePosixPath(item).is_absolute() or '..' in pathlib.PurePosixPath(item).parts:sys.exit('Caminho inválido no pacote.')
        dest.mkdir(parents=True,exist_ok=True);z.extractall(dest)
launcher=dest/'iniciar.sh'
launcher.write_text('#!/usr/bin/env bash\ncd -- "$(dirname -- "$0")"\nexec python3 server.py "$@"\n')
launcher.chmod(0o755)
print('Instalado em:',dest)
print('Para iniciar novamente: bash "'+str(launcher)+'"')
PY
echo 'Iniciando servidor. Abra a TELA PRINCIPAL mostrada abaixo e espelhe na TV.'
if [ -n "${PREFIX:-}" ] && command -v termux-wake-lock >/dev/null 2>&1; then
  termux-wake-lock
  trap 'termux-wake-unlock' EXIT
fi
cd -- "$dp_install_dir"
python3 server.py

