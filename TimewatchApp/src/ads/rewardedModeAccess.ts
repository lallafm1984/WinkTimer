import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules, Platform} from 'react-native';
import type {TimerModeId} from '../domain/timerMode';

const REWARDED_MODE_ACCESS_STORAGE_KEY = '@winktimer:ad_rewards:v1';
const REWARDED_MODE_ACCESS_RECORD_VERSION = 2;
const REWARDED_MODE_ACCESS_PROBE_MODE_ID: TimerModeId = 'lookPause';

export const REWARDED_MODE_ACCESS_DURATION_MS = 3 * 60 * 60 * 1000;
export const REWARDED_MODE_ACCESS_CLOCK_SKEW_GRACE_MS = 5 * 60 * 1000;
export const REWARDED_MODE_ACCESS_CLOCK_ROLLBACK_GRACE_MS = 5 * 60 * 1000;
export const REWARDED_MODE_ACCESS_LABEL = '광고 시청 후 3시간 사용 가능';

type LegacyRewardedModeAccessRecord = Partial<Record<TimerModeId, number>>;
type RewardedModeAccessRecord = {
  version?: number;
  grantedAtMs?: number;
  expiresAtMs?: number;
  maxSeenWallMs?: number;
};

type NativeRewardedAccessModule = {
  grantAccess(): Promise<void>;
  getAccessGrantedAtMs(): Promise<number | null>;
  hasActiveAccess(): Promise<boolean>;
  clearAccess?(): Promise<void>;
};

export type RewardedModeAccessRepository = {
  getAccessGrantedAtMs(): Promise<number | null>;
  grantAccess(grantedAtMs?: number): Promise<void>;
  hasActiveAccess(modeId: TimerModeId, nowMs?: number): Promise<boolean>;
};

const rewardedModeIds = new Set<TimerModeId>([
  'lookPause',
  'winkControl',
  'smileMode',
]);

export function modeRequiresRewardedAd(modeId: TimerModeId) {
  return rewardedModeIds.has(modeId);
}

export function hasActiveRewardedModeAccess(
  modeId: TimerModeId,
  grantedAtMs: number | null,
  nowMs = Date.now(),
) {
  if (!modeRequiresRewardedAd(modeId)) {
    return true;
  }

  if (!isFiniteNumber(grantedAtMs)) {
    return false;
  }

  if (grantedAtMs > nowMs + REWARDED_MODE_ACCESS_CLOCK_SKEW_GRACE_MS) {
    return false;
  }

  if (nowMs < grantedAtMs) {
    return true;
  }

  return nowMs - grantedAtMs < REWARDED_MODE_ACCESS_DURATION_MS;
}

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getNativeRewardedAccess(): NativeRewardedAccessModule | null {
  if (Platform.OS !== 'android') {
    return null;
  }

  const nativeRewardedAccess = NativeModules.NativeRewardedAccess as
    | Partial<NativeRewardedAccessModule>
    | undefined;

  if (
    !nativeRewardedAccess ||
    typeof nativeRewardedAccess.grantAccess !== 'function' ||
    typeof nativeRewardedAccess.getAccessGrantedAtMs !== 'function' ||
    typeof nativeRewardedAccess.hasActiveAccess !== 'function'
  ) {
    return null;
  }

  return nativeRewardedAccess as NativeRewardedAccessModule;
}

function createRewardedModeAccessRecord(
  grantedAtMs: number,
): Required<RewardedModeAccessRecord> {
  return {
    version: REWARDED_MODE_ACCESS_RECORD_VERSION,
    grantedAtMs,
    expiresAtMs: grantedAtMs + REWARDED_MODE_ACCESS_DURATION_MS,
    maxSeenWallMs: grantedAtMs,
  };
}

function getLegacyGrantedAtMs(value: unknown) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const legacyRecord = value as LegacyRewardedModeAccessRecord;
  const grantedAtMsValues = Array.from(rewardedModeIds)
    .map(modeId => legacyRecord[modeId])
    .filter(isFiniteNumber);

  return grantedAtMsValues.length > 0
    ? Math.max(...grantedAtMsValues)
    : null;
}

function normalizeRewardedModeAccessRecord(
  value: unknown,
): RewardedModeAccessRecord | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as RewardedModeAccessRecord;
  if (isFiniteNumber(record.grantedAtMs)) {
    return {
      version: record.version,
      grantedAtMs: record.grantedAtMs,
      expiresAtMs: isFiniteNumber(record.expiresAtMs)
        ? record.expiresAtMs
        : record.grantedAtMs + REWARDED_MODE_ACCESS_DURATION_MS,
      maxSeenWallMs: isFiniteNumber(record.maxSeenWallMs)
        ? record.maxSeenWallMs
        : record.grantedAtMs,
    };
  }

  const legacyGrantedAtMs = getLegacyGrantedAtMs(value);
  return legacyGrantedAtMs === null
    ? null
    : createRewardedModeAccessRecord(legacyGrantedAtMs);
}

