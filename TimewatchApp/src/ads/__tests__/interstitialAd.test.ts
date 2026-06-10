import AsyncStorage from '@react-native-async-storage/async-storage';
import {AdEventType} from 'react-native-google-mobile-ads';
import {resetAdDiagnosticLogsForTests} from '../adDiagnosticLog';
import {
  INTERSTITIAL_AD_COOLDOWN_MS,
  createInterstitialAdFrequencyRepository,
  getInterstitialAdDateKey,
  type InterstitialAdFrequencySnapshot,
  showAlarmStopInterstitialIfEligible,
  showSettingsEntryInterstitialIfEligible,
  showInterstitialAd,
  shouldShowSettingsEntryInterstitialAd,
  shouldShowInterstitialAd,
  type InterstitialAdForDisplay,
  type InterstitialAdFrequencyRepository,
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
  beforeEach(async () => {
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
});
