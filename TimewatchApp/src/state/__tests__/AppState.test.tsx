import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {
  AppState as NativeAppState,
  DeviceEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
  Text,
  View,
} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import type {AppStateStatus} from 'react-native';
import {AppStateProvider, useAppState} from '../AppState';

type NativeGazeDetectionModuleForTest = {
  start: jest.Mock<Promise<void>, []>;
  stop: jest.Mock<Promise<void>, []>;
  startDevicePosture?: jest.Mock<Promise<void>, []>;
  stopDevicePosture?: jest.Mock<Promise<void>, []>;
  setWinkThresholds?: jest.Mock<
    Promise<void>,
    [number, number, number, number]
  >;
  setWinkDistanceLevel?: jest.Mock<Promise<void>, [number]>;
  setSmileThreshold?: jest.Mock<Promise<void>, [number]>;
  setSmileDistanceLevel?: jest.Mock<Promise<void>, [number]>;
  setLookAngleLevel?: jest.Mock<Promise<void>, [number]>;
  setFaceHeightAngleLevel?: jest.Mock<Promise<void>, [number]>;
  setAnalysisResolution?: jest.Mock<Promise<void>, [number, number]>;
  setFrameIntervalMs?: jest.Mock<Promise<void>, [number]>;
  setPerformanceMode?: jest.Mock<Promise<void>, [string]>;
};

type NativeTimerAlertModuleForTest = {
  playTimerEndAlert: jest.Mock<
    Promise<void>,
    [string, boolean, boolean, string, string]
  >;
  scheduleTimerEndAlert?: jest.Mock<
    Promise<void>,
    [
      number,
      string,
      boolean,
      boolean,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
      string,
    ]
  >;
  cancelScheduledTimerEndAlert?: jest.Mock<Promise<void>, []>;
  showTimekeepingNotification?: jest.Mock<
    Promise<void>,
    [string, number, boolean, boolean, string, string, string, string]
  >;
  hideTimekeepingNotification?: jest.Mock<Promise<void>, []>;
  stopTimerEndAlert?: jest.Mock<Promise<void>, []>;
};

type MutableNativeModules = typeof NativeModules & {
  NativeGazeDetection?: NativeGazeDetectionModuleForTest;
  NativeTimerAlert?: NativeTimerAlertModuleForTest;
  I18nManager?: {localeIdentifier?: string};
  SettingsManager?: {
    settings?: {
      AppleLocale?: string;
      AppleLanguages?: string[];
    };
  };
};

const nativeModules = NativeModules as MutableNativeModules;
const originalNativeGazeDetection = nativeModules.NativeGazeDetection;
const originalNativeTimerAlert = nativeModules.NativeTimerAlert;
const originalI18nManager = nativeModules.I18nManager;
const originalSettingsManager = nativeModules.SettingsManager;
const originalPlatformOSDescriptor = Object.getOwnPropertyDescriptor(
  Platform,
  'OS',
);
const originalPlatformVersionDescriptor = Object.getOwnPropertyDescriptor(
  Platform,
  'Version',
);
const SETTINGS_STORAGE_KEY = '@winktimer:settings:v1';

function AppStateHarness() {
  const app = useAppState();
  const recentTimerTargetDurationsMs =
    'recentTimerTargetDurationsMs' in app &&
    Array.isArray(app.recentTimerTargetDurationsMs)
      ? app.recentTimerTargetDurationsMs
      : [];

  return (
    <View>
      <Text>{`screen:${app.screen}`}</Text>
      <Text>{`phase:${app.timer.phase}`}</Text>
      <Text>{`focus:${app.timer.focusDurationMs}`}</Text>
      <Text>{`lookPaused:${app.timer.isLookPaused}`}</Text>
      <Text>{`sensitivity:${app.sensitivity}`}</Text>
      <Text>{`mode:${app.statusDisplayMode}`}</Text>
      <Text>{`language:${app.locale}`}</Text>
      <Text>{`normalTimerMode:${app.normalTimerMode}`}</Text>
      <Text>{`timekeepingMode:${app.timekeepingMode}`}</Text>
      <Text>{`timerTarget:${app.timerTargetDurationMs}`}</Text>
      <Text>{`recentTimerTargets:${recentTimerTargetDurationsMs.join('|')}`}</Text>
      <Text>{`activeTarget:${app.timer.targetDurationMs ?? 'none'}`}</Text>
      <Text>{`timerMode:${app.timerModeId}`}</Text>
      <Text>{`timerAlertVibration:${app.timerAlertVibrationEnabled}`}</Text>
      <Text>{`timerAlertSound:${app.timerAlertSoundEnabled}`}</Text>
      <Text>{`timerAlertSoundId:${app.timerAlertSoundId}`}</Text>
      <Text>{`timerAlertDurationId:${app.timerAlertDurationId}`}</Text>
      <Text>{`timerAlertVibrationPatternId:${app.timerAlertVibrationPatternId}`}</Text>
      <Text>{`timerAlertActive:${app.isTimerAlertActive}`}</Text>
      <Text>{`gestureBlocked:${app.gestureInputsBlocked}`}</Text>
      <Text>{`leftEyeClosed:${app.winkLeftEyeClosedThreshold}`}</Text>
      <Text>{`rightEyeClosed:${app.winkRightEyeClosedThreshold}`}</Text>
      <Text>{`leftGap:${app.winkLeftEyeProbabilityGapThreshold}`}</Text>
      <Text>{`rightGap:${app.winkRightEyeProbabilityGapThreshold}`}</Text>
      <Text>{`winkDistance:${app.winkDistanceLevel}`}</Text>
      <Text>{`smileThreshold:${app.smileThreshold}`}</Text>
      <Text>{`smileDistance:${app.smileDistanceLevel}`}</Text>
      <Text>{`lookAngle:${app.lookAngleLevel}`}</Text>
      <Text>{`faceHeightAngle:${app.faceHeightAngleLevel}`}</Text>
      <Text>{`resolution:${app.detectionResolutionLevel}`}</Text>
      <Text>{`frameInterval:${app.detectionFrameIntervalLevel}`}</Text>
      <Text>{`performance:${app.detectionPerformanceMode}`}</Text>
      <Text>{`history:${app.sessionHistory
        .map(event => `${event.type}:${event.elapsedMs}:${event.deltaMs}`)
        .join('|')}`}</Text>
      <Text>{`summaryFocus:${app.lastSummary?.focusDurationMs ?? 'none'}`}</Text>
      <Text>{`error:${app.finishError ?? 'none'}`}</Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="go-timer"
        onPress={() => {
          app.setScreen('timer');
        }}>
        timer
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="go-settings"
        onPress={() => {
          app.setScreen('settings');
        }}>
        settings
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="sensitivity-strict"
        onPress={() => {
          app.setSensitivity('strict');
        }}>
        strict sensitivity
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="status-text"
        onPress={() => {
          app.setStatusDisplayMode('text');
        }}>
        text status
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="language-japanese"
        onPress={() => {
          app.setLocale('ja-JP');
        }}>
        japanese language
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="normal-mode"
        onPress={() => {
          app.setNormalTimerMode(true);
        }}>
        normal
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="timer-function"
        onPress={() => {
          app.setTimekeepingMode('timer');
        }}>
        timer function
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="stopwatch-function"
        onPress={() => {
          app.setTimekeepingMode('stopwatch');
        }}>
        stopwatch function
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="target-one-minute"
        onPress={() => {
          app.setTimerTargetDurationMs(60 * 1000);
        }}>
        target one minute
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="target-ten-minutes"
        onPress={() => {
          app.setTimerTargetDurationMs(10 * 60 * 1000);
        }}>
        target ten minutes
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="target-ninety-seconds"
        onPress={() => {
          app.setTimerTargetDurationMs(90 * 1000);
        }}>
        target ninety seconds
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="target-two-minutes"
        onPress={() => {
          app.setTimerTargetDurationMs(2 * 60 * 1000);
        }}>
        target two minutes
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="timer-alert-vibration-off"
        onPress={() => {
          app.setTimerAlertVibrationEnabled(false);
        }}>
        timer alert vibration off
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="timer-alert-sound-off"
        onPress={() => {
          app.setTimerAlertSoundEnabled(false);
        }}>
        timer alert sound off
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="timer-alert-ringtone"
        onPress={() => {
          app.setTimerAlertSoundId('ringtone');
        }}>
        timer alert ringtone
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="timer-alert-15-seconds"
        onPress={() => {
          app.setTimerAlertDurationId('seconds:15');
        }}>
        timer alert 15 seconds
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="timer-alert-until-stopped"
        onPress={() => {
          app.setTimerAlertDurationId('untilStopped');
        }}>
        timer alert until stopped
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="timer-alert-long-repeat"
        onPress={() => {
          app.setTimerAlertVibrationPatternId('longRepeat');
        }}>
        timer alert long repeat
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="stop-timer-alert"
        onPress={app.stopTimerEndAlert}>
        stop timer alert
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="look-pause-mode"
        onPress={() => {
          app.setTimerModeId('lookPause');
        }}>
        look pause
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="basic-mode"
        onPress={() => {
          app.setTimerModeId('basicTimer');
        }}>
        basic
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="flip-mode"
        onPress={() => {
          app.setTimerModeId('flipTimer');
        }}>
        flip
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="wink-control-mode"
        onPress={() => {
          app.setTimerModeId('winkControl');
        }}>
        wink control
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="smile-mode"
        onPress={() => {
          app.setTimerModeId('smileMode');
        }}>
        smile
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="block-gestures"
        onPress={() => {
          app.setGestureInputsBlocked(true);
        }}>
        block gestures
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="unblock-gestures"
        onPress={() => {
          app.setGestureInputsBlocked(false);
        }}>
        unblock gestures
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="wink-thresholds-custom"
        onPress={() => {
          app.setWinkLeftEyeClosedThreshold(0.15);
          app.setWinkRightEyeClosedThreshold(0.2);
          app.setWinkLeftEyeProbabilityGapThreshold(0.4);
          app.setWinkRightEyeProbabilityGapThreshold(0.2);
        }}>
        wink thresholds custom
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="wink-distance-3"
        onPress={() => {
          app.setWinkDistanceLevel(3);
        }}>
        wink distance 3
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="smile-threshold-custom"
        onPress={() => {
          app.setSmileThreshold(0.82);
        }}>
        smile threshold custom
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="smile-distance-3"
        onPress={() => {
          app.setSmileDistanceLevel(3);
        }}>
        smile distance 3
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="look-angle-3"
        onPress={() => {
          app.setLookAngleLevel(3);
        }}>
        look angle 3
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="face-height-1"
        onPress={() => {
          app.setFaceHeightAngleLevel(1);
        }}>
        face height 1
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="face-height-3"
        onPress={() => {
          app.setFaceHeightAngleLevel(3);
        }}>
        face height 3
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="resolution-1"
        onPress={() => {
          app.setDetectionResolutionLevel(1);
        }}>
        resolution 1
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="frame-interval-2"
        onPress={() => {
          app.setDetectionFrameIntervalLevel(2);
        }}>
        frame interval 2
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="performance-accurate"
        onPress={() => {
          app.setDetectionPerformanceMode('accurate');
        }}>
        performance accurate
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="start"
        onPress={app.startTimerSession}>
        start
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="resume"
        onPress={app.resumeTimerSession}>
        resume
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="pause"
        onPress={app.pauseTimerSession}>
        pause
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="reset"
        onPress={app.resetTimerSession}>
        reset
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="lap"
        onPress={app.recordLapSession}>
        lap
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="not-looking"
        onPress={() => {
          app.setMockDetectionStatus('notLooking');
        }}>
        not looking
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="looking"
        onPress={() => {
          app.setMockDetectionStatus('looking');
        }}>
        looking
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="finish"
        onPress={app.finishTimerSession}>
        finish
      </Text>
    </View>
  );
}

