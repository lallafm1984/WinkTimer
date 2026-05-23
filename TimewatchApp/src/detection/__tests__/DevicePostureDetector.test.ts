import {DeviceEventEmitter, NativeModules} from 'react-native';
import {createDevicePostureDetector} from '../DevicePostureDetector';

type NativePostureModuleForTest = {
  startDevicePosture: jest.Mock<Promise<void>, []>;
  stopDevicePosture: jest.Mock<Promise<void>, []>;
};

type MutableNativeModules = typeof NativeModules & {
  NativeGazeDetection?: Partial<NativePostureModuleForTest>;
};

const nativeModules = NativeModules as MutableNativeModules;
const originalNativeGazeDetection = nativeModules.NativeGazeDetection;

describe('DevicePostureDetector', () => {
  let nowMs = 0;

  beforeEach(() => {
    nowMs = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
  });

  afterEach(() => {
    DeviceEventEmitter.removeAllListeners('TimewatchDevicePostureReading');

    if (originalNativeGazeDetection) {
      nativeModules.NativeGazeDetection = originalNativeGazeDetection;
    } else {
      delete nativeModules.NativeGazeDetection;
    }

    jest.restoreAllMocks();
  });

  it('starts and stops native device posture detection', async () => {
    const startDevicePosture = jest.fn().mockResolvedValue(undefined);
    const stopDevicePosture = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {
      startDevicePosture,
      stopDevicePosture,
    };
    const detector = createDevicePostureDetector();

    await detector.start();
    await detector.stop();

    expect(startDevicePosture).toHaveBeenCalledTimes(1);
    expect(stopDevicePosture).toHaveBeenCalledTimes(1);
  });

  it('confirms posture changes only after a short stable hold', () => {
    const detector = createDevicePostureDetector();

    expect(detector.getLatestPosture()).toBe('unknown');

    nowMs = 1000;
    DeviceEventEmitter.emit('TimewatchDevicePostureReading', {
      posture: 'faceDown',
    });

    expect(detector.getLatestPosture()).toBe('unknown');

    nowMs = 1149;
    expect(detector.getLatestPosture()).toBe('unknown');

    nowMs = 1150;
    expect(detector.getLatestPosture()).toBe('faceDown');

    nowMs = 2000;
    DeviceEventEmitter.emit('TimewatchDevicePostureReading', {
      posture: 'faceUp',
    });

    expect(detector.getLatestPosture()).toBe('faceDown');

    nowMs = 2149;
    expect(detector.getLatestPosture()).toBe('faceDown');

    nowMs = 2150;
    expect(detector.getLatestPosture()).toBe('faceUp');
  });
});
