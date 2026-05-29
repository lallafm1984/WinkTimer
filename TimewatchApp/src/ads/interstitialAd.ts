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

type InterstitialAdOptions = {
  createInterstitialAd?: () => InterstitialAdForDisplay;
  timeoutMs?: number;
};

type AlarmStopInterstitialOptions = {
  nowMs?: number;
  repository?: InterstitialAdFrequencyRepository;
  showAd?: () => Promise<void>;
  getPolicy?: () => InterstitialAdPolicy;
};

type InterstitialAdRecord = {
  version?: number;
  lastShownAtMs?: number;
  shownDateKey?: string;
  dailyShownCount?: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
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
  policy = DEFAULT_INTERSTITIAL_AD_POLICY,
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

    const timeoutId = setTimeout(() => {
      rejectWithError(new Error('Interstitial ad timed out.'));
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeoutId);
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

export async function showAlarmStopInterstitialIfEligible({
  nowMs = Date.now(),
  repository = createInterstitialAdFrequencyRepository(),
  showAd = showInterstitialAd,
  getPolicy = getInterstitialAdPolicy,
}: AlarmStopInterstitialOptions = {}) {
  const policy = getPolicy();
  const snapshot = await repository.getFrequencySnapshot(nowMs);
  if (!shouldShowInterstitialAd(snapshot, policy, nowMs)) {
    return false;
  }

  await showAd();
  await repository.recordShown(nowMs);
  return true;
}
