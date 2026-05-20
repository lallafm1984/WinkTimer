import {NativeModules} from 'react-native';
import {createMockGazeDetector} from '../GazeDetector';
import type {GazeDetector, MockGazeDetector} from '../GazeDetector';

type NativeGazeDetectionModuleForTest = {
  start: jest.Mock<Promise<void>, []>;
  stop: jest.Mock<Promise<void>, []>;
};

type MutableNativeModules = typeof NativeModules & {
  NativeGazeDetection?: NativeGazeDetectionModuleForTest;
};

const nativeModules = NativeModules as MutableNativeModules;
const originalNativeGazeDetection = nativeModules.NativeGazeDetection;

describe('GazeDetector', () => {
  afterEach(() => {
    if (originalNativeGazeDetection) {
      nativeModules.NativeGazeDetection = originalNativeGazeDetection;
    } else {
      delete nativeModules.NativeGazeDetection;
    }
  });

  it('emits the configured mock status', () => {
    const detector = createMockGazeDetector('notLooking');
    const readings = detector.getLatestReading(1000);

    expect(readings).toEqual({status: 'notLooking', confidence: 1, atMs: 1000});
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
});
