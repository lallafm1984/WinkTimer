/**
 * @format
 */

import React from 'react';
import {Image, NativeModules, StyleSheet} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import {signInAnonymously} from '@react-native-firebase/auth';
import App, {createHardwareBackPressHandler} from '../App';
import {allMascotImages} from '../src/components/mascotImages';

const mockShowAlarmStopInterstitialIfEligible = jest.fn<Promise<boolean>, []>();
const mockInitializeInterstitialAdRemoteConfig = jest.fn<Promise<unknown>, []>();

type MutableNativeModules = typeof NativeModules & {
  NativeTimerAlert?: {
    getActiveAlarmAlert?: jest.Mock<
      Promise<{
        active: boolean;
        alarmId?: string;
        title?: string;
        text?: string;
      } | null>,
      []
    >;
    stopAlarmAlert?: jest.Mock<Promise<void>, []>;
    snoozeAlarmAlert?: jest.Mock<
      Promise<void>,
      [string, number, string, boolean, boolean, string, string, string]
    >;
  };
};

const nativeModules = NativeModules as MutableNativeModules;
const originalNativeTimerAlert = nativeModules.NativeTimerAlert;

jest.mock('../src/ads/interstitialAd', () => ({
  showAlarmStopInterstitialIfEligible: () =>
    mockShowAlarmStopInterstitialIfEligible(),
}));

jest.mock('../src/ads/interstitialAdRemoteConfig', () => ({
  initializeInterstitialAdRemoteConfig: () =>
    mockInitializeInterstitialAdRemoteConfig(),
}));

jest.mock('react-native-safe-area-context', () => {
  const ReactModule = require('react');
  const {View} = require('react-native');

  return {
    SafeAreaProvider: ({children}: {children: React.ReactNode}) =>
      ReactModule.createElement(
        View,
        {testID: 'safe-area-provider'},
        children,
      ),
    SafeAreaView: ({
      children,
      style,
    }: {
      children: React.ReactNode;
      style?: unknown;
    }) => ReactModule.createElement(View, {style}, children),
  };
});

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(signInAnonymously).mockClear();
  mockShowAlarmStopInterstitialIfEligible.mockReset();
  mockShowAlarmStopInterstitialIfEligible.mockResolvedValue(false);
  mockInitializeInterstitialAdRemoteConfig.mockReset();
  mockInitializeInterstitialAdRemoteConfig.mockResolvedValue(undefined);
});

afterEach(() => {
  if (originalNativeTimerAlert) {
    nativeModules.NativeTimerAlert = originalNativeTimerAlert;
  } else {
    delete nativeModules.NativeTimerAlert;
  }
  jest.useRealTimers();
});

test('renders correctly', async () => {
  const warn = jest.spyOn(console, 'warn').mockImplementation(() => {});
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  try {
    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<App />);
    });

    expect(warn).not.toHaveBeenCalled();
  } finally {
    await ReactTestRenderer.act(async () => {
      renderer?.unmount();
    });
    warn.mockRestore();
  }
});

test('mounts safe area provider at the app root', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(renderer).toBeDefined();
  expect(renderer!.root.findByType(SafeAreaProvider)).toBeTruthy();

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
});

test('keeps mascot images mounted at the app root to warm the native image cache', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const cache = renderer!.root.findByProps({testID: 'mascot-image-cache'});
  const cachedImages = cache.findAllByType(Image);

  expect(cache.props.accessibilityElementsHidden).toBe(true);
  expect(cache.props.importantForAccessibility).toBe('no-hide-descendants');
  expect(cachedImages).toHaveLength(allMascotImages.length);
  expect(
    cachedImages.every(
      image => image.props.testID === 'mascot-image-cache-image',
    ),
  ).toBe(true);
  expect(cachedImages.map(image => image.props.source)).toEqual(
    allMascotImages,
  );

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
});

test('opens directly to the timer screen', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(renderer!.root.findByProps({testID: 'timer-header'})).toBeTruthy();

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
});

test('keeps the shared primary ad mounted between timer and alarms', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(() => {
    renderer = ReactTestRenderer.create(<App />);
  });

  const adFrameOnTimer = renderer!.root.findByProps({
    testID: 'shared-primary-screen-ad',
  });
  const sharedAdFrameStyle = StyleSheet.flatten(adFrameOnTimer.props.style);

  expect(sharedAdFrameStyle).toEqual(expect.objectContaining({width: '100%'}));
  expect(sharedAdFrameStyle.paddingBottom).toBeUndefined();
  expect(
    renderer!.root.findAllByProps({testID: 'ad-slot'}).length,
  ).toBeGreaterThan(0);

  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({testID: 'timekeeping-alarm-button'})
      .props.onPress();
  });

  expect(renderer!.root.findByProps({testID: 'alarms-screen'})).toBeTruthy();
  expect(
    renderer!.root.findAllByProps({testID: 'ad-slot'}).length,
  ).toBeGreaterThan(0);
  expect(
    renderer!.root.findByProps({testID: 'shared-primary-screen-ad'}),
  ).toBe(adFrameOnTimer);

  await ReactTestRenderer.act(async () => {
    renderer!.root
      .findByProps({testID: 'timekeeping-timer-button'})
      .props.onPress();
  });

  expect(renderer!.root.findByProps({testID: 'timer-header'})).toBeTruthy();
  expect(
    renderer!.root.findAllByProps({testID: 'ad-slot'}).length,
  ).toBeGreaterThan(0);
  expect(
    renderer!.root.findByProps({testID: 'shared-primary-screen-ad'}),
  ).toBe(adFrameOnTimer);

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
});

