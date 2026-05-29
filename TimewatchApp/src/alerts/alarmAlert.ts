import {NativeModules} from 'react-native';
import {
  formatAlarmTime,
  getNextAlarmTriggerAtMs,
  type ScheduledAlarm,
} from '../domain/alarm';
import {
  createTranslator,
  DEFAULT_APP_LOCALE,
  type AppLocale,
} from '../i18n/localization';

type NativeAlarmAlertModule = {
  scheduleAlarmAlert?(
    alarmId: string,
    triggerAtMs: number,
    hour: number,
    minute: number,
    scheduleKind: string,
    weekdaysCsv: string,
    datesCsv: string,
    soundId: string,
    vibrationEnabled: boolean,
    soundEnabled: boolean,
    soundVolume: number,
    notificationTitle: string,
    notificationText: string,
    notificationChannelName: string,
  ): Promise<void>;
  cancelAlarmAlert?(alarmId: string): Promise<void>;
  snoozeAlarmAlert?(
    alarmId: string,
    triggerAtMs: number,
    soundId: string,
    vibrationEnabled: boolean,
    soundEnabled: boolean,
    soundVolume: number,
    notificationTitle: string,
    notificationText: string,
    notificationChannelName: string,
  ): Promise<void>;
  getActiveAlarmAlert?(): Promise<NativeActiveAlarmAlert | null>;
  stopAlarmAlert?(): Promise<void>;
};

const DEFAULT_ALARM_LABEL = 'ALARM';

type NativeActiveAlarmAlert = {
  active?: boolean;
  alarmId?: string | null;
  title?: string | null;
  text?: string | null;
};

export type ActiveAlarmAlert = {
  alarmId: string | null;
  title: string;
  text: string;
};

function getNativeAlarmAlert() {
  return NativeModules.NativeTimerAlert as NativeAlarmAlertModule | undefined;
}

function getAlarmWeekdaysCsv(alarm: ScheduledAlarm) {
  return alarm.schedule.kind === 'weekly'
    ? alarm.schedule.weekdays.join(',')
    : '';
}

function getAlarmDatesCsv(alarm: ScheduledAlarm) {
  return alarm.schedule.kind === 'dates' ? alarm.schedule.dates.join(',') : '';
}

export function cancelAlarmAlert(alarmId: string): Promise<void> {
  return getNativeAlarmAlert()?.cancelAlarmAlert?.(alarmId) ?? Promise.resolve();
}

function getLocalizedAlarmNotificationTitle(
  alarm: ScheduledAlarm,
  locale: AppLocale,
) {
  const label = alarm.label.trim();
  if (label.length > 0 && label.toUpperCase() !== DEFAULT_ALARM_LABEL) {
    return label;
  }

  return createTranslator(locale)('alarm.notificationTitle');
}

function getAlarmNotificationChannelName(locale: AppLocale) {
  return createTranslator(locale)('alarm.notificationChannel');
}

function getAlarmFallbackTitle(locale: AppLocale) {
  return createTranslator(locale)('alarm.notificationTitle');
}

export async function getActiveAlarmAlert(
  locale: AppLocale = DEFAULT_APP_LOCALE,
): Promise<ActiveAlarmAlert | null> {
  const activeAlarmAlert =
    (await getNativeAlarmAlert()?.getActiveAlarmAlert?.()) ?? null;

  if (!activeAlarmAlert?.active) {
    return null;
  }

  const fallbackTitle = getAlarmFallbackTitle(locale);

  return {
    alarmId: activeAlarmAlert.alarmId ?? null,
    title: activeAlarmAlert.title?.trim() || fallbackTitle,
    text: activeAlarmAlert.text?.trim() || fallbackTitle,
  };
}

export function stopActiveAlarmAlert(): Promise<void> {
  return getNativeAlarmAlert()?.stopAlarmAlert?.() ?? Promise.resolve();
}

export function snoozeActiveAlarmAlert(
  alarm: ScheduledAlarm,
  minutes: number,
  activeAlarmAlert?: ActiveAlarmAlert | null,
  locale: AppLocale = DEFAULT_APP_LOCALE,
): Promise<void> {
  const snoozeMinutes = Math.max(1, Math.floor(minutes));
  const triggerAtMs = Date.now() + snoozeMinutes * 60 * 1000;

  return (
    getNativeAlarmAlert()?.snoozeAlarmAlert?.(
      alarm.id,
      triggerAtMs,
      alarm.alertSoundId,
      alarm.vibrationEnabled,
      alarm.soundEnabled,
      alarm.soundVolume,
      activeAlarmAlert?.title ??
        getLocalizedAlarmNotificationTitle(alarm, locale),
      activeAlarmAlert?.text ?? formatAlarmTime(alarm),
      getAlarmNotificationChannelName(locale),
    ) ?? Promise.resolve()
  );
}

export function scheduleAlarmAlert(
  alarm: ScheduledAlarm,
  locale: AppLocale = DEFAULT_APP_LOCALE,
): Promise<void> {
  if (!alarm.enabled || (!alarm.soundEnabled && !alarm.vibrationEnabled)) {
    return cancelAlarmAlert(alarm.id);
  }

  const triggerAtMs = getNextAlarmTriggerAtMs(alarm, new Date(Date.now()));
  if (triggerAtMs === null) {
    return cancelAlarmAlert(alarm.id);
  }

  return (
    getNativeAlarmAlert()?.scheduleAlarmAlert?.(
      alarm.id,
      triggerAtMs,
      alarm.hour,
      alarm.minute,
      alarm.schedule.kind,
      getAlarmWeekdaysCsv(alarm),
      getAlarmDatesCsv(alarm),
      alarm.alertSoundId,
      alarm.vibrationEnabled,
      alarm.soundEnabled,
      alarm.soundVolume,
      getLocalizedAlarmNotificationTitle(alarm, locale),
      formatAlarmTime(alarm),
      getAlarmNotificationChannelName(locale),
    ) ?? Promise.resolve()
  );
}
