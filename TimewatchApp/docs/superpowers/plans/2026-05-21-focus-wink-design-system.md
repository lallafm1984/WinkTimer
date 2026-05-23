# Focus Wink Design System Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first Focus Wink visual slice: Arcade Ghost Console theme tokens, centisecond timer display, ghost expression component, mode cards, and a redesigned main timer screen.

**Architecture:** Keep timer engine and native gaze detection unchanged. Add small React Native presentation modules under `src/theme` and `src/components`, then integrate them into `TimerScreen` through existing `useAppState()` data. The UI supports left/right wink expressions now, while the current detection model still reports a generic `oneEyeClosed` state until directional eye data is added in a separate gesture-mapping phase.

**Tech Stack:** React Native 0.85, React 19, TypeScript, Jest, react-test-renderer, React Native `StyleSheet`.

---

## File Structure

- Create `src/theme/arcadeTheme.ts`
  - Single source of truth for Focus Wink colors, spacing, radii, typography, and fixed UI dimensions.
- Create `src/theme/__tests__/arcadeTheme.test.ts`
  - Guards the monochrome arcade palette, radius limits, and timer typography contract.
- Modify `src/components/TimerDisplay.tsx`
  - Format and render time as `MM:SS.CS` with centiseconds.
  - Use theme typography and remove legacy green styling.
- Modify `src/components/__tests__/TimerDisplay.test.tsx`
  - Verify centisecond formatting, clamping, and rendered text.
- Create `src/components/GhostMascot.tsx`
  - Draw the ghost mascot with React Native views.
  - Support `ready`, `looking`, `leftWink`, `rightWink`, `winkHold`, and `resetFlash` expressions.
  - Export helper functions for deterministic tests.
- Create `src/components/__tests__/GhostMascot.test.tsx`
  - Verify expression labels and wink-hold progress clamping.
- Create `src/components/ArcadePanel.tsx`
  - Shared framed console panel container.
- Create `src/components/__tests__/ArcadePanel.test.tsx`
  - Verify title rendering, children rendering, and accessibility role.
- Create `src/components/ModeCard.tsx`
  - Reusable preset card for Look Pause, Wink Start, and Wink Control.
- Create `src/components/__tests__/ModeCard.test.tsx`
  - Verify title, action rows, active/beta badge rendering, and display-only accessibility semantics.
- Modify `src/components/StatusIndicator.tsx`
  - Restyle detection status as a compact arcade status chip and replace corrupted labels with stable display strings.
- Modify `src/screens/TimerScreen.tsx`
  - Rebuild the main timer screen using the arcade theme, mascot, timer display, mode cards, and current gesture hints.
- Create `src/screens/__tests__/TimerScreen.test.tsx`
  - Mock `useAppState()` and verify the redesigned screen renders the active mode, centisecond timer, ghost state, and core controls.
- Modify `src/App.tsx`
  - Apply the arcade background color to the safe area.
- Modify `README.md`
  - Add the Focus Wink design-system verification commands and note the centisecond timer display.

---

## Task 1: Arcade Theme Tokens

**Files:**
- Create: `src/theme/arcadeTheme.ts`
- Create: `src/theme/__tests__/arcadeTheme.test.ts`

- [ ] **Step 1: Write the failing theme test**

Create `src/theme/__tests__/arcadeTheme.test.ts`:

```ts
import {arcadeTheme} from '../arcadeTheme';

describe('arcadeTheme', () => {
  it('defines the Arcade Ghost Console palette', () => {
    expect(arcadeTheme.colors.background).toBe('#F2F2EF');
    expect(arcadeTheme.colors.panel).toBe('#FFFFFF');
    expect(arcadeTheme.colors.ink).toBe('#111111');
    expect(arcadeTheme.colors.mutedInk).toBe('#6F726D');
    expect(arcadeTheme.colors.accent).toBe('#2F80ED');
    expect(arcadeTheme.colors.warning).toBe('#D97706');
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
```

- [ ] **Step 2: Run the theme test and confirm it fails**

Run:

```powershell
npm test -- --runInBand src/theme/__tests__/arcadeTheme.test.ts
```

Expected: FAIL because `src/theme/arcadeTheme.ts` does not exist.

- [ ] **Step 3: Add the theme module**

Create `src/theme/arcadeTheme.ts`:

```ts
import type {TextStyle} from 'react-native';

export const arcadeTheme = {
  colors: {
    background: '#F2F2EF',
    panel: '#FFFFFF',
    panelMuted: '#E5E5E0',
    ink: '#111111',
    softInk: '#2B2B2B',
    mutedInk: '#6F726D',
    faintInk: '#B9BBB5',
    line: '#C9CBC5',
    heavyLine: '#1B1B1B',
    ghostBodyTop: '#FFFFFF',
    ghostBodyBottom: '#D8DAD4',
    ghostFace: '#242424',
    accent: '#2F80ED',
    warning: '#D97706',
    danger: '#B42318',
    success: '#18794E',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radii: {
    pixel: 2,
    chip: 6,
    panel: 8,
    control: 8,
    round: 999,
  },
  dimensions: {
    iconButton: 44,
    modeCardMinHeight: 92,
    mascotLarge: 168,
    mascotMedium: 112,
  },
  typography: {
    label: {
      color: '#111111',
      fontSize: 12,
      fontWeight: '800',
      letterSpacing: 0,
      lineHeight: 16,
    } satisfies TextStyle,
    body: {
      color: '#2B2B2B',
      fontSize: 14,
      fontWeight: '600',
      letterSpacing: 0,
      lineHeight: 20,
    } satisfies TextStyle,
    timerLarge: {
      color: '#111111',
      fontSize: 64,
      fontVariant: ['tabular-nums'],
      fontWeight: '900',
      letterSpacing: 0,
      lineHeight: 72,
    } satisfies TextStyle,
    timerMedium: {
      color: '#111111',
      fontSize: 32,
      fontVariant: ['tabular-nums'],
      fontWeight: '900',
      letterSpacing: 0,
      lineHeight: 40,
    } satisfies TextStyle,
  },
} as const;

export type ArcadeTheme = typeof arcadeTheme;
```

