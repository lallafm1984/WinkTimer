# Agent Instructions

## Android Device Test Install

- After completing a user-requested task that changes app behavior, UI, Android code, JS/TS code, or project configuration, automatically finish with a wireless debug build/install on the physical Android device. Do this without waiting for a separate "wireless build/install" request unless the user explicitly says not to install.
- For test installs on the physical Android device, try wireless ADB first.
- Preferred wireless target: `192.168.0.20:5555`.
- Use the debug APK path for wireless development installs:
  `E:\LimProjects\Time\TimewatchApp\android\app\build\outputs\apk\debug\app-debug.apk`.
- Before installing, run:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb connect 192.168.0.20:5555
& $adb devices -l
```

- Known-good wireless debug build and install flow, from `E:\LimProjects\Time\TimewatchApp`:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
$target = "192.168.0.20:5555"
$apk = "E:\LimProjects\Time\TimewatchApp\android\app\build\outputs\apk\debug\app-debug.apk"

& $adb connect $target
& $adb devices -l
& $adb -s $target reverse tcp:8081 tcp:8081

Push-Location .\android
try {
  .\gradlew.bat :app:assembleDebug
  if ($LASTEXITCODE -ne 0) { exit $LASTEXITCODE }
} finally {
  Pop-Location
}

& $adb -s $target install -r $apk
& $adb -s $target shell pm grant com.timewatchapp android.permission.CAMERA
& $adb -s $target shell am force-stop com.timewatchapp
& $adb -s $target shell am start -n com.timewatchapp/.MainActivity
```

- If `192.168.0.20:5555` is listed as `device` and a fresh APK already exists, install and run through that target:

```powershell
$apk = "E:\LimProjects\Time\TimewatchApp\android\app\build\outputs\apk\debug\app-debug.apk"
& $adb -s 192.168.0.20:5555 reverse tcp:8081 tcp:8081
& $adb -s 192.168.0.20:5555 install -r $apk
& $adb -s 192.168.0.20:5555 shell pm grant com.timewatchapp android.permission.CAMERA
& $adb -s 192.168.0.20:5555 shell am force-stop com.timewatchapp
& $adb -s 192.168.0.20:5555 shell am start -n com.timewatchapp/.MainActivity
```

- `npm run mobile:android -- -DeviceId 192.168.0.20:5555` may fail even when Metro is running because the PowerShell `/status` response can be read as a byte array. If that happens, use the known-good manual flow above instead of falling back to USB.
- To verify the app after install:

```powershell
& $adb -s 192.168.0.20:5555 shell cmd package path com.timewatchapp
& $adb -s 192.168.0.20:5555 shell pidof com.timewatchapp
```

- Use USB install only as a fallback when wireless ADB is unavailable or the phone IP has changed.
- If the wireless IP changes, reconnect with the new `<phone-ip>:5555` target and update this file.
