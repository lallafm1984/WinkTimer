import {DeviceEventEmitter, NativeModules} from 'react-native';
import {createMockGazeDetector} from '../GazeDetector';
import type {GazeDetector, MockGazeDetector} from '../GazeDetector';

type NativeGazeDetectionModuleForTest = {
  start: jest.Mock<Promise<void>, []>;
  stop: jest.Mock<Promise<void>, []>;
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

describe('GazeDetector', () => {
  afterEach(() => {
    DeviceEventEmitter.removeAllListeners('TimewatchGazeDetectionReading');

    if (originalNativeGazeDetection) {
      nativeModules.NativeGazeDetection = originalNativeGazeDetection;
    } else {
      delete nativeModules.NativeGazeDetection;
    }

    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('emits the configured mock status', () => {
    const detector = createMockGazeDetector('notLooking');
    const readings = detector.getLatestReading(1000);

    expect(readings).toEqual({
      status: 'notLooking',
      confidence: 1,
      eyeState: 'unknown',
      atMs: 1000,
    });
  });

  it('can switch mock status', () => {
    const detector = createMockGazeDetector('unknown');

    detector.setMockStatus('looking');

    expect(detector.getLatestReading(2000).status).toBe('looking');
  });

  it.each([
    {status: 'unknown', confidence: 0},
    {status: 'looking', confidence: 1},
    {status: 'notLooking', confidence: 1},
  ] as const)('emits confidence $confidence for $status status', ({status, confidence}) => {
    const detector = createMockGazeDetector(status);

    expect(detector.getLatestReading(3000).confidence).toBe(confidence);
  });

  it('keeps mock controls off the production detector type', () => {
    const mockDetector: MockGazeDetector = createMockGazeDetector();
    const productionDetector: GazeDetector = mockDetector;

    const assertProductionShape = (detector: GazeDetector) => {
      // @ts-expect-error setMockStatus belongs to MockGazeDetector only.
      detector.setMockStatus('looking');
    };

    expect(productionDetector.getLatestReading(4000).status).toBe('unknown');
    expect(typeof assertProductionShape).toBe('function');
  });

  it('start and stop resolve when native module is absent', async () => {
    delete nativeModules.NativeGazeDetection;
    const detector = createMockGazeDetector();

    await expect(detector.start()).resolves.toBeUndefined();
    await expect(detector.stop()).resolves.toBeUndefined();
  });

  it('delegates start and stop when native module is present', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const detector = createMockGazeDetector();

    await detector.start();
    await detector.stop();

    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('delegates a fresh native start after stopping', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop};
    const detector = createMockGazeDetector();

    await detector.start();
    await detector.stop();
    await detector.start();

    expect(start).toHaveBeenCalledTimes(2);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('delegates wink sensitivity changes to the native detector', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setWinkSensitivity = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop, setWinkSensitivity};
    const detector = createMockGazeDetector();

    await detector.setWinkSensitivity(3);
    await detector.setWinkSensitivity(1);
    await detector.setWinkSensitivity(5);

    expect(setWinkSensitivity).toHaveBeenNthCalledWith(1, 1);
    expect(setWinkSensitivity).toHaveBeenNthCalledWith(2, -2);
    expect(setWinkSensitivity).toHaveBeenNthCalledWith(3, 3);
  });

  it('delegates wink distance changes to the native detector', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setWinkDistanceLevel = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop, setWinkDistanceLevel};
    const detector = createMockGazeDetector();

    await detector.setWinkDistanceLevel(2);

    expect(setWinkDistanceLevel).toHaveBeenCalledWith(2);
  });

  it('delegates look angle changes to the native detector', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setLookAngleLevel = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop, setLookAngleLevel};
    const detector = createMockGazeDetector();

    await detector.setLookAngleLevel(3);

    expect(setLookAngleLevel).toHaveBeenCalledWith(3);
  });

  it('delegates camera analysis resolution changes to the native detector', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setAnalysisResolution = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop, setAnalysisResolution};
    const detector = createMockGazeDetector();

    await detector.setDetectionResolutionLevel(1);
    await detector.setDetectionResolutionLevel(3);

    expect(setAnalysisResolution).toHaveBeenNthCalledWith(1, 480, 360);
    expect(setAnalysisResolution).toHaveBeenNthCalledWith(2, 960, 720);
  });

  it('delegates ML Kit frame interval changes to the native detector', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setFrameIntervalMs = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {start, stop, setFrameIntervalMs};
    const detector = createMockGazeDetector();

    await detector.setDetectionFrameIntervalLevel(2);
    await detector.setDetectionFrameIntervalLevel(3);

    expect(setFrameIntervalMs).toHaveBeenNthCalledWith(1, 120);
    expect(setFrameIntervalMs).toHaveBeenNthCalledWith(2, 240);
  });

  it('uses native gaze detection events as the latest reading', () => {
    const detector = createMockGazeDetector('unknown');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 0.82,
      eyeState: 'oneEyeClosed',
    });

    expect(detector.getLatestReading(5000)).toEqual({
      status: 'looking',
      confidence: 0.82,
      eyeState: 'oneEyeClosed',
      atMs: 5000,
    });
  });

  it('ignores malformed native gaze detection events', () => {
    const detector = createMockGazeDetector('notLooking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'sideways',
      confidence: 0.9,
    });

    expect(detector.getLatestReading(6000)).toEqual({
      status: 'notLooking',
      confidence: 1,
      eyeState: 'unknown',
      atMs: 6000,
    });
  });

  it('ignores malformed native eye state while accepting the status', () => {
    const detector = createMockGazeDetector('unknown');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 0.75,
      eyeState: 'leftish',
    });

    expect(detector.getLatestReading(7000)).toEqual({
      status: 'looking',
      confidence: 0.75,
      eyeState: 'unknown',
      atMs: 7000,
    });
  });

  it('consumes a short single wink captured between polling ticks', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('looking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    nowMs = 1100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
    });

    nowMs = 1300;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.consumeSingleWink(1500)).toEqual({
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      atMs: 1500,
    });
    expect(detector.consumeSingleWink(1600)).toBeNull();
  });

  it('preserves the side of a short single wink', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('looking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    nowMs = 1100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
    });

    nowMs = 1300;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.consumeSingleWink(1500)).toEqual({
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      winkSide: 'left',
      atMs: 1500,
    });
  });

  it('does not consume a wink when the face returns from outside before both eyes are seen open', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('notLooking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'notLooking',
      confidence: 1,
      eyeState: 'unknown',
    });

    nowMs = 1100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
    });

    nowMs = 1400;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.consumeSingleWink(1500)).toBeNull();
  });

  it('does not consume a long wink hold as a single wink', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('looking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    nowMs = 1100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
    });

    nowMs = 2600;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.consumeSingleWink(2700)).toBeNull();
  });

  it('does not consume an intentionally slow wink as a single wink', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('looking');
    detector.setWinkTimeLevel(1);

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    nowMs = 1100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
    });

    nowMs = 1900;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.consumeSingleWink(2000)).toBeNull();
  });

  it('uses the default wink time level to accept a moderately slow wink', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('looking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    nowMs = 1100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
    });

    nowMs = 1900;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.consumeSingleWink(2000)).toEqual({
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      atMs: 2000,
    });
  });

  it('uses the longest wink time level while still rejecting holds', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('looking');
    detector.setWinkTimeLevel(3);

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    nowMs = 1100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
    });

    nowMs = 2300;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.consumeSingleWink(2400)).toEqual({
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      atMs: 2400,
    });

    nowMs = 3000;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    nowMs = 3100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
    });

    nowMs = 4600;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.consumeSingleWink(4700)).toBeNull();
  });

  it('uses the configured wink minimum time level', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('looking');
    detector.setWinkMinTimeLevel(2);

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    nowMs = 1100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
    });

    nowMs = 1250;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.consumeSingleWink(1300)).toBeNull();

    nowMs = 2000;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    nowMs = 2100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
    });

    nowMs = 2350;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.consumeSingleWink(2400)).toEqual({
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      atMs: 2400,
    });
  });

  it('keeps a wink hold active through a brief eye-state dropout', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('looking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    nowMs = 1100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
    });

    expect(detector.getLatestReading(1800).eyeState).toBe('oneEyeClosed');

    nowMs = 1850;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.getLatestReading(2100).eyeState).toBe('oneEyeClosed');
    expect(detector.getLatestReading(2600).eyeState).toBe('bothOpen');
  });

  it('suppresses the current wink release until the eyes open once', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('looking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    nowMs = 1100;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
    });

    detector.suppressSingleWinkUntilOpen();

    nowMs = 1200;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.consumeSingleWink(1300)).toBeNull();

    nowMs = 1500;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    nowMs = 1600;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
    });

    nowMs = 1900;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.consumeSingleWink(2000)).toEqual({
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      atMs: 2000,
    });
  });
});
