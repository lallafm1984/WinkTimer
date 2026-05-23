import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import {AppState as NativeAppState} from 'react-native';
import type {
  DevicePosture,
  DevicePostureDetector,
} from '../detection/DevicePostureDetector';
import {createDevicePostureDetector} from '../detection/DevicePostureDetector';
import type {MockGazeDetector} from '../detection/GazeDetector';
import {createMockGazeDetector} from '../detection/GazeDetector';
import type {
  DetectionReading,
  DetectionFrameIntervalLevel,
  DetectionResolutionLevel,
  DetectionStatus,
  LookAngleLevel,
  Sensitivity,
  StatusDisplayMode,
  WinkDistanceLevel,
  WinkMinTimeLevel,
  WinkSensitivityLevel,
  WinkTimeLevel,
} from '../domain/detection';
import {
  DEFAULT_LOOK_ANGLE_LEVEL,
  DEFAULT_DETECTION_FRAME_INTERVAL_LEVEL,
  DEFAULT_DETECTION_RESOLUTION_LEVEL,
  DEFAULT_WINK_DISTANCE_LEVEL,
  DEFAULT_WINK_MIN_TIME_LEVEL,
  DEFAULT_WINK_SENSITIVITY_LEVEL,
  DEFAULT_WINK_TIME_LEVEL,
} from '../domain/detection';
import type {SessionSummary} from '../domain/session';
import {
  createSessionHistoryEvent,
  getSessionHistoryEventType,
  type SessionHistoryEvent,
} from '../domain/sessionHistory';
import {
  applyDetectionWithBehavior,
  createInitialTimerState,
  endTimer,
  markTimerEnded,
  pauseTimer,
  resetTimer,
  resumeTimer,
  startTimer,
  tickTimerWithBehavior,
  type TimerBehavior,
  type TimerState,
} from '../domain/timerEngine';
import {
  modeUsesLookPause,
  modeUsesLeftWinkPause,
  modeUsesLeftWinkResume,
  modeUsesLeftWinkStart,
  modeHasLap,
  modeRunsWithoutGaze,
  modeUsesDeviceFlip,
  modeUsesRightWinkLap,
  modeUsesRightWinkReset,
  type TimerModeId,
} from '../domain/timerMode';
import type {SessionRepository} from '../storage/sessionRepository';
import {createSessionRepository} from '../storage/sessionRepository';

const FINISH_ERROR_MESSAGE = '세션 저장에 실패했습니다. 다시 시도해 주세요.';

export type AppScreen =
  | 'onboarding'
  | 'timer'
  | 'summary'
  | 'history'
  | 'settings';

