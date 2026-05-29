import {
  detectionFrameIntervalMsByLevel,
  detectionFrameIntervalLevels,
  detectionPerformanceModes,
  detectionResolutionByLevel,
  detectionResolutionLevels,
  faceHeightAngleLevels,
  DEFAULT_SMILE_THRESHOLD,
  DEFAULT_WINK_EYE_CLOSED_THRESHOLD,
  DEFAULT_WINK_EYE_PROBABILITY_GAP_THRESHOLD,
  normalizeDetectionPerformanceMode,
  lookAngleLevels,
  normalizeSmileDistanceLevel,
  normalizeSmileThreshold,
  normalizeWinkEyeClosedThreshold,
  normalizeWinkEyeProbabilityGapThreshold,
  normalizeDetectionFrameIntervalLevel,
  normalizeDetectionResolutionLevel,
  normalizeFaceHeightAngleLevel,
  normalizeLookAngleLevel,
  normalizeWinkDistanceLevel,
  smileDistanceLevels,
  smileThresholdLevels,
  winkDistanceLevels,
} from '../detection';

describe('detection settings', () => {
  it('provides the calibrated wink eye closed threshold default', () => {
    expect(DEFAULT_WINK_EYE_CLOSED_THRESHOLD).toBe(0.1);
  });

  it('normalizes wink eye closed thresholds into the native 0 to 1 range', () => {
    expect(normalizeWinkEyeClosedThreshold(-1)).toBe(0);
    expect(normalizeWinkEyeClosedThreshold(0.456)).toBe(0.456);
    expect(normalizeWinkEyeClosedThreshold(0.14)).toBe(0.14);
    expect(normalizeWinkEyeClosedThreshold(2)).toBe(1);
    expect(normalizeWinkEyeClosedThreshold(Number.NaN)).toBe(0.1);
  });

  it('provides the calibrated wink eye gap threshold default', () => {
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

  it('provides selectable smile threshold values with the calibrated default', () => {
    expect(DEFAULT_SMILE_THRESHOLD).toBe(0.7);
    expect(smileThresholdLevels).toEqual([0.5, 0.7, 0.9]);
  });

  it('normalizes smile threshold values into the native 0 to 1 range', () => {
    expect(normalizeSmileThreshold(-1)).toBe(0);
    expect(normalizeSmileThreshold(0.82)).toBe(0.82);
    expect(normalizeSmileThreshold(2)).toBe(1);
    expect(normalizeSmileThreshold(Number.NaN)).toBe(0.7);
  });

  it('normalizes smile distance input into the displayed 1, 3, 5 range', () => {
    expect(smileDistanceLevels).toEqual([1, 3, 5]);
    expect(normalizeSmileDistanceLevel(0)).toBe(1);
    expect(normalizeSmileDistanceLevel(3.4)).toBe(3);
    expect(normalizeSmileDistanceLevel(99)).toBe(5);
    expect(normalizeSmileDistanceLevel(Number.NaN)).toBe(5);
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
    expect(normalizeDetectionResolutionLevel(Number.NaN)).toBe(1);
  });

  it('provides three ML Kit frame interval levels', () => {
    expect(detectionFrameIntervalLevels).toEqual([3, 2, 1]);
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
    expect(normalizeDetectionFrameIntervalLevel(Number.NaN)).toBe(2);
  });

  it('provides selectable ML Kit performance modes with accurate as the default fallback', () => {
    expect(detectionPerformanceModes).toEqual(['fast', 'accurate']);
    expect(normalizeDetectionPerformanceMode('fast')).toBe('fast');
    expect(normalizeDetectionPerformanceMode('accurate')).toBe('accurate');
    expect(normalizeDetectionPerformanceMode('unknown')).toBe('accurate');
  });
});