- [ ] **Step 4: Run the theme test and confirm it passes**

Run:

```powershell
npm test -- --runInBand src/theme/__tests__/arcadeTheme.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit theme tokens**

```powershell
git add src/theme/arcadeTheme.ts src/theme/__tests__/arcadeTheme.test.ts
git commit -m "feat: add Focus Wink arcade theme tokens"
```

---

## Task 2: Centisecond Timer Display

**Files:**
- Modify: `src/components/TimerDisplay.tsx`
- Modify: `src/components/__tests__/TimerDisplay.test.tsx`

- [ ] **Step 1: Replace the TimerDisplay tests with centisecond coverage**

Replace `src/components/__tests__/TimerDisplay.test.tsx`:

```tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {formatDuration, TimerDisplay} from '../TimerDisplay';

describe('formatDuration', () => {
  it('formats zero as minutes, seconds, and centiseconds', () => {
    expect(formatDuration(0)).toBe('00:00.00');
  });

  it('formats elapsed centiseconds with zero padding', () => {
    expect(formatDuration(61042)).toBe('01:01.04');
  });

  it('floors milliseconds to centiseconds', () => {
    expect(formatDuration(59999)).toBe('00:59.99');
  });

  it('clamps negative durations to zero', () => {
    expect(formatDuration(-250)).toBe('00:00.00');
  });
});

describe('TimerDisplay', () => {
  it('renders the formatted centisecond timer', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<TimerDisplay durationMs={65000} />);
    });

    const textNodes = renderer!.root.findAllByType(Text);

    expect(textNodes.some(node => node.props.children === '01:05.00')).toBe(
      true,
    );
  });

  it('sets an accessible timer label', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<TimerDisplay durationMs={9042} />);
    });

    expect(
      renderer!.root.findByProps({accessibilityLabel: '타이머 00:09.04'}),
    ).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the TimerDisplay test and confirm it fails**

Run:

```powershell
npm test -- --runInBand src/components/__tests__/TimerDisplay.test.tsx
```

Expected: FAIL because `formatDuration()` still returns `MM:SS`.

- [ ] **Step 3: Implement centisecond formatting and theme styling**

Replace `src/components/TimerDisplay.tsx`:

```tsx
import React from 'react';
import {StyleSheet, Text} from 'react-native';
import {arcadeTheme} from '../theme/arcadeTheme';

type TimerDisplayProps = {
  durationMs: number;
  size?: 'large' | 'medium';
};

export function formatDuration(durationMs: number): string {
  const clampedMs = Math.max(0, Math.floor(durationMs));
  const totalSeconds = Math.floor(clampedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  const centiseconds = Math.floor((clampedMs % 1000) / 10);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0',
  )}.${String(centiseconds).padStart(2, '0')}`;
}

export function TimerDisplay({durationMs, size = 'large'}: TimerDisplayProps) {
  const formatted = formatDuration(durationMs);

  return (
    <Text
      accessibilityLabel={`타이머 ${formatted}`}
      style={[styles.time, size === 'medium' && styles.medium]}>
      {formatted}
    </Text>
  );
}

const styles = StyleSheet.create({
  time: {
    ...arcadeTheme.typography.timerLarge,
    textAlign: 'center',
  },
  medium: {
    ...arcadeTheme.typography.timerMedium,
  },
});
```

- [ ] **Step 4: Run the TimerDisplay test and confirm it passes**

Run:

```powershell
npm test -- --runInBand src/components/__tests__/TimerDisplay.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit centisecond timer display**

```powershell
git add src/components/TimerDisplay.tsx src/components/__tests__/TimerDisplay.test.tsx
git commit -m "feat: show timer centiseconds"
```

---

## Task 3: Ghost Mascot Component

**Files:**
- Create: `src/components/GhostMascot.tsx`
- Create: `src/components/__tests__/GhostMascot.test.tsx`

- [ ] **Step 1: Write the failing GhostMascot tests**

Create `src/components/__tests__/GhostMascot.test.tsx`:

```tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {
  clampHoldProgress,
  GhostMascot,
  getGhostExpressionLabel,
} from '../GhostMascot';

describe('GhostMascot helpers', () => {
  it('labels the ready expression', () => {
    expect(getGhostExpressionLabel('ready')).toBe('Ghost ready');
  });

  it('labels left and right wink expressions separately', () => {
    expect(getGhostExpressionLabel('leftWink')).toBe('Ghost left wink');
    expect(getGhostExpressionLabel('rightWink')).toBe('Ghost right wink');
  });

  it('clamps wink hold progress between zero and one', () => {
    expect(clampHoldProgress(-0.5)).toBe(0);
    expect(clampHoldProgress(0.42)).toBe(0.42);
    expect(clampHoldProgress(1.8)).toBe(1);
  });
});

describe('GhostMascot', () => {
  it('renders an accessible mascot image', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<GhostMascot expression="looking" />);
    });

    expect(
      renderer!.root.findByProps({
        accessibilityRole: 'image',
        accessibilityLabel: 'Ghost looking shy',
      }),
    ).toBeTruthy();
  });

  it('renders wink hold progress when requested', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <GhostMascot
          expression="winkHold"
          holdProgress={0.75}
          winkSide="right"
        />,
      );
    });

    expect(renderer!.root.findByProps({testID: 'ghost-hold-track'})).toBeTruthy();
    expect(renderer!.root.findByProps({testID: 'ghost-hold-fill'})).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the GhostMascot test and confirm it fails**

Run:

```powershell
npm test -- --runInBand src/components/__tests__/GhostMascot.test.tsx
```

Expected: FAIL because `src/components/GhostMascot.tsx` does not exist.

- [ ] **Step 3: Implement GhostMascot**

Create `src/components/GhostMascot.tsx`:

```tsx
import React from 'react';
import {StyleSheet, View} from 'react-native';
import {arcadeTheme} from '../theme/arcadeTheme';

