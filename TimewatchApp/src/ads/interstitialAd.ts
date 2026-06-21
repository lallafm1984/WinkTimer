import AsyncStorage from '@react-native-async-storage/async-storage';
import {AdEventType, InterstitialAd} from 'react-native-google-mobile-ads';
import {getInterstitialAdUnitId} from './adMobConfig';
import {recordAdDiagnosticLog} from './adDiagnosticLog';
import {
  DEFAULT_INTERSTITIAL_AD_POLICY,
  getInterstitialAdPolicy,
  type InterstitialAdPolicy,
} from './interstitialAdRemoteConfig';

const INTERSTITIAL_AD_STORAGE_KEY = '@winktimer:interstitial_ads:v1';
const INTERSTITIAL_AD_RECORD_VERSION = 2;
const MODE_SELECTION_INTERSTITIAL_GRACE_STORAGE_KEY =
  '@winktimer:mode_selection_interstitial_grace:v1';
const MODE_SELECTION_INTERSTITIAL_GRACE_RECORD_VERSION = 2;
const MODE_SELECTION_INTERSTITIAL_GRACE_CLOCK_SKEW_MS = 5 * 60 * 1000;
const EXISTING_USER_MODE_SELECTION_INTERSTITIAL_SKIPS = 2;
const EXISTING_USER_STORAGE_KEYS = [
  '@winktimer:settings:v1',
  '@winktimer:active_timekeeping:v1',
  '@winktimer:sessions:v1',
  '@winktimer:alarms:v1',
  '@winktimer:app_review_prompt:v1',
  '@winktimer:ad_rewards:v1',
  INTERSTITIAL_AD_STORAGE_KEY,
] as const;

export const INTERSTITIAL_AD_COOLDOWN_MS = 3 * 60 * 60 * 1000;

type InterstitialAdEventListener = (payload?: unknown) => void;

export type InterstitialAdForDisplay = {
  addAdEventListener(
    type: AdEventType,
    listener: InterstitialAdEventListener,
  ): () => void;
  load(): void;
  show(): Promise<void>;
};

export type InterstitialAdFrequencySnapshot = {
  lastShownAtMs: number | null;
  dailyShownCount: number;
  shownDateKey: string;
};

export type InterstitialAdFrequencyRepository = {
  getFrequencySnapshot(nowMs: number): Promise<InterstitialAdFrequencySnapshot>;
  recordShown(shownAtMs: number): Promise<void>;
};

export type ModeSelectionInterstitialGraceState = {
  firstSeenAtMs: number;
  existingUserModeSelectionSkipsRemaining: number;
};

export type ModeSelectionInterstitialGraceRepository = {
  getOrCreateState(nowMs: number): Promise<ModeSelectionInterstitialGraceState>;
  consumeExistingUserModeSelectionSkip(nowMs: number): Promise<number>;
};

type InterstitialAdOptions = {
  createInterstitialAd?: () => InterstitialAdForDisplay;
  timeoutMs?: number;
};

type BaseInterstitialAdPolicy = Pick<
  InterstitialAdPolicy,
  'enabled' | 'dailyCap' | 'cooldownMs'
>;

type SettingsEntryInterstitialPolicy = BaseInterstitialAdPolicy &
  Pick<
    InterstitialAdPolicy,
    'settingsEntryEnabled' | 'settingsCloseReviewPromptEnabled'
  >;

type GatedInterstitialOptions = {
  nowMs?: number;
  repository?: InterstitialAdFrequencyRepository;
  showAd?: () => Promise<void>;
  getPolicy?: () => InterstitialAdPolicy;
};

type ModeSelectionInterstitialOptions = GatedInterstitialOptions & {
  graceRepository?: ModeSelectionInterstitialGraceRepository;
};

type InterstitialEligibilityChecker = (
  snapshot: InterstitialAdFrequencySnapshot,
  policy: InterstitialAdPolicy,
  nowMs: number,
) => boolean;

type InterstitialAdRecord = {
  version?: number;
  lastShownAtMs?: number;
  shownDateKey?: string;
  dailyShownCount?: number;
};

type ModeSelectionInterstitialGraceRecord = {
  version?: number;
  firstSeenAtMs?: number;
  existingUserModeSelectionSkipsRemaining?: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeNonNegativeInteger(value: unknown) {
  return isFiniteNumber(value) ? Math.max(0, Math.floor(value)) : undefined;
}

function normalizeInterstitialAdRecord(
  value: unknown,
): InterstitialAdRecord | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as InterstitialAdRecord;

  return isFiniteNumber(record.lastShownAtMs)
    ? {
        version: record.version,
        lastShownAtMs: record.lastShownAtMs,
        shownDateKey:
          typeof record.shownDateKey === 'string'
            ? record.shownDateKey
            : undefined,
        dailyShownCount: isFiniteNumber(record.dailyShownCount)
          ? Math.max(0, Math.floor(record.dailyShownCount))
          : undefined,
      }
    : null;
}

