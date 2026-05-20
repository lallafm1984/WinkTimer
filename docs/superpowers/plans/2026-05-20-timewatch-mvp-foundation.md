# Timewatch MVP Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** React Native Android 앱의 MVP 뼈대, 순수 타이머 로직, 화면 흐름, 로컬 세션 저장, mock 감지 어댑터를 만든다.

**Architecture:** 앱은 `TimewatchApp/` 아래 bare React Native 프로젝트로 만든다. React Native는 UI, 세션 상태, 로컬 저장, mock 감지 상태를 담당하고, Android 네이티브 감지 엔진은 이 계획에서는 타입 계약과 stub만 만든다. 실제 CameraX/ML Kit 프레임 분석은 이 기반이 동작한 뒤 별도 계획에서 붙인다.

**Tech Stack:** React Native Community CLI, React Native 0.85 계열, TypeScript, Jest, `@react-native-async-storage/async-storage`, Android Kotlin native module stub.

---

## Scope

이 계획은 첫 번째 실행 가능한 구현 단위다.

포함:

- 루트 git 저장소 초기화
- React Native Android 앱 scaffold
- 순수 TypeScript 타이머 엔진
- 감지 상태 타입과 민감도 타입
- mock 감지 어댑터
- 온보딩, 타이머, 요약, 기록, 설정 화면
- 세션 요약 로컬 저장
- Android native module stub

포함하지 않음:

- CameraX 실제 카메라 세션
- ML Kit 얼굴 분석
- 실시간 프레임 처리
- 카메라 셀프뷰 native component
- iOS

후속 계획은 `Timewatch Android Detection Engine Implementation Plan`으로 작성한다.

## Official References

- React Native 환경 준비: https://reactnative.dev/docs/set-up-your-environment
- React Native CLI 프로젝트 생성: https://reactnative.dev/docs/getting-started-without-a-framework
- React Native Android Turbo Native Modules: https://reactnative.dev/docs/turbo-native-modules-android
- ML Kit Face Detection Android: https://developers.google.com/ml-kit/vision/face-detection/android
- CameraX release/dependencies: https://developer.android.com/jetpack/androidx/releases/camera

## File Structure

생성 또는 수정할 핵심 파일:

- Create: `TimewatchApp/src/App.tsx` - 앱 최상위 상태와 화면 라우팅
- Modify: `TimewatchApp/App.tsx` - scaffold entry를 `src/App.tsx`로 위임
- Create: `TimewatchApp/src/domain/detection.ts` - 감지 상태, 민감도, 표시 설정 타입
- Create: `TimewatchApp/src/domain/session.ts` - 세션 요약 타입과 생성 헬퍼
- Create: `TimewatchApp/src/domain/timerEngine.ts` - 순수 타이머 상태 전이
- Create: `TimewatchApp/src/domain/__tests__/timerEngine.test.ts` - 타이머 엔진 테스트
- Create: `TimewatchApp/src/storage/sessionRepository.ts` - AsyncStorage 기반 세션 저장소
- Create: `TimewatchApp/src/storage/__tests__/sessionRepository.test.ts` - 저장소 테스트
- Create: `TimewatchApp/src/detection/GazeDetector.ts` - native/mock 감지 어댑터
- Create: `TimewatchApp/src/detection/__tests__/GazeDetector.test.ts` - 어댑터 테스트
- Create: `TimewatchApp/src/state/AppState.tsx` - 앱 상태와 액션
- Create: `TimewatchApp/src/components/PrimaryButton.tsx` - 공통 버튼
- Create: `TimewatchApp/src/components/StatusIndicator.tsx` - 감지 상태 표시
- Create: `TimewatchApp/src/components/TimerDisplay.tsx` - 시간 표시
- Create: `TimewatchApp/src/screens/OnboardingScreen.tsx` - 온보딩
- Create: `TimewatchApp/src/screens/TimerScreen.tsx` - 타이머 홈
- Create: `TimewatchApp/src/screens/SessionSummaryScreen.tsx` - 세션 요약
- Create: `TimewatchApp/src/screens/HistoryScreen.tsx` - 기록 목록
- Create: `TimewatchApp/src/screens/SettingsScreen.tsx` - 설정
- Create: `TimewatchApp/jest.setup.ts` - AsyncStorage mock 설정
- Modify: `TimewatchApp/package.json` - test setup과 dependencies
- Modify: `TimewatchApp/android/app/src/main/AndroidManifest.xml` - camera permission 선언
- Create: `TimewatchApp/android/app/src/main/java/com/timewatchapp/gaze/NativeGazeDetectionModule.kt` - Android native module stub
- Create: `TimewatchApp/android/app/src/main/java/com/timewatchapp/gaze/NativeGazeDetectionPackage.kt` - native package 등록
- Modify: `TimewatchApp/android/app/src/main/java/com/timewatchapp/MainApplication.kt` - native package 추가

---

### Task 1: Repository And React Native Scaffold

