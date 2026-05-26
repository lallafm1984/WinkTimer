import type {
  DetectionReading,
  DetectionStatus,
  EyeState,
  Sensitivity,
  WinkSide,
} from './detection';
import {sensitivityConfig} from './detection';
import {createSessionId, type SessionSummary} from './session';

export type TimerPhase = 'idle' | 'active' | 'manualPaused' | 'ended';

export type TimerBehavior = {
  lookPauseEnabled: boolean;
};

export type TimerState = {
  phase: TimerPhase;
  startedAtMs: number | null;
  lastUpdatedAtMs: number;
  focusDurationMs: number;
  lookPausedDurationMs: number;
  lookPauseCount: number;
  targetDurationMs: number | null;
  detectionStatus: DetectionStatus;
  eyeState: EyeState;
  winkSide: WinkSide | null;
  smileDetected: boolean | null;
  recentWinkSide: WinkSide | null;
  recentWinkAtMs: number | null;
  lookingStartedAtMs: number | null;
  isLookPaused: boolean;
  oneEyeClosedStartedAtMs: number | null;
  oneEyeResetArmed: boolean;
};

export function createInitialTimerState(nowMs: number): TimerState {
  return {
    phase: 'idle',
    startedAtMs: null,
    lastUpdatedAtMs: nowMs,
    focusDurationMs: 0,
    lookPausedDurationMs: 0,
    lookPauseCount: 0,
    targetDurationMs: null,
    detectionStatus: 'unknown',
    eyeState: 'unknown',
    winkSide: null,
    smileDetected: null,
    recentWinkSide: null,
    recentWinkAtMs: null,
    lookingStartedAtMs: null,
    isLookPaused: false,
    oneEyeClosedStartedAtMs: null,
    oneEyeResetArmed: true,
  };
}

export function startTimer(
  _state: TimerState,
  nowMs: number,
  targetDurationMs: number | undefined,
): TimerState {
  return {
    ...createInitialTimerState(nowMs),
    phase: 'active',
    startedAtMs: nowMs,
    targetDurationMs: targetDurationMs ?? null,
  };
}

export function tickTimer(state: TimerState, nowMs: number, sensitivity: Sensitivity = 'normal'): TimerState {
  return tickTimerWithBehavior(state, nowMs, sensitivity, DEFAULT_TIMER_BEHAVIOR);
}

export function tickTimerWithBehavior(
  state: TimerState,
  nowMs: number,
  sensitivity: Sensitivity = 'normal',
  behavior: TimerBehavior = DEFAULT_TIMER_BEHAVIOR,
): TimerState {
  const advanced = accumulate(state, nowMs, sensitivity, behavior);
  return resolveLookGrace(advanced, nowMs, sensitivity, behavior);
}

export function applyDetection(
  state: TimerState,
  reading: DetectionReading,
  sensitivity: Sensitivity = 'normal',
): TimerState {
  return applyDetectionWithBehavior(
    state,
    reading,
    sensitivity,
    DEFAULT_TIMER_BEHAVIOR,
  );
}

export function applyDetectionWithBehavior(
  state: TimerState,
  reading: DetectionReading,
  sensitivity: Sensitivity = 'normal',
  behavior: TimerBehavior = DEFAULT_TIMER_BEHAVIOR,
): TimerState {
  if (state.phase !== 'active') {
    return state;
  }

  if (reading.atMs < state.lastUpdatedAtMs) {
    return state;
  }

  const advanced = accumulate(state, reading.atMs, sensitivity, behavior);
  const eyeState = reading.eyeState ?? 'unknown';
  const tracksOneEyeClosure =
    reading.status === 'looking' && eyeState === 'oneEyeClosed';
  const tracksLookPause = behavior.lookPauseEnabled && reading.status === 'looking';
  const next: TimerState = {
    ...advanced,
    detectionStatus: reading.status,
    eyeState,
    winkSide: tracksOneEyeClosure ? reading.winkSide ?? null : null,
    smileDetected:
      reading.status === 'looking' ? reading.smileDetected ?? null : null,
    lookingStartedAtMs:
      tracksLookPause
        ? advanced.lookingStartedAtMs ?? reading.atMs
        : null,
    isLookPaused: tracksLookPause ? advanced.isLookPaused : false,
    oneEyeClosedStartedAtMs: tracksOneEyeClosure
      ? advanced.oneEyeClosedStartedAtMs ?? reading.atMs
      : null,
    oneEyeResetArmed: tracksOneEyeClosure ? advanced.oneEyeResetArmed : true,
  };

  return resolveLookGrace(next, reading.atMs, sensitivity, behavior);
}

