export type AlarmWeekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export type AlarmSchedule =
  | {kind: 'daily'}
  | {kind: 'weekly'; weekdays: AlarmWeekday[]}
  | {kind: 'dates'; dates: string[]};

export type AlarmSoundId = string;

export type ScheduledAlarm = {
  id: string;
  label: string;
  enabled: boolean;
  hour: number;
  minute: number;
  alertSoundId: AlarmSoundId;
  soundVolume: number;
  soundEnabled: boolean;
  vibrationEnabled: boolean;
  snoozeEnabled: boolean;
  schedule: AlarmSchedule;
  createdAtMs: number;
  updatedAtMs: number;
};

const DEFAULT_ALARM_HOUR = 7;
const DEFAULT_ALARM_MINUTE = 0;
const DEFAULT_ALARM_LABEL = 'ALARM';
export const DEFAULT_ALARM_SOUND_ID: AlarmSoundId = 'alarm';
export const DEFAULT_ALARM_SOUND_VOLUME = 0.85;
export const DEFAULT_ALARM_SOUND_ENABLED = true;
export const DEFAULT_ALARM_VIBRATION_ENABLED = true;
export const DEFAULT_ALARM_SNOOZE_ENABLED = true;
const weekdayLabels: Record<AlarmWeekday, string> = {
  0: 'SUN',
  1: 'MON',
  2: 'TUE',
  3: 'WED',
  4: 'THU',
  5: 'FRI',
  6: 'SAT',
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function clampInteger(value: unknown, min: number, max: number, fallback: number) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return fallback;
  }

  return Math.min(max, Math.max(min, Math.floor(value)));
}