type AppStateValue = {
  screen: AppScreen;
  setScreen: React.Dispatch<React.SetStateAction<AppScreen>>;
  timer: TimerState;
  setTimer: React.Dispatch<React.SetStateAction<TimerState>>;
  sessions: SessionSummary[];
  setSessions: React.Dispatch<React.SetStateAction<SessionSummary[]>>;
  lastSummary: SessionSummary | null;
  setLastSummary: React.Dispatch<React.SetStateAction<SessionSummary | null>>;
  sessionHistory: SessionHistoryEvent[];
  sensitivity: Sensitivity;
  setSensitivity: React.Dispatch<React.SetStateAction<Sensitivity>>;
  winkSensitivityLevel: WinkSensitivityLevel;
  setWinkSensitivityLevel: React.Dispatch<
    React.SetStateAction<WinkSensitivityLevel>
  >;
  winkDistanceLevel: WinkDistanceLevel;
  setWinkDistanceLevel: React.Dispatch<
    React.SetStateAction<WinkDistanceLevel>
  >;
  lookAngleLevel: LookAngleLevel;
  setLookAngleLevel: React.Dispatch<React.SetStateAction<LookAngleLevel>>;
  winkTimeLevel: WinkTimeLevel;
  setWinkTimeLevel: React.Dispatch<React.SetStateAction<WinkTimeLevel>>;
  winkMinTimeLevel: WinkMinTimeLevel;
  setWinkMinTimeLevel: React.Dispatch<
    React.SetStateAction<WinkMinTimeLevel>
  >;
  detectionResolutionLevel: DetectionResolutionLevel;
  setDetectionResolutionLevel: React.Dispatch<
    React.SetStateAction<DetectionResolutionLevel>
  >;
  detectionFrameIntervalLevel: DetectionFrameIntervalLevel;
  setDetectionFrameIntervalLevel: React.Dispatch<
    React.SetStateAction<DetectionFrameIntervalLevel>
  >;
  statusDisplayMode: StatusDisplayMode;
  setStatusDisplayMode: React.Dispatch<React.SetStateAction<StatusDisplayMode>>;
  normalTimerMode: boolean;
  setNormalTimerMode: React.Dispatch<React.SetStateAction<boolean>>;
  timerModeId: TimerModeId;
  setTimerModeId: React.Dispatch<React.SetStateAction<TimerModeId>>;
  finishError: string | null;
  isFinishingSession: boolean;
  repository: SessionRepository;
  gazeDetector: MockGazeDetector;
  startTimerSession(): void;
  pauseTimerSession(): void;
  resumeTimerSession(): void;
  resetTimerSession(): void;
  recordLapSession(): void;
  finishTimerSession(): Promise<void>;
  setMockDetectionStatus(status: DetectionStatus): void;
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

const TIMER_TICK_MS = 50;
const WINK_EXPRESSION_MS = 800;

type AppStateProviderProps = {
  children: ReactNode;
};

function formatsAsZeroHistoryDuration(durationMs: number) {
  return Math.floor(Math.max(0, durationMs) / 10) === 0;
}

function canFinishTimer(timer: TimerState) {
  return timer.phase === 'active' || timer.phase === 'manualPaused';
}

function canRecordLapTimer(
  timer: TimerState,
  modeId: TimerModeId,
  normalTimerMode: boolean,
) {
  if (timer.phase !== 'active' || timer.isLookPaused || !modeHasLap(modeId)) {
    return false;
  }

  if (normalTimerMode || modeRunsWithoutGaze(modeId)) {
    return true;
  }

  if (modeUsesLookPause(modeId) && timer.detectionStatus === 'looking') {
    return false;
  }

  return timer.detectionStatus !== 'unknown';
}

function normalizeNormalTimerState(
  state: TimerState,
  normalTimerMode: boolean,
): TimerState {
  if (!normalTimerMode || state.phase !== 'active') {
    return state;
  }

  return {
    ...state,
    detectionStatus: 'notLooking',
    eyeState: 'unknown',
    winkSide: null,
    lookingStartedAtMs: null,
    isLookPaused: false,
    oneEyeClosedStartedAtMs: null,
    oneEyeResetArmed: true,
  };
}

function getTimerBehavior(modeId: TimerModeId): TimerBehavior {
  return {
    lookPauseEnabled: modeUsesLookPause(modeId),
  };
}

function markRecognizedWink(
  state: TimerState,
  reading: DetectionReading,
): TimerState {
  if (reading.winkSide === undefined) {
    return state;
  }

  return {
    ...state,
    recentWinkSide: reading.winkSide,
    recentWinkAtMs: reading.atMs,
  };
}

function expireRecognizedWink(state: TimerState, nowMs: number): TimerState {
  if (
    state.recentWinkAtMs === null ||
    nowMs - state.recentWinkAtMs <= WINK_EXPRESSION_MS
  ) {
    return state;
  }

  return {
    ...state,
    recentWinkSide: null,
    recentWinkAtMs: null,
  };
}

function canListenForLeftWinkAction(timer: TimerState, modeId: TimerModeId) {
  return (
    (modeUsesLeftWinkStart(modeId) &&
      (timer.phase === 'idle' || timer.phase === 'ended')) ||
    (modeUsesLeftWinkResume(modeId) && timer.phase === 'manualPaused')
  );
}

function canResetFromRightWink(timer: TimerState, modeId: TimerModeId) {
  return (
    modeUsesRightWinkReset(modeId) &&
    (timer.phase === 'manualPaused' ||
      (timer.phase === 'active' && timer.isLookPaused))
  );
}

function applyLeftWinkActionGesture(
  state: TimerState,
  reading: DetectionReading,
): TimerState {
  if (reading.atMs < state.lastUpdatedAtMs) {
    return state;
  }

  const eyeState = reading.eyeState ?? 'unknown';

  if (state.phase === 'manualPaused') {
    return markRecognizedWink(
      {
        ...resumeTimer(state, reading.atMs),
        detectionStatus: reading.status,
        eyeState,
        winkSide: reading.winkSide ?? null,
        oneEyeClosedStartedAtMs: null,
        oneEyeResetArmed: false,
      },
      reading,
    );
  }

  if (state.phase === 'idle' || state.phase === 'ended') {
    return markRecognizedWink(
      {
        ...startTimer(
          createInitialTimerState(reading.atMs),
          reading.atMs,
          state.targetDurationMs ?? undefined,
        ),
        detectionStatus: reading.status,
        eyeState,
        winkSide: reading.winkSide ?? null,
        oneEyeClosedStartedAtMs: null,
        oneEyeResetArmed: false,
      },
      reading,
    );
  }

  return state;
}

function applyRightWinkResetGesture(
  state: TimerState,
  reading: DetectionReading,
): TimerState {
  return markRecognizedWink(
    resetTimer(
      {
        ...state,
        detectionStatus: reading.status,
        eyeState: reading.eyeState ?? 'unknown',
        winkSide: reading.winkSide ?? null,
      },
      reading.atMs,
    ),
    reading,
  );
}

function applyDeviceFlipAction(
  state: TimerState,
  posture: DevicePosture,
  nowMs: number,
  sensitivity: Sensitivity,
): TimerState {
  if (posture === 'faceDown') {
    if (state.phase === 'manualPaused') {
      return resumeTimer(state, nowMs);
    }

    if (state.phase === 'idle' || state.phase === 'ended') {
      return startTimer(
        createInitialTimerState(nowMs),
        nowMs,
        state.targetDurationMs ?? undefined,
      );
    }
  }

  if (state.phase === 'active' && posture !== 'faceDown') {
    return pauseTimer(state, nowMs, sensitivity);
  }

  return state;
}

function handleAppBackgroundTimerState(
  state: TimerState,
  nowMs: number,
  sensitivity: Sensitivity,
  normalTimerMode: boolean,
  modeId: TimerModeId,
): TimerState {
  if (
    normalTimerMode ||
    modeUsesLookPause(modeId) ||
    modeRunsWithoutGaze(modeId)
  ) {
    return pauseTimer(state, nowMs, sensitivity);
  }

  return applyDetectionWithBehavior(
    state,
    {status: 'unknown', confidence: 0, atMs: nowMs},
    sensitivity,
    getTimerBehavior(modeId),
  );
}

export function AppStateProvider({children}: AppStateProviderProps) {
  const repositoryRef = useRef<SessionRepository | null>(null);
  const gazeDetectorRef = useRef<MockGazeDetector | null>(null);
  const devicePostureDetectorRef = useRef<DevicePostureDetector | null>(null);

  if (repositoryRef.current === null) {
    repositoryRef.current = createSessionRepository();
  }

  if (gazeDetectorRef.current === null) {
    gazeDetectorRef.current = createMockGazeDetector('unknown');
  }

  if (devicePostureDetectorRef.current === null) {
    devicePostureDetectorRef.current = createDevicePostureDetector();
  }

  const repository = repositoryRef.current;
  const gazeDetector = gazeDetectorRef.current;
  const devicePostureDetector = devicePostureDetectorRef.current;
  const [screen, setScreen] = useState<AppScreen>('onboarding');
  const [timer, setTimerInternal] = useState<TimerState>(() =>
    createInitialTimerState(Date.now()),
  );
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryEvent[]>(
    [],
  );
  const [sensitivity, setSensitivity] = useState<Sensitivity>('normal');
  const [winkSensitivityLevel, setWinkSensitivityLevel] =
    useState<WinkSensitivityLevel>(DEFAULT_WINK_SENSITIVITY_LEVEL);
  const [winkDistanceLevel, setWinkDistanceLevel] =
    useState<WinkDistanceLevel>(DEFAULT_WINK_DISTANCE_LEVEL);
  const [lookAngleLevel, setLookAngleLevel] =
    useState<LookAngleLevel>(DEFAULT_LOOK_ANGLE_LEVEL);
  const [winkTimeLevel, setWinkTimeLevel] =
    useState<WinkTimeLevel>(DEFAULT_WINK_TIME_LEVEL);
  const [winkMinTimeLevel, setWinkMinTimeLevel] =
    useState<WinkMinTimeLevel>(DEFAULT_WINK_MIN_TIME_LEVEL);
  const [detectionResolutionLevel, setDetectionResolutionLevel] =
    useState<DetectionResolutionLevel>(DEFAULT_DETECTION_RESOLUTION_LEVEL);
  const [detectionFrameIntervalLevel, setDetectionFrameIntervalLevel] =
    useState<DetectionFrameIntervalLevel>(
      DEFAULT_DETECTION_FRAME_INTERVAL_LEVEL,
    );
  const [statusDisplayMode, setStatusDisplayMode] =
    useState<StatusDisplayMode>('minimal');
  const [normalTimerMode, setNormalTimerMode] = useState(false);
  const [timerModeId, setTimerModeId] = useState<TimerModeId>('lookPause');
  const [finishError, setFinishError] = useState<string | null>(null);
  const [isFinishingSession, setIsFinishingSession] = useState(false);
  const [isAppForeground, setIsAppForeground] = useState(true);
  const timerRef = useRef(timer);
  const previousTimerForHistoryRef = useRef(timer);
  const screenRef = useRef(screen);
  const sensitivityRef = useRef(sensitivity);
  const normalTimerModeRef = useRef(normalTimerMode);
  const timerModeIdRef = useRef(timerModeId);
  const isFinishingRef = useRef(false);

  const setTimer = useCallback<React.Dispatch<React.SetStateAction<TimerState>>>(
    action => {
      setTimerInternal(current => {
        const next =
          typeof action === 'function'
            ? (action as (value: TimerState) => TimerState)(current)
            : action;

        timerRef.current = next;
        return next;
      });
    },
    [],
  );

  const appendSessionHistoryEvent = useCallback(
    (
      eventType: SessionHistoryEvent['type'],
      atMs: number,
      elapsedMs: number,
    ) => {
      setSessionHistory(currentHistory => {
        if (
          eventType === 'START' &&
          formatsAsZeroHistoryDuration(elapsedMs)
        ) {
          return [];
        }

        if (formatsAsZeroHistoryDuration(elapsedMs)) {
          return currentHistory;
        }

        const previousEvent = currentHistory[currentHistory.length - 1];
        const nextEvent = createSessionHistoryEvent(
          eventType,
          atMs,
          elapsedMs,
          previousEvent,
        );

        return eventType === 'START'
          ? [nextEvent]
          : [...currentHistory, nextEvent];
      });
    },
    [],
  );

  useEffect(() => {
    timerRef.current = timer;
  }, [timer]);

  useEffect(() => {
    screenRef.current = screen;
  }, [screen]);

  useEffect(() => {
    const previousTimer = previousTimerForHistoryRef.current;
    previousTimerForHistoryRef.current = timer;

    const eventType = getSessionHistoryEventType(previousTimer, timer, {
      treatLookingAsStopped: modeUsesLookPause(timerModeId),
    });
    if (eventType === null) {
      return;
    }

    appendSessionHistoryEvent(
      eventType,
      timer.lastUpdatedAtMs,
      timer.focusDurationMs,
    );
  }, [appendSessionHistoryEvent, timer, timerModeId]);

  useEffect(() => {
    sensitivityRef.current = sensitivity;
  }, [sensitivity]);

  useEffect(() => {
    gazeDetector.setWinkSensitivity(winkSensitivityLevel).catch(() => undefined);
  }, [gazeDetector, winkSensitivityLevel]);

  useEffect(() => {
    gazeDetector.setWinkDistanceLevel(winkDistanceLevel).catch(() => undefined);
  }, [gazeDetector, winkDistanceLevel]);

  useEffect(() => {
    gazeDetector.setLookAngleLevel(lookAngleLevel).catch(() => undefined);
  }, [gazeDetector, lookAngleLevel]);

  useEffect(() => {
    gazeDetector
      .setDetectionResolutionLevel(detectionResolutionLevel)
      .catch(() => undefined);
  }, [detectionResolutionLevel, gazeDetector]);

  useEffect(() => {
    gazeDetector
      .setDetectionFrameIntervalLevel(detectionFrameIntervalLevel)
      .catch(() => undefined);
  }, [detectionFrameIntervalLevel, gazeDetector]);

  useEffect(() => {
    gazeDetector.setWinkTimeLevel(winkTimeLevel);
  }, [gazeDetector, winkTimeLevel]);

  useEffect(() => {
    gazeDetector.setWinkMinTimeLevel(winkMinTimeLevel);
  }, [gazeDetector, winkMinTimeLevel]);

  useEffect(() => {
    normalTimerModeRef.current = normalTimerMode;
  }, [normalTimerMode]);

  useEffect(() => {
    timerModeIdRef.current = timerModeId;
  }, [timerModeId]);

  useEffect(() => {
    let isMounted = true;

    repository
      .list()
      .then(items => {
        if (isMounted) {
          setSessions(items);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [repository]);

  useEffect(() => {
    const intervalId = setInterval(() => {
      const now = Date.now();

      setTimer(current => {
        const currentForTick = expireRecognizedWink(current, now);
        const activeTimerModeId = timerModeIdRef.current;
        const activeSensitivity = sensitivityRef.current;
        const gestureInputsEnabled = screenRef.current !== 'settings';
        const activeModeUsesDeviceFlip =
          gestureInputsEnabled && modeUsesDeviceFlip(activeTimerModeId);
        const activeModeRunsWithoutGaze =
          normalTimerModeRef.current || modeRunsWithoutGaze(activeTimerModeId);

        if (currentForTick.phase !== 'active') {
          if (activeModeUsesDeviceFlip) {
            const withPostureAction = applyDeviceFlipAction(
              currentForTick,
              devicePostureDetector.getLatestPosture(),
              now,
              activeSensitivity,
            );

            if (withPostureAction !== currentForTick) {
              return withPostureAction;
            }
          }

          if (activeModeRunsWithoutGaze || !gestureInputsEnabled) {
            return currentForTick;
          }

          const listensForLeftWink = canListenForLeftWinkAction(
            currentForTick,
            activeTimerModeId,
          );
          const listensForRightWink = canResetFromRightWink(
            currentForTick,
            activeTimerModeId,
          );
          const consumedSingleWink =
            listensForLeftWink || listensForRightWink
            ? gazeDetector.consumeSingleWink(now)
            : null;

          if (
            consumedSingleWink?.winkSide === 'left' &&
            listensForLeftWink
          ) {
            return applyLeftWinkActionGesture(currentForTick, consumedSingleWink);
          }

          if (
            consumedSingleWink?.winkSide === 'right' &&
            listensForRightWink
          ) {
            return applyRightWinkResetGesture(currentForTick, consumedSingleWink);
          }

          return currentForTick;
        }

        if (activeModeUsesDeviceFlip) {
          const withPostureAction = applyDeviceFlipAction(
            currentForTick,
            devicePostureDetector.getLatestPosture(),
            now,
            activeSensitivity,
          );

          if (withPostureAction !== currentForTick) {
            return withPostureAction;
          }
        }

        const activeBehavior = getTimerBehavior(activeTimerModeId);
        const listensForActiveLeftWink =
          gestureInputsEnabled &&
          !activeModeRunsWithoutGaze &&
          modeUsesLeftWinkPause(activeTimerModeId);
        const listensForActiveRightWinkReset =
          gestureInputsEnabled &&
          !activeModeRunsWithoutGaze &&
          modeUsesRightWinkReset(activeTimerModeId);
        const listensForActiveRightWinkLap =
          gestureInputsEnabled &&
          !activeModeRunsWithoutGaze &&
          modeUsesRightWinkLap(activeTimerModeId);
        const consumedSingleWink =
          listensForActiveLeftWink ||
          listensForActiveRightWinkReset ||
          listensForActiveRightWinkLap
            ? gazeDetector.consumeSingleWink(now)
            : null;
        const reading = consumedSingleWink ?? gazeDetector.getLatestReading(now);
        const withDetection = activeModeRunsWithoutGaze || !gestureInputsEnabled
          ? normalizeNormalTimerState(currentForTick, true)
          : applyDetectionWithBehavior(
              currentForTick,
              reading,
              activeSensitivity,
              activeBehavior,
            );

        if (
          consumedSingleWink?.winkSide === 'right' &&
          listensForActiveRightWinkLap &&
          currentForTick.oneEyeResetArmed
        ) {
          const timerForLap = tickTimerWithBehavior(
            withDetection,
            now,
            activeSensitivity,
            activeBehavior,
          );

          if (
            canRecordLapTimer(
              timerForLap,
              activeTimerModeId,
              normalTimerModeRef.current,
            )
          ) {
            appendSessionHistoryEvent('LAP', now, timerForLap.focusDurationMs);
          }

          return markRecognizedWink(timerForLap, consumedSingleWink);
        }

        if (
          consumedSingleWink?.winkSide === 'right' &&
          listensForActiveRightWinkReset &&
          withDetection.isLookPaused
        ) {
          return applyRightWinkResetGesture(withDetection, consumedSingleWink);
        }

        if (
          consumedSingleWink?.winkSide === 'left' &&
          listensForActiveLeftWink &&
          currentForTick.oneEyeResetArmed
        ) {
          return markRecognizedWink(
            pauseTimer(withDetection, now, activeSensitivity),
            consumedSingleWink,
          );
        }

        const next = tickTimerWithBehavior(
          withDetection,
          now,
          activeSensitivity,
          activeBehavior,
        );

        if (
          currentForTick.startedAtMs !== null &&
          next.startedAtMs !== currentForTick.startedAtMs &&
          next.oneEyeResetArmed === false
        ) {
          gazeDetector.suppressSingleWinkUntilOpen();
        }

        return next;
      });
    }, TIMER_TICK_MS);

    return () => {
      clearInterval(intervalId);
    };
  }, [appendSessionHistoryEvent, devicePostureDetector, gazeDetector, setTimer]);

  const shouldRunGazeDetector =
    screen !== 'settings' &&
    isAppForeground &&
    !normalTimerMode &&
    !modeRunsWithoutGaze(timerModeId) &&
    (timer.phase === 'active' ||
      canResetFromRightWink(timer, timerModeId) ||
      canListenForLeftWinkAction(timer, timerModeId));

  const shouldRunDevicePostureDetector =
    screen !== 'settings' &&
    isAppForeground &&
    modeUsesDeviceFlip(timerModeId);

  useEffect(() => {
    if (!shouldRunGazeDetector) {
      return;
    }

    let isCancelled = false;

    gazeDetector.start().catch(() => {
      if (isCancelled) {
        return;
      }

      const now = Date.now();
      setTimer(current =>
        applyDetectionWithBehavior(
          current,
          {status: 'unknown', confidence: 0, atMs: now},
          sensitivityRef.current,
          getTimerBehavior(timerModeIdRef.current),
        ),
      );
    });

    return () => {
      isCancelled = true;
      gazeDetector.stop().catch(() => undefined);
    };
  }, [gazeDetector, setTimer, shouldRunGazeDetector]);

  useEffect(() => {
    if (!shouldRunDevicePostureDetector) {
      return;
    }

    devicePostureDetector.start().catch(() => undefined);

    return () => {
      devicePostureDetector.stop().catch(() => undefined);
    };
  }, [devicePostureDetector, shouldRunDevicePostureDetector]);

  useEffect(() => {
    const subscription = NativeAppState.addEventListener('change', nextState => {
      setIsAppForeground(nextState === 'active');

      if (nextState !== 'active') {
        const now = Date.now();

        setTimer(current =>
          handleAppBackgroundTimerState(
            current,
            now,
            sensitivityRef.current,
            normalTimerModeRef.current,
            timerModeIdRef.current,
          ),
        );
      }
    });

    return () => {
      subscription.remove();
    };
  }, [setTimer]);

  const startTimerSession = useCallback(() => {
    const now = Date.now();

    setFinishError(null);
    setTimer(startTimer(createInitialTimerState(now), now, undefined));
  }, [setTimer]);

  const pauseTimerSession = useCallback(() => {
    const now = Date.now();

    setFinishError(null);
    setTimer(current => pauseTimer(current, now, sensitivityRef.current));
  }, [setTimer]);

  const resumeTimerSession = useCallback(() => {
    const now = Date.now();

    setFinishError(null);
    setTimer(current => resumeTimer(current, now));
  }, [setTimer]);

  const resetTimerSession = useCallback(() => {
    const now = Date.now();

    setFinishError(null);
    setTimer(current => resetTimer(current, now));
  }, [setTimer]);

  const recordLapSession = useCallback(() => {
    const now = Date.now();
    const activeModeId = timerModeIdRef.current;
    const activeNormalTimerMode = normalTimerModeRef.current;
    const activeModeRunsWithoutGaze = modeRunsWithoutGaze(activeModeId);
    const activeSensitivity = sensitivityRef.current;
    const currentTimer = normalizeNormalTimerState(
      timerRef.current,
      activeNormalTimerMode || activeModeRunsWithoutGaze,
    );
    const timerForLap = tickTimerWithBehavior(
      currentTimer,
      now,
      activeSensitivity,
      getTimerBehavior(activeModeId),
    );

    if (!canRecordLapTimer(timerForLap, activeModeId, activeNormalTimerMode)) {
      return;
    }

    setFinishError(null);
    setTimer(timerForLap);
    appendSessionHistoryEvent('LAP', now, timerForLap.focusDurationMs);
  }, [appendSessionHistoryEvent, setTimer]);

  const setMockDetectionStatus = useCallback(
    (status: DetectionStatus) => {
      const now = Date.now();

      gazeDetector.setMockStatus(status);
      setFinishError(null);
      setTimer(current =>
        applyDetectionWithBehavior(
          current,
          {status, confidence: status === 'unknown' ? 0 : 1, atMs: now},
          sensitivityRef.current,
          getTimerBehavior(timerModeIdRef.current),
        ),
      );
    },
    [gazeDetector, setTimer],
  );

  const finishTimerSession = useCallback(async () => {
    const currentTimer = timerRef.current;

    if (!canFinishTimer(currentTimer) || isFinishingRef.current) {
      return;
    }

    isFinishingRef.current = true;
    setIsFinishingSession(true);
    setFinishError(null);

    const now = Date.now();
    const activeSensitivity = sensitivityRef.current;
    const activeNormalTimerMode = normalTimerModeRef.current;
    const timerForSummary = normalizeNormalTimerState(
      currentTimer,
      activeNormalTimerMode,
    );
    const summary = endTimer(
      timerForSummary,
      now,
      activeSensitivity,
      activeNormalTimerMode,
    );

    try {
      await repository.save(summary);

      setLastSummary(summary);
      setTimer(markTimerEnded(timerForSummary, now, activeSensitivity));
      setScreen('summary');
      repository
        .list()
        .then(nextSessions => {
          setSessions(nextSessions);
        })
        .catch(() => undefined);
    } catch {
      setFinishError(FINISH_ERROR_MESSAGE);
    } finally {
      isFinishingRef.current = false;
      setIsFinishingSession(false);
    }
  }, [repository, setTimer]);

  const value = useMemo<AppStateValue>(
    () => ({
      screen,
      setScreen,
      timer,
      setTimer,
      sessions,
      setSessions,
      lastSummary,
      setLastSummary,
      sessionHistory,
      sensitivity,
      winkSensitivityLevel,
      setWinkSensitivityLevel,
      winkDistanceLevel,
      setWinkDistanceLevel,
      lookAngleLevel,
      setLookAngleLevel,
      winkTimeLevel,
      setWinkTimeLevel,
      winkMinTimeLevel,
      setWinkMinTimeLevel,
      detectionResolutionLevel,
      setDetectionResolutionLevel,
      detectionFrameIntervalLevel,
      setDetectionFrameIntervalLevel,
      setSensitivity,
      statusDisplayMode,
      setStatusDisplayMode,
      normalTimerMode,
      setNormalTimerMode,
      timerModeId,
      setTimerModeId,
      finishError,
      isFinishingSession,
      repository,
      gazeDetector,
      startTimerSession,
      pauseTimerSession,
      resumeTimerSession,
      resetTimerSession,
      recordLapSession,
      finishTimerSession,
      setMockDetectionStatus,
    }),
    [
      screen,
      timer,
      sessions,
      lastSummary,
      sessionHistory,
      sensitivity,
      winkSensitivityLevel,
      winkDistanceLevel,
      lookAngleLevel,
      winkTimeLevel,
      winkMinTimeLevel,
      detectionResolutionLevel,
      detectionFrameIntervalLevel,
      statusDisplayMode,
      normalTimerMode,
      timerModeId,
      finishError,
      isFinishingSession,
      repository,
      gazeDetector,
      setTimer,
      startTimerSession,
      pauseTimerSession,
      resumeTimerSession,
      resetTimerSession,
      recordLapSession,
      finishTimerSession,
      setMockDetectionStatus,
    ],
  );

  return (
    <AppStateContext.Provider value={value}>
      {children}
    </AppStateContext.Provider>
  );
}

export function useAppState() {
  const context = useContext(AppStateContext);

  if (context === undefined) {
    throw new Error('useAppState must be used within AppStateProvider');
  }

  return context;
}
