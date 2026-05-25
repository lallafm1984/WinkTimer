import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {arcadeTheme} from '../theme/arcadeTheme';

type TimerDisplayProps = {
  durationMs: number;
  displayMode?: 'stopwatch' | 'timer';
  size?: 'large' | 'medium';
};

export function formatDuration(durationMs: number): string {
  const clampedMs = Math.max(0, Math.floor(durationMs));
  const totalSeconds = Math.floor(clampedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes =
    hours > 0
      ? Math.floor((totalSeconds % 3600) / 60)
      : Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((clampedMs % 1000) / 10);
  const minuteSecondText = `${String(minutes).padStart(2, '0')}:${String(
    seconds,
  ).padStart(2, '0')}`;

  if (hours > 0) {
    return `${hours}:${minuteSecondText}.${String(centiseconds).padStart(
      2,
      '0',
    )}`;
  }

  return `${minuteSecondText}.${String(centiseconds).padStart(2, '0')}`;
}

export function formatTimerDuration(durationMs: number): string {
  const clampedMs = Math.max(0, durationMs);
  const totalSeconds = Math.ceil(clampedMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes =
    hours > 0
      ? Math.floor((totalSeconds % 3600) / 60)
      : Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const minuteSecondText = `${String(minutes).padStart(2, '0')}:${String(
    seconds,
  ).padStart(2, '0')}`;

  return hours > 0 ? `${hours}:${minuteSecondText}` : minuteSecondText;
}

export function TimerDisplay({
  durationMs,
  displayMode = 'stopwatch',
  size = 'large',
}: TimerDisplayProps) {
  const formatted =
    displayMode === 'timer'
      ? formatTimerDuration(durationMs)
      : formatDuration(durationMs);

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
