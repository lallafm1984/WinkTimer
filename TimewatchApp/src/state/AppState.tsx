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
import {
  DEFAULT_TIMER_ALERT_SOUND_ENABLED,
  DEFAULT_TIMER_ALERT_SOUND_ID,
  DEFAULT_TIMER_ALERT_VIBRATION_ENABLED,
  DEFAULT_TIMER_ALERT_DURATION_ID,
  DEFAULT_TIMER_ALERT_VIBRATION_PATTERN_ID,
  cancelScheduledTimerEndAlert,
  getTimerAlertDurationMs,
  normalizeTimerAlertDurationId,
  normalizeTimerAlertSoundId,
  normalizeTimerAlertVibrationPatternId,
  playTimerEndAlert,
  scheduleTimerEndAlert,
  stopTimerEndAlert as stopNativeTimerEndAlert,
  type TimerAlertDurationId,
  type TimerAlertSoundId,
  type TimerAlertVibrationPatternId,
} from '../alerts/timerAlert';
import {
  cancelAlarmAlert,
  getActiveAlarmAlert,
  scheduleAlarmAlert,
  snoozeActiveAlarmAlert as snoozeNativeActiveAlarmAlert,
  stopActiveAlarmAlert as stopNativeActiveAlarmAlert,
  type ActiveAlarmAlert,
} from '../alerts/alarmAlert';
import {
  ensureBackgroundTimekeepingNotificationPermission,
  hideBackgroundTimekeepingNotification,
  showBackgroundTimekeepingNotification,
} from '../notifications/timekeepingNotification';
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
  SmileDistanceLevel,
  SmileThreshold,
  StatusDisplayMode,
  WinkDistanceLevel,
  WinkEyeClosedThreshold,
  WinkEyeProbabilityGapThreshold,
} from '../domain/detection';
import {
  DEFAULT_LOOK_ANGLE_LEVEL,
  DEFAULT_SMILE_DISTANCE_LEVEL,
  DEFAULT_SMILE_THRESHOLD,
  DEFAULT_FACE_HEIGHT_ANGLE_LEVEL,
  DEFAULT_DETECTION_FRAME_INTERVAL_LEVEL,
  DEFAULT_DETECTION_PERFORMANCE_MODE,
  DEFAULT_DETECTION_RESOLUTION_LEVEL,
  DEFAULT_WINK_EYE_CLOSED_THRESHOLD,
  DEFAULT_WINK_EYE_PROBABILITY_GAP_THRESHOLD,
  DEFAULT_WINK_DISTANCE_LEVEL,
  normalizeDetectionFrameIntervalLevel,
  normalizeDetectionPerformanceMode,
  normalizeDetectionResolutionLevel,
  normalizeFaceHeightAngleLevel,
  normalizeLookAngleLevel,
  normalizeSmileDistanceLevel,
  normalizeSmileThreshold,
  normalizeWinkDistanceLevel,
  normalizeWinkEyeClosedThreshold,
  normalizeWinkEyeProbabilityGapThreshold,
} from '../domain/detection';
import type { SessionSummary } from '../domain/session';
import { normalizeAlarm, type ScheduledAlarm } from '../domain/alarm';
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
  DEFAULT_RECENT_TIMER_TARGET_DURATIONS_MS,
  DEFAULT_TIMER_TARGET_DURATION_MS,
  normalizeTimekeepingMode,
  normalizeTimerTargetDurationMs,
  type TimekeepingMode,
} from '../domain/timekeeping';
import {
  timerModePresets,
  modeUsesLookPause,
  modeUsesLookAwayStart,
  modeHasLap,
  modeRunsWithoutGaze,
  modeUsesSmilePause,
  modeUsesSmileResume,
  modeUsesDeviceFlip,
  modeUsesSmileStart,
  modeUsesWinkLap,
  modeUsesWinkPause,
  modeUsesWinkReset,
  modeUsesWinkResume,
  modeUsesWinkStart,
  type TimerModeId,
  type WinkGestureSide,
} from '../domain/timerMode';
import {
  createTranslator,
  getDeviceAppLocale,
  normalizeAppLocale,
  type AppLocale,
  type TranslationKey,
} from '../i18n/localization';
import { recordFunnelEvent } from '../analytics/funnelAnalytics';
import type { SessionRepository } from '../storage/sessionRepository';
import { createSessionRepository } from '../storage/sessionRepository';
import type { AlarmRepository } from '../storage/alarmRepository';
import { createAlarmRepository } from '../storage/alarmRepository';

const SETTINGS_STORAGE_KEY = '@winktimer:settings:v1';
const ACTIVE_TIMEKEEPING_STORAGE_KEY = '@winktimer:active_timekeeping:v1';
const ACTIVE_TIMEKEEPING_RECORD_VERSION = 1;
const DEFAULT_TIMER_MODE_ID: TimerModeId = 'basicTimer';
const MAX_RECENT_TIMER_TARGETS = 3;

const FINISH_ERROR_KEY: TranslationKey = 'timer.finishError';

export type AppScreen =
  | 'timer'
  | 'summary'
  | 'history'
  | 'settings'
  | 'alarms';

type AppStateValue = {
  screen: AppScreen;
  setScreen: React.Dispatch<React.SetStateAction<AppScreen>>;
  timer: TimerState;
  setTimer: React.Dispatch<React.SetStateAction<TimerState>>;
  sessions: SessionSummary[];
  setSessions: React.Dispatch<React.SetStateAction<SessionSummary[]>>;
  alarms: ScheduledAlarm[];
  activeAlarmAlert: ActiveAlarmAlert | null;
  saveAlarm(alarm: ScheduledAlarm): void;
  deleteAlarm(id: string): void;
  toggleAlarmEnabled(id: string): void;
  stopActiveAlarmAlert(): void;
  silenceActiveAlarmAlert(): void;
  snoozeActiveAlarmAlert(minutes: number): void;
  lastSummary: SessionSummary | null;
  setLastSummary: React.Dispatch<React.SetStateAction<SessionSummary | null>>;
  sessionHistory: SessionHistoryEvent[];
  sensitivity: Sensitivity;
  setSensitivity: React.Dispatch<React.SetStateAction<Sensitivity>>;
  locale: AppLocale;
  setLocale: React.Dispatch<React.SetStateAction<AppLocale>>;
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
  smileThreshold: SmileThreshold;
  setSmileThreshold: React.Dispatch<React.SetStateAction<SmileThreshold>>;
  smileDistanceLevel: SmileDistanceLevel;
  setSmileDistanceLevel: React.Dispatch<
    React.SetStateAction<SmileDistanceLevel>
  >;
  lookAngleLevel: LookAngleLevel;
  setLookAngleLevel: React.Dispatch<React.SetStateAction<LookAngleLevel>>;
  faceHeightAngleLevel: FaceHeightAngleLevel;
  setFaceHeightAngleLevel: React.Dispatch<
    React.SetStateAction<FaceHeightAngleLevel>
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
  recentTimerTargetDurationsMs: number[];
  setTimerTargetDurationMs(durationMs: number): void;
  timerTargetPopupRequestId: number;
  requestTimerTargetPopup(): void;
  consumeTimerTargetPopupRequest(requestId: number): void;
  timerModeId: TimerModeId;
  setTimerModeId: SetTimerModeId;
  clearTemporaryTimerModeId(): void;
  timerAlertVibrationEnabled: boolean;
  setTimerAlertVibrationEnabled: React.Dispatch<
    React.SetStateAction<boolean>
  >;
  timerAlertSoundEnabled: boolean;
  setTimerAlertSoundEnabled: React.Dispatch<React.SetStateAction<boolean>>;
  timerAlertSoundId: TimerAlertSoundId;
  setTimerAlertSoundId: React.Dispatch<
    React.SetStateAction<TimerAlertSoundId>
  >;
  timerAlertDurationId: TimerAlertDurationId;
  setTimerAlertDurationId: React.Dispatch<
    React.SetStateAction<TimerAlertDurationId>
  >;
  timerAlertVibrationPatternId: TimerAlertVibrationPatternId;
  setTimerAlertVibrationPatternId: React.Dispatch<
    React.SetStateAction<TimerAlertVibrationPatternId>
  >;
  isTimerAlertActive: boolean;
  stopTimerEndAlert(): void;
  gestureInputsBlocked: boolean;
  setGestureInputsBlocked: React.Dispatch<React.SetStateAction<boolean>>;
  finishError: TranslationKey | null;
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
  lastPrimaryScreen: 'timer' | 'alarms';
  locale: AppLocale;
  statusDisplayMode: StatusDisplayMode;
  normalTimerMode: boolean;
  timekeepingMode: TimekeepingMode;
  timerTargetDurationMs: number;
  recentTimerTargetDurationsMs: number[];
  timerModeId: TimerModeId;
  timerAlertVibrationEnabled: boolean;
  timerAlertSoundEnabled: boolean;
  timerAlertSoundId: TimerAlertSoundId;
  timerAlertDurationId: TimerAlertDurationId;
  timerAlertVibrationPatternId: TimerAlertVibrationPatternId;
  winkLeftEyeClosedThreshold: WinkEyeClosedThreshold;
  winkRightEyeClosedThreshold: WinkEyeClosedThreshold;
  winkLeftEyeProbabilityGapThreshold: WinkEyeProbabilityGapThreshold;
  winkRightEyeProbabilityGapThreshold: WinkEyeProbabilityGapThreshold;
  winkDistanceLevel: WinkDistanceLevel;
  smileThreshold: SmileThreshold;
  smileDistanceLevel: SmileDistanceLevel;
  lookAngleLevel: LookAngleLevel;
  faceHeightAngleLevel: FaceHeightAngleLevel;
  detectionResolutionLevel: DetectionResolutionLevel;
  detectionFrameIntervalLevel: DetectionFrameIntervalLevel;
  detectionPerformanceMode: DetectionPerformanceMode;
};

