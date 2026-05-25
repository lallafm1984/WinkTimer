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
import AsyncStorage from '@react-native-async-storage/async-storage';
import { AppState as NativeAppState } from 'react-native';
import type {
  DevicePosture,
  DevicePostureDetector,
} from '../detection/DevicePostureDetector';
import { createDevicePostureDetector } from '../detection/DevicePostureDetector';
import type { MockGazeDetector } from '../detection/GazeDetector';
import { createMockGazeDetector } from '../detection/GazeDetector';
import type {
  DetectionReading,
  DetectionFrameIntervalLevel,
  DetectionPerformanceMode,
  DetectionResolutionLevel,
  DetectionStatus,
  FaceHeightAngleLevel,
  LookAngleLevel,
  Sensitivity,
  StatusDisplayMode,
  WinkDistanceLevel,
  WinkEyeClosedThreshold,
  WinkEyeProbabilityGapThreshold,
  WinkMaxDurationMs,
  WinkMinDurationMs,
  WinkMinTimeLevel,
  WinkTimeLevel,
} from '../domain/detection';
import {
  DEFAULT_LOOK_ANGLE_LEVEL,
  DEFAULT_FACE_HEIGHT_ANGLE_LEVEL,
  DEFAULT_DETECTION_FRAME_INTERVAL_LEVEL,
  DEFAULT_DETECTION_PERFORMANCE_MODE,
  DEFAULT_DETECTION_RESOLUTION_LEVEL,
  DEFAULT_WINK_EYE_CLOSED_THRESHOLD,
  DEFAULT_WINK_EYE_PROBABILITY_GAP_THRESHOLD,
  DEFAULT_WINK_DISTANCE_LEVEL,
  DEFAULT_WINK_MAX_DURATION_MS,
  DEFAULT_WINK_MIN_DURATION_MS,
  DEFAULT_WINK_MIN_TIME_LEVEL,
  DEFAULT_WINK_TIME_LEVEL,
  normalizeDetectionFrameIntervalLevel,
  normalizeDetectionPerformanceMode,
  normalizeDetectionResolutionLevel,
  normalizeFaceHeightAngleLevel,
  normalizeLookAngleLevel,
  normalizeWinkDistanceLevel,
  normalizeWinkEyeClosedThreshold,
  normalizeWinkEyeProbabilityGapThreshold,
} from '../domain/detection';
import type { SessionSummary } from '../domain/session';
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
  DEFAULT_TIMER_TARGET_DURATION_MS,
  normalizeTimekeepingMode,
  normalizeTimerTargetDurationMs,
  type TimekeepingMode,
} from '../domain/timekeeping';
import {
  modeUsesLookPause,
  modeHasLap,
  modeRunsWithoutGaze,
  modeUsesDeviceFlip,
  modeUsesWinkLap,
  modeUsesWinkPause,
  modeUsesWinkReset,
  modeUsesWinkResume,
  modeUsesWinkStart,
  timerModePresets,
  type TimerModeId,
  type WinkGestureSide,
} from '../domain/timerMode';
import type { SessionRepository } from '../storage/sessionRepository';
import { createSessionRepository } from '../storage/sessionRepository';

const SETTINGS_STORAGE_KEY = '@timewatch:settings:v1';

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
  winkLeftEyeClosedThreshold: WinkEyeClosedThreshold;
  setWinkLeftEyeClosedThreshold: React.Dispatch<
    React.SetStateAction<WinkEyeClosedThreshold>
  >;
  winkRightEyeClosedThreshold: WinkEyeClosedThreshold;
  setWinkRightEyeClosedThreshold: React.Dispatch<
    React.SetStateAction<WinkEyeClosedThreshold>
  >;
  winkLeftEyeProbabilityGapThreshold: WinkEyeProbabilityGapThreshold;
  setWinkLeftEyeProbabilityGapThreshold: React.Dispatch<
    React.SetStateAction<WinkEyeProbabilityGapThreshold>
  >;
  winkRightEyeProbabilityGapThreshold: WinkEyeProbabilityGapThreshold;
  setWinkRightEyeProbabilityGapThreshold: React.Dispatch<
    React.SetStateAction<WinkEyeProbabilityGapThreshold>
  >;
  winkDistanceLevel: WinkDistanceLevel;
  setWinkDistanceLevel: React.Dispatch<React.SetStateAction<WinkDistanceLevel>>;
  lookAngleLevel: LookAngleLevel;
  setLookAngleLevel: React.Dispatch<React.SetStateAction<LookAngleLevel>>;
  faceHeightAngleLevel: FaceHeightAngleLevel;
  setFaceHeightAngleLevel: React.Dispatch<
    React.SetStateAction<FaceHeightAngleLevel>
  >;
  winkTimeLevel: WinkTimeLevel;
  setWinkTimeLevel: React.Dispatch<React.SetStateAction<WinkTimeLevel>>;
  winkMaxDurationMs: WinkMaxDurationMs;
  setWinkMaxDurationMs: React.Dispatch<
    React.SetStateAction<WinkMaxDurationMs>
  >;
  winkMinTimeLevel: WinkMinTimeLevel;
  setWinkMinTimeLevel: React.Dispatch<React.SetStateAction<WinkMinTimeLevel>>;
  winkMinDurationMs: WinkMinDurationMs;
  setWinkMinDurationMs: React.Dispatch<
    React.SetStateAction<WinkMinDurationMs>
  >;
  detectionResolutionLevel: DetectionResolutionLevel;
  setDetectionResolutionLevel: React.Dispatch<
    React.SetStateAction<DetectionResolutionLevel>
  >;
  detectionFrameIntervalLevel: DetectionFrameIntervalLevel;
  setDetectionFrameIntervalLevel: React.Dispatch<
    React.SetStateAction<DetectionFrameIntervalLevel>
  >;
  detectionPerformanceMode: DetectionPerformanceMode;
  setDetectionPerformanceMode: React.Dispatch<
    React.SetStateAction<DetectionPerformanceMode>
  >;
  statusDisplayMode: StatusDisplayMode;
  setStatusDisplayMode: React.Dispatch<React.SetStateAction<StatusDisplayMode>>;
  normalTimerMode: boolean;
  setNormalTimerMode: React.Dispatch<React.SetStateAction<boolean>>;
  timekeepingMode: TimekeepingMode;
  setTimekeepingMode(mode: TimekeepingMode): void;
  timerTargetDurationMs: number;
  setTimerTargetDurationMs(durationMs: number): void;
  timerModeId: TimerModeId;
  setTimerModeId: React.Dispatch<React.SetStateAction<TimerModeId>>;
  gestureInputsBlocked: boolean;
  setGestureInputsBlocked: React.Dispatch<React.SetStateAction<boolean>>;
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
const WINK_CONTROL_FACE_HEIGHT_ANGLE_LEVEL: FaceHeightAngleLevel = 1;

