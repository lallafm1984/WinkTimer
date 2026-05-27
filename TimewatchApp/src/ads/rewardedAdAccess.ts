import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import {getRewardedAdUnitId} from './adMobConfig';
import {recordAdDiagnosticLog} from './adDiagnosticLog';

type RewardedAdAccessEventType = AdEventType | RewardedAdEventType;
type RewardedAdAccessListener = (payload?: unknown) => void;
export type RewardedAdAccessErrorReason =
  | 'closed-without-reward'
  | 'load-error'
  | 'no-fill'
  | 'show-error'
  | 'timeout';

export type RewardedAdForAccess = {
  addAdEventListener(
    type: RewardedAdAccessEventType,
    listener: RewardedAdAccessListener,
  ): () => void;
  load(): void;
  show(): Promise<void>;
};

export type RewardedAdAccessOptions = {
  createRewardedAd?: () => RewardedAdForAccess;
  timeoutMs?: number;
};

export class RewardedAdAccessError extends Error {
  readonly payload?: unknown;
  readonly reason: RewardedAdAccessErrorReason;

  constructor(
    message: string,
    reason: RewardedAdAccessErrorReason,
    payload?: unknown,
  ) {
    super(message);
    this.name = 'RewardedAdAccessError';
    this.reason = reason;
    this.payload = payload;
  }
}

function getObjectField(value: unknown, key: string) {
  if (value === null || typeof value !== 'object') {
    return undefined;
  }

  return (value as Record<string, unknown>)[key];
}

function getLowercaseText(value: unknown) {
  return typeof value === 'string' ? value.toLowerCase() : '';
}

function includesNoFill(value: unknown) {
  const text = getLowercaseText(value);
  return text.includes('no-fill') || text.includes('no fill');
}

function isNoFillAdErrorPayload(payload: unknown) {
  const userInfo = getObjectField(payload, 'userInfo');

  return [
    getObjectField(payload, 'code'),
    getObjectField(payload, 'message'),
    getObjectField(userInfo, 'code'),
    getObjectField(userInfo, 'message'),
  ].some(includesNoFill);
}

export function isRewardedAdNoFillError(error: unknown) {
  return (
    error !== null &&
    typeof error === 'object' &&
    (error as {reason?: unknown}).reason === 'no-fill'
  );
}

function createRewardedAdForAccess() {
  const adUnitId = getRewardedAdUnitId();
  recordAdDiagnosticLog('rewarded.create_request', {adUnitId});

  return RewardedAd.createForAdRequest(adUnitId, {
    requestNonPersonalizedAdsOnly: true,
  });
}

export function showRewardedAdForAccess({
  createRewardedAd = createRewardedAdForAccess,
  timeoutMs = 30_000,
}: RewardedAdAccessOptions = {}) {
  const rewardedAd = createRewardedAd();

  return new Promise<void>((resolve, reject) => {
    let rewardEarned = false;
    let settled = false;
    const unsubscribeCallbacks: Array<() => void> = [];

    const timeoutId = setTimeout(() => {
      rejectWithError(
        '광고를 불러오지 못했습니다. 다시 시도해 주세요.',
        'timeout',
      );
    }, timeoutMs);

    const cleanup = () => {
      clearTimeout(timeoutId);
      unsubscribeCallbacks.forEach(unsubscribe => {
        unsubscribe();
      });
    };

    const resolveWithReward = () => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      resolve();
    };

    const rejectWithError = (
      message: string,
      reason: RewardedAdAccessErrorReason,
      payload?: unknown,
    ) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new RewardedAdAccessError(message, reason, payload));
    };

    unsubscribeCallbacks.push(
      rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        recordAdDiagnosticLog('rewarded.loaded');
        rewardedAd.show().catch(error => {
          recordAdDiagnosticLog('rewarded.show_error', error);
          rejectWithError(
            '광고를 표시하지 못했습니다. 다시 시도해 주세요.',
            'show-error',
            error,
          );
        });
      }),
      rewardedAd.addAdEventListener(RewardedAdEventType.EARNED_REWARD, () => {
        rewardEarned = true;
      }),
      rewardedAd.addAdEventListener(AdEventType.CLOSED, () => {
        if (rewardEarned) {
          resolveWithReward();
          return;
        }

        rejectWithError(
          '광고 시청이 완료되지 않았습니다.',
          'closed-without-reward',
        );
      }),
      rewardedAd.addAdEventListener(AdEventType.ERROR, error => {
        recordAdDiagnosticLog('rewarded.load_error', error);
        rejectWithError(
          '광고를 불러오지 못했습니다. 다시 시도해 주세요.',
          isNoFillAdErrorPayload(error) ? 'no-fill' : 'load-error',
          error,
        );
      }),
    );

    recordAdDiagnosticLog('rewarded.load_request');
    rewardedAd.load();
  });
}