**Files:**

- Create: `.git/`
- Create: `TimewatchApp/`
- Create: `TimewatchApp/src/`
- Modify: `TimewatchApp/App.tsx`

- [ ] **Step 1: Initialize the root git repository**

Run from `E:\LimProjects\Time`:

```powershell
git init
git branch -M main
```

Expected: git repository initialized on branch `main`.

- [ ] **Step 2: Create the React Native app**

Run from `E:\LimProjects\Time`:

```powershell
npx @react-native-community/cli@latest init TimewatchApp
```

Expected: `TimewatchApp` directory exists and contains `android`, `ios`, `App.tsx`, `package.json`, and React Native template files.

- [ ] **Step 3: Install local storage dependency**

Run:

```powershell
Set-Location TimewatchApp
npm install @react-native-async-storage/async-storage
```

Expected: dependency is added to `TimewatchApp/package.json`.

- [ ] **Step 4: Add source directory and entry delegation**

Create `TimewatchApp/src/App.tsx`:

```tsx
import React from 'react';
import {SafeAreaView, StatusBar, StyleSheet, Text} from 'react-native';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>Timewatch</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F4EE',
  },
  title: {
    color: '#17201A',
    fontSize: 32,
    fontWeight: '700',
  },
});
```

Replace `TimewatchApp/App.tsx` with:

```tsx
import App from './src/App';

export default App;
```

- [ ] **Step 5: Run template tests**

Run:

```powershell
npm test -- --runInBand
```

Expected: test command exits successfully. If the template test imports the old `App.tsx` snapshot and fails because the rendered text changed, update or remove the generated template snapshot in the same commit.

- [ ] **Step 6: Commit scaffold**

Run from `E:\LimProjects\Time`:

```powershell
git add .
git commit -m "chore: scaffold timewatch react native app"
```

Expected: first commit created.

---

### Task 2: Domain Types And Timer Engine

**Files:**

- Create: `TimewatchApp/src/domain/detection.ts`
- Create: `TimewatchApp/src/domain/session.ts`
- Create: `TimewatchApp/src/domain/timerEngine.ts`
- Create: `TimewatchApp/src/domain/__tests__/timerEngine.test.ts`

- [ ] **Step 1: Write failing timer engine tests**

Create `TimewatchApp/src/domain/__tests__/timerEngine.test.ts`:

```ts
import {
  applyDetection,
  createInitialTimerState,
  endTimer,
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
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/domain/__tests__/timerEngine.test.ts --runInBand
```

Expected: FAIL because `timerEngine` does not exist.

- [ ] **Step 3: Add detection types**

Create `TimewatchApp/src/domain/detection.ts`:

```ts
export type DetectionStatus = 'looking' | 'notLooking' | 'unknown';

export type Sensitivity = 'loose' | 'normal' | 'strict';

export type StatusDisplayMode = 'minimal' | 'text';

export type DetectionReading = {
  status: DetectionStatus;
  confidence: number;
  atMs: number;
};

export type SensitivityConfig = {
  lookGraceMs: number;
};

export const sensitivityConfig: Record<Sensitivity, SensitivityConfig> = {
  loose: {lookGraceMs: 1800},
  normal: {lookGraceMs: 1200},
  strict: {lookGraceMs: 600},
};
```

- [ ] **Step 4: Add session model**

Create `TimewatchApp/src/domain/session.ts`:

```ts
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
```

- [ ] **Step 5: Add timer engine implementation**

Create `TimewatchApp/src/domain/timerEngine.ts`:

```ts
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
  state: TimerState,
  nowMs: number,
  targetDurationMs: number | undefined,
): TimerState {
  return {
    ...state,
    phase: 'active',
    startedAtMs: nowMs,
    lastUpdatedAtMs: nowMs,
    targetDurationMs: targetDurationMs ?? null,
  };
}

export function tickTimer(state: TimerState, nowMs: number, sensitivity: Sensitivity = 'normal'): TimerState {
  const advanced = accumulate(state, nowMs);
  return resolveLookGrace(advanced, nowMs, sensitivity);
}

export function applyDetection(
  state: TimerState,
  reading: DetectionReading,
  sensitivity: Sensitivity = 'normal',
): TimerState {
  const advanced = accumulate(state, reading.atMs);
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

export function pauseTimer(state: TimerState, nowMs: number): TimerState {
  return {...accumulate(state, nowMs), phase: 'manualPaused', lastUpdatedAtMs: nowMs};
}

export function resumeTimer(state: TimerState, nowMs: number): TimerState {
  return {...state, phase: 'active', lastUpdatedAtMs: nowMs};
}

export function endTimer(
  state: TimerState,
  nowMs: number,
  sensitivity: Sensitivity,
  normalTimerMode: boolean,
): SessionSummary {
  const finalState = accumulate(state, nowMs);
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

function accumulate(state: TimerState, nowMs: number): TimerState {
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

  if (state.detectionStatus === 'notLooking' || state.detectionStatus === 'looking') {
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
```

