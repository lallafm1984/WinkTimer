import React from 'react';
import { BackHandler, NativeModules, StyleSheet, Text } from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import { getTodayIsoDate, type ScheduledAlarm } from '../../domain/alarm';
import { AlarmsScreen } from '../AlarmsScreen';

const mockSetScreen = jest.fn();
const mockSaveAlarm = jest.fn();
const mockDeleteAlarm = jest.fn();
const mockToggleAlarmEnabled = jest.fn();
const mockSetTimekeepingMode = jest.fn();
const mockRequestTimerTargetPopup = jest.fn();

let mockAlarms: ScheduledAlarm[] = [];
let mockLocale = 'en-US';
const deviceAlarmSoundId = 'uri:content://settings/system/alarm_alert';

jest.mock('../../state/AppState', () => ({
  useAppState: () => ({
    alarms: mockAlarms,
    saveAlarm: mockSaveAlarm,
    deleteAlarm: mockDeleteAlarm,
    toggleAlarmEnabled: mockToggleAlarmEnabled,
    setScreen: mockSetScreen,
    setTimekeepingMode: mockSetTimekeepingMode,
    requestTimerTargetPopup: mockRequestTimerTargetPopup,
    locale: mockLocale,
  }),
}));

function flattenText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(flattenText).join('');
  }

  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function renderAlarmsScreen() {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<AlarmsScreen />);
  });

  return renderer!;
}

function getRenderedText(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType(Text)
    .map(node => flattenText(node.props.children))
    .join(' ');
}

function pressByTestID(
  renderer: ReactTestRenderer.ReactTestRenderer,
  testID: string,
) {
  ReactTestRenderer.act(() => {
    renderer.root.findByProps({ testID }).props.onPress();
  });
}

function dragWheel(
  renderer: ReactTestRenderer.ReactTestRenderer,
  testID: string,
  fromPageY: number,
  toPageY: number,
) {
  ReactTestRenderer.act(() => {
    const wheel = renderer.root.find(
      node =>
        node.props.testID === testID &&
        typeof node.props.onResponderGrant === 'function',
    );

    wheel.props.onResponderGrant({ nativeEvent: { pageY: fromPageY } });
    wheel.props.onResponderRelease({ nativeEvent: { pageY: toPageY } });
  });
}

function dragVolumeSlider(
  renderer: ReactTestRenderer.ReactTestRenderer,
  locationX: number,
  width = 200,
) {
  ReactTestRenderer.act(() => {
    const slider = renderer.root.findByProps({
      testID: 'alarm-sound-volume-slider',
    });

    slider.props.onLayout({ nativeEvent: { layout: { width } } });
  });

  ReactTestRenderer.act(() => {
    const slider = renderer.root.findByProps({
      testID: 'alarm-sound-volume-slider',
    });

    slider.props.onResponderGrant({ nativeEvent: { locationX } });
  });
}

function getPressedStyleEntries(button: ReactTestRenderer.ReactTestInstance) {
  const style = button.props.style;
  const resolvedStyle =
    typeof style === 'function' ? style({ pressed: true }) : style;

  return Array.isArray(resolvedStyle)
    ? resolvedStyle.filter(Boolean)
    : [resolvedStyle].filter(Boolean);
}

async function flushReact() {
  await ReactTestRenderer.act(async () => {
    await Promise.resolve();
  });
}

