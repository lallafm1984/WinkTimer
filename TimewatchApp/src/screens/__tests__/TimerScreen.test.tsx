import React from 'react';
import {NativeModules, ScrollView, StyleSheet, Text} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import type {TimerState} from '../../domain/timerEngine';
import {TimerScreen} from '../TimerScreen';

const mockSetScreen = jest.fn();
const mockStartTimerSession = jest.fn();
const mockPauseTimerSession = jest.fn();
const mockResumeTimerSession = jest.fn();
const mockResetTimerSession = jest.fn();
const mockRecordLapSession = jest.fn();
const mockFinishTimerSession = jest.fn();
const mockStopTimerEndAlert = jest.fn();
const mockSetMockDetectionStatus = jest.fn();
const mockSetTimerModeId = jest.fn();
const mockSetGestureInputsBlocked = jest.fn();
const mockSetTimekeepingMode = jest.fn();
const mockSetTimerTargetDurationMs = jest.fn();
const mockCopyTimelineText = jest.fn<Promise<void>, [string]>();

type NativeTimelineClipboardModuleForTest = {
  copyText: jest.Mock<Promise<void>, [string]>;
};

type MutableNativeModules = typeof NativeModules & {
  NativeTimelineClipboard?: NativeTimelineClipboardModuleForTest;
};

const nativeModules = NativeModules as MutableNativeModules;
const originalNativeTimelineClipboard = nativeModules.NativeTimelineClipboard;

const baseTimer: TimerState = {
  phase: 'active',
  startedAtMs: 1000,
  lastUpdatedAtMs: 62042,
  focusDurationMs: 61042,
  lookPausedDurationMs: 0,
  lookPauseCount: 0,
  targetDurationMs: null,
  detectionStatus: 'looking',
  eyeState: 'bothOpen',
  winkSide: null,
  smileDetected: null,
  recentWinkSide: null,
  recentWinkAtMs: null,
  lookingStartedAtMs: 60000,
  isLookPaused: true,
  oneEyeClosedStartedAtMs: null,
  oneEyeResetArmed: true,
};

const baseState = {
  screen: 'timer',
  setScreen: mockSetScreen,
  timer: baseTimer,
  setTimer: jest.fn(),
  sessions: [],
  setSessions: jest.fn(),
  lastSummary: null,
  setLastSummary: jest.fn(),
  sessionHistory: [
    {id: 'START-1000', type: 'START', atMs: 1000, elapsedMs: 0, deltaMs: 0},
    {
      id: 'STOP-6000',
      type: 'STOP',
      atMs: 6000,
      elapsedMs: 5000,
      deltaMs: 5000,
    },
  ],
  sensitivity: 'normal',
  setSensitivity: jest.fn(),
  statusDisplayMode: 'text',
  setStatusDisplayMode: jest.fn(),
  normalTimerMode: false,
  setNormalTimerMode: jest.fn(),
  timekeepingMode: 'stopwatch',
  setTimekeepingMode: mockSetTimekeepingMode,
  timerTargetDurationMs: 5 * 60 * 1000,
  recentTimerTargetDurationsMs: [] as number[],
  setTimerTargetDurationMs: mockSetTimerTargetDurationMs,
  timerModeId: 'lookPause',
  setTimerModeId: mockSetTimerModeId,
  timerAlertVibrationEnabled: true,
  setTimerAlertVibrationEnabled: jest.fn(),
  timerAlertSoundEnabled: true,
  setTimerAlertSoundEnabled: jest.fn(),
  timerAlertSoundId: 'alarm',
  setTimerAlertSoundId: jest.fn(),
  timerAlertDurationId: 'short',
  setTimerAlertDurationId: jest.fn(),
  timerAlertVibrationPatternId: 'double',
  setTimerAlertVibrationPatternId: jest.fn(),
  isTimerAlertActive: false,
  stopTimerEndAlert: mockStopTimerEndAlert,
  gestureInputsBlocked: false,
  setGestureInputsBlocked: mockSetGestureInputsBlocked,
  finishError: null,
  isFinishingSession: false,
  repository: {},
  gazeDetector: {},
  startTimerSession: mockStartTimerSession,
  pauseTimerSession: mockPauseTimerSession,
  resumeTimerSession: mockResumeTimerSession,
  resetTimerSession: mockResetTimerSession,
  recordLapSession: mockRecordLapSession,
  finishTimerSession: mockFinishTimerSession,
  setMockDetectionStatus: mockSetMockDetectionStatus,
};

let mockState = baseState;

jest.mock('../../state/AppState', () => ({
  useAppState: () => mockState,
}));

function flattenText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(flattenText).join('');
  }

  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

function renderTimerScreen() {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<TimerScreen />);
  });

  return renderer!;
}

function getRenderedText(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType(Text)
    .map(node => flattenText(node.props.children))
    .join(' ');
}

function getPressedStyleEntries(
  button: ReactTestRenderer.ReactTestInstance,
) {
  const pressable =
    typeof button.props.style === 'function'
      ? button
      : button.findByProps({accessibilityRole: 'button'});
  const style = pressable.props.style;
  const resolvedStyle =
    typeof style === 'function' ? style({pressed: true}) : style;

  return Array.isArray(resolvedStyle)
    ? resolvedStyle.filter(Boolean)
    : [resolvedStyle].filter(Boolean);
}