- [ ] **Step 6: Run timer tests**

Run:

```powershell
npm test -- src/domain/__tests__/timerEngine.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 7: Commit timer engine**

Run from `E:\LimProjects\Time`:

```powershell
git add TimewatchApp/src/domain
git commit -m "feat: add focus timer domain engine"
```

Expected: commit created.

---

### Task 3: Local Session Repository

**Files:**

- Create: `TimewatchApp/src/storage/sessionRepository.ts`
- Create: `TimewatchApp/src/storage/__tests__/sessionRepository.test.ts`
- Create: `TimewatchApp/jest.setup.ts`
- Modify: `TimewatchApp/package.json`

- [ ] **Step 1: Configure Jest AsyncStorage mock**

Create `TimewatchApp/jest.setup.ts`:

```ts
import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);
```

Modify `TimewatchApp/package.json` so the `jest` block contains:

```json
{
  "preset": "react-native",
  "setupFiles": ["./jest.setup.ts"]
}
```

If the generated template already has a `jest` block, preserve its existing keys and add `setupFiles`.

- [ ] **Step 2: Write failing repository tests**

Create `TimewatchApp/src/storage/__tests__/sessionRepository.test.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import {createSessionRepository} from '../sessionRepository';
import type {SessionSummary} from '../../domain/session';

const session: SessionSummary = {
  id: 'session-1',
  startedAt: '2026-05-20T00:00:00.000Z',
  endedAt: '2026-05-20T00:25:00.000Z',
  focusDurationMs: 1200000,
  lookPausedDurationMs: 300000,
  lookPauseCount: 3,
  targetEnabled: true,
  targetDurationMs: 1500000,
  targetCompleted: false,
  sensitivity: 'normal',
  normalTimerMode: false,
};

describe('sessionRepository', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('saves and lists sessions newest first', async () => {
    const repository = createSessionRepository();

    await repository.save({...session, id: 'older', startedAt: '2026-05-19T00:00:00.000Z'});
    await repository.save(session);

    const sessions = await repository.list();

    expect(sessions.map(item => item.id)).toEqual(['session-1', 'older']);
  });

  it('returns an empty list when storage is empty', async () => {
    const repository = createSessionRepository();

    await expect(repository.list()).resolves.toEqual([]);
  });
});
```

- [ ] **Step 3: Run tests to verify failure**

Run:

```powershell
npm test -- src/storage/__tests__/sessionRepository.test.ts --runInBand
```

Expected: FAIL because `sessionRepository` does not exist.

- [ ] **Step 4: Implement repository**

Create `TimewatchApp/src/storage/sessionRepository.ts`:

```ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import type {SessionSummary} from '../domain/session';

const SESSION_KEY = '@timewatch:sessions:v1';

export type SessionRepository = {
  list(): Promise<SessionSummary[]>;
  save(session: SessionSummary): Promise<void>;
};

export function createSessionRepository(): SessionRepository {
  return {
    async list() {
      const raw = await AsyncStorage.getItem(SESSION_KEY);
      if (!raw) {
        return [];
      }

      const parsed = JSON.parse(raw) as SessionSummary[];
      return parsed.sort((a, b) => b.startedAt.localeCompare(a.startedAt));
    },

    async save(session) {
      const existing = await this.list();
      const withoutDuplicate = existing.filter(item => item.id !== session.id);
      const next = [session, ...withoutDuplicate].sort((a, b) => b.startedAt.localeCompare(a.startedAt));
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(next));
    },
  };
}
```

- [ ] **Step 5: Run repository tests**

Run:

```powershell
npm test -- src/storage/__tests__/sessionRepository.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 6: Commit repository**

Run from `E:\LimProjects\Time`:

```powershell
git add TimewatchApp/package.json TimewatchApp/package-lock.json TimewatchApp/jest.setup.ts TimewatchApp/src/storage
git commit -m "feat: persist session summaries locally"
```

Expected: commit created.

---

### Task 4: Gaze Detection Adapter With Mock Fallback

**Files:**

- Create: `TimewatchApp/src/detection/GazeDetector.ts`
- Create: `TimewatchApp/src/detection/__tests__/GazeDetector.test.ts`

- [ ] **Step 1: Write failing adapter tests**

Create `TimewatchApp/src/detection/__tests__/GazeDetector.test.ts`:

```ts
import {createMockGazeDetector} from '../GazeDetector';

describe('GazeDetector', () => {
  it('emits the configured mock status', () => {
    const detector = createMockGazeDetector('notLooking');
    const readings = detector.getLatestReading(1000);

    expect(readings).toEqual({status: 'notLooking', confidence: 1, atMs: 1000});
  });

  it('can switch mock status', () => {
    const detector = createMockGazeDetector('unknown');

    detector.setMockStatus('looking');

    expect(detector.getLatestReading(2000).status).toBe('looking');
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run:

```powershell
npm test -- src/detection/__tests__/GazeDetector.test.ts --runInBand
```

Expected: FAIL because `GazeDetector` does not exist.

- [ ] **Step 3: Implement adapter**

Create `TimewatchApp/src/detection/GazeDetector.ts`:

```ts
import {NativeModules} from 'react-native';
import type {DetectionReading, DetectionStatus} from '../domain/detection';

