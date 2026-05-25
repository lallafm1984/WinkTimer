import React from 'react';
import {StyleSheet, Text} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {SettingsScreen} from '../SettingsScreen';

const mockSetScreen = jest.fn();
const mockSetSensitivity = jest.fn();
const mockSetStatusDisplayMode = jest.fn();
const mockSetNormalTimerMode = jest.fn();
const mockSetWinkLeftEyeClosedThreshold = jest.fn();
const mockSetWinkRightEyeClosedThreshold = jest.fn();
const mockSetWinkLeftEyeProbabilityGapThreshold = jest.fn();
const mockSetWinkRightEyeProbabilityGapThreshold = jest.fn();
const mockSetWinkDistanceLevel = jest.fn();
const mockSetLookAngleLevel = jest.fn();
const mockSetFaceHeightAngleLevel = jest.fn();
const mockSetWinkTimeLevel = jest.fn();
const mockSetWinkMaxDurationMs = jest.fn();
const mockSetWinkMinTimeLevel = jest.fn();
const mockSetWinkMinDurationMs = jest.fn();
const mockSetDetectionResolutionLevel = jest.fn();
const mockSetDetectionFrameIntervalLevel = jest.fn();
const mockSetDetectionPerformanceMode = jest.fn();

function createWinkReading({
  side = 'left',
  leftEye = 0.18,
  rightEye = 0.91,
  gap = 0.36,
  eyeState = 'oneEyeClosed',
}: {
  side?: 'left' | 'right';
  leftEye?: number;
  rightEye?: number;
  gap?: number;
  eyeState?: 'unknown' | 'bothOpen' | 'oneEyeClosed';
}) {
  return {
    status: 'looking' as const,
    confidence: 0.82,
    eyeState,
    winkSide: side,
    atMs: 1200,
    winkDebug: {
      leftEyeOpenProbability: leftEye,
      rightEyeOpenProbability: rightEye,
      eyeProbabilityGap: gap,
      faceAreaRatio: 0.12,
      minFaceAreaRatio: 0,
      minEyeOpenProbability: 0.25,
      maxWinkEyeOpenProbability: 0.2,
      minWinkEyeProbabilityGap: 0.3,
      minOpenEyeProbabilityForWink: 0.62,
      leftEyeClosedThreshold: 0.1,
      rightEyeClosedThreshold: 0.1,
      leftEyeProbabilityGapThreshold: 0.3,
      rightEyeProbabilityGapThreshold: 0.3,
      facePitchDegrees: -8.4,
      faceYawDegrees: 2.1,
      faceRollDegrees: -1.3,
      maxFacePitchDegrees: 16,
      maxFaceYawDegrees: 18,
      maxFaceRollDegrees: 50,
      analysisDurationMs: 24,
    },
  };
}

const mockGazeDetector = {
  start: jest.fn().mockResolvedValue(undefined),
  stop: jest.fn().mockResolvedValue(undefined),
  getLatestReading: jest.fn(() => createWinkReading({})),
  consumeSingleWink: jest.fn(() => null),
  suppressSingleWinkUntilOpen: jest.fn(),
  setWinkThresholds: jest.fn().mockResolvedValue(undefined),
  setWinkDistanceLevel: jest.fn().mockResolvedValue(undefined),
  setLookAngleLevel: jest.fn().mockResolvedValue(undefined),
  setWinkTimeLevel: jest.fn(),
  setWinkMaxDurationMs: jest.fn(),
  setWinkMinTimeLevel: jest.fn(),
  setWinkMinDurationMs: jest.fn(),
  setDetectionResolutionLevel: jest.fn().mockResolvedValue(undefined),
  setDetectionFrameIntervalLevel: jest.fn().mockResolvedValue(undefined),
  setDetectionPerformanceMode: jest.fn().mockResolvedValue(undefined),
  setMockStatus: jest.fn(),
};

