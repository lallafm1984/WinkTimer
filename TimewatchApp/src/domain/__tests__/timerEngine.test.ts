import {
  applyDetection,
  createInitialTimerState,
  endTimer,
  pauseTimer,
  resumeTimer,
  startTimer,
  tickTimer,
} from '../timerEngine';

describe('timerEngine', () => {
  it('counts focus time only while active and notLooking', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 1000, undefined);
    state = applyDetection(state, {status: 'notLooking', confidence: 0.9, atMs: 1000});
    state = tickTimer(state, 4000);

    expect(state.focusDurationMs).toBe(3000);
    expect(state.lookPausedDurationMs).toBe(0);
  });

  it('does not count focus time while detection is unknown', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 0, undefined);
    state = applyDetection(state, {status: 'unknown', confidence: 0, atMs: 0});
    state = tickTimer(state, 5000);

    expect(state.focusDurationMs).toBe(0);
    expect(state.lookPausedDurationMs).toBe(0);
  });

  it('increments look pause count once when looking becomes sustained', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 0, undefined);
    state = applyDetection(state, {status: 'notLooking', confidence: 0.9, atMs: 0});
    state = tickTimer(state, 1000);
    state = applyDetection(state, {status: 'looking', confidence: 0.95, atMs: 1000});
    state = tickTimer(state, 1500);
    state = tickTimer(state, 2300);

    expect(state.lookPauseCount).toBe(1);
    expect(state.isLookPaused).toBe(true);
  });

  it('moves sustained looking time after grace into look pause duration', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 1000, undefined);
    state = applyDetection(state, {status: 'looking', confidence: 0.95, atMs: 1000});
    state = tickTimer(state, 5000);

    expect(state.focusDurationMs).toBe(1200);
    expect(state.lookPausedDurationMs).toBe(2800);
    expect(state.lookPauseCount).toBe(1);
    expect(state.isLookPaused).toBe(true);
  });

  it('uses requested sensitivity when pausing during sustained looking', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 0, undefined);
    state = applyDetection(state, {status: 'looking', confidence: 0.95, atMs: 0}, 'strict');
    state = pauseTimer(state, 800, 'strict');

    expect(state.phase).toBe('manualPaused');
    expect(state.focusDurationMs).toBe(600);
    expect(state.lookPausedDurationMs).toBe(200);
    expect(state.lookPauseCount).toBe(1);
    expect(state.isLookPaused).toBe(true);
  });

  it('ignores pause and resume calls outside their valid phases', () => {
    const idle = createInitialTimerState(0);
    expect(pauseTimer(idle, 1000)).toEqual(idle);
    expect(resumeTimer(idle, 1000)).toEqual(idle);

    const active = startTimer(idle, 0, undefined);
    expect(resumeTimer(active, 1000)).toEqual(active);

    const paused = pauseTimer(active, 100);
    expect(pauseTimer(paused, 200)).toEqual(paused);

    const ended = {...active, phase: 'ended' as const, lastUpdatedAtMs: 100};
    expect(pauseTimer(ended, 200)).toEqual(ended);
    expect(resumeTimer(ended, 200)).toEqual(ended);
  });

  it('resumes from manual pause with fresh unknown detection state', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 0, undefined);
    state = applyDetection(state, {status: 'looking', confidence: 0.95, atMs: 0});
    state = pauseTimer(state, 500);
    state = resumeTimer(state, 5000);

    expect(state.phase).toBe('active');
    expect(state.detectionStatus).toBe('unknown');
    expect(state.lookingStartedAtMs).toBeNull();
    expect(state.isLookPaused).toBe(false);

    state = tickTimer(state, 7000);

    expect(state.focusDurationMs).toBe(500);
    expect(state.lookPausedDurationMs).toBe(0);
    expect(state.lookPauseCount).toBe(0);
  });

  it('creates a session summary when ended', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 1000, 25 * 60 * 1000);
    state = applyDetection(state, {status: 'notLooking', confidence: 0.9, atMs: 1000});
    state = tickTimer(state, 61000);

    const summary = endTimer(state, 61000, 'normal', false);

    expect(summary.focusDurationMs).toBe(60000);
    expect(summary.targetEnabled).toBe(true);
    expect(summary.targetCompleted).toBe(false);
    expect(summary.sensitivity).toBe('normal');
  });
});
