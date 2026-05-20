import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {TimerDisplay} from '../components/TimerDisplay';
import {useAppState} from '../state/AppState';

export function SessionSummaryScreen() {
  const {lastSummary, setScreen} = useAppState();

  if (lastSummary === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>완료된 세션이 없습니다.</Text>
        <PrimaryButton
          label="타이머로 돌아가기"
          onPress={() => {
            setScreen('timer');
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>세션 요약</Text>
      <Text style={styles.title}>이번 집중 시간</Text>

      <View style={styles.metricHero}>
        <TimerDisplay durationMs={lastSummary.focusDurationMs} />
      </View>

      <View style={styles.metrics}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>멈춘 시간</Text>
          <TimerDisplay
            durationMs={lastSummary.lookPausedDurationMs}
            size="medium"
          />
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>멈춤 횟수</Text>
          <Text style={styles.metricValue}>{lastSummary.lookPauseCount}회</Text>
        </View>
      </View>

      <PrimaryButton
        label="타이머로 돌아가기"
        onPress={() => {
          setScreen('timer');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  eyebrow: {
    color: '#406455',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    color: '#121A14',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 36,
    marginBottom: 28,
  },
  metricHero: {
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  metrics: {
    borderColor: '#DCE2DE',
    borderTopWidth: 1,
    gap: 16,
    marginBottom: 28,
    paddingTop: 20,
  },
  metricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: '#5D6A62',
    fontSize: 16,
    fontWeight: '700',
  },
  metricValue: {
    color: '#121A14',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
});
