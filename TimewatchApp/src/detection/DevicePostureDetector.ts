import {DeviceEventEmitter, NativeModules} from 'react-native';

export type DevicePosture = 'faceDown' | 'faceUp' | 'unknown';

type NativeDevicePostureModule = {
  startDevicePosture?(): Promise<void>;
  stopDevicePosture?(): Promise<void>;
};

type NativeDevicePostureReadingEvent = {
  posture?: unknown;
};

export type DevicePostureDetector = {
  start(): Promise<void>;
  stop(): Promise<void>;
  getLatestPosture(): DevicePosture;
  setMockPosture(posture: DevicePosture): void;
};

const postureEventName = 'WinkTimerDevicePostureReading';
const POSTURE_CONFIRM_MS = 150;

function getNativeDevicePosture(): NativeDevicePostureModule | undefined {
  return NativeModules.NativeGazeDetection as
    | NativeDevicePostureModule
    | undefined;
}

function isDevicePosture(value: unknown): value is DevicePosture {
  return value === 'faceDown' || value === 'faceUp' || value === 'unknown';
}

export function createDevicePostureDetector(): DevicePostureDetector {
  let stablePosture: DevicePosture = 'unknown';
  let candidatePosture: DevicePosture | null = null;
  let candidatePostureAtMs: number | null = null;

  DeviceEventEmitter.addListener(
    postureEventName,
    (event: NativeDevicePostureReadingEvent) => {
      if (!isDevicePosture(event?.posture)) {
        return;
      }

      if (event.posture === stablePosture) {
        candidatePosture = null;
        candidatePostureAtMs = null;
        return;
      }

      if (candidatePosture !== event.posture) {
        candidatePosture = event.posture;
        candidatePostureAtMs = Date.now();
      }
    },
  );

  return {
    async start() {
      await getNativeDevicePosture()?.startDevicePosture?.();
    },

    async stop() {
      await getNativeDevicePosture()?.stopDevicePosture?.();
    },

    getLatestPosture() {
      if (
        candidatePosture !== null &&
        candidatePostureAtMs !== null &&
        Date.now() - candidatePostureAtMs >= POSTURE_CONFIRM_MS
      ) {
        stablePosture = candidatePosture;
        candidatePosture = null;
        candidatePostureAtMs = null;
      }

      return stablePosture;
    },

    setMockPosture(nextPosture) {
      stablePosture = nextPosture;
      candidatePosture = null;
      candidatePostureAtMs = null;
    },
  };
}
