import AsyncStorage from '@react-native-async-storage/async-storage';
import React from 'react';
import {Text} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {AppStateProvider} from '../../state/AppState';
import {HistoryScreen} from '../HistoryScreen';

function flattenText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(flattenText).join('');
  }

  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

describe('HistoryScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.restoreAllMocks();
    jest.useRealTimers();
  });

  it('shows a non-crashing error state when session refresh fails', async () => {
    jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValue(new Error('storage unavailable'));
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    try {
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <AppStateProvider>
            <HistoryScreen />
          </AppStateProvider>,
        );
      });

      await ReactTestRenderer.act(async () => {
        await Promise.resolve();
      });

      const textContent = renderer!.root
        .findAllByType(Text)
        .map(node => flattenText(node.props.children))
        .join(' ');

      expect(textContent).toContain('기록을 불러오지 못했습니다.');
    } finally {
      if (renderer) {
        await ReactTestRenderer.act(async () => {
          renderer!.unmount();
        });
      }
    }
  });
});
