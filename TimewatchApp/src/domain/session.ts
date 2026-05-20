import type {Sensitivity} from './detection';

export type SessionSummary = {
  id: string;
  startedAt: string;
  endedAt: string;
  focusDurationMs: number;
  lookPausedDurationMs: number;
  lookPauseCount: number;
  targetEnabled: boolean;
  targetDurationMs: number | null;
  targetCompleted: boolean;
  sensitivity: Sensitivity;
  normalTimerMode: boolean;
};

export function createSessionId(startedAtMs: number, endedAtMs: number): string {
  return `session-${startedAtMs}-${endedAtMs}`;
}