export function markTimerEnded(
  state: TimerState,
  nowMs: number,
  sensitivity: Sensitivity = 'normal',
): TimerState {
  const finalState = accumulate(state, nowMs, sensitivity);

  return {
    ...finalState,
    phase: 'ended',
    lastUpdatedAtMs: nowMs,
    detectionStatus: 'unknown',
    eyeState: 'unknown',
    winkSide: null,
    smileDetected: null,
    recentWinkSide: null,
    recentWinkAtMs: null,
    lookingStartedAtMs: null,
    isLookPaused: false,
    oneEyeClosedStartedAtMs: null,
    oneEyeResetArmed: true,
  };
}

export function pauseTimer(state: TimerState, nowMs: number, sensitivity: Sensitivity = 'normal'): TimerState {
  if (state.phase !== 'active') {
    return state;
  }

  return {...accumulate(state, nowMs, sensitivity), phase: 'manualPaused', lastUpdatedAtMs: nowMs};
}

export function resumeTimer(state: TimerState, nowMs: number): TimerState {
  if (
    state.phase === 'active' &&
    (state.isLookPaused || state.detectionStatus === 'looking')
  ) {
    const advanced = accumulate(state, nowMs);

    return {
      ...advanced,
      phase: 'active',
      lastUpdatedAtMs: nowMs,
      detectionStatus: 'unknown',
      eyeState: 'unknown',
      winkSide: null,
      smileDetected: null,
      recentWinkSide: null,
      recentWinkAtMs: null,
      lookingStartedAtMs: null,
      isLookPaused: false,
      oneEyeClosedStartedAtMs: null,
      oneEyeResetArmed: true,
    };
  }

  if (state.phase === 'manualPaused') {
    return {
      ...state,
      phase: 'active',
      lastUpdatedAtMs: nowMs,
      detectionStatus: 'unknown',
      eyeState: 'unknown',
      winkSide: null,
      smileDetected: null,
      recentWinkSide: null,
      recentWinkAtMs: null,
      lookingStartedAtMs: null,
      isLookPaused: false,
      oneEyeClosedStartedAtMs: null,
      oneEyeResetArmed: true,
    };
  }

  return state;
}

export function resetTimer(state: TimerState, nowMs: number): TimerState {
  return {
    ...createInitialTimerState(nowMs),
    targetDurationMs: state.targetDurationMs,
    detectionStatus: state.detectionStatus,
    eyeState: state.eyeState,
    winkSide: state.eyeState === 'oneEyeClosed' ? state.winkSide : null,
    smileDetected: state.smileDetected,
    recentWinkSide: state.recentWinkSide,
    recentWinkAtMs: state.recentWinkAtMs,
    oneEyeClosedStartedAtMs:
      state.eyeState === 'oneEyeClosed' ? nowMs : null,
    oneEyeResetArmed: state.eyeState !== 'oneEyeClosed',
  };
}

