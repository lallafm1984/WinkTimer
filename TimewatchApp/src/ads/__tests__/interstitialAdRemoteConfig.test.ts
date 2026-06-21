import {
  DEFAULT_INTERSTITIAL_AD_POLICY,
  INTERSTITIAL_AD_REMOTE_CONFIG_DEFAULTS,
  INTERSTITIAL_AD_REMOTE_CONFIG_FETCH_INTERVAL_MS,
  createInterstitialAdPolicyReader,
  initializeInterstitialAdRemoteConfig,
  resetInterstitialAdRemoteConfigForTests,
  sanitizeInterstitialAdPolicy,
} from '../interstitialAdRemoteConfig';
import {resetAdDiagnosticLogsForTests} from '../adDiagnosticLog';

function createRemoteConfigClient({
  enabled = true,
  dailyCap = 3,
  cooldownHours = 3,
  modeSelectionGraceMinutes = 3,
  settingsEntryEnabled = true,
  settingsCloseReviewPromptEnabled = true,
  failDefaults = false,
  failFetch = false,
} = {}) {
  return {
    setConfigSettings: jest.fn(async () => undefined),
    setDefaults: jest.fn(async () => {
      if (failDefaults) {
        throw new Error('Remote Config defaults failed.');
      }

      return null;
    }),
    fetchAndActivate: jest.fn(async () => {
      if (failFetch) {
        throw new Error('Remote Config fetch failed.');
      }

      return true;
    }),
    getBoolean: jest.fn(key => {
      if (key === 'ads_settings_entry_interstitial_enabled') {
        return settingsEntryEnabled;
      }

      if (key === 'app_review_prompt_settings_close_enabled') {
        return settingsCloseReviewPromptEnabled;
      }

      return enabled;
    }),
    getNumber: jest.fn(key => {
      if (key === 'ads_interstitial_daily_cap') {
        return dailyCap;
      }

      if (key === 'ads_interstitial_cooldown_hours') {
        return cooldownHours;
      }

      if (key === 'ads_mode_selection_grace_minutes') {
        return modeSelectionGraceMinutes;
      }

      return 0;
    }),
  };
}

describe('interstitialAdRemoteConfig', () => {
  beforeEach(() => {
    resetInterstitialAdRemoteConfigForTests();
    resetAdDiagnosticLogsForTests();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    resetInterstitialAdRemoteConfigForTests();
    resetAdDiagnosticLogsForTests();
    jest.restoreAllMocks();
  });

  it('sets defaults and fetches activated ad policy values', async () => {
    const client = createRemoteConfigClient({
      enabled: true,
      dailyCap: 2,
      cooldownHours: 4,
      modeSelectionGraceMinutes: 5,
    });

    const policy = await initializeInterstitialAdRemoteConfig({client});

    expect(client.setConfigSettings).toHaveBeenCalledWith({
      minimumFetchIntervalMillis: INTERSTITIAL_AD_REMOTE_CONFIG_FETCH_INTERVAL_MS,
    });
    expect(client.setDefaults).toHaveBeenCalledWith(
      INTERSTITIAL_AD_REMOTE_CONFIG_DEFAULTS,
    );
    expect(client.fetchAndActivate).toHaveBeenCalledTimes(1);
    expect(policy).toEqual({
      enabled: true,
      dailyCap: 2,
      cooldownMs: 4 * 60 * 60 * 1000,
      modeSelectionGraceMs: 5 * 60 * 1000,
      settingsEntryEnabled: true,
      settingsCloseReviewPromptEnabled: true,
    });
  });

  it('reads setting-entry ad and settings-close review flags', async () => {
    const client = createRemoteConfigClient({
      settingsEntryEnabled: false,
      settingsCloseReviewPromptEnabled: false,
    });

    await expect(
      initializeInterstitialAdRemoteConfig({client}),
    ).resolves.toEqual({
      ...DEFAULT_INTERSTITIAL_AD_POLICY,
      settingsEntryEnabled: false,
      settingsCloseReviewPromptEnabled: false,
    });
  });

  it('keeps safe defaults when Remote Config fetch fails', async () => {
    const client = createRemoteConfigClient({failFetch: true});

    await expect(
      initializeInterstitialAdRemoteConfig({client}),
    ).resolves.toEqual(DEFAULT_INTERSTITIAL_AD_POLICY);
  });

  it('keeps safe defaults when Remote Config defaults cannot be set', async () => {
    const client = createRemoteConfigClient({
      dailyCap: 5,
      cooldownHours: 5,
      failDefaults: true,
    });

    await expect(
      initializeInterstitialAdRemoteConfig({client}),
    ).resolves.toEqual(DEFAULT_INTERSTITIAL_AD_POLICY);
    expect(client.fetchAndActivate).not.toHaveBeenCalled();
  });

  it('clamps invalid or excessive remote policy values', () => {
    expect(
      sanitizeInterstitialAdPolicy({
        enabled: true,
        dailyCap: Number.NaN,
        cooldownHours: Number.POSITIVE_INFINITY,
        modeSelectionGraceMinutes: Number.NaN,
      }),
    ).toEqual(DEFAULT_INTERSTITIAL_AD_POLICY);

    expect(
      sanitizeInterstitialAdPolicy({
        enabled: true,
        dailyCap: 99,
        cooldownHours: 99,
        modeSelectionGraceMinutes: 99,
        settingsEntryEnabled: false,
        settingsCloseReviewPromptEnabled: false,
      }),
    ).toEqual({
      enabled: true,
      dailyCap: 6,
      cooldownMs: 24 * 60 * 60 * 1000,
      modeSelectionGraceMs: 60 * 60 * 1000,
      settingsEntryEnabled: false,
      settingsCloseReviewPromptEnabled: false,
    });
  });

  it('reads the latest activated values from the remote config client', () => {
    const client = createRemoteConfigClient({
      enabled: false,
      dailyCap: 4,
      cooldownHours: 2,
      modeSelectionGraceMinutes: 7,
    });

    const readPolicy = createInterstitialAdPolicyReader(client);

    expect(readPolicy()).toEqual({
      enabled: false,
      dailyCap: 4,
      cooldownMs: 2 * 60 * 60 * 1000,
      modeSelectionGraceMs: 7 * 60 * 1000,
      settingsEntryEnabled: true,
      settingsCloseReviewPromptEnabled: true,
    });
  });
});