async function readInterstitialAdRecord() {
  const raw = await AsyncStorage.getItem(INTERSTITIAL_AD_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    const record = normalizeInterstitialAdRecord(parsed);
    if (!record) {
      await AsyncStorage.removeItem(INTERSTITIAL_AD_STORAGE_KEY);
      return {};
    }

    return record;
  } catch {
    await AsyncStorage.removeItem(INTERSTITIAL_AD_STORAGE_KEY);
    return {};
  }
}

function normalizeModeSelectionGraceRecord(
  value: unknown,
): ModeSelectionInterstitialGraceRecord | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as ModeSelectionInterstitialGraceRecord;

  return isFiniteNumber(record.firstSeenAtMs)
    ? {
        version: record.version,
        firstSeenAtMs: record.firstSeenAtMs,
        existingUserModeSelectionSkipsRemaining: normalizeNonNegativeInteger(
          record.existingUserModeSelectionSkipsRemaining,
        ),
      }
    : null;
}

async function readModeSelectionGraceRecord() {
  const raw = await AsyncStorage.getItem(
    MODE_SELECTION_INTERSTITIAL_GRACE_STORAGE_KEY,
  );
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    const record = normalizeModeSelectionGraceRecord(parsed);
    if (!record) {
      await AsyncStorage.removeItem(
        MODE_SELECTION_INTERSTITIAL_GRACE_STORAGE_KEY,
      );
      return {};
    }

    return record;
  } catch {
    await AsyncStorage.removeItem(MODE_SELECTION_INTERSTITIAL_GRACE_STORAGE_KEY);
    return {};
  }
}

function isUsableFirstSeenAtMs(
  firstSeenAtMs: unknown,
  nowMs: number,
): firstSeenAtMs is number {
  return (
    isFiniteNumber(firstSeenAtMs) &&
    firstSeenAtMs >= 0 &&
    firstSeenAtMs <= nowMs + MODE_SELECTION_INTERSTITIAL_GRACE_CLOCK_SKEW_MS
  );
}

async function hasExistingUserStorageRecord() {
  const values = await Promise.all(
    EXISTING_USER_STORAGE_KEYS.map(async key => {
      try {
        return await AsyncStorage.getItem(key);
      } catch {
        return null;
      }
    }),
  );

  return values.some(value => value !== null);
}

async function getInitialExistingUserModeSelectionSkips() {
  return (await hasExistingUserStorageRecord())
    ? EXISTING_USER_MODE_SELECTION_INTERSTITIAL_SKIPS
    : 0;
}

async function writeModeSelectionGraceState({
  firstSeenAtMs,
  existingUserModeSelectionSkipsRemaining,
}: ModeSelectionInterstitialGraceState) {
  await AsyncStorage.setItem(
    MODE_SELECTION_INTERSTITIAL_GRACE_STORAGE_KEY,
    JSON.stringify({
      version: MODE_SELECTION_INTERSTITIAL_GRACE_RECORD_VERSION,
      firstSeenAtMs,
      existingUserModeSelectionSkipsRemaining,
    }),
  );
}

async function getOrCreateModeSelectionGraceState(
  nowMs: number,
): Promise<ModeSelectionInterstitialGraceState> {
  const safeNowMs = isFiniteNumber(nowMs) ? nowMs : Date.now();
  const record = await readModeSelectionGraceRecord();

  if (isUsableFirstSeenAtMs(record.firstSeenAtMs, safeNowMs)) {
    const existingUserModeSelectionSkipsRemaining =
      normalizeNonNegativeInteger(
        record.existingUserModeSelectionSkipsRemaining,
      );
    if (existingUserModeSelectionSkipsRemaining !== undefined) {
      return {
        firstSeenAtMs: record.firstSeenAtMs,
        existingUserModeSelectionSkipsRemaining,
      };
    }

    const migratedState = {
      firstSeenAtMs: record.firstSeenAtMs,
      existingUserModeSelectionSkipsRemaining:
        await getInitialExistingUserModeSelectionSkips(),
    };
    await writeModeSelectionGraceState(migratedState);
    return migratedState;
  }

  const initialState = {
    firstSeenAtMs: safeNowMs,
    existingUserModeSelectionSkipsRemaining:
      await getInitialExistingUserModeSelectionSkips(),
  };
  await writeModeSelectionGraceState(initialState);
  return initialState;
}

