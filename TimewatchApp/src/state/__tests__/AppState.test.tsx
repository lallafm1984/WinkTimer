import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {AppState as NativeAppState, Text, View} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import type {AppStateStatus} from 'react-native';
import {AppStateProvider, useAppState} from '../AppState';

function AppStateHarness() {
  const app = useAppState();

  return (
    <View>
      <Text>{`screen:${app.screen}`}</Text>
      <Text>{`phase:${app.timer.phase}`}</Text>
      <Text>{`focus:${app.timer.focusDurationMs}`}</Text>
      <Text>{`mode:${app.statusDisplayMode}`}</Text>
      <Text>{`summaryFocus:${app.lastSummary?.focusDurationMs ?? 'none'}`}</Text>
      <Text>{`error:${app.finishError ?? 'none'}`}</Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="go-timer"
        onPress={() => {
          app.setScreen('timer');
        }}>
        timer
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="go-settings"
        onPress={() => {
          app.setScreen('settings');
        }}>
        settings
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="normal-mode"
        onPress={() => {
          app.setNormalTimerMode(true);
        }}>
        normal
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="start"
        onPress={app.startTimerSession}>
        start
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="not-looking"
        onPress={() => {
          app.setMockDetectionStatus('notLooking');
        }}>
        not looking
      </Text>
      <Text
        accessibilityRole="button"
        accessibilityLabel="finish"
        onPress={app.finishTimerSession}>
        finish
      </Text>
    </View>
  );
}

function hasText(renderer: ReactTestRenderer.ReactTestRenderer, text: string) {
  return renderer.root
    .findAllByType(Text)
    .some(node => node.props.children === text);
}

async function press(
  renderer: ReactTestRenderer.ReactTestRenderer,
  accessibilityLabel: string,
) {
  const button = renderer.root.find(
    node =>
      node.props.accessibilityLabel === accessibilityLabel &&
      typeof node.props.onPress === 'function',
  );

  await ReactTestRenderer.act(async () => {
    await button.props.onPress();
  });
}

describe('AppStateProvider app flow', () => {
  let nowMs = 0;
  let appStateListeners: Array<(status: AppStateStatus) => void> = [];

  beforeEach(async () => {
    jest.useFakeTimers();
    nowMs = 0;
    jest.spyOn(Date, 'now').mockImplementation(() => nowMs);
    appStateListeners = [];
    jest
      .spyOn(NativeAppState, 'addEventListener')
      .mockImplementation((_event, listener) => {
        appStateListeners.push(listener);
        return {remove: jest.fn()};
      });
    await AsyncStorage.clear();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  async function renderHarness() {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(
        <AppStateProvider>
          <AppStateHarness />
        </AppStateProvider>,
      );
    });

    return renderer!;
  }

  async function unmount(renderer: ReactTestRenderer.ReactTestRenderer) {
    await ReactTestRenderer.act(async () => {
      renderer.unmount();
    });
  }

  it('defaults to minimal status display mode', async () => {
    const renderer = await renderHarness();

    expect(hasText(renderer, 'mode:minimal')).toBe(true);

    await unmount(renderer);
  });

  it('pauses an active timer on app background even when another screen is selected', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'start');
    await press(renderer, 'not-looking');
    await press(renderer, 'go-settings');

    nowMs = 2000;
    await ReactTestRenderer.act(async () => {
      appStateListeners.forEach(listener => listener('background'));
    });

    expect(hasText(renderer, 'screen:settings')).toBe(true);
    expect(hasText(renderer, 'phase:manualPaused')).toBe(true);

    await unmount(renderer);
  });

  it('counts normal timer focus through finish before the first lifecycle tick', async () => {
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'normal-mode');
    await press(renderer, 'start');

    nowMs = 61000;
    await press(renderer, 'finish');

    expect(hasText(renderer, 'screen:summary')).toBe(true);
    expect(hasText(renderer, 'summaryFocus:60000')).toBe(true);

    await unmount(renderer);
  });

  it('keeps the timer retryable and shows an error when saving a summary fails', async () => {
    jest
      .spyOn(AsyncStorage, 'setItem')
      .mockRejectedValueOnce(new Error('storage unavailable'));
    const renderer = await renderHarness();

    nowMs = 1000;
    await press(renderer, 'go-timer');
    await press(renderer, 'start');
    await press(renderer, 'not-looking');

    nowMs = 61000;
    await press(renderer, 'finish');

    expect(hasText(renderer, 'screen:onboarding')).toBe(false);
    expect(hasText(renderer, 'screen:summary')).toBe(false);
    expect(hasText(renderer, 'phase:active')).toBe(true);
    expect(
      hasText(renderer, 'error:세션 저장에 실패했습니다. 다시 시도해 주세요.'),
    ).toBe(true);

    await unmount(renderer);
  });

  it('completes the session when save succeeds even if refreshing the session list fails', async () => {
    const renderer = await renderHarness();

    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockResolvedValueOnce(null)
      .mockRejectedValueOnce(new Error('list unavailable'));

    nowMs = 1000;
    await press(renderer, 'go-timer');
    await press(renderer, 'start');
    await press(renderer, 'not-looking');

    nowMs = 61000;
    await press(renderer, 'finish');

    expect(hasText(renderer, 'screen:summary')).toBe(true);
    expect(hasText(renderer, 'phase:ended')).toBe(true);
    expect(hasText(renderer, 'summaryFocus:60000')).toBe(true);
    expect(hasText(renderer, 'error:none')).toBe(true);

    await unmount(renderer);
  });
});
