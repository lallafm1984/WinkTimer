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
import type {MockGazeDetector} from '../detection/GazeDetector';
import {createMockGazeDetector} from '../detection/GazeDetector';
import type {
  DetectionStatus,
  Sensitivity,
  StatusDisplayMode,
} from '../domain/detection';
import type {SessionSummary} from '../domain/session';
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
  sensitivity: Sensitivity;
  setSensitivity: React.Dispatch<React.SetStateAction<Sensitivity>>;
  statusDisplayMode: StatusDisplayMode;
  setStatusDisplayMode: React.Dispatch<React.SetStateAction<StatusDisplayMode>>;
  normalTimerMode: boolean;
  setNormalTimerMode: React.Dispatch<React.SetStateAction<boolean>>;
  finishError: string | null;
  isFinishingSession: boolean;
  repository: SessionRepository;
  gazeDetector: MockGazeDetector;
  startTimerSession(): void;
  resumeTimerSession(): void;
  finishTimerSession(): Promise<void>;
  setMockDetectionStatus(status: DetectionStatus): void;
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

type AppStateProviderProps = {
  children: ReactNode;
};

function canFinishTimer(timer: TimerState) {
  return timer.phase === 'active' || timer.phase === 'manualPaused';
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
    lookingStartedAtMs: null,
    isLookPaused: false,
  };
}

export function AppStateProvider({children}: AppStateProviderProps) {
  const repositoryRef = useRef<SessionRepository | null>(null);
  const gazeDetectorRef = useRef<MockGazeDetector | null>(null);

  if (repositoryRef.current === null) {
    repositoryRef.current = createSessionRepository();
  }

  if (gazeDetectorRef.current === null) {
    gazeDetectorRef.current = createMockGazeDetector('unknown');
  }

  const repository = repositoryRef.current;
  const gazeDetector = gazeDetectorRef.current;
  const [screen, setScreen] = useState<AppScreen>('onboarding');
  const [timer, setTimerInternal] = useState<TimerState>(() =>
    createInitialTimerState(Date.now()),
  );
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [sensitivity, setSensitivity] = useState<Sensitivity>('normal');
  const [statusDisplayMode, setStatusDisplayMode] =
    useState<StatusDisplayMode>('minimal');
  const [normalTimerMode, setNormalTimerMode] = useState(false);
  const [finishError, setFinishError] = useState<string | null>(null);
  const [isFinishingSession, setIsFinishingSession] = useState(false);
  const timerRef = useRef(timer);
  const sensitivityRef = useRef(sensitivity);
  const normalTimerModeRef = useRef(normalTimerMode);
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
        if (current.phase !== 'active') {
          return current;
        }

        const activeSensitivity = sensitivityRef.current;
        const withDetection = normalTimerModeRef.current
          ? normalizeNormalTimerState(current, true)
          : applyDetection(
              current,
              gazeDetector.getLatestReading(now),
              activeSensitivity,
            );

        return tickTimer(withDetection, now, activeSensitivity);
      });
    }, 500);

    return () => {
      clearInterval(intervalId);
    };
  }, [gazeDetector, setTimer]);

  useEffect(() => {
    const subscription = NativeAppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        const now = Date.now();

        setTimer(current => pauseTimer(current, now, sensitivityRef.current));
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

  const resumeTimerSession = useCallback(() => {
    const now = Date.now();

    setFinishError(null);
    setTimer(current => resumeTimer(current, now));
  }, [setTimer]);

  const setMockDetectionStatus = useCallback(
    (status: DetectionStatus) => {
      const now = Date.now();

      gazeDetector.setMockStatus(status);
      setFinishError(null);
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
      sensitivity,
      setSensitivity,
      statusDisplayMode,
      setStatusDisplayMode,
      normalTimerMode,
      setNormalTimerMode,
      finishError,
      isFinishingSession,
      repository,
      gazeDetector,
      startTimerSession,
      resumeTimerSession,
      finishTimerSession,
      setMockDetectionStatus,
    }),
    [
      screen,
      timer,
      sessions,
      lastSummary,
      sensitivity,
      statusDisplayMode,
      normalTimerMode,
      finishError,
      isFinishingSession,
      repository,
      gazeDetector,
      setTimer,
      startTimerSession,
      resumeTimerSession,
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
