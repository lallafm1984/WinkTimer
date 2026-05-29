export type DetectionStatus = 'looking' | 'notLooking' | 'unknown';

export type EyeState = 'bothOpen' | 'bothClosed' | 'oneEyeClosed' | 'unknown';

export type WinkSide = 'left' | 'right';

export type Sensitivity = 'loose' | 'normal' | 'strict';

export type WinkEyeClosedThreshold = number;

export type WinkEyeProbabilityGapThreshold = number;

export type WinkDistanceLevel = 1 | 2 | 3 | 4 | 5;

export type SmileThreshold = number;

export type SmileDistanceLevel = 1 | 2 | 3 | 4 | 5;

export type LookAngleLevel = 1 | 2 | 3;

export type FaceHeightAngleLevel = 1 | 2 | 3;

export type DetectionResolutionLevel = 1 | 2 | 3;

export type DetectionFrameIntervalLevel = 1 | 2 | 3;

export type DetectionPerformanceMode = 'fast' | 'accurate';

export type StatusDisplayMode = 'minimal' | 'text';

export type WinkDebugValues = {
  leftEyeOpenProbability: number | null;
  rightEyeOpenProbability: number | null;
  eyeProbabilityGap: number | null;
  faceAreaRatio: number | null;
  minFaceAreaRatio: number | null;
  minEyeOpenProbability: number | null;
  maxWinkEyeOpenProbability: number | null;
  minWinkEyeProbabilityGap: number | null;
  minOpenEyeProbabilityForWink: number | null;
  leftEyeClosedThreshold: number | null;
  rightEyeClosedThreshold: number | null;
  leftEyeProbabilityGapThreshold: number | null;
  rightEyeProbabilityGapThreshold: number | null;
  facePitchDegrees: number | null;
  faceYawDegrees: number | null;
  faceRollDegrees: number | null;
  maxFacePitchDegrees: number | null;
  maxFaceYawDegrees: number | null;
  maxFaceRollDegrees: number | null;
  analysisDurationMs: number | null;
  smileProbability?: number | null;
  minSmileProbability?: number | null;
  minSmileFaceAreaRatio?: number | null;
};

export type DetectionReading = {
  status: DetectionStatus;
  confidence: number;
  eyeState?: EyeState;
  winkSide?: WinkSide;
  smileDetected?: boolean;
  winkDebug?: WinkDebugValues;
  atMs: number;
};

export type SensitivityConfig = {
  lookGraceMs: number;
};

export const sensitivityConfig: Record<Sensitivity, SensitivityConfig> = {
  loose: { lookGraceMs: 1800 },
  normal: { lookGraceMs: 1200 },
  strict: { lookGraceMs: 600 },
};

export const DEFAULT_WINK_EYE_CLOSED_THRESHOLD: WinkEyeClosedThreshold = 0.1;

export const DEFAULT_WINK_EYE_PROBABILITY_GAP_THRESHOLD: WinkEyeProbabilityGapThreshold =
  0.3;

export const winkDistanceLevels: WinkDistanceLevel[] = [1, 3, 5];

export const DEFAULT_WINK_DISTANCE_LEVEL: WinkDistanceLevel = 5;

export const smileThresholdLevels: SmileThreshold[] = [0.5, 0.7, 0.9];

export const DEFAULT_SMILE_THRESHOLD: SmileThreshold = 0.7;

export const smileDistanceLevels: SmileDistanceLevel[] = [1, 3, 5];

export const DEFAULT_SMILE_DISTANCE_LEVEL: SmileDistanceLevel = 5;

export const lookAngleLevels: LookAngleLevel[] = [1, 2, 3];

export const DEFAULT_LOOK_ANGLE_LEVEL: LookAngleLevel = 2;

export const faceHeightAngleLevels: FaceHeightAngleLevel[] = [1, 2, 3];

export const DEFAULT_FACE_HEIGHT_ANGLE_LEVEL: FaceHeightAngleLevel = 2;

export const detectionResolutionLevels: DetectionResolutionLevel[] = [1, 2, 3];

export const DEFAULT_DETECTION_RESOLUTION_LEVEL: DetectionResolutionLevel = 1;

export const detectionResolutionByLevel: Record<
  DetectionResolutionLevel,
  { width: number; height: number }
> = {
  1: { width: 480, height: 360 },
  2: { width: 640, height: 480 },
  3: { width: 960, height: 720 },
};

export const detectionFrameIntervalLevels: DetectionFrameIntervalLevel[] = [
  3, 2, 1,
];

export const DEFAULT_DETECTION_FRAME_INTERVAL_LEVEL: DetectionFrameIntervalLevel = 2;