const mockState = {
  sensitivity: 'strict',
  setSensitivity: mockSetSensitivity,
  statusDisplayMode: 'minimal',
  setStatusDisplayMode: mockSetStatusDisplayMode,
  normalTimerMode: false,
  setNormalTimerMode: mockSetNormalTimerMode,
  winkLeftEyeClosedThreshold: 0.1,
  setWinkLeftEyeClosedThreshold: mockSetWinkLeftEyeClosedThreshold,
  winkRightEyeClosedThreshold: 0.1,
  setWinkRightEyeClosedThreshold: mockSetWinkRightEyeClosedThreshold,
  winkLeftEyeProbabilityGapThreshold: 0.3,
  setWinkLeftEyeProbabilityGapThreshold:
    mockSetWinkLeftEyeProbabilityGapThreshold,
  winkRightEyeProbabilityGapThreshold: 0.3,
  setWinkRightEyeProbabilityGapThreshold:
    mockSetWinkRightEyeProbabilityGapThreshold,
  winkDistanceLevel: 5,
  setWinkDistanceLevel: mockSetWinkDistanceLevel,
  lookAngleLevel: 2,
  setLookAngleLevel: mockSetLookAngleLevel,
  faceHeightAngleLevel: 2,
  setFaceHeightAngleLevel: mockSetFaceHeightAngleLevel,
  winkTimeLevel: 2,
  setWinkTimeLevel: mockSetWinkTimeLevel,
  winkMaxDurationMs: 1000,
  setWinkMaxDurationMs: mockSetWinkMaxDurationMs,
  winkMinTimeLevel: 2,
  setWinkMinTimeLevel: mockSetWinkMinTimeLevel,
  winkMinDurationMs: 200,
  setWinkMinDurationMs: mockSetWinkMinDurationMs,
  detectionResolutionLevel: 2,
  setDetectionResolutionLevel: mockSetDetectionResolutionLevel,
  detectionFrameIntervalLevel: 1,
  setDetectionFrameIntervalLevel: mockSetDetectionFrameIntervalLevel,
  detectionPerformanceMode: 'fast',
  setDetectionPerformanceMode: mockSetDetectionPerformanceMode,
  gazeDetector: mockGazeDetector,
  setScreen: mockSetScreen,
};

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

function renderSettingsScreen() {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<SettingsScreen />);
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
    renderer.root.findByProps({testID}).props.onPress();
  });
}

function pressToggleOption(
  renderer: ReactTestRenderer.ReactTestRenderer,
  testID: string,
  option: string | number,
) {
  pressByTestID(renderer, `${testID}-option-${option}`);
}

function getNodeStyle(
  renderer: ReactTestRenderer.ReactTestRenderer,
  testID: string,
) {
  return StyleSheet.flatten(renderer.root.findByProps({testID}).props.style);
}

function getCalibrationCount(renderer: ReactTestRenderer.ReactTestRenderer) {
  return flattenText(
    renderer.root.findByProps({testID: 'wink-calibration-count'}).props
      .children,
  );
}

function queueCalibrationWink(
  params: Parameters<typeof createWinkReading>[0],
) {
  mockGazeDetector.getLatestReading.mockReturnValueOnce(
    createWinkReading(params),
  );
}