export type GhostExpression =
  | 'ready'
  | 'looking'
  | 'leftWink'
  | 'rightWink'
  | 'winkHold'
  | 'resetFlash';

export type WinkSide = 'left' | 'right' | 'any';

type GhostMascotProps = {
  expression: GhostExpression;
  holdProgress?: number;
  size?: 'large' | 'medium';
  winkSide?: WinkSide;
};

export function clampHoldProgress(progress: number | undefined): number {
  if (progress === undefined || Number.isNaN(progress)) {
    return 0;
  }

  return Math.min(1, Math.max(0, progress));
}

export function getGhostExpressionLabel(
  expression: GhostExpression,
  winkSide: WinkSide = 'any',
): string {
  switch (expression) {
    case 'looking':
      return 'Ghost looking shy';
    case 'leftWink':
      return 'Ghost left wink';
    case 'rightWink':
      return 'Ghost right wink';
    case 'winkHold':
      return winkSide === 'left'
        ? 'Ghost holding left wink'
        : winkSide === 'right'
          ? 'Ghost holding right wink'
          : 'Ghost holding wink';
    case 'resetFlash':
      return 'Ghost reset flash';
    case 'ready':
    default:
      return 'Ghost ready';
  }
}

function resolveEyeState(expression: GhostExpression, winkSide: WinkSide) {
  const effectiveWink =
    expression === 'winkHold'
      ? winkSide === 'right'
        ? 'right'
        : 'left'
      : expression === 'rightWink'
        ? 'right'
        : expression === 'leftWink'
          ? 'left'
          : 'none';

  return {
    leftClosed: effectiveWink === 'left',
    rightClosed: effectiveWink === 'right',
  };
}

export function GhostMascot({
  expression,
  holdProgress,
  size = 'large',
  winkSide = 'any',
}: GhostMascotProps) {
  const progress = clampHoldProgress(holdProgress);
  const {leftClosed, rightClosed} = resolveEyeState(expression, winkSide);
  const isLooking = expression === 'looking';
  const isReset = expression === 'resetFlash';
  const dimension =
    size === 'large'
      ? arcadeTheme.dimensions.mascotLarge
      : arcadeTheme.dimensions.mascotMedium;

  return (
    <View
      accessibilityRole="image"
      accessibilityLabel={getGhostExpressionLabel(expression, winkSide)}
      style={[styles.stage, {height: dimension, width: dimension}]}>
      <View style={[styles.scanFrame, isReset && styles.resetFrame]} />
      <View
        style={[
          styles.body,
          {
            height: dimension * 0.78,
            width: dimension * 0.66,
            borderTopLeftRadius: dimension * 0.24,
            borderTopRightRadius: dimension * 0.24,
          },
          isReset && styles.resetBody,
        ]}>
        <View style={[styles.ear, styles.leftEar]} />
        <View style={[styles.ear, styles.rightEar]} />
        <View
          style={[
            styles.face,
            {
              height: dimension * 0.34,
              width: dimension * 0.48,
              borderRadius: dimension * 0.12,
            },
          ]}>
          <View style={styles.eyeRow}>
            <View
              testID="ghost-left-eye"
              style={[styles.eye, leftClosed && styles.closedEye]}
            />
            <View
              testID="ghost-right-eye"
              style={[styles.eye, rightClosed && styles.closedEye]}
            />
          </View>
          <View style={[styles.mouth, isLooking && styles.shyMouth]} />
        </View>
        {isLooking ? <View testID="ghost-sweat" style={styles.sweat} /> : null}
        {expression === 'winkHold' ? (
          <View testID="ghost-hold-track" style={styles.holdTrack}>
            <View
              testID="ghost-hold-fill"
              style={[styles.holdFill, {width: `${progress * 100}%`}]}
            />
          </View>
        ) : null}
        <View style={styles.tailRow}>
          <View style={styles.tail} />
          <View style={styles.tail} />
          <View style={styles.tail} />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrame: {
    position: 'absolute',
    borderColor: arcadeTheme.colors.heavyLine,
    borderWidth: 2,
    height: '82%',
    width: '82%',
  },
  resetFrame: {
    borderColor: arcadeTheme.colors.accent,
  },
  body: {
    alignItems: 'center',
    backgroundColor: arcadeTheme.colors.ghostBodyTop,
    borderColor: arcadeTheme.colors.line,
    borderWidth: 2,
    justifyContent: 'center',
    shadowColor: arcadeTheme.colors.ink,
    shadowOpacity: 0.16,
    shadowRadius: 10,
  },
  resetBody: {
    borderColor: arcadeTheme.colors.accent,
  },
  ear: {
    backgroundColor: arcadeTheme.colors.ghostBodyTop,
    borderColor: arcadeTheme.colors.line,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderWidth: 2,
    height: 24,
    position: 'absolute',
    top: -8,
    width: 20,
  },
  leftEar: {
    left: 22,
  },
  rightEar: {
    right: 22,
  },
  face: {
    alignItems: 'center',
    backgroundColor: arcadeTheme.colors.ghostFace,
    justifyContent: 'center',
    paddingHorizontal: arcadeTheme.spacing.md,
  },
  eyeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.lg,
    justifyContent: 'center',
  },
  eye: {
    backgroundColor: arcadeTheme.colors.panel,
    borderRadius: arcadeTheme.radii.round,
    height: 28,
    width: 12,
  },
  closedEye: {
    borderRadius: arcadeTheme.radii.pixel,
    height: 4,
    width: 24,
  },
  mouth: {
    backgroundColor: arcadeTheme.colors.panel,
    borderRadius: arcadeTheme.radii.round,
    height: 5,
    marginTop: arcadeTheme.spacing.sm,
    width: 8,
  },
  shyMouth: {
    width: 14,
  },
  sweat: {
    backgroundColor: arcadeTheme.colors.accent,
    borderRadius: arcadeTheme.radii.pixel,
    height: 8,
    position: 'absolute',
    right: 24,
    top: 48,
    transform: [{rotate: '18deg'}],
    width: 5,
  },
  holdTrack: {
    backgroundColor: arcadeTheme.colors.panelMuted,
    borderColor: arcadeTheme.colors.heavyLine,
    borderRadius: arcadeTheme.radii.chip,
    borderWidth: 1,
    bottom: 22,
    height: 8,
    overflow: 'hidden',
    position: 'absolute',
    width: '58%',
  },
  holdFill: {
    backgroundColor: arcadeTheme.colors.accent,
    height: '100%',
  },
  tailRow: {
    bottom: -1,
    flexDirection: 'row',
    gap: 0,
    position: 'absolute',
  },
  tail: {
    backgroundColor: arcadeTheme.colors.background,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    height: 16,
    width: 22,
  },
});
```

- [ ] **Step 4: Run the GhostMascot test and confirm it passes**

Run:

```powershell
npm test -- --runInBand src/components/__tests__/GhostMascot.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit GhostMascot**

