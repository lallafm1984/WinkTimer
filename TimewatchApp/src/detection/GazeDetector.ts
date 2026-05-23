import {
  DeviceEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import type {
  DetectionReading,
  DetectionStatus,
  DetectionFrameIntervalLevel,
  DetectionResolutionLevel,
  EyeState,
  LookAngleLevel,
  WinkDistanceLevel,
  WinkMinTimeLevel,
  WinkSide,
  WinkSensitivityLevel,
  WinkTimeLevel,
} from '../domain/detection';
import {
  DEFAULT_WINK_TIME_LEVEL,
  DEFAULT_WINK_MIN_TIME_LEVEL,
  getDetectionFrameIntervalMs,
  getDetectionResolution,
  getSingleWinkMinDurationMs,
  getSingleWinkMaxDurationMs,
  normalizeDetectionFrameIntervalLevel,
  normalizeDetectionResolutionLevel,
  normalizeLookAngleLevel,
  normalizeWinkDistanceLevel,
  normalizeWinkMinTimeLevel,
  normalizeWinkSensitivityLevel,
  normalizeWinkTimeLevel,
  toNativeWinkSensitivityLevel,
} from '../domain/detection';

type NativeGazeDetectionModule = {
  start(): Promise<void>;
  stop(): Promise<void>;
  setWinkSensitivity?(level: number): Promise<void>;
  setWinkDistanceLevel?(level: number): Promise<void>;
  setLookAngleLevel?(level: number): Promise<void>;
  setAnalysisResolution?(width: number, height: number): Promise<void>;
  setFrameIntervalMs?(intervalMs: number): Promise<void>;
};

type NativeGazeDetectionReadingEvent = {
  status?: unknown;
  confidence?: unknown;
  eyeState?: unknown;
  winkSide?: unknown;
};

export type GazeDetector = {
  start(): Promise<void>;
  stop(): Promise<void>;
  getLatestReading(nowMs: number): DetectionReading;
  consumeSingleWink(nowMs: number): DetectionReading | null;
  suppressSingleWinkUntilOpen(): void;
  setWinkSensitivity(level: WinkSensitivityLevel): Promise<void>;
  setWinkDistanceLevel(level: WinkDistanceLevel): Promise<void>;
  setLookAngleLevel(level: LookAngleLevel): Promise<void>;
  setWinkTimeLevel(level: WinkTimeLevel): void;
  setWinkMinTimeLevel(level: WinkMinTimeLevel): void;
  setDetectionResolutionLevel(level: DetectionResolutionLevel): Promise<void>;
  setDetectionFrameIntervalLevel(level: DetectionFrameIntervalLevel): Promise<void>;
};

export type MockGazeDetector = GazeDetector & {
  setMockStatus(status: DetectionStatus): void;
};

function getNativeGazeDetection(): NativeGazeDetectionModule | undefined {
  return NativeModules.NativeGazeDetection as
    | NativeGazeDetectionModule
    | undefined;
}

const readingEventName = 'TimewatchGazeDetectionReading';
const SINGLE_WINK_MIN_MS = 100;
const WINK_HOLD_BREAK_GRACE_MS = 700;

function isDetectionStatus(value: unknown): value is DetectionStatus {
  return value === 'looking' || value === 'notLooking' || value === 'unknown';
}

function isEyeState(value: unknown): value is EyeState {
  return (
    value === 'bothOpen' ||
    value === 'bothClosed' ||
    value === 'oneEyeClosed' ||
    value === 'unknown'
  );
}

function isWinkSide(value: unknown): value is WinkSide {
  return value === 'left' || value === 'right';
}

function normalizeConfidence(value: unknown, status: DetectionStatus) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return status === 'unknown' ? 0 : 1;
  }

  return Math.max(0, Math.min(1, value));
}

