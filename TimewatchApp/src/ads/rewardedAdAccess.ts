import {
  AdEventType,
  RewardedAd,
  RewardedAdEventType,
} from 'react-native-google-mobile-ads';
import {getRewardedAdUnitId} from './adMobConfig';

type RewardedAdAccessEventType = AdEventType | RewardedAdEventType;
type RewardedAdAccessListener = (payload?: unknown) => void;

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
  constructor(message: string) {
    super(message);
    this.name = 'RewardedAdAccessError';
  }
}

function createRewardedAdForAccess() {
  return RewardedAd.createForAdRequest(getRewardedAdUnitId(), {
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
      rejectWithError('광고를 불러오지 못했습니다. 다시 시도해 주세요.');
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

    const rejectWithError = (message: string) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      reject(new RewardedAdAccessError(message));
    };

    unsubscribeCallbacks.push(
      rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
        rewardedAd.show().catch(() => {
          rejectWithError('광고를 표시하지 못했습니다. 다시 시도해 주세요.');
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

        rejectWithError('광고 시청이 완료되지 않았습니다.');
      }),
      rewardedAd.addAdEventListener(AdEventType.ERROR, () => {
        rejectWithError('광고를 불러오지 못했습니다. 다시 시도해 주세요.');
      }),
    );

    rewardedAd.load();
  });
}
