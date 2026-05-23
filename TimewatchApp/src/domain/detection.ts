export type DetectionStatus = 'looking' | 'notLooking' | 'unknown';

export type EyeState = 'bothOpen' | 'bothClosed' | 'oneEyeClosed' | 'unknown';

export type WinkSide = 'left' | 'right';

export type Sensitivity = 'loose' | 'normal' | 'strict';

export type WinkSensitivityLevel = 1 | 2 | 3 | 4 | 5;

export type NativeWinkSensitivityLevel = -2 | -1 | 1 | 2 | 3;

export type WinkDistanceLevel = 1 | 2 | 3 | 4 | 5;

export type LookAngleLevel = 1 | 2 | 3;

export type WinkTimeLevel = 1 | 2 | 3;

export type WinkMinTimeLevel = 1 | 2 | 3;

export type DetectionResolutionLevel = 1 | 2 | 3;

export type DetectionFrameIntervalLevel = 1 | 2 | 3;

export type StatusDisplayMode = 'minimal' | 'text';

export type DetectionReading = {
  status: DetectionStatus;
  confidence: number;
  eyeState?: EyeState;
  winkSide?: WinkSide;
  atMs: number;
};

export type SensitivityConfig = {
  lookGraceMs: number;
};

export const sensitivityConfig: Record<Sensitivity, SensitivityConfig> = {
  loose: {lookGraceMs: 1800},
  normal: {lookGraceMs: 1200},
  strict: {lookGraceMs: 600},
};

export const winkSensitivityLevels: WinkSensitivityLevel[] = [
  1, 2, 3, 4, 5,
];

export const DEFAULT_WINK_SENSITIVITY_LEVEL: WinkSensitivityLevel = 3;

export const nativeWinkSensitivityByDisplayLevel: Record<
  WinkSensitivityLevel,
  NativeWinkSensitivityLevel
> = {
  1: -2,
  2: -1,
  3: 1,
  4: 2,
  5: 3,
};

export const winkDistanceLevels: WinkDistanceLevel[] = [1, 2, 3, 4, 5];

export const DEFAULT_WINK_DISTANCE_LEVEL: WinkDistanceLevel = 5;

export const lookAngleLevels: LookAngleLevel[] = [1, 2, 3];

export const DEFAULT_LOOK_ANGLE_LEVEL: LookAngleLevel = 2;

export const winkTimeLevels: WinkTimeLevel[] = [1, 2, 3];

export const DEFAULT_WINK_TIME_LEVEL: WinkTimeLevel = 2;

export const winkTimeMaxDurationMs: Record<WinkTimeLevel, number> = {
  1: 650,
  2: 1000,
  3: 1300,
};

export const winkMinTimeLevels: WinkMinTimeLevel[] = [1, 2, 3];

export const DEFAULT_WINK_MIN_TIME_LEVEL: WinkMinTimeLevel = 1;

export const winkMinTimeMs: Record<WinkMinTimeLevel, number> = {
  1: 100,
  2: 200,
  3: 300,
};

export const detectionResolutionLevels: DetectionResolutionLevel[] = [1, 2, 3];

export const DEFAULT_DETECTION_RESOLUTION_LEVEL: DetectionResolutionLevel = 2;

export const detectionResolutionByLevel: Record<
  DetectionResolutionLevel,
  {width: number; height: number}
> = {
  1: {width: 480, height: 360},
  2: {width: 640, height: 480},
  3: {width: 960, height: 720},
};

export const detectionFrameIntervalLevels: DetectionFrameIntervalLevel[] = [
  1, 2, 3,
];

export const DEFAULT_DETECTION_FRAME_INTERVAL_LEVEL: DetectionFrameIntervalLevel =
  1;

export const detectionFrameIntervalMsByLevel: Record<
  DetectionFrameIntervalLevel,
  number
> = {
  1: 0,
  2: 120,
  3: 240,
};

export function normalizeWinkSensitivityLevel(
  value: number,
): WinkSensitivityLevel {
  if (!Number.isFinite(value)) {
    return DEFAULT_WINK_SENSITIVITY_LEVEL;
  }

  const rounded = Math.round(value);
  const clamped = Math.max(1, Math.min(5, rounded));
  return clamped as WinkSensitivityLevel;
}

export function toNativeWinkSensitivityLevel(
  level: WinkSensitivityLevel,
): NativeWinkSensitivityLevel {
  return nativeWinkSensitivityByDisplayLevel[
    normalizeWinkSensitivityLevel(level)
  ];
}

export function normalizeWinkDistanceLevel(value: number): WinkDistanceLevel {
  if (!Number.isFinite(value)) {
    return DEFAULT_WINK_DISTANCE_LEVEL;
  }

  const rounded = Math.round(value);
  const clamped = Math.max(1, Math.min(5, rounded));
  return clamped as WinkDistanceLevel;
}

export function normalizeLookAngleLevel(value: number): LookAngleLevel {
  if (!Number.isFinite(value)) {
    return DEFAULT_LOOK_ANGLE_LEVEL;
  }

  const rounded = Math.round(value);
  const clamped = Math.max(1, Math.min(3, rounded));
  return clamped as LookAngleLevel;
}

export function normalizeWinkTimeLevel(value: number): WinkTimeLevel {
  if (!Number.isFinite(value)) {
    return DEFAULT_WINK_TIME_LEVEL;
  }

  const rounded = Math.round(value);
  const clamped = Math.max(1, Math.min(3, rounded));
  return clamped as WinkTimeLevel;
}

export function getSingleWinkMaxDurationMs(level: WinkTimeLevel): number {
  return winkTimeMaxDurationMs[normalizeWinkTimeLevel(level)];
}

export function normalizeWinkMinTimeLevel(value: number): WinkMinTimeLevel {
  if (!Number.isFinite(value)) {
    return DEFAULT_WINK_MIN_TIME_LEVEL;
  }

  const rounded = Math.round(value);
  const clamped = Math.max(1, Math.min(3, rounded));
  return clamped as WinkMinTimeLevel;
}

export function getSingleWinkMinDurationMs(
  level: WinkMinTimeLevel,
): number {
  return winkMinTimeMs[normalizeWinkMinTimeLevel(level)];
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

export function getDetectionResolution(
  level: DetectionResolutionLevel,
): {width: number; height: number} {
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
