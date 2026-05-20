import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {DetectionStatus, StatusDisplayMode} from '../domain/detection';

type StatusIndicatorProps = {
  status: DetectionStatus;
  mode: StatusDisplayMode;
};

const statusConfig: Record<
  DetectionStatus,
  {label: string; color: string; backgroundColor: string}
> = {
  notLooking: {
    label: '집중 중',
    color: '#1D4D3A',
    backgroundColor: '#E4F3EA',
  },
  looking: {
    label: '화면 봄',
    color: '#B45309',
    backgroundColor: '#FFF0D8',
  },
  unknown: {
    label: '상태 불명',
    color: '#667085',
    backgroundColor: '#EEF1F4',
  },
};

export function StatusIndicator({status, mode}: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <View
      accessibilityLabel={`감지 상태: ${config.label}`}
      accessibilityRole="summary"
      style={[
        styles.container,
        mode === 'minimal' ? styles.minimalContainer : styles.textContainer,
        {backgroundColor: config.backgroundColor},
      ]}>
      <View style={[styles.dot, {backgroundColor: config.color}]} />
      {mode === 'text' ? <Text style={styles.label}>{config.label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  minimalContainer: {
    borderRadius: 14,
    height: 28,
    paddingHorizontal: 10,
    width: 44,
  },
  textContainer: {
    borderRadius: 8,
    gap: 8,
    minHeight: 36,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dot: {
    borderRadius: 5,
    height: 10,
    width: 10,
  },
  label: {
    color: '#17201A',
    fontSize: 14,
    fontWeight: '700',
  },
});
