import {
  applyDetection,
  applyDetectionWithBehavior,
  createInitialTimerState,
  endTimer,
  markTimerEnded,
  pauseTimer,
  resumeTimer,
  startTimer,
  tickTimer,
  tickTimerWithBehavior,
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

  it('counts looking during grace as paused time without marking sustained look pause', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 1000, undefined);
    state = applyDetection(state, {status: 'looking', confidence: 0.95, atMs: 1000});
    state = tickTimer(state, 1500);

    expect(state.focusDurationMs).toBe(0);
    expect(state.lookPausedDurationMs).toBe(500);
    expect(state.lookPauseCount).toBe(0);
    expect(state.isLookPaused).toBe(false);
  });

  it('moves sustained looking time after grace into look pause duration', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 1000, undefined);
    state = applyDetection(state, {status: 'looking', confidence: 0.95, atMs: 1000});
    state = tickTimer(state, 5000);

    expect(state.focusDurationMs).toBe(0);
    expect(state.lookPausedDurationMs).toBe(4000);
    expect(state.lookPauseCount).toBe(1);
    expect(state.isLookPaused).toBe(true);
  });

  it('keeps counting focus while looking when look pause is disabled', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 0, undefined);
    state = applyDetectionWithBehavior(
      state,
      {status: 'looking', confidence: 0.95, atMs: 0},
      'normal',
      {lookPauseEnabled: false},
    );
    state = tickTimerWithBehavior(state, 3000, 'normal', {
      lookPauseEnabled: false,
    });

    expect(state.focusDurationMs).toBe(3000);
    expect(state.lookPausedDurationMs).toBe(0);
    expect(state.lookPauseCount).toBe(0);
    expect(state.isLookPaused).toBe(false);
  });

  it('treats both closed eyes as looking without resetting the timer', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 1000, undefined);
    state = applyDetection(state, {
      status: 'looking',
      confidence: 0.8,
      eyeState: 'bothClosed',
      atMs: 1000,
    });
    state = tickTimer(state, 5000);

    expect(state.focusDurationMs).toBe(0);
    expect(state.lookPausedDurationMs).toBe(4000);
    expect(state.lookPauseCount).toBe(1);
    expect(state.isLookPaused).toBe(true);
  });

  it('does not reset from holding one eye closed while look-paused', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 1000, 60000);
    state = applyDetection(state, {
      status: 'notLooking',
      confidence: 1,
      eyeState: 'bothOpen',
      atMs: 1000,
    });
    state = tickTimer(state, 2500);
    state = applyDetection(state, {
      status: 'looking',
      confidence: 0.8,
      eyeState: 'oneEyeClosed',
      atMs: 2500,
    });
    state = tickTimer(state, 5499);

    expect(state.focusDurationMs).toBe(1500);
    expect(state.lookPausedDurationMs).toBe(2999);

    state = tickTimer(state, 5500);

    expect(state.phase).toBe('active');
    expect(state.startedAtMs).toBe(1000);
    expect(state.lastUpdatedAtMs).toBe(5500);
    expect(state.focusDurationMs).toBe(1500);
    expect(state.lookPausedDurationMs).toBe(3000);
    expect(state.lookPauseCount).toBe(1);
    expect(state.targetDurationMs).toBe(60000);
    expect(state.detectionStatus).toBe('looking');
    expect(state.eyeState).toBe('oneEyeClosed');
    expect(state.oneEyeClosedStartedAtMs).toBe(2500);
  });

  it('keeps running while the same one-eye closure continues', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 0, undefined);
    state = applyDetection(state, {
      status: 'looking',
      confidence: 0.8,
      eyeState: 'oneEyeClosed',
      atMs: 0,
    });
    state = tickTimer(state, 3000);
    state = tickTimer(state, 8000);

    expect(state.phase).toBe('active');
    expect(state.startedAtMs).toBe(0);
    expect(state.focusDurationMs).toBe(0);
    expect(state.lookPausedDurationMs).toBe(8000);
  });

  it('does not reset from a wink hold while the timer is still running', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 0, undefined);
    state = applyDetectionWithBehavior(
      state,
      {
        status: 'looking',
        confidence: 0.8,
        eyeState: 'oneEyeClosed',
        atMs: 0,
      },
      'normal',
      {lookPauseEnabled: false},
    );
    state = tickTimerWithBehavior(state, 4000, 'normal', {
      lookPauseEnabled: false,
    });

    expect(state.phase).toBe('active');
    expect(state.startedAtMs).toBe(0);
    expect(state.focusDurationMs).toBe(4000);
  });

  it('does not reset when eye state is unknown even if looking lasts 3 seconds', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 0, undefined);
    state = applyDetection(state, {
      status: 'looking',
      confidence: 0.8,
      eyeState: 'unknown',
      atMs: 0,
    });
    state = tickTimer(state, 3000);

    expect(state.startedAtMs).toBe(0);
    expect(state.lookPausedDurationMs).toBe(3000);
  });

  it('uses requested sensitivity when pausing during sustained looking', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 0, undefined);
    state = applyDetection(state, {status: 'looking', confidence: 0.95, atMs: 0}, 'strict');
    state = pauseTimer(state, 800, 'strict');

    expect(state.phase).toBe('manualPaused');
    expect(state.focusDurationMs).toBe(0);
    expect(state.lookPausedDurationMs).toBe(800);
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

    expect(state.focusDurationMs).toBe(0);
    expect(state.lookPausedDurationMs).toBe(500);
    expect(state.lookPauseCount).toBe(0);
  });

  it('ignores detection before a timer starts', () => {
    const idle = createInitialTimerState(0);

    const next = applyDetection(idle, {status: 'looking', confidence: 0.95, atMs: 5000});

    expect(next).toEqual(idle);
  });

  it('starts a fresh session without stale counters or detection', () => {
    let prior = createInitialTimerState(0);
    prior = startTimer(prior, 0, 25 * 60 * 1000);
    prior = applyDetection(prior, {status: 'notLooking', confidence: 0.9, atMs: 0});
    prior = tickTimer(prior, 2000);
    prior = applyDetection(prior, {status: 'looking', confidence: 0.95, atMs: 2000});
    prior = tickTimer(prior, 4000);

    const next = startTimer(prior, 10000, undefined);

    expect(next).toEqual({
      phase: 'active',
      startedAtMs: 10000,
      lastUpdatedAtMs: 10000,
      focusDurationMs: 0,
      lookPausedDurationMs: 0,
      lookPauseCount: 0,
      targetDurationMs: null,
      detectionStatus: 'unknown',
      eyeState: 'unknown',
      winkSide: null,
      recentWinkSide: null,
      recentWinkAtMs: null,
      lookingStartedAtMs: null,
      isLookPaused: false,
      oneEyeClosedStartedAtMs: null,
      oneEyeResetArmed: true,
    });
  });

  it('marks an active timer ended through a public state transition', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 1000, undefined);
    state = applyDetection(state, {status: 'notLooking', confidence: 0.9, atMs: 1000});

    const ended = markTimerEnded(state, 61000);

    expect(ended.phase).toBe('ended');
    expect(ended.lastUpdatedAtMs).toBe(61000);
    expect(ended.focusDurationMs).toBe(60000);
    expect(ended.detectionStatus).toBe('unknown');
    expect(ended.lookingStartedAtMs).toBeNull();
    expect(ended.isLookPaused).toBe(false);
  });

  it('ignores stale looking readings after newer notLooking state', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 0, undefined);
    state = applyDetection(state, {status: 'notLooking', confidence: 0.9, atMs: 1000});
    state = tickTimer(state, 5000);

    const current = state;
    const next = applyDetection(state, {status: 'looking', confidence: 0.95, atMs: 2000});

    expect(next).toEqual(current);
  });

  it('ignores stale notLooking readings after newer look-paused state', () => {
    let state = createInitialTimerState(0);
    state = startTimer(state, 0, undefined);
    state = applyDetection(state, {status: 'looking', confidence: 0.95, atMs: 0});
    state = tickTimer(state, 5000);

    const current = state;
    const next = applyDetection(state, {status: 'notLooking', confidence: 0.9, atMs: 1000});

    expect(next).toEqual(current);
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
