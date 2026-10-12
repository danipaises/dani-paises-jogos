$ErrorActionPreference = 'Stop'
Write-Host 'DANI PAISES • INSTALADOR WINDOWS'
$python = Get-Command py -ErrorAction SilentlyContinue
if (-not $python) { $python = Get-Command python -ErrorAction SilentlyContinue }
if (-not $python) {
  if (-not (Get-Command winget -ErrorAction SilentlyContinue)) { throw 'Instale Python 3.10 ou mais recente de python.org e execute novamente.' }
  winget install --id Python.Python.3.13 --exact --accept-source-agreements --accept-package-agreements
  $env:Path = [Environment]::GetEnvironmentVariable('Path','User') + ';' + [Environment]::GetEnvironmentVariable('Path','Machine')
  $python = Get-Command py -ErrorAction SilentlyContinue
  if (-not $python) { $python = Get-Command python -ErrorAction SilentlyContinue }
  if (-not $python) { throw 'O Python foi instalado. Feche e abra o PowerShell e execute este instalador novamente.' }
}
$installDir = Join-Path $env:LOCALAPPDATA 'DaniPaisesFighter'
$archive = Join-Path $env:TEMP 'dani-fighter-local.zip'
Invoke-WebRequest 'https://raw.githubusercontent.com/danipaises/dani-paises-jogos/main/dani-paises-fighter/local/dani-fighter-local.zip' -OutFile $archive
if ((Get-FileHash $archive -Algorithm SHA256).Hash.ToLower() -ne 'cd1816bec5014397676141e5de4103626c902da86e0433b98ead30e876af52f1') { throw 'Pacote alterado. Baixe o instalador atual e tente novamente.' }
New-Item -ItemType Directory -Path $installDir -Force | Out-Null
Expand-Archive $archive -DestinationPath $installDir -Force
$runner = if ($python.Name -eq 'py.exe') { 'py -3' } else { 'python' }
$launch = "@echo off`r`ncd /d `"$installDir`"`r`n$runner server.py`r`npause`r`n"
Set-Content (Join-Path $installDir 'Iniciar-Dani-Paises.cmd') $launch
Set-Content (Join-Path ([Environment]::GetFolderPath('Desktop')) 'Iniciar-Dani-Paises.cmd') $launch
Write-Host 'Instalado. Use Iniciar-Dani-Paises na area de trabalho.'
Write-Host 'Na primeira execucao, permita acesso pela rede privada se o Windows perguntar.'
Set-Location $installDir
if ($python.Name -eq 'py.exe') { & $python.Source -3 server.py } else { & $python.Source server.py }

