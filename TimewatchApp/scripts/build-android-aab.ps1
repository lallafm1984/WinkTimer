param(
  [switch]$Clean,
  [switch]$UseTestAds
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$AndroidRoot = Join-Path $ProjectRoot "android"
$Gradle = Join-Path $AndroidRoot "gradlew.bat"
$ReleaseAab = Join-Path $AndroidRoot "app\build\outputs\bundle\release\app-release.aab"
$DistDir = Join-Path $ProjectRoot "dist\android"
$DistAabName = if ($UseTestAds) { "winktimer-internal-test-ads.aab" } else { "winktimer-release.aab" }
$DistAab = Join-Path $DistDir $DistAabName
$AdMobEnvironmentFile = Join-Path $ProjectRoot "src\ads\adMobEnvironment.ts"
$OriginalAdMobEnvironment = $null

function Write-Step {
  param([string]$Message)
  Write-Host "[winktimer] $Message"
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

function Set-AdMobEnvironment {
  param([bool]$ForceTestAds)

  $value = if ($ForceTestAds) { "true" } else { "false" }
  Set-Content `
    -LiteralPath $AdMobEnvironmentFile `
    -Value "export const FORCE_TEST_ADS = $value;" `
    -Encoding UTF8
}

try {
  Set-Location $ProjectRoot
  Initialize-AndroidSdkEnvironment
  $OriginalAdMobEnvironment = Get-Content -LiteralPath $AdMobEnvironmentFile -Raw
  Set-AdMobEnvironment $UseTestAds

  if ($UseTestAds) {
    Write-Step "Forcing Google test ad units for this AAB"
  }

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

  Invoke-Checked "Building signed release AAB" {
    Push-Location $AndroidRoot
    try {
      & $Gradle ":app:bundleRelease"
    } finally {
      Pop-Location
    }
  }

  if (-not (Test-Path $ReleaseAab)) {
    throw "Release AAB was not found at $ReleaseAab"
  }

  New-Item -ItemType Directory -Force -Path $DistDir | Out-Null
  Copy-Item -LiteralPath $ReleaseAab -Destination $DistAab -Force

  $aabInfo = Get-Item -LiteralPath $DistAab
  Write-Step "Release AAB ready: $($aabInfo.FullName)"
  Write-Step "Size: $([Math]::Round($aabInfo.Length / 1MB, 1)) MB"
} catch {
  Write-Host "[winktimer:error] $($_.Exception.Message)" -ForegroundColor Red
  exit 1
} finally {
  if ($null -ne $OriginalAdMobEnvironment) {
    Set-Content `
      -LiteralPath $AdMobEnvironmentFile `
      -Value $OriginalAdMobEnvironment `
      -Encoding UTF8
  }
}