describe('AlarmsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockAlarms = [];
    NativeModules.NativeTimerAlert = {
      getTimerAlertSoundOptions: jest.fn().mockResolvedValue([
        { id: 'alarm', label: 'Default alarm', category: 'Default' },
        {
          id: deviceAlarmSoundId,
          label: 'Morning Xylophone',
          category: 'Alarm',
        },
      ]),
      previewTimerAlertSound: jest.fn().mockResolvedValue(undefined),
      playTimerAlertSoundPreview: jest.fn().mockResolvedValue(undefined),
      stopTimerAlertSoundPreview: jest.fn().mockResolvedValue(undefined),
    };
    mockLocale = 'en-US';
  });

  it('renders an empty alarm page and opens the alarm editor', async () => {
    const renderer = renderAlarmsScreen();

    expect(getRenderedText(renderer)).toContain('ALARMS');
    expect(getRenderedText(renderer)).toContain('NO ALARMS SET');
    expect(
      renderer.root.findByProps({ testID: 'add-alarm-button' }),
    ).toBeTruthy();
    const scroll = renderer.root.findByProps({ testID: 'alarms-scroll' });
    expect(scroll.findAllByProps({ testID: 'add-alarm-button' })).toHaveLength(
      0,
    );
    expect(
      renderer.root
        .findByProps({ testID: 'alarm-list-fixed-area' })
        .findByProps({ testID: 'add-alarm-button' }),
    ).toBeTruthy();

    pressByTestID(renderer, 'add-alarm-button');
    await flushReact();

    expect(getRenderedText(renderer)).toContain('ALARM SETUP');
    expect(getRenderedText(renderer)).toContain('EVERY DAY');
    expect(getRenderedText(renderer)).toContain('TIME');
    expect(getRenderedText(renderer)).toContain('07:00');
    expect(getRenderedText(renderer)).not.toContain('NAME');
    expect(
      renderer.root.findAllByProps({ testID: 'add-alarm-button' }),
    ).toHaveLength(0);
    expect(renderer.root.findAllByProps({ testID: 'alarm-list' })).toHaveLength(
      0,
    );
    expect(
      renderer.root.findAllByProps({ testID: 'alarms-scroll' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'alarms-settings-button' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAllByProps({ testID: 'timekeeping-mode-options' }),
    ).toHaveLength(0);
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'alarm-editor' }).props.style,
      ),
    ).toEqual(expect.objectContaining({ flex: 1, minHeight: 0, padding: 8 }));
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'alarm-editor-actions' }).props
          .style,
      ),
    ).toEqual(expect.objectContaining({ gap: 6, marginTop: 'auto' }));
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'alarm-editor-content' }).props
          .style,
      ),
    ).toEqual(
      expect.objectContaining({
        flexShrink: 1,
        gap: 5,
        justifyContent: 'flex-start',
      }),
    );
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'alarm-time-open' }).props.style({
          pressed: false,
        }),
      ),
    ).toEqual(expect.objectContaining({ minHeight: 58 }));
    const alertToggleRow = renderer.root.findByProps({
      testID: 'alarm-alert-toggle-row',
    });
    expect(StyleSheet.flatten(alertToggleRow.props.style)).toEqual(
      expect.objectContaining({ flexDirection: 'row' }),
    );
    expect(
      alertToggleRow.findByProps({ testID: 'alarm-sound-enabled-switch' }),
    ).toBeTruthy();
    expect(
      alertToggleRow.findByProps({ testID: 'alarm-vibration-enabled-switch' }),
    ).toBeTruthy();
    expect(
      alertToggleRow.findAllByProps({ testID: 'alarm-snooze-enabled-switch' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findByProps({ testID: 'alarm-snooze-enabled-section' }),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'alarm-snooze-enabled-section' })
          .props.style,
      ),
    ).toEqual(expect.objectContaining({ minHeight: 0 }));
    expect(
      renderer.root.findByProps({ testID: 'alarm-snooze-enabled-switch' }).props
        .accessibilityRole,
    ).toBe('switch');
    expect(
      renderer.root.findAllByProps({ testID: 'alarm-time-popup' }),
    ).toHaveLength(0);
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'alarm-repeat-summary' }).props
          .style,
      ),
    ).toEqual(
      expect.objectContaining({
        fontSize: 14,
        minHeight: 30,
        textAlign: 'center',
      }),
    );
    expect(getRenderedText(renderer).indexOf('REPEAT')).toBeGreaterThan(
      getRenderedText(renderer).indexOf('TIME'),
    );
    expect(getRenderedText(renderer).indexOf('REPEAT')).toBeLessThan(
      getRenderedText(renderer).indexOf('ALARM SOUND'),
    );
    expect(getRenderedText(renderer)).toContain('VOLUME');
    expect(getRenderedText(renderer)).toContain('85%');
    expect(
      renderer.root.findByProps({ testID: 'alarm-sound-volume-slider-fill' })
        .props.pointerEvents,
    ).toBe('none');
    expect(
      renderer.root.findByProps({ testID: 'alarm-sound-volume-slider-thumb' })
        .props.pointerEvents,
    ).toBe('none');
  });

  it('uses Android back to close alarm setup back to the alarm list', async () => {
    const backHandlers: Array<() => boolean> = [];
    const addBackListener = jest
      .spyOn(BackHandler, 'addEventListener')
      .mockImplementation((_eventName, handler) => {
        backHandlers.push(handler as () => boolean);
        return { remove: jest.fn() };
      });
    const renderer = renderAlarmsScreen();

    pressByTestID(renderer, 'add-alarm-button');
    await flushReact();

    ReactTestRenderer.act(() => {
      expect(backHandlers[backHandlers.length - 1]()).toBe(true);
    });

    expect(getRenderedText(renderer)).not.toContain('ALARM SETUP');
    expect(renderer.root.findByProps({ testID: 'alarm-list' })).toBeTruthy();
    expect(
      renderer.root.findByProps({ testID: 'add-alarm-button' }),
    ).toBeTruthy();

    addBackListener.mockRestore();
  });

  it('keeps the shared bottom selector visible on the alarm page', () => {
    const renderer = renderAlarmsScreen();
    const optionText = renderer.root
      .findByProps({ testID: 'timekeeping-mode-options' })
      .findAllByType(Text)
      .map(node => flattenText(node.props.children));

    expect(optionText).toEqual(['STOPWATCH', 'TIMER', 'ALARM']);
    expect(
      renderer.root.findByProps({ testID: 'timekeeping-alarm-button' }).props
        .accessibilityState,
    ).toEqual({ selected: true });
  });

  it('localizes alarm screen, setup, and mode labels for Korean', async () => {
    mockLocale = 'ko-KR';
    const renderer = renderAlarmsScreen();

    expect(getRenderedText(renderer)).toContain('알람');
    expect(getRenderedText(renderer)).toContain('알람 추가');
    expect(getRenderedText(renderer)).toContain('설정');

    const optionText = renderer.root
      .findByProps({ testID: 'timekeeping-mode-options' })
      .findAllByType(Text)
      .map(node => flattenText(node.props.children));

    expect(optionText).toEqual(['스톱워치', '타이머', '알람']);

    pressByTestID(renderer, 'add-alarm-button');
    await flushReact();

    expect(getRenderedText(renderer)).toContain('알람 설정');
    expect(getRenderedText(renderer)).toContain('시간');
    expect(getRenderedText(renderer)).toContain('눌러서 설정');
    expect(getRenderedText(renderer)).toContain('반복');
    expect(getRenderedText(renderer)).toContain('매일');
    expect(getRenderedText(renderer)).toContain('알람 소리');
    expect(getRenderedText(renderer)).toContain('볼륨');
    expect(getRenderedText(renderer)).toContain('다시 울림');
    expect(getRenderedText(renderer)).toContain('저장');
  });

  it('returns to stopwatch or timer from the shared bottom selector', () => {
    const renderer = renderAlarmsScreen();

    pressByTestID(renderer, 'timekeeping-stopwatch-button');
    expect(mockSetTimekeepingMode).toHaveBeenCalledWith('stopwatch');
    expect(mockSetScreen).toHaveBeenCalledWith('timer');
    expect(mockRequestTimerTargetPopup).not.toHaveBeenCalled();

    pressByTestID(renderer, 'timekeeping-timer-button');
    expect(mockSetTimekeepingMode).toHaveBeenCalledWith('timer');
    expect(mockRequestTimerTargetPopup).toHaveBeenCalledTimes(1);
    expect(mockSetScreen).toHaveBeenCalledWith('timer');
  });

  it('saves a daily alarm from the editor', async () => {
    const renderer = renderAlarmsScreen();

    pressByTestID(renderer, 'add-alarm-button');
    await flushReact();
    pressByTestID(renderer, 'alarm-time-open');
    expect(
      renderer.root.findByProps({ testID: 'alarm-time-popup' }),
    ).toBeTruthy();
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'alarm-time-popup' }).props.style,
      ),
    ).toEqual(expect.objectContaining({ justifyContent: 'center' }));
    dragWheel(renderer, 'alarm-time-hour-wheel', 100, 82);
    pressByTestID(renderer, 'alarm-time-confirm-button');
    pressByTestID(renderer, 'save-alarm-button');

    expect(mockSaveAlarm).toHaveBeenCalledWith(
      expect.objectContaining({
        enabled: true,
        hour: 8,
        minute: 0,
        alertSoundId: 'alarm',
        soundVolume: 0.85,
        soundEnabled: true,
        vibrationEnabled: true,
        snoozeEnabled: true,
        schedule: { kind: 'daily' },
      }),
    );
  });

  it('adjusts alarm minutes in one minute steps', async () => {
    const renderer = renderAlarmsScreen();

    pressByTestID(renderer, 'add-alarm-button');
    await flushReact();
    pressByTestID(renderer, 'alarm-time-open');
    dragWheel(renderer, 'alarm-time-minute-wheel', 100, 82);
    pressByTestID(renderer, 'alarm-time-confirm-button');
    pressByTestID(renderer, 'save-alarm-button');

    expect(mockSaveAlarm).toHaveBeenCalledWith(
      expect.objectContaining({
        hour: 7,
        minute: 1,
      }),
    );
  });

  it('cancels alarm time popup without changing the draft', async () => {
    const renderer = renderAlarmsScreen();

    pressByTestID(renderer, 'add-alarm-button');
    await flushReact();
    pressByTestID(renderer, 'alarm-time-open');
    dragWheel(renderer, 'alarm-time-hour-wheel', 100, 82);
    pressByTestID(renderer, 'alarm-time-cancel-button');
    pressByTestID(renderer, 'save-alarm-button');

    expect(mockSaveAlarm).toHaveBeenCalledWith(
      expect.objectContaining({
        hour: 7,
        minute: 0,
      }),
    );
  });

  it('visually separates primary and secondary setting sections', async () => {
    const renderer = renderAlarmsScreen();

    pressByTestID(renderer, 'add-alarm-button');
    await flushReact();

    const timeSectionStyle = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'alarm-time-section' }).props.style,
    );
    const repeatSectionStyle = StyleSheet.flatten(
      renderer.root.findByProps({ testID: 'alarm-repeat-section' }).props.style,
    );

    expect(timeSectionStyle.backgroundColor).not.toBe(
      repeatSectionStyle.backgroundColor,
    );
    expect(timeSectionStyle.borderWidth).toBe(1);
    expect(repeatSectionStyle.borderWidth).toBe(1);
  });

  it('selects weekday alarms from a popup with cancel and OK actions', async () => {
    const renderer = renderAlarmsScreen();

    pressByTestID(renderer, 'add-alarm-button');
    await flushReact();

    pressByTestID(renderer, 'alarm-schedule-weekly');
    expect(
      renderer.root.findByProps({ testID: 'alarm-weekday-popup' }),
    ).toBeTruthy();

    const weekdayOptions = renderer.root.findByProps({
      testID: 'alarm-weekday-options',
    });

    expect(StyleSheet.flatten(weekdayOptions.props.style)).toEqual(
      expect.objectContaining({
        flexDirection: 'row',
        flexWrap: 'nowrap',
      }),
    );
    expect(
      [
        ...new Set(
          renderer.root
            .findAll(
              node =>
                typeof node.props.testID === 'string' &&
                /^alarm-weekday-\d$/.test(node.props.testID),
            )
            .map(node => node.props.testID),
        ),
      ].sort(),
    ).toEqual([
      'alarm-weekday-0',
      'alarm-weekday-1',
      'alarm-weekday-2',
      'alarm-weekday-3',
      'alarm-weekday-4',
      'alarm-weekday-5',
      'alarm-weekday-6',
    ]);

    pressByTestID(renderer, 'alarm-weekday-cancel-button');

    expect(
      renderer.root.findByProps({ testID: 'alarm-schedule-daily' }).props
        .accessibilityState,
    ).toEqual({ selected: true });

    pressByTestID(renderer, 'alarm-schedule-weekly');
    pressByTestID(renderer, 'alarm-weekday-1');
    pressByTestID(renderer, 'alarm-weekday-confirm-button');
    expect(
      flattenText(
        renderer.root.findByProps({ testID: 'alarm-repeat-summary' }).props
          .children,
      ),
    ).toBe('TUE WED THU FRI');
    pressByTestID(renderer, 'save-alarm-button');

    expect(mockSaveAlarm).toHaveBeenLastCalledWith(
      expect.objectContaining({
        schedule: { kind: 'weekly', weekdays: [2, 3, 4, 5] },
      }),
    );
  });

  it('selects date alarms with a popup calendar', async () => {
    const renderer = renderAlarmsScreen();
    const todayIsoDate = getTodayIsoDate();
    const replacementIsoDate = `${todayIsoDate.slice(0, 8)}${
      todayIsoDate.endsWith('-01') ? '02' : '01'
    }`;

    pressByTestID(renderer, 'add-alarm-button');
    await flushReact();

    pressByTestID(renderer, 'alarm-schedule-dates');

    expect(
      renderer.root.findByProps({ testID: 'alarm-date-popup' }),
    ).toBeTruthy();
    expect(getRenderedText(renderer)).toContain('DATE');
    expect(getRenderedText(renderer)).not.toContain('DATES');
    expect(
      renderer.root.findByProps({ testID: 'alarm-date-calendar' }),
    ).toBeTruthy();
    expect(
      renderer.root.findAllByProps({ testID: 'alarm-date-add' }),
    ).toHaveLength(0);
    expect(
      renderer.root.findAll(
        node =>
          typeof node.props.testID === 'string' &&
          (node.props.testID.includes('increment') ||
            node.props.testID.includes('decrement')),
      ),
    ).toHaveLength(0);

    pressByTestID(renderer, `alarm-calendar-day-${todayIsoDate}`);
    pressByTestID(renderer, `alarm-calendar-day-${replacementIsoDate}`);
    pressByTestID(renderer, 'alarm-date-confirm-button');
    expect(
      flattenText(
        renderer.root.findByProps({ testID: 'alarm-repeat-summary' }).props
          .children,
      ),
    ).toBe(replacementIsoDate);
    pressByTestID(renderer, 'save-alarm-button');

    expect(mockSaveAlarm).toHaveBeenLastCalledWith(
      expect.objectContaining({
        schedule: { kind: 'dates', dates: [replacementIsoDate] },
      }),
    );
  });

  it('keeps Saturday date buttons inside a fixed calendar column', async () => {
    const renderer = renderAlarmsScreen();

    pressByTestID(renderer, 'add-alarm-button');
    await flushReact();
    pressByTestID(renderer, 'alarm-schedule-dates');

    const saturdayButton = renderer.root
      .findAll(
        node =>
          typeof node.props.testID === 'string' &&
          node.props.testID.startsWith('alarm-calendar-day-'),
      )
      .find(node => {
        const isoDate = node.props.testID.replace('alarm-calendar-day-', '');
        const [year, month, day] = isoDate.split('-').map(Number);

        return new Date(year, month - 1, day).getDay() === 6;
      });

    expect(saturdayButton).toBeTruthy();
    expect(StyleSheet.flatten(saturdayButton!.parent!.props.style)).toEqual(
      expect.objectContaining({
        padding: 2,
        width: '14.2857142857%',
      }),
    );
    const saturdayButtonStyle =
      typeof saturdayButton!.props.style === 'function'
        ? saturdayButton!.props.style({ pressed: false })
        : saturdayButton!.props.style;

    expect(StyleSheet.flatten(saturdayButtonStyle)).toEqual(
      expect.objectContaining({
        width: '100%',
      }),
    );
  });

  it('cancels date popup without changing the repeat selection', async () => {
    const renderer = renderAlarmsScreen();

    pressByTestID(renderer, 'add-alarm-button');
    await flushReact();
    pressByTestID(renderer, 'alarm-schedule-dates');
    pressByTestID(renderer, 'alarm-date-cancel-button');
    pressByTestID(renderer, 'save-alarm-button');

    expect(mockSaveAlarm).toHaveBeenCalledWith(
      expect.objectContaining({
        schedule: { kind: 'daily' },
      }),
    );
  });

  it('saves selected alarm sound and alert toggles from the editor', async () => {
    const renderer = renderAlarmsScreen();

    pressByTestID(renderer, 'add-alarm-button');
    await flushReact();

    const soundSwitch = renderer.root.findByProps({
      testID: 'alarm-sound-enabled-switch',
    });
    const vibrationSwitch = renderer.root.findByProps({
      testID: 'alarm-vibration-enabled-switch',
    });
    const snoozeSwitch = renderer.root.findByProps({
      testID: 'alarm-snooze-enabled-switch',
    });

    expect(soundSwitch.props.accessibilityRole).toBe('switch');
    expect(vibrationSwitch.props.accessibilityRole).toBe('switch');
    expect(snoozeSwitch.props.accessibilityRole).toBe('switch');
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({
          testID: 'alarm-sound-enabled-switch-track',
        }).props.style,
      ).backgroundColor,
    ).toBe('#1D4D3A');

    pressByTestID(renderer, 'alarm-sound-enabled-switch');
    pressByTestID(renderer, 'alarm-vibration-enabled-switch');
    pressByTestID(renderer, 'alarm-snooze-enabled-switch');
    dragVolumeSlider(renderer, 100);
    pressByTestID(renderer, 'alarm-sound-open');
    await flushReact();

    expect(getRenderedText(renderer)).toContain('Morning Xylophone');

    pressByTestID(renderer, 'alarm-sound-select-1');
    pressByTestID(renderer, 'save-alarm-button');

    expect(mockSaveAlarm).toHaveBeenCalledWith(
      expect.objectContaining({
        alertSoundId: deviceAlarmSoundId,
        soundVolume: 0.55,
        soundEnabled: false,
        vibrationEnabled: false,
        snoozeEnabled: false,
      }),
    );
  });

  it('keeps alarm sound preview playing until the localized stop button is pressed', async () => {
    mockLocale = 'ko-KR';
    const renderer = renderAlarmsScreen();

    pressByTestID(renderer, 'add-alarm-button');
    await flushReact();
    pressByTestID(renderer, 'alarm-sound-open');
    await flushReact();

    pressByTestID(renderer, 'alarm-sound-preview-1');

    expect(
      NativeModules.NativeTimerAlert.playTimerAlertSoundPreview,
    ).toHaveBeenCalledWith(deviceAlarmSoundId);
    expect(
      NativeModules.NativeTimerAlert.previewTimerAlertSound,
    ).not.toHaveBeenCalled();
    expect(
      renderer.root.findByProps({
        testID: 'alarm-sound-preview-1',
      }).props.accessibilityLabel,
    ).toBe('멈춤');
    expect(
      flattenText(
        renderer.root.findByProps({
          testID: 'alarm-sound-preview-1',
        }).findByType(Text).props.children,
      ),
    ).toBe('■');

    pressByTestID(renderer, 'alarm-sound-preview-1');

    expect(
      NativeModules.NativeTimerAlert.stopTimerAlertSoundPreview,
    ).toHaveBeenCalledTimes(1);
  });

  it('renders existing alarms with switch controls, badges, and delete confirmation', async () => {
    mockAlarms = [
      {
        id: 'morning',
        label: 'MORNING',
        enabled: true,
        hour: 6,
        minute: 30,
        alertSoundId: 'alarm',
        soundVolume: 0.85,
        soundEnabled: true,
        vibrationEnabled: true,
        snoozeEnabled: true,
        schedule: { kind: 'weekly', weekdays: [1, 3, 5] },
        createdAtMs: 1000,
        updatedAtMs: 1000,
      },
      {
        id: 'date-heavy',
        label: 'DATES',
        enabled: false,
        hour: 9,
        minute: 5,
        alertSoundId: 'alarm',
        soundVolume: 0.85,
        soundEnabled: false,
        vibrationEnabled: true,
        snoozeEnabled: true,
        schedule: {
          kind: 'dates',
          dates: ['2099-01-01', '2099-01-02', '2099-01-03'],
        },
        createdAtMs: 1001,
        updatedAtMs: 1001,
      },
      {
        id: 'full-week',
        label: 'FULL WEEK',
        enabled: true,
        hour: 22,
        minute: 10,
        alertSoundId: 'alarm',
        soundVolume: 0.85,
        soundEnabled: false,
        vibrationEnabled: false,
        snoozeEnabled: false,
        schedule: { kind: 'weekly', weekdays: [0, 1, 2, 3, 4, 5, 6] },
        createdAtMs: 1002,
        updatedAtMs: 1002,
      },
      {
        id: 'single-weekday',
        label: 'SINGLE',
        enabled: true,
        hour: 10,
        minute: 20,
        alertSoundId: 'alarm',
        soundVolume: 0.85,
        soundEnabled: false,
        vibrationEnabled: false,
        snoozeEnabled: false,
        schedule: { kind: 'weekly', weekdays: [3] },
        createdAtMs: 1003,
        updatedAtMs: 1003,
      },
    ];
    const renderer = renderAlarmsScreen();

    expect(getRenderedText(renderer)).toContain('06:30');
    expect(getRenderedText(renderer)).toContain('MON WED FRI');
    expect(getRenderedText(renderer)).toContain('SOUND ON');
    expect(getRenderedText(renderer)).toContain('VIB ON');
    expect(getRenderedText(renderer)).toContain('SNOOZE ON');
    expect(getRenderedText(renderer)).toContain('09:05');
    expect(getRenderedText(renderer)).toContain('2099-01-01');
    expect(getRenderedText(renderer)).not.toContain('2099-01-02');
    expect(getRenderedText(renderer)).not.toContain('2099-01-03');
    expect(getRenderedText(renderer)).not.toContain('SOUND OFF');
    expect(getRenderedText(renderer)).not.toContain('VIB OFF');
    expect(getRenderedText(renderer)).not.toContain('SNOOZE OFF');
    expect(getRenderedText(renderer)).not.toContain('MORNING');
    expect(getRenderedText(renderer)).not.toContain('FULL WEEK');

    const morningAlertBadges = renderer.root.findByProps({
      testID: 'alarm-alert-badges-morning',
    });
    const morningAlertBadgeLabels = morningAlertBadges
      .findAllByType(Text)
      .map(node => flattenText(node.props.children));
    expect(morningAlertBadgeLabels).toEqual([
      'SOUND ON',
      'VIB ON',
      'SNOOZE ON',
    ]);

    const fullWeekBadges = renderer.root.findByProps({
      testID: 'alarm-schedule-badges-full-week',
    });
    expect(StyleSheet.flatten(fullWeekBadges.props.style)).toEqual(
      expect.objectContaining({ flexWrap: 'nowrap' }),
    );
    const fullWeekBadgeLabels = [
      ...new Set(
        fullWeekBadges
          .findAllByType(Text)
          .map(node => flattenText(node.props.children))
          .filter(label =>
            ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'].includes(label),
          ),
      ),
    ];
    expect(fullWeekBadgeLabels).toEqual([
      'SUN',
      'MON',
      'TUE',
      'WED',
      'THU',
      'FRI',
      'SAT',
    ]);

    const singleWeekdayBadges = renderer.root.findByProps({
      testID: 'alarm-schedule-badges-single-weekday',
    });
    expect(
      singleWeekdayBadges
        .findAllByProps({ testID: 'alarm-info-badge' })
        .map(node => StyleSheet.flatten(node.props.style)),
    ).toContainEqual(expect.objectContaining({ width: 30 }));

    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'alarm-side-controls-morning' })
          .props.style,
      ),
    ).toEqual(expect.objectContaining({ width: 92 }));
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'alarm-row-actions-morning' }).props
          .style,
      ),
    ).toEqual(expect.objectContaining({ alignItems: 'flex-end' }));
    expect(
      getPressedStyleEntries(
        renderer.root.findByProps({ testID: 'alarm-edit-morning' }),
      ),
    ).toContainEqual(expect.objectContaining({ width: 64, minHeight: 28 }));

    const enableSwitch = renderer.root.findByProps({
      testID: 'alarm-enabled-switch-morning',
    });
    expect(enableSwitch.props.accessibilityRole).toBe('switch');
    expect(StyleSheet.flatten(enableSwitch.props.style({ pressed: false })))
      .toEqual(expect.objectContaining({ paddingLeft: 10 }));
    expect(
      StyleSheet.flatten(
        renderer.root.findByProps({ testID: 'alarm-enabled-switch-morning-label' })
          .props.style,
      ),
    ).toEqual(expect.objectContaining({ textAlign: 'center' }));

    pressByTestID(renderer, 'alarm-enabled-switch-morning');
    pressByTestID(renderer, 'alarm-edit-morning');
    await flushReact();

    expect(mockToggleAlarmEnabled).toHaveBeenCalledWith('morning');
    expect(getRenderedText(renderer)).toContain('ALARM SETUP');
    expect(renderer.root.findAllByProps({ testID: 'alarm-list' })).toHaveLength(
      0,
    );

    pressByTestID(renderer, 'cancel-alarm-edit-button');
    pressByTestID(renderer, 'alarm-delete-morning');

    expect(
      renderer.root.findByProps({ testID: 'alarm-delete-confirm-popup' }),
    ).toBeTruthy();
    expect(mockDeleteAlarm).not.toHaveBeenCalled();

    pressByTestID(renderer, 'alarm-delete-cancel-button');
    expect(mockDeleteAlarm).not.toHaveBeenCalled();

    pressByTestID(renderer, 'alarm-delete-morning');
    pressByTestID(renderer, 'alarm-delete-confirm-button');

    expect(mockDeleteAlarm).toHaveBeenCalledWith('morning');
  });

  it('uses the same compact header layout as timer with a settings button', () => {
    const renderer = renderAlarmsScreen();
    const scroll = renderer.root.findByProps({ testID: 'alarms-scroll' });
    const title = renderer.root.findByProps({ testID: 'alarms-title' });
    const settingsButton = renderer.root.findByProps({
      testID: 'alarms-settings-button',
    });

    expect(scroll.props.showsVerticalScrollIndicator).toBe(true);
    expect(scroll.props.persistentScrollbar).toBe(true);
    expect(StyleSheet.flatten(title.props.style)).toEqual(
      expect.objectContaining({
        fontSize: 21,
        fontWeight: '900',
        lineHeight: 25,
      }),
    );
    expect(settingsButton.findByType(Text).props.children).toBe('SETTINGS');
    expect(getPressedStyleEntries(settingsButton)).toContainEqual(
      expect.objectContaining({ minHeight: 34 }),
    );
    expect(StyleSheet.flatten(settingsButton.props.style).minWidth).toBe(
      undefined,
    );
  });

  it('opens settings from the header button', () => {
    const renderer = renderAlarmsScreen();

    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({ testID: 'alarms-settings-button' })
        .props.onPress();
    });

    expect(mockSetScreen).toHaveBeenCalledWith('settings');
  });
});