type AppStateProviderProps = {
  children: ReactNode;
};

type PersistedSettings = {
  sensitivity: Sensitivity;
  statusDisplayMode: StatusDisplayMode;
  normalTimerMode: boolean;
  timekeepingMode: TimekeepingMode;
  timerTargetDurationMs: number;
  timerModeId: TimerModeId;
  winkLeftEyeClosedThreshold: WinkEyeClosedThreshold;
  winkRightEyeClosedThreshold: WinkEyeClosedThreshold;
  winkLeftEyeProbabilityGapThreshold: WinkEyeProbabilityGapThreshold;
  winkRightEyeProbabilityGapThreshold: WinkEyeProbabilityGapThreshold;
  winkDistanceLevel: WinkDistanceLevel;
  lookAngleLevel: LookAngleLevel;
  faceHeightAngleLevel: FaceHeightAngleLevel;
  winkTimeLevel: WinkTimeLevel;
  winkMaxDurationMs: WinkMaxDurationMs;
  winkMinTimeLevel: WinkMinTimeLevel;
  winkMinDurationMs: WinkMinDurationMs;
  detectionResolutionLevel: DetectionResolutionLevel;
  detectionFrameIntervalLevel: DetectionFrameIntervalLevel;
  detectionPerformanceMode: DetectionPerformanceMode;
};

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStoredNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function normalizeStoredStatusDisplayMode(value: unknown): StatusDisplayMode {
  return value === 'text' || value === 'minimal' ? value : 'minimal';
}

function normalizeStoredBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeStoredTimerModeId(value: unknown): TimerModeId {
  return timerModePresets.some(mode => mode.id === value)
    ? (value as TimerModeId)
    : 'lookPause';
}

