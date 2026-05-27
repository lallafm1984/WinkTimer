param(
  [string]$ChromePath = "",
  [string]$OutDir = ""
)

$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $MyInvocation.MyCommand.Path
$indexPath = Join-Path $root "index.html"
$outputPath = if ($OutDir) { $OutDir } else { Join-Path $root "output" }
$profilePath = Join-Path $root ".chrome-profile"

New-Item -ItemType Directory -Force -Path $outputPath | Out-Null
New-Item -ItemType Directory -Force -Path $profilePath | Out-Null

if (-not $ChromePath) {
  $candidates = @(
    "$env:ProgramFiles\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles(x86)\Google\Chrome\Application\chrome.exe",
    "$env:ProgramFiles\Microsoft\Edge\Application\msedge.exe",
    "$env:ProgramFiles(x86)\Microsoft\Edge\Application\msedge.exe"
  )

  $ChromePath = $candidates | Where-Object { Test-Path -LiteralPath $_ } | Select-Object -First 1
}

if (-not $ChromePath -or -not (Test-Path -LiteralPath $ChromePath)) {
  throw "Chrome or Edge was not found. Pass -ChromePath with a browser executable path."
}

$slides = @(
  @{ Id = "timer"; File = "01-timer.png" },
  @{ Id = "look"; File = "02-look-pause.png" },
  @{ Id = "wink"; File = "03-wink-control.png" },
  @{ Id = "smile"; File = "04-smile-mode.png" },
  @{ Id = "settings"; File = "05-settings-language.png" }
)

$indexUri = [System.Uri]::new((Resolve-Path -LiteralPath $indexPath).Path).AbsoluteUri

foreach ($slide in $slides) {
  $target = Join-Path $outputPath $slide.File
  $url = "$indexUri`?slide=$($slide.Id)"

  & $ChromePath `
    --headless=new `
    --disable-gpu `
    --hide-scrollbars `
    --force-device-scale-factor=1 `
    --window-size=1080,1920 `
    --virtual-time-budget=1500 `
    --user-data-dir="$profilePath" `
    --screenshot="$target" `
    "$url" | Out-Null

  if ($LASTEXITCODE -ne 0) {
    throw "Failed to capture slide '$($slide.Id)'."
  }

  Write-Host "Captured $target"
}