describe('TimerScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockState = baseState;
    mockCopyTimelineText.mockResolvedValue(undefined);
    nativeModules.NativeTimelineClipboard = {
      copyText: mockCopyTimelineText,
    };
  });

  afterEach(() => {
    jest.useRealTimers();
    nativeModules.NativeTimelineClipboard = originalNativeTimelineClipboard;
  });

  it('renders the redesigned wink timer layout for an active timer', () => {
    const renderer = renderTimerScreen();
    const textContent = getRenderedText(renderer);
    const header = renderer.root.findByProps({testID: 'timer-header'});

    expect(textContent).toContain('STOPWATCH');
    expect(
      header.findByProps({testID: 'timer-title'}).props.children,
    ).toBe('STOPWATCH');
    expect(textContent).not.toContain('WINK STOPWATCH');
    expect(
      header.findByProps({testID: 'timer-title'}).props.style,
    ).toEqual(expect.objectContaining({flex: 1}));
    expect(header.findByProps({testID: 'settings-button'})).toBeTruthy();
    expect(header.findAllByProps({testID: 'exit-button'})).toHaveLength(0);
    expect(textContent).not.toContain('ARCADE GHOST TIMER');
    expect(textContent).toContain('LOOK PAUSE');
    expect(textContent).toContain('01:01.04');
    expect(textContent).not.toContain('RUNNING');
    expect(textContent).not.toContain('MANUAL PAUSE');
    const topTimerText = renderer.root
      .findByProps({testID: 'top-timer-readout'})
      .findAllByType(Text)
      .map(node => flattenText(node.props.children))
      .join(' ');
    expect(topTimerText).toBe('01:01.04');
    const mainContentText = renderer.root
      .findByProps({testID: 'timer-main-content'})
      .findAllByType(Text)
      .map(node => flattenText(node.props.children))
      .join(' ');
    expect(mainContentText).not.toContain('LOOK PAUSE');
    expect(
      renderer.root.findAll(
        node =>
          node.props.accessibilityRole === 'summary' &&
          typeof node.props.accessibilityLabel === 'string' &&
          node.props.accessibilityLabel.includes('LOOK PAUSE'),
      ),
    ).toHaveLength(0);
    expect(textContent).toContain('- 정지 -');
    expect(textContent).not.toContain('DETECTION TEST');
    expect(renderer.root.findByProps({testID: 'ad-slot'})).toBeTruthy();
    expect(
      renderer.root.findByProps({testID: 'mode-selector-bottom'}),
    ).toBeTruthy();
    expect(renderer.root.findAllByType(ScrollView)).toHaveLength(0);
  });

  it('keeps stopwatch and timer controls out of the timer header', () => {
    const renderer = renderTimerScreen();
    const header = renderer.root.findByProps({testID: 'timer-header'});

    expect(header.findByProps({testID: 'settings-button'})).toBeTruthy();
    expect(header.findAllByProps({testID: 'timekeeping-toggle-button'}))
      .toHaveLength(0);
    expect(header.findAllByProps({accessibilityLabel: 'STOPWATCH'}))
      .toHaveLength(0);
    expect(header.findAllByProps({accessibilityLabel: 'TIMER'}))
      .toHaveLength(0);
    expect(header.findAllByProps({accessibilityLabel: 'EXIT'})).toHaveLength(0);
  });

  it('uses the selected timekeeping mode in the top-left title', () => {
    const stopwatchRenderer = renderTimerScreen();

    expect(
      stopwatchRenderer.root.findByProps({testID: 'timer-title'}).props.children,
    ).toBe('STOPWATCH');

    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
    };
    const timerRenderer = renderTimerScreen();

    expect(
      timerRenderer.root.findByProps({testID: 'timer-title'}).props.children,
    ).toBe('TIMER');
  });

  it('expands the bottom mode button into 5-5 timekeeping controls and shows the mode popup', () => {
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Open mode menu'}).props
        .onPress();
    });

    const optionText = renderer.root
      .findByProps({testID: 'timekeeping-mode-options'})
      .findAllByType(Text)
      .map(node => flattenText(node.props.children));
    const stopwatchButton = renderer.root.findByProps({
      testID: 'timekeeping-stopwatch-button',
    });
    const timerButton = renderer.root.findByProps({
      testID: 'timekeeping-timer-button',
    });
    const modeOptions = renderer.root.findByProps({
      testID: 'timekeeping-mode-options',
    });
    const modeMenu = renderer.root.findByProps({testID: 'mode-menu'});
    const modeMenuText = renderer.root
      .findByProps({testID: 'mode-menu'})
      .findAllByType(Text)
      .map(node => flattenText(node.props.children));

    expect(optionText).toEqual(['STOPWATCH', 'TIMER']);
    expect(modeOptions.props.style).toEqual(
      expect.objectContaining({elevation: 70, zIndex: 70}),
    );
    expect(modeMenu.props.style).toEqual(
      expect.objectContaining({elevation: 50, zIndex: 50}),
    );
    expect(renderer.root.findAllByProps({testID: 'timer-main-content'}))
      .toHaveLength(0);
    expect(renderer.root.findAllByProps({testID: 'timekeeping-cancel-button'}))
      .toHaveLength(0);
    expect(getPressedStyleEntries(stopwatchButton)).toContainEqual(
      expect.objectContaining({flex: 5}),
    );
    expect(getPressedStyleEntries(stopwatchButton)).toContainEqual(
      expect.objectContaining({
        backgroundColor: '#1D4D3A',
      }),
    );
    expect(getPressedStyleEntries(stopwatchButton)).not.toContainEqual(
      expect.objectContaining({backgroundColor: '#FFFFFF'}),
    );
    expect(stopwatchButton.findByType(Text).props.style).toContainEqual(
      expect.objectContaining({
        fontSize: 18,
        fontWeight: '900',
        lineHeight: 22,
      }),
    );
    expect(getPressedStyleEntries(timerButton)).toContainEqual(
      expect.objectContaining({flex: 5}),
    );
    expect(getPressedStyleEntries(timerButton)).toContainEqual(
      expect.objectContaining({backgroundColor: '#FFFFFF'}),
    );
    expect(timerButton.findByType(Text).props.style).toContainEqual(
      expect.objectContaining({
        fontSize: 18,
        fontWeight: '900',
        lineHeight: 22,
      }),
    );
    expect(
      modeMenuText.filter(text =>
        [
          'BASIC TIMER',
          'FLIP TIMER',
          'LOOK PAUSE',
          'WINK CONTROL',
          'SMILE MODE',
        ].includes(text),
      ),
    ).toEqual([
      'BASIC TIMER',
      'FLIP TIMER',
      'LOOK PAUSE',
      'WINK CONTROL',
      'SMILE MODE',
    ]);
    expect(modeMenuText).not.toContain('BETA');
  });

  it('keeps the expanded mode list in a larger in-flow scroll area', () => {
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Open mode menu'}).props
        .onPress();
    });

    const modeMenu = renderer.root.findByProps({testID: 'mode-menu'});
    const modeMenuScroll = renderer.root.findByProps({
      testID: 'mode-menu-scroll',
    });
    const modeMenuStyle = StyleSheet.flatten(modeMenu.props.style);
    const modeMenuScrollStyle = StyleSheet.flatten(modeMenuScroll.props.style);

    expect(modeMenu).toBeTruthy();
    expect(modeMenuStyle.position).not.toBe('absolute');
    expect(modeMenuStyle.bottom).toBeUndefined();
    expect(modeMenuScroll.type).toBe(ScrollView);
    expect(modeMenuScroll.props.showsVerticalScrollIndicator).toBe(true);
    expect(modeMenuScrollStyle).toEqual(
      expect.objectContaining({
        maxHeight: expect.any(Number),
      }),
    );
    expect(modeMenuScrollStyle.maxHeight).toBeGreaterThanOrEqual(360);
    expect(modeMenuScrollStyle.maxHeight).toBeLessThanOrEqual(440);
  });

  it('selects Basic Timer from the restored mode popup while keeping it open', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Open mode menu'}).props
        .onPress();
    });

    const basicTimerCard = renderer.root.findByProps({
      accessibilityLabel: 'BASIC TIMER mode',
    });

    expect(basicTimerCard.props.accessibilityState).toEqual({selected: false});

    ReactTestRenderer.act(() => {
      basicTimerCard.props.onPress();
    });

    expect(mockResetTimerSession).toHaveBeenCalledTimes(1);
    expect(mockSetTimerModeId).toHaveBeenCalledWith('basicTimer');
    expect(renderer.root.findByProps({testID: 'mode-menu'})).toBeTruthy();
    expect(renderer.root.findByProps({testID: 'timekeeping-mode-options'}))
      .toBeTruthy();
  });

  it('keeps the timer value and menu open when selecting the current preset mode', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'manualPaused',
        focusDurationMs: 61042,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
      timerModeId: 'lookPause',
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Open mode menu'}).props
        .onPress();
    });

    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({accessibilityLabel: 'LOOK PAUSE mode'})
        .props.onPress();
    });

    expect(mockResetTimerSession).not.toHaveBeenCalled();
    expect(mockSetTimerModeId).not.toHaveBeenCalled();
    expect(renderer.root.findByProps({testID: 'mode-menu'})).toBeTruthy();
    expect(renderer.root.findByProps({testID: 'timekeeping-mode-options'}))
      .toBeTruthy();
  });

  it('switches from stopwatch to timer from the bottom mode controls', () => {
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Open mode menu'}).props
        .onPress();
    });

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({testID: 'timekeeping-timer-button'}).props
        .onPress();
    });

    expect(mockSetTimekeepingMode).toHaveBeenCalledWith('timer');
    expect(renderer.root.findAllByProps({testID: 'mode-menu'}))
      .toHaveLength(0);
    expect(renderer.root.findAllByProps({testID: 'timekeeping-mode-options'}))
      .toHaveLength(0);

    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        isLookPaused: false,
      },
    };

    ReactTestRenderer.act(() => {
      renderer.update(<TimerScreen />);
    });

    expect(renderer.root.findByProps({testID: 'timer-target-popup'}))
      .toBeTruthy();
    expect(renderer.root.findAllByProps({testID: 'mode-menu'}))
      .toHaveLength(0);
    expect(renderer.root.findAllByProps({testID: 'timekeeping-mode-options'}))
      .toHaveLength(0);
  });

  it('switches from timer to stopwatch from the bottom mode controls', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Open mode menu'}).props
        .onPress();
    });

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({testID: 'timekeeping-stopwatch-button'}).props
        .onPress();
    });

    expect(mockSetTimekeepingMode).toHaveBeenCalledWith('stopwatch');
    expect(renderer.root.findAllByProps({testID: 'mode-menu'}))
      .toHaveLength(0);
    expect(renderer.root.findAllByProps({testID: 'timekeeping-mode-options'}))
      .toHaveLength(0);
  });

  it('shows remaining time while the timer function is selected', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 62 * 60 * 1000 + 3000,
      timer: {
        ...baseTimer,
        targetDurationMs: 62 * 60 * 1000 + 3000,
      },
    };
    const renderer = renderTimerScreen();
    const topTimerText = renderer.root
      .findByProps({testID: 'top-timer-readout'})
      .findAllByType(Text)
      .map(node => flattenText(node.props.children))
      .join(' ');

    expect(topTimerText).toBe('1:01:02');
    expect(topTimerText).not.toContain('.');
    expect(renderer.root.findAllByProps({testID: 'timer-target-controls'}))
      .toHaveLength(0);
    expect(renderer.root.findAllByProps({testID: 'timer-target-popup'}))
      .toHaveLength(0);
  });

  it('opens the timer target picker popup from the timer readout while idle', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 62 * 60 * 1000 + 3000,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        targetDurationMs: 62 * 60 * 1000 + 3000,
      },
    };
    const renderer = renderTimerScreen();

    expect(renderer.root.findAllByProps({testID: 'timer-target-controls'}))
      .toHaveLength(0);

    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({accessibilityLabel: 'Open timer target settings'})
        .props.onPress();
    });

    const popupText = renderer.root
      .findByProps({testID: 'timer-target-popup'})
      .findAllByType(Text)
      .map(node => flattenText(node.props.children))
      .join(' ');

    expect(popupText).toContain('01');
    expect(popupText).toContain('02');
    expect(popupText).toContain('03');
    expect(popupText).toContain('HOUR');
    expect(popupText).toContain('MIN');
    expect(popupText).toContain('SEC');
  });

  it('opens the timer target picker popup from the reset time icon', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 62 * 60 * 1000 + 3000,
      timer: {
        ...baseTimer,
        phase: 'ended',
        focusDurationMs: 62 * 60 * 1000 + 3000,
        targetDurationMs: 62 * 60 * 1000 + 3000,
        isLookPaused: false,
      },
    };
    const renderer = renderTimerScreen();
    const resetTimeButton = renderer.root.findByProps({
      testID: 'timer-target-reset-button',
    });
    const resetTimeButtonStyle = StyleSheet.flatten(
      resetTimeButton.props.style({pressed: false}),
    );
    const resetTimeText = resetTimeButton
      .findAllByType(Text)
      .map(node => flattenText(node.props.children));

    expect(resetTimeButton.props.accessibilityLabel).toBe('Reset timer time');
    expect(resetTimeButton.props.disabled).toBe(false);
    expect(resetTimeText).toEqual(['TIME']);
    expect(resetTimeButtonStyle).toEqual(
      expect.objectContaining({
        backgroundColor: '#FFFFFF',
        borderColor: '#C9CBC5',
        borderRadius: 6,
        height: 32,
        left: 0,
        position: 'absolute',
        top: 0,
        width: 72,
      }),
    );
    expect(renderer.root.findAllByProps({testID: 'timer-target-reset-row'}))
      .toHaveLength(0);

    ReactTestRenderer.act(() => {
      resetTimeButton.props.onPress();
    });

    expect(renderer.root.findByProps({testID: 'timer-target-popup'}))
      .toBeTruthy();
  });

  it('keeps the reset time icon on the same top line as the latest timer mark', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerModeId: 'basicTimer',
      timerTargetDurationMs: 60 * 1000,
      timer: {
        ...baseTimer,
        phase: 'ended',
        focusDurationMs: 60 * 1000,
        targetDurationMs: 60 * 1000,
        isLookPaused: false,
      },
      sessionHistory: [
        {
          id: 'LAP-11000',
          type: 'LAP',
          atMs: 11000,
          elapsedMs: 10000,
          deltaMs: 10000,
        },
      ],
    };
    const renderer = renderTimerScreen();
    const resetTimeButtonStyle = StyleSheet.flatten(
      renderer.root
        .findByProps({testID: 'timer-target-reset-button'})
        .props.style({pressed: false}),
    );
    const latestMarkStyle = StyleSheet.flatten(
      renderer.root.findByProps({testID: 'latest-history-record'}).props.style,
    );

    expect(getRenderedText(renderer)).toContain('LAST MARK');
    expect(resetTimeButtonStyle).toEqual(
      expect.objectContaining({
        position: 'absolute',
        top: latestMarkStyle.top,
      }),
    );
    expect(latestMarkStyle).toEqual(
      expect.objectContaining({position: 'absolute', top: 0}),
    );
  });

  it('opens the timer target picker popup while the timer is manually paused', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 62 * 60 * 1000 + 3000,
      timer: {
        ...baseTimer,
        phase: 'manualPaused',
        focusDurationMs: 10 * 1000,
        isLookPaused: false,
        targetDurationMs: 62 * 60 * 1000 + 3000,
      },
    };
    const renderer = renderTimerScreen();
    const targetButton = renderer.root.findByProps({
      accessibilityLabel: 'Open timer target settings',
    });

    expect(targetButton.props.disabled).toBe(false);

    ReactTestRenderer.act(() => {
      targetButton.props.onPress();
    });

    expect(renderer.root.findByProps({testID: 'timer-target-popup'}))
      .toBeTruthy();
  });

  it('renders animated reels for the timer target wheels', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 62 * 60 * 1000 + 3000,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        targetDurationMs: 62 * 60 * 1000 + 3000,
      },
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({accessibilityLabel: 'Open timer target settings'})
        .props.onPress();
    });

    expect(renderer.root.findByProps({testID: 'timer-target-hour-reel'}))
      .toBeTruthy();
    expect(renderer.root.findByProps({testID: 'timer-target-minute-reel'}))
      .toBeTruthy();
    expect(renderer.root.findByProps({testID: 'timer-target-second-reel'}))
      .toBeTruthy();
  });

  it('shows the three most recent timer targets in the picker and applies a selected target', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 60 * 1000,
      recentTimerTargetDurationsMs: [
        5 * 60 * 1000,
        10 * 60 * 1000,
        90 * 1000,
        30 * 1000,
      ],
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        targetDurationMs: 60 * 1000,
      },
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({accessibilityLabel: 'Open timer target settings'})
        .props.onPress();
    });

    const recentButtons = renderer.root.findAll(
      node =>
        node.props.testID === 'timer-target-recent-button' &&
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    );
    const recentLabels = recentButtons.map(button =>
      flattenText(button.findAllByType(Text)[0].props.children),
    );

    expect(renderer.root.findByProps({testID: 'timer-target-recent-section'}))
      .toBeTruthy();
    expect(recentLabels).toEqual(['05:00', '10:00', '01:30']);
    expect(getRenderedText(renderer)).not.toContain('00:30');
    expect(mockSetTimerTargetDurationMs).not.toHaveBeenCalled();

    ReactTestRenderer.act(() => {
      recentButtons[1].props.onPress();
    });

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({testID: 'timer-target-done-button'}).props
        .onPress();
    });

    expect(mockSetTimerTargetDurationMs).toHaveBeenCalledWith(10 * 60 * 1000);
    expect(mockSetTimerTargetDurationMs).toHaveBeenCalledTimes(1);
  });

  it('shows default recent timer targets when no recent targets are stored', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 60 * 1000,
      recentTimerTargetDurationsMs: [],
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        targetDurationMs: 60 * 1000,
      },
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({accessibilityLabel: 'Open timer target settings'})
        .props.onPress();
    });

    const recentButtons = renderer.root.findAll(
      node =>
        node.props.testID === 'timer-target-recent-button' &&
        node.props.accessibilityRole === 'button' &&
        typeof node.props.onPress === 'function',
    );

    expect(renderer.root.findByProps({testID: 'timer-target-recent-section'}))
      .toBeTruthy();
    expect(recentButtons.map(button =>
      flattenText(button.findAllByType(Text)[0].props.children),
    )).toEqual(['00:30', '01:00', '10:00']);
  });

  it('drafts timer target wheel changes and applies them only after Done', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 62 * 60 * 1000 + 3000,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        targetDurationMs: 62 * 60 * 1000 + 3000,
      },
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({accessibilityLabel: 'Open timer target settings'})
        .props.onPress();
    });

    expect(mockSetTimerTargetDurationMs).not.toHaveBeenCalled();

    ReactTestRenderer.act(() => {
      const minuteWheel = renderer.root.findByProps({
        testID: 'timer-target-minute-wheel',
      });

      minuteWheel.props.onResponderGrant({nativeEvent: {pageY: 100}});
      minuteWheel.props.onResponderRelease({nativeEvent: {pageY: 60}});
    });

    ReactTestRenderer.act(() => {
      const secondWheel = renderer.root.findByProps({
        testID: 'timer-target-second-wheel',
      });

      secondWheel.props.onResponderGrant({nativeEvent: {pageY: 100}});
      secondWheel.props.onResponderRelease({nativeEvent: {pageY: 140}});
    });

    expect(mockSetTimerTargetDurationMs).not.toHaveBeenCalled();
    expect(
      renderer.root
        .findByProps({testID: 'top-timer-readout'})
        .findAllByType(Text)
        .map(node => flattenText(node.props.children))
        .join(' '),
    ).toBe('1:02:03');

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({testID: 'timer-target-done-button'}).props
        .onPress();
    });

    expect(mockSetTimerTargetDurationMs).toHaveBeenCalledWith(
      64 * 60 * 1000 + 1000,
    );
    expect(mockSetTimerTargetDurationMs).toHaveBeenCalledTimes(1);
  });

  it('closes the timer target popup without applying draft changes from the X button', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 62 * 60 * 1000 + 3000,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        targetDurationMs: 62 * 60 * 1000 + 3000,
      },
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({accessibilityLabel: 'Open timer target settings'})
        .props.onPress();
    });

    ReactTestRenderer.act(() => {
      const minuteWheel = renderer.root.findByProps({
        testID: 'timer-target-minute-wheel',
      });

      minuteWheel.props.onResponderGrant({nativeEvent: {pageY: 100}});
      minuteWheel.props.onResponderRelease({nativeEvent: {pageY: 60}});
    });

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({testID: 'timer-target-cancel-button'}).props
        .onPress();
    });

    expect(mockSetTimerTargetDurationMs).not.toHaveBeenCalled();
    expect(renderer.root.findAllByProps({testID: 'timer-target-popup'}))
      .toHaveLength(0);
  });

  it('keeps Set Timer centered with a dedicated X cancel button', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 62 * 60 * 1000 + 3000,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        targetDurationMs: 62 * 60 * 1000 + 3000,
      },
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({accessibilityLabel: 'Open timer target settings'})
        .props.onPress();
    });

    expect(
      renderer.root.findByProps({testID: 'timer-target-popup-title'}).props
        .style,
    ).toEqual(expect.objectContaining({textAlign: 'center'}));
    expect(renderer.root.findByProps({testID: 'timer-target-cancel-button'}))
      .toBeTruthy();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({testID: 'timer-target-done-button'}).props
        .onPress();
    });

    expect(mockSetTimerTargetDurationMs).not.toHaveBeenCalled();
    expect(renderer.root.findAllByProps({testID: 'timer-target-popup'}))
      .toHaveLength(0);
  });

  it('adjusts the timer target while the wheel is still moving with relaxed sensitivity', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 62 * 60 * 1000 + 3000,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        targetDurationMs: 62 * 60 * 1000 + 3000,
      },
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({accessibilityLabel: 'Open timer target settings'})
        .props.onPress();
    });

    ReactTestRenderer.act(() => {
      const minuteWheel = renderer.root.findByProps({
        testID: 'timer-target-minute-wheel',
      });

      minuteWheel.props.onResponderGrant({nativeEvent: {pageY: 100}});
      minuteWheel.props.onResponderMove({nativeEvent: {pageY: 28}});
    });

    expect(mockSetTimerTargetDurationMs).not.toHaveBeenCalled();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({testID: 'timer-target-done-button'}).props
        .onPress();
    });

    expect(mockSetTimerTargetDurationMs).toHaveBeenCalledWith(
      65 * 60 * 1000 + 3000,
    );
  });

  it('ignores small timer target wheel drags below the activation distance', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 62 * 60 * 1000 + 3000,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        targetDurationMs: 62 * 60 * 1000 + 3000,
      },
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({accessibilityLabel: 'Open timer target settings'})
        .props.onPress();
    });

    ReactTestRenderer.act(() => {
      const minuteWheel = renderer.root.findByProps({
        testID: 'timer-target-minute-wheel',
      });

      minuteWheel.props.onResponderGrant({nativeEvent: {pageY: 100}});
      minuteWheel.props.onResponderRelease({nativeEvent: {pageY: 87}});
    });

    expect(mockSetTimerTargetDurationMs).not.toHaveBeenCalled();
  });

  it('does not continue changing the timer target after release', () => {
    jest.useFakeTimers();
    try {
      mockState = {
        ...baseState,
        timekeepingMode: 'timer',
        timerTargetDurationMs: 62 * 60 * 1000 + 3000,
        timer: {
          ...baseTimer,
          phase: 'idle',
          startedAtMs: null,
          focusDurationMs: 0,
          targetDurationMs: 62 * 60 * 1000 + 3000,
        },
      };
      const renderer = renderTimerScreen();

      ReactTestRenderer.act(() => {
        renderer.root
          .findByProps({accessibilityLabel: 'Open timer target settings'})
          .props.onPress();
      });

      ReactTestRenderer.act(() => {
        const minuteWheel = renderer.root.findByProps({
          testID: 'timer-target-minute-wheel',
        });

        minuteWheel.props.onResponderGrant({
          nativeEvent: {pageY: 160, timestamp: 0},
        });
        minuteWheel.props.onResponderMove({
          nativeEvent: {pageY: 124, timestamp: 40},
        });
        minuteWheel.props.onResponderRelease({
          nativeEvent: {pageY: 96, timestamp: 70},
        });
      });

      ReactTestRenderer.act(() => {
        jest.advanceTimersByTime(500);
      });

      expect(mockSetTimerTargetDurationMs).not.toHaveBeenCalled();

      ReactTestRenderer.act(() => {
        renderer.root.findByProps({testID: 'timer-target-done-button'}).props
          .onPress();
      });

      expect(mockSetTimerTargetDurationMs).toHaveBeenCalledWith(
        65 * 60 * 1000 + 3000,
      );
      expect(mockSetTimerTargetDurationMs).toHaveBeenCalledTimes(1);
    } finally {
      jest.useRealTimers();
    }
  });

  it('does not update a bounded wheel when a drag cannot change the value', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 99 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59000,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        targetDurationMs: 99 * 60 * 60 * 1000 + 59 * 60 * 1000 + 59000,
      },
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({accessibilityLabel: 'Open timer target settings'})
        .props.onPress();
    });

    ReactTestRenderer.act(() => {
      const hourWheel = renderer.root.findByProps({
        testID: 'timer-target-hour-wheel',
      });

      hourWheel.props.onResponderGrant({nativeEvent: {pageY: 120}});
      hourWheel.props.onResponderRelease({nativeEvent: {pageY: 60}});
    });

    expect(mockSetTimerTargetDurationMs).not.toHaveBeenCalled();
  });

  it('does not open the timer target popup while the timer is active', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 5 * 60 * 1000,
      timer: {
        ...baseTimer,
        targetDurationMs: 5 * 60 * 1000,
      },
    };
    const renderer = renderTimerScreen();
    const targetButton = renderer.root.findByProps({
      accessibilityLabel: 'Open timer target settings',
    });

    expect(targetButton.props.disabled).toBe(true);
    expect(targetButton.props.onPress).toBeUndefined();
    expect(renderer.root.findAllByProps({testID: 'timer-target-popup'}))
      .toHaveLength(0);
    expect(mockSetTimerTargetDurationMs).not.toHaveBeenCalled();
  });

  it('shows reset, pause, and timeline action buttons with gestures', () => {
    const renderer = renderTimerScreen();
    const textContent = getRenderedText(renderer);

    expect(textContent).toContain('RESET');
    expect(textContent).not.toContain('Left Wink');
    expect(textContent).toContain('PAUSE');
    expect(textContent).toContain('Look');
    expect(textContent).toContain('TIMELINE');
    expect(textContent).toContain('Button');
  });

  it('shows the stopped status immediately when look-pause detects looking', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        detectionStatus: 'looking',
        isLookPaused: false,
      },
      timerModeId: 'lookPause',
    };
    const renderer = renderTimerScreen();

    expect(
      renderer.root.findByProps({testID: 'timer-status-label'}).props.children,
    ).toBe('- \uC815\uC9C0 -');
  });

  it('shows wink unavailable as a separate small helper while keeping status stable', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        detectionStatus: 'looking',
        eyeState: 'unknown',
        isLookPaused: false,
      },
      timerModeId: 'winkControl',
    };
    const renderer = renderTimerScreen();
    const statusLabel = renderer.root.findByProps({
      testID: 'timer-status-label',
    });
    const winkUnavailableLabel = renderer.root.findByProps({
      testID: 'timer-wink-unavailable-label',
    });

    expect(statusLabel.props.children).toBe('- \uCE21\uC815\uC911 -');
    expect(winkUnavailableLabel.props.children).toBe(
      '윙크 판정 불가능 상태.',
    );
    expect(
      StyleSheet.flatten(winkUnavailableLabel.props.style).fontSize,
    ).toBeLessThan(StyleSheet.flatten(statusLabel.props.style).fontSize);
    expect(StyleSheet.flatten(winkUnavailableLabel.props.style).color).toBe(
      '#B42318',
    );
  });

  it('shows a green wink-ready helper when wink control can judge a wink', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        detectionStatus: 'looking',
        eyeState: 'bothOpen',
        isLookPaused: false,
      },
      timerModeId: 'winkControl',
    };
    const renderer = renderTimerScreen();
    const winkReadyLabel = renderer.root.findByProps({
      testID: 'timer-wink-unavailable-label',
    });

    expect(winkReadyLabel.props.children).toBe(
      '눈을 크게 뜬상태에서 윙크하세요',
    );
    expect(StyleSheet.flatten(winkReadyLabel.props.style).color).toBe(
      '#18794E',
    );
    expect(StyleSheet.flatten(winkReadyLabel.props.style).opacity).toBe(1);
  });

  it('places the wink helper under the timer readout instead of the main content', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        detectionStatus: 'looking',
        eyeState: 'bothOpen',
        isLookPaused: false,
      },
      timerModeId: 'winkControl',
    };
    const renderer = renderTimerScreen();
    const topTimerReadout = renderer.root.findByProps({
      testID: 'top-timer-readout',
    });
    const mainContent = renderer.root.findByProps({
      testID: 'timer-main-content',
    });

    expect(
      topTimerReadout.findAllByProps({
        testID: 'timer-wink-unavailable-label',
      }).length,
    ).toBeGreaterThan(0);
    expect(
      mainContent.findAllByProps({
        testID: 'timer-wink-unavailable-label',
      }),
    ).toHaveLength(0);
  });

  it.each([
    ['notLooking', 'unknown'],
    ['unknown', 'unknown'],
    ['looking', 'bothClosed'],
  ] as const)(
    'shows wink unavailable when wink control cannot judge %s/%s',
    (detectionStatus, eyeState) => {
      mockState = {
        ...baseState,
        timer: {
          ...baseTimer,
          detectionStatus,
          eyeState,
          isLookPaused: false,
        },
        timerModeId: 'winkControl',
      };
      const renderer = renderTimerScreen();
      const winkUnavailableLabel = renderer.root.findByProps({
        testID: 'timer-wink-unavailable-label',
      });

      expect(winkUnavailableLabel.props.children).toBe(
        '윙크 판정 불가능 상태.',
      );
    },
  );

  it('debounces the wink unavailable helper so brief eye-state noise does not flicker', () => {
    jest.useFakeTimers();
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        detectionStatus: 'looking',
        eyeState: 'bothOpen',
        isLookPaused: false,
      },
      timerModeId: 'winkControl',
    };
    const renderer = renderTimerScreen();

    const getHintLabel = () =>
      renderer.root.findByProps({testID: 'timer-wink-unavailable-label'});
    const getHintStyle = () =>
      StyleSheet.flatten(
        getHintLabel().props.style,
      );

    expect(getHintLabel().props.children).toBe(
      '눈을 크게 뜬상태에서 윙크하세요',
    );
    expect(getHintStyle().color).toBe('#18794E');
    expect(getHintStyle().opacity).toBe(1);

    mockState = {
      ...mockState,
      timer: {
        ...mockState.timer,
        eyeState: 'unknown',
      },
    };
    ReactTestRenderer.act(() => {
      renderer.update(<TimerScreen />);
    });

    ReactTestRenderer.act(() => {
      jest.advanceTimersByTime(249);
    });
    expect(getHintLabel().props.children).toBe(
      '눈을 크게 뜬상태에서 윙크하세요',
    );
    expect(getHintStyle().color).toBe('#18794E');

    ReactTestRenderer.act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(getHintLabel().props.children).toBe(
      '윙크 판정 불가능 상태.',
    );
    expect(getHintStyle().color).toBe('#B42318');

    mockState = {
      ...mockState,
      timer: {
        ...mockState.timer,
        eyeState: 'bothOpen',
      },
    };
    ReactTestRenderer.act(() => {
      renderer.update(<TimerScreen />);
    });

    ReactTestRenderer.act(() => {
      jest.advanceTimersByTime(799);
    });
    expect(getHintLabel().props.children).toBe(
      '윙크 판정 불가능 상태.',
    );
    expect(getHintStyle().color).toBe('#B42318');

    ReactTestRenderer.act(() => {
      jest.advanceTimersByTime(1);
    });
    expect(getHintLabel().props.children).toBe(
      '눈을 크게 뜬상태에서 윙크하세요',
    );
    expect(getHintStyle().color).toBe('#18794E');
  });

  it('enables reset and timeline while look-pause is stopped by looking', () => {
    const renderer = renderTimerScreen();

    expect(
      renderer.root.findByProps({accessibilityLabel: 'RESET Button'}).props
        .disabled,
    ).toBe(false);
    expect(
      renderer.root.findByProps({accessibilityLabel: 'TIMELINE Button'}).props
        .disabled,
    ).toBe(false);
  });

  it('enables reset and timeline as soon as look-pause visually enters stopped state', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        detectionStatus: 'looking',
        isLookPaused: false,
      },
      timerModeId: 'lookPause',
    };
    const renderer = renderTimerScreen();

    expect(
      renderer.root.findByProps({accessibilityLabel: 'RESET Button'}).props
        .disabled,
    ).toBe(false);
    expect(
      renderer.root.findByProps({accessibilityLabel: 'TIMELINE Button'}).props
        .disabled,
    ).toBe(false);
  });

  it('keeps reset disabled while Look Pause is actively running', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
    };
    const renderer = renderTimerScreen();

    expect(
      renderer.root.findByProps({accessibilityLabel: 'RESET Button'}).props
        .disabled,
    ).toBe(true);
    expect(renderer.root.findAllByProps({accessibilityLabel: 'LAP Button'}))
      .toHaveLength(0);
    expect(
      renderer.root.findByProps({accessibilityLabel: 'TIMELINE Button'}).props
        .disabled,
    ).toBe(false);
  });

  it('turns reset into an enabled lap button while the timer is recording focus', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
      timerModeId: 'basicTimer',
    };
    const renderer = renderTimerScreen();
    const lapButton = renderer.root.findByProps({
      accessibilityLabel: 'LAP Button',
    });

    expect(renderer.root.findAllByProps({accessibilityLabel: 'RESET Button'}))
      .toHaveLength(0);
    expect(lapButton.props.disabled).toBe(false);
    expect(getPressedStyleEntries(lapButton)).toContainEqual(
      expect.objectContaining({transform: [{scale: 0.96}]}),
    );

    ReactTestRenderer.act(() => {
      lapButton.props.onPress();
    });

    expect(mockRecordLapSession).toHaveBeenCalledTimes(1);
  });

  it('uses mark labeling for lap records while the timer function is selected', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 60 * 1000,
      timerModeId: 'basicTimer',
      timer: {
        ...baseTimer,
        detectionStatus: 'notLooking',
        isLookPaused: false,
        targetDurationMs: 60 * 1000,
      },
      sessionHistory: [
        {
          id: 'LAP-11000',
          type: 'LAP',
          atMs: 11000,
          elapsedMs: 10000,
          deltaMs: 10000,
        },
      ],
    };
    const renderer = renderTimerScreen();
    const markButton = renderer.root.findByProps({
      accessibilityLabel: 'MARK Button',
    });
    const latestMarkText = renderer.root
      .findByProps({testID: 'latest-history-record'})
      .findAllByType(Text)
      .map(node => flattenText(node.props.children))
      .join(' ');

    expect(renderer.root.findAllByProps({accessibilityLabel: 'LAP Button'}))
      .toHaveLength(0);
    expect(markButton.props.disabled).toBe(false);
    expect(latestMarkText).toContain('LAST MARK');
    expect(latestMarkText).toContain('E 00:10.00');
    expect(latestMarkText).toContain('L 00:50.00');

    ReactTestRenderer.act(() => {
      markButton.props.onPress();
    });

    expect(mockRecordLapSession).toHaveBeenCalledTimes(1);
  });

  it('shows the latest lap in the upper-right timer content area', () => {
    mockState = {
      ...baseState,
      timerModeId: 'basicTimer',
      sessionHistory: [
        {id: 'START-1000', type: 'START', atMs: 1000, elapsedMs: 0, deltaMs: 0},
        {
          id: 'LAP-6000',
          type: 'LAP',
          atMs: 6000,
          elapsedMs: 5000,
          deltaMs: 5000,
        },
        {
          id: 'LAP-9500',
          type: 'LAP',
          atMs: 9500,
          elapsedMs: 8500,
          deltaMs: 3500,
        },
      ],
    };
    const renderer = renderTimerScreen();
    const latestLapText = renderer.root
      .findByProps({testID: 'latest-history-record'})
      .findAllByType(Text)
      .map(node => flattenText(node.props.children))
      .join(' ');

    expect(latestLapText).toContain('LAST LAP');
    expect(latestLapText).toContain('00:08.50');
  });

  it('enables reset and timeline while the timer is manually paused', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'manualPaused',
        isLookPaused: false,
      },
    };
    const renderer = renderTimerScreen();

    expect(
      renderer.root.findByProps({accessibilityLabel: 'RESET Button'}).props
        .disabled,
    ).toBe(false);
    expect(
      renderer.root.findByProps({accessibilityLabel: 'TIMELINE Button'}).props
        .disabled,
    ).toBe(false);
    expect(
      renderer.root.findByProps({testID: 'timer-status-label'}).props.children,
    ).toBe('- \uC815\uC9C0 -');
  });

  it('allows gesture-start modes to be controlled by button taps too', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        isLookPaused: false,
      },
      timerModeId: 'winkControl',
    };
    const renderer = renderTimerScreen();
    const startButton = renderer.root.findByProps({
      accessibilityLabel: 'START Right Wink',
    });

    expect(startButton.props.disabled).toBe(false);
    ReactTestRenderer.act(() => {
      startButton.props.onPress();
    });

    expect(mockStartTimerSession).toHaveBeenCalledTimes(1);
  });

  it('shows pressed feedback for gesture-assigned active buttons', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        isLookPaused: false,
      },
      timerModeId: 'winkControl',
    };
    const renderer = renderTimerScreen();
    const startButton = renderer.root.findByProps({
      accessibilityLabel: 'START Right Wink',
    });

    expect(getPressedStyleEntries(startButton)).toContainEqual(
      expect.objectContaining({opacity: 0.82}),
    );
  });

  it('shows Look Pause start as button and look-away while keeping the button fallback', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        isLookPaused: false,
      },
      timerModeId: 'lookPause',
    };
    const renderer = renderTimerScreen();
    const startButton = renderer.root.findByProps({
      accessibilityLabel: 'START Look Away',
    });

    expect(startButton.props.disabled).toBe(false);
    ReactTestRenderer.act(() => {
      startButton.props.onPress();
    });

    expect(mockStartTimerSession).toHaveBeenCalledTimes(1);
  });

  it('hides the start button while the timekeeping mode controls are open', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        isLookPaused: false,
      },
      timerModeId: 'lookPause',
    };
    const renderer = renderTimerScreen();
    const modeButton = renderer.root.findByProps({
      accessibilityLabel: 'Open mode menu',
    });

    ReactTestRenderer.act(() => {
      modeButton.props.onPress();
    });

    expect(renderer.root.findAllByProps({
      accessibilityLabel: 'START Look Away',
    })).toHaveLength(0);
    expect(renderer.root.findAllByProps({testID: 'timer-main-content'}))
      .toHaveLength(0);
  });

  it('blocks gesture inputs while the timekeeping mode controls are open', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        isLookPaused: false,
      },
      timerModeId: 'winkControl',
    };
    const renderer = renderTimerScreen();
    const modeButton = renderer.root.findByProps({
      accessibilityLabel: 'Open mode menu',
    });

    expect(mockSetGestureInputsBlocked).toHaveBeenLastCalledWith(false);

    ReactTestRenderer.act(() => {
      modeButton.props.onPress();
    });

    expect(mockSetGestureInputsBlocked).toHaveBeenLastCalledWith(true);

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({testID: 'timekeeping-stopwatch-button'}).props
        .onPress();
    });

    expect(mockSetGestureInputsBlocked).toHaveBeenLastCalledWith(false);
  });

  it('keeps gesture inputs enabled while the timeline overlay is open', () => {
    const renderer = renderTimerScreen();

    expect(mockSetGestureInputsBlocked).toHaveBeenLastCalledWith(false);

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'TIMELINE Button'}).props
        .onPress();
    });

    expect(mockSetGestureInputsBlocked).toHaveBeenLastCalledWith(false);

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'TIMELINE Button'}).props
        .onPress();
    });

    expect(mockSetGestureInputsBlocked).toHaveBeenLastCalledWith(false);
  });

  it('shows pressed feedback for button-assigned actions', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        isLookPaused: false,
      },
      timerModeId: 'lookPause',
    };
    const renderer = renderTimerScreen();
    const startButton = renderer.root.findByProps({
      accessibilityLabel: 'START Look Away',
    });

    expect(getPressedStyleEntries(startButton)).toContainEqual(
      expect.objectContaining({opacity: 0.82}),
    );
  });

  it('allows gesture-resume modes to be controlled by button taps too', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'manualPaused',
        isLookPaused: false,
      },
      timerModeId: 'winkControl',
    };
    const renderer = renderTimerScreen();
    const resumeButton = renderer.root.findByProps({
      accessibilityLabel: 'RESUME Right Wink',
    });

    expect(resumeButton.props.disabled).toBe(false);
    ReactTestRenderer.act(() => {
      resumeButton.props.onPress();
    });

    expect(mockResumeTimerSession).toHaveBeenCalledTimes(1);
  });

  it('disables the resume button while Flip Timer is manually paused', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'manualPaused',
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
      timerModeId: 'flipTimer',
    };
    const renderer = renderTimerScreen();
    const resumeButton = renderer.root.findByProps({
      accessibilityLabel: 'RESUME Flip Down',
    });

    expect(resumeButton.props.disabled).toBe(true);
    expect(resumeButton.props.onPress).toBeUndefined();
  });

  it('connects look-pause reset because its gesture is Button', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'manualPaused',
        isLookPaused: false,
      },
    };
    const renderer = renderTimerScreen();
    const resetButton = renderer.root.findByProps({
      accessibilityLabel: 'RESET Button',
    });

    expect(resetButton.props.disabled).toBe(false);
    ReactTestRenderer.act(() => {
      resetButton.props.onPress();
    });

    expect(mockResetTimerSession).toHaveBeenCalledTimes(1);
  });

  it('shows the looking ghost when the user is look paused with both eyes open', () => {
    const renderer = renderTimerScreen();

    expect(
      renderer.root.findByProps({
        accessibilityRole: 'image',
        accessibilityLabel: 'Ghost looking shy',
      }),
    ).toBeTruthy();
  });

  it('shows the running mascot while Basic Timer is active', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        detectionStatus: 'unknown',
        isLookPaused: false,
      },
      timerModeId: 'basicTimer',
    };
    const renderer = renderTimerScreen();

    expect(
      renderer.root.findByProps({
        accessibilityRole: 'image',
        accessibilityLabel: 'Ghost running',
      }),
    ).toBeTruthy();
  });

  it('keeps Wink Control neutral between recognized wink gestures', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        detectionStatus: 'looking',
        isLookPaused: false,
        recentWinkSide: null,
      },
      timerModeId: 'winkControl',
    };
    const renderer = renderTimerScreen();

    expect(
      renderer.root.findByProps({
        accessibilityRole: 'image',
        accessibilityLabel: 'Ghost ready',
      }),
    ).toBeTruthy();
  });

  it('keeps the shy looking ghost while one eye is merely held closed', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        eyeState: 'oneEyeClosed',
        winkSide: 'left',
        oneEyeClosedStartedAtMs: 60000,
      },
    };

    const renderer = renderTimerScreen();

    expect(
      renderer.root.findByProps({
        accessibilityRole: 'image',
        accessibilityLabel: 'Ghost looking shy',
      }),
    ).toBeTruthy();
  });

  it('shows the user-facing right wink ghost only after an internal left wink is recognized', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        recentWinkSide: 'left',
        recentWinkAtMs: 62000,
      },
    };

    const renderer = renderTimerScreen();

    expect(
      renderer.root.findByProps({
        accessibilityRole: 'image',
        accessibilityLabel: 'Ghost right wink',
      }),
    ).toBeTruthy();
  });

  it('enables the mode selector while the timer is stopped by looking', () => {
    const renderer = renderTimerScreen();
    const modeButton = renderer.root.findByProps({
      accessibilityLabel: 'Open mode menu',
    });

    expect(modeButton.props.disabled).toBe(false);
    expect(typeof modeButton.props.onPress).toBe('function');
    expect(modeButton.props.accessibilityState).toEqual(
      expect.objectContaining({disabled: false, expanded: false}),
    );
    expect(getPressedStyleEntries(modeButton)).toContainEqual(
      expect.objectContaining({opacity: 0.82}),
    );

    ReactTestRenderer.act(() => {
      modeButton.props.onPress();
    });

    expect(renderer.root.findAllByProps({testID: 'timekeeping-mode-options'}).length)
      .toBeGreaterThan(0);
  });

  it('disables the mode selector while the timer is actively running', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
    };
    const renderer = renderTimerScreen();
    const modeButton = renderer.root.findByProps({
      accessibilityLabel: 'Open mode menu',
    });

    expect(modeButton.props.disabled).toBe(true);
    expect(modeButton.props.onPress).toBeUndefined();
    expect(renderer.root.findAllByProps({testID: 'timekeeping-mode-options'}))
      .toHaveLength(0);
  });

  it('enables the mode selector after a timer alarm has ended', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timer: {
        ...baseTimer,
        phase: 'ended',
        focusDurationMs: 5 * 60 * 1000,
        targetDurationMs: 5 * 60 * 1000,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
      isTimerAlertActive: false,
    };
    const renderer = renderTimerScreen();
    const modeButton = renderer.root.findByProps({
      accessibilityLabel: 'Open mode menu',
    });

    expect(modeButton.props.disabled).toBe(false);

    ReactTestRenderer.act(() => {
      modeButton.props.onPress();
    });

    expect(renderer.root.findByProps({testID: 'mode-menu'})).toBeTruthy();
    expect(renderer.root.findByProps({testID: 'timekeeping-mode-options'}))
      .toBeTruthy();

    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({accessibilityLabel: 'BASIC TIMER mode'})
        .props.onPress();
    });

    expect(mockResetTimerSession).toHaveBeenCalledTimes(1);
    expect(mockSetTimerModeId).toHaveBeenCalledWith('basicTimer');
  });

  it('shows preset mode cards alongside the timekeeping selector', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Open mode menu'}).props.onPress();
    });

    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'BASIC TIMER mode',
      }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'LOOK PAUSE mode',
      }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'WINK CONTROL mode',
      }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'SMILE MODE mode',
      }).length,
    ).toBeGreaterThan(0);
    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'FLIP TIMER mode',
      }).length,
    ).toBeGreaterThan(0);
    expect(mockSetTimerModeId).not.toHaveBeenCalled();
  });

  it('renders compact preset mode summaries with a stable active dot', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
      timerModeId: 'winkControl',
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Open mode menu'}).props.onPress();
    });

    const modeMenuText = renderer.root
      .findByProps({testID: 'mode-menu'})
      .findAllByType(Text)
      .map(node => flattenText(node.props.children))
      .join(' ');

    expect(modeMenuText).toContain(
      'START/PAUSE/RESUME Right Wink · RESET/LAP Left Wink',
    );
    expect(modeMenuText).toContain('START/PAUSE/RESUME/RESET/LAP Button');
    expect(modeMenuText).not.toContain('Right wink toggles the timer');
    expect(modeMenuText).not.toContain('Button-only timer without camera detection');
    expect(modeMenuText).not.toContain('ACTIVE');
    expect(
      renderer.root.findAllByProps({testID: 'active-mode-indicator'}).length,
    ).toBeGreaterThanOrEqual(1);
    expect(
      renderer.root.findAllByProps({testID: 'inactive-mode-indicator'}).length,
    ).toBeGreaterThanOrEqual(4);
  });

  it('does not show camera preparation text on the timer screen', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        detectionStatus: 'looking',
        isLookPaused: false,
      },
      timerModeId: 'basicTimer',
    };
    const basicRenderer = renderTimerScreen();

    expect(basicRenderer.root.findAllByProps({
      testID: 'timer-camera-preparing-label',
    })).toHaveLength(0);

    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        detectionStatus: 'unknown',
        isLookPaused: false,
      },
      timerModeId: 'lookPause',
    };
    const renderer = renderTimerScreen();

    expect(renderer.root.findAllByProps({
      testID: 'timer-camera-preparing-label',
    })).toHaveLength(0);
    expect(getRenderedText(renderer)).not.toContain('준비중 입니다.');
  });

  it('does not show camera preparation text in the mode menu', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        detectionStatus: 'unknown',
        isLookPaused: false,
      },
      timerModeId: 'winkControl',
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Open mode menu'}).props.onPress();
    });

    const modeMenuText = renderer.root
      .findByProps({testID: 'mode-menu'})
      .findAllByType(Text)
      .map(node => flattenText(node.props.children))
      .join(' ');

    expect(modeMenuText).not.toContain('준비중 입니다.');
    expect(renderer.root.findAllByProps({
      testID: 'timer-camera-preparing-label',
    })).toHaveLength(0);
  });

  it('keeps the timer value when selecting the current timekeeping mode', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'manualPaused',
        focusDurationMs: 61042,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
      timerModeId: 'lookPause',
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Open mode menu'}).props.onPress();
    });

    ReactTestRenderer.act(() => {
      renderer.root
        .findByProps({testID: 'timekeeping-stopwatch-button'})
        .props.onPress();
    });

    expect(mockResetTimerSession).not.toHaveBeenCalled();
    expect(mockSetTimerModeId).not.toHaveBeenCalled();
    expect(mockSetTimekeepingMode).not.toHaveBeenCalled();
    expect(renderer.root.findAllByProps({testID: 'timekeeping-mode-options'}))
      .toHaveLength(0);
  });

  it('does not render a cancel button in the timekeeping selector', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'manualPaused',
        focusDurationMs: 61042,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
      timerModeId: 'lookPause',
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Open mode menu'}).props.onPress();
    });

    expect(mockResetTimerSession).not.toHaveBeenCalled();
    expect(mockSetTimerModeId).not.toHaveBeenCalled();
    expect(mockSetTimekeepingMode).not.toHaveBeenCalled();
    expect(renderer.root.findAllByProps({testID: 'timekeeping-cancel-button'}))
      .toHaveLength(0);
    expect(renderer.root.findAllByProps({accessibilityLabel: 'Close mode menu'}))
      .toHaveLength(0);
  });

  it('renders the restored preset mode menu above the timekeeping controls', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'manualPaused',
        focusDurationMs: 61042,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
      timerModeId: 'lookPause',
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Open mode menu'}).props.onPress();
    });

    expect(renderer.root.findByProps({testID: 'mode-menu'})).toBeTruthy();
    expect(renderer.root.findByProps({testID: 'timekeeping-mode-options'}))
      .toBeTruthy();
  });

  it('marks the selected timekeeping mode in the bottom controls', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Open mode menu'}).props.onPress();
    });

    expect(
      renderer.root.findByProps({testID: 'timekeeping-timer-button'}).props
        .accessibilityState,
    ).toEqual({selected: true});
    expect(
      renderer.root.findByProps({testID: 'timekeeping-stopwatch-button'}).props
        .accessibilityState,
    ).toEqual({selected: false});
    expect(
      getPressedStyleEntries(
        renderer.root.findByProps({testID: 'timekeeping-timer-button'}),
      ),
    ).toContainEqual(expect.objectContaining({backgroundColor: '#1D4D3A'}));
    expect(
      getPressedStyleEntries(
        renderer.root.findByProps({testID: 'timekeeping-stopwatch-button'}),
      ),
    ).toContainEqual(expect.objectContaining({backgroundColor: '#FFFFFF'}));
  });

  it('toggles the current mode timeline overlay from the bottom Timeline button', () => {
    mockState = {
      ...baseState,
      timerModeId: 'basicTimer',
      sessionHistory: [
        {id: 'START-1000', type: 'START', atMs: 1000, elapsedMs: 0, deltaMs: 0},
        {
          id: 'LAP-6000',
          type: 'LAP',
          atMs: 6000,
          elapsedMs: 5000,
          deltaMs: 5000,
        },
        {
          id: 'LAP-8000',
          type: 'LAP',
          atMs: 8000,
          elapsedMs: 7000,
          deltaMs: 2000,
        },
        {
          id: 'STOP-7000',
          type: 'STOP',
          atMs: 7000,
          elapsedMs: 5000,
          deltaMs: 0,
        },
      ],
    };
    const renderer = renderTimerScreen();

    expect(renderer.root.findAllByProps({testID: 'session-history-overlay'}))
      .toHaveLength(0);

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'TIMELINE Button'}).props
        .onPress();
    });

    const historyButton = renderer.root.findByProps({
      accessibilityLabel: 'TIMELINE Button',
    });
    const overlay = renderer.root.findByProps({
      testID: 'session-history-overlay',
    });
    const overlayText = overlay
      .findAllByType(Text)
      .map(node => flattenText(node.props.children))
      .join(' ');
    const historyRows = renderer.root.findAllByProps({
      testID: 'session-history-row',
    });

    expect(historyButton.props.accessibilityState).toEqual({selected: true});
    expect(overlay).toBeTruthy();
    expect(
      renderer.root.findByProps({testID: 'timeline-copy-button'}),
    ).toBeTruthy();
    expect(renderer.root.findAllByType(ScrollView)).toHaveLength(1);
    expect(historyRows.map(row => row.props.style)).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          expect.objectContaining({backgroundColor: '#FFFFFF'}),
        ]),
        expect.arrayContaining([
          expect.objectContaining({backgroundColor: '#F7F8F4'}),
        ]),
      ]),
    );
    expect(overlayText).toContain('TIMELINE');
    expect(overlayText).toContain('2 EVENTS');
    expect(overlayText).toContain('LAP');
    expect(overlayText).toContain('+00:05.00');
    expect(overlayText).not.toContain('START');
    expect(overlayText).not.toContain('STOP');
    expect(mockSetScreen).not.toHaveBeenCalledWith('history');

    ReactTestRenderer.act(() => {
      historyButton.props.onPress();
    });

    expect(renderer.root.findAllByProps({testID: 'session-history-overlay'}))
      .toHaveLength(0);
  });

  it('copies visible timeline events to the clipboard from the header icon', async () => {
    mockState = {
      ...baseState,
      timerModeId: 'basicTimer',
      sessionHistory: [
        {id: 'START-1000', type: 'START', atMs: 1000, elapsedMs: 0, deltaMs: 0},
        {
          id: 'LAP-6000',
          type: 'LAP',
          atMs: 6000,
          elapsedMs: 5000,
          deltaMs: 5000,
        },
        {
          id: 'LAP-8000',
          type: 'LAP',
          atMs: 8000,
          elapsedMs: 7000,
          deltaMs: 2000,
        },
        {
          id: 'STOP-7000',
          type: 'STOP',
          atMs: 7000,
          elapsedMs: 5000,
          deltaMs: 0,
        },
      ],
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'TIMELINE Button'}).props
        .onPress();
    });

    await ReactTestRenderer.act(async () => {
      await renderer.root.findByProps({testID: 'timeline-copy-button'}).props
        .onPress();
    });

    expect(mockCopyTimelineText).toHaveBeenCalledWith(
      [
        'TIMELINE',
        '2 EVENTS',
        '02  LAP  00:07.00  +00:02.00',
        '01  LAP  00:05.00  +00:05.00',
      ].join('\n'),
    );
  });

  it('shows timer mark timeline with elapsed and left times', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerTargetDurationMs: 60 * 1000,
      timerModeId: 'basicTimer',
      timer: {
        ...baseTimer,
        targetDurationMs: 60 * 1000,
      },
      sessionHistory: [
        {
          id: 'LAP-11000',
          type: 'LAP',
          atMs: 11000,
          elapsedMs: 10000,
          deltaMs: 10000,
        },
      ],
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'TIMELINE Button'}).props
        .onPress();
    });

    const overlayText = renderer.root
      .findByProps({testID: 'session-history-overlay'})
      .findAllByType(Text)
      .map(node => flattenText(node.props.children))
      .join(' ');

    expect(overlayText).toContain('MARK');
    expect(overlayText).toContain('E 00:10.00');
    expect(overlayText).toContain('L 00:50.00');
    expect(overlayText).not.toContain('LAP');
    expect(overlayText).not.toContain('+00:10.00');
  });

  it('shows flip timer mode with device posture gestures', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
      timerModeId: 'flipTimer',
    };
    const renderer = renderTimerScreen();

    expect(getRenderedText(renderer)).toContain('START');
    expect(getRenderedText(renderer)).toContain('Flip Down');
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'START Flip Down'}).props
        .onPress();
    });
    expect(mockStartTimerSession).toHaveBeenCalledTimes(1);
  });

  it('shows Smile Mode with smile start and smile stop controls', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        detectionStatus: 'looking',
        smileDetected: false,
        isLookPaused: false,
      },
      timerModeId: 'smileMode',
    };
    const renderer = renderTimerScreen();
    const text = getRenderedText(renderer);

    expect(text).toContain('SMILE MODE');
    expect(text).toContain('START');
    expect(text).toContain('Smile');
    expect(text).toContain('SMILE READY');
    expect(renderer.root.findByProps({
      testID: 'timer-smile-unavailable-label',
    })).toBeTruthy();
  });

  it('shows Smile as the active Smile Mode pause gesture', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'active',
        startedAtMs: 1000,
        focusDurationMs: 3000,
        detectionStatus: 'looking',
        smileDetected: false,
        isLookPaused: false,
      },
      timerModeId: 'smileMode',
    };
    const renderer = renderTimerScreen();
    const text = getRenderedText(renderer);

    expect(text).toContain('PAUSE');
    expect(text).toContain('Smile');
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'PAUSE Smile'}).props
        .onPress();
    });
    expect(mockPauseTimerSession).toHaveBeenCalledTimes(1);
  });

  it('shows Smile as the paused Smile Mode resume gesture', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'manualPaused',
        startedAtMs: 1000,
        focusDurationMs: 3000,
        detectionStatus: 'looking',
        smileDetected: false,
        isLookPaused: false,
      },
      timerModeId: 'smileMode',
    };
    const renderer = renderTimerScreen();
    const text = getRenderedText(renderer);

    expect(text).toContain('RESUME');
    expect(text).toContain('Smile');
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'RESUME Smile'}).props
        .onPress();
    });
    expect(mockResumeTimerSession).toHaveBeenCalledTimes(1);
  });

  it('shows smile unavailable when Smile Mode cannot judge a face smile', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        detectionStatus: 'notLooking',
        smileDetected: null,
        isLookPaused: false,
      },
      timerModeId: 'smileMode',
    };
    const renderer = renderTimerScreen();
    const smileUnavailableLabel = renderer.root.findByProps({
      testID: 'timer-smile-unavailable-label',
    });

    expect(smileUnavailableLabel.props.children).toBe('SMILE UNAVAILABLE');
    expect(StyleSheet.flatten(smileUnavailableLabel.props.style).color).toBe(
      '#B42318',
    );
  });

  it('shows stop events instead of lap events for Look Pause timeline', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
      timerModeId: 'lookPause',
      sessionHistory: [
        {id: 'START-1000', type: 'START', atMs: 1000, elapsedMs: 0, deltaMs: 0},
        {
          id: 'STOP-6000',
          type: 'STOP',
          atMs: 6000,
          elapsedMs: 5000,
          deltaMs: 5000,
        },
        {
          id: 'LAP-6500',
          type: 'LAP',
          atMs: 6500,
          elapsedMs: 5500,
          deltaMs: 500,
        },
      ],
    };
    const renderer = renderTimerScreen();

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'TIMELINE Button'}).props
        .onPress();
    });

    const overlayText = renderer.root
      .findByProps({testID: 'session-history-overlay'})
      .findAllByType(Text)
      .map(node => flattenText(node.props.children))
      .join(' ');
    const historyRows = renderer.root.findAllByProps({
      testID: 'session-history-row',
    });

    expect(historyRows.map(row => row.props.style)).toEqual(
      expect.arrayContaining([
        expect.arrayContaining([
          expect.objectContaining({backgroundColor: '#F7F8F4'}),
        ]),
      ]),
    );
    expect(overlayText).toContain('STOP');
    expect(overlayText).not.toContain('LAP');
    expect(renderer.root.findByProps({testID: 'latest-history-record'}))
      .toBeTruthy();
  });

  it('replaces the timeline overlay with the restored mode menu', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        detectionStatus: 'notLooking',
        isLookPaused: false,
      },
      timerModeId: 'basicTimer',
      sessionHistory: [
        {id: 'START-1000', type: 'START', atMs: 1000, elapsedMs: 0, deltaMs: 0},
        {
          id: 'LAP-6000',
          type: 'LAP',
          atMs: 6000,
          elapsedMs: 5000,
          deltaMs: 5000,
        },
      ],
    };
    const renderer = renderTimerScreen();
    const modeButton = renderer.root.find(
      node =>
        node.props.accessibilityLabel === 'Open mode menu' &&
        typeof node.props.onPress === 'function',
    );

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'TIMELINE Button'}).props
        .onPress();
    });

    ReactTestRenderer.act(() => {
      modeButton.props.onPress();
    });

    const modeSection = renderer.root.findByProps({
      testID: 'mode-selector-bottom',
    });
    const modeOptions = renderer.root.findByProps({
      testID: 'timekeeping-mode-options',
    });
    const modeMenu = renderer.root.findByProps({testID: 'mode-menu'});

    expect(renderer.root.findAllByProps({
      testID: 'session-history-overlay',
    })).toHaveLength(0);
    expect(modeSection.props.style).toEqual(
      expect.objectContaining({elevation: 40, zIndex: 40}),
    );
    expect(modeMenu.props.style).toEqual(
      expect.objectContaining({elevation: 50, zIndex: 50}),
    );
    expect(modeOptions.props.style).toEqual(
      expect.objectContaining({elevation: 70, zIndex: 70}),
    );
  });

  it('shows wink control lap as a left-wink gesture that can also be tapped', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        detectionStatus: 'looking',
        isLookPaused: false,
      },
      timerModeId: 'winkControl',
    };
    const renderer = renderTimerScreen();
    const lapButton = renderer.root.findByProps({
      accessibilityLabel: 'LAP Left Wink',
    });

    expect(lapButton.props.disabled).toBe(false);

    ReactTestRenderer.act(() => {
      lapButton.props.onPress();
    });

    expect(mockRecordLapSession).toHaveBeenCalledTimes(1);
  });

  it('shows the left wink start label when the selected mode starts by left wink', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'idle',
        startedAtMs: null,
        focusDurationMs: 0,
        isLookPaused: false,
      },
      timerModeId: 'winkControl',
    };
    const renderer = renderTimerScreen();

    expect(getRenderedText(renderer)).toContain('START');
    expect(getRenderedText(renderer)).toContain('Right Wink');
  });

  it('shows the left wink resume label when the selected mode resumes by left wink', () => {
    mockState = {
      ...baseState,
      timer: {
        ...baseTimer,
        phase: 'manualPaused',
        isLookPaused: false,
      },
      timerModeId: 'winkControl',
    };
    const renderer = renderTimerScreen();

    expect(getRenderedText(renderer)).toContain('RESUME');
    expect(getRenderedText(renderer)).toContain('Right Wink');
    expect(getRenderedText(renderer)).toContain('Left Wink');
  });

  it('shows a timer alert stop action when a completed timer alert is still active', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerModeId: 'basicTimer',
      isTimerAlertActive: true,
      timer: {
        ...baseTimer,
        phase: 'ended',
        focusDurationMs: 60 * 1000,
        targetDurationMs: 60 * 1000,
        detectionStatus: 'unknown',
        isLookPaused: false,
      },
    };
    const renderer = renderTimerScreen();
    const stopAlertButton = renderer.root.findByProps({
      accessibilityLabel: 'STOP ALERT Button',
    });

    expect(getRenderedText(renderer)).toContain('STOP ALERT');

    ReactTestRenderer.act(() => {
      stopAlertButton.props.onPress();
    });

    expect(mockStopTimerEndAlert).toHaveBeenCalledTimes(1);
  });

  it('stops the completed timer alert when restarting from the alert state', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      timerModeId: 'basicTimer',
      isTimerAlertActive: true,
      timer: {
        ...baseTimer,
        phase: 'ended',
        focusDurationMs: 60 * 1000,
        targetDurationMs: 60 * 1000,
        detectionStatus: 'unknown',
        isLookPaused: false,
      },
    };
    const renderer = renderTimerScreen();
    const restartButton = renderer.root.findByProps({
      accessibilityLabel: 'RESTART Button',
    });

    ReactTestRenderer.act(() => {
      restartButton.props.onPress();
    });

    expect(mockStopTimerEndAlert).toHaveBeenCalledTimes(1);
    expect(mockStartTimerSession).toHaveBeenCalledTimes(1);
  });

  it('keeps mode selection locked while a completed timer alert is still active', () => {
    mockState = {
      ...baseState,
      timekeepingMode: 'timer',
      isTimerAlertActive: true,
      timer: {
        ...baseTimer,
        phase: 'ended',
        focusDurationMs: 60 * 1000,
        targetDurationMs: 60 * 1000,
        detectionStatus: 'unknown',
        isLookPaused: false,
      },
    };
    const renderer = renderTimerScreen();
    const modeButton = renderer.root.findByProps({
      accessibilityLabel: 'Open mode menu',
    });

    expect(modeButton.props.disabled).toBe(true);
    expect(modeButton.props.onPress).toBeUndefined();
    expect(renderer.root.findAllByProps({testID: 'mode-menu'}))
      .toHaveLength(0);
  });
});