function normalizeStoredSettings(value: unknown): PersistedSettings | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    sensitivity: 'strict',
    statusDisplayMode: normalizeStoredStatusDisplayMode(
      value.statusDisplayMode,
    ),
    normalTimerMode: normalizeStoredBoolean(value.normalTimerMode, false),
    timekeepingMode: normalizeTimekeepingMode(value.timekeepingMode),
    timerTargetDurationMs: normalizeTimerTargetDurationMs(
      value.timerTargetDurationMs,
    ),
    timerModeId: normalizeStoredTimerModeId(value.timerModeId),
    winkLeftEyeClosedThreshold: normalizeWinkEyeClosedThreshold(
      normalizeStoredNumber(
        value.winkLeftEyeClosedThreshold,
        DEFAULT_WINK_EYE_CLOSED_THRESHOLD,
      ),
    ),
    winkRightEyeClosedThreshold: normalizeWinkEyeClosedThreshold(
      normalizeStoredNumber(
        value.winkRightEyeClosedThreshold,
        DEFAULT_WINK_EYE_CLOSED_THRESHOLD,
      ),
    ),
    winkLeftEyeProbabilityGapThreshold: normalizeWinkEyeProbabilityGapThreshold(
      normalizeStoredNumber(
        value.winkLeftEyeProbabilityGapThreshold ??
          value.winkEyeProbabilityGapThreshold,
        DEFAULT_WINK_EYE_PROBABILITY_GAP_THRESHOLD,
      ),
    ),
    winkRightEyeProbabilityGapThreshold: normalizeWinkEyeProbabilityGapThreshold(
      normalizeStoredNumber(
        value.winkRightEyeProbabilityGapThreshold ??
          value.winkEyeProbabilityGapThreshold,
        DEFAULT_WINK_EYE_PROBABILITY_GAP_THRESHOLD,
      ),
    ),
    winkDistanceLevel: normalizeWinkDistanceLevel(
      normalizeStoredNumber(
        value.winkDistanceLevel,
        DEFAULT_WINK_DISTANCE_LEVEL,
      ),
    ),
    lookAngleLevel: normalizeLookAngleLevel(
      normalizeStoredNumber(value.lookAngleLevel, DEFAULT_LOOK_ANGLE_LEVEL),
    ),
    faceHeightAngleLevel: normalizeFaceHeightAngleLevel(
      normalizeStoredNumber(
        value.faceHeightAngleLevel,
        DEFAULT_FACE_HEIGHT_ANGLE_LEVEL,
      ),
    ),
    winkTimeLevel: DEFAULT_WINK_TIME_LEVEL,
    winkMaxDurationMs: DEFAULT_WINK_MAX_DURATION_MS,
    winkMinTimeLevel: DEFAULT_WINK_MIN_TIME_LEVEL,
    winkMinDurationMs: DEFAULT_WINK_MIN_DURATION_MS,
    detectionResolutionLevel: normalizeDetectionResolutionLevel(
      normalizeStoredNumber(
        value.detectionResolutionLevel,
        DEFAULT_DETECTION_RESOLUTION_LEVEL,
      ),
    ),
    detectionFrameIntervalLevel: normalizeDetectionFrameIntervalLevel(
      normalizeStoredNumber(
        value.detectionFrameIntervalLevel,
        DEFAULT_DETECTION_FRAME_INTERVAL_LEVEL,
      ),
    ),
    detectionPerformanceMode: normalizeDetectionPerformanceMode(
      value.detectionPerformanceMode,
    ),
  };
}

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

function applyPassiveWinkDetectionState(
  state: TimerState,
  reading: DetectionReading,
): TimerState {
  if (reading.atMs < state.lastUpdatedAtMs) {
    return state;
  }

  const eyeState = reading.eyeState ?? 'unknown';
  const tracksOneEyeClosure =
    reading.status === 'looking' &&
    eyeState === 'oneEyeClosed' &&
    reading.winkSide !== undefined;

  return {
    ...state,
    lastUpdatedAtMs: reading.atMs,
    detectionStatus: reading.status,
    eyeState,
    winkSide: tracksOneEyeClosure ? reading.winkSide ?? null : null,
    oneEyeClosedStartedAtMs: tracksOneEyeClosure
      ? state.oneEyeClosedStartedAtMs ?? reading.atMs
      : null,
    oneEyeResetArmed: tracksOneEyeClosure ? state.oneEyeResetArmed : true,
  };
}

