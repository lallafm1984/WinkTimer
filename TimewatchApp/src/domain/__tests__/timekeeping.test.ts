import {
  createTimerTargetDurationMs,
  getTimerTargetParts,
  MAX_TIMER_TARGET_DURATION_MS,
  MIN_TIMER_TARGET_DURATION_MS,
  normalizeTimerTargetDurationMs,
} from '../timekeeping';

describe('timekeeping', () => {
  it('splits timer targets into hour, minute, and second picker values', () => {
    expect(getTimerTargetParts(62 * 60 * 1000 + 3000)).toEqual({
      hours: 1,
      minutes: 2,
      seconds: 3,
    });
  });

  it('creates timer target durations from hour, minute, and second values', () => {
    expect(createTimerTargetDurationMs(1, 2, 3)).toBe(
      62 * 60 * 1000 + 3000,
    );
  });

  it('normalizes target durations to second precision with one second minimum', () => {
    expect(normalizeTimerTargetDurationMs(250)).toBe(
      MIN_TIMER_TARGET_DURATION_MS,
    );
    expect(normalizeTimerTargetDurationMs(1549)).toBe(2000);
    expect(normalizeTimerTargetDurationMs(Number.POSITIVE_INFINITY)).toBe(
      5 * 60 * 1000,
    );
    expect(normalizeTimerTargetDurationMs(MAX_TIMER_TARGET_DURATION_MS + 1000))
      .toBe(MAX_TIMER_TARGET_DURATION_MS);
  });
});
