import {
  detectionFrameIntervalMsByLevel,
  detectionFrameIntervalLevels,
  detectionPerformanceModes,
  detectionResolutionByLevel,
  detectionResolutionLevels,
  faceHeightAngleLevels,
  DEFAULT_WINK_EYE_CLOSED_THRESHOLD,
  DEFAULT_WINK_EYE_PROBABILITY_GAP_THRESHOLD,
  DEFAULT_WINK_MAX_DURATION_MS,
  DEFAULT_WINK_MIN_DURATION_MS,
  normalizeDetectionPerformanceMode,
  getSingleWinkMinDurationMs,
  lookAngleLevels,
  normalizeWinkEyeClosedThreshold,
  normalizeWinkEyeProbabilityGapThreshold,
  normalizeWinkMaxDurationMs,
  normalizeWinkMinDurationMs,
  normalizeDetectionFrameIntervalLevel,
  normalizeDetectionResolutionLevel,
  normalizeFaceHeightAngleLevel,
  normalizeLookAngleLevel,
  normalizeWinkDistanceLevel,
  normalizeWinkMinTimeLevel,
  normalizeWinkSensitivityLevel,
  normalizeWinkTimeLevel,
  toNativeWinkSensitivityLevel,
  winkEyeClosedThresholdValues,
  winkEyeProbabilityGapThresholdValues,
  winkDistanceLevels,
  winkMinTimeLevels,
  winkSensitivityLevels,
  winkTimeLevels,
} from '../detection';

