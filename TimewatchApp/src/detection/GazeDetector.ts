import {
  DeviceEventEmitter,
  NativeModules,
  PermissionsAndroid,
  Platform,
} from 'react-native';
import type {
  DetectionReading,
  FaceHeightAngleLevel,
  DetectionStatus,
  DetectionFrameIntervalLevel,
  DetectionPerformanceMode,
  DetectionResolutionLevel,
  EyeState,
  LookAngleLevel,
  SmileDistanceLevel,
  SmileThreshold,
  WinkDistanceLevel,
  WinkDebugValues,
  WinkEyeClosedThreshold,
  WinkEyeProbabilityGapThreshold,
  WinkSide,
} from '../domain/detection';
import {
  getDetectionFrameIntervalMs,
  getDetectionResolution,
  normalizeDetectionFrameIntervalLevel,
  normalizeDetectionPerformanceMode,
  normalizeDetectionResolutionLevel,
  normalizeFaceHeightAngleLevel,
  normalizeLookAngleLevel,
  normalizeSmileDistanceLevel,
  normalizeSmileThreshold,
  normalizeWinkEyeClosedThreshold,
  normalizeWinkEyeProbabilityGapThreshold,
  normalizeWinkDistanceLevel,
} from '../domain/detection';

type NativeGazeDetectionModule = {
  start(): Promise<void>;
  stop(): Promise<void>;
  setWinkThresholds?(
    leftEyeClosedThreshold: number,
    rightEyeClosedThreshold: number,
    leftEyeProbabilityGapThreshold: number,
    rightEyeProbabilityGapThreshold: number,
  ): Promise<void>;
  setWinkDistanceLevel?(level: number): Promise<void>;
  setSmileThreshold?(threshold: number): Promise<void>;
  setSmileDistanceLevel?(level: number): Promise<void>;
  setLookAngleLevel?(level: number): Promise<void>;
  setFaceHeightAngleLevel?(level: number): Promise<void>;
  setAnalysisResolution?(width: number, height: number): Promise<void>;
  setFrameIntervalMs?(intervalMs: number): Promise<void>;
  setPerformanceMode?(mode: DetectionPerformanceMode): Promise<void>;
};

type NativeGazeDetectionReadingEvent = {
  status?: unknown;
  confidence?: unknown;
  eyeState?: unknown;
  winkSide?: unknown;
  smileDetected?: unknown;
  leftEyeOpenProbability?: unknown;
  rightEyeOpenProbability?: unknown;
  eyeProbabilityGap?: unknown;
  faceAreaRatio?: unknown;
  minFaceAreaRatio?: unknown;
  minEyeOpenProbability?: unknown;
  maxWinkEyeOpenProbability?: unknown;
  minWinkEyeProbabilityGap?: unknown;
  minOpenEyeProbabilityForWink?: unknown;
  leftEyeClosedThreshold?: unknown;
  rightEyeClosedThreshold?: unknown;
  leftEyeProbabilityGapThreshold?: unknown;
  rightEyeProbabilityGapThreshold?: unknown;
  facePitchDegrees?: unknown;
  faceYawDegrees?: unknown;
  faceRollDegrees?: unknown;
  maxFacePitchDegrees?: unknown;
  maxFaceYawDegrees?: unknown;
  maxFaceRollDegrees?: unknown;
  analysisDurationMs?: unknown;
  smileProbability?: unknown;
  minSmileProbability?: unknown;
  minSmileFaceAreaRatio?: unknown;
};

