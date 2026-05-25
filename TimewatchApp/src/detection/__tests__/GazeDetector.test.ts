import { DeviceEventEmitter, NativeModules } from 'react-native';
import { createMockGazeDetector } from '../GazeDetector';
import type { GazeDetector, MockGazeDetector } from '../GazeDetector';

type NativeGazeDetectionModuleForTest = {
  start: jest.Mock<Promise<void>, []>;
  stop: jest.Mock<Promise<void>, []>;
  setWinkDistanceLevel?: jest.Mock<Promise<void>, [number]>;
  setLookAngleLevel?: jest.Mock<Promise<void>, [number]>;
  setFaceHeightAngleLevel?: jest.Mock<Promise<void>, [number]>;
  setWinkThresholds?: jest.Mock<
    Promise<void>,
    [number, number, number, number]
  >;
  setAnalysisResolution?: jest.Mock<Promise<void>, [number, number]>;
  setFrameIntervalMs?: jest.Mock<Promise<void>, [number]>;
  setPerformanceMode?: jest.Mock<Promise<void>, [string]>;
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
    { status: 'unknown', confidence: 0 },
    { status: 'looking', confidence: 1 },
    { status: 'notLooking', confidence: 1 },
  ] as const)(
    'emits confidence $confidence for $status status',
    ({ status, confidence }) => {
      const detector = createMockGazeDetector(status);

      expect(detector.getLatestReading(3000).confidence).toBe(confidence);
    },
  );

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
    nativeModules.NativeGazeDetection = { start, stop };
    const detector = createMockGazeDetector();

    await detector.start();
    await detector.stop();

    expect(start).toHaveBeenCalledTimes(1);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('delegates a fresh native start after stopping', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = { start, stop };
    const detector = createMockGazeDetector();

    await detector.start();
    await detector.stop();
    await detector.start();

    expect(start).toHaveBeenCalledTimes(2);
    expect(stop).toHaveBeenCalledTimes(1);
  });

  it('delegates normalized wink distance changes to the native detector', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setWinkDistanceLevel = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = { start, stop, setWinkDistanceLevel };
    const detector = createMockGazeDetector();

    await detector.setWinkDistanceLevel(2);

    expect(setWinkDistanceLevel).toHaveBeenCalledWith(1);
  });

  it('delegates calibrated wink threshold changes to the native detector', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setWinkThresholds = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = { start, stop, setWinkThresholds };
    const detector = createMockGazeDetector();

    await detector.setWinkThresholds(0.456, 0.503, 0.344, 0.218);

    expect(setWinkThresholds).toHaveBeenCalledWith(
      0.456,
      0.503,
      0.344,
      0.218,
    );
  });

  it('delegates look angle changes to the native detector', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setLookAngleLevel = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = { start, stop, setLookAngleLevel };
    const detector = createMockGazeDetector();

    await detector.setLookAngleLevel(3);

    expect(setLookAngleLevel).toHaveBeenCalledWith(3);
  });

  it('delegates face height angle changes to the native detector', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setFaceHeightAngleLevel = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = {
      start,
      stop,
      setFaceHeightAngleLevel,
    };
    const detector = createMockGazeDetector();

    await detector.setFaceHeightAngleLevel(1);
    await detector.setFaceHeightAngleLevel(3);

    expect(setFaceHeightAngleLevel).toHaveBeenNthCalledWith(1, 1);
    expect(setFaceHeightAngleLevel).toHaveBeenNthCalledWith(2, 3);
  });

  it('delegates camera analysis resolution changes to the native detector', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setAnalysisResolution = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = { start, stop, setAnalysisResolution };
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
    nativeModules.NativeGazeDetection = { start, stop, setFrameIntervalMs };
    const detector = createMockGazeDetector();

    await detector.setDetectionFrameIntervalLevel(2);
    await detector.setDetectionFrameIntervalLevel(3);

    expect(setFrameIntervalMs).toHaveBeenNthCalledWith(1, 120);
    expect(setFrameIntervalMs).toHaveBeenNthCalledWith(2, 240);
  });

  it('delegates ML Kit performance mode changes to the native detector', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setPerformanceMode = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = { start, stop, setPerformanceMode };
    const detector = createMockGazeDetector();

    await detector.setDetectionPerformanceMode('accurate');
    await detector.setDetectionPerformanceMode('fast');

    expect(setPerformanceMode).toHaveBeenNthCalledWith(1, 'accurate');
    expect(setPerformanceMode).toHaveBeenNthCalledWith(2, 'fast');
  });

  it('falls back to fast when an invalid ML Kit performance mode is provided', async () => {
    const start = jest.fn().mockResolvedValue(undefined);
    const stop = jest.fn().mockResolvedValue(undefined);
    const setPerformanceMode = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeGazeDetection = { start, stop, setPerformanceMode };
    const detector = createMockGazeDetector();

    await detector.setDetectionPerformanceMode('slow' as 'fast');

    expect(setPerformanceMode).toHaveBeenCalledWith('fast');
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

  it('ignores wink classification details from native events when the face is not facing the screen', () => {
    const detector = createMockGazeDetector('unknown');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'notLooking',
      confidence: 0.6,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
      leftEyeOpenProbability: 0.1,
      rightEyeOpenProbability: 0.8,
    });

    expect(detector.getLatestReading(5100)).toEqual({
      status: 'notLooking',
      confidence: 0.6,
      eyeState: 'unknown',
      winkDebug: expect.objectContaining({
        leftEyeOpenProbability: 0.1,
        rightEyeOpenProbability: 0.8,
      }),
      atMs: 5100,
    });
    expect(detector.consumeSingleWink(5100)).toBeNull();
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

  it('preserves native wink debug values in the latest reading', () => {
    const detector = createMockGazeDetector('looking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 0.82,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
      leftEyeOpenProbability: 0.08,
      rightEyeOpenProbability: 0.91,
      eyeProbabilityGap: 0.83,
      faceAreaRatio: 0.12,
      minFaceAreaRatio: 0,
      minEyeOpenProbability: 0.25,
      maxWinkEyeOpenProbability: 0.45,
      minWinkEyeProbabilityGap: 0.34,
      minOpenEyeProbabilityForWink: 0.62,
      leftEyeClosedThreshold: 0.45,
      rightEyeClosedThreshold: 0.45,
      leftEyeProbabilityGapThreshold: 0.34,
      rightEyeProbabilityGapThreshold: 0.22,
      facePitchDegrees: -8.4,
      faceYawDegrees: 2.1,
      faceRollDegrees: -1.3,
      maxFacePitchDegrees: 16,
      maxFaceYawDegrees: 18,
      maxFaceRollDegrees: 50,
      analysisDurationMs: 24,
    });

    expect(detector.getLatestReading(7100)).toEqual({
      status: 'looking',
      confidence: 0.82,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
      winkDebug: {
        leftEyeOpenProbability: 0.08,
        rightEyeOpenProbability: 0.91,
        eyeProbabilityGap: 0.83,
        faceAreaRatio: 0.12,
        minFaceAreaRatio: 0,
        minEyeOpenProbability: 0.25,
        maxWinkEyeOpenProbability: 0.45,
        minWinkEyeProbabilityGap: 0.34,
        minOpenEyeProbabilityForWink: 0.62,
        leftEyeClosedThreshold: 0.45,
        rightEyeClosedThreshold: 0.45,
        leftEyeProbabilityGapThreshold: 0.34,
        rightEyeProbabilityGapThreshold: 0.22,
        facePitchDegrees: -8.4,
        faceYawDegrees: 2.1,
        faceRollDegrees: -1.3,
        maxFacePitchDegrees: 16,
        maxFaceYawDegrees: 18,
        maxFaceRollDegrees: 50,
        analysisDurationMs: 24,
      },
      atMs: 7100,
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

  it('classifies fixed-threshold wink readings from raw eye probabilities', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('looking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'unknown',
      leftEyeOpenProbability: 0.9,
      rightEyeOpenProbability: 0.86,
    });

    nowMs = 1120;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      leftEyeOpenProbability: 0.92,
      rightEyeOpenProbability: 0.08,
      winkSide: 'left',
    });

    nowMs = 1340;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'unknown',
      leftEyeOpenProbability: 0.91,
      rightEyeOpenProbability: 0.88,
    });

    expect(detector.consumeSingleWink(1500)).toEqual({
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      winkSide: 'right',
      winkDebug: expect.objectContaining({
        leftEyeOpenProbability: 0.92,
        rightEyeOpenProbability: 0.08,
      }),
      atMs: 1500,
    });
  });

  it('uses calibrated wink thresholds from native debug values', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('looking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      leftEyeOpenProbability: 0.91,
      rightEyeOpenProbability: 0.9,
      minEyeOpenProbability: 0.85,
    });

    nowMs = 1160;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'unknown',
      leftEyeOpenProbability: 0.18,
      rightEyeOpenProbability: 0.78,
      leftEyeClosedThreshold: 0.2,
      leftEyeProbabilityGapThreshold: 0.45,
      minOpenEyeProbabilityForWink: 0.5,
    });

    nowMs = 1440;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      leftEyeOpenProbability: 0.9,
      rightEyeOpenProbability: 0.89,
      minEyeOpenProbability: 0.85,
    });

    expect(detector.consumeSingleWink(1500)).toEqual({
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      winkSide: 'left',
      winkDebug: expect.objectContaining({
        leftEyeOpenProbability: 0.18,
        rightEyeOpenProbability: 0.78,
        leftEyeClosedThreshold: 0.2,
        leftEyeProbabilityGapThreshold: 0.45,
      }),
      atMs: 1500,
    });
  });

  it('rejects calibrated wink readings when the eye gap is below the selected side threshold', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('looking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      leftEyeOpenProbability: 0.91,
      rightEyeOpenProbability: 0.9,
      minEyeOpenProbability: 0.85,
    });

    nowMs = 1160;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
      leftEyeOpenProbability: 0.08,
      rightEyeOpenProbability: 0.52,
      leftEyeClosedThreshold: 0.1,
      leftEyeProbabilityGapThreshold: 0.5,
      minOpenEyeProbabilityForWink: 0.5,
    });

    nowMs = 1440;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      leftEyeOpenProbability: 0.9,
      rightEyeOpenProbability: 0.89,
      minEyeOpenProbability: 0.85,
    });

    expect(detector.consumeSingleWink(1500)).toBeNull();
  });

  it('rejects raw wink readings when debug face geometry is outside the allowed range', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('looking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      leftEyeOpenProbability: 0.91,
      rightEyeOpenProbability: 0.9,
      minEyeOpenProbability: 0.85,
      faceAreaRatio: 0.08,
      minFaceAreaRatio: 0.06,
      facePitchDegrees: 2,
      maxFacePitchDegrees: 16,
      faceYawDegrees: 2,
      maxFaceYawDegrees: 18,
      faceRollDegrees: 2,
      maxFaceRollDegrees: 50,
    });

    nowMs = 1160;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'left',
      leftEyeOpenProbability: 0.05,
      rightEyeOpenProbability: 0.9,
      faceAreaRatio: 0.04,
      minFaceAreaRatio: 0.06,
      facePitchDegrees: 2,
      maxFacePitchDegrees: 16,
      faceYawDegrees: 24,
      maxFaceYawDegrees: 18,
      faceRollDegrees: 2,
      maxFaceRollDegrees: 50,
    });

    nowMs = 1440;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      leftEyeOpenProbability: 0.9,
      rightEyeOpenProbability: 0.89,
      minEyeOpenProbability: 0.85,
      faceAreaRatio: 0.08,
      minFaceAreaRatio: 0.06,
      facePitchDegrees: 2,
      maxFacePitchDegrees: 16,
      faceYawDegrees: 2,
      maxFaceYawDegrees: 18,
      faceRollDegrees: 2,
      maxFaceRollDegrees: 50,
    });

    expect(detector.consumeSingleWink(1500)).toBeNull();
  });

  it('does not consume a second wink from immediate post-release bounce', () => {
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
      winkSide: 'right',
    });

    nowMs = 1350;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.consumeSingleWink(1400)).toEqual({
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      winkSide: 'right',
      atMs: 1400,
    });

    nowMs = 1500;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
    });

    nowMs = 1750;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
    });

    expect(detector.consumeSingleWink(1800)).toBeNull();
  });

  it('does not arm wink actions until both eyes are at least 0.85 open', () => {
    jest.useFakeTimers();
    let nowMs = 1000;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    const detector = createMockGazeDetector('looking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      leftEyeOpenProbability: 0.84,
      rightEyeOpenProbability: 0.9,
    });

    nowMs = 1120;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'oneEyeClosed',
      winkSide: 'right',
      leftEyeOpenProbability: 0.92,
      rightEyeOpenProbability: 0.08,
    });

    nowMs = 1340;
    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      leftEyeOpenProbability: 0.91,
      rightEyeOpenProbability: 0.88,
    });

    expect(detector.consumeSingleWink(1500)).toBeNull();
  });

  it('marks non-ready raw eye values as wink-unavailable unknown state', () => {
    const detector = createMockGazeDetector('looking');

    DeviceEventEmitter.emit('TimewatchGazeDetectionReading', {
      status: 'looking',
      confidence: 1,
      eyeState: 'bothOpen',
      leftEyeOpenProbability: 0.82,
      rightEyeOpenProbability: 0.86,
    });

    expect(detector.getLatestReading(1500)).toEqual({
      status: 'looking',
      confidence: 1,
      eyeState: 'unknown',
      winkDebug: expect.objectContaining({
        leftEyeOpenProbability: 0.82,
        rightEyeOpenProbability: 0.86,
      }),
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

  it('uses the fixed default wink timing to accept a moderately slow wink', () => {
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
