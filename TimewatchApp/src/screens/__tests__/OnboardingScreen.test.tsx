import React from 'react';
import {Text} from 'react-native';
import ReactTestRenderer from 'react-test-renderer';
import {AppStateProvider} from '../../state/AppState';
import {OnboardingScreen} from '../OnboardingScreen';

function flattenText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(flattenText).join('');
  }

  return typeof value === 'string' || typeof value === 'number'
    ? String(value)
    : '';
}

describe('OnboardingScreen', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('explicitly says video, image, and face data are not stored or uploaded', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    try {
      await ReactTestRenderer.act(async () => {
        renderer = ReactTestRenderer.create(
          <AppStateProvider>
            <OnboardingScreen />
          </AppStateProvider>,
        );
      });

      const textContent = renderer!.root
        .findAllByType(Text)
        .map(node => flattenText(node.props.children))
        .join(' ');

      expect(textContent).toContain(
        '영상, 이미지, 얼굴 데이터는 저장하거나 업로드하지 않습니다.',
      );
    } finally {
      if (renderer) {
        await ReactTestRenderer.act(async () => {
          renderer!.unmount();
        });
      }
    }
  });
});
