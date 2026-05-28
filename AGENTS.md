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

## Android Release AAB Build

- After completing a user-requested task that changes app behavior, UI, Android code, JS/TS code, or project configuration, finish by incrementing `versionCode` in `E:\LimProjects\Time\TimewatchApp\android\app\build.gradle` and building a release AAB unless the user explicitly says not to build.
- Put release AAB artifacts under:
  `E:\LimProjects\Time\TimewatchApp\dist\android`
- Build from `E:\LimProjects\Time\TimewatchApp\android`:

```powershell
.\gradlew.bat :app:bundleRelease
```

- After a successful build, copy the generated AAB:

```powershell
$versionCode = Select-String -Path "E:\LimProjects\Time\TimewatchApp\android\app\build.gradle" -Pattern "versionCode\s+(\d+)" | ForEach-Object { $_.Matches[0].Groups[1].Value }
$dist = "E:\LimProjects\Time\TimewatchApp\dist\android"
New-Item -ItemType Directory -Force -Path $dist | Out-Null
Copy-Item -LiteralPath "E:\LimProjects\Time\TimewatchApp\android\app\build\outputs\bundle\release\app-release.aab" -Destination "$dist\winktimer-release-v$versionCode.aab" -Force
```

- If release signing properties are missing or the release build fails, report the failure clearly and do not fall back to a debug install.

