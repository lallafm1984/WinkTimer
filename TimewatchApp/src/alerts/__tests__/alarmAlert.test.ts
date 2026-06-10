import {NativeModules} from 'react-native';
import {createDefaultAlarm} from '../../domain/alarm';
import {
  getActiveAlarmAlert,
  scheduleAlarmAlert,
  snoozeActiveAlarmAlert,
} from '../alarmAlert';

type MutableNativeModules = typeof NativeModules & {
  NativeTimerAlert?: {
    scheduleAlarmAlert?: jest.Mock<Promise<void>, unknown[]>;
    snoozeAlarmAlert?: jest.Mock<Promise<void>, unknown[]>;
    getActiveAlarmAlert?: jest.Mock<Promise<unknown>, []>;
  };
};

const nativeModules = NativeModules as MutableNativeModules;
const originalNativeTimerAlert = nativeModules.NativeTimerAlert;

describe('alarmAlert localization', () => {
  beforeEach(() => {
    jest.spyOn(Date, 'now').mockReturnValue(new Date(2026, 4, 28, 6, 0).getTime());
  });

  afterEach(() => {
    if (originalNativeTimerAlert) {
      nativeModules.NativeTimerAlert = originalNativeTimerAlert;
    } else {
      delete nativeModules.NativeTimerAlert;
    }

    jest.restoreAllMocks();
  });

  it('passes localized default alarm notification text to native scheduling', async () => {
    const scheduleNativeAlarm = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {
      scheduleAlarmAlert: scheduleNativeAlarm,
    };

    await scheduleAlarmAlert(createDefaultAlarm(1000), 'ko-KR');

    expect(scheduleNativeAlarm).toHaveBeenLastCalledWith(
      'alarm-1000',
      new Date(2026, 4, 28, 7, 0).getTime(),
      7,
      0,
      'daily',
      '',
      '',
      'alarm',
      true,
      true,
      0.85,
      '알람',
      '07:00',
      '알람 알림',
    );
  });

  it('passes vibration-only alarms to native scheduling without sound', async () => {
    const scheduleNativeAlarm = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {
      scheduleAlarmAlert: scheduleNativeAlarm,
    };

    await scheduleAlarmAlert(
      {
        ...createDefaultAlarm(1000),
        soundEnabled: false,
        vibrationEnabled: true,
      },
      'en-US',
    );

    expect(scheduleNativeAlarm).toHaveBeenLastCalledWith(
      'alarm-1000',
      new Date(2026, 4, 28, 7, 0).getTime(),
      7,
      0,
      'daily',
      '',
      '',
      'alarm',
      true,
      false,
      0.85,
      'Alarm',
      '07:00',
      'Alarm alerts',
    );
  });

  it('uses localized fallback text for active native alarm alerts', async () => {
    nativeModules.NativeTimerAlert = {
      getActiveAlarmAlert: jest.fn().mockResolvedValue({
        active: true,
        alarmId: 'alarm-test',
        title: '',
        text: '',
      }),
    };

    await expect(getActiveAlarmAlert('ko-KR')).resolves.toEqual({
      alarmId: 'alarm-test',
      title: '알람',
      text: '알람',
    });
  });

  it('passes localized channel name when snoozing an alarm', async () => {
    const snoozeNativeAlarm = jest.fn().mockResolvedValue(undefined);
    nativeModules.NativeTimerAlert = {
      snoozeAlarmAlert: snoozeNativeAlarm,
    };

    await snoozeActiveAlarmAlert(createDefaultAlarm(1000), 5, null, 'ko-KR');

    expect(snoozeNativeAlarm).toHaveBeenLastCalledWith(
      'alarm-1000',
      new Date(2026, 4, 28, 6, 5).getTime(),
      'alarm',
      true,
      true,
      0.85,
      '알람',
      '07:00',
      '알람 알림',
    );
  });
});
