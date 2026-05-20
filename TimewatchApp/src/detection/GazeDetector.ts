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
  setMockStatus(status: DetectionStatus): void;
};

const NativeGazeDetection = NativeModules.NativeGazeDetection as
  | NativeGazeDetectionModule
  | undefined;

export function createMockGazeDetector(
  initialStatus: DetectionStatus = 'unknown',
): GazeDetector {
  let status = initialStatus;

  return {
    async start() {
      await NativeGazeDetection?.start?.();
    },

    async stop() {
      await NativeGazeDetection?.stop?.();
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