async function ensureCameraPermission() {
  if (Platform.OS !== 'android') {
    return true;
  }

  const permission = PermissionsAndroid.PERMISSIONS.CAMERA;
  const alreadyGranted = await PermissionsAndroid.check(permission);

  if (alreadyGranted) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function createMockGazeDetector(
  initialStatus: DetectionStatus = 'unknown',
): MockGazeDetector {
  let status = initialStatus;
  let confidence = status === 'unknown' ? 0 : 1;
  let eyeState: EyeState = 'unknown';
  let winkSide: WinkSide | null = null;
  let oneEyeClosedStartedAtMs: number | null = null;
  let oneEyeClosedLastSeenAtMs: number | null = null;
  let singleWinkArmedFromBothOpen = false;
  let oneEyeClosedStartedFromBothOpen = false;
  let pendingSingleWink: Omit<DetectionReading, 'atMs'> | null = null;
  let suppressSingleWinkUntilOpen = false;
  let winkTimeLevel = DEFAULT_WINK_TIME_LEVEL;
  let winkMinTimeLevel = DEFAULT_WINK_MIN_TIME_LEVEL;

  DeviceEventEmitter.addListener(
    readingEventName,
    (event: NativeGazeDetectionReadingEvent) => {
      if (!isDetectionStatus(event?.status)) {
        return;
      }

      const eventAtMs = Date.now();
      const nextStatus = event.status;
      const nextConfidence = normalizeConfidence(event.confidence, nextStatus);
      const nextEyeState = isEyeState(event.eyeState)
        ? event.eyeState
        : 'unknown';
      const nextWinkSide = isWinkSide(event.winkSide)
        ? event.winkSide
        : null;
      const hasBothEyesOpenBaseline =
        nextStatus === 'looking' && nextEyeState === 'bothOpen';

      if (
        nextStatus === 'looking' &&
        nextEyeState === 'oneEyeClosed'
      ) {
        if (eyeState !== 'oneEyeClosed' || winkSide !== nextWinkSide) {
          oneEyeClosedStartedAtMs = eventAtMs;
          oneEyeClosedStartedFromBothOpen = singleWinkArmedFromBothOpen;
        }

        oneEyeClosedLastSeenAtMs = eventAtMs;
        winkSide = nextWinkSide;
        singleWinkArmedFromBothOpen = false;
      }

      if (
        !suppressSingleWinkUntilOpen &&
        oneEyeClosedStartedFromBothOpen &&
        eyeState === 'oneEyeClosed' &&
        oneEyeClosedStartedAtMs !== null &&
        nextStatus === 'looking' &&
        nextEyeState === 'bothOpen'
      ) {
        const winkDurationMs = eventAtMs - oneEyeClosedStartedAtMs;

        if (
          winkDurationMs >=
            Math.max(SINGLE_WINK_MIN_MS, getSingleWinkMinDurationMs(winkMinTimeLevel)) &&
          winkDurationMs <= getSingleWinkMaxDurationMs(winkTimeLevel)
        ) {
          pendingSingleWink = {
            status: nextStatus,
            confidence: nextConfidence,
            eyeState: nextEyeState,
            ...(winkSide !== null ? {winkSide} : {}),
          };
        }
      }

      if (nextEyeState !== 'oneEyeClosed') {
        oneEyeClosedStartedAtMs = null;
        winkSide = null;
        oneEyeClosedStartedFromBothOpen = false;
        suppressSingleWinkUntilOpen = false;
      }

      singleWinkArmedFromBothOpen = hasBothEyesOpenBaseline;
      status = event.status;
      confidence = nextConfidence;
      eyeState = nextEyeState;
    },
  );

  return {
    async start() {
      const hasPermission = await ensureCameraPermission();
      if (!hasPermission) {
        status = 'unknown';
        confidence = 0;
        return;
      }

      await getNativeGazeDetection()?.start?.();
    },

    async stop() {
      await getNativeGazeDetection()?.stop?.();
    },

    getLatestReading(nowMs) {
      if (status === 'looking' && eyeState === 'oneEyeClosed') {
        oneEyeClosedLastSeenAtMs = nowMs;
      }

      const shouldKeepHoldEyeState =
        status === 'looking' &&
        eyeState !== 'oneEyeClosed' &&
        oneEyeClosedLastSeenAtMs !== null &&
        nowMs - oneEyeClosedLastSeenAtMs <= WINK_HOLD_BREAK_GRACE_MS;

      return {
        status,
        confidence,
        eyeState: shouldKeepHoldEyeState ? 'oneEyeClosed' : eyeState,
        ...((shouldKeepHoldEyeState || eyeState === 'oneEyeClosed') &&
        winkSide !== null
          ? {winkSide}
          : {}),
        atMs: nowMs,
      };
    },

    consumeSingleWink(nowMs) {
      if (pendingSingleWink === null) {
        return null;
      }

      const reading = {
        ...pendingSingleWink,
        atMs: nowMs,
      };
      pendingSingleWink = null;
      return reading;
    },

    suppressSingleWinkUntilOpen() {
      pendingSingleWink = null;
      suppressSingleWinkUntilOpen = true;
    },

    async setWinkSensitivity(level) {
      const normalized = normalizeWinkSensitivityLevel(level);
      await getNativeGazeDetection()?.setWinkSensitivity?.(
        toNativeWinkSensitivityLevel(normalized),
      );
    },

    async setWinkDistanceLevel(level) {
      const normalized = normalizeWinkDistanceLevel(level);
      await getNativeGazeDetection()?.setWinkDistanceLevel?.(normalized);
    },

    async setLookAngleLevel(level) {
      const normalized = normalizeLookAngleLevel(level);
      await getNativeGazeDetection()?.setLookAngleLevel?.(normalized);
    },

    async setDetectionResolutionLevel(level) {
      const resolution = getDetectionResolution(
        normalizeDetectionResolutionLevel(level),
      );
      await getNativeGazeDetection()?.setAnalysisResolution?.(
        resolution.width,
        resolution.height,
      );
    },

    async setDetectionFrameIntervalLevel(level) {
      const intervalMs = getDetectionFrameIntervalMs(
        normalizeDetectionFrameIntervalLevel(level),
      );
      await getNativeGazeDetection()?.setFrameIntervalMs?.(intervalMs);
    },

    setWinkTimeLevel(level) {
      winkTimeLevel = normalizeWinkTimeLevel(level);
    },

    setWinkMinTimeLevel(level) {
      winkMinTimeLevel = normalizeWinkMinTimeLevel(level);
    },

    setMockStatus(nextStatus) {
      status = nextStatus;
      confidence = status === 'unknown' ? 0 : 1;
      eyeState = 'unknown';
      winkSide = null;
      oneEyeClosedStartedAtMs = null;
      oneEyeClosedLastSeenAtMs = null;
      singleWinkArmedFromBothOpen = false;
      oneEyeClosedStartedFromBothOpen = false;
      pendingSingleWink = null;
      suppressSingleWinkUntilOpen = false;
    },
  };
}
