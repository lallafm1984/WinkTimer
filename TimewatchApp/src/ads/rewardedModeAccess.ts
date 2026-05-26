import AsyncStorage from '@react-native-async-storage/async-storage';
import type {TimerModeId} from '../domain/timerMode';

const REWARDED_MODE_ACCESS_STORAGE_KEY = '@winktimer:ad_rewards:v1';

export const REWARDED_MODE_ACCESS_DURATION_MS = 60 * 60 * 1000;
export const REWARDED_MODE_ACCESS_LABEL = '광고 시청 후 1시간 사용 가능';

type LegacyRewardedModeAccessRecord = Partial<Record<TimerModeId, number>>;
type RewardedModeAccessRecord = {
  grantedAtMs?: number;
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

  if (typeof grantedAtMs !== 'number' || !Number.isFinite(grantedAtMs)) {
    return false;
  }

  return nowMs - grantedAtMs < REWARDED_MODE_ACCESS_DURATION_MS;
}

function isRewardedModeAccessRecord(
  value: unknown,
): value is RewardedModeAccessRecord {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const record = value as RewardedModeAccessRecord;

  return (
    record.grantedAtMs === undefined ||
    (typeof record.grantedAtMs === 'number' &&
      Number.isFinite(record.grantedAtMs))
  );
}

function getLegacyGrantedAtMs(value: unknown) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const legacyRecord = value as LegacyRewardedModeAccessRecord;
  const grantedAtMsValues = Array.from(rewardedModeIds)
    .map(modeId => legacyRecord[modeId])
    .filter(
      (grantedAtMs): grantedAtMs is number =>
        typeof grantedAtMs === 'number' && Number.isFinite(grantedAtMs),
    );

  return grantedAtMsValues.length > 0
    ? Math.max(...grantedAtMsValues)
    : null;
}

async function readAccessRecord() {
  const raw = await AsyncStorage.getItem(REWARDED_MODE_ACCESS_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    if (!isRewardedModeAccessRecord(parsed)) {
      const legacyGrantedAtMs = getLegacyGrantedAtMs(parsed);
      if (legacyGrantedAtMs !== null) {
        return {grantedAtMs: legacyGrantedAtMs};
      }

      await AsyncStorage.removeItem(REWARDED_MODE_ACCESS_STORAGE_KEY);
      return {};
    }

    return parsed;
  } catch {
    await AsyncStorage.removeItem(REWARDED_MODE_ACCESS_STORAGE_KEY);
    return {};
  }
}

export function createRewardedModeAccessRepository(): RewardedModeAccessRepository {
  return {
    async getAccessGrantedAtMs() {
      const record = await readAccessRecord();
      const grantedAtMs = record.grantedAtMs;

      return typeof grantedAtMs === 'number' ? grantedAtMs : null;
    },

    async grantAccess(grantedAtMs = Date.now()) {
      await AsyncStorage.setItem(
        REWARDED_MODE_ACCESS_STORAGE_KEY,
        JSON.stringify({grantedAtMs}),
      );
    },

    async hasActiveAccess(modeId, nowMs = Date.now()) {
      const grantedAtMs = await this.getAccessGrantedAtMs();

      return hasActiveRewardedModeAccess(modeId, grantedAtMs, nowMs);
    },
  };
}