type ActiveTimekeepingSession = {
  timekeepingMode: TimekeepingMode;
  timerTargetDurationMs: number;
  timerModeId: TimerModeId;
  normalTimerMode: boolean;
  timer: TimerState;
};

type SetTimerModeIdOptions = {
  temporary?: boolean;
};

type SetTimerModeId = (
  action: React.SetStateAction<TimerModeId>,
  options?: SetTimerModeIdOptions,
) => void;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function normalizeStoredNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' ? value : fallback;
}

function normalizeStoredStatusDisplayMode(value: unknown): StatusDisplayMode {
  return value === 'text' || value === 'minimal' ? value : 'minimal';
}

function normalizeStoredPrimaryScreen(value: unknown): 'timer' | 'alarms' {
  return value === 'alarms' ? 'alarms' : 'timer';
}

function getPrimaryScreenForPersistence(
  screen: AppScreen,
  settingsReturnScreen: AppScreen,
): 'timer' | 'alarms' {
  if (screen === 'alarms') {
    return 'alarms';
  }

  if (screen === 'settings' && settingsReturnScreen === 'alarms') {
    return 'alarms';
  }

  return 'timer';
}

function normalizeStoredBoolean(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback;
}

function normalizeStoredTimerModeId(_value: unknown): TimerModeId {
  return DEFAULT_TIMER_MODE_ID;
}

function getDefaultRecentTimerTargetDurationsMs() {
  return [...DEFAULT_RECENT_TIMER_TARGET_DURATIONS_MS];
}

function normalizeRecentTimerTargetDurationsMs(value: unknown): number[] {
  if (!Array.isArray(value)) {
    return getDefaultRecentTimerTargetDurationsMs();
  }

  const durations: number[] = [];

  value.forEach(item => {
    if (typeof item !== 'number' || !Number.isFinite(item)) {
      return;
    }

    const durationMs = normalizeTimerTargetDurationMs(item);

    if (!durations.includes(durationMs)) {
      durations.push(durationMs);
    }
  });

  if (durations.length === 0) {
    return getDefaultRecentTimerTargetDurationsMs();
  }

  return durations.slice(0, MAX_RECENT_TIMER_TARGETS);
}

function addRecentTimerTargetDurationMs(
  currentDurationsMs: number[],
  durationMs: number,
) {
  const nextDurationMs = normalizeTimerTargetDurationMs(durationMs);

  return [
    nextDurationMs,
    ...currentDurationsMs.filter(item => item !== nextDurationMs),
  ].slice(0, MAX_RECENT_TIMER_TARGETS);
}

