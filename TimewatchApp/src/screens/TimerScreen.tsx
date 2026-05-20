import React, {useCallback, useEffect, useRef} from 'react';
import {
  AppState as NativeAppState,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {StatusIndicator} from '../components/StatusIndicator';
import {TimerDisplay} from '../components/TimerDisplay';
import type {DetectionStatus} from '../domain/detection';
import {
  applyDetection,
  createInitialTimerState,
  endTimer,
  markTimerEnded,
  pauseTimer,
  resumeTimer,
  startTimer,
  tickTimer,
  type TimerState,
} from '../domain/timerEngine';
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
    setTimer,
    setScreen,
    setSessions,
    setLastSummary,
    sensitivity,
    statusDisplayMode,
    normalTimerMode,
    repository,
    gazeDetector,
  } = useAppState();
  const timerRef = useRef(timer);
  const sensitivityRef = useRef(sensitivity);
  const normalTimerModeRef = useRef(normalTimerMode);
  const gazeDetectorRef = useRef(gazeDetector);
  const isFinishingRef = useRef(false);

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    normalTimerModeRef.current = normalTimerMode;
  }, [normalTimerMode]);

  useEffect(() => {
    gazeDetectorRef.current = gazeDetector;
  }, [gazeDetector]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();

      setTimer(current => {
        if (current.phase !== 'active') {
          return current;
        }

        const activeSensitivity = sensitivityRef.current;
        const reading = normalTimerModeRef.current
          ? {status: 'notLooking' as const, confidence: 1, atMs: now}
          : gazeDetectorRef.current.getLatestReading(now);

        return tickTimer(
          applyDetection(current, reading, activeSensitivity),
          now,
          activeSensitivity,
        );
      });
    }, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [setTimer]);

  useEffect(() => {
    const subscription = NativeAppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        const now = Date.now();

        setTimer(current =>
          pauseTimer(current, now, sensitivityRef.current),
        );
      }
    });

    return () => {
      subscription.remove();
    };
  }, [setTimer]);

  const handleStart = useCallback(() => {
    const now = Date.now();
    setTimer(startTimer(createInitialTimerState(now), now, undefined));
  }, [setTimer]);

  const handleResume = useCallback(() => {
    const now = Date.now();
    setTimer(current => resumeTimer(current, now));
  }, [setTimer]);

  const handleFinish = useCallback(async () => {
    const currentTimer = timerRef.current;

    if (!canFinishTimer(currentTimer) || isFinishingRef.current) {
      return;
    }

    isFinishingRef.current = true;

    const now = Date.now();
    const activeSensitivity = sensitivityRef.current;
    const summary = endTimer(
      currentTimer,
      now,
      activeSensitivity,
      normalTimerModeRef.current,
    );

    setTimer(markTimerEnded(currentTimer, now, activeSensitivity));

    try {
      await repository.save(summary);
      const nextSessions = await repository.list();

      setSessions(nextSessions);
      setLastSummary(summary);
      setScreen('summary');
    } finally {
      isFinishingRef.current = false;
    }
  }, [repository, setLastSummary, setScreen, setSessions, setTimer]);

  const handleMockStatus = useCallback(
    (status: DetectionStatus) => {
      const now = Date.now();

      gazeDetector.setMockStatus(status);
      setTimer(current =>
        applyDetection(
          current,
          {status, confidence: status === 'unknown' ? 0 : 1, atMs: now},
          sensitivityRef.current,
        ),
      );
    },
    [gazeDetector, setTimer],
  );

  const startLabel = timer.phase === 'ended' ? '새 타이머 시작' : '시작';
  const showResume = timer.phase === 'manualPaused';

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
      </View>

      <View style={styles.controls}>
        {showResume ? (
          <PrimaryButton label="계속" onPress={handleResume} />
        ) : (
          <PrimaryButton
            label={startLabel}
            onPress={handleStart}
            disabled={timer.phase === 'active'}
          />
        )}
        <PrimaryButton
          label="종료"
          onPress={handleFinish}
          variant="secondary"
          disabled={!canFinishTimer(timer)}
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