export const detectionFrameIntervalMsByLevel: Record<
  DetectionFrameIntervalLevel,
  number
> = {
  1: 0,
  2: 120,
  3: 240,
};

export const detectionPerformanceModes: DetectionPerformanceMode[] = [
  'fast',
  'accurate',
];

export const DEFAULT_DETECTION_PERFORMANCE_MODE: DetectionPerformanceMode =
  'accurate';

function normalizeProbabilityThreshold(
  value: number,
  fallback: number,
): number {
  if (!Number.isFinite(value)) {
    return fallback;
  }

  return Math.max(0, Math.min(1, value));
}

export function normalizeWinkEyeClosedThreshold(
  value: number,
): WinkEyeClosedThreshold {
  return normalizeProbabilityThreshold(value, DEFAULT_WINK_EYE_CLOSED_THRESHOLD);
}

export function normalizeWinkEyeProbabilityGapThreshold(
  value: number,
): WinkEyeProbabilityGapThreshold {
  return normalizeProbabilityThreshold(
    value,
    DEFAULT_WINK_EYE_PROBABILITY_GAP_THRESHOLD,
  );
}

export function normalizeWinkDistanceLevel(value: number): WinkDistanceLevel {
  if (!Number.isFinite(value)) {
    return DEFAULT_WINK_DISTANCE_LEVEL;
  }

  const rounded = Math.round(value);
  const nearest = winkDistanceLevels.reduce((best, level) => {
    const currentDistance = Math.abs(level - rounded);
    const bestDistance = Math.abs(best - rounded);
    return currentDistance < bestDistance ? level : best;
  }, DEFAULT_WINK_DISTANCE_LEVEL);

  return nearest as WinkDistanceLevel;
}

export function normalizeSmileThreshold(value: number): SmileThreshold {
  return normalizeProbabilityThreshold(value, DEFAULT_SMILE_THRESHOLD);
}

export function normalizeSmileDistanceLevel(value: number): SmileDistanceLevel {
  if (!Number.isFinite(value)) {
    return DEFAULT_SMILE_DISTANCE_LEVEL;
  }

  const rounded = Math.round(value);
  const nearest = smileDistanceLevels.reduce((best, level) => {
    const currentDistance = Math.abs(level - rounded);
    const bestDistance = Math.abs(best - rounded);
    return currentDistance < bestDistance ? level : best;
  }, DEFAULT_SMILE_DISTANCE_LEVEL);

  return nearest as SmileDistanceLevel;
}

export function normalizeLookAngleLevel(value: number): LookAngleLevel {
  if (!Number.isFinite(value)) {
    return DEFAULT_LOOK_ANGLE_LEVEL;
  }

  const rounded = Math.round(value);
  const clamped = Math.max(1, Math.min(3, rounded));
  return clamped as LookAngleLevel;
}

export function normalizeFaceHeightAngleLevel(
  value: number,
): FaceHeightAngleLevel {
  if (!Number.isFinite(value)) {
    return DEFAULT_FACE_HEIGHT_ANGLE_LEVEL;
  }

  const rounded = Math.round(value);
  const clamped = Math.max(1, Math.min(3, rounded));
  return clamped as FaceHeightAngleLevel;
}

export function normalizeDetectionResolutionLevel(
  value: number,
): DetectionResolutionLevel {
  if (!Number.isFinite(value)) {
    return DEFAULT_DETECTION_RESOLUTION_LEVEL;
  }

  const rounded = Math.round(value);
  const clamped = Math.max(1, Math.min(3, rounded));
  return clamped as DetectionResolutionLevel;
}

export function getDetectionResolution(level: DetectionResolutionLevel): {
  width: number;
  height: number;
} {
  return detectionResolutionByLevel[normalizeDetectionResolutionLevel(level)];
}

export function normalizeDetectionFrameIntervalLevel(
  value: number,
): DetectionFrameIntervalLevel {
  if (!Number.isFinite(value)) {
    return DEFAULT_DETECTION_FRAME_INTERVAL_LEVEL;
  }

  const rounded = Math.round(value);
  const clamped = Math.max(1, Math.min(3, rounded));
  return clamped as DetectionFrameIntervalLevel;
}

export function getDetectionFrameIntervalMs(
  level: DetectionFrameIntervalLevel,
): number {
  return detectionFrameIntervalMsByLevel[
    normalizeDetectionFrameIntervalLevel(level)
  ];
}

export function normalizeDetectionPerformanceMode(
  value: unknown,
): DetectionPerformanceMode {
  return value === 'accurate' || value === 'fast'
    ? value
    : DEFAULT_DETECTION_PERFORMANCE_MODE;
}