async function consumeExistingUserModeSelectionSkip(nowMs: number) {
  const state = await getOrCreateModeSelectionGraceState(nowMs);
  if (state.existingUserModeSelectionSkipsRemaining <= 0) {
    return 0;
  }

  const nextState = {
    ...state,
    existingUserModeSelectionSkipsRemaining:
      state.existingUserModeSelectionSkipsRemaining - 1,
  };
  await writeModeSelectionGraceState(nextState);
  return nextState.existingUserModeSelectionSkipsRemaining;
}

export function getInterstitialAdDateKey(nowMs: number) {
  const date = new Date(nowMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function createFrequencySnapshot(
  record: InterstitialAdRecord,
  nowMs: number,
): InterstitialAdFrequencySnapshot {
  const shownDateKey = getInterstitialAdDateKey(nowMs);
  const isSameDate = record.shownDateKey === shownDateKey;

  return {
    lastShownAtMs: isFiniteNumber(record.lastShownAtMs)
      ? record.lastShownAtMs
      : null,
    dailyShownCount:
      isSameDate && isFiniteNumber(record.dailyShownCount)
        ? Math.max(0, Math.floor(record.dailyShownCount))
        : 0,
    shownDateKey,
  };
}

export function shouldShowInterstitialAd(
  snapshot: InterstitialAdFrequencySnapshot,
  policy: BaseInterstitialAdPolicy = DEFAULT_INTERSTITIAL_AD_POLICY,
  nowMs = Date.now(),
) {
  if (!policy.enabled || policy.dailyCap <= 0) {
    return false;
  }

  if (snapshot.dailyShownCount >= policy.dailyCap) {
    return false;
  }

  if (!isFiniteNumber(snapshot.lastShownAtMs)) {
    return true;
  }

  return nowMs - snapshot.lastShownAtMs >= policy.cooldownMs;
}

export function shouldShowSettingsEntryInterstitialAd(
  snapshot: InterstitialAdFrequencySnapshot,
  policy: SettingsEntryInterstitialPolicy = DEFAULT_INTERSTITIAL_AD_POLICY,
  nowMs = Date.now(),
) {
  if (!policy.settingsEntryEnabled) {
    return false;
  }

  return shouldShowInterstitialAd(snapshot, policy, nowMs);
}

export function shouldShowModeSelectionInterstitialAd(
  snapshot: InterstitialAdFrequencySnapshot,
  firstSeenAtMs: number,
  policy: BaseInterstitialAdPolicy &
    Pick<InterstitialAdPolicy, 'modeSelectionGraceMs'> =
    DEFAULT_INTERSTITIAL_AD_POLICY,
  nowMs = Date.now(),
) {
  if (
    policy.modeSelectionGraceMs > 0 &&
    (!isFiniteNumber(firstSeenAtMs) ||
      nowMs - firstSeenAtMs < policy.modeSelectionGraceMs)
  ) {
    return false;
  }

  return shouldShowInterstitialAd(snapshot, policy, nowMs);
}

export function createInterstitialAdFrequencyRepository(): InterstitialAdFrequencyRepository {
  return {
    async getFrequencySnapshot(nowMs) {
      const record = await readInterstitialAdRecord();

      return createFrequencySnapshot(record, nowMs);
    },

    async recordShown(shownAtMs) {
      const record = await readInterstitialAdRecord();
      const shownDateKey = getInterstitialAdDateKey(shownAtMs);
      const dailyShownCount =
        record.shownDateKey === shownDateKey &&
        isFiniteNumber(record.dailyShownCount)
          ? Math.max(0, Math.floor(record.dailyShownCount)) + 1
          : 1;

      await AsyncStorage.setItem(
        INTERSTITIAL_AD_STORAGE_KEY,
        JSON.stringify({
          version: INTERSTITIAL_AD_RECORD_VERSION,
          lastShownAtMs: shownAtMs,
          shownDateKey,
          dailyShownCount,
        }),
      );
    },
  };
}

export function createModeSelectionInterstitialGraceRepository(): ModeSelectionInterstitialGraceRepository {
  return {
    getOrCreateState: getOrCreateModeSelectionGraceState,
    consumeExistingUserModeSelectionSkip,
  };
}

export function initializeModeSelectionInterstitialGrace({
  nowMs = Date.now(),
  graceRepository = createModeSelectionInterstitialGraceRepository(),
}: {
  nowMs?: number;
  graceRepository?: ModeSelectionInterstitialGraceRepository;
} = {}) {
  return graceRepository
    .getOrCreateState(nowMs)
    .then(state => state.firstSeenAtMs);
}

function createInterstitialAdForDisplay() {
  const adUnitId = getInterstitialAdUnitId();
  recordAdDiagnosticLog('interstitial.create_request', {adUnitId});

  // Google Mobile Ads and react-native-google-mobile-ads both require loading
  // the interstitial before calling show().
  return InterstitialAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });
}