function hasText(renderer: ReactTestRenderer.ReactTestRenderer, text: string) {
  return renderer.root
    .findAllByType(Text)
    .some(node => node.props.children === text);
}

function getHistoryText(renderer: ReactTestRenderer.ReactTestRenderer) {
  return (
    renderer.root
      .findAllByType(Text)
      .map(node => node.props.children)
      .find(
        value => typeof value === 'string' && value.startsWith('history:'),
      ) ?? ''
  );
}

function setAndroidPlatformVersion(version: number) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: 'android',
  });
  Object.defineProperty(Platform, 'Version', {
    configurable: true,
    value: version,
  });
}

function restorePlatform() {
  if (originalPlatformOSDescriptor) {
    Object.defineProperty(Platform, 'OS', originalPlatformOSDescriptor);
  }
  if (originalPlatformVersionDescriptor) {
    Object.defineProperty(
      Platform,
      'Version',
      originalPlatformVersionDescriptor,
    );
  }
}

async function press(
  renderer: ReactTestRenderer.ReactTestRenderer,
  accessibilityLabel: string,
) {
  const button = renderer.root.find(
    node =>
      node.props.accessibilityLabel === accessibilityLabel &&
      typeof node.props.onPress === 'function',
  );

  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });
}

describe('AppStateProvider app flow', () => {
  let nowMs = 0;
  let appStateListeners: Array<(status: AppStateStatus) => void> = [];

  beforeEach(async () => {
    jest.useFakeTimers();
    nowMs = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    appStateListeners = [];
    jest
      .spyOn(NativeAppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListeners.push(listener);
        return {remove: jest.fn()};
      });
    nativeModules.I18nManager = {localeIdentifier: 'en_US'};
    delete nativeModules.SettingsManager;
    await AsyncStorage.clear();
  });

  afterEach(() => {
    if (originalNativeGazeDetection) {
      nativeModules.NativeGazeDetection = originalNativeGazeDetection;
    } else {
      delete nativeModules.NativeGazeDetection;
    }

    if (originalNativeTimerAlert) {
      nativeModules.NativeTimerAlert = originalNativeTimerAlert;
    } else {
      delete nativeModules.NativeTimerAlert;
    }

    if (originalI18nManager) {
      nativeModules.I18nManager = originalI18nManager;
    } else {
      delete nativeModules.I18nManager;
    }

    if (originalSettingsManager) {
      nativeModules.SettingsManager = originalSettingsManager;
    } else {
      delete nativeModules.SettingsManager;
    }

    restorePlatform();
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  async function renderHarness() {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <AppStateProvider>
          <AppStateHarness />
        </AppStateProvider>,
      );
    });

    return renderer!;
  }

  async function unmount(renderer: ReactTestRenderer.ReactTestRenderer) {
    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  }

  function emitGazeReading(
    atMs: number,
    payload: {
      status: 'looking' | 'notLooking' | 'unknown';
      eyeState: 'bothOpen' | 'bothClosed' | 'oneEyeClosed' | 'unknown';
      winkSide?: 'left' | 'right';
      smileDetected?: boolean;
      smileProbability?: number;
    },
  ) {
    nowMs = atMs;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      confidence: payload.status === 'unknown' ? 0 : 1,
      ...payload,
    });
  }

  function emitDevicePostureReading(
    atMs: number,
    posture: 'faceDown' | 'faceUp' | 'unknown',
  ) {
    nowMs = atMs;
    DeviceEventEmitter.emit('WinkTimerDevicePostureReading', {
      posture,
    });
  }

  async function startWinkControlByRightWink(
    renderer: ReactTestRenderer.ReactTestRenderer,
  ) {
    nowMs = 1000;
    await press(renderer, 'wink-control-mode');
    await ReactTestRenderer.act(async () => undefined);

    emitGazeReading(1000, {
      status: 'looking',
      eyeState: 'bothOpen',
    });

    emitGazeReading(1100, {
      status: 'looking',
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });

    emitGazeReading(1300, {
      status: 'looking',
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });
    expect(hasText(renderer, 'phase:active')).toBe(true);

    nowMs = 2500;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(1200);
    });
  }

  it('defaults to minimal status display mode', async () => {
    const renderer = await renderHarness();

    expect(hasText(renderer, 'screen:timer')).toBe(true);
    expect(hasText(renderer, 'mode:minimal')).toBe(true);
    expect(hasText(renderer, 'language:en-US')).toBe(true);
    expect(hasText(renderer, 'timekeepingMode:stopwatch')).toBe(true);
    expect(hasText(renderer, 'timerTarget:300000')).toBe(true);
    expect(hasText(renderer, 'recentTimerTargets:30000|60000|600000'))
      .toBe(true);
    expect(hasText(renderer, 'timerMode:basicTimer')).toBe(true);
    expect(hasText(renderer, 'timerAlertVibration:true')).toBe(true);
    expect(hasText(renderer, 'timerAlertSound:true')).toBe(true);
    expect(hasText(renderer, 'timerAlertSoundId:alarm')).toBe(true);
    expect(hasText(renderer, 'timerAlertDurationId:seconds:4')).toBe(true);
    expect(hasText(renderer, 'timerAlertVibrationPatternId:double')).toBe(
      true,
    );
    expect(hasText(renderer, 'timerAlertActive:false')).toBe(true);

    await unmount(renderer);
  });

  it('uses the device locale when no saved language setting exists', async () => {
    nativeModules.I18nManager = {localeIdentifier: 'ja_JP'};

    const renderer = await renderHarness();

    expect(hasText(renderer, 'language:ja-JP')).toBe(true);

    await unmount(renderer);
  });

  it('starts countdown timers with the configured target duration', async () => {
    const playTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    const stopTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {playTimerEndAlert, stopTimerEndAlert};
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'timer-function');
    await press(renderer, 'target-one-minute');
    await press(renderer, 'start');
    await press(renderer, 'not-looking');

    nowMs = 62000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(61 * 1000);
    });

    expect(hasText(renderer, 'timekeepingMode:timer')).toBe(true);
    expect(hasText(renderer, 'activeTarget:60000')).toBe(true);
    expect(hasText(renderer, 'phase:ended')).toBe(true);
    expect(hasText(renderer, 'focus:60000')).toBe(true);
    expect(playTimerEndAlert).toHaveBeenCalledTimes(1);
    expect(playTimerEndAlert).toHaveBeenLastCalledWith(
      'alarm',
      true,
      true,
      'seconds:4',
      'double',
    );
    expect(hasText(renderer, 'timerAlertActive:true')).toBe(true);

    nowMs = 63000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(playTimerEndAlert).toHaveBeenCalledTimes(1);

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(hasText(renderer, 'timerAlertActive:false')).toBe(true);
    expect(stopTimerEndAlert).toHaveBeenCalledTimes(1);

    await unmount(renderer);
  });

  it('does not replay fixed-duration timer alerts while wink control waits after timer end', async () => {
    const playTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {playTimerEndAlert};
    nativeModules.NativeGazeDetection = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
    };
    const renderer = await renderHarness();

    await press(renderer, 'timer-function');
    await press(renderer, 'target-one-minute');
    await startWinkControlByRightWink(renderer);

    nowMs = 62000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(hasText(renderer, 'timerMode:winkControl')).toBe(true);
    expect(hasText(renderer, 'phase:ended')).toBe(true);
    expect(playTimerEndAlert).toHaveBeenCalledTimes(1);

    nowMs = 66000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(4000);
    });

    expect(hasText(renderer, 'timerAlertActive:false')).toBe(true);
    expect(playTimerEndAlert).toHaveBeenCalledTimes(1);

    await unmount(renderer);
  });

  it('plays long repeating timer alerts until stopped manually', async () => {
    const playTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    const stopTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {playTimerEndAlert, stopTimerEndAlert};
    const renderer = await renderHarness();

    await press(renderer, 'timer-alert-until-stopped');
    await press(renderer, 'timer-alert-long-repeat');

    nowMs = 1000;
    await press(renderer, 'timer-function');
    await press(renderer, 'target-one-minute');
    await press(renderer, 'start');
    await press(renderer, 'not-looking');

    nowMs = 62000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(61 * 1000);
    });

    expect(hasText(renderer, 'phase:ended')).toBe(true);
    expect(playTimerEndAlert).toHaveBeenLastCalledWith(
      'alarm',
      true,
      true,
      'untilStopped',
      'longRepeat',
    );
    expect(hasText(renderer, 'timerAlertActive:true')).toBe(true);

    nowMs = 72000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(10 * 1000);
    });

    expect(hasText(renderer, 'timerAlertActive:true')).toBe(true);

    await press(renderer, 'stop-timer-alert');

    expect(stopTimerEndAlert).toHaveBeenCalledTimes(1);
    expect(hasText(renderer, 'timerAlertActive:false')).toBe(true);

    await unmount(renderer);
  });

  it('skips the timer completion alert when vibration and sound are disabled', async () => {
    const playTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {playTimerEndAlert};
    const renderer = await renderHarness();

    await press(renderer, 'timer-alert-vibration-off');
    await press(renderer, 'timer-alert-sound-off');

    nowMs = 1000;
    await press(renderer, 'timer-function');
    await press(renderer, 'target-one-minute');
    await press(renderer, 'start');
    await press(renderer, 'not-looking');

    nowMs = 62000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(61 * 1000);
    });

    expect(hasText(renderer, 'phase:ended')).toBe(true);
    expect(playTimerEndAlert).not.toHaveBeenCalled();

    await unmount(renderer);
  });

  it('resets the active timer when switching back to stopwatch', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'timer-function');
    await press(renderer, 'target-one-minute');
    await press(renderer, 'start');
    await press(renderer, 'not-looking');

    nowMs = 11000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(10 * 1000);
    });

    expect(hasText(renderer, 'focus:10000')).toBe(true);

    await press(renderer, 'stopwatch-function');

    expect(hasText(renderer, 'timekeepingMode:stopwatch')).toBe(true);
    expect(hasText(renderer, 'phase:idle')).toBe(true);
    expect(hasText(renderer, 'focus:0')).toBe(true);
    expect(hasText(renderer, 'activeTarget:none')).toBe(true);

    await unmount(renderer);
  });

  it('resets a paused countdown when changing the timer target so it can start again', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'timer-function');
    await press(renderer, 'start');
    await press(renderer, 'not-looking');

    nowMs = 11000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(10 * 1000);
    });
    await press(renderer, 'pause');

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);
    expect(hasText(renderer, 'focus:10000')).toBe(true);

    nowMs = 12000;
    await press(renderer, 'target-one-minute');

    expect(hasText(renderer, 'timerTarget:60000')).toBe(true);
    expect(hasText(renderer, 'activeTarget:60000')).toBe(true);
    expect(hasText(renderer, 'phase:idle')).toBe(true);
    expect(hasText(renderer, 'focus:0')).toBe(true);

    nowMs = 13000;
    await press(renderer, 'start');

    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(hasText(renderer, 'activeTarget:60000')).toBe(true);

    await unmount(renderer);
  });

  it('keeps the three most recent timer target durations with newest first', async () => {
    const renderer = await renderHarness();

    await press(renderer, 'target-one-minute');
    expect(hasText(renderer, 'recentTimerTargets:60000|30000|600000'))
      .toBe(true);

    await press(renderer, 'target-ten-minutes');
    await press(renderer, 'target-ninety-seconds');
    await press(renderer, 'target-two-minutes');

    expect(hasText(renderer, 'recentTimerTargets:120000|90000|600000'))
      .toBe(true);
    expect(hasText(renderer, 'recentTimerTargets:120000|90000|600000|60000'))
      .toBe(false);

    await press(renderer, 'target-ten-minutes');

    expect(hasText(renderer, 'recentTimerTargets:600000|120000|90000'))
      .toBe(true);

    await unmount(renderer);
  });

  it('loads persisted settings from local storage and pushes detector settings to native', async () => {
    await AsyncStorage.setItem(
      SETTINGS_STORAGE_KEY,
      JSON.stringify({
        sensitivity: 'strict',
        statusDisplayMode: 'text',
        locale: 'de-DE',
        normalTimerMode: true,
        timekeepingMode: 'timer',
        timerTargetDurationMs: 60000,
        recentTimerTargetDurationsMs: [
          60000,
          null,
          'bad',
          90 * 1000,
          5 * 60 * 1000,
          10 * 60 * 1000,
        ],
        timerModeId: 'winkControl',
        timerAlertVibrationEnabled: false,
        timerAlertSoundEnabled: true,
        timerAlertSoundId: 'uri:content://settings/system/alarm_alert',
        timerAlertDurationId: 'long',
        timerAlertVibrationPatternId: 'short',
        winkLeftEyeClosedThreshold: 0.5,
        winkRightEyeClosedThreshold: 0.55,
        winkLeftEyeProbabilityGapThreshold: 0.4,
        winkRightEyeProbabilityGapThreshold: 0.2,
        winkDistanceLevel: 4,
        smileThreshold: 0.82,
        smileDistanceLevel: 4,
        lookAngleLevel: 3,
        faceHeightAngleLevel: 1,
        detectionResolutionLevel: 1,
        detectionFrameIntervalLevel: 2,
        detectionPerformanceMode: 'accurate',
      }),
    );
    const setWinkThresholds = jest.fn().mockResolvedValue(undefined);
    const setWinkDistanceLevel = jest.fn().mockResolvedValue(undefined);
    const setSmileThreshold = jest.fn().mockResolvedValue(undefined);
    const setSmileDistanceLevel = jest.fn().mockResolvedValue(undefined);
    const setLookAngleLevel = jest.fn().mockResolvedValue(undefined);
    const setFaceHeightAngleLevel = jest.fn().mockResolvedValue(undefined);
    const setAnalysisResolution = jest.fn().mockResolvedValue(undefined);
    const setFrameIntervalMs = jest.fn().mockResolvedValue(undefined);
    const setPerformanceMode = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      setWinkThresholds,
      setWinkDistanceLevel,
      setSmileThreshold,
      setSmileDistanceLevel,
      setLookAngleLevel,
      setFaceHeightAngleLevel,
      setAnalysisResolution,
      setFrameIntervalMs,
      setPerformanceMode,
    };
    const renderer = await renderHarness();

    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'sensitivity:strict')).toBe(true);
    expect(hasText(renderer, 'mode:text')).toBe(true);
    expect(hasText(renderer, 'language:de-DE')).toBe(true);
    expect(hasText(renderer, 'normalTimerMode:true')).toBe(true);
    expect(hasText(renderer, 'timekeepingMode:timer')).toBe(true);
    expect(hasText(renderer, 'timerTarget:60000')).toBe(true);
    expect(hasText(renderer, 'recentTimerTargets:60000|90000|300000'))
      .toBe(true);
    expect(hasText(renderer, 'timerMode:basicTimer')).toBe(true);
    expect(hasText(renderer, 'timerAlertVibration:false')).toBe(true);
    expect(hasText(renderer, 'timerAlertSound:true')).toBe(true);
    expect(
      hasText(
        renderer,
        'timerAlertSoundId:uri:content://settings/system/alarm_alert',
      ),
    ).toBe(true);
    expect(hasText(renderer, 'timerAlertDurationId:seconds:15')).toBe(true);
    expect(hasText(renderer, 'timerAlertVibrationPatternId:short')).toBe(
      true,
    );
    expect(hasText(renderer, 'leftEyeClosed:0.5')).toBe(true);
    expect(hasText(renderer, 'rightEyeClosed:0.55')).toBe(true);
    expect(hasText(renderer, 'leftGap:0.4')).toBe(true);
    expect(hasText(renderer, 'rightGap:0.2')).toBe(true);
    expect(hasText(renderer, 'winkDistance:5')).toBe(true);
    expect(hasText(renderer, 'smileThreshold:0.82')).toBe(true);
    expect(hasText(renderer, 'smileDistance:5')).toBe(true);
    expect(hasText(renderer, 'lookAngle:3')).toBe(true);
    expect(hasText(renderer, 'faceHeightAngle:1')).toBe(true);
    expect(hasText(renderer, 'resolution:1')).toBe(true);
    expect(hasText(renderer, 'frameInterval:2')).toBe(true);
    expect(hasText(renderer, 'performance:accurate')).toBe(true);
    expect(setWinkThresholds).toHaveBeenLastCalledWith(
      0.5,
      0.55,
      0.4,
      0.2,
    );
    expect(setWinkDistanceLevel).toHaveBeenLastCalledWith(5);
    expect(setSmileThreshold).toHaveBeenLastCalledWith(0.82);
    expect(setSmileDistanceLevel).toHaveBeenLastCalledWith(5);
    expect(setLookAngleLevel).toHaveBeenLastCalledWith(3);
    expect(setFaceHeightAngleLevel).toHaveBeenLastCalledWith(1);
    expect(setAnalysisResolution).toHaveBeenLastCalledWith(480, 360);
    expect(setFrameIntervalMs).toHaveBeenLastCalledWith(120);
    expect(setPerformanceMode).toHaveBeenLastCalledWith('accurate');

    await unmount(renderer);
  });

  it('persists changed settings after local settings load completes', async () => {
    const renderer = await renderHarness();

    await ReactTestRenderer.act(async () => undefined);

    expect(await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)).toBeNull();

    await press(renderer, 'sensitivity-strict');
    await press(renderer, 'status-text');
    await press(renderer, 'language-japanese');
    await press(renderer, 'normal-mode');
    await press(renderer, 'timer-function');
    await press(renderer, 'target-one-minute');
    await press(renderer, 'wink-control-mode');
    await press(renderer, 'timer-alert-vibration-off');
    await press(renderer, 'timer-alert-sound-off');
    await press(renderer, 'timer-alert-ringtone');
    await press(renderer, 'timer-alert-15-seconds');
    await press(renderer, 'timer-alert-long-repeat');
    await press(renderer, 'wink-thresholds-custom');
    await press(renderer, 'wink-distance-3');
    await press(renderer, 'smile-threshold-custom');
    await press(renderer, 'smile-distance-3');
    await press(renderer, 'look-angle-3');
    await press(renderer, 'face-height-1');
    await press(renderer, 'resolution-1');
    await press(renderer, 'frame-interval-2');
    await press(renderer, 'performance-accurate');
    await ReactTestRenderer.act(async () => undefined);

    const persistedSettings = JSON.parse(
      (await AsyncStorage.getItem(SETTINGS_STORAGE_KEY)) ?? '{}',
    );

    expect(persistedSettings).toEqual({
      sensitivity: 'strict',
      statusDisplayMode: 'text',
      locale: 'ja-JP',
      normalTimerMode: true,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 60000,
      recentTimerTargetDurationsMs: [60000, 30000, 600000],
      timerModeId: 'winkControl',
      timerAlertVibrationEnabled: false,
      timerAlertSoundEnabled: false,
      timerAlertSoundId: 'ringtone',
      timerAlertDurationId: 'seconds:15',
      timerAlertVibrationPatternId: 'longRepeat',
      winkLeftEyeClosedThreshold: 0.15,
      winkRightEyeClosedThreshold: 0.2,
      winkLeftEyeProbabilityGapThreshold: 0.4,
      winkRightEyeProbabilityGapThreshold: 0.2,
      winkDistanceLevel: 3,
      smileThreshold: 0.82,
      smileDistanceLevel: 3,
      lookAngleLevel: 3,
      faceHeightAngleLevel: 1,
      detectionResolutionLevel: 1,
      detectionFrameIntervalLevel: 2,
      detectionPerformanceMode: 'accurate',
    });

    await unmount(renderer);
  });

  it('keeps an active stopwatch running when the app moves to background', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'start');
    await press(renderer, 'go-settings');

    nowMs = 2000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('background'));
    });

    expect(hasText(renderer, 'screen:settings')).toBe(true);
    expect(hasText(renderer, 'phase:active')).toBe(true);

    nowMs = 11000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(hasText(renderer, 'focus:0')).toBe(false);

    await unmount(renderer);
  });

  it('requests Android notification permission when the app starts without asking for camera', async () => {
    setAndroidPlatformVersion(36);
    const checkPermission = jest
      .spyOn(PermissionsAndroid, 'check')
      .mockResolvedValue(false);
    const requestPermission = jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.GRANTED);
    const renderer = await renderHarness();

    await ReactTestRenderer.act(async () => undefined);

    expect(checkPermission).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    expect(requestPermission).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    expect(checkPermission).not.toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    expect(requestPermission).not.toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.CAMERA,
    );
    expect(requestPermission.mock.calls[0]?.[0]).toBe(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );

    const requestCountAtStartup = requestPermission.mock.calls.length;

    nowMs = 1000;
    await press(renderer, 'start');
    await ReactTestRenderer.act(async () => undefined);

    expect(requestPermission).toHaveBeenCalledTimes(requestCountAtStartup);

    await unmount(renderer);
  });

  it('shows stopwatch time in a background notification while the app is backgrounded', async () => {
    const playTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    const showTimekeepingNotification = jest.fn().mockResolvedValue(undefined);
    const hideTimekeepingNotification = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {
      playTimerEndAlert,
      showTimekeepingNotification,
      hideTimekeepingNotification,
    };
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'start');

    expect(showTimekeepingNotification).not.toHaveBeenCalled();

    nowMs = 2000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('background'));
    });

    expect(showTimekeepingNotification).toHaveBeenLastCalledWith(
      'stopwatch',
      1000,
      false,
      true,
      '',
      'Stopwatch',
      'Time is still being recorded',
      'Background time',
    );

    nowMs = 3000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('active'));
    });

    expect(hideTimekeepingNotification).toHaveBeenCalled();

    await unmount(renderer);
  });

  it('uses the selected app language for background notification labels', async () => {
    const playTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    const showTimekeepingNotification = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {
      playTimerEndAlert,
      showTimekeepingNotification,
    };
    const renderer = await renderHarness();

    await press(renderer, 'language-japanese');

    nowMs = 1000;
    await press(renderer, 'start');

    nowMs = 2000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('background'));
    });

    expect(showTimekeepingNotification).toHaveBeenLastCalledWith(
      'stopwatch',
      1000,
      false,
      true,
      '',
      'ストップウォッチ',
      '経過時間はステータス領域に表示されます',
      'バックグラウンド時間',
    );

    await unmount(renderer);
  });

  it('shows remaining timer time in a countdown notification while backgrounded', async () => {
    const playTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    const showTimekeepingNotification = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {
      playTimerEndAlert,
      showTimekeepingNotification,
    };
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'timer-function');
    await press(renderer, 'target-one-minute');
    await press(renderer, 'start');

    nowMs = 2000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('background'));
    });

    expect(showTimekeepingNotification).toHaveBeenLastCalledWith(
      'timer',
      61000,
      true,
      true,
      '',
      'Timer',
      'Timer is still running',
      'Background time',
    );

    await unmount(renderer);
  });

  it('keeps paused stopwatch time in a static background notification', async () => {
    const playTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    const showTimekeepingNotification = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {
      playTimerEndAlert,
      showTimekeepingNotification,
    };
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'start');

    nowMs = 11000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(10000);
    });
    await press(renderer, 'pause');

    nowMs = 12000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('background'));
    });

    expect(showTimekeepingNotification).toHaveBeenLastCalledWith(
      'stopwatch',
      12000,
      false,
      false,
      '00:10',
      'Stopwatch',
      'Paused at 00:10',
      'Background time',
    );

    await unmount(renderer);
  });

  it('keeps paused countdown time in a static background notification', async () => {
    const playTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    const showTimekeepingNotification = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {
      playTimerEndAlert,
      showTimekeepingNotification,
    };
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'timer-function');
    await press(renderer, 'target-one-minute');
    await press(renderer, 'start');

    nowMs = 11000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(10000);
    });
    await press(renderer, 'pause');

    nowMs = 12000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('background'));
    });

    expect(showTimekeepingNotification).toHaveBeenLastCalledWith(
      'timer',
      12000,
      true,
      false,
      '00:50',
      'Timer',
      'Paused at 00:50',
      'Background time',
    );

    await unmount(renderer);
  });

  it('keeps look-pause countdown time in a static background notification', async () => {
    const playTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    const showTimekeepingNotification = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {
      playTimerEndAlert,
      showTimekeepingNotification,
    };
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'timer-function');
    await press(renderer, 'target-one-minute');
    await press(renderer, 'look-pause-mode');
    await press(renderer, 'start');
    await press(renderer, 'not-looking');

    nowMs = 11000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(10000);
    });

    await press(renderer, 'looking');

    nowMs = 12000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(1000);
    });

    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(hasText(renderer, 'lookPaused:true')).toBe(true);

    nowMs = 13000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('background'));
    });

    expect(showTimekeepingNotification).toHaveBeenLastCalledWith(
      'timer',
      13000,
      true,
      false,
      '00:50',
      'Timer',
      'Paused at 00:50',
      'Background time',
    );

    await unmount(renderer);
  });

  it('schedules a native timer alert and avoids duplicate JS playback while backgrounded', async () => {
    const playTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    const scheduleTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {
      playTimerEndAlert,
      scheduleTimerEndAlert,
    };
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'timer-function');
    await press(renderer, 'target-one-minute');
    await press(renderer, 'start');

    expect(scheduleTimerEndAlert).toHaveBeenLastCalledWith(
      61000,
      'alarm',
      true,
      true,
      'seconds:4',
      'double',
      'Timer alert',
      'Timer finished',
      'Timer alerts',
      'Timer',
      'Timer finished',
      'Background time',
    );

    nowMs = 2000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('background'));
    });

    expect(hasText(renderer, 'phase:active')).toBe(true);

    nowMs = 62000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(60 * 1000);
    });

    expect(hasText(renderer, 'phase:ended')).toBe(true);
    expect(hasText(renderer, 'focus:60000')).toBe(true);
    expect(playTimerEndAlert).not.toHaveBeenCalled();

    await unmount(renderer);
  });

  it('does not replay a native background alert after the app resumes past the scheduled trigger', async () => {
    const playTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    const scheduleTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    const cancelScheduledTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {
      playTimerEndAlert,
      scheduleTimerEndAlert,
      cancelScheduledTimerEndAlert,
    };
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'timer-function');
    await press(renderer, 'target-one-minute');
    await press(renderer, 'start');

    nowMs = 2000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('background'));
    });

    nowMs = 65000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('active'));
      jest.advanceTimersByTime(50);
    });

    expect(hasText(renderer, 'phase:ended')).toBe(true);
    expect(hasText(renderer, 'focus:60000')).toBe(true);
    expect(cancelScheduledTimerEndAlert).toHaveBeenCalled();
    expect(playTimerEndAlert).not.toHaveBeenCalled();

    await unmount(renderer);
  });

  it('cancels the scheduled native timer alert when the countdown is paused', async () => {
    const playTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    const scheduleTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    const cancelScheduledTimerEndAlert = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {
      playTimerEndAlert,
      scheduleTimerEndAlert,
      cancelScheduledTimerEndAlert,
    };
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'timer-function');
    await press(renderer, 'target-one-minute');
    await press(renderer, 'start');

    expect(scheduleTimerEndAlert).toHaveBeenCalledTimes(1);

    nowMs = 2000;
    await press(renderer, 'pause');

    expect(cancelScheduledTimerEndAlert).toHaveBeenCalled();

    await unmount(renderer);
  });

  it('keeps wink-control mode running through app background because pause is wink-only', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByRightWink(renderer);

    nowMs = 5000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('background'));
    });

    expect(hasText(renderer, 'timerMode:winkControl')).toBe(true);
    expect(hasText(renderer, 'phase:active')).toBe(true);

    await unmount(renderer);
  });

  it('ignores look-pause gaze input while the settings screen is open', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'look-pause-mode');
    await press(renderer, 'start');
    await press(renderer, 'not-looking');
    await press(renderer, 'go-settings');

    emitGazeReading(2000, {
      status: 'looking',
      eyeState: 'bothOpen',
    });

    nowMs = 3600;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(1600);
    });

    expect(hasText(renderer, 'screen:settings')).toBe(true);
    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(hasText(renderer, 'lookPaused:false')).toBe(true);

    await unmount(renderer);
  });

  it('keeps look-pause stopped while gesture inputs are blocked', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'look-pause-mode');
    await press(renderer, 'start');
    await ReactTestRenderer.act(async () => undefined);
    emitGazeReading(1000, {
      status: 'looking',
      eyeState: 'bothOpen',
    });
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    nowMs = 2600;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(1600);
    });

    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(hasText(renderer, 'lookPaused:true')).toBe(true);

    await press(renderer, 'block-gestures');
    emitGazeReading(2800, {
      status: 'notLooking',
      eyeState: 'bothOpen',
    });

    nowMs = 4200;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(1400);
    });

    expect(hasText(renderer, 'gestureBlocked:true')).toBe(true);
    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(hasText(renderer, 'lookPaused:true')).toBe(true);

    await unmount(renderer);
  });

  it('ignores wink gestures while the settings screen is open', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'wink-control-mode');
    await press(renderer, 'go-settings');

    emitGazeReading(1000, {
      status: 'looking',
      eyeState: 'bothOpen',
    });
    emitGazeReading(1100, {
      status: 'looking',
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });
    emitGazeReading(1300, {
      status: 'looking',
      eyeState: 'bothOpen',
    });

    nowMs = 1800;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'screen:settings')).toBe(true);
    expect(hasText(renderer, 'timerMode:winkControl')).toBe(true);
    expect(hasText(renderer, 'phase:idle')).toBe(true);

    await unmount(renderer);
  });

  it('ignores flip posture gestures while the settings screen is open', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'flip-mode');
    await press(renderer, 'go-settings');

    emitDevicePostureReading(1000, 'faceDown');

    nowMs = 1200;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(hasText(renderer, 'screen:settings')).toBe(true);
    expect(hasText(renderer, 'timerMode:flipTimer')).toBe(true);
    expect(hasText(renderer, 'phase:idle')).toBe(true);

    await unmount(renderer);
  });

  it('counts normal timer focus through finish before the first lifecycle tick', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'normal-mode');
    await press(renderer, 'start');

    nowMs = 61000;
    await press(renderer, 'finish');

    expect(hasText(renderer, 'screen:summary')).toBe(true);
    expect(hasText(renderer, 'summaryFocus:60000')).toBe(true);

    await unmount(renderer);
  });

  it('keeps the timer retryable and shows an error when saving a summary fails', async () => {
    jest
      .spyOn(AsyncStorage, 'setItem')
      .mockRejectedValueOnce(new Error('storage unavailable'));
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'go-timer');
    await press(renderer, 'start');
    await press(renderer, 'not-looking');

    nowMs = 61000;
    await press(renderer, 'finish');

    expect(hasText(renderer, 'screen:summary')).toBe(false);
    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(hasText(renderer, 'error:none')).toBe(false);

    await unmount(renderer);
  });

  it('records current session history from start through end', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'basic-mode');
    await press(renderer, 'start');

    nowMs = 6000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(5000);
    });
    await press(renderer, 'pause');

    nowMs = 7000;
    await press(renderer, 'resume');

    nowMs = 9000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(2000);
    });
    await press(renderer, 'finish');

    expect(
      hasText(
        renderer,
        'history:STOP:5000:5000|RESUME:5000:0|END:7000:2000',
      ),
    ).toBe(true);

    await unmount(renderer);
  });

  it('does not record zero-duration history events when look pause stops immediately', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'look-pause-mode');
    await press(renderer, 'start');
    await ReactTestRenderer.act(async () => undefined);

    emitGazeReading(1000, {
      status: 'looking',
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    nowMs = 2200;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(1200);
    });

    expect(hasText(renderer, 'lookPaused:true')).toBe(true);
    expect(hasText(renderer, 'history:')).toBe(true);

    await unmount(renderer);
  });

  it('records a Look Pause stop as soon as looking begins', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'look-pause-mode');
    await press(renderer, 'start');
    await ReactTestRenderer.act(async () => undefined);

    await press(renderer, 'not-looking');

    nowMs = 6000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(5000);
    });

    await press(renderer, 'looking');

    expect(hasText(renderer, 'lookPaused:false')).toBe(true);
    expect(getHistoryText(renderer)).toContain('STOP:5000:5000');

    await unmount(renderer);
  });

  it('starts Look Pause from not looking without pressing the start button', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'look-pause-mode');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'timerMode:lookPause')).toBe(true);
    expect(hasText(renderer, 'phase:idle')).toBe(true);

    emitGazeReading(1100, {
      status: 'notLooking',
      eyeState: 'unknown',
    });

    nowMs = 1150;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(start).toHaveBeenCalledTimes(1);
    expect(hasText(renderer, 'phase:active')).toBe(true);

    await unmount(renderer);
  });

  it('records manual laps while an active timer keeps running', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'basic-mode');
    await press(renderer, 'start');

    nowMs = 6000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(5000);
    });
    await press(renderer, 'lap');

    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(hasText(renderer, 'focus:5000')).toBe(true);
    expect(hasText(renderer, 'history:LAP:5000:5000')).toBe(true);

    nowMs = 9000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await press(renderer, 'lap');

    expect(
      hasText(
        renderer,
        'history:LAP:5000:5000|LAP:8000:3000',
      ),
    ).toBe(true);

    await unmount(renderer);
  });

  it('records a Basic Timer lap before the first lifecycle tick', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'basic-mode');
    await press(renderer, 'start');

    nowMs = 1500;
    await press(renderer, 'lap');

    expect(hasText(renderer, 'focus:500')).toBe(true);
    expect(hasText(renderer, 'history:LAP:500:500')).toBe(true);

    await unmount(renderer);
  });

  it('clears current session history when the preset mode changes', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'basic-mode');
    await press(renderer, 'start');

    nowMs = 6000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(5000);
    });
    await press(renderer, 'lap');

    expect(hasText(renderer, 'history:LAP:5000:5000')).toBe(true);

    await press(renderer, 'flip-mode');

    expect(hasText(renderer, 'timerMode:flipTimer')).toBe(true);
    expect(hasText(renderer, 'history:')).toBe(true);

    await unmount(renderer);
  });

  it('clears current session history when switching between stopwatch and timer', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'basic-mode');
    await press(renderer, 'start');

    nowMs = 6000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(5000);
    });
    await press(renderer, 'lap');

    expect(hasText(renderer, 'history:LAP:5000:5000')).toBe(true);

    await press(renderer, 'timer-function');

    expect(hasText(renderer, 'timekeepingMode:timer')).toBe(true);
    expect(hasText(renderer, 'history:')).toBe(true);

    await unmount(renderer);
  });

  it('clears current session history when reset is pressed', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'basic-mode');
    await press(renderer, 'start');

    nowMs = 6000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(5000);
    });
    await press(renderer, 'lap');

    expect(hasText(renderer, 'history:LAP:5000:5000')).toBe(true);

    await press(renderer, 'reset');

    expect(hasText(renderer, 'history:')).toBe(true);
    expect(hasText(renderer, 'phase:idle')).toBe(true);

    await unmount(renderer);
  });

  it('completes the session when save succeeds even if refreshing the session list fails', async () => {
    const renderer = await renderHarness();

    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('list unavailable'));

    nowMs = 1000;
    await press(renderer, 'go-timer');
    await press(renderer, 'start');
    await press(renderer, 'not-looking');

    nowMs = 61000;
    await press(renderer, 'finish');

    expect(hasText(renderer, 'screen:summary')).toBe(true);
    expect(hasText(renderer, 'phase:ended')).toBe(true);
    expect(hasText(renderer, 'summaryFocus:60000')).toBe(true);
    expect(hasText(renderer, 'error:none')).toBe(true);

    await unmount(renderer);
  });

  it('starts native gaze detection for active watch mode and stops it when paused', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'look-pause-mode');
    await press(renderer, 'start');
    await ReactTestRenderer.act(async () => undefined);

    expect(start).toHaveBeenCalledTimes(1);

    nowMs = 2000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('background'));
    });
    await ReactTestRenderer.act(async () => undefined);

    expect(stop).toHaveBeenCalled();

    await unmount(renderer);
  });

  it('does not start gesture detectors while gesture inputs are blocked', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await press(renderer, 'block-gestures');
    await press(renderer, 'wink-control-mode');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'gestureBlocked:true')).toBe(true);
    expect(hasText(renderer, 'timerMode:winkControl')).toBe(true);
    expect(start).not.toHaveBeenCalled();

    await press(renderer, 'unblock-gestures');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'gestureBlocked:false')).toBe(true);
    expect(start).toHaveBeenCalledTimes(1);

    await unmount(renderer);
  });

  it('does not start device posture gestures while gesture inputs are blocked', async () => {
    const startDevicePosture = jest.fn().mockResolvedValue(undefined);
    const stopDevicePosture = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      startDevicePosture,
      stopDevicePosture,
    };
    const renderer = await renderHarness();

    await press(renderer, 'block-gestures');
    await press(renderer, 'flip-mode');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'gestureBlocked:true')).toBe(true);
    expect(hasText(renderer, 'timerMode:flipTimer')).toBe(true);
    expect(startDevicePosture).not.toHaveBeenCalled();

    await press(renderer, 'unblock-gestures');
    await ReactTestRenderer.act(async () => undefined);

    expect(startDevicePosture).toHaveBeenCalledTimes(1);

    await unmount(renderer);
  });

  it('ignores wink gestures while gesture inputs are blocked', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByRightWink(renderer);
    await press(renderer, 'block-gestures');

    emitGazeReading(5100, {
      status: 'looking',
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });
    emitGazeReading(5400, {
      status: 'looking',
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'gestureBlocked:true')).toBe(true);
    expect(hasText(renderer, 'phase:active')).toBe(true);

    await unmount(renderer);
  });

  it('pushes the configured manual wink thresholds to native gaze detection', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setWinkThresholds = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop, setWinkThresholds};
    const renderer = await renderHarness();

    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'leftEyeClosed:0.1')).toBe(true);
    expect(hasText(renderer, 'rightEyeClosed:0.1')).toBe(true);
    expect(hasText(renderer, 'leftGap:0.3')).toBe(true);
    expect(hasText(renderer, 'rightGap:0.3')).toBe(true);
    expect(setWinkThresholds).toHaveBeenCalledWith(0.1, 0.1, 0.3, 0.3);

    await press(renderer, 'wink-thresholds-custom');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'leftEyeClosed:0.15')).toBe(true);
    expect(hasText(renderer, 'rightEyeClosed:0.2')).toBe(true);
    expect(hasText(renderer, 'leftGap:0.4')).toBe(true);
    expect(hasText(renderer, 'rightGap:0.2')).toBe(true);
    expect(setWinkThresholds).toHaveBeenLastCalledWith(0.15, 0.2, 0.4, 0.2);

    await unmount(renderer);
  });

  it('pushes camera analysis resolution and frame interval to native gaze detection', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setAnalysisResolution = jest.fn().mockResolvedValue(undefined);
    const setFrameIntervalMs = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {
      start,
      stop,
      setAnalysisResolution,
      setFrameIntervalMs,
    };
    const renderer = await renderHarness();

    expect(setAnalysisResolution).toHaveBeenCalledWith(640, 480);
    expect(setFrameIntervalMs).toHaveBeenCalledWith(0);

    await press(renderer, 'resolution-1');
    await press(renderer, 'frame-interval-2');

    expect(setAnalysisResolution).toHaveBeenLastCalledWith(480, 360);
    expect(setFrameIntervalMs).toHaveBeenLastCalledWith(120);
    expect(hasText(renderer, 'resolution:1')).toBe(true);
    expect(hasText(renderer, 'frameInterval:2')).toBe(true);

    await unmount(renderer);
  });

  it('pushes the configured ML Kit performance mode to native gaze detection', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setPerformanceMode = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop, setPerformanceMode};
    const renderer = await renderHarness();

    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'performance:fast')).toBe(true);
    expect(setPerformanceMode).toHaveBeenCalledWith('fast');

    await press(renderer, 'performance-accurate');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'performance:accurate')).toBe(true);
    expect(setPerformanceMode).toHaveBeenCalledWith('accurate');

    await unmount(renderer);
  });

  it('pushes the configured wink distance level to native gaze detection', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setWinkDistanceLevel = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop, setWinkDistanceLevel};
    const renderer = await renderHarness();

    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'winkDistance:5')).toBe(true);
    expect(setWinkDistanceLevel).toHaveBeenCalledWith(5);

    await press(renderer, 'wink-distance-3');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'winkDistance:3')).toBe(true);
    expect(setWinkDistanceLevel).toHaveBeenCalledWith(3);

    await unmount(renderer);
  });

  it('pushes the configured smile threshold and distance to native gaze detection', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setSmileThreshold = jest.fn().mockResolvedValue(undefined);
    const setSmileDistanceLevel = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {
      start,
      stop,
      setSmileThreshold,
      setSmileDistanceLevel,
    };
    const renderer = await renderHarness();

    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'smileThreshold:0.7')).toBe(true);
    expect(hasText(renderer, 'smileDistance:5')).toBe(true);
    expect(setSmileThreshold).toHaveBeenCalledWith(0.7);
    expect(setSmileDistanceLevel).toHaveBeenCalledWith(5);

    await press(renderer, 'smile-threshold-custom');
    await press(renderer, 'smile-distance-3');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'smileThreshold:0.82')).toBe(true);
    expect(hasText(renderer, 'smileDistance:3')).toBe(true);
    expect(setSmileThreshold).toHaveBeenLastCalledWith(0.82);
    expect(setSmileDistanceLevel).toHaveBeenLastCalledWith(3);

    await unmount(renderer);
  });

  it('pushes the configured look angle level to native gaze detection', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setLookAngleLevel = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop, setLookAngleLevel};
    const renderer = await renderHarness();

    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'lookAngle:2')).toBe(true);
    expect(setLookAngleLevel).toHaveBeenCalledWith(2);

    await press(renderer, 'look-angle-3');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'lookAngle:3')).toBe(true);
    expect(setLookAngleLevel).toHaveBeenCalledWith(3);

    await unmount(renderer);
  });

  it('uses the strict face height angle level for wink-control mode', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setFaceHeightAngleLevel = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop, setFaceHeightAngleLevel};
    const renderer = await renderHarness();

    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'faceHeightAngle:2')).toBe(true);
    expect(setFaceHeightAngleLevel).toHaveBeenLastCalledWith(2);

    await press(renderer, 'face-height-3');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'faceHeightAngle:3')).toBe(true);
    expect(setFaceHeightAngleLevel).toHaveBeenLastCalledWith(3);

    await press(renderer, 'wink-control-mode');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'timerMode:winkControl')).toBe(true);
    expect(hasText(renderer, 'faceHeightAngle:3')).toBe(true);
    expect(setFaceHeightAngleLevel).toHaveBeenLastCalledWith(1);

    await unmount(renderer);
  });

  it('restarts native gaze detection when a completed session starts again', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'look-pause-mode');
    await press(renderer, 'start');
    await ReactTestRenderer.act(async () => undefined);

    expect(start).toHaveBeenCalledTimes(1);

    await press(renderer, 'not-looking');
    nowMs = 61000;
    await press(renderer, 'finish');
    await ReactTestRenderer.act(async () => undefined);

    expect(stop).toHaveBeenCalled();
    expect(hasText(renderer, 'phase:ended')).toBe(true);

    nowMs = 70000;
    await press(renderer, 'start');
    await ReactTestRenderer.act(async () => undefined);

    expect(start).toHaveBeenCalledTimes(2);

    await unmount(renderer);
  });

  it('does not reset look-pause mode from a right wink while look-paused', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'look-pause-mode');
    await press(renderer, 'start');
    await ReactTestRenderer.act(async () => undefined);

    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    nowMs = 2600;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(1600);
    });

    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });

    nowMs = 2900;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(hasText(renderer, 'lookPaused:true')).toBe(true);

    await unmount(renderer);
  });

  it('runs Basic Timer as a button-only mode without gaze detection', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'basic-mode');
    await press(renderer, 'start');

    nowMs = 11000;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(10000);
    });

    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(hasText(renderer, 'timerMode:basicTimer')).toBe(true);
    expect(hasText(renderer, 'focus:10000')).toBe(true);
    expect(start).not.toHaveBeenCalled();

    await unmount(renderer);
  });

  it('starts and pauses Flip Timer from device posture readings', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const startDevicePosture = jest.fn().mockResolvedValue(undefined);
    const stopDevicePosture = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {
      start,
      stop,
      startDevicePosture,
      stopDevicePosture,
    };
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'flip-mode');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'timerMode:flipTimer')).toBe(true);
    expect(start).not.toHaveBeenCalled();
    expect(startDevicePosture).toHaveBeenCalledTimes(1);

    emitDevicePostureReading(1000, 'faceDown');

    nowMs = 1200;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(hasText(renderer, 'phase:active')).toBe(true);

    nowMs = 4200;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(3000);
    });

    expect(hasText(renderer, 'focus:3000')).toBe(true);

    emitDevicePostureReading(4200, 'faceUp');

    nowMs = 4350;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);
    expect(hasText(renderer, 'history:STOP:3150:3150')).toBe(true);

    await unmount(renderer);
  });

  it('starts Smile Mode from a detected smile and records button stops in history', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'smile-mode');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'timerMode:smileMode')).toBe(true);
    expect(hasText(renderer, 'phase:idle')).toBe(true);
    expect(start).toHaveBeenCalledTimes(1);

    emitGazeReading(1100, {
      status: 'looking',
      eyeState: 'bothOpen',
      smileDetected: true,
      smileProbability: 0.92,
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(hasText(renderer, 'phase:active')).toBe(true);

    nowMs = 4100;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(3000);
    });
    await press(renderer, 'pause');

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);
    expect(getHistoryText(renderer)).toContain('history:STOP:');

    await unmount(renderer);
  });

  it('pauses Smile Mode from a new detected smile while running', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'smile-mode');
    await ReactTestRenderer.act(async () => undefined);

    emitGazeReading(1100, {
      status: 'looking',
      eyeState: 'bothOpen',
      smileDetected: true,
      smileProbability: 0.92,
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(hasText(renderer, 'phase:active')).toBe(true);

    emitGazeReading(1500, {
      status: 'looking',
      eyeState: 'bothOpen',
      smileDetected: false,
      smileProbability: 0.2,
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    nowMs = 4100;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(2600);
    });

    emitGazeReading(4100, {
      status: 'looking',
      eyeState: 'bothOpen',
      smileDetected: true,
      smileProbability: 0.93,
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);
    expect(getHistoryText(renderer)).toContain('history:STOP:');

    await unmount(renderer);
  });

  it('resumes Smile Mode from a new detected smile after release while paused', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'smile-mode');
    await ReactTestRenderer.act(async () => undefined);

    emitGazeReading(1100, {
      status: 'looking',
      eyeState: 'bothOpen',
      smileDetected: true,
      smileProbability: 0.92,
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(hasText(renderer, 'phase:active')).toBe(true);

    emitGazeReading(1500, {
      status: 'looking',
      eyeState: 'bothOpen',
      smileDetected: false,
      smileProbability: 0.2,
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    emitGazeReading(2500, {
      status: 'looking',
      eyeState: 'bothOpen',
      smileDetected: true,
      smileProbability: 0.93,
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(300);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);

    emitGazeReading(3000, {
      status: 'looking',
      eyeState: 'bothOpen',
      smileDetected: false,
      smileProbability: 0.2,
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    emitGazeReading(3600, {
      status: 'looking',
      eyeState: 'bothOpen',
      smileDetected: true,
      smileProbability: 0.94,
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(getHistoryText(renderer)).toContain('RESUME:');

    await unmount(renderer);
  });

  it('pauses Flip Timer when the device leaves the flat face-down posture', async () => {
    const startDevicePosture = jest.fn().mockResolvedValue(undefined);
    const stopDevicePosture = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      startDevicePosture,
      stopDevicePosture,
    };
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'flip-mode');
    emitDevicePostureReading(1000, 'faceDown');

    nowMs = 1200;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(hasText(renderer, 'phase:active')).toBe(true);

    nowMs = 2500;
    emitDevicePostureReading(2500, 'unknown');

    nowMs = 2650;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);

    await unmount(renderer);
  });

  it('does not record duplicate Flip Timer stops from a brief face-down bounce', async () => {
    const startDevicePosture = jest.fn().mockResolvedValue(undefined);
    const stopDevicePosture = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      startDevicePosture,
      stopDevicePosture,
    };
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'flip-mode');
    emitDevicePostureReading(1000, 'faceDown');

    nowMs = 1200;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(200);
    });

    nowMs = 4200;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(3000);
    });

    emitDevicePostureReading(4200, 'faceUp');

    nowMs = 4350;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(hasText(renderer, 'history:STOP:3150:3150')).toBe(true);

    emitDevicePostureReading(4400, 'faceDown');

    nowMs = 4450;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    emitDevicePostureReading(4450, 'faceUp');

    nowMs = 4650;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);
    expect(hasText(renderer, 'history:STOP:3150:3150')).toBe(true);

    await unmount(renderer);
  });

  it('does not record duplicate Flip Timer history while rotating slowly', async () => {
    const startDevicePosture = jest.fn().mockResolvedValue(undefined);
    const stopDevicePosture = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {
      start: jest.fn().mockResolvedValue(undefined),
      stop: jest.fn().mockResolvedValue(undefined),
      startDevicePosture,
      stopDevicePosture,
    };
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'flip-mode');
    emitDevicePostureReading(1000, 'faceDown');

    nowMs = 1200;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(200);
    });

    nowMs = 4200;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(3000);
    });

    emitDevicePostureReading(4200, 'faceUp');

    nowMs = 4300;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(100);
    });

    emitDevicePostureReading(4300, 'faceDown');

    nowMs = 4500;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(200);
    });

    emitDevicePostureReading(4500, 'faceUp');

    nowMs = 4700;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(200);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);
    expect(getHistoryText(renderer)).toContain('history:STOP:');
    expect(getHistoryText(renderer)).not.toContain('|');

    await unmount(renderer);
  });

  it('starts wink-control mode from the start button as a touch fallback', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'wink-control-mode');
    await press(renderer, 'start');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'timerMode:winkControl')).toBe(true);
    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(start).toHaveBeenCalledTimes(1);

    await unmount(renderer);
  });

  it('does not start wink-control mode from a wink hold', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'wink-control-mode');
    await ReactTestRenderer.act(async () => undefined);

    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });

    nowMs = 4500;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(3500);
    });

    expect(hasText(renderer, 'timerMode:winkControl')).toBe(true);
    expect(hasText(renderer, 'phase:idle')).toBe(true);

    await unmount(renderer);
  });

  it('starts wink-control mode from the live right wink shown in settings test mode', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'wink-control-mode');
    await ReactTestRenderer.act(async () => undefined);

    emitGazeReading(1000, {
      status: 'looking',
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    emitGazeReading(1100, {
      status: 'looking',
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(hasText(renderer, 'timerMode:winkControl')).toBe(true);
    expect(hasText(renderer, 'phase:active')).toBe(true);

    await unmount(renderer);
  });

  it('pauses wink-control mode on the live right wink shown in settings test mode', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByRightWink(renderer);

    nowMs = 5100;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);

    nowMs = 5600;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);

    await unmount(renderer);
  });

  it('does not pause wink-control mode when the face leaves and returns looking', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByRightWink(renderer);

    nowMs = 5000;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'notLooking',
      confidence: 1,
      eyeState: 'unknown',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    nowMs = 6500;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    nowMs = 8500;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(2000);
    });

    expect(hasText(renderer, 'timerMode:winkControl')).toBe(true);
    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(hasText(renderer, 'lookPaused:false')).toBe(true);

    await unmount(renderer);
  });

  it('does not pause wink-control mode when returning from outside looks like a wink release', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByRightWink(renderer);

    emitGazeReading(5000, {
      status: 'notLooking',
      eyeState: 'unknown',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    emitGazeReading(6500, {
      status: 'looking',
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });

    emitGazeReading(6800, {
      status: 'looking',
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'timerMode:winkControl')).toBe(true);
    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(hasText(renderer, 'lookPaused:false')).toBe(true);

    await unmount(renderer);
  });

  it('pauses wink-control mode when a short right wink happens between ticks', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByRightWink(renderer);

    nowMs = 5100;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });

    nowMs = 5300;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);

    await unmount(renderer);
  });

  it('resumes wink-control mode after a short right wink while paused', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByRightWink(renderer);

    nowMs = 5100;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    nowMs = 5600;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);

    nowMs = 6100;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });

    nowMs = 6400;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(stop).not.toHaveBeenCalled();

    await unmount(renderer);
  });

  it('resets wink-control mode from a short left wink while paused', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByRightWink(renderer);

    nowMs = 5100;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });

    nowMs = 5300;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);

    nowMs = 6100;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
    });

    nowMs = 6400;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'phase:idle')).toBe(true);
    expect(hasText(renderer, 'focus:0')).toBe(true);

    await unmount(renderer);
  });

  it('records a wink-control lap from a short left wink while running', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByRightWink(renderer);

    nowMs = 5100;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
    });

    nowMs = 5400;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(
      renderer.root
        .findAllByType(Text)
        .some(
          node =>
            typeof node.props.children === 'string' &&
            node.props.children.startsWith('history:LAP:'),
        ),
    ).toBe(true);

    await unmount(renderer);
  });

  it('resumes wink-control mode from the resume button as a touch fallback', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByRightWink(renderer);

    nowMs = 5100;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });

    nowMs = 5300;
    DeviceEventEmitter.emit('WinkTimerGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);

    nowMs = 6000;
    await press(renderer, 'resume');

    expect(hasText(renderer, 'phase:active')).toBe(true);

    await unmount(renderer);
  });
});
