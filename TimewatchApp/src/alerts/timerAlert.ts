import {NativeModules, Vibration} from 'react-native';

export type TimerAlertSoundId = string;

export type TimerAlertSoundOption = {
  id: TimerAlertSoundId;
  label: string;
  category: string;
};

export const timerAlertSoundOptions: readonly TimerAlertSoundOption[] = [
  {id: 'alarm', label: 'DEFAULT ALARM'},
].map(option => ({...option, category: 'Default'}));

export const TIMER_ALERT_MIN_DURATION_SECONDS = 1;
export const TIMER_ALERT_MAX_DURATION_SECONDS = 20;
export const DEFAULT_TIMER_ALERT_DURATION_SECONDS = 4;
export const TIMER_ALERT_PREVIEW_DURATION_MS = 3000;
export const TIMER_ALERT_UNTIL_STOPPED_ID = 'untilStopped';

export type TimerAlertDurationId = string;

export function clampTimerAlertDurationSeconds(value: number) {
  if (!Number.isFinite(value)) {
    return DEFAULT_TIMER_ALERT_DURATION_SECONDS;
  }

  return Math.min(
    TIMER_ALERT_MAX_DURATION_SECONDS,
    Math.max(TIMER_ALERT_MIN_DURATION_SECONDS, Math.round(value)),
  );
}

export function createTimerAlertSecondsDurationId(seconds: number) {
  return `seconds:${clampTimerAlertDurationSeconds(seconds)}`;
}

export const timerAlertDurationOptions = [
  {
    id: createTimerAlertSecondsDurationId(DEFAULT_TIMER_ALERT_DURATION_SECONDS),
    label: `${DEFAULT_TIMER_ALERT_DURATION_SECONDS} SEC`,
    durationMs: DEFAULT_TIMER_ALERT_DURATION_SECONDS * 1000,
  },
  {
    id: createTimerAlertSecondsDurationId(TIMER_ALERT_MAX_DURATION_SECONDS),
    label: `${TIMER_ALERT_MAX_DURATION_SECONDS} SEC`,
    durationMs: TIMER_ALERT_MAX_DURATION_SECONDS * 1000,
  },
  {
    id: TIMER_ALERT_UNTIL_STOPPED_ID,
    label: 'UNTIL STOPPED',
    durationMs: null,
  },
] as const;

export const timerAlertVibrationPatternOptions = [
  {id: 'short', label: 'SHORT'},
  {id: 'double', label: 'DOUBLE'},
  {id: 'longRepeat', label: 'LONG REPEAT'},
] as const;

export type TimerAlertVibrationPatternId =
  (typeof timerAlertVibrationPatternOptions)[number]['id'];

export const DEFAULT_TIMER_ALERT_SOUND_ID: TimerAlertSoundId = 'alarm';
export const DEFAULT_TIMER_ALERT_VIBRATION_ENABLED = true;
export const DEFAULT_TIMER_ALERT_SOUND_ENABLED = true;
export const DEFAULT_TIMER_ALERT_DURATION_ID: TimerAlertDurationId =
  createTimerAlertSecondsDurationId(DEFAULT_TIMER_ALERT_DURATION_SECONDS);
export const DEFAULT_TIMER_ALERT_VIBRATION_PATTERN_ID: TimerAlertVibrationPatternId =
  'double';

type NativeTimerAlertModule = {
  playTimerEndAlert(
    soundId: string,
    vibrationEnabled: boolean,
    soundEnabled: boolean,
    durationId: string,
    vibrationPatternId: string,
  ): Promise<void>;
  scheduleTimerEndAlert?(
    triggerAtMs: number,
    soundId: string,
    vibrationEnabled: boolean,
    soundEnabled: boolean,
    durationId: string,
    vibrationPatternId: string,
    notificationTitle: string,
    notificationText: string,
    notificationChannelName: string,
    timekeepingFinishedTitle: string,
    timekeepingFinishedText: string,
    timekeepingChannelName: string,
  ): Promise<void>;
  cancelScheduledTimerEndAlert?(): Promise<void>;
  previewTimerAlertSound?(soundId: string, durationMs: number): Promise<void>;
  playTimerAlertSoundPreview?(soundId: string): Promise<void>;
  stopTimerAlertSoundPreview?(): Promise<void>;
  stopTimerEndAlert?(): Promise<void>;
  getTimerAlertSoundOptions?(): Promise<unknown>;
};