describe('detection settings', () => {
  it('provides five displayed wink sensitivity levels', () => {
    expect(winkSensitivityLevels).toEqual([1, 2, 3, 4, 5]);
  });

  it('normalizes arbitrary wink sensitivity input into the 1 to 5 display range', () => {
    expect(normalizeWinkSensitivityLevel(0)).toBe(1);
    expect(normalizeWinkSensitivityLevel(3.4)).toBe(3);
    expect(normalizeWinkSensitivityLevel(99)).toBe(5);
    expect(normalizeWinkSensitivityLevel(Number.NaN)).toBe(3);
  });

  it('maps displayed wink sensitivity levels to native threshold levels', () => {
    expect(toNativeWinkSensitivityLevel(1)).toBe(-2);
    expect(toNativeWinkSensitivityLevel(2)).toBe(-1);
    expect(toNativeWinkSensitivityLevel(3)).toBe(1);
    expect(toNativeWinkSensitivityLevel(4)).toBe(2);
    expect(toNativeWinkSensitivityLevel(5)).toBe(3);
  });

  it('provides manual wink eye closed threshold values', () => {
    expect(winkEyeClosedThresholdValues).toEqual([
      0.03, 0.06, 0.1, 0.15, 0.2,
    ]);
    expect(DEFAULT_WINK_EYE_CLOSED_THRESHOLD).toBe(0.1);
  });

  it('normalizes wink eye closed thresholds into the native 0 to 1 range', () => {
    expect(normalizeWinkEyeClosedThreshold(-1)).toBe(0);
    expect(normalizeWinkEyeClosedThreshold(0.456)).toBe(0.456);
    expect(normalizeWinkEyeClosedThreshold(0.14)).toBe(0.14);
    expect(normalizeWinkEyeClosedThreshold(2)).toBe(1);
    expect(normalizeWinkEyeClosedThreshold(Number.NaN)).toBe(0.1);
  });

  it('provides manual wink eye gap threshold values', () => {
    expect(winkEyeProbabilityGapThresholdValues).toEqual([0.2, 0.3, 0.4]);
    expect(DEFAULT_WINK_EYE_PROBABILITY_GAP_THRESHOLD).toBe(0.3);
  });

  it('normalizes wink eye gap thresholds into the native 0 to 1 range', () => {
    expect(normalizeWinkEyeProbabilityGapThreshold(-1)).toBe(0);
    expect(normalizeWinkEyeProbabilityGapThreshold(0.344)).toBe(0.344);
    expect(normalizeWinkEyeProbabilityGapThreshold(2)).toBe(1);
    expect(normalizeWinkEyeProbabilityGapThreshold(Number.NaN)).toBe(0.3);
  });

  it('provides three wink distance levels', () => {
    expect(winkDistanceLevels).toEqual([1, 3, 5]);
  });

  it('normalizes arbitrary wink distance input into the displayed 1, 3, 5 range', () => {
    expect(normalizeWinkDistanceLevel(0)).toBe(1);
    expect(normalizeWinkDistanceLevel(3.4)).toBe(3);
    expect(normalizeWinkDistanceLevel(99)).toBe(5);
    expect(normalizeWinkDistanceLevel(Number.NaN)).toBe(5);
  });

  it('provides three wink time levels', () => {
    expect(winkTimeLevels).toEqual([1, 2, 3]);
  });

  it('normalizes arbitrary wink time input into the 1 to 3 range', () => {
    expect(normalizeWinkTimeLevel(0)).toBe(1);
    expect(normalizeWinkTimeLevel(2.4)).toBe(2);
    expect(normalizeWinkTimeLevel(99)).toBe(3);
    expect(normalizeWinkTimeLevel(Number.NaN)).toBe(2);
  });

  it('provides three wink minimum time levels', () => {
    expect(winkMinTimeLevels).toEqual([1, 2, 3]);
  });

  it('normalizes arbitrary wink minimum time input into the 1 to 3 range', () => {
    expect(normalizeWinkMinTimeLevel(0)).toBe(1);
    expect(normalizeWinkMinTimeLevel(2.4)).toBe(2);
    expect(normalizeWinkMinTimeLevel(99)).toBe(3);
    expect(normalizeWinkMinTimeLevel(Number.NaN)).toBe(2);
  });

  it('maps wink minimum time levels to duration thresholds', () => {
    expect(getSingleWinkMinDurationMs(1)).toBe(100);
    expect(getSingleWinkMinDurationMs(2)).toBe(200);
    expect(getSingleWinkMinDurationMs(3)).toBe(300);
  });

  it('normalizes direct wink duration inputs in milliseconds', () => {
    expect(DEFAULT_WINK_MAX_DURATION_MS).toBe(1000);
    expect(DEFAULT_WINK_MIN_DURATION_MS).toBe(200);
    expect(normalizeWinkMaxDurationMs(83)).toBe(100);
    expect(normalizeWinkMaxDurationMs(987.6)).toBe(988);
    expect(normalizeWinkMaxDurationMs(5000)).toBe(3000);
    expect(normalizeWinkMaxDurationMs(Number.NaN)).toBe(1000);
    expect(normalizeWinkMinDurationMs(20)).toBe(50);
    expect(normalizeWinkMinDurationMs(184.3)).toBe(184);
    expect(normalizeWinkMinDurationMs(1500)).toBe(1000);
    expect(normalizeWinkMinDurationMs(Number.NaN)).toBe(200);
  });

  it('provides three look angle levels', () => {
    expect(lookAngleLevels).toEqual([1, 2, 3]);
  });

  it('normalizes arbitrary look angle input into the 1 to 3 range', () => {
    expect(normalizeLookAngleLevel(0)).toBe(1);
    expect(normalizeLookAngleLevel(2.4)).toBe(2);
    expect(normalizeLookAngleLevel(99)).toBe(3);
    expect(normalizeLookAngleLevel(Number.NaN)).toBe(2);
  });

  it('provides three face height angle levels', () => {
    expect(faceHeightAngleLevels).toEqual([1, 2, 3]);
  });

  it('normalizes arbitrary face height angle input into the 1 to 3 range', () => {
    expect(normalizeFaceHeightAngleLevel(0)).toBe(1);
    expect(normalizeFaceHeightAngleLevel(2.4)).toBe(2);
    expect(normalizeFaceHeightAngleLevel(99)).toBe(3);
    expect(normalizeFaceHeightAngleLevel(Number.NaN)).toBe(2);
  });

  it('provides three camera analysis resolution levels', () => {
    expect(detectionResolutionLevels).toEqual([1, 2, 3]);
    expect(detectionResolutionByLevel[1]).toEqual({ width: 480, height: 360 });
    expect(detectionResolutionByLevel[2]).toEqual({ width: 640, height: 480 });
    expect(detectionResolutionByLevel[3]).toEqual({ width: 960, height: 720 });
  });

  it('normalizes arbitrary camera analysis resolution input into the 1 to 3 range', () => {
    expect(normalizeDetectionResolutionLevel(0)).toBe(1);
    expect(normalizeDetectionResolutionLevel(2.4)).toBe(2);
    expect(normalizeDetectionResolutionLevel(99)).toBe(3);
    expect(normalizeDetectionResolutionLevel(Number.NaN)).toBe(2);
  });

  it('provides three ML Kit frame interval levels', () => {
    expect(detectionFrameIntervalLevels).toEqual([1, 2, 3]);
    expect(detectionFrameIntervalMsByLevel).toEqual({
      1: 0,
      2: 120,
      3: 240,
    });
  });

  it('normalizes arbitrary ML Kit frame interval input into the 1 to 3 range', () => {
    expect(normalizeDetectionFrameIntervalLevel(0)).toBe(1);
    expect(normalizeDetectionFrameIntervalLevel(2.4)).toBe(2);
    expect(normalizeDetectionFrameIntervalLevel(99)).toBe(3);
    expect(normalizeDetectionFrameIntervalLevel(Number.NaN)).toBe(1);
  });

  it('provides selectable ML Kit performance modes with fast as the default fallback', () => {
    expect(detectionPerformanceModes).toEqual(['fast', 'accurate']);
    expect(normalizeDetectionPerformanceMode('fast')).toBe('fast');
    expect(normalizeDetectionPerformanceMode('accurate')).toBe('accurate');
    expect(normalizeDetectionPerformanceMode('unknown')).toBe('fast');
  });
});