```powershell
git add src/components/GhostMascot.tsx src/components/__tests__/GhostMascot.test.tsx
git commit -m "feat: add ghost mascot expressions"
```

---

## Task 4: Arcade Panels and Mode Cards

**Files:**
- Create: `src/components/ArcadePanel.tsx`
- Create: `src/components/__tests__/ArcadePanel.test.tsx`
- Create: `src/components/ModeCard.tsx`
- Create: `src/components/__tests__/ModeCard.test.tsx`

- [ ] **Step 1: Write the failing ArcadePanel test**

Create `src/components/__tests__/ArcadePanel.test.tsx`:

```tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {ArcadePanel} from '../ArcadePanel';

describe('ArcadePanel', () => {
  it('renders a titled console section', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ArcadePanel title="MODE SELECT">
          <Text>Look Pause</Text>
        </ArcadePanel>,
      );
    });

    expect(renderer!.root.findByProps({accessibilityRole: 'summary'})).toBeTruthy();
    expect(renderer!.root.findByProps({children: 'MODE SELECT'})).toBeTruthy();
    expect(renderer!.root.findByProps({children: 'Look Pause'})).toBeTruthy();
  });
});
```

- [ ] **Step 2: Write the failing ModeCard test**

Create `src/components/__tests__/ModeCard.test.tsx`:

```tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {ModeCard} from '../ModeCard';

const actions = [
  {label: 'Start', value: 'Button'},
  {label: 'Pause', value: 'Look'},
  {label: 'Reset', value: 'Wink Hold'},
];

describe('ModeCard', () => {
  it('renders preset mode details', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ModeCard title="Look Pause" description="Stable default" actions={actions} />,
      );
    });

    expect(renderer!.root.findByProps({children: 'Look Pause'})).toBeTruthy();
    expect(renderer!.root.findByProps({children: 'Stable default'})).toBeTruthy();
    expect(renderer!.root.findByProps({children: 'Button'})).toBeTruthy();
  });

  it('shows active and beta labels', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <ModeCard
          title="Wink Control"
          description="Experimental wink-first mode"
          actions={actions}
          active
          beta
        />,
      );
    });

    expect(renderer!.root.findByProps({children: 'ACTIVE'})).toBeTruthy();
    expect(renderer!.root.findByProps({children: 'BETA'})).toBeTruthy();
    expect(
      renderer!.root.findAllByProps({accessibilityRole: 'button'}),
    ).toHaveLength(0);
    expect(
      renderer!.root.findAllByProps({
        accessibilityState: {selected: true},
      }),
    ).toHaveLength(0);
  });
});
```

- [ ] **Step 3: Run panel/card tests and confirm they fail**

Run:

```powershell
npm test -- --runInBand src/components/__tests__/ArcadePanel.test.tsx src/components/__tests__/ModeCard.test.tsx
```

Expected: FAIL because `ArcadePanel` and `ModeCard` do not exist.

- [ ] **Step 4: Implement ArcadePanel**

Create `src/components/ArcadePanel.tsx`:

```tsx
import React, {type ReactNode} from 'react';
import {StyleSheet, Text, View, type StyleProp, type ViewStyle} from 'react-native';
import {arcadeTheme} from '../theme/arcadeTheme';

type ArcadePanelProps = {
  children: ReactNode;
  title?: string;
  style?: StyleProp<ViewStyle>;
};

export function ArcadePanel({children, title, style}: ArcadePanelProps) {
  return (
    <View accessibilityRole="summary" style={[styles.panel, style]}>
      {title ? (
        <View style={styles.titleRow}>
          <Text style={styles.title}>{title}</Text>
          <View style={styles.titleLine} />
        </View>
      ) : null}
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.heavyLine,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 1,
    gap: arcadeTheme.spacing.md,
    padding: arcadeTheme.spacing.lg,
  },
  titleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
  },
  title: {
    ...arcadeTheme.typography.label,
  },
  titleLine: {
    backgroundColor: arcadeTheme.colors.heavyLine,
    flex: 1,
    height: 1,
  },
});
```

- [ ] **Step 5: Implement ModeCard**

Create `src/components/ModeCard.tsx`:

