import AsyncStorage from '@react-native-async-storage/async-storage';
import type {TimerModeId} from '../../domain/timerMode';
import {
  REWARDED_MODE_ACCESS_DURATION_MS,
  createRewardedModeAccessRepository,
  hasActiveRewardedModeAccess,
  modeRequiresRewardedAd,
} from '../rewardedModeAccess';

describe('rewardedModeAccess', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('requires ads only for camera-assisted premium modes', () => {
    const freeModes: TimerModeId[] = ['basicTimer', 'flipTimer'];
    const rewardedModes: TimerModeId[] = [
      'lookPause',
      'winkControl',
      'smileMode',
    ];

    expect(freeModes.map(modeRequiresRewardedAd)).toEqual([false, false]);
    expect(rewardedModes.map(modeRequiresRewardedAd)).toEqual([
      true,
      true,
      true,
    ]);
  });

  it('keeps rewarded access active for one hour from the recorded watch time', () => {
    const watchedAtMs = 10_000;

    expect(
      hasActiveRewardedModeAccess('lookPause', watchedAtMs, watchedAtMs),
    ).toBe(true);
    expect(
      hasActiveRewardedModeAccess(
        'lookPause',
        watchedAtMs,
        watchedAtMs + REWARDED_MODE_ACCESS_DURATION_MS - 1,
      ),
    ).toBe(true);
    expect(
      hasActiveRewardedModeAccess(
        'lookPause',
        watchedAtMs,
        watchedAtMs + REWARDED_MODE_ACCESS_DURATION_MS,
      ),
    ).toBe(false);
  });

  it('records rewarded access once for all rewarded modes in local storage', async () => {
    const repository = createRewardedModeAccessRepository();
    const watchedAtMs = 3_600_000;

    await repository.grantAccess(watchedAtMs);

    await expect(
      repository.hasActiveAccess('winkControl', watchedAtMs + 30_000),
    ).resolves.toBe(true);
    await expect(
      repository.hasActiveAccess('lookPause', watchedAtMs + 30_000),
    ).resolves.toBe(true);
    await expect(
      repository.hasActiveAccess('smileMode', watchedAtMs + 30_000),
    ).resolves.toBe(true);
  });

  it('clears corrupt local rewarded access records', async () => {
    const repository = createRewardedModeAccessRepository();

    await AsyncStorage.setItem('@winktimer:ad_rewards:v1', 'not-json');

    await expect(repository.getAccessGrantedAtMs()).resolves.toBe(null);
    await expect(
      AsyncStorage.getItem('@winktimer:ad_rewards:v1'),
    ).resolves.toBeNull();
  });
});