function hasActiveRewardedModeAccessRecord(
  modeId: TimerModeId,
  record: RewardedModeAccessRecord,
  nowMs = Date.now(),
) {
  if (!modeRequiresRewardedAd(modeId)) {
    return true;
  }

  if (
    !isFiniteNumber(record.grantedAtMs) ||
    !isFiniteNumber(record.expiresAtMs)
  ) {
    return false;
  }

  if (
    record.expiresAtMs <= record.grantedAtMs ||
    record.expiresAtMs >
      record.grantedAtMs + REWARDED_MODE_ACCESS_DURATION_MS
  ) {
    return false;
  }

  if (
    isFiniteNumber(record.maxSeenWallMs) &&
    record.maxSeenWallMs >
      nowMs + REWARDED_MODE_ACCESS_CLOCK_ROLLBACK_GRACE_MS
  ) {
    return false;
  }

  return (
    nowMs < record.expiresAtMs &&
    hasActiveRewardedModeAccess(modeId, record.grantedAtMs, nowMs)
  );
}

async function readAccessRecord() {
  const raw = await AsyncStorage.getItem(REWARDED_MODE_ACCESS_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    const record = normalizeRewardedModeAccessRecord(parsed);
    if (!record) {
      await AsyncStorage.removeItem(REWARDED_MODE_ACCESS_STORAGE_KEY);
      return {};
    }

    return record;
  } catch {
    await AsyncStorage.removeItem(REWARDED_MODE_ACCESS_STORAGE_KEY);
    return {};
  }
}

async function writeFallbackAccessRecord(grantedAtMs: number) {
  await AsyncStorage.setItem(
    REWARDED_MODE_ACCESS_STORAGE_KEY,
    JSON.stringify(createRewardedModeAccessRecord(grantedAtMs)),
  );
}

async function updateFallbackMaxSeenWallMs(
  record: RewardedModeAccessRecord,
  nowMs: number,
) {
  if (!isFiniteNumber(record.grantedAtMs)) {
    return;
  }

  const maxSeenWallMs = isFiniteNumber(record.maxSeenWallMs)
    ? record.maxSeenWallMs
    : record.grantedAtMs;

  if (nowMs <= maxSeenWallMs) {
    return;
  }

  await AsyncStorage.setItem(
    REWARDED_MODE_ACCESS_STORAGE_KEY,
    JSON.stringify({
      ...createRewardedModeAccessRecord(record.grantedAtMs),
      maxSeenWallMs: nowMs,
    }),
  );
}

async function migrateFallbackAccessToNative(
  nativeRewardedAccess: NativeRewardedAccessModule,
  nowMs: number,
) {
  const fallbackRecord = await readAccessRecord();
  if (
    !hasActiveRewardedModeAccessRecord(
      REWARDED_MODE_ACCESS_PROBE_MODE_ID,
      fallbackRecord,
      nowMs,
    )
  ) {
    return false;
  }

  await nativeRewardedAccess.grantAccess();
  await AsyncStorage.removeItem(REWARDED_MODE_ACCESS_STORAGE_KEY);
  return true;
}

export function createRewardedModeAccessRepository(): RewardedModeAccessRepository {
  return {
    async getAccessGrantedAtMs() {
      const nativeRewardedAccess = getNativeRewardedAccess();
      if (nativeRewardedAccess) {
        const nativeGrantedAtMs =
          await nativeRewardedAccess.getAccessGrantedAtMs();
        if (isFiniteNumber(nativeGrantedAtMs)) {
          return nativeGrantedAtMs;
        }

        const migrated = await migrateFallbackAccessToNative(
          nativeRewardedAccess,
          Date.now(),
        );
        return migrated ? Date.now() : null;
      }

      const record = await readAccessRecord();
      const grantedAtMs = record.grantedAtMs;

      if (
        !hasActiveRewardedModeAccessRecord(
          REWARDED_MODE_ACCESS_PROBE_MODE_ID,
          record,
        )
      ) {
        return null;
      }

      return isFiniteNumber(grantedAtMs) ? grantedAtMs : null;
    },

    async grantAccess(grantedAtMs = Date.now()) {
      const nativeRewardedAccess = getNativeRewardedAccess();
      if (nativeRewardedAccess) {
        await nativeRewardedAccess.grantAccess();
        await AsyncStorage.removeItem(REWARDED_MODE_ACCESS_STORAGE_KEY);
        return;
      }

      await writeFallbackAccessRecord(grantedAtMs);
    },

    async hasActiveAccess(modeId, nowMs = Date.now()) {
      if (!modeRequiresRewardedAd(modeId)) {
        return true;
      }

      const nativeRewardedAccess = getNativeRewardedAccess();
      if (nativeRewardedAccess) {
        if (await nativeRewardedAccess.hasActiveAccess()) {
          return true;
        }

        return migrateFallbackAccessToNative(nativeRewardedAccess, nowMs);
      }

      const record = await readAccessRecord();
      if (!hasActiveRewardedModeAccessRecord(modeId, record, nowMs)) {
        return false;
      }

      await updateFallbackMaxSeenWallMs(record, nowMs);
      return true;
    },
  };
}
