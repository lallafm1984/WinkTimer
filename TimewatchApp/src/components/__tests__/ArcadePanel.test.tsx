import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {ArcadePanel} from '../ArcadePanel';

describe('ArcadePanel', () => {
  it('renders a titled console section', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ArcadePanel title="MODE SELECT">
          <Text>Look Pause</Text>
        </ArcadePanel>,
      );
    });

    expect(
      renderer!.root.findByProps({accessibilityRole: 'summary'}),
    ).toBeTruthy();
    expect(renderer!.root.findByProps({children: 'MODE SELECT'})).toBeTruthy();
    expect(renderer!.root.findByProps({children: 'Look Pause'})).toBeTruthy();
  });
});
