import AsyncStorage from '@react-native-async-storage/async-storage';
import {NativeModules, Platform} from 'react-native';
import type {TimerModeId} from '../../domain/timerMode';
import {
  REWARDED_MODE_ACCESS_CLOCK_ROLLBACK_GRACE_MS,
  REWARDED_MODE_ACCESS_DURATION_MS,
  createRewardedModeAccessRepository,
  hasActiveRewardedModeAccess,
  modeRequiresRewardedAd,
} from '../rewardedModeAccess';

const originalPlatformOS = Platform.OS;

function setPlatformOS(os: typeof Platform.OS) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: os,
  });
}

describe('rewardedModeAccess', () => {
  beforeEach(async () => {
    setPlatformOS(originalPlatformOS);
    delete (NativeModules as Record<string, unknown>).NativeRewardedAccess;
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

  it('rejects rewarded access granted too far in the future', () => {
    expect(
      hasActiveRewardedModeAccess('lookPause', 10_000_000, 10_000),
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

  it('uses Android native secure storage when the native module is available', async () => {
    setPlatformOS('android');
    const nativeRewardedAccess = {
      getAccessGrantedAtMs: jest.fn(async () => 123_000),
      grantAccess: jest.fn(async () => undefined),
      hasActiveAccess: jest.fn(async () => true),
    };
    (NativeModules as Record<string, unknown>).NativeRewardedAccess =
      nativeRewardedAccess;
    const repository = createRewardedModeAccessRepository();

    await repository.grantAccess(10_000);

    expect(nativeRewardedAccess.grantAccess).toHaveBeenCalledTimes(1);
    await expect(
      AsyncStorage.getItem('@winktimer:ad_rewards:v1'),
    ).resolves.toBeNull();
    await expect(repository.hasActiveAccess('lookPause')).resolves.toBe(true);
    expect(nativeRewardedAccess.hasActiveAccess).toHaveBeenCalledTimes(1);
  });

  it('rejects local fallback records after a large wall-clock rollback', async () => {
    const repository = createRewardedModeAccessRepository();
    const watchedAtMs = 100_000;
    const laterMs = watchedAtMs + 120_000;

    await repository.grantAccess(watchedAtMs);
    await expect(repository.hasActiveAccess('lookPause', laterMs)).resolves.toBe(
      true,
    );
    await expect(
      repository.hasActiveAccess(
        'lookPause',
        laterMs - REWARDED_MODE_ACCESS_CLOCK_ROLLBACK_GRACE_MS - 1,
      ),
    ).resolves.toBe(false);
  });

  it('rejects local fallback records with tampered extended expiry', async () => {
    const watchedAtMs = 100_000;
    const repository = createRewardedModeAccessRepository();

    await AsyncStorage.setItem(
      '@winktimer:ad_rewards:v1',
      JSON.stringify({
        version: 2,
        grantedAtMs: watchedAtMs,
        expiresAtMs: watchedAtMs + REWARDED_MODE_ACCESS_DURATION_MS + 1,
        maxSeenWallMs: watchedAtMs,
      }),
    );

    await expect(
      repository.hasActiveAccess('lookPause', watchedAtMs + 30_000),
    ).resolves.toBe(false);
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
