export type DetectionStatus = 'looking' | 'notLooking' | 'unknown';

export type Sensitivity = 'loose' | 'normal' | 'strict';

export type StatusDisplayMode = 'minimal' | 'text';

export type DetectionReading = {
  status: DetectionStatus;
  confidence: number;
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
