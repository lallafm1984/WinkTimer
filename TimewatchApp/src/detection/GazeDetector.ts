import {NativeModules} from 'react-native';
import type {DetectionReading, DetectionStatus} from '../domain/detection';

type NativeGazeDetectionModule = {
  start(): Promise<void>;
  stop(): Promise<void>;
};

export type GazeDetector = {
  start(): Promise<void>;
  stop(): Promise<void>;
  getLatestReading(nowMs: number): DetectionReading;
};

export type MockGazeDetector = GazeDetector & {
  setMockStatus(status: DetectionStatus): void;
};

function getNativeGazeDetection(): NativeGazeDetectionModule | undefined {
  return NativeModules.NativeGazeDetection as
    | NativeGazeDetectionModule
    | undefined;
}

export function createMockGazeDetector(
  initialStatus: DetectionStatus = 'unknown',
): MockGazeDetector {
  let status = initialStatus;

  return {
    async start() {
      await getNativeGazeDetection()?.start?.();
    },

    async stop() {
      await getNativeGazeDetection()?.stop?.();
    },

    getLatestReading(nowMs) {
      return {
        status,
        confidence: status === 'unknown' ? 0 : 1,
        atMs: nowMs,
      };
    },

    setMockStatus(nextStatus) {
      status = nextStatus;
    },
  };
}
