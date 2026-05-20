import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import type {MockGazeDetector} from '../detection/GazeDetector';
import {createMockGazeDetector} from '../detection/GazeDetector';
import type {Sensitivity, StatusDisplayMode} from '../domain/detection';
import type {SessionSummary} from '../domain/session';
import {
  createInitialTimerState,
  type TimerState,
} from '../domain/timerEngine';
import type {SessionRepository} from '../storage/sessionRepository';
import {createSessionRepository} from '../storage/sessionRepository';

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
  repository: SessionRepository;
  gazeDetector: MockGazeDetector;
};

const AppStateContext = createContext<AppStateValue | undefined>(undefined);

type AppStateProviderProps = {
  children: ReactNode;
};

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
  const [timer, setTimer] = useState<TimerState>(() =>
    createInitialTimerState(Date.now()),
  );
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [sensitivity, setSensitivity] = useState<Sensitivity>('normal');
  const [statusDisplayMode, setStatusDisplayMode] =
    useState<StatusDisplayMode>('text');
  const [normalTimerMode, setNormalTimerMode] = useState(false);

  useEffect(() => {
    let isMounted = true;

    repository.list().then(items => {
      if (isMounted) {
        setSessions(items);
      }
    });

    return () => {
      isMounted = false;
    };
  }, [repository]);

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
      repository,
      gazeDetector,
    }),
    [
      screen,
      timer,
      sessions,
      lastSummary,
      sensitivity,
      statusDisplayMode,
      normalTimerMode,
      repository,
      gazeDetector,
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