export function endTimer(
  state: TimerState,
  nowMs: number,
  sensitivity: Sensitivity,
  normalTimerMode: boolean,
): SessionSummary {
  const finalState = accumulate(state, nowMs, sensitivity);
  const startedAtMs = finalState.startedAtMs ?? nowMs;
  const targetEnabled = finalState.targetDurationMs !== null;

  return {
    id: createSessionId(startedAtMs, nowMs),
    startedAt: new Date(startedAtMs).toISOString(),
    endedAt: new Date(nowMs).toISOString(),
    focusDurationMs: finalState.focusDurationMs,
    lookPausedDurationMs: finalState.lookPausedDurationMs,
    lookPauseCount: finalState.lookPauseCount,
    targetEnabled,
    targetDurationMs: finalState.targetDurationMs,
    targetCompleted: targetEnabled
      ? finalState.focusDurationMs >= (finalState.targetDurationMs ?? Number.POSITIVE_INFINITY)
      : false,
    sensitivity,
    normalTimerMode,
  };
}

function accumulate(
  state: TimerState,
  nowMs: number,
  sensitivity: Sensitivity = 'normal',
  behavior: TimerBehavior = DEFAULT_TIMER_BEHAVIOR,
): TimerState {
  if (nowMs <= state.lastUpdatedAtMs) {
    return state;
  }

  const deltaMs = nowMs - state.lastUpdatedAtMs;
  if (state.phase !== 'active') {
    return {...state, lastUpdatedAtMs: nowMs};
  }

  if (state.isLookPaused) {
    return {
      ...state,
      lookPausedDurationMs: state.lookPausedDurationMs + deltaMs,
      lastUpdatedAtMs: nowMs,
    };
  }

  if (
    behavior.lookPauseEnabled &&
    state.detectionStatus === 'looking' &&
    state.lookingStartedAtMs !== null
  ) {
    const pauseStartedAtMs = state.lookingStartedAtMs + sensitivityConfig[sensitivity].lookGraceMs;
    const becameLookPaused = !state.isLookPaused && nowMs >= pauseStartedAtMs;

    return {
      ...state,
      lookPausedDurationMs: state.lookPausedDurationMs + deltaMs,
      lookPauseCount: state.lookPauseCount + (becameLookPaused ? 1 : 0),
      isLookPaused: state.isLookPaused || becameLookPaused,
      lastUpdatedAtMs: nowMs,
    };
  }

  if (
    state.detectionStatus === 'notLooking' ||
    (!behavior.lookPauseEnabled && state.detectionStatus === 'looking')
  ) {
    return finishTargetIfReached({
      ...state,
      focusDurationMs: state.focusDurationMs + deltaMs,
      lastUpdatedAtMs: nowMs,
    });
  }

  return {...state, lastUpdatedAtMs: nowMs};
}

function finishTargetIfReached(state: TimerState): TimerState {
  if (
    state.phase !== 'active' ||
    state.targetDurationMs === null ||
    state.focusDurationMs < state.targetDurationMs
  ) {
    return state;
  }

  return {
    ...state,
    phase: 'ended',
    focusDurationMs: state.targetDurationMs,
    detectionStatus: 'unknown',
    eyeState: 'unknown',
    winkSide: null,
    smileDetected: null,
    recentWinkSide: null,
    recentWinkAtMs: null,
    lookingStartedAtMs: null,
    isLookPaused: false,
    oneEyeClosedStartedAtMs: null,
    oneEyeResetArmed: true,
  };
}

function resolveLookGrace(
  state: TimerState,
  nowMs: number,
  sensitivity: Sensitivity,
  behavior: TimerBehavior = DEFAULT_TIMER_BEHAVIOR,
): TimerState {
  if (!behavior.lookPauseEnabled) {
    return state;
  }

  if (state.phase !== 'active' || state.detectionStatus !== 'looking' || state.lookingStartedAtMs === null) {
    return state;
  }

  const graceMs = sensitivityConfig[sensitivity].lookGraceMs;
  const sustainedMs = nowMs - state.lookingStartedAtMs;

  if (sustainedMs < graceMs || state.isLookPaused) {
    return state;
  }

  return {
    ...state,
    isLookPaused: true,
    lookPauseCount: state.lookPauseCount + 1,
  };
}

const DEFAULT_TIMER_BEHAVIOR: TimerBehavior = {
  lookPauseEnabled: true,
};
