import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {DetectionStatus, StatusDisplayMode} from '../domain/detection';
import {arcadeTheme} from '../theme/arcadeTheme';

type StatusIndicatorProps = {
  status: DetectionStatus;
  mode: StatusDisplayMode;
};

type StatusConfig = {
  label: string;
  color: string;
  backgroundColor: string;
};

const ACCESSIBILITY_LABEL_PREFIX = '\uAC10\uC9C0 \uC0C1\uD0DC';

const statusConfig: Record<DetectionStatus, StatusConfig> = {
  notLooking: {
    label: 'FOCUS RUN',
    color: arcadeTheme.colors.success,
    backgroundColor: arcadeTheme.colors.panel,
  },
  looking: {
    label: 'LOOK PAUSE',
    color: arcadeTheme.colors.warning,
    backgroundColor: '#FFF7E8',
  },
  unknown: {
    label: 'SCANNING',
    color: arcadeTheme.colors.mutedInk,
    backgroundColor: arcadeTheme.colors.panelMuted,
  },
};

export function StatusIndicator({status, mode}: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <View
      accessibilityLabel={`${ACCESSIBILITY_LABEL_PREFIX}: ${config.label}`}
      accessibilityRole="summary"
      style={[
        styles.container,
        mode === 'minimal' ? styles.minimalContainer : styles.textContainer,
        {backgroundColor: config.backgroundColor},
      ]}>
      <View style={[styles.dot, {backgroundColor: config.color}]} />
      {mode === 'text' ? (
        <Text style={[styles.label, {color: config.color}]}>{config.label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderColor: arcadeTheme.colors.heavyLine,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  minimalContainer: {
    borderRadius: arcadeTheme.radii.round,
    height: 28,
    paddingHorizontal: arcadeTheme.spacing.sm,
    width: 44,
  },
  textContainer: {
    borderRadius: arcadeTheme.radii.control,
    gap: arcadeTheme.spacing.sm,
    minHeight: 36,
    paddingHorizontal: arcadeTheme.spacing.md,
    paddingVertical: arcadeTheme.spacing.sm,
  },
  dot: {
    borderRadius: arcadeTheme.radii.round,
    height: 10,
    width: 10,
  },
  label: {
    ...arcadeTheme.typography.label,
  },
});