type NativeGazeDetectionModule = {
  start(): Promise<void>;
  stop(): Promise<void>;
};

export type GazeDetector = {
  start(): Promise<void>;
  stop(): Promise<void>;
  getLatestReading(nowMs: number): DetectionReading;
  setMockStatus(status: DetectionStatus): void;
};

const NativeGazeDetection = NativeModules.NativeGazeDetection as NativeGazeDetectionModule | undefined;

export function createMockGazeDetector(initialStatus: DetectionStatus = 'unknown'): GazeDetector {
  let status = initialStatus;

  return {
    async start() {
      await NativeGazeDetection?.start?.();
    },

    async stop() {
      await NativeGazeDetection?.stop?.();
    },

    getLatestReading(nowMs) {
      return {
        status,
        confidence: status === 'unknown' ? 0 : 1,
        atMs: nowMs,
      };
    },

    setMockStatus(nextStatus) {
      status = nextStatus;
    },
  };
}
```

- [ ] **Step 4: Run adapter tests**

Run:

```powershell
npm test -- src/detection/__tests__/GazeDetector.test.ts --runInBand
```

Expected: PASS.

- [ ] **Step 5: Commit adapter**

Run from `E:\LimProjects\Time`:

```powershell
git add TimewatchApp/src/detection
git commit -m "feat: add gaze detector adapter contract"
```

Expected: commit created.

---

### Task 5: App State And Screen Flow

**Files:**

- Create: `TimewatchApp/src/state/AppState.tsx`
- Create: `TimewatchApp/src/App.tsx`
- Create: `TimewatchApp/src/screens/OnboardingScreen.tsx`
- Create: `TimewatchApp/src/screens/TimerScreen.tsx`
- Create: `TimewatchApp/src/screens/SessionSummaryScreen.tsx`
- Create: `TimewatchApp/src/screens/HistoryScreen.tsx`
- Create: `TimewatchApp/src/screens/SettingsScreen.tsx`
- Create: `TimewatchApp/src/components/PrimaryButton.tsx`
- Create: `TimewatchApp/src/components/StatusIndicator.tsx`
- Create: `TimewatchApp/src/components/TimerDisplay.tsx`

- [ ] **Step 1: Add reusable UI components**

Create `TimewatchApp/src/components/PrimaryButton.tsx`:

```tsx
import React from 'react';
import {Pressable, StyleSheet, Text} from 'react-native';

type Props = {
  label: string;
  onPress: () => void;
  variant?: 'primary' | 'secondary';
};

export function PrimaryButton({label, onPress, variant = 'primary'}: Props) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      style={[styles.button, variant === 'secondary' && styles.secondary]}>
      <Text style={[styles.label, variant === 'secondary' && styles.secondaryLabel]}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 8,
    backgroundColor: '#1F6F5B',
    paddingHorizontal: 18,
  },
  secondary: {
    backgroundColor: '#E4DED3',
  },
  label: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryLabel: {
    color: '#17201A',
  },
});
```

Create `TimewatchApp/src/components/TimerDisplay.tsx`:

```tsx
import React from 'react';
import {StyleSheet, Text} from 'react-native';

type Props = {
  durationMs: number;
};

export function TimerDisplay({durationMs}: Props) {
  const totalSeconds = Math.floor(durationMs / 1000);
  const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
  const seconds = (totalSeconds % 60).toString().padStart(2, '0');

  return <Text style={styles.time}>{minutes}:{seconds}</Text>;
}

