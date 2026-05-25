export type TimekeepingMode = 'stopwatch' | 'timer';

export const DEFAULT_TIMER_TARGET_DURATION_MS = 5 * 60 * 1000;
export const MIN_TIMER_TARGET_DURATION_MS = 1000;
export const MAX_TIMER_TARGET_HOURS = 99;
export const MAX_TIMER_TARGET_UNIT_VALUE = 59;
export const MAX_TIMER_TARGET_DURATION_MS =
  MAX_TIMER_TARGET_HOURS * 60 * 60 * 1000 +
  MAX_TIMER_TARGET_UNIT_VALUE * 60 * 1000 +
  MAX_TIMER_TARGET_UNIT_VALUE * 1000;

export type TimerTargetParts = {
  hours: number;
  minutes: number;
  seconds: number;
};

export function normalizeTimekeepingMode(value: unknown): TimekeepingMode {
  return value === 'timer' ? 'timer' : 'stopwatch';
}

export function normalizeTimerTargetDurationMs(
  value: unknown,
  fallback = DEFAULT_TIMER_TARGET_DURATION_MS,
): number {
  const numericValue = typeof value === 'number' ? value : fallback;
  const finiteValue = Number.isFinite(numericValue) ? numericValue : fallback;
  const wholeMs = Math.round(finiteValue / 1000) * 1000;

  return Math.min(
    MAX_TIMER_TARGET_DURATION_MS,
    Math.max(MIN_TIMER_TARGET_DURATION_MS, wholeMs),
  );
}

export function getTimerTargetParts(durationMs: number): TimerTargetParts {
  const normalizedDurationMs = normalizeTimerTargetDurationMs(durationMs);
  const totalSeconds = Math.floor(normalizedDurationMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {hours, minutes, seconds};
}

export function createTimerTargetDurationMs(
  hours: number,
  minutes: number,
  seconds: number,
): number {
  const normalizedHours = clampWholeNumber(hours, 0, MAX_TIMER_TARGET_HOURS);
  const normalizedMinutes = clampWholeNumber(
    minutes,
    0,
    MAX_TIMER_TARGET_UNIT_VALUE,
  );
  const normalizedSeconds = clampWholeNumber(
    seconds,
    0,
    MAX_TIMER_TARGET_UNIT_VALUE,
  );

  return normalizeTimerTargetDurationMs(
    normalizedHours * 60 * 60 * 1000 +
      normalizedMinutes * 60 * 1000 +
      normalizedSeconds * 1000,
  );
}

export function getTimekeepingDisplayDurationMs(
  focusDurationMs: number,
  mode: TimekeepingMode,
  targetDurationMs: number | null,
  configuredTargetDurationMs: number,
): number {
  if (mode === 'stopwatch') {
    return focusDurationMs;
  }

  return Math.max(
    0,
    (targetDurationMs ?? configuredTargetDurationMs) - focusDurationMs,
  );
}

function clampWholeNumber(value: number, min: number, max: number): number {
  const finiteValue = Number.isFinite(value) ? value : min;

  return Math.min(max, Math.max(min, Math.round(finiteValue)));
}
