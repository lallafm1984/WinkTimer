import fs from 'fs';
import path from 'path';

const projectRoot = path.resolve(__dirname, '..');

describe('mobile Android verification environment', () => {
  test('uses React Native Android scripts instead of Expo Go', () => {
    const packageJson = JSON.parse(
      fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'),
    );

    expect(packageJson.scripts.start).toBe('react-native start');
    expect(packageJson.scripts['mobile:android']).toBe(
      'powershell -ExecutionPolicy Bypass -File ./scripts/mobile-android.ps1',
    );
    expect(packageJson.scripts['apk:android']).toBe(
      'powershell -ExecutionPolicy Bypass -File ./scripts/build-android-apk.ps1',
    );
    expect(packageJson.dependencies.expo).toBeUndefined();
    expect(packageJson.devDependencies['babel-preset-expo']).toBeUndefined();
    expect(packageJson.dependencies['react-native']).toBe('0.85.3');
    expect(packageJson.dependencies.react).toBe('19.2.3');
  });

  test('mobile Android script installs, grants camera, and launches the native app', () => {
    const script = fs.readFileSync(
      path.join(projectRoot, 'scripts', 'mobile-android.ps1'),
      'utf8',
    );

    expect(script).toContain('adb reverse tcp:8081 tcp:8081');
    expect(script).toContain('app-debug.apk');
    expect(script).toContain(
      'pm grant com.timewatchapp android.permission.CAMERA',
    );
    expect(script).toContain('am start -n com.timewatchapp/.MainActivity');
  });

  test('standalone APK script builds a release APK that contains the JS bundle', () => {
    const script = fs.readFileSync(
      path.join(projectRoot, 'scripts', 'build-android-apk.ps1'),
      'utf8',
    );

    expect(script).toContain(':app:assembleRelease');
    expect(script).toContain('app-release.apk');
    expect(script).toContain('outputs\\apk\\release');
    expect(script).not.toContain('adb reverse');
    expect(script).not.toContain('app-debug.apk');
  });

  test('Android helper scripts configure the SDK environment for npm runs', () => {
    const scriptNames = ['mobile-android.ps1', 'build-android-apk.ps1'];

    for (const scriptName of scriptNames) {
      const script = fs.readFileSync(
        path.join(projectRoot, 'scripts', scriptName),
        'utf8',
      );

      expect(script).toContain('$env:ANDROID_HOME');
      expect(script).toContain('$env:ANDROID_SDK_ROOT');
      expect(script).toContain('Android\\Sdk');
    }
  });

  test('Android build includes CameraX and bundled ML Kit face detection', () => {
    const buildGradle = fs.readFileSync(
      path.join(projectRoot, 'android', 'app', 'build.gradle'),
      'utf8',
    );

    expect(buildGradle).toContain('androidx.camera:camera-camera2');
    expect(buildGradle).toContain('androidx.camera:camera-lifecycle');
    expect(buildGradle).toContain('com.google.mlkit:face-detection');
  });

  test('native gaze module analyzes front-camera frames and emits readings', () => {
    const nativeModule = fs.readFileSync(
      path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'timewatchapp',
        'gaze',
        'NativeGazeDetectionModule.kt',
      ),
      'utf8',
    );

    expect(nativeModule).toContain('ProcessCameraProvider');
    expect(nativeModule).toContain('CameraSelector.DEFAULT_FRONT_CAMERA');
    expect(nativeModule).toContain('ImageAnalysis');
    expect(nativeModule).toContain('InputImage.fromMediaImage');
    expect(nativeModule).toContain('FaceDetection.getClient');
    expect(nativeModule).toContain('TimewatchGazeDetectionReading');
    expect(nativeModule).toContain('oneEyeClosed');
    expect(nativeModule).toContain('bothClosed');
    expect(nativeModule).toContain('leftEyeOpenProbability');
    expect(nativeModule).toContain('rightEyeOpenProbability');
    expect(nativeModule).toContain('putString("eyeState"');
    expect(nativeModule).toContain('FIXED_LOOKING_ROLL_DEGREES = 50.0');
    expect(nativeModule).not.toContain('STRICT_LOOKING_ROLL_DEGREES');
    expect(nativeModule).not.toContain('LOOSE_LOOKING_ROLL_DEGREES');
    expect(nativeModule).not.toContain('DEFAULT_LOOKING_ROLL_DEGREES');
    expect(nativeModule).toContain('setLookAngleLevel');
    expect(nativeModule).toContain('getLookingAngleThresholds');
  });

  test('native module emits device posture readings for flip timer mode', () => {
    const nativeModule = fs.readFileSync(
      path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'timewatchapp',
        'gaze',
        'NativeGazeDetectionModule.kt',
      ),
      'utf8',
    );

    expect(nativeModule).toContain('SensorManager');
    expect(nativeModule).toContain('TYPE_ACCELEROMETER');
    expect(nativeModule).toContain('startDevicePosture');
    expect(nativeModule).toContain('stopDevicePosture');
    expect(nativeModule).toContain('TimewatchDevicePostureReading');
    expect(nativeModule).toContain('faceDown');
    expect(nativeModule).toContain('faceUp');
  });

  test('native gaze module makes far-distance wink classification configurable', () => {
    const nativeModule = fs.readFileSync(
      path.join(
        projectRoot,
        'android',
        'app',
        'src',
        'main',
        'java',
        'com',
        'timewatchapp',
        'gaze',
        'NativeGazeDetectionModule.kt',
      ),
      'utf8',
    );

    expect(nativeModule).toContain('setWinkDistanceLevel');
    expect(nativeModule).toContain('DEFAULT_WINK_DISTANCE_LEVEL = 5');
    expect(nativeModule).toContain('normalizeWinkSensitivityLevel');
    expect(nativeModule).toContain('getWinkSensitivityOffset');
    expect(nativeModule).toContain('WINK_SENSITIVITY_STEP_COUNT = 9.0f');
    expect(nativeModule).toContain('getMinFaceAreaRatioForEyeClassification');
    expect(nativeModule).toContain('frameArea');
    expect(nativeModule).toContain('faceAreaRatio');
    expect(nativeModule).toContain('return EyeReading("unknown", null)');
  });
});