const styles = StyleSheet.create({
  time: {
    color: '#17201A',
    fontSize: 64,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
});
```

Create `TimewatchApp/src/components/StatusIndicator.tsx`:

```tsx
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import type {DetectionStatus, StatusDisplayMode} from '../domain/detection';

type Props = {
  status: DetectionStatus;
  displayMode: StatusDisplayMode;
};

const labels: Record<DetectionStatus, string> = {
  notLooking: '집중 중',
  looking: '일시정지',
  unknown: '감지 중',
};

const colors: Record<DetectionStatus, string> = {
  notLooking: '#1F6F5B',
  looking: '#B94444',
  unknown: '#8C8377',
};

export function StatusIndicator({status, displayMode}: Props) {
  return (
    <View style={styles.container}>
      <View style={[styles.dot, {backgroundColor: colors[status]}]} />
      {displayMode === 'text' ? <Text style={styles.label}>{labels[status]}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    minHeight: 28,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  dot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  label: {
    color: '#342F29',
    fontSize: 14,
    fontWeight: '600',
  },
});
```

- [ ] **Step 2: Add app state provider**

Create `TimewatchApp/src/state/AppState.tsx`:

```tsx
import React, {createContext, useContext, useMemo, useState} from 'react';
import type {StatusDisplayMode, Sensitivity} from '../domain/detection';
import type {SessionSummary} from '../domain/session';
import {createInitialTimerState, type TimerState} from '../domain/timerEngine';
import {createMockGazeDetector} from '../detection/GazeDetector';
import {createSessionRepository} from '../storage/sessionRepository';

export type ScreenName = 'onboarding' | 'timer' | 'summary' | 'history' | 'settings';

type AppContextValue = {
  screen: ScreenName;
  setScreen: (screen: ScreenName) => void;
  timer: TimerState;
  setTimer: React.Dispatch<React.SetStateAction<TimerState>>;
  sessions: SessionSummary[];
  setSessions: React.Dispatch<React.SetStateAction<SessionSummary[]>>;
  lastSummary: SessionSummary | null;
  setLastSummary: React.Dispatch<React.SetStateAction<SessionSummary | null>>;
  sensitivity: Sensitivity;
  setSensitivity: React.Dispatch<React.SetStateAction<Sensitivity>>;
  statusDisplayMode: StatusDisplayMode;
  setStatusDisplayMode: React.Dispatch<React.SetStateAction<StatusDisplayMode>>;
  normalTimerMode: boolean;
  setNormalTimerMode: React.Dispatch<React.SetStateAction<boolean>>;
  repository: ReturnType<typeof createSessionRepository>;
  gazeDetector: ReturnType<typeof createMockGazeDetector>;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppStateProvider({children}: {children: React.ReactNode}) {
  const [screen, setScreen] = useState<ScreenName>('onboarding');
  const [timer, setTimer] = useState(() => createInitialTimerState(Date.now()));
  const [sessions, setSessions] = useState<SessionSummary[]>([]);
  const [lastSummary, setLastSummary] = useState<SessionSummary | null>(null);
  const [sensitivity, setSensitivity] = useState<Sensitivity>('normal');
  const [statusDisplayMode, setStatusDisplayMode] = useState<StatusDisplayMode>('minimal');
  const [normalTimerMode, setNormalTimerMode] = useState(false);

  const value = useMemo<AppContextValue>(
    () => ({
      screen,
      setScreen,
      timer,
      setTimer,
      sessions,
      setSessions,
      lastSummary,
      setLastSummary,
      sensitivity,
      setSensitivity,
      statusDisplayMode,
      setStatusDisplayMode,
      normalTimerMode,
      setNormalTimerMode,
      repository: createSessionRepository(),
      gazeDetector: createMockGazeDetector('unknown'),
    }),
    [lastSummary, normalTimerMode, screen, sensitivity, sessions, statusDisplayMode, timer],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useAppState() {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error('useAppState must be used inside AppStateProvider');
  }
  return value;
}
```

- [ ] **Step 3: Add screens**

Create `TimewatchApp/src/screens/OnboardingScreen.tsx`:

```tsx
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {useAppState} from '../state/AppState';

export function OnboardingScreen() {
  const {setScreen} = useAppState();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>폰을 보지 않는 시간이 집중 시간입니다.</Text>
      <Text style={styles.body}>
        타임워치는 카메라 분석을 기기 안에서만 처리합니다. 영상, 이미지, 얼굴 데이터는 저장하거나 업로드하지 않습니다.
      </Text>
      <PrimaryButton label="감지 테스트 시작" onPress={() => setScreen('timer')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
    padding: 24,
    backgroundColor: '#F7F4EE',
  },
  title: {
    color: '#17201A',
    fontSize: 30,
    fontWeight: '800',
  },
  body: {
    color: '#4A433A',
    fontSize: 16,
    lineHeight: 24,
  },
});
```

Create `TimewatchApp/src/screens/TimerScreen.tsx`:

```tsx
import React, {useEffect} from 'react';
import {AppState as NativeAppState, StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {StatusIndicator} from '../components/StatusIndicator';
import {TimerDisplay} from '../components/TimerDisplay';
import {applyDetection, createInitialTimerState, endTimer, pauseTimer, startTimer, tickTimer} from '../domain/timerEngine';
import {useAppState} from '../state/AppState';

export function TimerScreen() {
  const app = useAppState();

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      app.setTimer(current => {
        const reading = app.normalTimerMode
          ? {status: 'notLooking' as const, confidence: 1, atMs: now}
          : app.gazeDetector.getLatestReading(now);
        return tickTimer(applyDetection(current, reading, app.sensitivity), now, app.sensitivity);
      });
    }, 500);

    return () => clearInterval(interval);
  }, [app]);

  useEffect(() => {
    const subscription = NativeAppState.addEventListener('change', nextState => {
      if (nextState !== 'active') {
        app.setTimer(current => pauseTimer(current, Date.now()));
      }
    });

    return () => subscription.remove();
  }, [app]);

  const start = () => {
    app.setTimer(startTimer(createInitialTimerState(Date.now()), Date.now(), undefined));
  };

  const finish = async () => {
    const summary = endTimer(app.timer, Date.now(), app.sensitivity, app.normalTimerMode);
    await app.repository.save(summary);
    app.setSessions(await app.repository.list());
    app.setLastSummary(summary);
    app.setScreen('summary');
  };

  return (
    <View style={styles.container}>
      <View style={styles.topBar}>
        <PrimaryButton label="기록" variant="secondary" onPress={() => app.setScreen('history')} />
        <PrimaryButton label="설정" variant="secondary" onPress={() => app.setScreen('settings')} />
      </View>
      <Text style={styles.title}>Timewatch</Text>
      <StatusIndicator status={app.timer.detectionStatus} displayMode={app.statusDisplayMode} />
      <TimerDisplay durationMs={app.timer.focusDurationMs} />
      <View style={styles.controls}>
        {app.timer.phase === 'idle' || app.timer.phase === 'ended' ? (
          <PrimaryButton label="시작" onPress={start} />
        ) : (
          <PrimaryButton label="종료" onPress={finish} />
        )}
      </View>
      <View style={styles.mockRow}>
        <PrimaryButton label="안 봄" variant="secondary" onPress={() => app.gazeDetector.setMockStatus('notLooking')} />
        <PrimaryButton label="봄" variant="secondary" onPress={() => app.gazeDetector.setMockStatus('looking')} />
        <PrimaryButton label="불명" variant="secondary" onPress={() => app.gazeDetector.setMockStatus('unknown')} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: 24,
    padding: 24,
    backgroundColor: '#F7F4EE',
  },
  topBar: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  title: {
    color: '#17201A',
    fontSize: 24,
    fontWeight: '800',
    textAlign: 'center',
  },
  controls: {
    gap: 12,
  },
  mockRow: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
  },
});
```

Create `TimewatchApp/src/screens/SessionSummaryScreen.tsx`:

```tsx
import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {TimerDisplay} from '../components/TimerDisplay';
import {useAppState} from '../state/AppState';

