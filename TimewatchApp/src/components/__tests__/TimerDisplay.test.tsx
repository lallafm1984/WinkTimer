import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {formatDuration, TimerDisplay} from '../TimerDisplay';

describe('formatDuration', () => {
  it('formats zero as minutes, seconds, and centiseconds', () => {
    expect(formatDuration(0)).toBe('00:00.00');
  });

  it('formats elapsed centiseconds with zero padding', () => {
    expect(formatDuration(61042)).toBe('01:01.04');
  });

  it('floors milliseconds to centiseconds', () => {
    expect(formatDuration(59999)).toBe('00:59.99');
  });

  it('clamps negative durations to zero', () => {
    expect(formatDuration(-250)).toBe('00:00.00');
  });
});

describe('TimerDisplay', () => {
  it('renders the formatted centisecond timer', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<TimerDisplay durationMs={65000} />);
    });

    const textNodes = renderer!.root.findAllByType(Text);

    expect(textNodes.some(node => node.props.children === '01:05.00')).toBe(
      true,
    );
  });

  it('sets an accessible timer label', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<TimerDisplay durationMs={9042} />);
    });

    expect(
      renderer!.root.findByProps({accessibilityLabel: '타이머 00:09.04'}),
    ).toBeTruthy();
  });
});
