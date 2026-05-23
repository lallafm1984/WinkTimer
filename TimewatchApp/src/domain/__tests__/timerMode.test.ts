import {
  modeRunsWithoutGaze,
  modeUsesDeviceFlip,
  modeUsesRightWinkLap,
  timerModePresets,
} from '../timerMode';

describe('timer mode presets', () => {
  it('removes Wink Start and exposes the new Basic and Flip modes', () => {
    expect(timerModePresets.map(mode => mode.id)).toEqual([
      'basicTimer',
      'lookPause',
      'winkControl',
      'flipTimer',
    ]);
    expect(timerModePresets.some(mode => mode.beta)).toBe(false);
  });

  it('keeps Look Pause limited to look actions and button reset', () => {
    const lookPause = timerModePresets.find(mode => mode.id === 'lookPause');

    expect(lookPause?.resetGesture).toBe('button');
    expect(lookPause?.lapGesture).toBeUndefined();
    expect(lookPause?.actions).toEqual([
      {label: 'START', value: 'Button'},
      {label: 'PAUSE', value: 'Look'},
      {label: 'RESUME', value: 'Look Away'},
      {label: 'RESET', value: 'Button'},
    ]);
  });

  it('marks Basic Timer as button-only timing', () => {
    expect(modeRunsWithoutGaze('basicTimer')).toBe(true);
    expect(modeUsesDeviceFlip('basicTimer')).toBe(false);
  });

  it('marks Flip Timer as posture-controlled timing', () => {
    const flipTimer = timerModePresets.find(mode => mode.id === 'flipTimer');

    expect(modeRunsWithoutGaze('flipTimer')).toBe(true);
    expect(modeUsesDeviceFlip('flipTimer')).toBe(true);
    expect(flipTimer?.lapGesture).toBeUndefined();
    expect(flipTimer?.actions).toEqual([
      {label: 'START', value: 'Flip Down'},
      {label: 'PAUSE', value: 'Face Up'},
      {label: 'RESUME', value: 'Flip Down'},
      {label: 'RESET', value: 'Button'},
    ]);
  });

  it('assigns lap gestures only where lap records are meaningful', () => {
    const basic = timerModePresets.find(mode => mode.id === 'basicTimer');
    const wink = timerModePresets.find(mode => mode.id === 'winkControl');

    expect(basic?.lapGesture).toBe('button');
    expect(basic?.actions).toContainEqual({label: 'LAP', value: 'Button'});
    expect(wink?.lapGesture).toBe('rightWink');
    expect(wink?.actions).toContainEqual({label: 'LAP', value: 'Left Wink'});
    expect(modeUsesRightWinkLap('winkControl')).toBe(true);
    expect(modeUsesRightWinkLap('lookPause')).toBe(false);
  });
});