function getLiveWinkActionReading(
  state: TimerState,
  reading: DetectionReading,
): DetectionReading | null {
  if (
    reading.status !== 'looking' ||
    reading.eyeState !== 'oneEyeClosed' ||
    reading.winkSide === undefined
  ) {
    return null;
  }

  if (
    state.detectionStatus !== 'looking' ||
    state.eyeState !== 'bothOpen' ||
    !state.oneEyeResetArmed ||
    reading.atMs < state.lastUpdatedAtMs
  ) {
    return null;
  }

  return reading;
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

function disarmHeldWinkAction(
  state: TimerState,
  reading: DetectionReading,
): TimerState {
  if (reading.eyeState !== 'oneEyeClosed') {
    return state;
  }

  return {
    ...state,
    oneEyeResetArmed: false,
  };
}

function canListenForWinkAction(
  timer: TimerState,
  modeId: TimerModeId,
  side: WinkGestureSide,
) {
  return (
    (modeUsesWinkStart(modeId, side) &&
      (timer.phase === 'idle' || timer.phase === 'ended')) ||
    (modeUsesWinkResume(modeId, side) && timer.phase === 'manualPaused')
  );
}

function canResetFromWink(
  timer: TimerState,
  modeId: TimerModeId,
  side: WinkGestureSide,
) {
  return (
    modeUsesWinkReset(modeId, side) &&
    (timer.phase === 'manualPaused' ||
      (timer.phase === 'active' && timer.isLookPaused))
  );
}

function applyWinkActionGesture(
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

function applyWinkResetGesture(
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
    { status: 'unknown', confidence: 0, atMs: nowMs },
    sensitivity,
    getTimerBehavior(modeId),
  );
}

export function AppStateProvider({ children }: AppStateProviderProps) {
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
  const [sensitivity, setSensitivityState] = useState<Sensitivity>('strict');
  const [winkLeftEyeClosedThreshold, setWinkLeftEyeClosedThreshold] =
    useState<WinkEyeClosedThreshold>(DEFAULT_WINK_EYE_CLOSED_THRESHOLD);
  const [winkRightEyeClosedThreshold, setWinkRightEyeClosedThreshold] =
    useState<WinkEyeClosedThreshold>(DEFAULT_WINK_EYE_CLOSED_THRESHOLD);
  const [
    winkLeftEyeProbabilityGapThreshold,
    setWinkLeftEyeProbabilityGapThreshold,
  ] = useState<WinkEyeProbabilityGapThreshold>(
    DEFAULT_WINK_EYE_PROBABILITY_GAP_THRESHOLD,
  );
  const [
    winkRightEyeProbabilityGapThreshold,
    setWinkRightEyeProbabilityGapThreshold,
  ] = useState<WinkEyeProbabilityGapThreshold>(
    DEFAULT_WINK_EYE_PROBABILITY_GAP_THRESHOLD,
  );
  const [winkDistanceLevel, setWinkDistanceLevel] = useState<WinkDistanceLevel>(
    DEFAULT_WINK_DISTANCE_LEVEL,
  );
  const [lookAngleLevel, setLookAngleLevel] = useState<LookAngleLevel>(
    DEFAULT_LOOK_ANGLE_LEVEL,
  );
  const [faceHeightAngleLevel, setFaceHeightAngleLevel] =
    useState<FaceHeightAngleLevel>(DEFAULT_FACE_HEIGHT_ANGLE_LEVEL);
  const [winkTimeLevel, setWinkTimeLevelState] = useState<WinkTimeLevel>(
    DEFAULT_WINK_TIME_LEVEL,
  );
  const [winkMaxDurationMs, setWinkMaxDurationMsState] =
    useState<WinkMaxDurationMs>(DEFAULT_WINK_MAX_DURATION_MS);
  const [winkMinTimeLevel, setWinkMinTimeLevelState] = useState<WinkMinTimeLevel>(
    DEFAULT_WINK_MIN_TIME_LEVEL,
  );
  const [winkMinDurationMs, setWinkMinDurationMsState] =
    useState<WinkMinDurationMs>(DEFAULT_WINK_MIN_DURATION_MS);
  const [detectionResolutionLevel, setDetectionResolutionLevel] =
    useState<DetectionResolutionLevel>(DEFAULT_DETECTION_RESOLUTION_LEVEL);
  const [detectionFrameIntervalLevel, setDetectionFrameIntervalLevel] =
    useState<DetectionFrameIntervalLevel>(
      DEFAULT_DETECTION_FRAME_INTERVAL_LEVEL,
    );
  const [detectionPerformanceMode, setDetectionPerformanceMode] =
    useState<DetectionPerformanceMode>(DEFAULT_DETECTION_PERFORMANCE_MODE);
  const [statusDisplayMode, setStatusDisplayMode] =
    useState<StatusDisplayMode>('minimal');
  const [normalTimerMode, setNormalTimerMode] = useState(false);
  const [timekeepingMode, setTimekeepingModeState] =
    useState<TimekeepingMode>('stopwatch');
  const [timerTargetDurationMs, setTimerTargetDurationMsState] =
    useState(DEFAULT_TIMER_TARGET_DURATION_MS);
  const [timerModeId, setTimerModeIdState] =
    useState<TimerModeId>('lookPause');
  const [finishError, setFinishError] = useState<string | null>(null);
  const [isFinishingSession, setIsFinishingSession] = useState(false);
  const [isAppForeground, setIsAppForeground] = useState(true);
  const [gestureInputsBlocked, setGestureInputsBlocked] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const timerRef = useRef(timer);
  const previousTimerForHistoryRef = useRef(timer);
  const screenRef = useRef(screen);
  const sensitivityRef = useRef(sensitivity);
  const normalTimerModeRef = useRef(normalTimerMode);
  const timekeepingModeRef = useRef(timekeepingMode);
  const timerTargetDurationMsRef = useRef(timerTargetDurationMs);
  const timerModeIdRef = useRef(timerModeId);
  const gestureInputsBlockedRef = useRef(gestureInputsBlocked);
  const isFinishingRef = useRef(false);
  const skippedInitialSettingsSaveRef = useRef(false);

  const setTimer = useCallback<
    React.Dispatch<React.SetStateAction<TimerState>>
  >(action => {
    setTimerInternal(current => {
      const next =
        typeof action === 'function'
          ? (action as (value: TimerState) => TimerState)(current)
          : action;

      timerRef.current = next;
      return next;
    });
  }, []);

  const setSensitivity = useCallback<
    React.Dispatch<React.SetStateAction<Sensitivity>>
  >(_action => {
    setSensitivityState('strict');
  }, []);

  const setWinkTimeLevel = useCallback<
    React.Dispatch<React.SetStateAction<WinkTimeLevel>>
  >(_action => {
    setWinkTimeLevelState(DEFAULT_WINK_TIME_LEVEL);
  }, []);

  const setWinkMaxDurationMs = useCallback<
    React.Dispatch<React.SetStateAction<WinkMaxDurationMs>>
  >(_action => {
    setWinkMaxDurationMsState(DEFAULT_WINK_MAX_DURATION_MS);
  }, []);

  const setWinkMinTimeLevel = useCallback<
    React.Dispatch<React.SetStateAction<WinkMinTimeLevel>>
  >(_action => {
    setWinkMinTimeLevelState(DEFAULT_WINK_MIN_TIME_LEVEL);
  }, []);

  const setWinkMinDurationMs = useCallback<
    React.Dispatch<React.SetStateAction<WinkMinDurationMs>>
  >(_action => {
    setWinkMinDurationMsState(DEFAULT_WINK_MIN_DURATION_MS);
  }, []);

  useEffect(() => {
    let isMounted = true;

    AsyncStorage.getItem(SETTINGS_STORAGE_KEY)
      .then(raw => {
        if (!isMounted || raw === null) {
          return;
        }

        const nextSettings = normalizeStoredSettings(JSON.parse(raw));
        if (nextSettings === null) {
          return;
        }

        setSensitivity(nextSettings.sensitivity);
        setStatusDisplayMode(nextSettings.statusDisplayMode);
        setNormalTimerMode(nextSettings.normalTimerMode);
        setTimekeepingModeState(nextSettings.timekeepingMode);
        timekeepingModeRef.current = nextSettings.timekeepingMode;
        setTimerTargetDurationMsState(nextSettings.timerTargetDurationMs);
        timerTargetDurationMsRef.current = nextSettings.timerTargetDurationMs;
        setTimer(current => {
          if (current.phase === 'active') {
            return current;
          }

          return {
            ...current,
            targetDurationMs:
              nextSettings.timekeepingMode === 'timer'
                ? nextSettings.timerTargetDurationMs
                : null,
          };
        });
        setTimerModeIdState(nextSettings.timerModeId);
        timerModeIdRef.current = nextSettings.timerModeId;
        setWinkLeftEyeClosedThreshold(
          nextSettings.winkLeftEyeClosedThreshold,
        );
        setWinkRightEyeClosedThreshold(
          nextSettings.winkRightEyeClosedThreshold,
        );
        setWinkLeftEyeProbabilityGapThreshold(
          nextSettings.winkLeftEyeProbabilityGapThreshold,
        );
        setWinkRightEyeProbabilityGapThreshold(
          nextSettings.winkRightEyeProbabilityGapThreshold,
        );
        setWinkDistanceLevel(nextSettings.winkDistanceLevel);
        setLookAngleLevel(nextSettings.lookAngleLevel);
        setFaceHeightAngleLevel(nextSettings.faceHeightAngleLevel);
        setWinkTimeLevel(nextSettings.winkTimeLevel);
        setWinkMaxDurationMs(nextSettings.winkMaxDurationMs);
        setWinkMinTimeLevel(nextSettings.winkMinTimeLevel);
        setWinkMinDurationMs(nextSettings.winkMinDurationMs);
        setDetectionResolutionLevel(nextSettings.detectionResolutionLevel);
        setDetectionFrameIntervalLevel(
          nextSettings.detectionFrameIntervalLevel,
        );
        setDetectionPerformanceMode(nextSettings.detectionPerformanceMode);
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) {
          setSettingsLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [
    setSensitivity,
    setTimer,
    setWinkMaxDurationMs,
    setWinkMinDurationMs,
    setWinkMinTimeLevel,
    setWinkTimeLevel,
  ]);

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    if (!skippedInitialSettingsSaveRef.current) {
      skippedInitialSettingsSaveRef.current = true;
      return;
    }

    const settings: PersistedSettings = {
      sensitivity,
      statusDisplayMode,
      normalTimerMode,
      timekeepingMode,
      timerTargetDurationMs,
      timerModeId,
      winkLeftEyeClosedThreshold,
      winkRightEyeClosedThreshold,
      winkLeftEyeProbabilityGapThreshold,
      winkRightEyeProbabilityGapThreshold,
      winkDistanceLevel,
      lookAngleLevel,
      faceHeightAngleLevel,
      winkTimeLevel,
      winkMaxDurationMs,
      winkMinTimeLevel,
      winkMinDurationMs,
      detectionResolutionLevel,
      detectionFrameIntervalLevel,
      detectionPerformanceMode,
    };

    AsyncStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings)).catch(
      () => undefined,
    );
  }, [
    detectionFrameIntervalLevel,
    detectionPerformanceMode,
    detectionResolutionLevel,
    faceHeightAngleLevel,
    lookAngleLevel,
    normalTimerMode,
    sensitivity,
    settingsLoaded,
    statusDisplayMode,
    timekeepingMode,
    timerTargetDurationMs,
    timerModeId,
    winkDistanceLevel,
    winkLeftEyeProbabilityGapThreshold,
    winkRightEyeProbabilityGapThreshold,
    winkLeftEyeClosedThreshold,
    winkMaxDurationMs,
    winkMinDurationMs,
    winkMinTimeLevel,
    winkRightEyeClosedThreshold,
    winkTimeLevel,
  ]);

  const appendSessionHistoryEvent = useCallback(
    (
      eventType: SessionHistoryEvent['type'],
      atMs: number,
      elapsedMs: number,
    ) => {
      setSessionHistory(currentHistory => {
        if (eventType === 'START' && formatsAsZeroHistoryDuration(elapsedMs)) {
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
    gazeDetector
      .setWinkThresholds(
        winkLeftEyeClosedThreshold,
        winkRightEyeClosedThreshold,
        winkLeftEyeProbabilityGapThreshold,
        winkRightEyeProbabilityGapThreshold,
      )
      .catch(() => undefined);
  }, [
    gazeDetector,
    winkLeftEyeClosedThreshold,
    winkLeftEyeProbabilityGapThreshold,
    winkRightEyeClosedThreshold,
    winkRightEyeProbabilityGapThreshold,
  ]);

  useEffect(() => {
    gazeDetector.setWinkDistanceLevel(winkDistanceLevel).catch(() => undefined);
  }, [gazeDetector, winkDistanceLevel]);

  useEffect(() => {
    gazeDetector.setLookAngleLevel(lookAngleLevel).catch(() => undefined);
  }, [gazeDetector, lookAngleLevel]);

  useEffect(() => {
    const effectiveFaceHeightAngleLevel =
      timerModeId === 'winkControl'
        ? WINK_CONTROL_FACE_HEIGHT_ANGLE_LEVEL
        : faceHeightAngleLevel;

    gazeDetector
      .setFaceHeightAngleLevel(effectiveFaceHeightAngleLevel)
      .catch(() => undefined);
  }, [faceHeightAngleLevel, gazeDetector, timerModeId]);

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
    gazeDetector
      .setDetectionPerformanceMode(detectionPerformanceMode)
      .catch(() => undefined);
  }, [detectionPerformanceMode, gazeDetector]);

  useEffect(() => {
    gazeDetector.setWinkTimeLevel(winkTimeLevel);
  }, [gazeDetector, winkTimeLevel]);

  useEffect(() => {
    gazeDetector.setWinkMaxDurationMs(winkMaxDurationMs);
  }, [gazeDetector, winkMaxDurationMs]);

  useEffect(() => {
    gazeDetector.setWinkMinTimeLevel(winkMinTimeLevel);
  }, [gazeDetector, winkMinTimeLevel]);

  useEffect(() => {
    gazeDetector.setWinkMinDurationMs(winkMinDurationMs);
  }, [gazeDetector, winkMinDurationMs]);

  useEffect(() => {
    normalTimerModeRef.current = normalTimerMode;
  }, [normalTimerMode]);

  useEffect(() => {
    timekeepingModeRef.current = timekeepingMode;
  }, [timekeepingMode]);

  useEffect(() => {
    timerTargetDurationMsRef.current = timerTargetDurationMs;
  }, [timerTargetDurationMs]);

  useEffect(() => {
    timerModeIdRef.current = timerModeId;
  }, [timerModeId]);

  useEffect(() => {
    gestureInputsBlockedRef.current = gestureInputsBlocked;
  }, [gestureInputsBlocked]);

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
        const gestureInputsEnabled =
          screenRef.current !== 'settings' &&
          !gestureInputsBlockedRef.current;
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

          const listensForLeftWinkAction = canListenForWinkAction(
            currentForTick,
            activeTimerModeId,
            'left',
          );
          const listensForRightWinkAction = canListenForWinkAction(
            currentForTick,
            activeTimerModeId,
            'right',
          );
          const listensForLeftWinkReset = canResetFromWink(
            currentForTick,
            activeTimerModeId,
            'left',
          );
          const listensForRightWinkReset = canResetFromWink(
            currentForTick,
            activeTimerModeId,
            'right',
          );
          const listensForAnyWink =
            listensForLeftWinkAction ||
            listensForRightWinkAction ||
            listensForLeftWinkReset ||
            listensForRightWinkReset;

          if (!listensForAnyWink) {
            return currentForTick;
          }

          const consumedSingleWink = gazeDetector.consumeSingleWink(now);
          const passiveWinkReading =
            consumedSingleWink ?? gazeDetector.getLatestReading(now);
          const liveWinkActionReading =
            consumedSingleWink === null
              ? getLiveWinkActionReading(currentForTick, passiveWinkReading)
              : null;
          const winkActionReading =
            consumedSingleWink ?? liveWinkActionReading;
          const suppressPendingSingleWinkIfLive = () => {
            if (liveWinkActionReading !== null) {
              gazeDetector.suppressSingleWinkUntilOpen();
            }
          };

          if (
            winkActionReading?.winkSide === 'left' &&
            listensForLeftWinkAction &&
            currentForTick.oneEyeResetArmed
          ) {
            suppressPendingSingleWinkIfLive();
            return applyWinkActionGesture(
              currentForTick,
              winkActionReading,
            );
          }

          if (
            winkActionReading?.winkSide === 'right' &&
            listensForRightWinkAction &&
            currentForTick.oneEyeResetArmed
          ) {
            suppressPendingSingleWinkIfLive();
            return applyWinkActionGesture(
              currentForTick,
              winkActionReading,
            );
          }

          if (
            winkActionReading?.winkSide === 'left' &&
            listensForLeftWinkReset &&
            currentForTick.oneEyeResetArmed
          ) {
            suppressPendingSingleWinkIfLive();
            return applyWinkResetGesture(
              currentForTick,
              winkActionReading,
            );
          }

          if (
            winkActionReading?.winkSide === 'right' &&
            listensForRightWinkReset &&
            currentForTick.oneEyeResetArmed
          ) {
            suppressPendingSingleWinkIfLive();
            return applyWinkResetGesture(
              currentForTick,
              winkActionReading,
            );
          }

          return applyPassiveWinkDetectionState(
            currentForTick,
            passiveWinkReading,
          );
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
          modeUsesWinkPause(activeTimerModeId, 'left');
        const listensForActiveRightWink =
          gestureInputsEnabled &&
          !activeModeRunsWithoutGaze &&
          modeUsesWinkPause(activeTimerModeId, 'right');
        const listensForActiveLeftWinkReset =
          gestureInputsEnabled &&
          !activeModeRunsWithoutGaze &&
          modeUsesWinkReset(activeTimerModeId, 'left');
        const listensForActiveRightWinkReset =
          gestureInputsEnabled &&
          !activeModeRunsWithoutGaze &&
          modeUsesWinkReset(activeTimerModeId, 'right');
        const listensForActiveLeftWinkLap =
          gestureInputsEnabled &&
          !activeModeRunsWithoutGaze &&
          modeUsesWinkLap(activeTimerModeId, 'left');
        const listensForActiveRightWinkLap =
          gestureInputsEnabled &&
          !activeModeRunsWithoutGaze &&
          modeUsesWinkLap(activeTimerModeId, 'right');
        const consumedSingleWink =
          listensForActiveLeftWink ||
          listensForActiveRightWink ||
          listensForActiveLeftWinkReset ||
          listensForActiveRightWinkReset ||
          listensForActiveLeftWinkLap ||
          listensForActiveRightWinkLap
            ? gazeDetector.consumeSingleWink(now)
            : null;
        const activeWinkReading =
          consumedSingleWink ?? gazeDetector.getLatestReading(now);
        const liveWinkActionReading =
          consumedSingleWink === null
            ? getLiveWinkActionReading(currentForTick, activeWinkReading)
            : null;
        const winkActionReading = consumedSingleWink ?? liveWinkActionReading;
        const suppressPendingSingleWinkIfLive = () => {
          if (liveWinkActionReading !== null) {
            gazeDetector.suppressSingleWinkUntilOpen();
          }
        };
        const withDetection = !gestureInputsEnabled
          ? currentForTick
          : activeModeRunsWithoutGaze
            ? normalizeNormalTimerState(currentForTick, true)
            : applyDetectionWithBehavior(
                currentForTick,
                activeWinkReading,
                activeSensitivity,
                activeBehavior,
              );

        if (
          ((winkActionReading?.winkSide === 'left' &&
            listensForActiveLeftWinkLap) ||
            (winkActionReading?.winkSide === 'right' &&
              listensForActiveRightWinkLap)) &&
          currentForTick.oneEyeResetArmed
        ) {
          suppressPendingSingleWinkIfLive();
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

          return markRecognizedWink(
            disarmHeldWinkAction(timerForLap, winkActionReading),
            winkActionReading,
          );
        }

        if (
          winkActionReading?.winkSide === 'left' &&
          listensForActiveLeftWinkReset &&
          withDetection.isLookPaused
        ) {
          suppressPendingSingleWinkIfLive();
          return applyWinkResetGesture(withDetection, winkActionReading);
        }

        if (
          winkActionReading?.winkSide === 'right' &&
          listensForActiveRightWinkReset &&
          withDetection.isLookPaused
        ) {
          suppressPendingSingleWinkIfLive();
          return applyWinkResetGesture(withDetection, winkActionReading);
        }

        if (
          winkActionReading?.winkSide === 'left' &&
          listensForActiveLeftWink &&
          currentForTick.oneEyeResetArmed
        ) {
          suppressPendingSingleWinkIfLive();
          return markRecognizedWink(
            disarmHeldWinkAction(
              pauseTimer(withDetection, now, activeSensitivity),
              winkActionReading,
            ),
            winkActionReading,
          );
        }

        if (
          winkActionReading?.winkSide === 'right' &&
          listensForActiveRightWink &&
          currentForTick.oneEyeResetArmed
        ) {
          suppressPendingSingleWinkIfLive();
          return markRecognizedWink(
            disarmHeldWinkAction(
              pauseTimer(withDetection, now, activeSensitivity),
              winkActionReading,
            ),
            winkActionReading,
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
  }, [
    appendSessionHistoryEvent,
    devicePostureDetector,
    gazeDetector,
    setTimer,
  ]);

  const shouldRunGazeDetector =
    screen !== 'settings' &&
    !gestureInputsBlocked &&
    isAppForeground &&
    !normalTimerMode &&
    !modeRunsWithoutGaze(timerModeId) &&
    (timer.phase === 'active' ||
      canResetFromWink(timer, timerModeId, 'left') ||
      canResetFromWink(timer, timerModeId, 'right') ||
      canListenForWinkAction(timer, timerModeId, 'left') ||
      canListenForWinkAction(timer, timerModeId, 'right'));

  const shouldRunDevicePostureDetector =
    screen !== 'settings' &&
    !gestureInputsBlocked &&
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
          { status: 'unknown', confidence: 0, atMs: now },
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
    const subscription = NativeAppState.addEventListener(
      'change',
      nextState => {
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
      },
    );

    return () => {
      subscription.remove();
    };
  }, [setTimer]);

  const setTimekeepingMode = useCallback(
    (mode: TimekeepingMode) => {
      const now = Date.now();
      const currentMode = timekeepingModeRef.current;
      const targetDurationMs =
        mode === 'timer' ? timerTargetDurationMsRef.current : null;

      setFinishError(null);
      if (mode !== currentMode) {
        setSessionHistory([]);
      }
      timekeepingModeRef.current = mode;
      setTimekeepingModeState(mode);
      setTimer({
        ...createInitialTimerState(now),
        targetDurationMs,
      });
    },
    [setTimer],
  );

  const setTimerModeId = useCallback<
    React.Dispatch<React.SetStateAction<TimerModeId>>
  >(action => {
    const currentModeId = timerModeIdRef.current;
    const nextModeId =
      typeof action === 'function'
        ? (action as (value: TimerModeId) => TimerModeId)(currentModeId)
        : action;

    if (nextModeId === currentModeId) {
      return;
    }

    setSessionHistory([]);
    timerModeIdRef.current = nextModeId;
    setTimerModeIdState(nextModeId);
  }, []);

  const setTimerTargetDurationMs = useCallback(
    (durationMs: number) => {
      const now = Date.now();
      const nextDurationMs = normalizeTimerTargetDurationMs(durationMs);

      setFinishError(null);
      timerTargetDurationMsRef.current = nextDurationMs;
      setTimerTargetDurationMsState(nextDurationMs);
      setTimer(current => {
        if (
          timekeepingModeRef.current !== 'timer' ||
          current.phase === 'active'
        ) {
          return current;
        }

        return {
          ...createInitialTimerState(now),
          targetDurationMs: nextDurationMs,
        };
      });
    },
    [setTimer],
  );

  const startTimerSession = useCallback(() => {
    const now = Date.now();
    const targetDurationMs =
      timekeepingModeRef.current === 'timer'
        ? timerTargetDurationMsRef.current
        : undefined;

    setFinishError(null);
    setTimer(startTimer(createInitialTimerState(now), now, targetDurationMs));
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
    const targetDurationMs =
      timekeepingModeRef.current === 'timer'
        ? timerTargetDurationMsRef.current
        : null;

    setFinishError(null);
    setTimer(current =>
      resetTimer(
        {
          ...current,
          targetDurationMs,
        },
        now,
      ),
    );
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
          { status, confidence: status === 'unknown' ? 0 : 1, atMs: now },
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
      winkLeftEyeClosedThreshold,
      setWinkLeftEyeClosedThreshold,
      winkRightEyeClosedThreshold,
      setWinkRightEyeClosedThreshold,
      winkLeftEyeProbabilityGapThreshold,
      setWinkLeftEyeProbabilityGapThreshold,
      winkRightEyeProbabilityGapThreshold,
      setWinkRightEyeProbabilityGapThreshold,
      winkDistanceLevel,
      setWinkDistanceLevel,
      lookAngleLevel,
      setLookAngleLevel,
      faceHeightAngleLevel,
      setFaceHeightAngleLevel,
      winkTimeLevel,
      setWinkTimeLevel,
      winkMaxDurationMs,
      setWinkMaxDurationMs,
      winkMinTimeLevel,
      setWinkMinTimeLevel,
      winkMinDurationMs,
      setWinkMinDurationMs,
      detectionResolutionLevel,
      setDetectionResolutionLevel,
      detectionFrameIntervalLevel,
      setDetectionFrameIntervalLevel,
      detectionPerformanceMode,
      setDetectionPerformanceMode,
      setSensitivity,
      statusDisplayMode,
      setStatusDisplayMode,
      normalTimerMode,
      setNormalTimerMode,
      timekeepingMode,
      setTimekeepingMode,
      timerTargetDurationMs,
      setTimerTargetDurationMs,
      timerModeId,
      setTimerModeId,
      gestureInputsBlocked,
      setGestureInputsBlocked,
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
      winkLeftEyeClosedThreshold,
      winkRightEyeClosedThreshold,
      winkLeftEyeProbabilityGapThreshold,
      winkRightEyeProbabilityGapThreshold,
      winkDistanceLevel,
      lookAngleLevel,
      faceHeightAngleLevel,
      winkTimeLevel,
      winkMaxDurationMs,
      winkMinDurationMs,
      winkMinTimeLevel,
      detectionResolutionLevel,
      detectionFrameIntervalLevel,
      detectionPerformanceMode,
      statusDisplayMode,
      normalTimerMode,
      timekeepingMode,
      timerTargetDurationMs,
      timerModeId,
      gestureInputsBlocked,
      finishError,
      isFinishingSession,
      repository,
      gazeDetector,
      setSensitivity,
      setTimer,
      setTimekeepingMode,
      setTimerTargetDurationMs,
      setTimerModeId,
      setWinkMaxDurationMs,
      setWinkMinDurationMs,
      setWinkMinTimeLevel,
      setWinkTimeLevel,
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
