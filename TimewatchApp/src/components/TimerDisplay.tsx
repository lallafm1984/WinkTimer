import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {arcadeTheme} from '../theme/arcadeTheme';

type TimerDisplayProps = {
  accessibilityLabelPrefix?: string;
  durationMs: number;
  displayMode?: 'stopwatch' | 'timer';
  scale?: number;
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
  accessibilityLabelPrefix = 'Timer',
  durationMs,
  displayMode = 'stopwatch',
  scale = 1,
  size = 'large',
}: TimerDisplayProps) {
  const formatted =
    displayMode === 'timer'
      ? formatTimerDuration(durationMs)
      : formatDuration(durationMs);
  const baseTypography =
    size === 'medium'
      ? arcadeTheme.typography.timerMedium
      : arcadeTheme.typography.timerLarge;
  const scaledTypography =
    scale > 1
      ? {
          fontSize: Math.round((baseTypography.fontSize as number) * scale),
          lineHeight: Math.round((baseTypography.lineHeight as number) * scale),
        }
      : null;

  return (
    <Text
      adjustsFontSizeToFit
      minimumFontScale={0.72}
      numberOfLines={1}
      accessibilityLabel={`${accessibilityLabelPrefix} ${formatted}`}
      style={[
        styles.time,
        size === 'medium' && styles.medium,
        scaledTypography,
      ]}>
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
