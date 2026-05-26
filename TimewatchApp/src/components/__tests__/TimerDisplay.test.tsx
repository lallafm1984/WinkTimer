import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {formatDuration, formatTimerDuration, TimerDisplay} from '../TimerDisplay';

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

  it('keeps the stopwatch display compact until one hour', () => {
    expect(formatDuration(59 * 60 * 1000 + 59990)).toBe('59:59.99');
  });

  it('adds an hour digit to the stopwatch display after one hour', () => {
    expect(formatDuration(60 * 60 * 1000)).toBe('1:00:00.00');
    expect(formatDuration(61 * 60 * 1000 + 1042)).toBe('1:01:01.04');
  });

  it('clamps negative durations to zero', () => {
    expect(formatDuration(-250)).toBe('00:00.00');
  });
});

describe('formatTimerDuration', () => {
  it('keeps the timer display compact until one hour', () => {
    expect(formatTimerDuration(59 * 60 * 1000 + 59000)).toBe('59:59');
  });

  it('adds an hour digit to timer durations at one hour', () => {
    expect(formatTimerDuration(60 * 60 * 1000)).toBe('1:00:00');
    expect(formatTimerDuration(3661000)).toBe('1:01:01');
  });

  it('rounds remaining milliseconds up to the next visible second', () => {
    expect(formatTimerDuration(59999)).toBe('01:00');
    expect(formatTimerDuration(3661958)).toBe('1:01:02');
  });

  it('clamps negative timer durations to zero', () => {
    expect(formatTimerDuration(-250)).toBe('00:00');
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
      renderer!.root.findByProps({accessibilityLabel: 'Timer 00:09.04'}),
    ).toBeTruthy();
  });

  it('uses a localized accessible timer label prefix', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <TimerDisplay
          accessibilityLabelPrefix="타이머"
          durationMs={9042}
        />,
      );
    });

    expect(
      renderer!.root.findByProps({accessibilityLabel: '타이머 00:09.04'}),
    ).toBeTruthy();
  });

  it('renders timer mode without milliseconds and with conditional hours', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <TimerDisplay durationMs={3661958} displayMode="timer" />,
      );
    });

    const textNodes = renderer!.root.findAllByType(Text);

    expect(textNodes.some(node => node.props.children === '1:01:02')).toBe(
      true,
    );
  });
});