```tsx
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {arcadeTheme} from '../theme/arcadeTheme';

type ModeAction = {
  label: string;
  value: string;
};

type ModeCardProps = {
  title: string;
  description: string;
  actions: ModeAction[];
  active?: boolean;
  beta?: boolean;
};

export function ModeCard({
  title,
  description,
  actions,
  active = false,
  beta = false,
}: ModeCardProps) {
  return (
    <View style={[styles.card, active && styles.activeCard]}>
      <View style={styles.header}>
        <View style={styles.titleBlock}>
          <Text style={styles.title}>{title}</Text>
          <Text style={styles.description}>{description}</Text>
        </View>
        <View style={styles.badges}>
          {active ? <Text style={[styles.badge, styles.activeBadge]}>ACTIVE</Text> : null}
          {beta ? <Text style={[styles.badge, styles.betaBadge]}>BETA</Text> : null}
        </View>
      </View>
      <View style={styles.actionGrid}>
        {actions.map(action => (
          <View key={`${title}-${action.label}`} style={styles.actionRow}>
            <Text style={styles.actionLabel}>{action.label}</Text>
            <Text style={styles.actionValue}>{action.value}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 1,
    gap: arcadeTheme.spacing.md,
    minHeight: arcadeTheme.dimensions.modeCardMinHeight,
    padding: arcadeTheme.spacing.md,
  },
  activeCard: {
    borderColor: arcadeTheme.colors.heavyLine,
    borderWidth: 2,
  },
  header: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.md,
    justifyContent: 'space-between',
  },
  titleBlock: {
    flex: 1,
    gap: arcadeTheme.spacing.xs,
  },
  title: {
    color: arcadeTheme.colors.ink,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 20,
  },
  description: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 0,
    lineHeight: 16,
  },
  badges: {
    alignItems: 'flex-end',
    gap: arcadeTheme.spacing.xs,
  },
  badge: {
    borderRadius: arcadeTheme.radii.chip,
    color: arcadeTheme.colors.panel,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 14,
    overflow: 'hidden',
    paddingHorizontal: arcadeTheme.spacing.sm,
    paddingVertical: 2,
  },
  activeBadge: {
    backgroundColor: arcadeTheme.colors.ink,
  },
  betaBadge: {
    backgroundColor: arcadeTheme.colors.warning,
  },
  actionGrid: {
    gap: arcadeTheme.spacing.xs,
  },
  actionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionLabel: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 14,
  },
  actionValue: {
    color: arcadeTheme.colors.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 16,
  },
});
```

- [ ] **Step 6: Run panel/card tests and confirm they pass**

Run:

```powershell
npm test -- --runInBand src/components/__tests__/ArcadePanel.test.tsx src/components/__tests__/ModeCard.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit panel/card components**

```powershell
git add src/components/ArcadePanel.tsx src/components/ModeCard.tsx src/components/__tests__/ArcadePanel.test.tsx src/components/__tests__/ModeCard.test.tsx
git commit -m "feat: add arcade panels and mode cards"
```

---

## Task 5: Status Indicator Restyle

**Files:**
- Modify: `src/components/StatusIndicator.tsx`
- Modify: `src/components/__tests__/StatusIndicator.test.tsx`

- [ ] **Step 1: Replace StatusIndicator tests with stable display labels**

Replace `src/components/__tests__/StatusIndicator.test.tsx`:

```tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {StatusIndicator} from '../StatusIndicator';

describe('StatusIndicator', () => {
  it('renders looking status text in text mode', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <StatusIndicator status="looking" mode="text" />,
      );
    });

    const textNodes = renderer!.root.findAllByType(Text);

    expect(textNodes.some(node => node.props.children === 'LOOK PAUSE')).toBe(
      true,
    );
  });

  it('hides label text in minimal mode', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <StatusIndicator status="notLooking" mode="minimal" />,
      );
    });

    const textNodes = renderer!.root.findAllByType(Text);

    expect(textNodes.length).toBe(0);
  });

  it('sets a readable accessibility label', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(
        <StatusIndicator status="unknown" mode="text" />,
      );
    });

    expect(
      renderer!.root.findByProps({
        accessibilityLabel: '감지 상태: SCANNING',
      }),
    ).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run StatusIndicator tests and confirm they fail**

Run:

```powershell
npm test -- --runInBand src/components/__tests__/StatusIndicator.test.tsx
```

Expected: FAIL because the current labels are not the arcade labels.

- [ ] **Step 3: Implement the arcade status indicator**

Replace `src/components/StatusIndicator.tsx`:

```tsx
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {DetectionStatus, StatusDisplayMode} from '../domain/detection';
import {arcadeTheme} from '../theme/arcadeTheme';

type StatusIndicatorProps = {
  status: DetectionStatus;
  mode: StatusDisplayMode;
};

const statusConfig: Record<
  DetectionStatus,
  {label: string; color: string; backgroundColor: string}
> = {
  notLooking: {
    label: 'FOCUS RUN',
    color: arcadeTheme.colors.success,
    backgroundColor: arcadeTheme.colors.panel,
  },
  looking: {
    label: 'LOOK PAUSE',
    color: arcadeTheme.colors.warning,
    backgroundColor: '#FFF7E8',
  },
  unknown: {
    label: 'SCANNING',
    color: arcadeTheme.colors.mutedInk,
    backgroundColor: arcadeTheme.colors.panelMuted,
  },
};

export function StatusIndicator({status, mode}: StatusIndicatorProps) {
  const config = statusConfig[status];

  return (
    <View
      accessibilityLabel={`감지 상태: ${config.label}`}
      accessibilityRole="summary"
      style={[
        styles.container,
        mode === 'minimal' ? styles.minimalContainer : styles.textContainer,
        {backgroundColor: config.backgroundColor},
      ]}>
      <View style={[styles.dot, {backgroundColor: config.color}]} />
      {mode === 'text' ? <Text style={styles.label}>{config.label}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    borderColor: arcadeTheme.colors.heavyLine,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  minimalContainer: {
    borderRadius: arcadeTheme.radii.chip,
    height: 28,
    paddingHorizontal: arcadeTheme.spacing.sm,
    width: 44,
  },
  textContainer: {
    borderRadius: arcadeTheme.radii.chip,
    gap: arcadeTheme.spacing.sm,
    minHeight: 34,
    paddingHorizontal: arcadeTheme.spacing.md,
    paddingVertical: arcadeTheme.spacing.sm,
  },
  dot: {
    borderRadius: arcadeTheme.radii.round,
    height: 9,
    width: 9,
  },
  label: {
    ...arcadeTheme.typography.label,
  },
});
```

