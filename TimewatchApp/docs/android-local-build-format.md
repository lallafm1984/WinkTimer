# Android Local Build Format

이 문서는 Wink Timer의 로컬 Android 빌드 형식을 다른 React Native Android 프로젝트에 옮겨 쓸 수 있도록 정리한 것이다.

핵심 원칙은 로컬 확인과 기기 설치에는 release APK를 기본으로 쓰고, Play Console 업로드가 필요한 때만 AAB를 만든다는 점이다. APK 빌드는 `assembleRelease`, AAB 빌드는 `bundleRelease`로 분리되어 있고, 둘 다 프로젝트 안의 Gradle wrapper를 직접 호출한다.

## Commands

모든 명령은 `E:\LimProjects\Time\TimewatchApp`에서 실행한다.

```powershell
npm run apk:android
```

기기 설치용 standalone release APK를 만든다.

```text
dist/android/winktimer-release.apk
```

```powershell
npm run aab:android
```

Play 업로드용 signed release AAB를 만든다.

```text
dist/android/winktimer-release.aab
```

```powershell
npm run aab:android:testads
```

내부 확인용 test ad AAB를 만든다.

```text
dist/android/winktimer-internal-test-ads.aab
```

각 PowerShell 스크립트는 `-Clean`을 받을 수 있다. 예를 들어 캐시 영향이 의심될 때만 아래처럼 직접 실행한다.

```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-apk.ps1 -Clean
powershell -ExecutionPolicy Bypass -File .\scripts\build-android-aab.ps1 -Clean
```

## Script Shape

`package.json`은 짧은 npm alias만 제공한다.

```json
{
  "scripts": {
    "aab:android": "powershell -ExecutionPolicy Bypass -File ./scripts/build-android-aab.ps1",
    "aab:android:testads": "powershell -ExecutionPolicy Bypass -File ./scripts/build-android-aab.ps1 -UseTestAds",
    "apk:android": "powershell -ExecutionPolicy Bypass -File ./scripts/build-android-apk.ps1"
  }
}
```

`scripts/build-android-apk.ps1`의 역할:

- `ANDROID_HOME` / `ANDROID_SDK_ROOT`가 없으면 `%LOCALAPPDATA%\Android\Sdk`를 기본값으로 잡는다.
- `android\gradlew.bat :app:assembleRelease`를 실행한다.
- `android\app\build\outputs\apk\release\app-release.apk`를 `dist\android\winktimer-release.apk`로 복사한다.
- APK 경로와 크기를 출력한다.

`scripts/build-android-aab.ps1`의 역할:

- `ANDROID_HOME` / `ANDROID_SDK_ROOT`가 없으면 `%LOCALAPPDATA%\Android\Sdk`를 기본값으로 잡는다.
- 기본값은 production ad 설정으로 빌드한다.
- `-UseTestAds`가 들어오면 빌드 중에만 `src\ads\adMobEnvironment.ts`의 `FORCE_TEST_ADS`를 `true`로 바꾸고, `finally`에서 원래 내용을 복구한다.
- `android\gradlew.bat :app:bundleRelease`를 실행한다.
- `android\app\build\outputs\bundle\release\app-release.aab`를 `dist\android\winktimer-release.aab` 또는 `dist\android\winktimer-internal-test-ads.aab`로 복사한다.
- AAB 경로와 크기를 출력한다.

## Signing Boundary

Release APK와 release AAB는 둘 다 `android/app/build.gradle`의 release signing config를 요구한다.

Gradle property 이름:

- `WINKTIMER_UPLOAD_STORE_FILE`
- `WINKTIMER_UPLOAD_KEY_ALIAS`
- `WINKTIMER_UPLOAD_STORE_PASSWORD`
- `WINKTIMER_UPLOAD_KEY_PASSWORD`

보통 `~/.gradle/gradle.properties`에 둔다. 값이 없으면 `:app:assembleRelease`, `:app:bundleRelease`, `:app:installRelease`, `:app:packageRelease`가 바로 실패하도록 되어 있다. 이 프로젝트의 release 산출물은 debug keystore로 만든 테스트 파일이 아니라 Play upload key 계열의 release signing을 전제로 한다.

## Local Device Loop

앱 동작, UI, Android native code, JS/TS, project config를 확인할 때는 AAB 대신 APK를 만든 뒤 설치한다.

```powershell
npm run apk:android

$adb = Join-Path $env:LOCALAPPDATA "Android\Sdk\platform-tools\adb.exe"
$device = (& $adb devices | Select-Object -Skip 1 | Where-Object { $_ -match "\tdevice$" } | ForEach-Object { ($_ -split "\s+")[0] } | Select-Object -First 1)
& $adb -s $device install -r "E:\LimProjects\Time\TimewatchApp\dist\android\winktimer-release.apk"
& $adb -s $device shell am force-stop com.winktimer.app
& $adb -s $device shell am start -n com.winktimer.app/.MainActivity
```

이 루프는 Metro가 필요 없는 standalone release APK를 설치한다. React Native debug APK를 직접 설치하면 Metro 연결이 없을 때 `Unable to load script`가 날 수 있으므로 로컬 기기 검증에는 `dist/android/winktimer-release.apk`를 사용한다.

## AAB Verification

AAB는 Play 업로드, versionCode 배포 확인, 서명 확인이 필요한 경우에만 만든다.

```powershell
npm run aab:android
jarsigner -verify .\dist\android\winktimer-release.aab
keytool -printcert -jarfile .\dist\android\winktimer-release.aab
```

확인할 것:

- `jarsigner -verify`가 `jar verified.`를 출력하는지
- `keytool -printcert -jarfile`의 서명자가 기대한 upload key인지
- `android/app/build.gradle`의 `versionCode`가 Play에 올릴 값인지
- production 업로드라면 `src/ads/adMobEnvironment.ts`가 `FORCE_TEST_ADS = false`로 복구되어 있는지

## Porting Checklist

다른 프로젝트에 같은 형식을 적용할 때는 아래만 프로젝트 이름에 맞게 바꾼다.

- npm scripts: `apk:android`, `aab:android`, 필요하면 `aab:android:testads`
- output names: `dist/android/<app>-release.apk`, `dist/android/<app>-release.aab`
- Gradle tasks: APK는 `:app:assembleRelease`, AAB는 `:app:bundleRelease`
- signing property names: 앱별 prefix를 붙여 release signing과 debug signing을 분리
- Android package name and launch activity: 예시의 `com.winktimer.app/.MainActivity` 부분
- optional runtime toggles: test ads처럼 빌드 중 임시 변경이 필요하면 `finally`에서 원상 복구

운영 규칙은 단순하게 유지한다.

- 로컬 설치와 회귀 확인: `npm run apk:android`
- Play 업로드 산출물: `npm run aab:android`
- versionCode bump: Play 업로드 AAB를 만들 때만 수행
- clean build: 캐시가 의심될 때만 `-Clean`
