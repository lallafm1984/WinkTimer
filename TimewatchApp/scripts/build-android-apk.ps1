param(
  [switch]$Clean
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$AndroidRoot = Join-Path $ProjectRoot "android"
$Gradle = Join-Path $AndroidRoot "gradlew.bat"
$ReleaseApk = Join-Path $AndroidRoot "app\build\outputs\apk\release\app-release.apk"
$DistDir = Join-Path $ProjectRoot "dist\android"
$DistApk = Join-Path $DistDir "timewatch-release.apk"

function Write-Step {
  param([string]$Message)
  Write-Host "[timewatch] $Message"
}

function Initialize-AndroidSdkEnvironment {
  $defaultSdk = Join-Path $env:LOCALAPPDATA "Android\Sdk"

  if ((-not $env:ANDROID_HOME) -and (Test-Path $defaultSdk)) {
    $env:ANDROID_HOME = $defaultSdk
  }

  if ((-not $env:ANDROID_SDK_ROOT) -and $env:ANDROID_HOME) {
    $env:ANDROID_SDK_ROOT = $env:ANDROID_HOME
  }
}

function Invoke-Checked {
  param(
    [string]$Label,
    [scriptblock]$Command
  )

  Write-Step $Label
  & $Command
  if ($LASTEXITCODE -ne 0) {
    throw "$Label failed with exit code $LASTEXITCODE."
  }
}

try {
  Set-Location $ProjectRoot
  Initialize-AndroidSdkEnvironment

  if ($Clean) {
    Invoke-Checked "Cleaning Android build outputs" {
      Push-Location $AndroidRoot
      try {
        & $Gradle "clean"
      } finally {
        Pop-Location
      }
    }
  }

  Invoke-Checked "Building standalone release APK" {
    Push-Location $AndroidRoot
    try {
      & $Gradle ":app:assembleRelease"
    } finally {
      Pop-Location
    }
  }

  if (-not (Test-Path $ReleaseApk)) {
    throw "Release APK was not found at $ReleaseApk"
  }

  New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
  Copy-Item -LiteralPath $ReleaseApk -Destination $DistApk -Force

  $apkInfo = Get-Item -LiteralPath $DistApk
  Write-Step "Standalone APK ready: $($apkInfo.FullName)"
  Write-Step "Size: $([Math]::Round($apkInfo.Length / 1MB, 1)) MB"
} catch {
  Write-Host "[timewatch:error] $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
