import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {
  AppState as NativeAppState,
  DeviceEventEmitter,
  NativeModules,
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
  setWinkSensitivity?: jest.Mock<Promise<void>, [number]>;
  setWinkDistanceLevel?: jest.Mock<Promise<void>, [number]>;
  setLookAngleLevel?: jest.Mock<Promise<void>, [number]>;
  setAnalysisResolution?: jest.Mock<Promise<void>, [number, number]>;
  setFrameIntervalMs?: jest.Mock<Promise<void>, [number]>;
};

type MutableNativeModules = typeof NativeModules & {
  NativeGazeDetection?: NativeGazeDetectionModuleForTest;
};

const nativeModules = NativeModules as MutableNativeModules;
const originalNativeGazeDetection = nativeModules.NativeGazeDetection;

function AppStateHarness() {
  const app = useAppState();

  return (
    <View>
      <Text>{`screen:${app.screen}`}</Text>
      <Text>{`phase:${app.timer.phase}`}</Text>
      <Text>{`focus:${app.timer.focusDurationMs}`}</Text>
      <Text>{`lookPaused:${app.timer.isLookPaused}`}</Text>
      <Text>{`mode:${app.statusDisplayMode}`}</Text>
      <Text>{`timerMode:${app.timerModeId}`}</Text>
      <Text>{`winkSensitivity:${app.winkSensitivityLevel}`}</Text>
      <Text>{`winkDistance:${app.winkDistanceLevel}`}</Text>
      <Text>{`lookAngle:${app.lookAngleLevel}`}</Text>
      <Text>{`winkTime:${app.winkTimeLevel}`}</Text>
      <Text>{`winkMinTime:${app.winkMinTimeLevel}`}</Text>
      <Text>{`resolution:${app.detectionResolutionLevel}`}</Text>
      <Text>{`frameInterval:${app.detectionFrameIntervalLevel}`}</Text>
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
        accessibilityLabel="normal-mode"
        onPress={() => {
          app.setNormalTimerMode(true);
        }}>
        normal
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
        accessibilityLabel="wink-sensitivity-5"
        onPress={() => {
          app.setWinkSensitivityLevel(5);
        }}>
        wink sensitivity 5
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
        accessibilityLabel="look-angle-3"
        onPress={() => {
          app.setLookAngleLevel(3);
        }}>
        look angle 3
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="wink-time-3"
        onPress={() => {
          app.setWinkTimeLevel(3);
        }}>
        wink time 3
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="wink-min-time-3"
        onPress={() => {
          app.setWinkMinTimeLevel(3);
        }}>
        wink min time 3
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
    await AsyncStorage.clear();
  });

  afterEach(() => {
    if (originalNativeGazeDetection) {
      nativeModules.NativeGazeDetection = originalNativeGazeDetection;
    } else {
      delete nativeModules.NativeGazeDetection;
    }

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
    },
  ) {
    nowMs = atMs;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      confidence: payload.status === 'unknown' ? 0 : 1,
      ...payload,
    });
  }

  function emitDevicePostureReading(
    atMs: number,
    posture: 'faceDown' | 'faceUp' | 'unknown',
  ) {
    nowMs = atMs;
    DeviceEventEmitter.emit('TimewatchDevicePostureReading', {
      posture,
    });
  }

  async function startWinkControlByLeftWink(
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
      winkSide: 'left',
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

    expect(hasText(renderer, 'mode:minimal')).toBe(true);

    await unmount(renderer);
  });

  it('pauses an active timer on app background even when another screen is selected', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'start');
    await press(renderer, 'not-looking');
    await press(renderer, 'go-settings');

    nowMs = 2000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('background'));
    });

    expect(hasText(renderer, 'screen:settings')).toBe(true);
    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);

    await unmount(renderer);
  });

  it('keeps wink-control mode running through app background because pause is wink-only', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByLeftWink(renderer);

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
      winkSide: 'left',
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

    expect(hasText(renderer, 'screen:onboarding')).toBe(false);
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

  it('pushes the configured wink sensitivity level to native gaze detection', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setWinkSensitivity = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop, setWinkSensitivity};
    const renderer = await renderHarness();

    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'winkSensitivity:3')).toBe(true);
    expect(setWinkSensitivity).toHaveBeenCalledWith(1);

    await press(renderer, 'wink-sensitivity-5');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'winkSensitivity:5')).toBe(true);
    expect(setWinkSensitivity).toHaveBeenCalledWith(3);

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

  it('keeps the configured wink time level in app state', async () => {
    const renderer = await renderHarness();

    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'winkTime:2')).toBe(true);

    await press(renderer, 'wink-time-3');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'winkTime:3')).toBe(true);

    await unmount(renderer);
  });

  it('keeps the configured wink minimum time level in app state', async () => {
    const renderer = await renderHarness();

    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'winkMinTime:1')).toBe(true);

    await press(renderer, 'wink-min-time-3');
    await ReactTestRenderer.act(async () => undefined);

    expect(hasText(renderer, 'winkMinTime:3')).toBe(true);

    await unmount(renderer);
  });

  it('restarts native gaze detection when a completed session starts again', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    nowMs = 1000;
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
    await press(renderer, 'start');
    await ReactTestRenderer.act(async () => undefined);

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
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

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });

    nowMs = 2900;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
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

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
    });

    nowMs = 4500;
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(3500);
    });

    expect(hasText(renderer, 'timerMode:winkControl')).toBe(true);
    expect(hasText(renderer, 'phase:idle')).toBe(true);

    await unmount(renderer);
  });

  it('pauses wink-control mode on a short left wink', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByLeftWink(renderer);

    nowMs = 5100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'phase:active')).toBe(true);

    nowMs = 5600;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
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

    await startWinkControlByLeftWink(renderer);

    nowMs = 5000;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'notLooking',
      confidence: 1,
      eyeState: 'unknown',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(50);
    });

    nowMs = 6500;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
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

    await startWinkControlByLeftWink(renderer);

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
      winkSide: 'left',
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

  it('pauses wink-control mode when a short left wink happens between ticks', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByLeftWink(renderer);

    nowMs = 5100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
    });

    nowMs = 5300;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
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

  it('resumes wink-control mode after a short left wink while paused', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByLeftWink(renderer);

    nowMs = 5100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
    });
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    nowMs = 5600;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });
    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);

    nowMs = 6100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
    });

    nowMs = 6400;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
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

  it('resets wink-control mode from a short right wink while paused', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByLeftWink(renderer);

    nowMs = 5100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
    });

    nowMs = 5300;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    await ReactTestRenderer.act(async () => {
      jest.advanceTimersByTime(500);
    });

    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);

    nowMs = 6100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });

    nowMs = 6400;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
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

  it('records a wink-control lap from a short right wink while running', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const renderer = await renderHarness();

    await startWinkControlByLeftWink(renderer);

    nowMs = 5100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });

    nowMs = 5400;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
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

    await startWinkControlByLeftWink(renderer);

    nowMs = 5100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
    });

    nowMs = 5300;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
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
