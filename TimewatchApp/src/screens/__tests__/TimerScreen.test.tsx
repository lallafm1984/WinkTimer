import React from 'react';
import {ScrollView, Text, View} from 'react-native';
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
const mockSetMockDetectionStatus = jest.fn();
const mockSetTimerModeId = jest.fn();

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
  timerModeId: 'lookPause',
  setTimerModeId: mockSetTimerModeId,
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
  const style = button.props.style;
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
  });

  it('renders the redesigned wink timer layout for an active timer', () => {
    const renderer = renderTimerScreen();
    const textContent = getRenderedText(renderer);
    const header = renderer.root.findByProps({testID: 'timer-header'});

    expect(textContent).toContain('WINK TIMER');
    expect(
      header.findByProps({testID: 'timer-title'}).props.style,
    ).toEqual(expect.objectContaining({flex: 1}));
    expect(header.findByProps({testID: 'exit-button'})).toBeTruthy();
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

  it('places settings before exit in the timer header', () => {
    const renderer = renderTimerScreen();
    const header = renderer.root.findByProps({testID: 'timer-header'});
    const navButtonContainer = header.findAllByType(View).find(node =>
      React.Children.toArray(node.props.children).some(
        child =>
          React.isValidElement<{testID?: string}>(child) &&
          child.props.testID === 'exit-button',
      ),
    );
    const navButtonLabels = React.Children.toArray(
      navButtonContainer?.props.children,
    ).map(child =>
      React.isValidElement<{label?: string}>(child)
        ? child.props.label
        : undefined,
    );

    expect(navButtonLabels).toEqual(['SETTINGS', 'EXIT']);
  });

  it('shows reset, pause, and history action buttons with gestures', () => {
    const renderer = renderTimerScreen();
    const textContent = getRenderedText(renderer);

    expect(textContent).toContain('RESET');
    expect(textContent).not.toContain('Left Wink');
    expect(textContent).toContain('PAUSE');
    expect(textContent).toContain('Look');
    expect(textContent).toContain('HISTORY');
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

  it('enables reset, exit, and history while look-pause is stopped by looking', () => {
    const renderer = renderTimerScreen();

    expect(
      renderer.root.findByProps({accessibilityLabel: 'RESET Button'}).props
        .disabled,
    ).toBe(false);
    expect(
      renderer.root.findByProps({accessibilityLabel: 'EXIT'}).props.disabled,
    ).toBe(false);
    expect(
      renderer.root.findByProps({accessibilityLabel: 'HISTORY Button'}).props
        .disabled,
    ).toBe(false);
  });

  it('enables reset, exit, and history as soon as look-pause visually enters stopped state', () => {
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
      renderer.root.findByProps({accessibilityLabel: 'EXIT'}).props.disabled,
    ).toBe(false);
    expect(
      renderer.root.findByProps({accessibilityLabel: 'HISTORY Button'}).props
        .disabled,
    ).toBe(false);
  });

  it('keeps reset and exit disabled while Look Pause is actively running', () => {
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
      renderer.root.findByProps({accessibilityLabel: 'EXIT'}).props.disabled,
    ).toBe(true);
    expect(
      renderer.root.findByProps({accessibilityLabel: 'HISTORY Button'}).props
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

    expect(latestLapText).toContain('LAP');
    expect(latestLapText).toContain('00:08.50');
  });

  it('enables reset, exit, and history while the timer is manually paused', () => {
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
      renderer.root.findByProps({accessibilityLabel: 'EXIT'}).props.disabled,
    ).toBe(false);
    expect(
      renderer.root.findByProps({accessibilityLabel: 'HISTORY Button'}).props
        .disabled,
    ).toBe(false);
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

  it('connects the start button only when the assigned gesture is Button', () => {
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
      accessibilityLabel: 'START Button',
    });

    expect(startButton.props.disabled).toBe(false);
    ReactTestRenderer.act(() => {
      startButton.props.onPress();
    });

    expect(mockStartTimerSession).toHaveBeenCalledTimes(1);
  });

  it('disables the start button while the mode menu is open', () => {
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

    const startButton = renderer.root.findByProps({
      accessibilityLabel: 'START Button',
    });

    expect(startButton.props.disabled).toBe(true);
    expect(startButton.props.onPress).toBeUndefined();
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
      accessibilityLabel: 'START Button',
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

  it('connects look-pause reset and exit actions because their gesture is Button', () => {
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
    const exitButton = renderer.root.findByProps({accessibilityLabel: 'EXIT'});

    expect(resetButton.props.disabled).toBe(false);
    ReactTestRenderer.act(() => {
      resetButton.props.onPress();
    });
    expect(exitButton.props.disabled).toBe(false);
    ReactTestRenderer.act(() => {
      exitButton.props.onPress();
    });

    expect(mockResetTimerSession).toHaveBeenCalledTimes(1);
    expect(mockFinishTimerSession).toHaveBeenCalledTimes(1);
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

  it('disables the mode selector when the timer is not ready', () => {
    const renderer = renderTimerScreen();
    const modeButton = renderer.root.findByProps({
      accessibilityLabel: 'Open mode menu',
    });

    expect(modeButton.props.disabled).toBe(true);
    expect(modeButton.props.onPress).toBeUndefined();
    expect(modeButton.props.accessibilityState).toEqual(
      expect.objectContaining({disabled: true, expanded: false}),
    );
    expect(getPressedStyleEntries(modeButton)).not.toContainEqual(
      expect.objectContaining({opacity: 0.82}),
    );
    expect(renderer.root.findAllByProps({testID: 'mode-menu'})).toHaveLength(0);
  });

  it('selects Basic Timer from the mode selector while ready', () => {
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

    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'BASIC TIMER mode',
      }),
    ).toHaveLength(0);

    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'Open mode menu'}).props.onPress();
    });

    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'WINK START mode',
      }),
    ).toHaveLength(0);

    const basicTimerCard = renderer.root.findByProps({
      accessibilityLabel: 'BASIC TIMER mode',
    });

    expect(basicTimerCard.props.accessibilityState).toEqual({selected: false});

    ReactTestRenderer.act(() => {
      basicTimerCard.props.onPress();
    });

    expect(mockSetTimerModeId).toHaveBeenCalledWith('basicTimer');

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
    };

    ReactTestRenderer.act(() => {
      renderer.update(<TimerScreen />);
    });

    expect(
      renderer.root.findAllByProps({
        accessibilityLabel: 'BASIC TIMER mode',
      }),
    ).toHaveLength(0);

    expect(getRenderedText(renderer)).toContain('START');
    expect(getRenderedText(renderer)).toContain('Button');
  });

  it('shows mode presets in production order without beta badges', () => {
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

    const menuText = renderer.root
      .findByProps({testID: 'mode-menu'})
      .findAllByType(Text)
      .map(node => flattenText(node.props.children));

    expect(
      menuText.filter(text =>
        ['BASIC TIMER', 'LOOK PAUSE', 'WINK CONTROL', 'FLIP TIMER'].includes(
          text,
        ),
      ),
    ).toEqual(['BASIC TIMER', 'LOOK PAUSE', 'WINK CONTROL', 'FLIP TIMER']);
    expect(menuText).not.toContain('BETA');
  });

  it('toggles the current mode history overlay from the bottom History button', () => {
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
      renderer.root.findByProps({accessibilityLabel: 'HISTORY Button'}).props
        .onPress();
    });

    const historyButton = renderer.root.findByProps({
      accessibilityLabel: 'HISTORY Button',
    });
    const overlay = renderer.root.findByProps({
      testID: 'session-history-overlay',
    });
    const overlayText = overlay
      .findAllByType(Text)
      .map(node => flattenText(node.props.children))
      .join(' ');

    expect(historyButton.props.accessibilityState).toEqual({selected: true});
    expect(overlay).toBeTruthy();
    expect(renderer.root.findAllByType(ScrollView)).toHaveLength(1);
    expect(overlayText).toContain('HISTORY');
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

  it('uses the top Exit button for the former End action', () => {
    const renderer = renderTimerScreen();
    const exitButton = renderer.root.findByProps({accessibilityLabel: 'EXIT'});

    ReactTestRenderer.act(() => {
      exitButton.props.onPress();
    });

    expect(mockFinishTimerSession).toHaveBeenCalledTimes(1);
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

    expect(getRenderedText(renderer)).toContain('FLIP TIMER');
    expect(getRenderedText(renderer)).toContain('START');
    expect(getRenderedText(renderer)).toContain('Flip Down');
    ReactTestRenderer.act(() => {
      renderer.root.findByProps({accessibilityLabel: 'START Flip Down'}).props
        .onPress();
    });
    expect(mockStartTimerSession).toHaveBeenCalledTimes(1);
  });

  it('shows stop records instead of lap records for Look Pause history', () => {
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
      renderer.root.findByProps({accessibilityLabel: 'HISTORY Button'}).props
        .onPress();
    });

    const overlayText = renderer.root
      .findByProps({testID: 'session-history-overlay'})
      .findAllByType(Text)
      .map(node => flattenText(node.props.children))
      .join(' ');

    expect(overlayText).toContain('STOP');
    expect(overlayText).not.toContain('LAP');
    expect(renderer.root.findByProps({testID: 'latest-history-record'}))
      .toBeTruthy();
  });

  it('stacks the mode menu above the history overlay', () => {
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
      renderer.root.findByProps({accessibilityLabel: 'HISTORY Button'}).props
        .onPress();
    });

    ReactTestRenderer.act(() => {
      modeButton.props.onPress();
    });

    const historyOverlay = renderer.root.findByProps({
      testID: 'session-history-overlay',
    });
    const modeSection = renderer.root.findByProps({
      testID: 'mode-selector-bottom',
    });
    const modeMenu = renderer.root.findByProps({testID: 'mode-menu'});

    expect(historyOverlay.props.style).toEqual(
      expect.objectContaining({elevation: 20, zIndex: 20}),
    );
    expect(modeSection.props.style).toEqual(
      expect.objectContaining({elevation: 40, zIndex: 40}),
    );
    expect(modeMenu.props.style).toEqual(
      expect.objectContaining({elevation: 50, zIndex: 50}),
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
});