export function SessionSummaryScreen() {
  const {lastSummary, setScreen} = useAppState();

  if (!lastSummary) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>요약할 세션이 없습니다.</Text>
        <PrimaryButton label="타이머로 돌아가기" onPress={() => setScreen('timer')} />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>세션 요약</Text>
      <Text style={styles.label}>집중 시간</Text>
      <TimerDisplay durationMs={lastSummary.focusDurationMs} />
      <Text style={styles.metric}>멈춘 시간: {Math.round(lastSummary.lookPausedDurationMs / 1000)}초</Text>
      <Text style={styles.metric}>멈춘 횟수: {lastSummary.lookPauseCount}회</Text>
      <PrimaryButton label="타이머로 돌아가기" onPress={() => setScreen('timer')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    gap: 16,
    padding: 24,
    backgroundColor: '#F7F4EE',
  },
  title: {
    color: '#17201A',
    fontSize: 28,
    fontWeight: '800',
  },
  label: {
    color: '#4A433A',
    fontSize: 14,
    fontWeight: '700',
  },
  metric: {
    color: '#342F29',
    fontSize: 16,
  },
});
```

Create `TimewatchApp/src/screens/HistoryScreen.tsx`:

```tsx
import React, {useEffect} from 'react';
import {FlatList, StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {useAppState} from '../state/AppState';

export function HistoryScreen() {
  const {repository, sessions, setSessions, setScreen} = useAppState();

  useEffect(() => {
    repository.list().then(setSessions);
  }, [repository, setSessions]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>세션 기록</Text>
      <FlatList
        data={sessions}
        keyExtractor={item => item.id}
        ListEmptyComponent={<Text style={styles.empty}>저장된 세션이 없습니다.</Text>}
        renderItem={({item}) => (
          <View style={styles.row}>
            <Text style={styles.date}>{new Date(item.startedAt).toLocaleString()}</Text>
            <Text style={styles.metric}>집중 {Math.round(item.focusDurationMs / 60000)}분 · 멈춤 {item.lookPauseCount}회</Text>
          </View>
        )}
      />
      <PrimaryButton label="타이머로 돌아가기" onPress={() => setScreen('timer')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 16,
    padding: 24,
    backgroundColor: '#F7F4EE',
  },
  title: {
    color: '#17201A',
    fontSize: 28,
    fontWeight: '800',
  },
  row: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#BDB4A8',
    paddingVertical: 14,
  },
  date: {
    color: '#17201A',
    fontSize: 15,
    fontWeight: '700',
  },
  metric: {
    color: '#4A433A',
    marginTop: 4,
  },
  empty: {
    color: '#4A433A',
    paddingVertical: 24,
  },
});
```

Create `TimewatchApp/src/screens/SettingsScreen.tsx`:

```tsx
import React from 'react';
import {StyleSheet, Switch, Text, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import type {Sensitivity} from '../domain/detection';
import {useAppState} from '../state/AppState';

const sensitivities: Sensitivity[] = ['loose', 'normal', 'strict'];

export function SettingsScreen() {
  const app = useAppState();

  return (
    <View style={styles.container}>
      <Text style={styles.title}>설정</Text>
      <Text style={styles.section}>민감도</Text>
      <View style={styles.row}>
        {sensitivities.map(item => (
          <PrimaryButton
            key={item}
            label={item}
            variant={app.sensitivity === item ? 'primary' : 'secondary'}
            onPress={() => app.setSensitivity(item)}
          />
        ))}
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.text}>텍스트 상태 표시</Text>
        <Switch
          value={app.statusDisplayMode === 'text'}
          onValueChange={enabled => app.setStatusDisplayMode(enabled ? 'text' : 'minimal')}
        />
      </View>
      <View style={styles.toggleRow}>
        <Text style={styles.text}>일반 타이머 모드</Text>
        <Switch value={app.normalTimerMode} onValueChange={app.setNormalTimerMode} />
      </View>
      <Text style={styles.note}>카메라 셀프뷰와 실제 감지 테스트는 Android 감지 엔진 작업에서 추가됩니다.</Text>
      <PrimaryButton label="타이머로 돌아가기" onPress={() => app.setScreen('timer')} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: 18,
    padding: 24,
    backgroundColor: '#F7F4EE',
  },
  title: {
    color: '#17201A',
    fontSize: 28,
    fontWeight: '800',
  },
  section: {
    color: '#4A433A',
    fontSize: 14,
    fontWeight: '700',
  },
  row: {
    flexDirection: 'row',
    gap: 8,
  },
  toggleRow: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  text: {
    color: '#17201A',
    fontSize: 16,
  },
  note: {
    color: '#6B6258',
    fontSize: 14,
    lineHeight: 20,
  },
});
```

- [ ] **Step 4: Wire app shell**

Replace `TimewatchApp/src/App.tsx` with:

```tsx
import React from 'react';
import {SafeAreaView, StyleSheet} from 'react-native';
import {AppStateProvider, useAppState} from './state/AppState';
import {HistoryScreen} from './screens/HistoryScreen';
import {OnboardingScreen} from './screens/OnboardingScreen';
import {SessionSummaryScreen} from './screens/SessionSummaryScreen';
import {SettingsScreen} from './screens/SettingsScreen';
import {TimerScreen} from './screens/TimerScreen';

