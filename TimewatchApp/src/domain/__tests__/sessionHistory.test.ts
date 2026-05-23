import {
  createSessionHistoryEvent,
  getSessionHistoryEventType,
} from '../sessionHistory';
import {
  createInitialTimerState,
  markTimerEnded,
  pauseTimer,
  resumeTimer,
  startTimer,
} from '../timerEngine';

describe('sessionHistory', () => {
  it('records focus delta from the previous history event', () => {
    const start = createSessionHistoryEvent('START', 1000, 0);
    const stop = createSessionHistoryEvent('STOP', 6000, 5000, start);
    const lap = createSessionHistoryEvent('LAP', 6500, 5500, stop);
    const end = createSessionHistoryEvent('END', 9000, 7000, lap);

    expect(start.deltaMs).toBe(0);
    expect(stop.deltaMs).toBe(5000);
    expect(lap.deltaMs).toBe(500);
    expect(end.deltaMs).toBe(1500);
  });

  it('detects start, stop, resume, reset, and end transitions', () => {
    const idle = createInitialTimerState(0);
    const active = startTimer(idle, 1000, undefined);
    const stopped = pauseTimer(active, 5000);
    const resumed = resumeTimer(stopped, 7000);
    const reset = createInitialTimerState(8000);
    const ended = markTimerEnded(resumed, 9000);

    expect(getSessionHistoryEventType(idle, active)).toBe('START');
    expect(getSessionHistoryEventType(active, stopped)).toBe('STOP');
    expect(getSessionHistoryEventType(stopped, resumed)).toBe('RESUME');
    expect(getSessionHistoryEventType(stopped, reset)).toBe('RESET');
    expect(getSessionHistoryEventType(resumed, ended)).toBe('END');
  });

  it('detects look-pause stop and resume transitions inside active phase', () => {
    const active = startTimer(createInitialTimerState(0), 1000, undefined);
    const lookStopped = {...active, detectionStatus: 'looking' as const};
    const lookResumed = {...lookStopped, detectionStatus: 'notLooking' as const};

    expect(
      getSessionHistoryEventType(active, lookStopped, {
        treatLookingAsStopped: true,
      }),
    ).toBe('STOP');
    expect(
      getSessionHistoryEventType(lookStopped, lookResumed, {
        treatLookingAsStopped: true,
      }),
    ).toBe('RESUME');
  });
});