- [ ] **Step 4: Run StatusIndicator tests and confirm they pass**

Run:

```powershell
npm test -- --runInBand src/components/__tests__/StatusIndicator.test.tsx
```

Expected: PASS.

- [ ] **Step 5: Commit status indicator restyle**

```powershell
git add src/components/StatusIndicator.tsx src/components/__tests__/StatusIndicator.test.tsx
git commit -m "feat: restyle detection status chip"
```

---

## Task 6: Timer Screen Redesign

**Files:**
- Modify: `src/screens/TimerScreen.tsx`
- Create: `src/screens/__tests__/TimerScreen.test.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: Write the failing TimerScreen test**

Create `src/screens/__tests__/TimerScreen.test.tsx`:

```tsx
import React from 'react';
import ReactTestRenderer from 'react-test-renderer';
import {Text} from 'react-native';
import {TimerScreen} from '../TimerScreen';
import {useAppState} from '../../state/AppState';

jest.mock('../../state/AppState', () => ({
  useAppState: jest.fn(),
}));

const useAppStateMock = useAppState as jest.Mock;

function baseState() {
  return {
    screen: 'timer',
    setScreen: jest.fn(),
    timer: {
      phase: 'active',
      startedAtMs: 1000,
      lastUpdatedAtMs: 62042,
      focusDurationMs: 61042,
      lookPausedDurationMs: 0,
      lookPauseCount: 0,
      targetDurationMs: null,
      detectionStatus: 'notLooking',
      eyeState: 'bothOpen',
      lookingStartedAtMs: null,
      isLookPaused: false,
      oneEyeClosedStartedAtMs: null,
      oneEyeResetArmed: true,
    },
    setTimer: jest.fn(),
    sessions: [],
    setSessions: jest.fn(),
    lastSummary: null,
    setLastSummary: jest.fn(),
    sensitivity: 'normal',
    setSensitivity: jest.fn(),
    statusDisplayMode: 'text',
    setStatusDisplayMode: jest.fn(),
    normalTimerMode: false,
    setNormalTimerMode: jest.fn(),
    finishError: null,
    isFinishingSession: false,
    repository: {list: jest.fn(), save: jest.fn()},
    gazeDetector: {start: jest.fn(), stop: jest.fn(), getLatestReading: jest.fn()},
    startTimerSession: jest.fn(),
    resumeTimerSession: jest.fn(),
    finishTimerSession: jest.fn(),
    setMockDetectionStatus: jest.fn(),
  };
}

describe('TimerScreen', () => {
  beforeEach(() => {
    useAppStateMock.mockReturnValue(baseState());
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('renders the Focus Wink arcade timer surface', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<TimerScreen />);
    });

    const textNodes = renderer!.root.findAllByType(Text);
    const renderedText = textNodes.map(node => node.props.children).flat();

    expect(renderedText).toContain('FOCUS WINK');
    expect(renderedText).toContain('LOOK PAUSE');
    expect(renderedText).toContain('01:01.04');
    expect(renderedText).toContain('WINK CONTROL');
  });

  it('shows shy ghost expression while looking pauses the timer', async () => {
    useAppStateMock.mockReturnValue({
      ...baseState(),
      timer: {
        ...baseState().timer,
        detectionStatus: 'looking',
        eyeState: 'bothOpen',
        isLookPaused: true,
      },
    });

    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<TimerScreen />);
    });

    expect(
      renderer!.root.findByProps({
        accessibilityLabel: 'Ghost looking shy',
      }),
    ).toBeTruthy();
  });

  it('shows wink hold ghost expression for one-eye reset state', async () => {
    useAppStateMock.mockReturnValue({
      ...baseState(),
      timer: {
        ...baseState().timer,
        detectionStatus: 'looking',
        eyeState: 'oneEyeClosed',
        oneEyeClosedStartedAtMs: 59042,
      },
    });

    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(() => {
      renderer = ReactTestRenderer.create(<TimerScreen />);
    });

    expect(
      renderer!.root.findByProps({
        accessibilityLabel: 'Ghost holding wink',
      }),
    ).toBeTruthy();
  });
});
```

- [ ] **Step 2: Run the TimerScreen test and confirm it fails**

Run:

```powershell
npm test -- --runInBand src/screens/__tests__/TimerScreen.test.tsx
```

Expected: FAIL because the redesigned labels and `GhostMascot` integration are not present.

- [ ] **Step 3: Replace TimerScreen with the arcade layout**

Replace `src/screens/TimerScreen.tsx`:

```tsx
import React from 'react';
import {ScrollView, StyleSheet, Text, View} from 'react-native';
import {ArcadePanel} from '../components/ArcadePanel';
import {
  GhostMascot,
  type GhostExpression,
  type WinkSide,
} from '../components/GhostMascot';
import {ModeCard} from '../components/ModeCard';
import {PrimaryButton} from '../components/PrimaryButton';
import {StatusIndicator} from '../components/StatusIndicator';
import {TimerDisplay} from '../components/TimerDisplay';
import type {DetectionStatus} from '../domain/detection';
import type {TimerState} from '../domain/timerEngine';
import {useAppState} from '../state/AppState';
import {arcadeTheme} from '../theme/arcadeTheme';

const DEFAULT_WINK_HOLD_MS = 3000;