type TimerAlertSettings = {
  vibrationEnabled: boolean;
  soundEnabled: boolean;
  soundId: TimerAlertSoundId;
  durationId: TimerAlertDurationId;
  vibrationPatternId: TimerAlertVibrationPatternId;
};

type ScheduledTimerAlertSettings = TimerAlertSettings & {
  triggerAtMs: number;
  notificationTitle: string;
  notificationText: string;
  notificationChannelName: string;
  timekeepingFinishedTitle: string;
  timekeepingFinishedText: string;
  timekeepingChannelName: string;
};

const fallbackVibrationPatterns: Record<
  TimerAlertVibrationPatternId,
  number[]
> = {
  short: [0, 180],
  double: [0, 180, 80, 240],
  longRepeat: [0, 450, 160, 450, 160],
};

function getNativeTimerAlert() {
  return NativeModules.NativeTimerAlert as NativeTimerAlertModule | undefined;
}

function isTimerAlertSoundId(value: unknown): value is TimerAlertSoundId {
  if (typeof value !== 'string') {
    return false;
  }

  return (
    timerAlertSoundOptions.some(option => option.id === value) ||
    value.startsWith('uri:')
  );
}

function normalizeTimerAlertSoundOption(
  value: unknown,
): TimerAlertSoundOption | null {
  if (typeof value !== 'object' || value === null) {
    return null;
  }

  const candidate = value as Record<string, unknown>;

  if (
    !isTimerAlertSoundId(candidate.id) ||
    typeof candidate.label !== 'string' ||
    candidate.label.trim().length === 0
  ) {
    return null;
  }

  return {
    id: candidate.id,
    label: candidate.label.trim(),
    category:
      typeof candidate.category === 'string' &&
      candidate.category.trim().length > 0
        ? candidate.category.trim()
        : 'Device',
  };
}

function mergeTimerAlertSoundOptions(
  options: readonly TimerAlertSoundOption[],
): TimerAlertSoundOption[] {
  const merged: TimerAlertSoundOption[] = [];
  const seen = new Set<string>();

  for (const option of [...timerAlertSoundOptions, ...options]) {
    if (seen.has(option.id)) {
      continue;
    }

    seen.add(option.id);
    merged.push(option);
  }

  return merged;
}

export function normalizeTimerAlertSoundId(
  value: unknown,
): TimerAlertSoundId {
  return isTimerAlertSoundId(value) ? value : DEFAULT_TIMER_ALERT_SOUND_ID;
}

export async function loadTimerAlertSoundOptions(): Promise<
  TimerAlertSoundOption[]
> {
  const nativeOptions =
    (await getNativeTimerAlert()?.getTimerAlertSoundOptions?.().catch(
      () => undefined,
    )) ?? [];

  if (!Array.isArray(nativeOptions)) {
    return [...timerAlertSoundOptions];
  }

  const normalizedOptions = nativeOptions
    .map(normalizeTimerAlertSoundOption)
    .filter((option): option is TimerAlertSoundOption => option !== null);

  return mergeTimerAlertSoundOptions(normalizedOptions);
}

export function normalizeTimerAlertDurationId(
  value: unknown,
): TimerAlertDurationId {
  if (value === TIMER_ALERT_UNTIL_STOPPED_ID) {
    return TIMER_ALERT_UNTIL_STOPPED_ID;
  }

  if (value === 'short') {
    return createTimerAlertSecondsDurationId(4);
  }

  if (value === 'long') {
    return createTimerAlertSecondsDurationId(15);
  }

  if (typeof value !== 'string') {
    return DEFAULT_TIMER_ALERT_DURATION_ID;
  }

  const secondsMatch = /^seconds:(\d+)$/.exec(value);
  if (!secondsMatch) {
    return DEFAULT_TIMER_ALERT_DURATION_ID;
  }

  return createTimerAlertSecondsDurationId(Number(secondsMatch[1]));
}