function normalizeTimestamp(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function normalizeLabel(value: unknown) {
  if (typeof value !== 'string') {
    return DEFAULT_ALARM_LABEL;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_ALARM_LABEL;
}

function normalizeAlarmSoundId(value: unknown): AlarmSoundId {
  if (typeof value !== 'string') {
    return DEFAULT_ALARM_SOUND_ID;
  }

  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : DEFAULT_ALARM_SOUND_ID;
}

export function normalizeAlarmSoundVolume(value: unknown): number {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return DEFAULT_ALARM_SOUND_VOLUME;
  }

  return Math.min(1, Math.max(0.1, Number(value.toFixed(2))));
}

function isAlarmWeekday(value: unknown): value is AlarmWeekday {
  return (
    typeof value === 'number' &&
    Number.isInteger(value) &&
    value >= 0 &&
    value <= 6
  );
}

function normalizeWeekdays(value: unknown): AlarmWeekday[] {
  if (!Array.isArray(value)) {
    return [1, 2, 3, 4, 5];
  }

  const weekdays = value
    .filter(isAlarmWeekday)
    .filter((weekday, index, values) => values.indexOf(weekday) === index)
    .sort((left, right) => left - right);

  return weekdays.length > 0 ? weekdays : [1, 2, 3, 4, 5];
}

function isIsoDate(value: unknown): value is string {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeDates(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter(isIsoDate)
    .filter((date, index, dates) => dates.indexOf(date) === index)
    .sort();
}

function normalizeSchedule(value: unknown): AlarmSchedule {
  if (!isRecord(value)) {
    return {kind: 'daily'};
  }

  if (value.kind === 'weekly') {
    return {
      kind: 'weekly',
      weekdays: normalizeWeekdays(value.weekdays),
    };
  }

  if (value.kind === 'dates') {
    const dates = normalizeDates(value.dates);
    return dates.length > 0 ? {kind: 'dates', dates} : {kind: 'daily'};
  }

  return {kind: 'daily'};
}

export function createDefaultAlarm(nowMs = Date.now()): ScheduledAlarm {
  return {
    id: `alarm-${nowMs}`,
    label: DEFAULT_ALARM_LABEL,
    enabled: true,
    hour: DEFAULT_ALARM_HOUR,
    minute: DEFAULT_ALARM_MINUTE,
    alertSoundId: DEFAULT_ALARM_SOUND_ID,
    soundVolume: DEFAULT_ALARM_SOUND_VOLUME,
    soundEnabled: DEFAULT_ALARM_SOUND_ENABLED,
    vibrationEnabled: DEFAULT_ALARM_VIBRATION_ENABLED,
    snoozeEnabled: DEFAULT_ALARM_SNOOZE_ENABLED,
    schedule: {kind: 'daily'},
    createdAtMs: nowMs,
    updatedAtMs: nowMs,
  };
}

export function normalizeAlarm(value: unknown): ScheduledAlarm | null {
  if (!isRecord(value) || typeof value.id !== 'string') {
    return null;
  }

  const fallbackNow = Date.now();
  const createdAtMs = normalizeTimestamp(value.createdAtMs, fallbackNow);

  return {
    id: value.id,
    label: normalizeLabel(value.label),
    enabled: typeof value.enabled === 'boolean' ? value.enabled : true,
    hour: clampInteger(value.hour, 0, 23, DEFAULT_ALARM_HOUR),
    minute: clampInteger(value.minute, 0, 59, DEFAULT_ALARM_MINUTE),
    alertSoundId: normalizeAlarmSoundId(value.alertSoundId),
    soundVolume: normalizeAlarmSoundVolume(value.soundVolume),
    soundEnabled:
      typeof value.soundEnabled === 'boolean'
        ? value.soundEnabled
        : DEFAULT_ALARM_SOUND_ENABLED,
    vibrationEnabled:
      typeof value.vibrationEnabled === 'boolean'
        ? value.vibrationEnabled
        : DEFAULT_ALARM_VIBRATION_ENABLED,
    snoozeEnabled:
      typeof value.snoozeEnabled === 'boolean'
        ? value.snoozeEnabled
        : DEFAULT_ALARM_SNOOZE_ENABLED,
    schedule: normalizeSchedule(value.schedule),
    createdAtMs,
    updatedAtMs: normalizeTimestamp(value.updatedAtMs, createdAtMs),
  };
}

export function normalizeAlarms(value: unknown): ScheduledAlarm[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map(normalizeAlarm)
    .filter((alarm): alarm is ScheduledAlarm => alarm !== null)
    .sort((left, right) => left.createdAtMs - right.createdAtMs);
}

export function formatAlarmTime({
  hour,
  minute,
}: Pick<ScheduledAlarm, 'hour' | 'minute'>) {
  return `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`;
}

export function formatAlarmScheduleLabel(schedule: AlarmSchedule) {
  switch (schedule.kind) {
    case 'weekly':
      return schedule.weekdays.map(weekday => weekdayLabels[weekday]).join(' ');
    case 'dates':
      return schedule.dates.join(', ');
    case 'daily':
    default:
      return 'EVERY DAY';
  }
}

export function toggleAlarmWeekday(
  weekdays: readonly AlarmWeekday[],
  weekday: AlarmWeekday,
): AlarmWeekday[] {
  if (weekdays.includes(weekday)) {
    return weekdays.length === 1
      ? [...weekdays]
      : weekdays.filter(item => item !== weekday);
  }

  return [...weekdays, weekday].sort((left, right) => left - right);
}

export function getAlarmWeekdayLabel(weekday: AlarmWeekday) {
  return weekdayLabels[weekday];
}

export function getTodayIsoDate(now = new Date()) {
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function createLocalAlarmDate(
  year: number,
  monthIndex: number,
  day: number,
  hour: number,
  minute: number,
) {
  return new Date(year, monthIndex, day, hour, minute, 0, 0);
}

function getDailyAlarmTriggerAtMs(
  alarm: Pick<ScheduledAlarm, 'hour' | 'minute'>,
  now: Date,
) {
  const todayTrigger = createLocalAlarmDate(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    alarm.hour,
    alarm.minute,
  );

  if (todayTrigger.getTime() > now.getTime()) {
    return todayTrigger.getTime();
  }

  todayTrigger.setDate(todayTrigger.getDate() + 1);
  return todayTrigger.getTime();
}

function getWeeklyAlarmTriggerAtMs(
  alarm: Pick<ScheduledAlarm, 'hour' | 'minute'>,
  weekdays: readonly AlarmWeekday[],
  now: Date,
) {
  const candidates = weekdays.map(weekday => {
    const currentWeekday = now.getDay() as AlarmWeekday;
    const daysUntilWeekday = (weekday - currentWeekday + 7) % 7;
    const candidate = createLocalAlarmDate(
      now.getFullYear(),
      now.getMonth(),
      now.getDate(),
      alarm.hour,
      alarm.minute,
    );

    candidate.setDate(candidate.getDate() + daysUntilWeekday);
    if (candidate.getTime() <= now.getTime()) {
      candidate.setDate(candidate.getDate() + 7);
    }

    return candidate.getTime();
  });

  return Math.min(...candidates);
}

function getDateAlarmTriggerAtMs(
  alarm: Pick<ScheduledAlarm, 'hour' | 'minute'>,
  dates: readonly string[],
  now: Date,
) {
  const futureTriggers = dates
    .map(date => {
      const [year, month, day] = date.split('-').map(Number);
      return createLocalAlarmDate(
        year,
        month - 1,
        day,
        alarm.hour,
        alarm.minute,
      ).getTime();
    })
    .filter(triggerAtMs => triggerAtMs > now.getTime());

  return futureTriggers.length > 0 ? Math.min(...futureTriggers) : null;
}

export function getNextAlarmTriggerAtMs(
  alarm: ScheduledAlarm,
  now = new Date(),
) {
  if (!alarm.enabled) {
    return null;
  }

  switch (alarm.schedule.kind) {
    case 'weekly':
      return getWeeklyAlarmTriggerAtMs(alarm, alarm.schedule.weekdays, now);
    case 'dates':
      return getDateAlarmTriggerAtMs(alarm, alarm.schedule.dates, now);
    case 'daily':
    default:
      return getDailyAlarmTriggerAtMs(alarm, now);
  }
}