export type GazeDetector = {
  start(): Promise<void>;
  stop(): Promise<void>;
  getLatestReading(nowMs: number): DetectionReading;
  consumeSingleWink(nowMs: number): DetectionReading | null;
  suppressSingleWinkUntilOpen(): void;
  setWinkThresholds(
    leftEyeClosedThreshold: WinkEyeClosedThreshold,
    rightEyeClosedThreshold: WinkEyeClosedThreshold,
    leftEyeProbabilityGapThreshold: WinkEyeProbabilityGapThreshold,
    rightEyeProbabilityGapThreshold: WinkEyeProbabilityGapThreshold,
  ): Promise<void>;
  setWinkDistanceLevel(level: WinkDistanceLevel): Promise<void>;
  setSmileThreshold(threshold: SmileThreshold): Promise<void>;
  setSmileDistanceLevel(level: SmileDistanceLevel): Promise<void>;
  setLookAngleLevel(level: LookAngleLevel): Promise<void>;
  setFaceHeightAngleLevel(level: FaceHeightAngleLevel): Promise<void>;
  setDetectionResolutionLevel(level: DetectionResolutionLevel): Promise<void>;
  setDetectionFrameIntervalLevel(
    level: DetectionFrameIntervalLevel,
  ): Promise<void>;
  setDetectionPerformanceMode(
    mode: DetectionPerformanceMode,
  ): Promise<void>;
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
const DEFAULT_SINGLE_WINK_MIN_DURATION_MS = 200;
const DEFAULT_SINGLE_WINK_MAX_DURATION_MS = 1000;
const SINGLE_WINK_COOLDOWN_MS = 500;
const WINK_HOLD_BREAK_GRACE_MS = 700;
const WINK_READY_EYE_OPEN_PROBABILITY = 0.85;
const WINK_CLOSED_EYE_OPEN_PROBABILITY = 0.1;
const WINK_OPPOSITE_EYE_OPEN_PROBABILITY = 0.5;
const WINK_EYE_PROBABILITY_GAP_THRESHOLD =
  WINK_OPPOSITE_EYE_OPEN_PROBABILITY - WINK_CLOSED_EYE_OPEN_PROBABILITY;

type WinkEyeClassification = {
  eyeState: EyeState;
  winkSide: WinkSide | null;
};

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

function normalizeOptionalNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeWinkDebug(
  event: NativeGazeDetectionReadingEvent,
): WinkDebugValues | undefined {
  const hasDebugValue =
    event.leftEyeOpenProbability !== undefined ||
    event.rightEyeOpenProbability !== undefined ||
    event.eyeProbabilityGap !== undefined ||
    event.faceAreaRatio !== undefined ||
    event.minFaceAreaRatio !== undefined ||
    event.minEyeOpenProbability !== undefined ||
    event.maxWinkEyeOpenProbability !== undefined ||
    event.minWinkEyeProbabilityGap !== undefined ||
    event.minOpenEyeProbabilityForWink !== undefined ||
    event.leftEyeClosedThreshold !== undefined ||
    event.rightEyeClosedThreshold !== undefined ||
    event.leftEyeProbabilityGapThreshold !== undefined ||
    event.rightEyeProbabilityGapThreshold !== undefined ||
    event.facePitchDegrees !== undefined ||
    event.faceYawDegrees !== undefined ||
    event.faceRollDegrees !== undefined ||
    event.maxFacePitchDegrees !== undefined ||
    event.maxFaceYawDegrees !== undefined ||
    event.maxFaceRollDegrees !== undefined ||
    event.analysisDurationMs !== undefined ||
    event.smileProbability !== undefined ||
    event.minSmileProbability !== undefined ||
    event.minSmileFaceAreaRatio !== undefined;

  if (!hasDebugValue) {
    return undefined;
  }

  return {
    leftEyeOpenProbability: normalizeOptionalNumber(
      event.leftEyeOpenProbability,
    ),
    rightEyeOpenProbability: normalizeOptionalNumber(
      event.rightEyeOpenProbability,
    ),
    eyeProbabilityGap: normalizeOptionalNumber(event.eyeProbabilityGap),
    faceAreaRatio: normalizeOptionalNumber(event.faceAreaRatio),
    minFaceAreaRatio: normalizeOptionalNumber(event.minFaceAreaRatio),
    minEyeOpenProbability: normalizeOptionalNumber(event.minEyeOpenProbability),
    maxWinkEyeOpenProbability: normalizeOptionalNumber(
      event.maxWinkEyeOpenProbability,
    ),
    minWinkEyeProbabilityGap: normalizeOptionalNumber(
      event.minWinkEyeProbabilityGap,
    ),
    minOpenEyeProbabilityForWink: normalizeOptionalNumber(
      event.minOpenEyeProbabilityForWink,
    ),
    leftEyeClosedThreshold: normalizeOptionalNumber(
      event.leftEyeClosedThreshold,
    ),
    rightEyeClosedThreshold: normalizeOptionalNumber(
      event.rightEyeClosedThreshold,
    ),
    leftEyeProbabilityGapThreshold: normalizeOptionalNumber(
      event.leftEyeProbabilityGapThreshold,
    ),
    rightEyeProbabilityGapThreshold: normalizeOptionalNumber(
      event.rightEyeProbabilityGapThreshold,
    ),
    facePitchDegrees: normalizeOptionalNumber(event.facePitchDegrees),
    faceYawDegrees: normalizeOptionalNumber(event.faceYawDegrees),
    faceRollDegrees: normalizeOptionalNumber(event.faceRollDegrees),
    maxFacePitchDegrees: normalizeOptionalNumber(event.maxFacePitchDegrees),
    maxFaceYawDegrees: normalizeOptionalNumber(event.maxFaceYawDegrees),
    maxFaceRollDegrees: normalizeOptionalNumber(event.maxFaceRollDegrees),
    analysisDurationMs: normalizeOptionalNumber(event.analysisDurationMs),
    ...(event.smileProbability !== undefined
      ? {smileProbability: normalizeOptionalNumber(event.smileProbability)}
      : {}),
    ...(event.minSmileProbability !== undefined
      ? {minSmileProbability: normalizeOptionalNumber(event.minSmileProbability)}
      : {}),
    ...(event.minSmileFaceAreaRatio !== undefined
      ? {
          minSmileFaceAreaRatio: normalizeOptionalNumber(
            event.minSmileFaceAreaRatio,
          ),
        }
      : {}),
  };
}

function normalizeConfidence(value: unknown, status: DetectionStatus) {
  if (typeof value !== 'number' || Number.isNaN(value)) {
    return status === 'unknown' ? 0 : 1;
  }

  return Math.max(0, Math.min(1, value));
}

function getFiniteWinkDebugValue(
  value: number | null | undefined,
  fallback: number,
) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback;
}

