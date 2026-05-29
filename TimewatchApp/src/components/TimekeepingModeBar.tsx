import React from 'react';
import {Pressable, StyleSheet, Text, View} from 'react-native';
import type {TimekeepingMode} from '../domain/timekeeping';
import {arcadeTheme} from '../theme/arcadeTheme';

export type TimekeepingModeBarTarget = TimekeepingMode | 'alarm';

type TimekeepingModeBarProps = {
  activeTarget: TimekeepingModeBarTarget;
  stopwatchLabel: string;
  timerLabel: string;
  alarmLabel?: string;
  disabled?: boolean;
  onSelectStopwatch(): void;
  onSelectTimer(): void;
  onSelectAlarm(): void;
};

type TimekeepingModeBarButtonProps = {
  label: string;
  selected: boolean;
  disabled: boolean;
  buttonTestID: string;
  onPress(): void;
};

function TimekeepingModeBarButton({
  label,
  selected,
  disabled,
  buttonTestID,
  onPress,
}: TimekeepingModeBarButtonProps) {
  const canPress = !disabled;

  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={disabled ? {selected, disabled: true} : {selected}}
      disabled={disabled}
      onPress={canPress ? onPress : undefined}
      testID={buttonTestID}
      style={({pressed}) => [
        styles.button,
        selected ? styles.primaryButton : styles.secondaryButton,
        disabled && styles.disabledButton,
        pressed && canPress && styles.pressedButton,
        styles.choice,
      ]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.label,
          selected ? styles.primaryLabel : styles.secondaryLabel,
          disabled && styles.disabledLabel,
        ]}>
        {label}
      </Text>
    </Pressable>
  );
}

export function TimekeepingModeBar({
  activeTarget,
  stopwatchLabel,
  timerLabel,
  alarmLabel = 'ALARM',
  disabled = false,
  onSelectStopwatch,
  onSelectTimer,
  onSelectAlarm,
}: TimekeepingModeBarProps) {
  return (
    <View style={styles.container} testID="timekeeping-mode-options">
      <TimekeepingModeBarButton
        buttonTestID="timekeeping-stopwatch-button"
        disabled={disabled}
        label={stopwatchLabel}
        onPress={onSelectStopwatch}
        selected={activeTarget === 'stopwatch'}
      />
      <TimekeepingModeBarButton
        buttonTestID="timekeeping-timer-button"
        disabled={disabled}
        label={timerLabel}
        onPress={onSelectTimer}
        selected={activeTarget === 'timer'}
      />
      <TimekeepingModeBarButton
        buttonTestID="timekeeping-alarm-button"
        disabled={disabled}
        label={alarmLabel}
        onPress={onSelectAlarm}
        selected={activeTarget === 'alarm'}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    elevation: 70,
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    minHeight: 50,
    position: 'relative',
    zIndex: 70,
  },
  choice: {
    flex: 5,
    minHeight: 50,
    paddingHorizontal: arcadeTheme.spacing.xs,
  },
  button: {
    alignItems: 'center',
    borderRadius: arcadeTheme.radii.control,
    justifyContent: 'center',
    paddingVertical: arcadeTheme.spacing.xs,
  },
  primaryButton: {
    backgroundColor: '#1D4D3A',
  },
  secondaryButton: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.line,
    borderWidth: 1,
  },
  disabledButton: {
    opacity: 0.48,
  },
  pressedButton: {
    opacity: 0.82,
  },
  label: {
    fontSize: 17,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 20,
  },
  primaryLabel: {
    color: arcadeTheme.colors.panel,
  },
  secondaryLabel: {
    color: arcadeTheme.colors.ink,
  },
  disabledLabel: {
    color: arcadeTheme.colors.mutedInk,
  },
});
