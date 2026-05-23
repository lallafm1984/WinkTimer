import React from 'react';
import {Switch, Text} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {SettingsScreen} from '../SettingsScreen';

const mockSetScreen = jest.fn();
const mockSetSensitivity = jest.fn();
const mockSetStatusDisplayMode = jest.fn();
const mockSetNormalTimerMode = jest.fn();
const mockSetWinkSensitivityLevel = jest.fn();
const mockSetWinkDistanceLevel = jest.fn();
const mockSetLookAngleLevel = jest.fn();
const mockSetWinkTimeLevel = jest.fn();
const mockSetWinkMinTimeLevel = jest.fn();
const mockSetDetectionResolutionLevel = jest.fn();
const mockSetDetectionFrameIntervalLevel = jest.fn();

const mockState = {
  sensitivity: 'normal',
  setSensitivity: mockSetSensitivity,
  statusDisplayMode: 'minimal',
  setStatusDisplayMode: mockSetStatusDisplayMode,
  normalTimerMode: false,
  setNormalTimerMode: mockSetNormalTimerMode,
  winkSensitivityLevel: 3,
  setWinkSensitivityLevel: mockSetWinkSensitivityLevel,
  winkDistanceLevel: 5,
  setWinkDistanceLevel: mockSetWinkDistanceLevel,
  lookAngleLevel: 2,
  setLookAngleLevel: mockSetLookAngleLevel,
  winkTimeLevel: 2,
  setWinkTimeLevel: mockSetWinkTimeLevel,
  winkMinTimeLevel: 1,
  setWinkMinTimeLevel: mockSetWinkMinTimeLevel,
  detectionResolutionLevel: 2,
  setDetectionResolutionLevel: mockSetDetectionResolutionLevel,
  detectionFrameIntervalLevel: 1,
  setDetectionFrameIntervalLevel: mockSetDetectionFrameIntervalLevel,
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

function getRenderedText(renderer: ReactTestRenderer.ReactTestRenderer) {
  return renderer.root
    .findAllByType(Text)
    .map(node => flattenText(node.props.children))
    .join(' ');
}

describe('SettingsScreen', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('renders a five-step wink sensitivity control', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const text = getRenderedText(renderer!);

    expect(text).toContain('WINK SENSITIVITY');
    expect(text).toContain('3 / 5');
    expect(text).toContain('1 2 3 4 5');
  });

  it('groups related controls and removes legacy bottom toggles', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const text = getRenderedText(renderer!);

    expect(text).toContain('LOOK DETECTION');
    expect(text).toContain('WINK DETECTION');
    expect(text).toContain('CAMERA ANALYSIS');
    expect(renderer!.root.findAllByType(Switch)).toHaveLength(0);
    expect(text).not.toContain('STATUS TEXT');
    expect(text).not.toContain('NORMAL TIMER MODE');
    expect(text).not.toContain('Actual camera detection');
  });

  it('sets the selected wink sensitivity level', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const sensitivitySection = renderer!.root.findByProps({
      testID: 'wink-sensitivity-levels',
    });
    const levelFiveButton = sensitivitySection
      .findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          node
            .findAllByType(Text)
            .some(label => flattenText(label.props.children) === '5'),
      )
      .at(0);

    expect(levelFiveButton).toBeDefined();

    ReactTestRenderer.act(() => {
      levelFiveButton!.props.onPress();
    });

    expect(mockSetWinkSensitivityLevel).toHaveBeenCalledWith(5);
  });

  it('renders a five-step wink distance control', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const text = getRenderedText(renderer!);

    expect(text).toContain('WINK DISTANCE');
    expect(text).toContain('5 / 5');
    expect(text).toContain('1 2 3 4 5');
  });

  it('sets the selected wink distance level', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const distanceSection = renderer!.root.findByProps({
      testID: 'wink-distance-levels',
    });
    const levelThreeButton = distanceSection
      .findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          node
            .findAllByType(Text)
            .some(label => flattenText(label.props.children) === '3'),
      )
      .at(0);

    expect(levelThreeButton).toBeDefined();

    ReactTestRenderer.act(() => {
      levelThreeButton!.props.onPress();
    });

    expect(mockSetWinkDistanceLevel).toHaveBeenCalledWith(3);
  });

  it('renders a three-step look angle control', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const text = getRenderedText(renderer!);

    expect(text).toContain('LOOK ANGLE');
    expect(text).toContain('2 / 3');
    expect(text).toContain('1 2 3');
  });

  it('sets the selected look angle level', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const angleSection = renderer!.root.findByProps({
      testID: 'look-angle-levels',
    });
    const levelThreeButton = angleSection
      .findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          node
            .findAllByType(Text)
            .some(label => flattenText(label.props.children) === '3'),
      )
      .at(0);

    expect(levelThreeButton).toBeDefined();

    ReactTestRenderer.act(() => {
      levelThreeButton!.props.onPress();
    });

    expect(mockSetLookAngleLevel).toHaveBeenCalledWith(3);
  });

  it('renders a three-step wink maximum time control', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const text = getRenderedText(renderer!);

    expect(text).toContain('WINK MAX TIME');
    expect(text).toContain('2 / 3');
    expect(text).toContain('1 2 3');
  });

  it('sets the selected wink maximum time level', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const timeSection = renderer!.root.findByProps({
      testID: 'wink-time-levels',
    });
    const levelThreeButton = timeSection
      .findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          node
            .findAllByType(Text)
            .some(label => flattenText(label.props.children) === '3'),
      )
      .at(0);

    expect(levelThreeButton).toBeDefined();

    ReactTestRenderer.act(() => {
      levelThreeButton!.props.onPress();
    });

    expect(mockSetWinkTimeLevel).toHaveBeenCalledWith(3);
  });

  it('renders a three-step wink minimum time control', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const text = getRenderedText(renderer!);

    expect(text).toContain('WINK MIN TIME');
    expect(text).toContain('1 / 3');
    expect(text).toContain('1 2 3');
  });

  it('sets the selected wink minimum time level', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const minTimeSection = renderer!.root.findByProps({
      testID: 'wink-min-time-levels',
    });
    const levelThreeButton = minTimeSection
      .findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          node
            .findAllByType(Text)
            .some(label => flattenText(label.props.children) === '3'),
      )
      .at(0);

    expect(levelThreeButton).toBeDefined();

    ReactTestRenderer.act(() => {
      levelThreeButton!.props.onPress();
    });

    expect(mockSetWinkMinTimeLevel).toHaveBeenCalledWith(3);
  });

  it('renders a three-step camera analysis resolution control', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const text = getRenderedText(renderer!);

    expect(text).toContain('CAMERA RESOLUTION');
    expect(text).toContain('640 x 480');
    expect(text).toContain('1 2 3');
  });

  it('sets the selected camera analysis resolution level', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const resolutionSection = renderer!.root.findByProps({
      testID: 'detection-resolution-levels',
    });
    const levelOneButton = resolutionSection
      .findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          node
            .findAllByType(Text)
            .some(label => flattenText(label.props.children) === '1'),
      )
      .at(0);

    expect(levelOneButton).toBeDefined();

    ReactTestRenderer.act(() => {
      levelOneButton!.props.onPress();
    });

    expect(mockSetDetectionResolutionLevel).toHaveBeenCalledWith(1);
  });

  it('renders a three-step ML Kit call interval control', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const text = getRenderedText(renderer!);

    expect(text).toContain('ML KIT INTERVAL');
    expect(text).toContain('Realtime');
    expect(text).toContain('1 2 3');
  });

  it('sets the selected ML Kit call interval level', () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<SettingsScreen />);
    });

    const intervalSection = renderer!.root.findByProps({
      testID: 'detection-frame-interval-levels',
    });
    const levelThreeButton = intervalSection
      .findAll(
        node =>
          node.props.accessibilityRole === 'button' &&
          node
            .findAllByType(Text)
            .some(label => flattenText(label.props.children) === '3'),
      )
      .at(0);

    expect(levelThreeButton).toBeDefined();

    ReactTestRenderer.act(() => {
      levelThreeButton!.props.onPress();
    });

    expect(mockSetDetectionFrameIntervalLevel).toHaveBeenCalledWith(3);
  });
});