function normalizeStoredSettings(value: unknown): PersistedSettings | null {
  if (!isRecord(value)) {
    return null;
  }

  return {
    sensitivity: 'strict',
    lastPrimaryScreen: normalizeStoredPrimaryScreen(value.lastPrimaryScreen),
    locale: normalizeAppLocale(value.locale),
    statusDisplayMode: normalizeStoredStatusDisplayMode(
      value.statusDisplayMode,
    ),
    normalTimerMode: normalizeStoredBoolean(value.normalTimerMode, false),
    timekeepingMode: normalizeTimekeepingMode(value.timekeepingMode),
    timerTargetDurationMs: normalizeTimerTargetDurationMs(
      value.timerTargetDurationMs,
    ),
    recentTimerTargetDurationsMs: normalizeRecentTimerTargetDurationsMs(
      value.recentTimerTargetDurationsMs,
    ),
    timerModeId: normalizeStoredTimerModeId(value.timerModeId),
    timerAlertVibrationEnabled: normalizeStoredBoolean(
      value.timerAlertVibrationEnabled,
      DEFAULT_TIMER_ALERT_VIBRATION_ENABLED,
    ),
    timerAlertSoundEnabled: normalizeStoredBoolean(
      value.timerAlertSoundEnabled,
      DEFAULT_TIMER_ALERT_SOUND_ENABLED,
    ),
    timerAlertSoundId: normalizeTimerAlertSoundId(value.timerAlertSoundId),
    timerAlertDurationId: normalizeTimerAlertDurationId(
      value.timerAlertDurationId,
    ),
    timerAlertVibrationPatternId: normalizeTimerAlertVibrationPatternId(
      value.timerAlertVibrationPatternId,
    ),
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
    smileThreshold: normalizeSmileThreshold(
      normalizeStoredNumber(value.smileThreshold, DEFAULT_SMILE_THRESHOLD),
    ),
    smileDistanceLevel: normalizeSmileDistanceLevel(
      normalizeStoredNumber(
        value.smileDistanceLevel,
        DEFAULT_SMILE_DISTANCE_LEVEL,
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

function normalizePersistedTimerModeId(value: unknown): TimerModeId {
  return timerModePresets.some(mode => mode.id === value)
    ? (value as TimerModeId)
    : DEFAULT_TIMER_MODE_ID;
}

function normalizeStoredTimerNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : fallback;
}

function normalizeStoredTimerDuration(value: unknown) {
  return Math.max(0, normalizeStoredTimerNumber(value, 0));
}

function normalizeStoredTimerTimestamp(value: unknown, fallback: number) {
  return normalizeStoredTimerNumber(value, fallback);
}

function normalizeStoredNullableTimerTimestamp(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function normalizeStoredDetectionStatus(value: unknown): DetectionStatus {
  return value === 'looking' ||
    value === 'notLooking' ||
    value === 'unknown'
    ? value
    : 'unknown';
}

function normalizeStoredEyeState(value: unknown): TimerState['eyeState'] {
  return value === 'bothOpen' ||
    value === 'bothClosed' ||
    value === 'oneEyeClosed' ||
    value === 'unknown'
    ? value
    : 'unknown';
}

function normalizeStoredWinkSide(value: unknown): TimerState['winkSide'] {
  return value === 'left' || value === 'right' ? value : null;
}

function normalizeStoredTimerState(
  value: unknown,
  fallbackNowMs: number,
): TimerState | null {
  if (!isRecord(value)) {
    return null;
  }

  if (value.phase !== 'active' && value.phase !== 'manualPaused') {
    return null;
  }

  const startedAtMs = normalizeStoredNullableTimerTimestamp(value.startedAtMs);
  if (startedAtMs === null) {
    return null;
  }

  const lastUpdatedAtMs = normalizeStoredTimerTimestamp(
    value.lastUpdatedAtMs,
    fallbackNowMs,
  );
  const targetDurationMs =
    typeof value.targetDurationMs === 'number' &&
    Number.isFinite(value.targetDurationMs)
      ? normalizeTimerTargetDurationMs(value.targetDurationMs)
      : null;

  return {
    phase: value.phase,
    startedAtMs,
    lastUpdatedAtMs,
    focusDurationMs: normalizeStoredTimerDuration(value.focusDurationMs),
    lookPausedDurationMs: normalizeStoredTimerDuration(
      value.lookPausedDurationMs,
    ),
    lookPauseCount: Math.max(
      0,
      Math.floor(normalizeStoredTimerNumber(value.lookPauseCount, 0)),
    ),
    targetDurationMs,
    detectionStatus: normalizeStoredDetectionStatus(value.detectionStatus),
    eyeState: normalizeStoredEyeState(value.eyeState),
    winkSide: normalizeStoredWinkSide(value.winkSide),
    smileDetected:
      typeof value.smileDetected === 'boolean' ? value.smileDetected : null,
    recentWinkSide: normalizeStoredWinkSide(value.recentWinkSide),
    recentWinkAtMs: normalizeStoredNullableTimerTimestamp(
      value.recentWinkAtMs,
    ),
    lookingStartedAtMs: normalizeStoredNullableTimerTimestamp(
      value.lookingStartedAtMs,
    ),
    isLookPaused: normalizeStoredBoolean(value.isLookPaused, false),
    oneEyeClosedStartedAtMs: normalizeStoredNullableTimerTimestamp(
      value.oneEyeClosedStartedAtMs,
    ),
    oneEyeResetArmed: normalizeStoredBoolean(value.oneEyeResetArmed, true),
  };
}

function parseStoredJson(raw: string | null) {
  if (raw === null) {
    return null;
  }

  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

function normalizeStoredActiveTimekeepingSession(
  raw: string | null,
  nowMs: number,
): ActiveTimekeepingSession | null {
  const value = parseStoredJson(raw);
  if (!isRecord(value)) {
    return null;
  }

  const savedAtMs = normalizeStoredTimerTimestamp(value.savedAtMs, nowMs);
  const timer = normalizeStoredTimerState(value.timer, savedAtMs);
  if (timer === null) {
    return null;
  }

  const timekeepingMode = normalizeTimekeepingMode(value.timekeepingMode);
  const timerTargetDurationMs = normalizeTimerTargetDurationMs(
    typeof value.timerTargetDurationMs === 'number'
      ? value.timerTargetDurationMs
      : timer.targetDurationMs ?? DEFAULT_TIMER_TARGET_DURATION_MS,
  );
  const targetDurationMs =
    timekeepingMode === 'timer'
      ? timer.targetDurationMs ?? timerTargetDurationMs
      : null;

  return {
    timekeepingMode,
    timerTargetDurationMs,
    timerModeId: normalizePersistedTimerModeId(value.timerModeId),
    normalTimerMode: normalizeStoredBoolean(value.normalTimerMode, false),
    timer: {
      ...timer,
      targetDurationMs,
    },
  };
}

function createActiveTimekeepingRecord(
  session: ActiveTimekeepingSession,
  savedAtMs: number,
) {
  return {
    version: ACTIVE_TIMEKEEPING_RECORD_VERSION,
    savedAtMs,
    timekeepingMode: session.timekeepingMode,
    timerTargetDurationMs: session.timerTargetDurationMs,
    timerModeId: session.timerModeId,
    normalTimerMode: session.normalTimerMode,
    timer: session.timer,
  };
}

function persistActiveTimekeepingSession(
  session: ActiveTimekeepingSession,
  savedAtMs = Date.now(),
) {
  if (
    session.timer.phase !== 'active' &&
    session.timer.phase !== 'manualPaused'
  ) {
    return AsyncStorage.removeItem(ACTIVE_TIMEKEEPING_STORAGE_KEY);
  }

  return AsyncStorage.setItem(
    ACTIVE_TIMEKEEPING_STORAGE_KEY,
    JSON.stringify(createActiveTimekeepingRecord(session, savedAtMs)),
  );
}

function clearPersistedActiveTimekeepingSession() {
  return AsyncStorage.removeItem(ACTIVE_TIMEKEEPING_STORAGE_KEY);
}

function formatsAsZeroHistoryDuration(durationMs: number) {
  return Math.floor(Math.max(0, durationMs) / 10) === 0;
}

function formatBackgroundNotificationDuration(durationMs: number) {
  const totalSeconds = Math.max(0, Math.floor(durationMs / 1000));
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, '0')}:${String(
      seconds,
    ).padStart(2, '0')}`;
  }

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0',
  )}`;
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
    smileDetected: null,
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
    smileDetected:
      reading.status === 'looking' ? reading.smileDetected ?? null : null,
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

function getActiveTimekeepingSessionTimerForNow(
  session: ActiveTimekeepingSession,
  nowMs: number,
  sensitivity: Sensitivity,
) {
  if (session.timer.phase !== 'active') {
    return session.timer;
  }

  const modeRunsPassively =
    session.normalTimerMode || modeRunsWithoutGaze(session.timerModeId);
  const timerForTick = modeRunsPassively
    ? normalizeNormalTimerState(session.timer, true)
    : session.timer;

  return tickTimerWithBehavior(
    timerForTick,
    nowMs,
    sensitivity,
    getTimerBehavior(session.timerModeId),
  );
}

function getCompletedTimerAlertKey(timer: TimerState) {
  if (timer.targetDurationMs === null) {
    return null;
  }

  return [
    timer.startedAtMs ?? 'none',
    timer.targetDurationMs,
    timer.focusDurationMs,
  ].join(':');
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

function canStartFromLookAway(timer: TimerState, modeId: TimerModeId) {
  return modeUsesLookAwayStart(modeId) && timer.phase === 'idle';
}

function applyLookAwayStartGesture(
  state: TimerState,
  reading: DetectionReading,
): TimerState {
  if (reading.atMs < state.lastUpdatedAtMs || reading.status !== 'notLooking') {
    return state;
  }

  return {
    ...startTimer(
      createInitialTimerState(reading.atMs),
      reading.atMs,
      state.targetDurationMs ?? undefined,
    ),
    detectionStatus: reading.status,
    eyeState: reading.eyeState ?? 'unknown',
    winkSide: null,
    smileDetected: null,
  };
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
        smileDetected: reading.smileDetected ?? null,
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
        smileDetected: reading.smileDetected ?? null,
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
        smileDetected: reading.smileDetected ?? null,
      },
      reading.atMs,
    ),
    reading,
  );
}

function canListenForSmileStart(timer: TimerState, modeId: TimerModeId) {
  return (
    modeUsesSmileStart(modeId) &&
    (timer.phase === 'idle' || timer.phase === 'ended')
  );
}

function canPauseFromSmile(timer: TimerState, modeId: TimerModeId) {
  return modeUsesSmilePause(modeId) && timer.phase === 'active';
}

function canResumeFromSmile(timer: TimerState, modeId: TimerModeId) {
  return modeUsesSmileResume(modeId) && timer.phase === 'manualPaused';
}

function applySmileStartGesture(
  state: TimerState,
  reading: DetectionReading,
): TimerState {
  if (reading.atMs < state.lastUpdatedAtMs || reading.smileDetected !== true) {
    return state;
  }

  return {
    ...startTimer(
      createInitialTimerState(reading.atMs),
      reading.atMs,
      state.targetDurationMs ?? undefined,
    ),
    detectionStatus: reading.status,
    eyeState: reading.eyeState ?? 'unknown',
    winkSide: null,
    smileDetected: true,
  };
}

function applySmileResumeGesture(
  state: TimerState,
  reading: DetectionReading,
): TimerState {
  if (!isNewSmileGesture(state, reading)) {
    return state;
  }

  return {
    ...resumeTimer(state, reading.atMs),
    detectionStatus: reading.status,
    eyeState: reading.eyeState ?? 'unknown',
    winkSide: null,
    smileDetected: true,
  };
}

function isNewSmileGesture(state: TimerState, reading: DetectionReading) {
  return (
    reading.atMs >= state.lastUpdatedAtMs &&
    reading.smileDetected === true &&
    state.smileDetected !== true
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

export function AppStateProvider({ children }: AppStateProviderProps) {
  const repositoryRef = useRef<SessionRepository | null>(null);
  const alarmRepositoryRef = useRef<AlarmRepository | null>(null);
  const gazeDetectorRef = useRef<MockGazeDetector | null>(null);
  const devicePostureDetectorRef = useRef<DevicePostureDetector | null>(null);

  if (repositoryRef.current === null) {
    repositoryRef.current = createSessionRepository();
  }

  if (alarmRepositoryRef.current === null) {
    alarmRepositoryRef.current = createAlarmRepository();
  }

  if (gazeDetectorRef.current === null) {
    gazeDetectorRef.current = createMockGazeDetector('unknown');
  }

  if (devicePostureDetectorRef.current === null) {
    devicePostureDetectorRef.current = createDevicePostureDetector();
  }

  const repository = repositoryRef.current;
  const alarmRepository = alarmRepositoryRef.current;
  const gazeDetector = gazeDetectorRef.current;
  const devicePostureDetector = devicePostureDetectorRef.current;
  const [screen, setScreenInternal] = useState<AppScreen>('timer');
  const [timer, setTimerInternal] = useState<TimerState>(() =>
    createInitialTimerState(Date.now()),
  );
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [alarms, setAlarms] = useState<ScheduledAlarm[]>([]);
  const [activeAlarmAlert, setActiveAlarmAlert] =
    useState<ActiveAlarmAlert | null>(null);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [sessionHistory, setSessionHistory] = useState<SessionHistoryEvent[]>(
    [],
  );
  const [sensitivity, setSensitivityState] = useState<Sensitivity>('strict');
  const [locale, setLocale] = useState<AppLocale>(getDeviceAppLocale);
  const t = useMemo(() => createTranslator(locale), [locale]);
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
  const [smileThreshold, setSmileThreshold] = useState<SmileThreshold>(
    DEFAULT_SMILE_THRESHOLD,
  );
  const [smileDistanceLevel, setSmileDistanceLevel] =
    useState<SmileDistanceLevel>(DEFAULT_SMILE_DISTANCE_LEVEL);
  const [lookAngleLevel, setLookAngleLevel] = useState<LookAngleLevel>(
    DEFAULT_LOOK_ANGLE_LEVEL,
  );
  const [faceHeightAngleLevel, setFaceHeightAngleLevel] =
    useState<FaceHeightAngleLevel>(DEFAULT_FACE_HEIGHT_ANGLE_LEVEL);
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
  const [recentTimerTargetDurationsMs, setRecentTimerTargetDurationsMs] =
    useState<number[]>(getDefaultRecentTimerTargetDurationsMs);
  const [timerTargetPopupRequestId, setTimerTargetPopupRequestId] =
    useState(0);
  const [timerModeId, setTimerModeIdState] =
    useState<TimerModeId>(DEFAULT_TIMER_MODE_ID);
  const [
    timerAlertVibrationEnabled,
    setTimerAlertVibrationEnabled,
  ] = useState(DEFAULT_TIMER_ALERT_VIBRATION_ENABLED);
  const [timerAlertSoundEnabled, setTimerAlertSoundEnabled] = useState(
    DEFAULT_TIMER_ALERT_SOUND_ENABLED,
  );
  const [timerAlertSoundId, setTimerAlertSoundId] =
    useState<TimerAlertSoundId>(DEFAULT_TIMER_ALERT_SOUND_ID);
  const [timerAlertDurationId, setTimerAlertDurationId] =
    useState<TimerAlertDurationId>(DEFAULT_TIMER_ALERT_DURATION_ID);
  const [
    timerAlertVibrationPatternId,
    setTimerAlertVibrationPatternId,
  ] = useState<TimerAlertVibrationPatternId>(
    DEFAULT_TIMER_ALERT_VIBRATION_PATTERN_ID,
  );
  const [isTimerAlertActive, setIsTimerAlertActiveState] = useState(false);
  const [finishError, setFinishError] = useState<TranslationKey | null>(null);
  const [isFinishingSession, setIsFinishingSession] = useState(false);
  const [isAppForeground, setIsAppForeground] = useState(true);
  const [gestureInputsBlocked, setGestureInputsBlocked] = useState(false);
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const [activeTimekeepingLoaded, setActiveTimekeepingLoaded] =
    useState(false);
  const timerRef = useRef(timer);
  const previousTimerForHistoryRef = useRef(timer);
  const screenRef = useRef(screen);
  const settingsReturnScreenRef = useRef<AppScreen>('timer');
  const sensitivityRef = useRef(sensitivity);
  const normalTimerModeRef = useRef(normalTimerMode);
  const timekeepingModeRef = useRef(timekeepingMode);
  const timerTargetDurationMsRef = useRef(timerTargetDurationMs);
  const timerModeIdRef = useRef(timerModeId);
  const persistedTimerModeIdRef = useRef(timerModeId);
  const temporaryTimerModeIdRef = useRef<TimerModeId | null>(null);
  const temporaryTimerModeUsedRef = useRef(false);
  const previousTimerPhaseRef = useRef(timer.phase);
  const lastTimerAlertKeyRef = useRef<string | null>(null);
  const scheduledTimerAlertKeyRef = useRef<string | null>(null);
  const scheduledTimerAlertTriggerAtMsRef = useRef<number | null>(null);
  const scheduledTimerAlertMayFireInBackgroundRef = useRef(false);
  const backgroundTimekeepingNotificationKeyRef = useRef<string | null>(null);
  const startupPermissionsRequestedRef = useRef(false);
  const isTimerAlertActiveRef = useRef(false);
  const isAppForegroundRef = useRef(true);
  const timerAlertAutoClearTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);
  const gestureInputsBlockedRef = useRef(gestureInputsBlocked);
  const isFinishingRef = useRef(false);
  const skippedInitialSettingsSaveRef = useRef(false);

  const setScreen = useCallback<React.Dispatch<React.SetStateAction<AppScreen>>>(
    action => {
      setScreenInternal(currentScreen => {
        const requestedScreen =
          typeof action === 'function'
            ? (action as (value: AppScreen) => AppScreen)(currentScreen)
            : action;
        const returnTarget =
          currentScreen === 'settings' && requestedScreen === 'timer'
            ? settingsReturnScreenRef.current
            : requestedScreen;
        const nextScreen =
          currentScreen === 'settings' &&
          requestedScreen === 'timer' &&
          returnTarget !== 'settings'
            ? returnTarget
            : requestedScreen;

        if (nextScreen === 'settings' && currentScreen !== 'settings') {
          settingsReturnScreenRef.current = currentScreen;
        }

        if (nextScreen !== 'settings') {
          settingsReturnScreenRef.current =
            nextScreen === 'timer' ? 'timer' : settingsReturnScreenRef.current;
        }

        screenRef.current = nextScreen;
        return nextScreen;
      });
    },
    [],
  );

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

  const syncNativeAlarmSchedule = useCallback(
    (alarm: ScheduledAlarm) => {
      scheduleAlarmAlert(alarm, locale).catch(() => undefined);
    },
    [locale],
  );

  const cancelNativeAlarmSchedule = useCallback((id: string) => {
    cancelAlarmAlert(id).catch(() => undefined);
  }, []);

  const refreshActiveAlarmAlert = useCallback(() => {
    getActiveAlarmAlert(locale)
      .then(nextActiveAlarmAlert => {
        setActiveAlarmAlert(nextActiveAlarmAlert);
      })
      .catch(() => undefined);
  }, [locale]);

  const stopActiveAlarmAlert = useCallback(() => {
    stopNativeActiveAlarmAlert()
      .then(() => {
        setActiveAlarmAlert(null);
      })
      .catch(() => undefined);
  }, []);

  const silenceActiveAlarmAlert = useCallback(() => {
    stopNativeActiveAlarmAlert().catch(() => undefined);
  }, []);

  const snoozeActiveAlarmAlert = useCallback(
    (minutes: number) => {
      const currentActiveAlarmAlert = activeAlarmAlert;
      const alarmId = currentActiveAlarmAlert?.alarmId;
      const matchingAlarm =
        alarmId === null || alarmId === undefined
          ? null
          : alarms.find(alarm => alarm.id === alarmId) ?? null;

      if (matchingAlarm === null || !matchingAlarm.snoozeEnabled) {
        stopActiveAlarmAlert();
        return;
      }

      snoozeNativeActiveAlarmAlert(
        matchingAlarm,
        minutes,
        currentActiveAlarmAlert,
        locale,
      )
        .then(() => {
          setActiveAlarmAlert(null);
        })
        .catch(() => undefined);
    },
    [activeAlarmAlert, alarms, locale, stopActiveAlarmAlert],
  );

  const saveAlarm = useCallback(
    (alarm: ScheduledAlarm) => {
      const now = Date.now();
      const normalizedAlarm = normalizeAlarm({
        ...alarm,
        updatedAtMs: now,
      });

      if (normalizedAlarm === null) {
        return;
      }

      setAlarms(currentAlarms => {
        const withoutCurrent = currentAlarms.filter(
          current => current.id !== normalizedAlarm.id,
        );
        const nextAlarms = [...withoutCurrent, normalizedAlarm].sort(
          (left, right) => left.createdAtMs - right.createdAtMs,
        );

        alarmRepository.saveAll(nextAlarms).catch(() => undefined);
        syncNativeAlarmSchedule(normalizedAlarm);
        return nextAlarms;
      });
    },
    [alarmRepository, syncNativeAlarmSchedule],
  );

  const deleteAlarm = useCallback(
    (id: string) => {
      setAlarms(currentAlarms => {
        const nextAlarms = currentAlarms.filter(alarm => alarm.id !== id);

        alarmRepository.saveAll(nextAlarms).catch(() => undefined);
        cancelNativeAlarmSchedule(id);
        return nextAlarms;
      });
    },
    [alarmRepository, cancelNativeAlarmSchedule],
  );

  const toggleAlarmEnabled = useCallback(
    (id: string) => {
      setAlarms(currentAlarms => {
        const now = Date.now();
        const nextAlarms = currentAlarms.map(alarm =>
          alarm.id === id
            ? {
                ...alarm,
                enabled: !alarm.enabled,
                updatedAtMs: now,
              }
            : alarm,
        );

        alarmRepository.saveAll(nextAlarms).catch(() => undefined);
        nextAlarms
          .filter(alarm => alarm.id === id)
          .forEach(syncNativeAlarmSchedule);
        return nextAlarms;
      });
    },
    [alarmRepository, syncNativeAlarmSchedule],
  );

  const setSensitivity = useCallback<
    React.Dispatch<React.SetStateAction<Sensitivity>>
  >(_action => {
    setSensitivityState('strict');
  }, []);

  const createActiveTimekeepingSessionSnapshot = useCallback(
    (nextTimer: TimerState): ActiveTimekeepingSession => ({
      timekeepingMode: timekeepingModeRef.current,
      timerTargetDurationMs: timerTargetDurationMsRef.current,
      timerModeId: timerModeIdRef.current,
      normalTimerMode: normalTimerModeRef.current,
      timer: nextTimer,
    }),
    [],
  );

  const persistCurrentActiveTimekeepingSession = useCallback(
    (nextTimer = timerRef.current, savedAtMs = Date.now()) => {
      if (temporaryTimerModeIdRef.current !== null) {
        clearPersistedActiveTimekeepingSession().catch(() => undefined);
        return;
      }

      persistActiveTimekeepingSession(
        createActiveTimekeepingSessionSnapshot(nextTimer),
        savedAtMs,
      ).catch(() => undefined);
    },
    [createActiveTimekeepingSessionSnapshot],
  );

  const clearCurrentActiveTimekeepingSession = useCallback(() => {
    clearPersistedActiveTimekeepingSession().catch(() => undefined);
  }, []);

  const clearTimerAlertAutoClearTimeout = useCallback(() => {
    if (timerAlertAutoClearTimeoutRef.current === null) {
      return;
    }

    clearTimeout(timerAlertAutoClearTimeoutRef.current);
    timerAlertAutoClearTimeoutRef.current = null;
  }, []);

  const setTimerAlertActive = useCallback((active: boolean) => {
    isTimerAlertActiveRef.current = active;
    setIsTimerAlertActiveState(active);
  }, []);

  const cancelScheduledTimerEndAlertIfNeeded = useCallback(() => {
    if (scheduledTimerAlertKeyRef.current === null) {
      return;
    }

    scheduledTimerAlertKeyRef.current = null;
    scheduledTimerAlertTriggerAtMsRef.current = null;
    scheduledTimerAlertMayFireInBackgroundRef.current = false;
    cancelScheduledTimerEndAlert().catch(() => undefined);
  }, []);

  const hideBackgroundTimekeepingNotificationIfNeeded = useCallback(() => {
    if (backgroundTimekeepingNotificationKeyRef.current === null) {
      return;
    }

    backgroundTimekeepingNotificationKeyRef.current = null;
    hideBackgroundTimekeepingNotification().catch(() => undefined);
  }, []);

  const clearTimerAlertForegroundArtifacts = useCallback(() => {
    clearTimerAlertAutoClearTimeout();
    backgroundTimekeepingNotificationKeyRef.current = null;
    hideBackgroundTimekeepingNotification().catch(() => undefined);
    setTimerAlertActive(false);
    stopNativeTimerEndAlert().catch(() => undefined);
  }, [clearTimerAlertAutoClearTimeout, setTimerAlertActive]);

  const requestStartupPermissionsIfNeeded = useCallback(() => {
    if (startupPermissionsRequestedRef.current) {
      return;
    }

    startupPermissionsRequestedRef.current = true;
    ensureBackgroundTimekeepingNotificationPermission().catch(() => undefined);
  }, []);

  const stopTimerEndAlert = useCallback(() => {
    cancelScheduledTimerEndAlertIfNeeded();
    clearTimerAlertForegroundArtifacts();
  }, [
    cancelScheduledTimerEndAlertIfNeeded,
    clearTimerAlertForegroundArtifacts,
  ]);

  const scheduleTimerAlertAutoClear = useCallback(
    (durationId: TimerAlertDurationId) => {
      clearTimerAlertAutoClearTimeout();

      const durationMs = getTimerAlertDurationMs(durationId);
      if (durationMs === null) {
        return;
      }

      timerAlertAutoClearTimeoutRef.current = setTimeout(() => {
        timerAlertAutoClearTimeoutRef.current = null;
        setTimerAlertActive(false);
        stopNativeTimerEndAlert().catch(() => undefined);
      }, durationMs);
    },
    [clearTimerAlertAutoClearTimeout, setTimerAlertActive],
  );

  useEffect(() => {
    return () => {
      clearTimerAlertAutoClearTimeout();
      cancelScheduledTimerEndAlertIfNeeded();
      hideBackgroundTimekeepingNotificationIfNeeded();
      stopNativeTimerEndAlert().catch(() => undefined);
    };
  }, [
    cancelScheduledTimerEndAlertIfNeeded,
    clearTimerAlertAutoClearTimeout,
    hideBackgroundTimekeepingNotificationIfNeeded,
  ]);

  useEffect(() => {
    requestStartupPermissionsIfNeeded();
  }, [requestStartupPermissionsIfNeeded]);

  useEffect(() => {
    refreshActiveAlarmAlert();
  }, [refreshActiveAlarmAlert]);

  useEffect(() => {
    let isMounted = true;

    alarmRepository
      .list()
      .then(nextAlarms => {
        if (isMounted) {
          setAlarms(nextAlarms);
          nextAlarms.forEach(syncNativeAlarmSchedule);
        }
      })
      .catch(() => undefined);

    return () => {
      isMounted = false;
    };
  }, [alarmRepository, syncNativeAlarmSchedule]);

  useEffect(() => {
    let isMounted = true;

    Promise.all([
      AsyncStorage.getItem(SETTINGS_STORAGE_KEY),
      AsyncStorage.getItem(ACTIVE_TIMEKEEPING_STORAGE_KEY),
    ])
      .then(([settingsRaw, activeTimekeepingRaw]) => {
        if (!isMounted) {
          return;
        }

        const nextSettings = normalizeStoredSettings(
          parseStoredJson(settingsRaw),
        );
        if (nextSettings !== null) {
          setScreenInternal(nextSettings.lastPrimaryScreen);
          screenRef.current = nextSettings.lastPrimaryScreen;
          settingsReturnScreenRef.current =
            nextSettings.lastPrimaryScreen === 'alarms' ? 'alarms' : 'timer';
          setSensitivity(nextSettings.sensitivity);
          setLocale(nextSettings.locale);
          setStatusDisplayMode(nextSettings.statusDisplayMode);
          setNormalTimerMode(nextSettings.normalTimerMode);
          setTimekeepingModeState(nextSettings.timekeepingMode);
          timekeepingModeRef.current = nextSettings.timekeepingMode;
          setTimerTargetDurationMsState(nextSettings.timerTargetDurationMs);
          timerTargetDurationMsRef.current = nextSettings.timerTargetDurationMs;
          setRecentTimerTargetDurationsMs(
            nextSettings.recentTimerTargetDurationsMs,
          );
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
          persistedTimerModeIdRef.current = nextSettings.timerModeId;
          setTimerAlertVibrationEnabled(
            nextSettings.timerAlertVibrationEnabled,
          );
          setTimerAlertSoundEnabled(nextSettings.timerAlertSoundEnabled);
          setTimerAlertSoundId(nextSettings.timerAlertSoundId);
          setTimerAlertDurationId(nextSettings.timerAlertDurationId);
          setTimerAlertVibrationPatternId(
            nextSettings.timerAlertVibrationPatternId,
          );
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
          setSmileThreshold(nextSettings.smileThreshold);
          setSmileDistanceLevel(nextSettings.smileDistanceLevel);
          setLookAngleLevel(nextSettings.lookAngleLevel);
          setFaceHeightAngleLevel(nextSettings.faceHeightAngleLevel);
          setDetectionResolutionLevel(nextSettings.detectionResolutionLevel);
          setDetectionFrameIntervalLevel(
            nextSettings.detectionFrameIntervalLevel,
          );
          setDetectionPerformanceMode(nextSettings.detectionPerformanceMode);
        }

        const activeSession = normalizeStoredActiveTimekeepingSession(
          activeTimekeepingRaw,
          Date.now(),
        );
        if (activeSession !== null) {
          const restoredTimer = getActiveTimekeepingSessionTimerForNow(
            activeSession,
            Date.now(),
            nextSettings?.sensitivity ?? sensitivityRef.current,
          );

          setTimekeepingModeState(activeSession.timekeepingMode);
          timekeepingModeRef.current = activeSession.timekeepingMode;
          setScreenInternal('timer');
          screenRef.current = 'timer';
          settingsReturnScreenRef.current = 'timer';
          setTimerTargetDurationMsState(activeSession.timerTargetDurationMs);
          timerTargetDurationMsRef.current =
            activeSession.timerTargetDurationMs;
          setNormalTimerMode(activeSession.normalTimerMode);
          normalTimerModeRef.current = activeSession.normalTimerMode;
          setTimerModeIdState(activeSession.timerModeId);
          timerModeIdRef.current = activeSession.timerModeId;
          persistedTimerModeIdRef.current = activeSession.timerModeId;
          previousTimerForHistoryRef.current = restoredTimer;

          if (
            restoredTimer.phase === 'ended' &&
            activeSession.timekeepingMode === 'timer'
          ) {
            lastTimerAlertKeyRef.current =
              getCompletedTimerAlertKey(restoredTimer);
            clearTimerAlertForegroundArtifacts();
          }

          setTimer(restoredTimer);
          backgroundTimekeepingNotificationKeyRef.current = null;
          hideBackgroundTimekeepingNotification().catch(() => undefined);
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (isMounted) {
          setSettingsLoaded(true);
          setActiveTimekeepingLoaded(true);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [clearTimerAlertForegroundArtifacts, setSensitivity, setTimer]);

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
      lastPrimaryScreen: getPrimaryScreenForPersistence(
        screen,
        settingsReturnScreenRef.current,
      ),
      locale,
      statusDisplayMode,
      normalTimerMode,
      timekeepingMode,
      timerTargetDurationMs,
      recentTimerTargetDurationsMs,
      timerModeId: persistedTimerModeIdRef.current,
      timerAlertVibrationEnabled,
      timerAlertSoundEnabled,
      timerAlertSoundId,
      timerAlertDurationId,
      timerAlertVibrationPatternId,
      winkLeftEyeClosedThreshold,
      winkRightEyeClosedThreshold,
      winkLeftEyeProbabilityGapThreshold,
      winkRightEyeProbabilityGapThreshold,
      winkDistanceLevel,
      smileThreshold,
      smileDistanceLevel,
      lookAngleLevel,
      faceHeightAngleLevel,
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
    locale,
    lookAngleLevel,
    normalTimerMode,
    screen,
    sensitivity,
    settingsLoaded,
    smileDistanceLevel,
    smileThreshold,
    statusDisplayMode,
    timerAlertDurationId,
    timerAlertSoundEnabled,
    timerAlertSoundId,
    timerAlertVibrationEnabled,
    timerAlertVibrationPatternId,
    timekeepingMode,
    recentTimerTargetDurationsMs,
    timerTargetDurationMs,
    timerModeId,
    winkDistanceLevel,
    winkLeftEyeProbabilityGapThreshold,
    winkRightEyeProbabilityGapThreshold,
    winkLeftEyeClosedThreshold,
    winkRightEyeClosedThreshold,
  ]);

  useEffect(() => {
    if (!activeTimekeepingLoaded) {
      return;
    }

    if (timer.phase === 'active' || timer.phase === 'manualPaused') {
      persistCurrentActiveTimekeepingSession(timerRef.current);
      return;
    }

    clearCurrentActiveTimekeepingSession();
  }, [
    activeTimekeepingLoaded,
    clearCurrentActiveTimekeepingSession,
    normalTimerMode,
    persistCurrentActiveTimekeepingSession,
    timekeepingMode,
    timer.isLookPaused,
    timer.phase,
    timer.startedAtMs,
    timer.targetDurationMs,
    timerModeId,
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
    if (
      normalTimerMode ||
      modeRunsWithoutGaze(timerModeId) ||
      timer.phase !== 'active' ||
      timer.startedAtMs === null
    ) {
      return;
    }

    recordFunnelEvent(
      'wt_camera_mode_start',
      {
        mode_id: timerModeId,
        timekeeping_mode: timekeepingMode,
        target_set: timer.targetDurationMs !== null,
      },
      {
        oncePerSessionKey: [
          'camera-mode-start',
          timerModeId,
          timekeepingMode,
          timer.startedAtMs,
        ].join(':'),
      },
    );
  }, [
    normalTimerMode,
    timekeepingMode,
    timer.phase,
    timer.startedAtMs,
    timer.targetDurationMs,
    timerModeId,
  ]);

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
    const alertEnabled = timerAlertVibrationEnabled || timerAlertSoundEnabled;
    const targetDurationMs = timer.targetDurationMs;
    const canScheduleAlert =
      alertEnabled &&
      timekeepingMode === 'timer' &&
      timer.phase === 'active' &&
      !timer.isLookPaused &&
      targetDurationMs !== null;

    if (!canScheduleAlert) {
      const shouldPreserveDueBackgroundAlert =
        timer.phase === 'ended' &&
        scheduledTimerAlertMayFireInBackgroundRef.current &&
        scheduledTimerAlertTriggerAtMsRef.current !== null &&
        Date.now() >= scheduledTimerAlertTriggerAtMsRef.current;

      if (shouldPreserveDueBackgroundAlert) {
        return;
      }

      cancelScheduledTimerEndAlertIfNeeded();
      return;
    }

    const remainingMs = targetDurationMs - timer.focusDurationMs;
    if (remainingMs <= 0) {
      cancelScheduledTimerEndAlertIfNeeded();
      return;
    }

    const triggerAtMs = Math.round(timer.lastUpdatedAtMs + remainingMs);
    const timerAlertNotificationTitle = t('notification.timerAlertTitle');
    const timerAlertNotificationText = t('notification.timerAlertText');
    const timerAlertNotificationChannelName = t(
      'notification.timerAlertsChannel',
    );
    const timekeepingFinishedTitle = t('notification.timerTitle');
    const timekeepingFinishedText = t('notification.timerAlertText');
    const timekeepingChannelName = t('notification.backgroundChannel');
    const scheduleKey = [
      timer.startedAtMs ?? 'none',
      triggerAtMs,
      timerAlertVibrationEnabled,
      timerAlertSoundEnabled,
      timerAlertSoundId,
      timerAlertDurationId,
      timerAlertVibrationPatternId,
      timerAlertNotificationTitle,
      timerAlertNotificationText,
      timerAlertNotificationChannelName,
      timekeepingFinishedTitle,
      timekeepingFinishedText,
      timekeepingChannelName,
    ].join(':');

    if (scheduledTimerAlertKeyRef.current === scheduleKey) {
      return;
    }

    scheduledTimerAlertKeyRef.current = scheduleKey;
    scheduledTimerAlertTriggerAtMsRef.current = triggerAtMs;
    scheduledTimerAlertMayFireInBackgroundRef.current =
      !isAppForegroundRef.current;
    scheduleTimerEndAlert({
      triggerAtMs,
      vibrationEnabled: timerAlertVibrationEnabled,
      soundEnabled: timerAlertSoundEnabled,
      soundId: timerAlertSoundId,
      durationId: timerAlertDurationId,
      vibrationPatternId: timerAlertVibrationPatternId,
      notificationTitle: timerAlertNotificationTitle,
      notificationText: timerAlertNotificationText,
      notificationChannelName: timerAlertNotificationChannelName,
      timekeepingFinishedTitle,
      timekeepingFinishedText,
      timekeepingChannelName,
    }).catch(() => {
      if (scheduledTimerAlertKeyRef.current === scheduleKey) {
        scheduledTimerAlertKeyRef.current = null;
        scheduledTimerAlertTriggerAtMsRef.current = null;
        scheduledTimerAlertMayFireInBackgroundRef.current = false;
      }
    });
  }, [
    cancelScheduledTimerEndAlertIfNeeded,
    timekeepingMode,
    timer.focusDurationMs,
    timer.isLookPaused,
    timer.lastUpdatedAtMs,
    timer.phase,
    timer.startedAtMs,
    timer.targetDurationMs,
    timerAlertDurationId,
    timerAlertSoundEnabled,
    timerAlertSoundId,
    timerAlertVibrationEnabled,
    timerAlertVibrationPatternId,
    t,
  ]);

  useEffect(() => {
    const canShowBackgroundTime =
      !isAppForeground &&
      (timer.phase === 'active' || timer.phase === 'manualPaused');

    if (!canShowBackgroundTime) {
      hideBackgroundTimekeepingNotificationIfNeeded();
      return;
    }

    const isRunningNotification =
      timer.phase === 'active' && !timer.isLookPaused;
    let notificationMode: 'stopwatch' | 'timer' = 'stopwatch';
    let notificationWhenMs = Math.round(
      timer.lastUpdatedAtMs - timer.focusDurationMs,
    );
    let notificationCountsDown = false;
    let notificationDisplayText = '';

    if (timekeepingMode === 'timer' && timer.targetDurationMs !== null) {
      const remainingMs = timer.targetDurationMs - timer.focusDurationMs;

      if (remainingMs <= 0) {
        hideBackgroundTimekeepingNotificationIfNeeded();
        return;
      }

      notificationMode = 'timer';
      notificationWhenMs = Math.round(timer.lastUpdatedAtMs + remainingMs);
      notificationCountsDown = true;
      if (!isRunningNotification) {
        notificationDisplayText =
          formatBackgroundNotificationDuration(remainingMs);
      }
    } else if (!isRunningNotification) {
      notificationDisplayText = formatBackgroundNotificationDuration(
        timer.focusDurationMs,
      );
    }

    if (!isRunningNotification) {
      notificationWhenMs = Date.now();
    }

    const notificationTitle =
      notificationMode === 'timer'
        ? t('notification.timerTitle')
        : t('notification.stopwatchTitle');
    const notificationText = isRunningNotification
      ? notificationMode === 'timer'
        ? t('notification.remainingInStatus')
        : t('notification.elapsedInStatus')
      : notificationDisplayText.trim().length > 0
        ? t('notification.pausedAt', {time: notificationDisplayText})
        : t('notification.paused');
    const notificationChannelName = t('notification.backgroundChannel');

    const notificationKey = [
      timer.startedAtMs ?? 'none',
      notificationMode,
      notificationWhenMs,
      notificationCountsDown,
      isRunningNotification,
      notificationDisplayText,
      notificationTitle,
      notificationText,
      notificationChannelName,
    ].join(':');

    if (backgroundTimekeepingNotificationKeyRef.current === notificationKey) {
      return;
    }

    backgroundTimekeepingNotificationKeyRef.current = notificationKey;
    showBackgroundTimekeepingNotification(
      notificationMode,
      notificationWhenMs,
      notificationCountsDown,
      isRunningNotification,
      notificationDisplayText,
      notificationTitle,
      notificationText,
      notificationChannelName,
    ).catch(() => {
      if (
        backgroundTimekeepingNotificationKeyRef.current === notificationKey
      ) {
        backgroundTimekeepingNotificationKeyRef.current = null;
      }
    });
  }, [
    hideBackgroundTimekeepingNotificationIfNeeded,
    isAppForeground,
    timekeepingMode,
    timer.focusDurationMs,
    timer.isLookPaused,
    timer.lastUpdatedAtMs,
    timer.phase,
    timer.startedAtMs,
    timer.targetDurationMs,
    t,
  ]);

  useEffect(() => {
    if (timer.phase !== 'ended') {
      lastTimerAlertKeyRef.current = null;
      if (isTimerAlertActiveRef.current) {
        stopTimerEndAlert();
      }
      return;
    }

    const targetCompleted =
      timekeepingMode === 'timer' &&
      timer.targetDurationMs !== null &&
      timer.focusDurationMs >= timer.targetDurationMs;

    if (!targetCompleted) {
      return;
    }

    const alertKey = [
      timer.startedAtMs ?? 'none',
      timer.targetDurationMs,
      timer.focusDurationMs,
    ].join(':');

    if (lastTimerAlertKeyRef.current === alertKey) {
      return;
    }

    lastTimerAlertKeyRef.current = alertKey;

    if (!timerAlertVibrationEnabled && !timerAlertSoundEnabled) {
      return;
    }

    const scheduledTriggerAtMs = scheduledTimerAlertTriggerAtMsRef.current;
    const scheduledBackgroundAlertAlreadyDue =
      scheduledTimerAlertMayFireInBackgroundRef.current &&
      scheduledTriggerAtMs !== null &&
      Date.now() >= scheduledTriggerAtMs;

    if (scheduledBackgroundAlertAlreadyDue) {
      cancelScheduledTimerEndAlertIfNeeded();
      clearTimerAlertAutoClearTimeout();
      setTimerAlertActive(false);
      return;
    }

    setTimerAlertActive(true);
    scheduleTimerAlertAutoClear(timerAlertDurationId);

    if (!isAppForeground) {
      return;
    }

    cancelScheduledTimerEndAlertIfNeeded();

    playTimerEndAlert({
      vibrationEnabled: timerAlertVibrationEnabled,
      soundEnabled: timerAlertSoundEnabled,
      soundId: timerAlertSoundId,
      durationId: timerAlertDurationId,
      vibrationPatternId: timerAlertVibrationPatternId,
    }).catch(() => undefined);
  }, [
    cancelScheduledTimerEndAlertIfNeeded,
    clearTimerAlertAutoClearTimeout,
    isAppForeground,
    scheduleTimerAlertAutoClear,
    setTimerAlertActive,
    stopTimerEndAlert,
    timekeepingMode,
    timer.focusDurationMs,
    timer.lastUpdatedAtMs,
    timer.phase,
    timer.startedAtMs,
    timer.targetDurationMs,
    timerAlertDurationId,
    timerAlertSoundEnabled,
    timerAlertSoundId,
    timerAlertVibrationEnabled,
    timerAlertVibrationPatternId,
  ]);

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
    gazeDetector.setSmileThreshold(smileThreshold).catch(() => undefined);
  }, [gazeDetector, smileThreshold]);

  useEffect(() => {
    gazeDetector
      .setSmileDistanceLevel(smileDistanceLevel)
      .catch(() => undefined);
  }, [gazeDetector, smileDistanceLevel]);

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

  const clearTemporaryTimerModeId = useCallback(() => {
    if (temporaryTimerModeIdRef.current === null) {
      return;
    }

    temporaryTimerModeIdRef.current = null;
    temporaryTimerModeUsedRef.current = false;

    const nextModeId = persistedTimerModeIdRef.current;
    if (timerModeIdRef.current === nextModeId) {
      return;
    }

    setSessionHistory([]);
    timerModeIdRef.current = nextModeId;
    setTimerModeIdState(nextModeId);
  }, []);

  useEffect(() => {
    const previousPhase = previousTimerPhaseRef.current;
    const wasRunning =
      previousPhase === 'active' || previousPhase === 'manualPaused';
    const isRunning =
      timer.phase === 'active' || timer.phase === 'manualPaused';

    if (temporaryTimerModeIdRef.current !== null && isRunning) {
      temporaryTimerModeUsedRef.current = true;
    }

    if (
      temporaryTimerModeIdRef.current !== null &&
      temporaryTimerModeUsedRef.current &&
      wasRunning &&
      !isRunning
    ) {
      clearTemporaryTimerModeId();
    }

    previousTimerPhaseRef.current = timer.phase;
  }, [clearTemporaryTimerModeId, timer.phase]);

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
          const listensForSmileAction = canListenForSmileStart(
            currentForTick,
            activeTimerModeId,
          );
          const listensForSmileResume = canResumeFromSmile(
            currentForTick,
            activeTimerModeId,
          );
          const listensForLookAwayStart = canStartFromLookAway(
            currentForTick,
            activeTimerModeId,
          );
          const listensForAnyWink =
            listensForLeftWinkAction ||
            listensForRightWinkAction ||
            listensForLeftWinkReset ||
            listensForRightWinkReset;

          if (
            !listensForAnyWink &&
            !listensForSmileAction &&
            !listensForSmileResume &&
            !listensForLookAwayStart
          ) {
            return currentForTick;
          }

          const consumedSingleWink = listensForAnyWink
            ? gazeDetector.consumeSingleWink(now)
            : null;
          const passiveGestureReading = gazeDetector.getLatestReading(now);
          const passiveWinkReading =
            consumedSingleWink ?? passiveGestureReading;
          const liveWinkActionReading =
            listensForAnyWink && consumedSingleWink === null
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
            listensForLookAwayStart &&
            passiveGestureReading.status === 'notLooking'
          ) {
            return applyLookAwayStartGesture(
              currentForTick,
              passiveGestureReading,
            );
          }

          if (
            listensForSmileAction &&
            passiveGestureReading.smileDetected === true
          ) {
            return applySmileStartGesture(
              currentForTick,
              passiveGestureReading,
            );
          }

          if (
            listensForSmileResume &&
            isNewSmileGesture(currentForTick, passiveGestureReading)
          ) {
            return applySmileResumeGesture(
              currentForTick,
              passiveGestureReading,
            );
          }

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
        const listensForActiveSmilePause =
          gestureInputsEnabled &&
          !activeModeRunsWithoutGaze &&
          canPauseFromSmile(currentForTick, activeTimerModeId);
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
        const withDetection = activeModeRunsWithoutGaze
          ? normalizeNormalTimerState(currentForTick, true)
          : !gestureInputsEnabled
            ? currentForTick
            : applyDetectionWithBehavior(
                currentForTick,
                activeWinkReading,
                activeSensitivity,
                activeBehavior,
              );

        if (
          listensForActiveSmilePause &&
          isNewSmileGesture(currentForTick, activeWinkReading)
        ) {
          return pauseTimer(withDetection, now, activeSensitivity);
        }

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
    screen === 'timer' &&
    !gestureInputsBlocked &&
    isAppForeground &&
    !normalTimerMode &&
    !modeRunsWithoutGaze(timerModeId) &&
    (timer.phase === 'active' ||
      canResetFromWink(timer, timerModeId, 'left') ||
      canResetFromWink(timer, timerModeId, 'right') ||
      canListenForSmileStart(timer, timerModeId) ||
      canResumeFromSmile(timer, timerModeId) ||
      canStartFromLookAway(timer, timerModeId) ||
      canListenForWinkAction(timer, timerModeId, 'left') ||
      canListenForWinkAction(timer, timerModeId, 'right'));

  const shouldRunDevicePostureDetector =
    screen === 'timer' &&
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
        const nextIsForeground = nextState === 'active';
        const now = Date.now();
        isAppForegroundRef.current = nextIsForeground;

        if (!nextIsForeground) {
          const currentSession = createActiveTimekeepingSessionSnapshot(
            timerRef.current,
          );
          const currentTimerForNow =
            getActiveTimekeepingSessionTimerForNow(
              currentSession,
              now,
              sensitivityRef.current,
            );
          persistCurrentActiveTimekeepingSession(currentTimerForNow, now);
        }

        const scheduledBackgroundAlertDue =
          scheduledTimerAlertMayFireInBackgroundRef.current &&
          scheduledTimerAlertTriggerAtMsRef.current !== null &&
          now >= scheduledTimerAlertTriggerAtMsRef.current;
        if (
          nextIsForeground &&
          (scheduledBackgroundAlertDue || timerRef.current.phase === 'ended')
        ) {
          clearTimerAlertForegroundArtifacts();
        }

        if (
          !nextIsForeground &&
          scheduledTimerAlertKeyRef.current !== null
        ) {
          scheduledTimerAlertMayFireInBackgroundRef.current = true;
        }

        if (
          nextIsForeground &&
          scheduledTimerAlertTriggerAtMsRef.current !== null &&
          now < scheduledTimerAlertTriggerAtMsRef.current
        ) {
          scheduledTimerAlertMayFireInBackgroundRef.current = false;
        }

        if (nextIsForeground) {
          refreshActiveAlarmAlert();
        }

        setIsAppForeground(nextIsForeground);
      },
    );

    return () => {
      subscription.remove();
    };
  }, [
    clearTimerAlertForegroundArtifacts,
    createActiveTimekeepingSessionSnapshot,
    persistCurrentActiveTimekeepingSession,
    refreshActiveAlarmAlert,
    setTimer,
  ]);

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

  const setTimerModeId = useCallback<SetTimerModeId>((action, options) => {
    const currentModeId = timerModeIdRef.current;
    const nextModeId =
      typeof action === 'function'
        ? (action as (value: TimerModeId) => TimerModeId)(currentModeId)
        : action;
    const temporary = options?.temporary === true;

    if (
      nextModeId === currentModeId &&
      temporaryTimerModeIdRef.current === (temporary ? nextModeId : null)
    ) {
      return;
    }

    setSessionHistory([]);
    if (temporary) {
      temporaryTimerModeIdRef.current = nextModeId;
      temporaryTimerModeUsedRef.current = false;
    } else {
      temporaryTimerModeIdRef.current = null;
      temporaryTimerModeUsedRef.current = false;
      persistedTimerModeIdRef.current = nextModeId;
    }
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
      setRecentTimerTargetDurationsMs(currentDurationsMs =>
        addRecentTimerTargetDurationMs(currentDurationsMs, nextDurationMs),
      );
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

  const requestTimerTargetPopup = useCallback(() => {
    setTimerTargetPopupRequestId(currentRequestId => currentRequestId + 1);
  }, []);

  const consumeTimerTargetPopupRequest = useCallback((requestId: number) => {
    setTimerTargetPopupRequestId(currentRequestId =>
      currentRequestId === requestId ? 0 : currentRequestId,
    );
  }, []);

  const startTimerSession = useCallback(() => {
    const now = Date.now();
    const activeTimekeepingMode = timekeepingModeRef.current;
    const activeModeId = timerModeIdRef.current;
    const activeNormalTimerMode = normalTimerModeRef.current;
    const targetDurationMs =
      activeTimekeepingMode === 'timer'
        ? timerTargetDurationMsRef.current
        : undefined;

    setFinishError(null);
    recordFunnelEvent('wt_timer_start', {
      mode_id: activeModeId,
      is_camera_mode:
        !activeNormalTimerMode && !modeRunsWithoutGaze(activeModeId),
      timekeeping_mode: activeTimekeepingMode,
      target_set: targetDurationMs !== undefined,
    });
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
    setSessionHistory([]);
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
      setFinishError(FINISH_ERROR_KEY);
    } finally {
      isFinishingRef.current = false;
      setIsFinishingSession(false);
    }
  }, [repository, setScreen, setTimer]);

  const value = useMemo<AppStateValue>(
    () => ({
      screen,
      setScreen,
      timer,
      setTimer,
      sessions,
      setSessions,
      alarms,
      activeAlarmAlert,
      saveAlarm,
      deleteAlarm,
      toggleAlarmEnabled,
      stopActiveAlarmAlert,
      silenceActiveAlarmAlert,
      snoozeActiveAlarmAlert,
      lastSummary,
      setLastSummary,
      sessionHistory,
      sensitivity,
      locale,
      setLocale,
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
      smileThreshold,
      setSmileThreshold,
      smileDistanceLevel,
      setSmileDistanceLevel,
      lookAngleLevel,
      setLookAngleLevel,
      faceHeightAngleLevel,
      setFaceHeightAngleLevel,
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
      recentTimerTargetDurationsMs,
      setTimerTargetDurationMs,
      timerTargetPopupRequestId,
      requestTimerTargetPopup,
      consumeTimerTargetPopupRequest,
      timerModeId,
      setTimerModeId,
      clearTemporaryTimerModeId,
      timerAlertVibrationEnabled,
      setTimerAlertVibrationEnabled,
      timerAlertSoundEnabled,
      setTimerAlertSoundEnabled,
      timerAlertSoundId,
      setTimerAlertSoundId,
      timerAlertDurationId,
      setTimerAlertDurationId,
      timerAlertVibrationPatternId,
      setTimerAlertVibrationPatternId,
      isTimerAlertActive,
      stopTimerEndAlert,
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
      setScreen,
      timer,
      sessions,
      alarms,
      activeAlarmAlert,
      lastSummary,
      sessionHistory,
      sensitivity,
      locale,
      winkLeftEyeClosedThreshold,
      winkRightEyeClosedThreshold,
      winkLeftEyeProbabilityGapThreshold,
      winkRightEyeProbabilityGapThreshold,
      winkDistanceLevel,
      smileThreshold,
      smileDistanceLevel,
      lookAngleLevel,
      faceHeightAngleLevel,
      detectionResolutionLevel,
      detectionFrameIntervalLevel,
      detectionPerformanceMode,
      statusDisplayMode,
      normalTimerMode,
      timekeepingMode,
      timerTargetDurationMs,
      recentTimerTargetDurationsMs,
      timerTargetPopupRequestId,
      timerModeId,
      clearTemporaryTimerModeId,
      timerAlertVibrationEnabled,
      timerAlertSoundEnabled,
      timerAlertSoundId,
      timerAlertDurationId,
      timerAlertVibrationPatternId,
      isTimerAlertActive,
      gestureInputsBlocked,
      finishError,
      isFinishingSession,
      repository,
      gazeDetector,
      saveAlarm,
      deleteAlarm,
      toggleAlarmEnabled,
      stopActiveAlarmAlert,
      silenceActiveAlarmAlert,
      snoozeActiveAlarmAlert,
      setSensitivity,
      setTimer,
      setTimekeepingMode,
      setTimerTargetDurationMs,
      requestTimerTargetPopup,
      consumeTimerTargetPopupRequest,
      setTimerModeId,
      stopTimerEndAlert,
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
