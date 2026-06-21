import AsyncStorage from '@react-native-async-storage/async-storage';
import analytics from '@react-native-firebase/analytics';
import {AdEventType} from 'react-native-google-mobile-ads';
import {resetAdDiagnosticLogsForTests} from '../adDiagnosticLog';
import {
  INTERSTITIAL_AD_COOLDOWN_MS,
  createInterstitialAdFrequencyRepository,
  createModeSelectionInterstitialGraceRepository,
  getInterstitialAdDateKey,
  initializeModeSelectionInterstitialGrace,
  type InterstitialAdFrequencySnapshot,
  showAlarmStopInterstitialIfEligible,
  showModeSelectionInterstitialIfEligible,
  showSettingsEntryInterstitialIfEligible,
  showInterstitialAd,
  shouldShowSettingsEntryInterstitialAd,
  shouldShowInterstitialAd,
  type InterstitialAdForDisplay,
  type InterstitialAdFrequencyRepository,
  type ModeSelectionInterstitialGraceRepository,
} from '../interstitialAd';

type FakeInterstitialAd = InterstitialAdForDisplay & {
  emit(type: string, payload?: unknown): void;
};

function createFakeInterstitialAd(): FakeInterstitialAd {
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

function createFrequencyRepository(
  snapshot: InterstitialAdFrequencySnapshot,
): InterstitialAdFrequencyRepository {
  return {
    getFrequencySnapshot: jest.fn(async () => snapshot),
    recordShown: jest.fn(async () => undefined),
  };
}

function createModeSelectionGraceRepository(
  firstSeenAtMs: number,
  existingUserModeSelectionSkipsRemaining = 0,
): ModeSelectionInterstitialGraceRepository {
  let state = {
    firstSeenAtMs,
    existingUserModeSelectionSkipsRemaining,
  };

  return {
    getOrCreateState: jest.fn(async () => state),
    consumeExistingUserModeSelectionSkip: jest.fn(async () => {
      state = {
        ...state,
        existingUserModeSelectionSkipsRemaining: Math.max(
          0,
          state.existingUserModeSelectionSkipsRemaining - 1,
        ),
      };
      return state.existingUserModeSelectionSkipsRemaining;
    }),
  };
}

function createFrequencySnapshot(
  partial: Partial<InterstitialAdFrequencySnapshot> = {},
): InterstitialAdFrequencySnapshot {
  return {
    lastShownAtMs: null,
    dailyShownCount: 0,
    shownDateKey: '2026-05-28',
    ...partial,
  };
}

describe('interstitialAd', () => {
  const mockedAnalytics = analytics as unknown as jest.Mock;
  let logEvent: jest.Mock<Promise<void>, [string, Record<string, unknown>]>;

  beforeEach(async () => {
    logEvent = jest
      .fn<Promise<void>, [string, Record<string, unknown>]>()
      .mockResolvedValue(undefined);
    mockedAnalytics.mockReturnValue({logEvent});
    resetAdDiagnosticLogsForTests();
    await AsyncStorage.clear();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    resetAdDiagnosticLogsForTests();
    jest.restoreAllMocks();
  });

  it('allows alarm-stop interstitials only once every three hours', () => {
    const shownAtMs = 10_000;
    const snapshot = createFrequencySnapshot({lastShownAtMs: shownAtMs});

    expect(
      shouldShowInterstitialAd(
        createFrequencySnapshot({lastShownAtMs: null}),
        undefined,
        shownAtMs,
      ),
    ).toBe(true);
    expect(shouldShowInterstitialAd(snapshot, undefined, shownAtMs)).toBe(
      false,
    );
    expect(
      shouldShowInterstitialAd(
        snapshot,
        undefined,
        shownAtMs + INTERSTITIAL_AD_COOLDOWN_MS - 1,
      ),
    ).toBe(false);
    expect(
      shouldShowInterstitialAd(
        snapshot,
        undefined,
        shownAtMs + INTERSTITIAL_AD_COOLDOWN_MS,
      ),
    ).toBe(true);
  });

  it('skips alarm-stop interstitials when remote config disables them', () => {
    expect(
      shouldShowInterstitialAd(
        createFrequencySnapshot(),
        {
          enabled: false,
          dailyCap: 3,
          cooldownMs: INTERSTITIAL_AD_COOLDOWN_MS,
        },
        1_000,
      ),
    ).toBe(false);
  });

  it('skips alarm-stop interstitials after the daily remote cap is reached', () => {
    expect(
      shouldShowInterstitialAd(
        createFrequencySnapshot({dailyShownCount: 3}),
        {
          enabled: true,
          dailyCap: 3,
          cooldownMs: INTERSTITIAL_AD_COOLDOWN_MS,
        },
        1_000,
      ),
    ).toBe(false);
  });

  it('skips settings-entry interstitials when their remote flag is disabled', () => {
    expect(
      shouldShowSettingsEntryInterstitialAd(
        createFrequencySnapshot(),
        {
          enabled: true,
          dailyCap: 3,
          cooldownMs: INTERSTITIAL_AD_COOLDOWN_MS,
          settingsEntryEnabled: false,
          settingsCloseReviewPromptEnabled: true,
        },
        1_000,
      ),
    ).toBe(false);
  });

  it('loads and shows an interstitial before resolving after it closes', async () => {
    const interstitialAd = createFakeInterstitialAd();
    const promise = showInterstitialAd({
      createInterstitialAd: () => interstitialAd,
      timeoutMs: 1000,
    });

    expect(interstitialAd.load).toHaveBeenCalledTimes(1);

    interstitialAd.emit(AdEventType.LOADED);
    await Promise.resolve();

    expect(interstitialAd.show).toHaveBeenCalledTimes(1);

    interstitialAd.emit(AdEventType.CLOSED);

    await expect(promise).resolves.toBeUndefined();
  });

  it('does not time out after an interstitial loads while waiting for the user to close it', async () => {
    jest.useFakeTimers();
    const interstitialAd = createFakeInterstitialAd();
    const promise = showInterstitialAd({
      createInterstitialAd: () => interstitialAd,
      timeoutMs: 1000,
    }).then(
      () => 'resolved',
      error => `rejected:${String(error?.message ?? error)}`,
    );

    interstitialAd.emit(AdEventType.LOADED);
    await Promise.resolve();
    jest.advanceTimersByTime(1000);
    await Promise.resolve();
    interstitialAd.emit(AdEventType.CLOSED);

    await expect(promise).resolves.toBe('resolved');
  });

  it('records alarm-stop exposure only after an eligible ad is shown', async () => {
    const shownAtMs = 1_000_000;
    const repository = createFrequencyRepository(createFrequencySnapshot());
    const showAd = jest.fn(async () => undefined);

    await expect(
      showAlarmStopInterstitialIfEligible({
        nowMs: shownAtMs,
        repository,
        showAd,
      }),
    ).resolves.toBe(true);

    expect(showAd).toHaveBeenCalledTimes(1);
    expect(repository.recordShown).toHaveBeenCalledWith(shownAtMs);
    expect(logEvent).toHaveBeenCalledWith('wt_interstitial_show_result', {
      placement: 'alarm_stop',
      result: 'shown',
    });
  });

  it('records skipped and failed mode-selection interstitial show results', async () => {
    const nowMs = 1_000_000;
    const skippedRepository = createFrequencyRepository(
      createFrequencySnapshot(),
    );
    const skippedGraceRepository = createModeSelectionGraceRepository(nowMs, 1);
    const skippedShowAd = jest.fn(async () => undefined);

    await expect(
      showModeSelectionInterstitialIfEligible({
        nowMs,
        repository: skippedRepository,
        graceRepository: skippedGraceRepository,
        showAd: skippedShowAd,
      }),
    ).resolves.toBe(false);

    expect(skippedShowAd).not.toHaveBeenCalled();
    expect(logEvent).toHaveBeenCalledWith('wt_interstitial_show_result', {
      placement: 'mode_selection',
      result: 'skipped',
    });

    const loadError = new Error('interstitial failed');

    await expect(
      showModeSelectionInterstitialIfEligible({
        nowMs,
        repository: createFrequencyRepository(createFrequencySnapshot()),
        graceRepository: createModeSelectionGraceRepository(nowMs),
        showAd: jest.fn(async () => {
          throw loadError;
        }),
        getPolicy: () => ({
          enabled: true,
          dailyCap: 3,
          cooldownMs: 0,
          modeSelectionGraceMs: 0,
          settingsEntryEnabled: true,
          settingsCloseReviewPromptEnabled: true,
        }),
      }),
    ).rejects.toThrow(loadError);

    expect(logEvent).toHaveBeenCalledWith('wt_interstitial_show_result', {
      placement: 'mode_selection',
      result: 'error',
    });
  });

  it('records settings-entry exposure only after an eligible ad is shown', async () => {
    const shownAtMs = 1_000_000;
    const repository = createFrequencyRepository(createFrequencySnapshot());
    const showAd = jest.fn(async () => undefined);

    await expect(
      showSettingsEntryInterstitialIfEligible({
        nowMs: shownAtMs,
        repository,
        showAd,
      }),
    ).resolves.toBe(true);

    expect(showAd).toHaveBeenCalledTimes(1);
    expect(repository.recordShown).toHaveBeenCalledWith(shownAtMs);
  });

  it('uses the remote-config cooldown policy for mode-selection interstitials', async () => {
    const shownAtMs = 1_000_000;
    const twelveHoursMs = 12 * 60 * 60 * 1000;
    const policy = {
      enabled: true,
      dailyCap: 3,
      cooldownMs: twelveHoursMs,
      modeSelectionGraceMs: 0,
      settingsEntryEnabled: true,
      settingsCloseReviewPromptEnabled: true,
    };
    const repositoryDuringCooldown = createFrequencyRepository(
      createFrequencySnapshot({lastShownAtMs: shownAtMs}),
    );
    const skippedShowAd = jest.fn(async () => undefined);

    await expect(
      showModeSelectionInterstitialIfEligible({
        nowMs: shownAtMs + twelveHoursMs - 1,
        repository: repositoryDuringCooldown,
        showAd: skippedShowAd,
        getPolicy: () => policy,
      }),
    ).resolves.toBe(false);

    expect(skippedShowAd).not.toHaveBeenCalled();
    expect(repositoryDuringCooldown.recordShown).not.toHaveBeenCalled();

    const repositoryAfterCooldown = createFrequencyRepository(
      createFrequencySnapshot({lastShownAtMs: shownAtMs}),
    );
    const shownShowAd = jest.fn(async () => undefined);

    await expect(
      showModeSelectionInterstitialIfEligible({
        nowMs: shownAtMs + twelveHoursMs,
        repository: repositoryAfterCooldown,
        showAd: shownShowAd,
        getPolicy: () => policy,
      }),
    ).resolves.toBe(true);

    expect(shownShowAd).toHaveBeenCalledTimes(1);
    expect(repositoryAfterCooldown.recordShown).toHaveBeenCalledWith(
      shownAtMs + twelveHoursMs,
    );
  });

  it('skips mode-selection interstitials during the remote-config grace period', async () => {
    const firstSeenAtMs = 1_000_000;
    const graceMs = 3 * 60 * 1000;
    const nowMs = firstSeenAtMs + graceMs - 1;
    const repository = createFrequencyRepository(createFrequencySnapshot());
    const graceRepository = createModeSelectionGraceRepository(firstSeenAtMs);
    const showAd = jest.fn(async () => undefined);

    await expect(
      showModeSelectionInterstitialIfEligible({
        nowMs,
        repository,
        graceRepository,
        showAd,
        getPolicy: () => ({
          enabled: true,
          dailyCap: 3,
          cooldownMs: INTERSTITIAL_AD_COOLDOWN_MS,
          modeSelectionGraceMs: graceMs,
          settingsEntryEnabled: true,
          settingsCloseReviewPromptEnabled: true,
        }),
      }),
    ).resolves.toBe(false);

    expect(showAd).not.toHaveBeenCalled();
    expect(repository.recordShown).not.toHaveBeenCalled();
  });

  it('shows mode-selection interstitials after the remote-config grace period', async () => {
    const firstSeenAtMs = 1_000_000;
    const graceMs = 3 * 60 * 1000;
    const nowMs = firstSeenAtMs + graceMs;
    const repository = createFrequencyRepository(createFrequencySnapshot());
    const graceRepository = createModeSelectionGraceRepository(firstSeenAtMs);
    const showAd = jest.fn(async () => undefined);

    await expect(
      showModeSelectionInterstitialIfEligible({
        nowMs,
        repository,
        graceRepository,
        showAd,
        getPolicy: () => ({
          enabled: true,
          dailyCap: 3,
          cooldownMs: INTERSTITIAL_AD_COOLDOWN_MS,
          modeSelectionGraceMs: graceMs,
          settingsEntryEnabled: true,
          settingsCloseReviewPromptEnabled: true,
        }),
      }),
    ).resolves.toBe(true);

    expect(showAd).toHaveBeenCalledTimes(1);
    expect(repository.recordShown).toHaveBeenCalledWith(nowMs);
  });

  it('skips the first two mode-selection interstitials for existing users after migration', async () => {
    const firstSeenAtMs = 1_000_000;
    const graceRepository = createModeSelectionGraceRepository(
      firstSeenAtMs,
      2,
    );
    const repository = createFrequencyRepository(createFrequencySnapshot());
    const showAd = jest.fn(async () => undefined);
    const getPolicy = () => ({
      enabled: true,
      dailyCap: 3,
      cooldownMs: 0,
      modeSelectionGraceMs: 0,
      settingsEntryEnabled: true,
      settingsCloseReviewPromptEnabled: true,
    });

    await expect(
      showModeSelectionInterstitialIfEligible({
        nowMs: firstSeenAtMs,
        repository,
        graceRepository,
        showAd,
        getPolicy,
      }),
    ).resolves.toBe(false);
    await expect(
      showModeSelectionInterstitialIfEligible({
        nowMs: firstSeenAtMs + 1,
        repository,
        graceRepository,
        showAd,
        getPolicy,
      }),
    ).resolves.toBe(false);
    await expect(
      showModeSelectionInterstitialIfEligible({
        nowMs: firstSeenAtMs + 2,
        repository,
        graceRepository,
        showAd,
        getPolicy,
      }),
    ).resolves.toBe(true);

    expect(showAd).toHaveBeenCalledTimes(1);
    expect(repository.recordShown).toHaveBeenCalledWith(firstSeenAtMs + 2);
    expect(
      graceRepository.consumeExistingUserModeSelectionSkip,
    ).toHaveBeenCalledTimes(2);
  });

  it('skips alarm-stop exposure while the three-hour cooldown is active', async () => {
    const shownAtMs = 1_000_000;
    const repository = createFrequencyRepository(
      createFrequencySnapshot({lastShownAtMs: shownAtMs}),
    );
    const showAd = jest.fn(async () => undefined);

    await expect(
      showAlarmStopInterstitialIfEligible({
        nowMs: shownAtMs + INTERSTITIAL_AD_COOLDOWN_MS - 1,
        repository,
        showAd,
      }),
    ).resolves.toBe(false);

    expect(showAd).not.toHaveBeenCalled();
    expect(repository.recordShown).not.toHaveBeenCalled();
  });

  it('skips alarm-stop exposure when the daily cap is already reached', async () => {
    const shownAtMs = 1_000_000;
    const repository = createFrequencyRepository(
      createFrequencySnapshot({dailyShownCount: 3}),
    );
    const showAd = jest.fn(async () => undefined);

    await expect(
      showAlarmStopInterstitialIfEligible({
        nowMs: shownAtMs,
        repository,
        showAd,
      }),
    ).resolves.toBe(false);

    expect(showAd).not.toHaveBeenCalled();
    expect(repository.recordShown).not.toHaveBeenCalled();
  });

  it('stores daily exposure counts by local date', async () => {
    const repository = createInterstitialAdFrequencyRepository();
    const firstShownAtMs = new Date(2026, 4, 28, 9, 0, 0).getTime();
    const secondShownAtMs = new Date(2026, 4, 28, 12, 30, 0).getTime();
    const nextDayMs = new Date(2026, 4, 29, 9, 0, 0).getTime();

    await repository.recordShown(firstShownAtMs);
    await repository.recordShown(secondShownAtMs);

    await expect(
      repository.getFrequencySnapshot(secondShownAtMs),
    ).resolves.toEqual({
      lastShownAtMs: secondShownAtMs,
      dailyShownCount: 2,
      shownDateKey: getInterstitialAdDateKey(secondShownAtMs),
    });

    await expect(repository.getFrequencySnapshot(nextDayMs)).resolves.toEqual({
      lastShownAtMs: secondShownAtMs,
      dailyShownCount: 0,
      shownDateKey: getInterstitialAdDateKey(nextDayMs),
    });
  });

  it('stores the first app launch timestamp for mode-selection grace without resetting it', async () => {
    const firstSeenAtMs = 1_000_000;
    const laterLaunchAtMs = firstSeenAtMs + 10 * 60 * 1000;
    const repository = createModeSelectionInterstitialGraceRepository();

    await expect(
      initializeModeSelectionInterstitialGrace({
        nowMs: firstSeenAtMs,
        graceRepository: repository,
      }),
    ).resolves.toBe(firstSeenAtMs);

    await expect(
      initializeModeSelectionInterstitialGrace({
        nowMs: laterLaunchAtMs,
        graceRepository: repository,
      }),
    ).resolves.toBe(firstSeenAtMs);

    await expect(
      repository.getOrCreateState(laterLaunchAtMs),
    ).resolves.toEqual({
      firstSeenAtMs,
      existingUserModeSelectionSkipsRemaining: 0,
    });
  });

  it('initializes existing users with two mode-selection interstitial skips', async () => {
    const firstSeenAtMs = 1_000_000;
    const repository = createModeSelectionInterstitialGraceRepository();

    await AsyncStorage.setItem('@winktimer:settings:v1', JSON.stringify({}));

    await expect(
      initializeModeSelectionInterstitialGrace({
        nowMs: firstSeenAtMs,
        graceRepository: repository,
      }),
    ).resolves.toBe(firstSeenAtMs);

    await expect(repository.getOrCreateState(firstSeenAtMs)).resolves.toEqual({
      firstSeenAtMs,
      existingUserModeSelectionSkipsRemaining: 2,
    });
  });

  it('does not add existing-user mode-selection skips for fresh installs', async () => {
    const firstSeenAtMs = 1_000_000;
    const repository = createModeSelectionInterstitialGraceRepository();

    await expect(
      initializeModeSelectionInterstitialGrace({
        nowMs: firstSeenAtMs,
        graceRepository: repository,
      }),
    ).resolves.toBe(firstSeenAtMs);

    await expect(repository.getOrCreateState(firstSeenAtMs)).resolves.toEqual({
      firstSeenAtMs,
      existingUserModeSelectionSkipsRemaining: 0,
    });
  });

  it('migrates an existing first-seen record with legacy user mode-selection skips', async () => {
    const firstSeenAtMs = 1_000_000;
    const repository = createModeSelectionInterstitialGraceRepository();

    await AsyncStorage.setItem('@winktimer:settings:v1', JSON.stringify({}));
    await AsyncStorage.setItem(
      '@winktimer:mode_selection_interstitial_grace:v1',
      JSON.stringify({version: 1, firstSeenAtMs}),
    );

    await expect(repository.getOrCreateState(firstSeenAtMs)).resolves.toEqual({
      firstSeenAtMs,
      existingUserModeSelectionSkipsRemaining: 2,
    });
  });
});
