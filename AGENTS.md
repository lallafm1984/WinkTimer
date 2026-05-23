# Agent Instructions

## Android Device Test Install

- For test installs on the physical Android device, try wireless ADB first.
- Preferred wireless target: `192.168.0.20:5555`.
- Before installing, run:

```powershell
$adb = "$env:LOCALAPPDATA\Android\Sdk\platform-tools\adb.exe"
& $adb connect 192.168.0.20:5555
& $adb devices -l
```

- If `192.168.0.20:5555` is listed as `device`, install and run through that target:

```powershell
$apk = "E:\LimProjects\Time\TimewatchApp\android\app\build\outputs\apk\debug\app-debug.apk"
& $adb -s 192.168.0.20:5555 reverse tcp:8081 tcp:8081
& $adb -s 192.168.0.20:5555 install -r $apk
& $adb -s 192.168.0.20:5555 shell pm grant com.timewatchapp android.permission.CAMERA
& $adb -s 192.168.0.20:5555 shell am force-stop com.timewatchapp
& $adb -s 192.168.0.20:5555 shell am start -n com.timewatchapp/.MainActivity
```

- Use USB install only as a fallback when wireless ADB is unavailable or the phone IP has changed.
- If the wireless IP changes, reconnect with the new `<phone-ip>:5555` target and update this file.
