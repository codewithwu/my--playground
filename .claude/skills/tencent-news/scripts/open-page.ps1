# open-page.ps1 — Serve the hot-news page locally and open it in Google Chrome.
#
# The page loads hot-news.json with fetch(), which browsers block on file://,
# so it has to be reached over http://.
#
#   powershell scripts/open-page.ps1 [-Page page.html] [-Directory .]

param(
  [string]$Page = "hot-news.html",
  [string]$Directory = "",
  [int]$Port = 8765
)

$ErrorActionPreference = "Stop"

if (-not (Test-Path $Page)) { Write-Error "open-page: 找不到页面：$Page"; exit 1 }

if (-not $Directory) { $Directory = Split-Path -Parent (Resolve-Path $Page) }
$name = Split-Path -Leaf $Page
$url = "http://localhost:$Port/$name"

function Test-Serving {
  try { return (Invoke-WebRequest -Uri $url -UseBasicParsing -TimeoutSec 2).StatusCode -eq 200 }
  catch { return $false }
}

if (-not (Test-Serving)) {
  $python = $null
  foreach ($c in @("python", "python3")) {
    if (Get-Command $c -ErrorAction SilentlyContinue) { $python = $c; break }
  }
  if (-not $python) { Write-Error "open-page: 找不到 Python 来启动本地服务器"; exit 1 }

  Start-Process $python `
    -ArgumentList @("-m", "http.server", "$Port", "--bind", "0.0.0.0", "--directory", $Directory) `
    -WindowStyle Hidden

  for ($i = 0; $i -lt 30; $i++) {
    if (Test-Serving) { break }
    Start-Sleep -Milliseconds 100
  }
  if (-not (Test-Serving)) { Write-Error "open-page: 本地服务器启动失败：$url"; exit 1 }
}

Write-Output "open-page: $url"

$chrome = @(
  "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
  "${env:ProgramFiles(x86)}\Google\Chrome\Application\chrome.exe",
  "$env:LOCALAPPDATA\Google\Chrome\Application\chrome.exe"
) | Where-Object { $_ -and (Test-Path $_) } | Select-Object -First 1

if ($chrome) {
  Start-Process $chrome $url
  Write-Output "open-page: 已用 Chrome 打开"
} else {
  Start-Process $url
  Write-Output "open-page: 未找到 Chrome，已用系统默认浏览器打开"
}
