import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {TimerDisplay} from '../TimerDisplay';

describe('TimerDisplay', () => {
  it('formats durations as zero-padded minutes and seconds', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<TimerDisplay durationMs={65000} />);
    });

    const textNodes = renderer!.root.findAllByType(Text);

    expect(textNodes.some(node => node.props.children === '01:05')).toBe(true);
  });

  it('floors partial seconds', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<TimerDisplay durationMs={59999} />);
    });

    const textNodes = renderer!.root.findAllByType(Text);

    expect(textNodes.some(node => node.props.children === '00:59')).toBe(true);
  });
});
