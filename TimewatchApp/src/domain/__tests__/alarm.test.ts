import {
  createDefaultAlarm,
  formatAlarmScheduleLabel,
  formatAlarmTime,
  getNextAlarmTriggerAtMs,
  normalizeAlarm,
  toggleAlarmWeekday,
  type AlarmWeekday,
} from '../alarm';

describe('alarm domain', () => {
  it('creates a default enabled daily alarm at 07:00', () => {
    const alarm = createDefaultAlarm(1_700_000_000_000);

    expect(alarm).toEqual({
      id: 'alarm-1700000000000',
      label: 'ALARM',
      enabled: true,
      hour: 7,
      minute: 0,
      alertSoundId: 'alarm',
      soundVolume: 0.85,
      soundEnabled: true,
      vibrationEnabled: true,
      snoozeEnabled: true,
      schedule: {kind: 'daily'},
      createdAtMs: 1_700_000_000_000,
      updatedAtMs: 1_700_000_000_000,
    });
    expect(formatAlarmTime(alarm)).toBe('07:00');
    expect(formatAlarmScheduleLabel(alarm.schedule)).toBe('EVERY DAY');
  });

  it('formats selected weekdays and specific dates', () => {
    expect(
      formatAlarmScheduleLabel({
        kind: 'weekly',
        weekdays: [1, 3, 5],
      }),
    ).toBe('MON WED FRI');
    expect(
      formatAlarmScheduleLabel({
        kind: 'dates',
        dates: ['2026-05-28', '2026-06-02'],
      }),
    ).toBe('2026-05-28, 2026-06-02');
  });

  it('keeps weekday selections ordered and prevents removing the last day', () => {
    expect(toggleAlarmWeekday([1, 5], 3)).toEqual([1, 3, 5]);
    expect(toggleAlarmWeekday([1, 3, 5], 3)).toEqual([1, 5]);
    expect(toggleAlarmWeekday([3], 3)).toEqual([3]);
  });

  it('normalizes stored alarms safely', () => {
    expect(
      normalizeAlarm({
        id: 'wake',
        label: '  Wake up  ',
        enabled: false,
        hour: 25,
        minute: -1,
        alertSoundId: 'uri:content://settings/system/alarm_alert',
        soundVolume: 1.8,
        soundEnabled: false,
        vibrationEnabled: false,
        snoozeEnabled: false,
        schedule: {
          kind: 'weekly',
          weekdays: [6, 2, 99, 2],
        },
        createdAtMs: 100,
        updatedAtMs: 200,
      }),
    ).toEqual({
      id: 'wake',
      label: 'Wake up',
      enabled: false,
      hour: 23,
      minute: 0,
      alertSoundId: 'uri:content://settings/system/alarm_alert',
      soundVolume: 1,
      soundEnabled: false,
      vibrationEnabled: false,
      snoozeEnabled: false,
      schedule: {
        kind: 'weekly',
        weekdays: [2, 6],
      },
      createdAtMs: 100,
      updatedAtMs: 200,
    });
  });

  it('finds the next daily alarm trigger in local time', () => {
    const alarm = {
      ...createDefaultAlarm(100),
      hour: 7,
      minute: 30,
    };

    expect(
      getNextAlarmTriggerAtMs(alarm, new Date(2026, 4, 28, 7, 29, 30)),
    ).toBe(new Date(2026, 4, 28, 7, 30).getTime());
    expect(
      getNextAlarmTriggerAtMs(alarm, new Date(2026, 4, 28, 7, 30, 0)),
    ).toBe(new Date(2026, 4, 29, 7, 30).getTime());
  });

  it('finds the next weekly alarm trigger from selected weekdays', () => {
    const alarm = {
      ...createDefaultAlarm(100),
      hour: 8,
      minute: 15,
      schedule: {
        kind: 'weekly' as const,
        weekdays: [1, 3, 5] as AlarmWeekday[],
      },
    };

    expect(
      getNextAlarmTriggerAtMs(alarm, new Date(2026, 4, 28, 8, 0)),
    ).toBe(new Date(2026, 4, 29, 8, 15).getTime());
  });

  it('returns no trigger when specific date alarms are all in the past', () => {
    const alarm = {
      ...createDefaultAlarm(100),
      hour: 9,
      minute: 0,
      schedule: {
        kind: 'dates' as const,
        dates: ['2026-05-27'],
      },
    };

    expect(getNextAlarmTriggerAtMs(alarm, new Date(2026, 4, 28, 8, 0)))
      .toBeNull();
  });
});
