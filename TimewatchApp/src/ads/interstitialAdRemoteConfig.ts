import remoteConfig from '@react-native-firebase/remote-config';
import {recordAdDiagnosticLog} from './adDiagnosticLog';

const HOURS_TO_MS = 60 * 60 * 1000;
const MINUTES_TO_MS = 60 * 1000;

export const INTERSTITIAL_AD_REMOTE_CONFIG_FETCH_INTERVAL_MS = 6 * HOURS_TO_MS;

export const INTERSTITIAL_AD_REMOTE_CONFIG_KEYS = {
  enabled: 'ads_interstitial_enabled',
  dailyCap: 'ads_interstitial_daily_cap',
  cooldownHours: 'ads_interstitial_cooldown_hours',
  modeSelectionGraceMinutes: 'ads_mode_selection_grace_minutes',
  settingsEntryEnabled: 'ads_settings_entry_interstitial_enabled',
  settingsCloseReviewPromptEnabled: 'app_review_prompt_settings_close_enabled',
} as const;

export const INTERSTITIAL_AD_REMOTE_CONFIG_DEFAULTS = {
  [INTERSTITIAL_AD_REMOTE_CONFIG_KEYS.enabled]: true,
  [INTERSTITIAL_AD_REMOTE_CONFIG_KEYS.dailyCap]: 3,
  [INTERSTITIAL_AD_REMOTE_CONFIG_KEYS.cooldownHours]: 3,
  [INTERSTITIAL_AD_REMOTE_CONFIG_KEYS.modeSelectionGraceMinutes]: 3,
  [INTERSTITIAL_AD_REMOTE_CONFIG_KEYS.settingsEntryEnabled]: true,
  [INTERSTITIAL_AD_REMOTE_CONFIG_KEYS.settingsCloseReviewPromptEnabled]: true,
};

export type InterstitialAdPolicy = {
  enabled: boolean;
  dailyCap: number;
  cooldownMs: number;
  modeSelectionGraceMs: number;
  settingsEntryEnabled: boolean;
  settingsCloseReviewPromptEnabled: boolean;
};

export type InterstitialAdRemoteConfigClient = {
  setConfigSettings(settings: {
    minimumFetchIntervalMillis: number;
  }): Promise<void>;
  setDefaults(
    defaults: typeof INTERSTITIAL_AD_REMOTE_CONFIG_DEFAULTS,
  ): Promise<unknown>;
  fetchAndActivate(): Promise<boolean>;
  getBoolean(key: string): boolean;
  getNumber(key: string): number;
};

export const DEFAULT_INTERSTITIAL_AD_POLICY: InterstitialAdPolicy = {
  enabled: true,
  dailyCap: 3,
  cooldownMs: 3 * HOURS_TO_MS,
  modeSelectionGraceMs: 3 * MINUTES_TO_MS,
  settingsEntryEnabled: true,
  settingsCloseReviewPromptEnabled: true,
};

const MIN_INTERSTITIAL_AD_DAILY_CAP = 0;
const MAX_INTERSTITIAL_AD_DAILY_CAP = 6;
const MIN_INTERSTITIAL_AD_COOLDOWN_HOURS = 1;
const MAX_INTERSTITIAL_AD_COOLDOWN_HOURS = 24;
const MIN_MODE_SELECTION_GRACE_MINUTES = 0;
const MAX_MODE_SELECTION_GRACE_MINUTES = 60;

let initializationPromise: Promise<InterstitialAdPolicy> | null = null;
let activeInterstitialAdPolicy = DEFAULT_INTERSTITIAL_AD_POLICY;

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function clampInteger(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, Math.floor(value)));
}

function normalizeInteger(
  value: unknown,
  defaultValue: number,
  min: number,
  max: number,
) {
  return isFiniteNumber(value)
    ? clampInteger(value, min, max)
    : defaultValue;
}

