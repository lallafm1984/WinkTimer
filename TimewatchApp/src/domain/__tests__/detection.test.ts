import {
  detectionFrameIntervalMsByLevel,
  detectionFrameIntervalLevels,
  detectionResolutionByLevel,
  detectionResolutionLevels,
  getSingleWinkMinDurationMs,
  lookAngleLevels,
  normalizeDetectionFrameIntervalLevel,
  normalizeDetectionResolutionLevel,
  normalizeLookAngleLevel,
  normalizeWinkDistanceLevel,
  normalizeWinkMinTimeLevel,
  normalizeWinkSensitivityLevel,
  normalizeWinkTimeLevel,
  toNativeWinkSensitivityLevel,
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

  it('provides five wink distance levels', () => {
    expect(winkDistanceLevels).toEqual([1, 2, 3, 4, 5]);
  });

  it('normalizes arbitrary wink distance input into the 1 to 5 range', () => {
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
    expect(normalizeWinkMinTimeLevel(Number.NaN)).toBe(1);
  });

  it('maps wink minimum time levels to duration thresholds', () => {
    expect(getSingleWinkMinDurationMs(1)).toBe(100);
    expect(getSingleWinkMinDurationMs(2)).toBe(200);
    expect(getSingleWinkMinDurationMs(3)).toBe(300);
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

  it('provides three camera analysis resolution levels', () => {
    expect(detectionResolutionLevels).toEqual([1, 2, 3]);
    expect(detectionResolutionByLevel[1]).toEqual({width: 480, height: 360});
    expect(detectionResolutionByLevel[2]).toEqual({width: 640, height: 480});
    expect(detectionResolutionByLevel[3]).toEqual({width: 960, height: 720});
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
});