async function advanceCalibrationTimersByTime(ms: number) {
  await ReactTestRenderer.act(async () => {
    jest.advanceTimersByTime(ms);
  });
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.useRealTimers();
    jest.clearAllMocks();
    mockState.winkLeftEyeClosedThreshold = 0.1;
    mockState.winkRightEyeClosedThreshold = 0.1;
    mockState.winkLeftEyeProbabilityGapThreshold = 0.3;
    mockState.winkRightEyeProbabilityGapThreshold = 0.3;
    mockGazeDetector.getLatestReading.mockReturnValue(
      createWinkReading({
        leftEye: 0.85,
        rightEye: 0.91,
        gap: 0.06,
        eyeState: 'bothOpen',
      }),
    );
    mockGazeDetector.consumeSingleWink.mockReturnValue(null);
  });

  it('renders the reorganized settings as collapsed accordions with wink test at the bottom', () => {
    const renderer = renderSettingsScreen();
    const text = getRenderedText(renderer);

    expect(text).toContain('LOOK MODE');
    expect(text).toContain('WINK MODE');
    expect(text).toContain('CAMERA');
    expect(text).toContain('WINK TEST');
    expect(text.indexOf('WINK TEST')).toBeGreaterThan(text.indexOf('CAMERA'));
    expect(text).not.toContain('SENSITIVITY');
    expect(text).not.toContain('FACE DIRECTION');
    expect(text).not.toContain('LEFT EYE CLOSED');
  });

  it('expands look mode settings without exposing the fixed sensitivity control', () => {
    const renderer = renderSettingsScreen();

    pressByTestID(renderer, 'look-settings-accordion');

    const text = getRenderedText(renderer);

    expect(text).toContain('FACE DIRECTION');
    expect(text).toContain('VERTICAL RANGE');
    expect(text).toContain('NARROW');
    expect(text).toContain('NORMAL');
    expect(text).toContain('WIDE');
    expect(text).not.toContain('SENSITIVITY');
    expect(renderer.root.findAllByProps({testID: 'sensitivity-levels'}))
      .toHaveLength(0);

    pressToggleOption(renderer, 'look-angle-levels', 3);
    pressToggleOption(renderer, 'face-height-angle-levels', 1);

    expect(mockSetLookAngleLevel).toHaveBeenCalledWith(3);
    expect(mockSetFaceHeightAngleLevel).toHaveBeenCalledWith(1);
  });

  it('uses a distinct background for expanded accordion content', () => {
    const renderer = renderSettingsScreen();

    pressByTestID(renderer, 'look-settings-accordion');

    const bodyStyle = StyleSheet.flatten(
      renderer.root.findByProps({testID: 'look-settings-body'}).props.style,
    );

    expect(bodyStyle.backgroundColor).toBe('#F3F6F1');
  });

  it('uses wink mode calibration buttons while hiding non-distance threshold controls', () => {
    const renderer = renderSettingsScreen();

    pressByTestID(renderer, 'wink-settings-accordion');

    const text = getRenderedText(renderer);

    expect(text).toContain('LEFT WINK SETTING');
    expect(text).toContain('RIGHT WINK SETTING');
    expect(text).toContain('FACE DISTANCE');
    expect(text).toContain('CLOSE');
    expect(text).toContain('MID');
    expect(text).toContain('FAR');
    expect(text).not.toContain('LEFT EYE CLOSED');
    expect(text).not.toContain('RIGHT EYE CLOSED');
    expect(text).not.toContain('LEFT EYE GAP');
    expect(text).not.toContain('RIGHT EYE GAP');
    expect(text).not.toContain('WINK MAX TIME');
    expect(text).not.toContain('WINK MIN TIME');
    expect(renderer.root.findAllByProps({
      testID: 'wink-left-eye-threshold-levels',
    })).toHaveLength(0);
    expect(renderer.root.findAllByProps({
      testID: 'wink-right-eye-threshold-levels',
    })).toHaveLength(0);
    expect(renderer.root.findAllByProps({
      testID: 'wink-left-gap-threshold-levels',
    })).toHaveLength(0);
    expect(renderer.root.findAllByProps({
      testID: 'wink-right-gap-threshold-levels',
    })).toHaveLength(0);
    expect(renderer.root.findAllByProps({testID: 'wink-time-levels'}))
      .toHaveLength(0);
    expect(renderer.root.findAllByProps({testID: 'wink-min-time-levels'}))
      .toHaveLength(0);

    pressToggleOption(renderer, 'wink-distance-levels', 3);

    expect(mockSetWinkDistanceLevel).toHaveBeenCalledWith(3);
  });

  it('keeps camera settings in an accordion with button controls', () => {
    const renderer = renderSettingsScreen();

    pressByTestID(renderer, 'camera-settings-accordion');

    const text = getRenderedText(renderer);

    expect(text).toContain('IMAGE SIZE');
    expect(text).toContain('FRAME RATE');
    expect(text).toContain('ANALYSIS MODE');
    expect(text).toContain('640 x 480');
    expect(text).toContain('REALTIME');
    expect(text).toContain('FAST');
    expect(text).toContain('ACCURATE');

    pressToggleOption(renderer, 'detection-resolution-levels', 1);
    pressToggleOption(renderer, 'detection-frame-interval-levels', 2);
    pressToggleOption(renderer, 'detection-performance-mode-levels', 2);

    expect(mockSetDetectionResolutionLevel).toHaveBeenCalledWith(1);
    expect(mockSetDetectionFrameIntervalLevel).toHaveBeenCalledWith(2);
    expect(mockSetDetectionPerformanceMode).toHaveBeenCalledWith('accurate');
  });

  it('shows wink test eye values in user-facing left and right positions', async () => {
    jest.useFakeTimers();
    const renderer = renderSettingsScreen();

    pressByTestID(renderer, 'wink-test-accordion');

    await ReactTestRenderer.act(async () => {
      renderer.root.findByProps({testID: 'wink-test-toggle'}).props.onPress();
    });

    mockGazeDetector.getLatestReading.mockReturnValue(
      createWinkReading({
        side: 'left',
        leftEye: 0.07,
        rightEye: 0.18,
        gap: 0.29,
      }),
    );
    ReactTestRenderer.act(() => {
      jest.advanceTimersByTime(100);
    });

    expect(getRenderedText(renderer)).toContain(
      'LEFT EYE 0.07 RIGHT EYE 0.18',
    );

    expect(renderer.root.findAllByProps({
      testID: 'apply-left-wink-settings',
    })).toHaveLength(0);
    expect(renderer.root.findAllByProps({
      testID: 'apply-right-wink-settings',
    })).toHaveLength(0);

    ReactTestRenderer.act(() => {
      renderer.unmount();
    });

    expect(mockGazeDetector.stop).toHaveBeenCalledTimes(1);
  });

  it('shows saved wink calibration values in the wink test panel', () => {
    mockState.winkLeftEyeClosedThreshold = 0.067;
    mockState.winkRightEyeClosedThreshold = 0.142;
    mockState.winkLeftEyeProbabilityGapThreshold = 0.783;
    mockState.winkRightEyeProbabilityGapThreshold = 0.314;
    const renderer = renderSettingsScreen();

    pressByTestID(renderer, 'wink-test-accordion');

    const text = getRenderedText(renderer);

    expect(text).toContain('SAVED LEFT 0.07');
    expect(text).toContain('SAVED RIGHT 0.14');
    expect(text).toContain('SAVED LEFT GAP 0.78');
    expect(text).toContain('SAVED RIGHT GAP 0.31');
  });

  it('counts three selected wink events before saving calibration', async () => {
    jest.useFakeTimers();
    const renderer = renderSettingsScreen();

    pressByTestID(renderer, 'wink-settings-accordion');
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({testID: 'calibrate-left-wink'})
        .props.onPress();
    });

    expect(getRenderedText(renderer)).toContain(
      '카메라를 정면으로 보고 시작을 누르세요',
    );
    expect(getNodeStyle(renderer, 'calibration-camera-dot').backgroundColor)
      .toBe('#D93025');
    expect(getNodeStyle(renderer, 'calibration-camera-dot-background')
      .backgroundColor).toBe('#FFFFFF');
    expect(getNodeStyle(renderer, 'calibration-camera-dot').position)
      .toBeUndefined();
    expect(getNodeStyle(renderer, 'wink-calibration-popup').justifyContent)
      .toBe('flex-start');
    expect(getNodeStyle(renderer, 'wink-calibration-popup').paddingTop)
      .toBeGreaterThan(60);
    expect(mockGazeDetector.start).not.toHaveBeenCalled();

    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({testID: 'start-wink-calibration'})
        .props.onPress();
    });

    expect(mockGazeDetector.start).toHaveBeenCalledTimes(1);

    await advanceCalibrationTimersByTime(3000);

    expect(getRenderedText(renderer)).toContain('왼쪽 눈으로 3번 윙크하세요');
    expect(getCalibrationCount(renderer)).toBe('3');
    expect(mockSetWinkLeftEyeClosedThreshold).not.toHaveBeenCalled();

    queueCalibrationWink({
      side: 'left',
      leftEye: 0.067,
      rightEye: 0.85,
      gap: 0.783,
    });
    await advanceCalibrationTimersByTime(100);
    expect(getCalibrationCount(renderer)).toBe('2');
    expect(mockSetWinkLeftEyeClosedThreshold).not.toHaveBeenCalled();
    await advanceCalibrationTimersByTime(100);

    queueCalibrationWink({
      side: 'left',
      leftEye: 0.09,
      rightEye: 0.83,
      gap: 0.7,
    });
    await advanceCalibrationTimersByTime(100);
    expect(getCalibrationCount(renderer)).toBe('1');
    expect(mockSetWinkLeftEyeClosedThreshold).not.toHaveBeenCalled();
    await advanceCalibrationTimersByTime(100);

    queueCalibrationWink({
      side: 'left',
      leftEye: 0.074,
      rightEye: 0.82,
      gap: 0.66,
    });
    await advanceCalibrationTimersByTime(100);
    expect(getCalibrationCount(renderer)).toBe('0');
    await advanceCalibrationTimersByTime(100);

    expect(mockSetWinkLeftEyeClosedThreshold).toHaveBeenCalledWith(0.1);
    expect(mockSetWinkLeftEyeProbabilityGapThreshold).toHaveBeenCalledWith(
      0.33,
    );
    expect(mockSetWinkRightEyeClosedThreshold).not.toHaveBeenCalled();
    expect(renderer.root.findAllByProps({
      testID: 'wink-calibration-popup',
    })).toHaveLength(0);
    expect(mockGazeDetector.consumeSingleWink).not.toHaveBeenCalled();
    expect(mockGazeDetector.stop).toHaveBeenCalledTimes(1);
  });

  it('keeps the calibration popup open when the closed-eye average is too high', async () => {
    jest.useFakeTimers();
    const renderer = renderSettingsScreen();

    pressByTestID(renderer, 'wink-settings-accordion');
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({testID: 'calibrate-left-wink'})
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({testID: 'start-wink-calibration'})
        .props.onPress();
    });
    await advanceCalibrationTimersByTime(3000);
    queueCalibrationWink({
      side: 'left',
      leftEye: 0.42,
      rightEye: 0.9,
      gap: 0.48,
    });
    await advanceCalibrationTimersByTime(100);
    await advanceCalibrationTimersByTime(100);
    queueCalibrationWink({
      side: 'left',
      leftEye: 0.41,
      rightEye: 0.88,
      gap: 0.47,
    });
    await advanceCalibrationTimersByTime(100);
    await advanceCalibrationTimersByTime(100);
    queueCalibrationWink({
      side: 'left',
      leftEye: 0.43,
      rightEye: 0.87,
      gap: 0.44,
    });
    await advanceCalibrationTimersByTime(100);
    await advanceCalibrationTimersByTime(100);

    const text = getRenderedText(renderer);

    expect(text).toContain('측정 실패');
    expect(text).toContain('선택한 눈이 충분히 감기지 않았습니다');
    expect(mockSetWinkLeftEyeClosedThreshold).not.toHaveBeenCalled();
    expect(mockSetWinkLeftEyeProbabilityGapThreshold).not.toHaveBeenCalled();
    expect(renderer.root.findAllByProps({
      testID: 'wink-calibration-popup',
    }).length).toBeGreaterThan(0);
    expect(renderer.root.findAllByProps({
      testID: 'start-wink-calibration',
    }).length).toBeGreaterThan(0);
  });

  it('reports a retryable failure when both eyes are measured as closed', async () => {
    jest.useFakeTimers();
    const renderer = renderSettingsScreen();

    pressByTestID(renderer, 'wink-settings-accordion');
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({testID: 'calibrate-left-wink'})
        .props.onPress();
    });
    await ReactTestRenderer.act(async () => {
      renderer.root
        .findByProps({testID: 'start-wink-calibration'})
        .props.onPress();
    });
    await advanceCalibrationTimersByTime(3000);
    queueCalibrationWink({
      side: 'left',
      leftEye: 0.07,
      rightEye: 0.18,
      gap: 0.11,
    });
    await advanceCalibrationTimersByTime(100);
    await advanceCalibrationTimersByTime(100);
    queueCalibrationWink({
      side: 'left',
      leftEye: 0.08,
      rightEye: 0.2,
      gap: 0.12,
    });
    await advanceCalibrationTimersByTime(100);
    await advanceCalibrationTimersByTime(100);
    queueCalibrationWink({
      side: 'left',
      leftEye: 0.06,
      rightEye: 0.19,
      gap: 0.13,
    });
    await advanceCalibrationTimersByTime(100);
    await advanceCalibrationTimersByTime(100);

    const text = getRenderedText(renderer);

    expect(text).toContain('측정 실패');
    expect(text).toContain('반대쪽 눈은 뜬 상태로 다시 측정하세요');
    expect(mockSetWinkLeftEyeClosedThreshold).not.toHaveBeenCalled();
  });
});