const modePresets = [
  {
    title: 'LOOK PAUSE',
    description: 'Button start, look pause, wink hold reset',
    active: true,
    beta: false,
    actions: [
      {label: 'START', value: 'Button'},
      {label: 'PAUSE', value: 'Look'},
      {label: 'RESUME', value: 'Look Away'},
      {label: 'RESET', value: 'Wink Hold'},
    ],
  },
  {
    title: 'WINK START',
    description: 'Hands-free start with the same look pause loop',
    active: false,
    beta: false,
    actions: [
      {label: 'START', value: 'Wink Hold'},
      {label: 'PAUSE', value: 'Look'},
      {label: 'RESUME', value: 'Look Away'},
      {label: 'RESET', value: 'Wink Hold'},
    ],
  },
  {
    title: 'WINK CONTROL',
    description: 'Single wink pause and resume test mode',
    active: false,
    beta: true,
    actions: [
      {label: 'START', value: 'Wink Hold'},
      {label: 'PAUSE', value: 'Single Wink'},
      {label: 'RESUME', value: 'Single Wink'},
      {label: 'RESET', value: 'Wink Hold'},
    ],
  },
];

function canFinishTimer(timer: TimerState) {
  return timer.phase === 'active' || timer.phase === 'manualPaused';
}

function phaseLabel(phase: TimerState['phase']) {
  switch (phase) {
    case 'active':
      return 'RUNNING';
    case 'manualPaused':
      return 'MANUAL PAUSE';
    case 'ended':
      return 'SESSION CLEAR';
    case 'idle':
    default:
      return 'READY';
  }
}

function getMascotState(timer: TimerState): {
  expression: GhostExpression;
  holdProgress: number;
  winkSide: WinkSide;
} {
  if (timer.detectionStatus === 'looking' && timer.eyeState === 'oneEyeClosed') {
    const elapsed =
      timer.oneEyeClosedStartedAtMs === null
        ? 0
        : timer.lastUpdatedAtMs - timer.oneEyeClosedStartedAtMs;

    return {
      expression: 'winkHold',
      holdProgress: elapsed / DEFAULT_WINK_HOLD_MS,
      winkSide: 'any',
    };
  }

  if (timer.detectionStatus === 'looking') {
    return {expression: 'looking', holdProgress: 0, winkSide: 'any'};
  }

  if (timer.phase === 'ended') {
    return {expression: 'resetFlash', holdProgress: 0, winkSide: 'any'};
  }

  return {expression: 'ready', holdProgress: 0, winkSide: 'any'};
}

export function TimerScreen() {
  const {
    timer,
    setScreen,
    statusDisplayMode,
    finishError,
    isFinishingSession,
    startTimerSession,
    resumeTimerSession,
    finishTimerSession,
    setMockDetectionStatus,
  } = useAppState();

  const mascot = getMascotState(timer);
  const showResume = timer.phase === 'manualPaused';
  const canFinish = canFinishTimer(timer) && !isFinishingSession;
  const startLabel = timer.phase === 'ended' ? 'RESTART' : 'START';

  const handleMockStatus = (status: DetectionStatus) => {
    setMockDetectionStatus(status);
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
      showsVerticalScrollIndicator={false}>
      <View style={styles.topBar}>
        <View>
          <Text style={styles.appLabel}>FOCUS WINK</Text>
          <Text style={styles.subLabel}>ARCADE GHOST TIMER</Text>
        </View>
        <View style={styles.navButtons}>
          <PrimaryButton
            label="HISTORY"
            onPress={() => {
              setScreen('history');
            }}
            variant="secondary"
            style={styles.navButton}
          />
          <PrimaryButton
            label="SETTINGS"
            onPress={() => {
              setScreen('settings');
            }}
            variant="secondary"
            style={styles.navButton}
          />
        </View>
      </View>

      <ArcadePanel title="MAIN TIMER" style={styles.heroPanel}>
        <View style={styles.phaseRow}>
          <Text style={styles.phase}>{phaseLabel(timer.phase)}</Text>
          <StatusIndicator mode={statusDisplayMode} status={timer.detectionStatus} />
        </View>
        <GhostMascot
          expression={mascot.expression}
          holdProgress={mascot.holdProgress}
          winkSide={mascot.winkSide}
        />
        <TimerDisplay durationMs={timer.focusDurationMs} />
        <Text style={styles.gestureHint}>LOOK = PAUSE / LOOK AWAY = RESUME</Text>
        <Text style={styles.gestureHint}>WINK HOLD 3.0S = RESET</Text>
        {finishError ? <Text style={styles.error}>{finishError}</Text> : null}
      </ArcadePanel>

      <View style={styles.controls}>
        {showResume ? (
          <PrimaryButton label="RESUME" onPress={resumeTimerSession} />
        ) : (
          <PrimaryButton
            label={startLabel}
            onPress={startTimerSession}
            disabled={timer.phase === 'active' || isFinishingSession}
          />
        )}
        <PrimaryButton
          label={isFinishingSession ? 'SAVING' : 'END'}
          onPress={finishTimerSession}
          variant="secondary"
          disabled={!canFinish}
        />
      </View>

      <ArcadePanel title="MODE SELECT">
        <View style={styles.modeList}>
          {modePresets.map(mode => (
            <ModeCard
              key={mode.title}
              title={mode.title}
              description={mode.description}
              actions={mode.actions}
              active={mode.active}
              beta={mode.beta}
            />
          ))}
        </View>
      </ArcadePanel>

      <ArcadePanel title="DETECTION TEST">
        <Text style={styles.testCopy}>Use these buttons while running in Metro.</Text>
        <View style={styles.mockButtons}>
          <PrimaryButton
            label="AWAY"
            onPress={() => handleMockStatus('notLooking')}
            variant="secondary"
            style={styles.mockButton}
          />
          <PrimaryButton
            label="LOOK"
            onPress={() => handleMockStatus('looking')}
            variant="secondary"
            style={styles.mockButton}
          />
          <PrimaryButton
            label="SCAN"
            onPress={() => handleMockStatus('unknown')}
            variant="secondary"
            style={styles.mockButton}
          />
        </View>
      </ArcadePanel>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: {
    backgroundColor: arcadeTheme.colors.background,
    flex: 1,
  },
  container: {
    gap: arcadeTheme.spacing.lg,
    paddingHorizontal: arcadeTheme.spacing.lg,
    paddingVertical: arcadeTheme.spacing.lg,
  },
  topBar: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.md,
    justifyContent: 'space-between',
  },
  appLabel: {
    color: arcadeTheme.colors.ink,
    fontSize: 24,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 28,
  },
  subLabel: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 16,
  },
  navButtons: {
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
  },
  navButton: {
    minHeight: 38,
    paddingHorizontal: arcadeTheme.spacing.sm,
    paddingVertical: arcadeTheme.spacing.sm,
  },
  heroPanel: {
    alignItems: 'center',
  },
  phaseRow: {
    alignItems: 'center',
    alignSelf: 'stretch',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  phase: {
    ...arcadeTheme.typography.label,
  },
  gestureHint: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 16,
    textAlign: 'center',
  },
  error: {
    color: arcadeTheme.colors.danger,
    fontSize: 13,
    fontWeight: '800',
    lineHeight: 18,
    textAlign: 'center',
  },
  controls: {
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
  },
  modeList: {
    gap: arcadeTheme.spacing.sm,
  },
  testCopy: {
    ...arcadeTheme.typography.body,
  },
  mockButtons: {
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
  },
  mockButton: {
    flex: 1,
    minHeight: 42,
    paddingHorizontal: arcadeTheme.spacing.sm,
  },
});
```

- [ ] **Step 4: Update the app background**

Modify `src/App.tsx` so the safe area background matches the theme:

```tsx
import React from 'react';
import {StatusBar, StyleSheet} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {AppStateProvider, useAppState} from './state/AppState';
import {HistoryScreen} from './screens/HistoryScreen';
import {OnboardingScreen} from './screens/OnboardingScreen';
import {SessionSummaryScreen} from './screens/SessionSummaryScreen';
import {SettingsScreen} from './screens/SettingsScreen';
import {TimerScreen} from './screens/TimerScreen';
import {arcadeTheme} from './theme/arcadeTheme';

