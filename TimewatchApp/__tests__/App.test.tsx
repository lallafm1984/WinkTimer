/**
 * @format
 */

import React from 'react';
import {SafeAreaProvider} from 'react-native-safe-area-context';
import ReactTestRenderer from 'react-test-renderer';
import App, {createHardwareBackPressHandler} from '../App';

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