function exceedsAbsoluteLimit(
  value: number | null,
  limit: number | null,
): boolean {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    typeof limit === 'number' &&
    Number.isFinite(limit) &&
    Math.abs(value) > limit
  );
}

function isWinkDebugGeometryAllowed(winkDebug: WinkDebugValues) {
  if (
    typeof winkDebug.faceAreaRatio === 'number' &&
    Number.isFinite(winkDebug.faceAreaRatio) &&
    typeof winkDebug.minFaceAreaRatio === 'number' &&
    Number.isFinite(winkDebug.minFaceAreaRatio) &&
    winkDebug.faceAreaRatio < winkDebug.minFaceAreaRatio
  ) {
    return false;
  }

  return !(
    exceedsAbsoluteLimit(
      winkDebug.facePitchDegrees,
      winkDebug.maxFacePitchDegrees,
    ) ||
    exceedsAbsoluteLimit(winkDebug.faceYawDegrees, winkDebug.maxFaceYawDegrees) ||
    exceedsAbsoluteLimit(winkDebug.faceRollDegrees, winkDebug.maxFaceRollDegrees)
  );
}

function getSmileDetected(
  status: DetectionStatus,
  event: NativeGazeDetectionReadingEvent,
  winkDebug: WinkDebugValues | undefined,
): boolean | undefined {
  if (status !== 'looking') {
    return undefined;
  }

  if (
    typeof winkDebug?.faceAreaRatio === 'number' &&
    Number.isFinite(winkDebug.faceAreaRatio) &&
    typeof winkDebug.minSmileFaceAreaRatio === 'number' &&
    Number.isFinite(winkDebug.minSmileFaceAreaRatio) &&
    winkDebug.faceAreaRatio < winkDebug.minSmileFaceAreaRatio
  ) {
    return undefined;
  }

  if (typeof event.smileDetected === 'boolean') {
    return event.smileDetected;
  }

  if (
    typeof winkDebug?.smileProbability === 'number' &&
    Number.isFinite(winkDebug.smileProbability) &&
    typeof winkDebug.minSmileProbability === 'number' &&
    Number.isFinite(winkDebug.minSmileProbability)
  ) {
    return winkDebug.smileProbability >= winkDebug.minSmileProbability;
  }

  return undefined;
}

