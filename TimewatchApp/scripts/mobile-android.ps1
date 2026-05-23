param(
  [string]$DeviceId = "",
  [switch]$RestartMetro,
  [switch]$CleanInstall
)

$ErrorActionPreference = "Stop"

$ProjectRoot = Resolve-Path (Join-Path $PSScriptRoot "..")
$MetroPort = 8081
$PackageName = "com.timewatchapp"
$MainActivity = "com.timewatchapp/.MainActivity"

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

function Resolve-AdbPath {
  $candidate = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
  if (Test-Path $candidate) {
    return $candidate
  }

  if ($env:ANDROID_HOME) {
    $androidHomeAdb = Join-Path $env:ANDROID_HOME "platform-tools\adb.exe"
    if (Test-Path $androidHomeAdb) {
      return $androidHomeAdb
    }
  }

  return "adb"
}

function Get-DeviceId {
  param([string]$AdbPath, [string]$RequestedDeviceId)

  $rawDevices = & $AdbPath devices
  if ($LASTEXITCODE -ne 0) {
    throw "adb devices failed. Check Android SDK platform-tools installation."
  }

  $devices = $rawDevices |
    Select-Object -Skip 1 |
    Where-Object { $_ -match "\tdevice$" } |
    ForEach-Object { ($_ -split "\s+")[0] }

  if ($RequestedDeviceId) {
    if ($devices -notcontains $RequestedDeviceId) {
      throw "Requested device '$RequestedDeviceId' is not connected. Connected devices: $($devices -join ', ')"
    }
    return $RequestedDeviceId
  }

  if ($devices.Count -eq 0) {
    throw "No Android device is connected. Enable USB debugging and run 'adb devices' to authorize the phone."
  }

  if ($devices.Count -gt 1) {
    throw "Multiple Android devices are connected. Re-run with: npm run mobile:android -- -DeviceId $($devices[0])"
  }

  return $devices[0]
}

function Test-MetroRunning {
  try {
    $response = Invoke-WebRequest -UseBasicParsing -Uri "http://localhost:$MetroPort/status" -TimeoutSec 3
    return ($response.StatusCode -eq 200 -and $response.Content -match "packager-status:running")
  } catch {
    return $false
  }
}

function Stop-MetroOnPort {
  $connections = Get-NetTCPConnection -LocalPort $MetroPort -ErrorAction SilentlyContinue
  $processIds = $connections | Select-Object -ExpandProperty OwningProcess -Unique
  foreach ($processId in $processIds) {
    Stop-Process -Id $processId -Force -ErrorAction SilentlyContinue
  }
}

function Start-MetroIfNeeded {
  if ($RestartMetro) {
    Write-Step "Stopping existing Metro on port $MetroPort"
    Stop-MetroOnPort
    Start-Sleep -Seconds 2
  }

  if (Test-MetroRunning) {
    Write-Step "Metro is already running on port $MetroPort"
    return
  }

  Write-Step "Starting Metro in the background"
  $stdout = Join-Path $ProjectRoot "metro-mobile.log"
  $stderr = Join-Path $ProjectRoot "metro-mobile.err.log"
  $pidFile = Join-Path $ProjectRoot ".metro-mobile.pid"
  Remove-Item -LiteralPath $stdout, $stderr, $pidFile -ErrorAction SilentlyContinue

  $process = Start-Process `
    -FilePath "cmd.exe" `
    -ArgumentList @("/c", "npm run start") `
    -WorkingDirectory $ProjectRoot `
    -WindowStyle Hidden `
    -RedirectStandardOutput $stdout `
    -RedirectStandardError $stderr `
    -PassThru

  $process.Id | Set-Content -LiteralPath $pidFile

  for ($attempt = 1; $attempt -le 40; $attempt++) {
    if (Test-MetroRunning) {
      Write-Step "Metro is ready on port $MetroPort"
      return
    }
    Start-Sleep -Seconds 1
  }

  Write-Host "----- metro stdout tail -----"
  Get-Content -LiteralPath $stdout -Tail 80 -ErrorAction SilentlyContinue
  Write-Host "----- metro stderr tail -----"
  Get-Content -LiteralPath $stderr -Tail 80 -ErrorAction SilentlyContinue
  throw "Metro did not start on port $MetroPort."
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

  $adb = Resolve-AdbPath
  $device = Get-DeviceId -AdbPath $adb -RequestedDeviceId $DeviceId
  $adbTarget = @("-s", $device)

  Write-Step "Using Android device $device"
  Start-MetroIfNeeded

  Invoke-Checked "Configuring adb reverse tcp:8081 tcp:8081" {
    & $adb @adbTarget reverse tcp:8081 tcp:8081
  }

  $gradle = Join-Path $ProjectRoot "android\gradlew.bat"
  Invoke-Checked "Building debug APK" {
    Push-Location (Join-Path $ProjectRoot "android")
    try {
      & $gradle ":app:assembleDebug"
    } finally {
      Pop-Location
    }
  }

  $apk = Join-Path $ProjectRoot "android\app\build\outputs\apk\debug\app-debug.apk"
  if (-not (Test-Path $apk)) {
    throw "Debug APK was not found at $apk"
  }

  if ($CleanInstall) {
    Write-Step "Removing existing app before clean install"
    & $adb @adbTarget uninstall $PackageName | Out-Null
  }

  Invoke-Checked "Installing app-debug.apk" {
    & $adb @adbTarget install -r $apk
  }

  Write-Step "Granting camera permission"
  & $adb @adbTarget shell pm grant com.timewatchapp android.permission.CAMERA
  if ($LASTEXITCODE -ne 0) {
    Write-Warning "Camera permission grant failed. You can still grant it from Android Settings."
  }

  Write-Step "Launching Timewatch"
  & $adb @adbTarget shell am force-stop $PackageName | Out-Null
  Invoke-Checked "Starting MainActivity" {
    & $adb @adbTarget shell am start -n com.timewatchapp/.MainActivity
  }

  Write-Step "Mobile Android verification environment is ready."
} catch {
  Write-Host "[timewatch:error] $($_.Exception.Message)" -ForegroundColor Red
  exit 1
}