export function sanitizeInterstitialAdPolicy({
  enabled,
  dailyCap,
  cooldownHours,
  modeSelectionGraceMinutes,
  settingsEntryEnabled,
  settingsCloseReviewPromptEnabled,
}: {
  enabled: unknown;
  dailyCap: unknown;
  cooldownHours: unknown;
  modeSelectionGraceMinutes?: unknown;
  settingsEntryEnabled?: unknown;
  settingsCloseReviewPromptEnabled?: unknown;
}): InterstitialAdPolicy {
  const normalizedDailyCap = normalizeInteger(
    dailyCap,
    DEFAULT_INTERSTITIAL_AD_POLICY.dailyCap,
    MIN_INTERSTITIAL_AD_DAILY_CAP,
    MAX_INTERSTITIAL_AD_DAILY_CAP,
  );
  const normalizedCooldownHours = normalizeInteger(
    cooldownHours,
    DEFAULT_INTERSTITIAL_AD_POLICY.cooldownMs / HOURS_TO_MS,
    MIN_INTERSTITIAL_AD_COOLDOWN_HOURS,
    MAX_INTERSTITIAL_AD_COOLDOWN_HOURS,
  );
  const normalizedModeSelectionGraceMinutes = normalizeInteger(
    modeSelectionGraceMinutes,
    DEFAULT_INTERSTITIAL_AD_POLICY.modeSelectionGraceMs / MINUTES_TO_MS,
    MIN_MODE_SELECTION_GRACE_MINUTES,
    MAX_MODE_SELECTION_GRACE_MINUTES,
  );

  return {
    enabled: typeof enabled === 'boolean' ? enabled : true,
    dailyCap: normalizedDailyCap,
    cooldownMs: normalizedCooldownHours * HOURS_TO_MS,
    modeSelectionGraceMs: normalizedModeSelectionGraceMinutes * MINUTES_TO_MS,
    settingsEntryEnabled:
      typeof settingsEntryEnabled === 'boolean'
        ? settingsEntryEnabled
        : DEFAULT_INTERSTITIAL_AD_POLICY.settingsEntryEnabled,
    settingsCloseReviewPromptEnabled:
      typeof settingsCloseReviewPromptEnabled === 'boolean'
        ? settingsCloseReviewPromptEnabled
        : DEFAULT_INTERSTITIAL_AD_POLICY.settingsCloseReviewPromptEnabled,
  };
}

function readInterstitialAdPolicyFromClient(
  client: InterstitialAdRemoteConfigClient,
) {
  return sanitizeInterstitialAdPolicy({
    enabled: client.getBoolean(INTERSTITIAL_AD_REMOTE_CONFIG_KEYS.enabled),
    dailyCap: client.getNumber(INTERSTITIAL_AD_REMOTE_CONFIG_KEYS.dailyCap),
    cooldownHours: client.getNumber(
      INTERSTITIAL_AD_REMOTE_CONFIG_KEYS.cooldownHours,
    ),
    modeSelectionGraceMinutes: client.getNumber(
      INTERSTITIAL_AD_REMOTE_CONFIG_KEYS.modeSelectionGraceMinutes,
    ),
    settingsEntryEnabled: client.getBoolean(
      INTERSTITIAL_AD_REMOTE_CONFIG_KEYS.settingsEntryEnabled,
    ),
    settingsCloseReviewPromptEnabled: client.getBoolean(
      INTERSTITIAL_AD_REMOTE_CONFIG_KEYS.settingsCloseReviewPromptEnabled,
    ),
  });
}

function getDefaultRemoteConfigClient(): InterstitialAdRemoteConfigClient {
  return remoteConfig();
}

export function createInterstitialAdPolicyReader(
  client: InterstitialAdRemoteConfigClient = getDefaultRemoteConfigClient(),
) {
  return () => readInterstitialAdPolicyFromClient(client);
}

export function getInterstitialAdPolicy() {
  return activeInterstitialAdPolicy;
}

export function initializeInterstitialAdRemoteConfig({
  client = getDefaultRemoteConfigClient(),
}: {
  client?: InterstitialAdRemoteConfigClient;
} = {}) {
  if (initializationPromise !== null) {
    return initializationPromise;
  }

  initializationPromise = client
    .setConfigSettings({
      minimumFetchIntervalMillis:
        INTERSTITIAL_AD_REMOTE_CONFIG_FETCH_INTERVAL_MS,
    })
    .then(() => client.setDefaults(INTERSTITIAL_AD_REMOTE_CONFIG_DEFAULTS))
    .then(() => {
      return client.fetchAndActivate().catch(error => {
        recordAdDiagnosticLog('interstitial.remote_config_fetch_error', error);
        return false;
      });
    })
    .then(() => {
      activeInterstitialAdPolicy = readInterstitialAdPolicyFromClient(client);
      recordAdDiagnosticLog('interstitial.remote_config_policy', {
        enabled: activeInterstitialAdPolicy.enabled,
        dailyCap: activeInterstitialAdPolicy.dailyCap,
        cooldownMs: activeInterstitialAdPolicy.cooldownMs,
        modeSelectionGraceMs: activeInterstitialAdPolicy.modeSelectionGraceMs,
        settingsEntryEnabled: activeInterstitialAdPolicy.settingsEntryEnabled,
        settingsCloseReviewPromptEnabled:
          activeInterstitialAdPolicy.settingsCloseReviewPromptEnabled,
      });
      return activeInterstitialAdPolicy;
    })
    .catch(error => {
      initializationPromise = null;
      activeInterstitialAdPolicy = DEFAULT_INTERSTITIAL_AD_POLICY;
      recordAdDiagnosticLog('interstitial.remote_config_init_error', error);
      return activeInterstitialAdPolicy;
    });

  return initializationPromise;
}

export function resetInterstitialAdRemoteConfigForTests() {
  initializationPromise = null;
  activeInterstitialAdPolicy = DEFAULT_INTERSTITIAL_AD_POLICY;
}

export function isSettingsCloseAppReviewPromptEnabled() {
  return activeInterstitialAdPolicy.settingsCloseReviewPromptEnabled;
}
