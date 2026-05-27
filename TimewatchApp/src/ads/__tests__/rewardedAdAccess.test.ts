import {AdEventType, RewardedAdEventType} from 'react-native-google-mobile-ads';
import {
  getAdDiagnosticLogText,
  getAdDiagnosticLogEntries,
  resetAdDiagnosticLogsForTests,
} from '../adDiagnosticLog';
import {
  RewardedAdAccessError,
  isRewardedAdNoFillError,
  showRewardedAdForAccess,
  type RewardedAdForAccess,
} from '../rewardedAdAccess';

type FakeRewardedAd = RewardedAdForAccess & {
  emit(type: string, payload?: unknown): void;
};

function createFakeRewardedAd(): FakeRewardedAd {
  const listeners = new Map<string, Set<(payload?: unknown) => void>>();

  return {
    addAdEventListener: jest.fn((type, listener) => {
      const eventListeners = listeners.get(type) ?? new Set();
      eventListeners.add(listener);
      listeners.set(type, eventListeners);

      return () => {
        eventListeners.delete(listener);
      };
    }),
    load: jest.fn(),
    show: jest.fn(async () => undefined),
    emit(type, payload) {
      listeners.get(type)?.forEach(listener => listener(payload));
    },
  };
}

describe('rewardedAdAccess', () => {
  beforeEach(() => {
    resetAdDiagnosticLogsForTests();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    resetAdDiagnosticLogsForTests();
    jest.restoreAllMocks();
  });

  it('loads and shows a rewarded ad before resolving after the reward is earned and closed', async () => {
    const rewardedAd = createFakeRewardedAd();
    const promise = showRewardedAdForAccess({
      createRewardedAd: () => rewardedAd,
      timeoutMs: 1000,
    });

    expect(rewardedAd.load).toHaveBeenCalledTimes(1);

    rewardedAd.emit(RewardedAdEventType.LOADED);
    await Promise.resolve();

    expect(rewardedAd.show).toHaveBeenCalledTimes(1);

    rewardedAd.emit(RewardedAdEventType.EARNED_REWARD, {
      amount: 1,
      type: 'access',
    });
    rewardedAd.emit(AdEventType.CLOSED);

    await expect(promise).resolves.toBeUndefined();
  });

  it('rejects when the ad is closed before a reward is earned', async () => {
    const rewardedAd = createFakeRewardedAd();
    const promise = showRewardedAdForAccess({
      createRewardedAd: () => rewardedAd,
      timeoutMs: 1000,
    });

    rewardedAd.emit(RewardedAdEventType.LOADED);
    await Promise.resolve();
    rewardedAd.emit(AdEventType.CLOSED);

    await expect(promise).rejects.toBeInstanceOf(RewardedAdAccessError);
  });

  it('rejects when the ad fails to load', async () => {
    const rewardedAd = createFakeRewardedAd();
    const promise = showRewardedAdForAccess({
      createRewardedAd: () => rewardedAd,
      timeoutMs: 1000,
    });

    rewardedAd.emit(AdEventType.ERROR, {
      code: 'googleMobileAds/no-fill',
      message: '[googleMobileAds/no-fill] No fill',
      userInfo: {code: 'no-fill', message: 'No fill'},
    });

    await expect(promise).rejects.toBeInstanceOf(RewardedAdAccessError);
    expect(getAdDiagnosticLogText(getAdDiagnosticLogEntries())).toContain(
      'rewarded.load_error code=googleMobileAds/no-fill',
    );
  });

  it('marks no-fill load errors so callers can allow temporary use without granting access', async () => {
    const rewardedAd = createFakeRewardedAd();
    const promise = showRewardedAdForAccess({
      createRewardedAd: () => rewardedAd,
      timeoutMs: 1000,
    });

    rewardedAd.emit(AdEventType.ERROR, {
      code: 'googleMobileAds/no-fill',
      message: '[googleMobileAds/no-fill] No fill',
      userInfo: {code: 'no-fill', message: 'No fill'},
    });

    await expect(promise).rejects.toMatchObject({
      reason: 'no-fill',
      payload: expect.objectContaining({
        code: 'googleMobileAds/no-fill',
      }),
    });

    await promise.catch(error => {
      expect(isRewardedAdNoFillError(error)).toBe(true);
    });
  });
});