test('shows the active alarm stop popup when the app opens during an alarm', async () => {
  const getActiveAlarmAlert = jest.fn().mockResolvedValue({
    active: true,
    alarmId: 'alarm-test',
    title: 'MORNING',
    text: '07:01',
  });
  const stopAlarmAlert = jest.fn().mockResolvedValue(undefined);
  nativeModules.NativeTimerAlert = {getActiveAlarmAlert, stopAlarmAlert};
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(
    renderer!.root.findByProps({testID: 'active-alarm-alert-popup'}),
  ).toBeTruthy();
  expect(
    StyleSheet.flatten(
      renderer!.root.findByProps({testID: 'active-alarm-alert-panel'}).props
        .style,
    ),
  ).toEqual(expect.objectContaining({maxWidth: 420}));

  await ReactTestRenderer.act(async () => {
    await renderer!.root.findByProps({
      testID: 'active-alarm-alert-stop-button',
    }).props.onPress();
  });

  expect(stopAlarmAlert).toHaveBeenCalledTimes(1);
  expect(mockShowAlarmStopInterstitialIfEligible).toHaveBeenCalledTimes(1);
  expect(
    renderer!.root.findAllByProps({testID: 'active-alarm-alert-popup'}),
  ).toHaveLength(0);

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
});

test('shows alarm snooze duration choices from the active alarm popup', async () => {
  const getActiveAlarmAlert = jest.fn().mockResolvedValue({
    active: true,
    alarmId: 'alarm-test',
    title: 'MORNING',
    text: '07:01',
  });
  const stopAlarmAlert = jest.fn().mockResolvedValue(undefined);
  nativeModules.NativeTimerAlert = {getActiveAlarmAlert, stopAlarmAlert};
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(
    renderer!.root.findAllByProps({testID: 'active-alarm-snooze-options'}),
  ).toHaveLength(0);

  await ReactTestRenderer.act(async () => {
    await renderer!.root.findByProps({
      testID: 'active-alarm-alert-snooze-button',
    }).props.onPress();
  });

  expect(stopAlarmAlert).toHaveBeenCalledTimes(1);
  expect(
    renderer!.root.findByProps({testID: 'active-alarm-snooze-options'}),
  ).toBeTruthy();
  expect(
    renderer!.root.findAllByProps({testID: 'active-alarm-snooze-1-button'}),
  ).not.toHaveLength(0);
  expect(
    renderer!.root.findAllByProps({testID: 'active-alarm-snooze-5-button'}),
  ).not.toHaveLength(0);
  expect(
    renderer!.root.findAllByProps({testID: 'active-alarm-snooze-10-button'}),
  ).not.toHaveLength(0);

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
});

test('starts Firebase anonymous auth on launch', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(signInAnonymously).toHaveBeenCalledTimes(1);

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
});

test('initializes interstitial ad remote config on launch', async () => {
  let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

  await ReactTestRenderer.act(async () => {
    renderer = ReactTestRenderer.create(<App />);
  });

  expect(mockInitializeInterstitialAdRemoteConfig).toHaveBeenCalledTimes(1);

  await ReactTestRenderer.act(async () => {
    renderer!.unmount();
  });
});

test('keeps Android back from closing the app on the timer screen', () => {
  const setScreen = jest.fn();
  const handleBackPress = createHardwareBackPressHandler('timer', setScreen);

  expect(handleBackPress()).toBe(true);
  expect(setScreen).not.toHaveBeenCalled();
});

test('uses Android back to return from settings to the timer screen', () => {
  const setScreen = jest.fn();
  const handleBackPress = createHardwareBackPressHandler('settings', setScreen);

  expect(handleBackPress()).toBe(true);
  expect(setScreen).toHaveBeenCalledWith('timer');
});

test('lets the alarm screen handle Android back locally', () => {
  const setScreen = jest.fn();
  const handleBackPress = createHardwareBackPressHandler('alarms', setScreen);

  expect(handleBackPress()).toBe(false);
  expect(setScreen).not.toHaveBeenCalled();
});
