/**
 * @format
 */

import React from 'react';
import {Image} from 'react-native';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import {signInAnonymously} from '@react-native-firebase/auth';
import App, {createHardwareBackPressHandler} from '../App';
import {allMascotImages} from '../src/components/mascotImages';

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
});

afterEach(() => {
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
