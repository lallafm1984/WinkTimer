# Agent Instructions

## Canonical Product Context

- App name: **Wink Timer**.
- Product category: a **general-purpose timer app**, not a focus-only timer app.
- Core timer concept: the app must work as a normal timer first. **BASIC TIMER** is the baseline mode and should remain usable without camera features.
- Differentiator: optional camera/sensor-assisted modes that other timer apps usually do not have:
  - **LOOK PAUSE**: front-camera face/gaze detection can pause/resume the timer based on whether the user is looking.
  - **WINK CONTROL**: wink gestures can control timer actions.
  - **FLIP TIMER**: device posture can control timer actions.
- Do not frame the whole product as a "focus timer" or "concentration timer." Focus, study, cooking, exercise, accessibility, and hands-free timing are use cases, not the product category.
- Monetization discussions should treat BASIC TIMER as the free/default timer experience and LOOK/WINK/FLIP as premium or rewarded-ad-accessible add-on modes.
- Runtime app identity should use `WinkTimer` / `com.winktimer.app`; the repository folder may still be `TimewatchApp`.

## Android APK Install

- After completing a user-requested task that changes app behavior, UI, Android code, JS/TS code, or project configuration, build and install a release APK on the connected Android device unless the user explicitly says not to install.
- Do not increment `versionCode` or build a release AAB automatically.
- Build the APK from `E:\LimProjects\Time\TimewatchApp`:

```powershell
npm run apk:android
```

- Install and launch the APK:

```powershell
$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
$device = (& $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\tdevice$" } | ForEach-Object { ($_ -split "\s+")[0] } | Select-Object -First 1)
& $adb -s $device install -r "E:\LimProjects\Time\TimewatchApp\dist\android\winktimer-release.apk"
& $adb -s $device shell am force-stop com.winktimer.app
& $adb -s $device shell am start -n com.winktimer.app/.MainActivity
```

- If no Android device is connected or the install fails, report the failure clearly. Do not uninstall the existing app for a clean install unless the user explicitly approves it.

