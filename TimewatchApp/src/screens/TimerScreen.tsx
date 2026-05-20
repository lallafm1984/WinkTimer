import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {StatusIndicator} from '../components/StatusIndicator';
import {TimerDisplay} from '../components/TimerDisplay';
import type {DetectionStatus} from '../domain/detection';
import type {TimerState} from '../domain/timerEngine';
import {useAppState} from '../state/AppState';

function canFinishTimer(timer: TimerState) {
  return timer.phase === 'active' || timer.phase === 'manualPaused';
}

function phaseLabel(phase: TimerState['phase']) {
  switch (phase) {
    case 'active':
      return '진행 중';
    case 'manualPaused':
      return '일시정지';
    case 'ended':
      return '완료됨';
    case 'idle':
    default:
      return '대기 중';
  }
}

export function TimerScreen() {
  const {
    timer,
    setScreen,
    statusDisplayMode,
    finishError,
    isFinishingSession,
    startTimerSession,
    resumeTimerSession,
    finishTimerSession,
    setMockDetectionStatus,
  } = useAppState();

  const handleFinish = () => {
    finishTimerSession();
  };

  const handleMockStatus = (status: DetectionStatus) => {
    setMockDetectionStatus(status);
  };

  const startLabel = timer.phase === 'ended' ? '새 타이머 시작' : '시작';
  const showResume = timer.phase === 'manualPaused';
  const canFinish = canFinishTimer(timer) && !isFinishingSession;

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <PrimaryButton
          label="기록"
          onPress={() => {
            setScreen('history');
          }}
          variant="secondary"
          style={styles.navButton}
        />
        <PrimaryButton
          label="설정"
          onPress={() => {
            setScreen('settings');
          }}
          variant="secondary"
          style={styles.navButton}
        />
      </View>

      <View style={styles.timerBlock}>
        <Text style={styles.phase}>{phaseLabel(timer.phase)}</Text>
        <TimerDisplay durationMs={timer.focusDurationMs} />
        <StatusIndicator
          mode={statusDisplayMode}
          status={timer.detectionStatus}
        />
        {finishError ? <Text style={styles.error}>{finishError}</Text> : null}
      </View>

      <View style={styles.controls}>
        {showResume ? (
          <PrimaryButton label="계속" onPress={resumeTimerSession} />
        ) : (
          <PrimaryButton
            label={startLabel}
            onPress={startTimerSession}
            disabled={timer.phase === 'active' || isFinishingSession}
          />
        )}
        <PrimaryButton
          label={isFinishingSession ? '저장 중' : '종료'}
          onPress={handleFinish}
          variant="secondary"
          disabled={!canFinish}
        />
      </View>

      <View style={styles.mockPanel}>
        <Text style={styles.mockTitle}>감지 상태</Text>
        <View style={styles.mockButtons}>
          <PrimaryButton
            label="안 봄"
            onPress={() => handleMockStatus('notLooking')}
            variant="secondary"
            style={styles.mockButton}
          />
          <PrimaryButton
            label="봄"
            onPress={() => handleMockStatus('looking')}
            variant="secondary"
            style={styles.mockButton}
          />
          <PrimaryButton
            label="불명"
            onPress={() => handleMockStatus('unknown')}
            variant="secondary"
            style={styles.mockButton}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  topBar: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'flex-end',
  },
  navButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  timerBlock: {
    alignItems: 'center',
    gap: 18,
  },
  phase: {
    color: '#5D6A62',
    fontSize: 15,
    fontWeight: '700',
  },
  error: {
    color: '#B42318',
    fontSize: 14,
    fontWeight: '700',
    lineHeight: 20,
    textAlign: 'center',
  },
  controls: {
    gap: 10,
  },
  mockPanel: {
    gap: 10,
  },
  mockTitle: {
    color: '#3D4942',
    fontSize: 14,
    fontWeight: '700',
  },
  mockButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  mockButton: {
    flex: 1,
    minHeight: 44,
    paddingHorizontal: 8,
  },
});