function CurrentScreen() {
  const {screen} = useAppState();

  switch (screen) {
    case 'timer':
      return <TimerScreen />;
    case 'summary':
      return <SessionSummaryScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'onboarding':
    default:
      return <OnboardingScreen />;
  }
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" />
          <CurrentScreen />
        </SafeAreaView>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: arcadeTheme.colors.background,
    flex: 1,
  },
});
```

- [ ] **Step 5: Run the TimerScreen test and confirm it passes**

Run:

```powershell
npm test -- --runInBand src/screens/__tests__/TimerScreen.test.tsx
```

Expected: PASS.

- [ ] **Step 6: Run the root App test to catch integration regressions**

Run:

```powershell
npm test -- --runInBand __tests__/App.test.tsx
```

Expected: PASS.

- [ ] **Step 7: Commit timer screen redesign**

```powershell
git add src/screens/TimerScreen.tsx src/screens/__tests__/TimerScreen.test.tsx src/App.tsx
git commit -m "feat: redesign timer screen with arcade ghost theme"
```

---

## Task 7: README and Full Verification

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add Focus Wink design-system notes to README**

Add this section to `README.md`:

````md
## Focus Wink Design System

The main timer screen uses the Arcade Ghost Console theme:

- Timer format: `MM:SS.CS`
- Default mode shown first: Look Pause
- Mascot states: ready, looking, left wink, right wink, wink hold, reset flash
- Single wink mode is marked as Beta in the UI

Design-system verification:

```powershell
npm test -- --runInBand
npx tsc --noEmit
npm run lint
npm run apk:android
```
````

- [ ] **Step 2: Run the complete Jest suite**

Run:

```powershell
npm test -- --runInBand
```

Expected: all suites pass.

- [ ] **Step 3: Run TypeScript validation**

Run:

```powershell
npx tsc --noEmit
```

Expected: exits with code 0 and no TypeScript errors.

- [ ] **Step 4: Run lint**

Run:

```powershell
npm run lint
```

Expected: exits with code 0 and no lint errors.

- [ ] **Step 5: Build the Android APK**

Run:

```powershell
npm run apk:android
```

Expected: Gradle build succeeds and writes a release APK under `android/app/build/outputs/apk/release/`.

- [ ] **Step 6: Commit docs and verification update**

```powershell
git add README.md
git commit -m "docs: document Focus Wink design system"
```

---

## Self-Review

- Spec coverage:
  - Ghost mascot expression states are covered by Task 3.
  - `MM:SS.CS` timer display is covered by Task 2.
  - Arcade Ghost Console theme is covered by Task 1.
  - Main timer screen restyle is covered by Task 6.
  - Three default modes are visually represented by Task 4 and Task 6.
  - Single wink remains visible as Beta through the Wink Control mode card in Task 4 and Task 6.
  - Free gesture mapping logic is intentionally outside this design-system slice; the current plan shows gesture hints and mode cards without changing timer behavior.
- Type consistency:
  - `GhostExpression`, `WinkSide`, `ModeCard` action rows, and `arcadeTheme` token names are introduced before they are consumed.
  - `TimerScreen` uses the existing `TimerState`, `DetectionStatus`, and `useAppState()` contracts without changing domain files.
- Risk controls:
  - Existing timer behavior is preserved because `timerEngine.ts`, `GazeDetector.ts`, and native Android camera files are not modified.
  - Directional wink UI support is present, but runtime state maps generic `oneEyeClosed` to `winkSide: 'any'` until side-specific detection is introduced.

---

## Execution Handoff

Plan complete and saved to `docs/superpowers/plans/2026-05-21-focus-wink-design-system.md`. Two execution options:

**1. Subagent-Driven (recommended)** - Dispatch a fresh worker per task, review between tasks, fast iteration.

**2. Inline Execution** - Execute tasks in this session using the plan step-by-step with checkpoints.

Which approach?
