import {arcadeTheme} from '../arcadeTheme';

describe('arcadeTheme', () => {
  it('defines the Arcade Ghost Console palette', () => {
    expect(arcadeTheme.colors.background).toBe('#F2F2EF');
    expect(arcadeTheme.colors.panel).toBe('#FFFFFF');
    expect(arcadeTheme.colors.panelMuted).toBe('#E5E5E0');
    expect(arcadeTheme.colors.ink).toBe('#111111');
    expect(arcadeTheme.colors.softInk).toBe('#2B2B2B');
    expect(arcadeTheme.colors.mutedInk).toBe('#6F726D');
    expect(arcadeTheme.colors.faintInk).toBe('#B9BBB5');
    expect(arcadeTheme.colors.line).toBe('#C9CBC5');
    expect(arcadeTheme.colors.heavyLine).toBe('#1B1B1B');
    expect(arcadeTheme.colors.ghostBodyTop).toBe('#FFFFFF');
    expect(arcadeTheme.colors.ghostBodyBottom).toBe('#D8DAD4');
    expect(arcadeTheme.colors.ghostFace).toBe('#242424');
    expect(arcadeTheme.colors.accent).toBe('#2F80ED');
    expect(arcadeTheme.colors.warning).toBe('#D97706');
    expect(arcadeTheme.colors.danger).toBe('#B42318');
    expect(arcadeTheme.colors.success).toBe('#18794E');
  });

  it('keeps cards and panels within the 8px radius design rule', () => {
    expect(arcadeTheme.radii.panel).toBeLessThanOrEqual(8);
    expect(arcadeTheme.radii.control).toBeLessThanOrEqual(8);
  });

  it('uses fixed timer typography instead of viewport-scaled type', () => {
    expect(arcadeTheme.typography.timerLarge.fontSize).toBe(64);
    expect(arcadeTheme.typography.timerLarge.letterSpacing).toBe(0);
    expect(arcadeTheme.typography.timerLarge.fontVariant).toEqual([
      'tabular-nums',
    ]);
  });
});