export function normalizeTimerAlertVibrationPatternId(
  value: unknown,
): TimerAlertVibrationPatternId {
  return timerAlertVibrationPatternOptions.some(option => option.id === value)
    ? (value as TimerAlertVibrationPatternId)
    : DEFAULT_TIMER_ALERT_VIBRATION_PATTERN_ID;
}

export function getTimerAlertDurationMs(
  durationId: TimerAlertDurationId,
): number | null {
  if (durationId === TIMER_ALERT_UNTIL_STOPPED_ID) {
    return null;
  }

  return getTimerAlertDurationSeconds(durationId) * 1000;
}

export function getTimerAlertDurationSeconds(
  durationId: TimerAlertDurationId,
) {
  const normalizedDurationId = normalizeTimerAlertDurationId(durationId);
  if (normalizedDurationId === TIMER_ALERT_UNTIL_STOPPED_ID) {
    return DEFAULT_TIMER_ALERT_DURATION_SECONDS;
  }

  const secondsMatch = /^seconds:(\d+)$/.exec(normalizedDurationId);

  return secondsMatch
    ? clampTimerAlertDurationSeconds(Number(secondsMatch[1]))
    : DEFAULT_TIMER_ALERT_DURATION_SECONDS;
}

export function isTimerAlertUntilStopped(durationId: TimerAlertDurationId) {
  return durationId === TIMER_ALERT_UNTIL_STOPPED_ID;
}

export function playTimerEndAlert({
  vibrationEnabled,
  soundEnabled,
  soundId,
  durationId,
  vibrationPatternId,
}: TimerAlertSettings): Promise<void> {
  if (!vibrationEnabled && !soundEnabled) {
    return Promise.resolve();
  }

  const nativeTimerAlert = getNativeTimerAlert();

  if (nativeTimerAlert?.playTimerEndAlert) {
    return nativeTimerAlert.playTimerEndAlert(
      soundId,
      vibrationEnabled,
      soundEnabled,
      durationId,
      vibrationPatternId,
    );
  }

  if (vibrationEnabled) {
    Vibration.vibrate(
      fallbackVibrationPatterns[vibrationPatternId],
      isTimerAlertUntilStopped(durationId),
    );
  }

  return Promise.resolve();
}

export function scheduleTimerEndAlert({
  triggerAtMs,
  vibrationEnabled,
  soundEnabled,
  soundId,
  durationId,
  vibrationPatternId,
  notificationTitle,
  notificationText,
  notificationChannelName,
  timekeepingFinishedTitle,
  timekeepingFinishedText,
  timekeepingChannelName,
}: ScheduledTimerAlertSettings): Promise<void> {
  if (!vibrationEnabled && !soundEnabled) {
    return cancelScheduledTimerEndAlert();
  }

  return (
    getNativeTimerAlert()?.scheduleTimerEndAlert?.(
      triggerAtMs,
      soundId,
      vibrationEnabled,
      soundEnabled,
      durationId,
      vibrationPatternId,
      notificationTitle,
      notificationText,
      notificationChannelName,
      timekeepingFinishedTitle,
      timekeepingFinishedText,
      timekeepingChannelName,
    ) ?? Promise.resolve()
  );
}

export function cancelScheduledTimerEndAlert(): Promise<void> {
  return (
    getNativeTimerAlert()?.cancelScheduledTimerEndAlert?.() ??
    Promise.resolve()
  );
}

export function previewTimerAlertSound(
  soundId: TimerAlertSoundId,
): Promise<void> {
  return (
    getNativeTimerAlert()?.previewTimerAlertSound?.(
      soundId,
      TIMER_ALERT_PREVIEW_DURATION_MS,
    ) ?? Promise.resolve()
  );
}

export function playTimerAlertSoundPreview(
  soundId: TimerAlertSoundId,
): Promise<void> {
  return (
    getNativeTimerAlert()?.playTimerAlertSoundPreview?.(soundId) ??
    Promise.resolve()
  );
}

export function stopTimerAlertSoundPreview(): Promise<void> {
  return (
    getNativeTimerAlert()?.stopTimerAlertSoundPreview?.() ?? Promise.resolve()
  );
}

export function stopTimerEndAlert(): Promise<void> {
  Vibration.cancel();

  return getNativeTimerAlert()?.stopTimerEndAlert?.() ?? Promise.resolve();
}
