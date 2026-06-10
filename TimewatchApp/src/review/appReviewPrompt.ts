import AsyncStorage from '@react-native-async-storage/async-storage';
import {Linking, NativeModules} from 'react-native';

export const APP_REVIEW_PROMPT_STORAGE_KEY = '@winktimer:app_review_prompt:v1';
const APP_REVIEW_PROMPT_RECORD_VERSION = 1;

export const APP_REVIEW_MARKET_URL = 'market://details?id=com.winktimer.app';
export const APP_REVIEW_WEB_URL =
  'https://play.google.com/store/apps/details?id=com.winktimer.app';

type NativeAppReviewModule = {
  openPlayStoreListing?: () => Promise<unknown>;
};

type AppReviewPromptRecord = {
  version?: number;
  lastShownDateKey?: string;
  ratedAtMs?: number;
};

function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeAppReviewPromptRecord(
  value: unknown,
): AppReviewPromptRecord | null {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    return null;
  }

  const record = value as AppReviewPromptRecord;

  return {
    version: record.version,
    lastShownDateKey:
      typeof record.lastShownDateKey === 'string'
        ? record.lastShownDateKey
        : undefined,
    ratedAtMs: isFiniteNumber(record.ratedAtMs)
      ? record.ratedAtMs
      : undefined,
  };
}

async function readAppReviewPromptRecord() {
  const raw = await AsyncStorage.getItem(APP_REVIEW_PROMPT_STORAGE_KEY);
  if (!raw) {
    return {};
  }

  try {
    const parsed = JSON.parse(raw);
    const record = normalizeAppReviewPromptRecord(parsed);
    if (!record) {
      await AsyncStorage.removeItem(APP_REVIEW_PROMPT_STORAGE_KEY);
      return {};
    }

    return record;
  } catch {
    await AsyncStorage.removeItem(APP_REVIEW_PROMPT_STORAGE_KEY);
    return {};
  }
}

function getAppReviewPromptDateKey(nowMs: number) {
  const date = new Date(nowMs);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export async function shouldShowAppReviewPrompt(nowMs = Date.now()) {
  const record = await readAppReviewPromptRecord();
  if (isFiniteNumber(record.ratedAtMs)) {
    return false;
  }

  return record.lastShownDateKey !== getAppReviewPromptDateKey(nowMs);
}

export async function recordAppReviewPromptShown(nowMs = Date.now()) {
  const record = await readAppReviewPromptRecord();

  await AsyncStorage.setItem(
    APP_REVIEW_PROMPT_STORAGE_KEY,
    JSON.stringify({
      version: APP_REVIEW_PROMPT_RECORD_VERSION,
      ...record,
      lastShownDateKey: getAppReviewPromptDateKey(nowMs),
    }),
  );
}

export async function recordAppReviewPromptRated(nowMs = Date.now()) {
  const record = await readAppReviewPromptRecord();

  await AsyncStorage.setItem(
    APP_REVIEW_PROMPT_STORAGE_KEY,
    JSON.stringify({
      version: APP_REVIEW_PROMPT_RECORD_VERSION,
      ...record,
      ratedAtMs: nowMs,
    }),
  );
}

export async function openAppReviewPage(
  openUrl: (url: string) => Promise<unknown> = Linking.openURL,
  openNativeReviewPage: (() => Promise<unknown>) | null =
    (NativeModules.NativeAppReview as NativeAppReviewModule | undefined)
      ?.openPlayStoreListing ?? null,
) {
  if (openNativeReviewPage !== null) {
    try {
      await openNativeReviewPage();
      return;
    } catch {
      // Fall through to React Native Linking for devices without Play Store.
    }
  }

  try {
    await openUrl(APP_REVIEW_WEB_URL);
  } catch {
    await openUrl(APP_REVIEW_MARKET_URL);
  }
}
