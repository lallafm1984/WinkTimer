import React from 'react';
import {StyleSheet, Text} from 'react-native';

type TimerDisplayProps = {
  durationMs: number;
  size?: 'large' | 'medium';
};

export function formatDuration(durationMs: number): string {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function TimerDisplay({durationMs, size = 'large'}: TimerDisplayProps) {
  return (
    <Text
      accessibilityLabel={`타이머 ${formatDuration(durationMs)}`}
      style={[styles.time, size === 'medium' && styles.medium]}>
      {formatDuration(durationMs)}
    </Text>
  );
}

const styles = StyleSheet.create({
  time: {
    color: '#121A14',
    fontSize: 64,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 74,
  },
  medium: {
    fontSize: 32,
    lineHeight: 40,
  },
});
