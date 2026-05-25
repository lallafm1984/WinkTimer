export type TimerModeId =
  | 'lookPause'
  | 'winkControl'
  | 'smileMode'
  | 'basicTimer'
  | 'flipTimer';

export type TimerModeGesture =
  | 'button'
  | 'leftWink'
  | 'rightWink'
  | 'smile'
  | 'look'
  | 'lookAway'
  | 'deviceFaceDown'
  | 'deviceFaceUp';

export type TimerModePreset = {
  id: TimerModeId;
  title: string;
  description: string;
  beta?: boolean;
  startGesture: TimerModeGesture;
  pauseGesture: TimerModeGesture;
  resumeGesture: TimerModeGesture;
  resetGesture: TimerModeGesture;
  lapGesture?: TimerModeGesture;
  actions: Array<{label: string; value: string}>;
};

export const timerModePresets: TimerModePreset[] = [
  {
    id: 'basicTimer',
    title: 'BASIC TIMER',
    description: 'Button-only timer without camera detection',
    startGesture: 'button',
    pauseGesture: 'button',
    resumeGesture: 'button',
    resetGesture: 'button',
    lapGesture: 'button',
    actions: [
      {label: 'START', value: 'Button'},
      {label: 'PAUSE', value: 'Button'},
      {label: 'RESUME', value: 'Button'},
      {label: 'RESET', value: 'Button'},
      {label: 'LAP', value: 'Button'},
    ],
  },
  {
    id: 'lookPause',
    title: 'LOOK PAUSE',
    description: 'Button start, look pause, button reset',
    startGesture: 'button',
    pauseGesture: 'look',
    resumeGesture: 'lookAway',
    resetGesture: 'button',
    actions: [
      {label: 'START', value: 'Button'},
      {label: 'PAUSE', value: 'Look'},
      {label: 'RESUME', value: 'Look Away'},
      {label: 'RESET', value: 'Button'},
    ],
  },
  {
    id: 'winkControl',
    title: 'WINK CONTROL',
    description: 'Right wink toggles the timer, left wink resets while paused',
    startGesture: 'rightWink',
    pauseGesture: 'rightWink',
    resumeGesture: 'rightWink',
    resetGesture: 'leftWink',
    lapGesture: 'leftWink',
    actions: [
      {label: 'START', value: 'Right Wink'},
      {label: 'PAUSE', value: 'Right Wink'},
      {label: 'RESUME', value: 'Right Wink'},
      {label: 'RESET', value: 'Left Wink'},
      {label: 'LAP', value: 'Left Wink'},
    ],
  },
  {
    id: 'smileMode',
    title: 'SMILE MODE',
    description: 'Smile starts, pauses, and resumes the timer; button resets',
    startGesture: 'smile',
    pauseGesture: 'smile',
    resumeGesture: 'smile',
    resetGesture: 'button',
    actions: [
      {label: 'START', value: 'Smile'},
      {label: 'PAUSE', value: 'Smile'},
      {label: 'RESUME', value: 'Smile'},
      {label: 'RESET', value: 'Button'},
    ],
  },
  {
    id: 'flipTimer',
    title: 'FLIP TIMER',
    description: 'Flip the device face down to run, face up to pause',
    startGesture: 'deviceFaceDown',
    pauseGesture: 'deviceFaceUp',
    resumeGesture: 'deviceFaceDown',
    resetGesture: 'button',
    actions: [
      {label: 'START', value: 'Flip Down'},
      {label: 'PAUSE', value: 'Face Up'},
      {label: 'RESUME', value: 'Flip Down'},
      {label: 'RESET', value: 'Button'},
    ],
  },
];

export function getTimerModePreset(modeId: TimerModeId): TimerModePreset {
  return (
    timerModePresets.find(mode => mode.id === modeId) ?? timerModePresets[0]
  );
}

export function modeUsesLookPause(modeId: TimerModeId): boolean {
  return getTimerModePreset(modeId).pauseGesture === 'look';
}

export function modeUsesLeftWinkStart(modeId: TimerModeId): boolean {
  return getTimerModePreset(modeId).startGesture === 'leftWink';
}

export type WinkGestureSide = 'left' | 'right';

function getWinkGesture(side: WinkGestureSide): TimerModeGesture {
  return side === 'left' ? 'leftWink' : 'rightWink';
}

export function modeUsesWinkStart(
  modeId: TimerModeId,
  side: WinkGestureSide,
): boolean {
  return getTimerModePreset(modeId).startGesture === getWinkGesture(side);
}

export function modeUsesLeftWinkPause(modeId: TimerModeId): boolean {
  return getTimerModePreset(modeId).pauseGesture === 'leftWink';
}

export function modeUsesWinkPause(
  modeId: TimerModeId,
  side: WinkGestureSide,
): boolean {
  return getTimerModePreset(modeId).pauseGesture === getWinkGesture(side);
}

export function modeUsesLeftWinkResume(modeId: TimerModeId): boolean {
  return getTimerModePreset(modeId).resumeGesture === 'leftWink';
}

export function modeUsesWinkResume(
  modeId: TimerModeId,
  side: WinkGestureSide,
): boolean {
  return getTimerModePreset(modeId).resumeGesture === getWinkGesture(side);
}

export function modeUsesRightWinkReset(modeId: TimerModeId): boolean {
  return getTimerModePreset(modeId).resetGesture === 'rightWink';
}

export function modeUsesWinkReset(
  modeId: TimerModeId,
  side: WinkGestureSide,
): boolean {
  return getTimerModePreset(modeId).resetGesture === getWinkGesture(side);
}

export function modeUsesRightWinkLap(modeId: TimerModeId): boolean {
  return getTimerModePreset(modeId).lapGesture === 'rightWink';
}

export function modeUsesWinkLap(
  modeId: TimerModeId,
  side: WinkGestureSide,
): boolean {
  return getTimerModePreset(modeId).lapGesture === getWinkGesture(side);
}

export function modeUsesSmileStart(modeId: TimerModeId): boolean {
  return getTimerModePreset(modeId).startGesture === 'smile';
}

export function modeUsesSmilePause(modeId: TimerModeId): boolean {
  return getTimerModePreset(modeId).pauseGesture === 'smile';
}

export function modeUsesSmileResume(modeId: TimerModeId): boolean {
  return getTimerModePreset(modeId).resumeGesture === 'smile';
}

export function modeHasLap(modeId: TimerModeId): boolean {
  return getTimerModePreset(modeId).lapGesture !== undefined;
}

export function modeUsesDeviceFlip(modeId: TimerModeId): boolean {
  const mode = getTimerModePreset(modeId);

  return (
    mode.startGesture === 'deviceFaceDown' ||
    mode.pauseGesture === 'deviceFaceUp' ||
    mode.resumeGesture === 'deviceFaceDown'
  );
}

export function modeRunsWithoutGaze(modeId: TimerModeId): boolean {
  const mode = getTimerModePreset(modeId);

  return (
    mode.startGesture === 'button' &&
    mode.pauseGesture === 'button' &&
    mode.resumeGesture === 'button'
  ) || modeUsesDeviceFlip(modeId);
}

export function modeStartGestureIsButton(modeId: TimerModeId): boolean {
  return getTimerModePreset(modeId).startGesture === 'button';
}

export function modeResumeGestureIsButton(modeId: TimerModeId): boolean {
  return getTimerModePreset(modeId).resumeGesture === 'button';
}