function CurrentScreen() {
  const {screen} = useAppState();

  if (screen === 'onboarding') {
    return <OnboardingScreen />;
  }
  if (screen === 'summary') {
    return <SessionSummaryScreen />;
  }
  if (screen === 'history') {
    return <HistoryScreen />;
  }
  if (screen === 'settings') {
    return <SettingsScreen />;
  }
  return <TimerScreen />;
}

export default function App() {
  return (
    <AppStateProvider>
      <SafeAreaView style={styles.container}>
        <CurrentScreen />
      </SafeAreaView>
    </AppStateProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F7F4EE',
  },
});
```

- [ ] **Step 5: Run TypeScript and tests**

Run:

```powershell
npm test -- --runInBand
npx tsc --noEmit
```

Expected: tests pass and TypeScript exits with code 0.

- [ ] **Step 6: Commit app flow**

Run from `E:\LimProjects\Time`:

```powershell
git add TimewatchApp/src
git commit -m "feat: add timewatch app screens"
```

Expected: commit created.

---

### Task 6: Android Native Module Stub And Permissions

**Files:**

- Modify: `TimewatchApp/android/app/src/main/AndroidManifest.xml`
- Create: `TimewatchApp/android/app/src/main/java/com/timewatchapp/gaze/NativeGazeDetectionModule.kt`
- Create: `TimewatchApp/android/app/src/main/java/com/timewatchapp/gaze/NativeGazeDetectionPackage.kt`
- Modify: `TimewatchApp/android/app/src/main/java/com/timewatchapp/MainApplication.kt`

- [ ] **Step 1: Add camera permission**

In `TimewatchApp/android/app/src/main/AndroidManifest.xml`, add this permission above `<application>`:

```xml
<uses-permission android:name="android.permission.CAMERA" />
```

Expected: Android manifest declares camera permission, even though this first plan uses a stub.

- [ ] **Step 2: Add native module stub**

Create `TimewatchApp/android/app/src/main/java/com/timewatchapp/gaze/NativeGazeDetectionModule.kt`:

```kotlin
package com.timewatchapp.gaze

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NativeGazeDetectionModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = NAME

  @ReactMethod
  fun start(promise: Promise) {
    promise.resolve(null)
  }

  @ReactMethod
  fun stop(promise: Promise) {
    promise.resolve(null)
  }

  companion object {
    const val NAME = "NativeGazeDetection"
  }
}
```

Create `TimewatchApp/android/app/src/main/java/com/timewatchapp/gaze/NativeGazeDetectionPackage.kt`:

```kotlin
package com.timewatchapp.gaze

