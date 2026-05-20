import type {DetectionReading, DetectionStatus, Sensitivity} from './detection';
import {sensitivityConfig} from './detection';
import {createSessionId, type SessionSummary} from './session';

export type TimerPhase = 'idle' | 'active' | 'manualPaused' | 'ended';

export type TimerState = {
  phase: TimerPhase;
  startedAtMs: number | null;
  lastUpdatedAtMs: number;
  focusDurationMs: number;
  lookPausedDurationMs: number;
  lookPauseCount: number;
  targetDurationMs: number | null;
  detectionStatus: DetectionStatus;
  lookingStartedAtMs: number | null;
  isLookPaused: boolean;
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
    lookingStartedAtMs: null,
    isLookPaused: false,
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
  const advanced = accumulate(state, nowMs, sensitivity);
  return resolveLookGrace(advanced, nowMs, sensitivity);
}

export function applyDetection(
  state: TimerState,
  reading: DetectionReading,
  sensitivity: Sensitivity = 'normal',
): TimerState {
  if (state.phase !== 'active') {
    return state;
  }

  if (reading.atMs < state.lastUpdatedAtMs) {
    return state;
  }

  const advanced = accumulate(state, reading.atMs, sensitivity);
  const next: TimerState = {
    ...advanced,
    detectionStatus: reading.status,
    lookingStartedAtMs:
      reading.status === 'looking'
        ? advanced.lookingStartedAtMs ?? reading.atMs
        : null,
    isLookPaused: reading.status === 'looking' ? advanced.isLookPaused : false,
  };

  return resolveLookGrace(next, reading.atMs, sensitivity);
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
    lookingStartedAtMs: null,
    isLookPaused: false,
  };
}

export function pauseTimer(state: TimerState, nowMs: number, sensitivity: Sensitivity = 'normal'): TimerState {
  if (state.phase !== 'active') {
    return state;
  }

  return {...accumulate(state, nowMs, sensitivity), phase: 'manualPaused', lastUpdatedAtMs: nowMs};
}

export function resumeTimer(state: TimerState, nowMs: number): TimerState {
  if (state.phase !== 'manualPaused') {
    return state;
  }

  return {
    ...state,
    phase: 'active',
    lastUpdatedAtMs: nowMs,
    detectionStatus: 'unknown',
    lookingStartedAtMs: null,
    isLookPaused: false,
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

function accumulate(state: TimerState, nowMs: number, sensitivity: Sensitivity = 'normal'): TimerState {
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

  if (state.detectionStatus === 'looking' && state.lookingStartedAtMs !== null) {
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

  if (state.detectionStatus === 'notLooking') {
    return {
      ...state,
      focusDurationMs: state.focusDurationMs + deltaMs,
      lastUpdatedAtMs: nowMs,
    };
  }

  return {...state, lastUpdatedAtMs: nowMs};
}

function resolveLookGrace(state: TimerState, nowMs: number, sensitivity: Sensitivity): TimerState {
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