function getFixedWinkEyeClassification(
  status: DetectionStatus,
  eventEyeState: EyeState,
  eventWinkSide: WinkSide | null,
  winkDebug: WinkDebugValues | undefined,
): WinkEyeClassification {
  if (status !== 'looking') {
    return {eyeState: 'unknown', winkSide: null};
  }

  if (
    winkDebug === undefined ||
    winkDebug.leftEyeOpenProbability === null ||
    winkDebug.rightEyeOpenProbability === null
  ) {
    return {
      eyeState: eventEyeState,
      winkSide: eventEyeState === 'oneEyeClosed' ? eventWinkSide : null,
    };
  }

  const leftEyeOpenProbability = winkDebug.leftEyeOpenProbability;
  const rightEyeOpenProbability = winkDebug.rightEyeOpenProbability;
  const leftEyeClosedThreshold = getFiniteWinkDebugValue(
    winkDebug.leftEyeClosedThreshold,
    WINK_CLOSED_EYE_OPEN_PROBABILITY,
  );
  const rightEyeClosedThreshold = getFiniteWinkDebugValue(
    winkDebug.rightEyeClosedThreshold,
    WINK_CLOSED_EYE_OPEN_PROBABILITY,
  );
  const leftEyeProbabilityGapThreshold = getFiniteWinkDebugValue(
    winkDebug.leftEyeProbabilityGapThreshold,
    WINK_EYE_PROBABILITY_GAP_THRESHOLD,
  );
  const rightEyeProbabilityGapThreshold = getFiniteWinkDebugValue(
    winkDebug.rightEyeProbabilityGapThreshold,
    WINK_EYE_PROBABILITY_GAP_THRESHOLD,
  );
  const minEyeOpenProbability = getFiniteWinkDebugValue(
    winkDebug.minEyeOpenProbability,
    WINK_READY_EYE_OPEN_PROBABILITY,
  );
  const minOpenEyeProbabilityForWink = getFiniteWinkDebugValue(
    winkDebug.minOpenEyeProbabilityForWink,
    WINK_OPPOSITE_EYE_OPEN_PROBABILITY,
  );

  if (!isWinkDebugGeometryAllowed(winkDebug)) {
    return {eyeState: 'unknown', winkSide: null};
  }

  if (
    leftEyeOpenProbability >= minEyeOpenProbability &&
    rightEyeOpenProbability >= minEyeOpenProbability
  ) {
    return {eyeState: 'bothOpen', winkSide: null};
  }

  if (
    leftEyeOpenProbability <= leftEyeClosedThreshold &&
    rightEyeOpenProbability <= rightEyeClosedThreshold
  ) {
    return {eyeState: 'bothClosed', winkSide: null};
  }

  if (
    leftEyeOpenProbability <= leftEyeClosedThreshold &&
    rightEyeOpenProbability - leftEyeOpenProbability >=
      leftEyeProbabilityGapThreshold &&
    rightEyeOpenProbability >= minOpenEyeProbabilityForWink
  ) {
    return {eyeState: 'oneEyeClosed', winkSide: 'left'};
  }

  if (
    rightEyeOpenProbability <= rightEyeClosedThreshold &&
    leftEyeOpenProbability - rightEyeOpenProbability >=
      rightEyeProbabilityGapThreshold &&
    leftEyeOpenProbability >= minOpenEyeProbabilityForWink
  ) {
    return {eyeState: 'oneEyeClosed', winkSide: 'right'};
  }

  return {eyeState: 'unknown', winkSide: null};
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
  let smileDetected: boolean | undefined;
  let winkDebug: WinkDebugValues | undefined;
  let oneEyeClosedStartedAtMs: number | null = null;
  let oneEyeClosedLastSeenAtMs: number | null = null;
  let singleWinkArmedFromBothOpen = false;
  let oneEyeClosedStartedFromBothOpen = false;
  let pendingSingleWink: Omit<DetectionReading, 'atMs'> | null = null;
  let suppressSingleWinkUntilOpen = false;
  let lastSingleWinkAcceptedAtMs: number | null = null;

  DeviceEventEmitter.addListener(
    readingEventName,
    (event: NativeGazeDetectionReadingEvent) => {
      if (!isDetectionStatus(event?.status)) {
        return;
      }

      const eventAtMs = Date.now();
      const nextStatus = event.status;
      const nextConfidence = normalizeConfidence(event.confidence, nextStatus);
      const eventEyeState = isEyeState(event.eyeState)
        ? event.eyeState
        : 'unknown';
      const eventWinkSide = isWinkSide(event.winkSide)
        ? event.winkSide
        : null;
      const nextWinkDebug = normalizeWinkDebug(event);
      const nextSmileDetected = getSmileDetected(
        nextStatus,
        event,
        nextWinkDebug,
      );
      const fixedEyeClassification = getFixedWinkEyeClassification(
        nextStatus,
        eventEyeState,
        eventWinkSide,
        nextWinkDebug,
      );
      const nextEyeState = fixedEyeClassification.eyeState;
      const nextWinkSide = fixedEyeClassification.winkSide;
      const isSingleWinkCooldownActive =
        lastSingleWinkAcceptedAtMs !== null &&
        eventAtMs - lastSingleWinkAcceptedAtMs < SINGLE_WINK_COOLDOWN_MS;
      const hasBothEyesOpenBaseline =
        nextStatus === 'looking' &&
        nextEyeState === 'bothOpen' &&
        !isSingleWinkCooldownActive;
      const hasArmedBothOpenBaseline =
        singleWinkArmedFromBothOpen ||
        (status === 'looking' &&
          eyeState === 'bothOpen' &&
          !isSingleWinkCooldownActive);
      let acceptedSingleWinkAtThisEvent = false;

      if (nextStatus === 'looking' && nextEyeState === 'oneEyeClosed') {
        if (eyeState !== 'oneEyeClosed' || winkSide !== nextWinkSide) {
          oneEyeClosedStartedAtMs = eventAtMs;
          oneEyeClosedStartedFromBothOpen = hasArmedBothOpenBaseline;
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
        const minWinkDurationMs = Math.max(
          SINGLE_WINK_MIN_MS,
          DEFAULT_SINGLE_WINK_MIN_DURATION_MS,
        );
        const maxWinkDurationMs = Math.max(
          minWinkDurationMs,
          DEFAULT_SINGLE_WINK_MAX_DURATION_MS,
        );

        if (
          winkDurationMs >= minWinkDurationMs &&
          winkDurationMs <= maxWinkDurationMs
        ) {
          acceptedSingleWinkAtThisEvent = true;
          lastSingleWinkAcceptedAtMs = eventAtMs;
          pendingSingleWink = {
            status: nextStatus,
            confidence: nextConfidence,
            eyeState: nextEyeState,
            ...(winkSide !== null ? { winkSide } : {}),
            ...(winkDebug !== undefined ? { winkDebug } : {}),
          };
        }
      }

      if (nextEyeState !== 'oneEyeClosed') {
        oneEyeClosedStartedAtMs = null;
        winkSide = null;
        oneEyeClosedStartedFromBothOpen = false;
        suppressSingleWinkUntilOpen = false;
      }

      singleWinkArmedFromBothOpen =
        hasBothEyesOpenBaseline && !acceptedSingleWinkAtThisEvent;
      status = event.status;
      confidence = nextConfidence;
      eyeState = nextEyeState;
      smileDetected = nextSmileDetected;
      winkDebug = nextWinkDebug;
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
          ? { winkSide }
          : {}),
        ...(smileDetected !== undefined ? { smileDetected } : {}),
        ...(winkDebug !== undefined ? { winkDebug } : {}),
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

    async setWinkThresholds(
      leftEyeClosedThreshold,
      rightEyeClosedThreshold,
      leftEyeProbabilityGapThreshold,
      rightEyeProbabilityGapThreshold,
    ) {
      await getNativeGazeDetection()?.setWinkThresholds?.(
        normalizeWinkEyeClosedThreshold(leftEyeClosedThreshold),
        normalizeWinkEyeClosedThreshold(rightEyeClosedThreshold),
        normalizeWinkEyeProbabilityGapThreshold(leftEyeProbabilityGapThreshold),
        normalizeWinkEyeProbabilityGapThreshold(
          rightEyeProbabilityGapThreshold,
        ),
      );
    },

    async setWinkDistanceLevel(level) {
      const normalized = normalizeWinkDistanceLevel(level);
      await getNativeGazeDetection()?.setWinkDistanceLevel?.(normalized);
    },

    async setSmileThreshold(threshold) {
      await getNativeGazeDetection()?.setSmileThreshold?.(
        normalizeSmileThreshold(threshold),
      );
    },

    async setSmileDistanceLevel(level) {
      const normalized = normalizeSmileDistanceLevel(level);
      await getNativeGazeDetection()?.setSmileDistanceLevel?.(normalized);
    },

    async setLookAngleLevel(level) {
      const normalized = normalizeLookAngleLevel(level);
      await getNativeGazeDetection()?.setLookAngleLevel?.(normalized);
    },

    async setFaceHeightAngleLevel(level) {
      const normalized = normalizeFaceHeightAngleLevel(level);
      await getNativeGazeDetection()?.setFaceHeightAngleLevel?.(normalized);
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

    async setDetectionPerformanceMode(mode) {
      await getNativeGazeDetection()?.setPerformanceMode?.(
        normalizeDetectionPerformanceMode(mode),
      );
    },

    setMockStatus(nextStatus) {
      status = nextStatus;
      confidence = status === 'unknown' ? 0 : 1;
      eyeState = 'unknown';
      winkSide = null;
      smileDetected = undefined;
      winkDebug = undefined;
      oneEyeClosedStartedAtMs = null;
      oneEyeClosedLastSeenAtMs = null;
      singleWinkArmedFromBothOpen = false;
      oneEyeClosedStartedFromBothOpen = false;
      pendingSingleWink = null;
      suppressSingleWinkUntilOpen = false;
      lastSingleWinkAcceptedAtMs = null;
    },
  };
}
