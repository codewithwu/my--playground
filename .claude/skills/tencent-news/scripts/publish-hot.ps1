# publish-hot.ps1 — Windows wrapper: pipe `hot` CLI output into publish-hot.py.
#
#   Get-Content ... | powershell scripts/publish-hot.ps1

param(
  [string]$Out,
  [string]$Directory = "."
)

$ErrorActionPreference = "Stop"
$scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
$py = Join-Path $scriptDir "publish-hot.py"

$python = $null
foreach ($c in @("python", "python3", "py")) {
  if (Get-Command $c -ErrorAction SilentlyContinue) { $python = $c; break }
}
if (-not $python) {
  Write-Error "publish-hot: 找不到 Python，请安装后重试"
  exit 1
}

$argv = @($py, "--dir", $Directory)
if ($Out) { $argv += @("--out", $Out) }

if ($python -eq "py") { $argv = @("-3") + $argv }

$input | & $python @argv
exit $LASTEXITCODE
