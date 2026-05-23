import type {TimerState} from './timerEngine';

export type SessionHistoryEventType =
  | 'START'
  | 'LAP'
  | 'STOP'
  | 'RESUME'
  | 'RESET'
  | 'END';

export type SessionHistoryEvent = {
  id: string;
  type: SessionHistoryEventType;
  atMs: number;
  elapsedMs: number;
  deltaMs: number;
};

export type SessionHistoryBehavior = {
  treatLookingAsStopped?: boolean;
};

function isStoppedForHistory(
  timer: TimerState,
  behavior: SessionHistoryBehavior = {},
) {
  return (
    timer.phase === 'manualPaused' ||
    (timer.phase === 'active' &&
      (timer.isLookPaused ||
        (behavior.treatLookingAsStopped &&
          timer.detectionStatus === 'looking')))
  );
}

export function getSessionHistoryEventType(
  previous: TimerState,
  next: TimerState,
  behavior: SessionHistoryBehavior = {},
): SessionHistoryEventType | null {
  if (previous.phase !== 'ended' && next.phase === 'ended') {
    return 'END';
  }

  if (
    previous.phase !== 'idle' &&
    next.phase === 'idle' &&
    next.focusDurationMs === 0
  ) {
    return 'RESET';
  }

  if (
    (previous.phase === 'idle' || previous.phase === 'ended') &&
    next.phase === 'active'
  ) {
    return 'START';
  }

  if (
    isStoppedForHistory(previous, behavior) &&
    next.phase === 'active' &&
    !isStoppedForHistory(next, behavior)
  ) {
    return 'RESUME';
  }

  if (
    !isStoppedForHistory(previous, behavior) &&
    isStoppedForHistory(next, behavior)
  ) {
    return 'STOP';
  }

  return null;
}

export function createSessionHistoryEvent(
  type: SessionHistoryEventType,
  atMs: number,
  elapsedMs: number,
  previous?: SessionHistoryEvent,
): SessionHistoryEvent {
  return {
    id: `${type}-${atMs}`,
    type,
    atMs,
    elapsedMs,
    deltaMs: previous ? Math.max(0, elapsedMs - previous.elapsedMs) : elapsedMs,
  };
}
