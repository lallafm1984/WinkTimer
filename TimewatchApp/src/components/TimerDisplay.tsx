import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {arcadeTheme} from '../theme/arcadeTheme';

type TimerDisplayProps = {
  durationMs: number;
  size?: 'large' | 'medium';
};

export function formatDuration(durationMs: number): string {
  const clampedMs = Math.max(0, Math.floor(durationMs));
  const totalSeconds = Math.floor(clampedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((clampedMs % 1000) / 10);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0',
  )}.${String(centiseconds).padStart(2, '0')}`;
}

export function TimerDisplay({durationMs, size = 'large'}: TimerDisplayProps) {
  const formatted = formatDuration(durationMs);

  return (
    <Text
      adjustsFontSizeToFit
      minimumFontScale={0.72}
      numberOfLines={1}
      accessibilityLabel={`타이머 ${formatted}`}
      style={[styles.time, size === 'medium' && styles.medium]}>
      {formatted}
    </Text>
  );
}

const styles = StyleSheet.create({
  time: {
    ...arcadeTheme.typography.timerLarge,
    textAlign: 'center',
  },
  medium: {
    ...arcadeTheme.typography.timerMedium,
  },
});