import com.facebook.react.ReactPackage
import com.facebook.react.bridge.NativeModule
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.uimanager.ViewManager

class NativeGazeDetectionPackage : ReactPackage {
  override fun createNativeModules(reactContext: ReactApplicationContext): List<NativeModule> =
    listOf(NativeGazeDetectionModule(reactContext))

  override fun createViewManagers(reactContext: ReactApplicationContext): List<ViewManager<*, *>> =
    emptyList()
}
```

- [ ] **Step 3: Register native package**

Modify `TimewatchApp/android/app/src/main/java/com/timewatchapp/MainApplication.kt`.

Add import:

```kotlin
import com.timewatchapp.gaze.NativeGazeDetectionPackage
```

Inside the `packages` list, after `PackageList(this).packages.apply {`, add:

```kotlin
add(NativeGazeDetectionPackage())
```

Expected: `NativeModules.NativeGazeDetection` exists at runtime.

- [ ] **Step 4: Build Android debug app**

Run:

```powershell
npm run android
```

Expected: Android build succeeds and the app launches on a connected device or emulator. If no device is connected, run:

```powershell
adb devices
```

Expected with no device: list is empty and the build cannot install. In that case, start an Android emulator or connect a physical Android device with USB debugging enabled before rerunning `npm run android`.

- [ ] **Step 5: Commit native stub**

Run from `E:\LimProjects\Time`:

```powershell
git add TimewatchApp/android
git commit -m "feat: add android gaze detection native stub"
```

Expected: commit created.

---

### Task 7: Manual MVP Verification

**Files:**

- Modify: none

- [ ] **Step 1: Run all automated checks**

Run from `TimewatchApp`:

```powershell
npm test -- --runInBand
npx tsc --noEmit
```

Expected: all tests pass and TypeScript exits with code 0.

- [ ] **Step 2: Run Android app**

Run:

```powershell
npm run android
```

Expected: app launches on Android.

- [ ] **Step 3: Verify onboarding flow**

Manual checks:

- First screen shows Korean onboarding copy.
- Tapping `감지 테스트 시작` navigates to timer screen.
- No camera preview is shown on the timer screen.

- [ ] **Step 4: Verify timer mock detection**

Manual checks:

- Tap `시작`.
- Tap `안 봄`; timer begins increasing.
- Tap `봄`; after the normal grace period, status changes to pause behavior and pause count increases.
- Tap `불명`; focus time stops increasing.
- Tap `종료`; summary screen appears.

- [ ] **Step 5: Verify session summary and history**

Manual checks:

- Summary screen shows focus time, paused time, and pause count.
- Return to timer.
- Open `기록`.
- Latest session is visible at the top.

- [ ] **Step 6: Verify settings**

Manual checks:

- Open `설정`.
- Change sensitivity.
- Enable text status display.
- Enable normal timer mode.
- Return to timer and confirm status text appears.

- [ ] **Step 7: Commit verification notes if any app text changed during verification**

If verification required app copy or layout fixes, commit them:

```powershell
git add TimewatchApp/src
git commit -m "fix: polish mvp foundation flow"
```

Expected: commit exists only if source files changed.

---

## Follow-Up Plan Required

After this foundation plan passes, write the next implementation plan for:

- CameraX session lifecycle
- ML Kit face detector configuration
- native status classification from face angle and eye-open probability
- native event emission into React Native
- camera permission request UX
- detection test screen with temporary self-view
- device test matrix

The follow-up plan should use the ML Kit real-time guidance: FAST mode, low resolution, throttled detector calls, `ImageProxy.close()`, and CameraX `STRATEGY_KEEP_ONLY_LATEST`.

## Self-Review

Spec coverage:

- Focus timer MVP: covered by Tasks 2, 5, and 7.
- Stopwatch mode: covered by Task 2 and Task 5.
- Optional target model: data and timer support covered by Task 2; visible target UI is deferred to a small UI refinement task after this foundation if needed.
- Privacy copy: covered by Task 5 onboarding.
- Timer screen without camera preview: covered by Task 5 and manual verification.
- Session summary and local history: covered by Tasks 3, 5, and 7.
- Camera-free normal timer mode: covered by Task 5.
- Android native detection contract: covered by Task 6.
- Real CameraX/ML Kit detection: explicitly scoped to the follow-up plan because it is an independent native subsystem.

Red-flag scan:

- No unresolved markers or unnamed files.
- All tasks have exact paths, commands, and expected outcomes.

Type consistency:

- Detection statuses use `looking`, `notLooking`, and `unknown` consistently.
- Sensitivity values use `loose`, `normal`, and `strict` consistently.
- Session fields match the approved design spec.