export function showInterstitialAd({
  createInterstitialAd = createInterstitialAdForDisplay,
  timeoutMs = 8_000,
}: InterstitialAdOptions = {}) {
  const interstitialAd = createInterstitialAd();

  return new Promise<void>((resolve, reject) => {
    let settled = false;
    const unsubscribeCallbacks: Array<() => void> = [];

    let timeoutId: ReturnType<typeof setTimeout> | null = setTimeout(() => {
      rejectWithError(new Error('Interstitial ad timed out.'));
    }, timeoutMs);

    const clearLoadTimeout = () => {
      if (timeoutId === null) {
        return;
      }

      clearTimeout(timeoutId);
      timeoutId = null;
    };

    const cleanup = () => {
      clearLoadTimeout();
      unsubscribeCallbacks.forEach(unsubscribe => {
        unsubscribe();
      });
    };

    const resolveAfterClose = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve();
    };

    const rejectWithError = (error: unknown) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(error);
    };

    unsubscribeCallbacks.push(
      interstitialAd.addAdEventListener(AdEventType.LOADED, () => {
        clearLoadTimeout();
        recordAdDiagnosticLog('interstitial.loaded');
        interstitialAd.show().catch(error => {
          recordAdDiagnosticLog('interstitial.show_error', error);
          rejectWithError(error);
        });
      }),
      interstitialAd.addAdEventListener(AdEventType.CLOSED, () => {
        recordAdDiagnosticLog('interstitial.closed');
        resolveAfterClose();
      }),
      interstitialAd.addAdEventListener(AdEventType.ERROR, error => {
        recordAdDiagnosticLog('interstitial.load_error', error);
        rejectWithError(error);
      }),
    );

    recordAdDiagnosticLog('interstitial.load_request');
    interstitialAd.load();
  });
}

async function showGatedInterstitialIfEligible(
  {
    nowMs = Date.now(),
    repository = createInterstitialAdFrequencyRepository(),
    showAd = showInterstitialAd,
    getPolicy = getInterstitialAdPolicy,
  }: GatedInterstitialOptions,
  shouldShow: InterstitialEligibilityChecker,
) {
  const policy = getPolicy();
  const snapshot = await repository.getFrequencySnapshot(nowMs);
  if (!shouldShow(snapshot, policy, nowMs)) {
    return false;
  }

  await showAd();
  await repository.recordShown(nowMs);
  return true;
}

export async function showAlarmStopInterstitialIfEligible({
  nowMs = Date.now(),
  repository = createInterstitialAdFrequencyRepository(),
  showAd = showInterstitialAd,
  getPolicy = getInterstitialAdPolicy,
}: GatedInterstitialOptions = {}) {
  return showGatedInterstitialIfEligible(
    {nowMs, repository, showAd, getPolicy},
    shouldShowInterstitialAd,
  );
}

export async function showModeSelectionInterstitialIfEligible({
  nowMs = Date.now(),
  repository = createInterstitialAdFrequencyRepository(),
  graceRepository = createModeSelectionInterstitialGraceRepository(),
  showAd = showInterstitialAd,
  getPolicy = getInterstitialAdPolicy,
}: ModeSelectionInterstitialOptions = {}) {
  const policy = getPolicy();
  const graceState = await graceRepository.getOrCreateState(nowMs);
  if (graceState.existingUserModeSelectionSkipsRemaining > 0) {
    await graceRepository.consumeExistingUserModeSelectionSkip(nowMs);
    return false;
  }

  const snapshot = await repository.getFrequencySnapshot(nowMs);
  if (
    !shouldShowModeSelectionInterstitialAd(
      snapshot,
      graceState.firstSeenAtMs,
      policy,
      nowMs,
    )
  ) {
    return false;
  }

  await showAd();
  await repository.recordShown(nowMs);
  return true;
}

export async function showSettingsEntryInterstitialIfEligible({
  nowMs = Date.now(),
  repository = createInterstitialAdFrequencyRepository(),
  showAd = showInterstitialAd,
  getPolicy = getInterstitialAdPolicy,
}: GatedInterstitialOptions = {}) {
  return showGatedInterstitialIfEligible(
    {nowMs, repository, showAd, getPolicy},
    shouldShowSettingsEntryInterstitialAd,
  );
}
