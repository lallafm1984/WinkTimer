# TimewatchApp

React Native Android app for Timewatch.

## Quick Mobile Check

Use a real Android phone for camera permission and native module checks. Expo Go is not used for the main development loop because the gaze detection path needs the app's own native Android shell.

Prerequisites:

- Android Studio / Android SDK installed
- USB debugging enabled on the phone
- Phone authorized in `adb devices`

Run from this directory:

```sh
npm run mobile:android
```

The command:

- starts Metro in the background if it is not already running
- runs `adb reverse tcp:8081 tcp:8081`
- builds `app-debug.apk`
- installs it on the connected phone
- grants `android.permission.CAMERA`
- launches `com.timewatchapp/.MainActivity`

## Standalone APK

Use this when you want to install an APK file directly without Metro.

```sh
npm run apk:android
```

The standalone APK is copied here:

```text
dist/android/timewatch-release.apk
```

The debug APK at `android/app/build/outputs/apk/debug/app-debug.apk` is for React Native development and expects Metro or `adb reverse tcp:8081 tcp:8081`. If you install that file directly, Android can show `Unable to load script`.

## Focus Wink Design System

The main timer screen uses the Arcade Ghost Console theme:

- Timer format: `MM:SS.CS`
- Default mode shown first: Look Pause
- Mascot states: ready, looking, left wink, right wink, wink hold, reset flash
- Single wink mode is marked as Beta in the UI

Design-system verification:

```powershell
npm test -- --runInBand
npx tsc --noEmit
npm run lint
npm run apk:android
```

## Gaze Detection

Watch mode uses the Android front camera through CameraX and ML Kit Face Detection. When the timer starts, Android asks for camera permission. Allow it, then look toward the screen to trigger the watch pause behavior.

The current detection is face-orientation based. It treats a front-facing face as `looking` even when the eyes are closed, and no face or a turned-away face as `notLooking`.

Head tilt is allowed up to about 45 degrees, so tilting your head left or right should still pause the timer as long as your face remains directed toward the front camera.

If both eyes are detectable and exactly one eye stays closed for 3 seconds, the active timer resets once. Keeping the same eye closed will not repeatedly reset the timer; open both eyes or move out of the one-eye-closed state before triggering it again.

If more than one Android device is connected:

```sh
npm run mobile:android -- -DeviceId <adb-device-id>
```

If you need to restart Metro:

```sh
npm run mobile:android -- -RestartMetro
```

If the install fails because an app with a different signature is already installed:

```sh
npm run mobile:android -- -CleanInstall
```

## Manual Commands

Start Metro:

```sh
npm start
```

Build and run with the React Native CLI:

```sh
npm run android
```

## Verification

```sh
npm test -- --runInBand
npx tsc --noEmit
npm run lint
```

For Android build verification:

```sh
cd android
.\gradlew.bat :app:assembleDebug
```
