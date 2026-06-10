import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  APP_REVIEW_MARKET_URL,
  APP_REVIEW_PROMPT_STORAGE_KEY,
  APP_REVIEW_WEB_URL,
  openAppReviewPage,
  recordAppReviewPromptRated,
  recordAppReviewPromptShown,
  shouldShowAppReviewPrompt,
} from '../appReviewPrompt';

describe('appReviewPrompt', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('shows at most once per local day', async () => {
    const morningMs = new Date(2026, 5, 8, 9).getTime();
    const eveningMs = new Date(2026, 5, 8, 21).getTime();
    const nextMorningMs = new Date(2026, 5, 9, 9).getTime();

    await expect(shouldShowAppReviewPrompt(morningMs)).resolves.toBe(true);

    await recordAppReviewPromptShown(morningMs);

    await expect(shouldShowAppReviewPrompt(eveningMs)).resolves.toBe(false);
    await expect(shouldShowAppReviewPrompt(nextMorningMs)).resolves.toBe(true);
  });

  it('stops showing after the user chooses to rate the app', async () => {
    const shownAtMs = new Date(2026, 5, 8, 9).getTime();
    const laterMs = new Date(2026, 5, 15, 9).getTime();

    await recordAppReviewPromptRated(shownAtMs);

    await expect(shouldShowAppReviewPrompt(laterMs)).resolves.toBe(false);
    await expect(
      AsyncStorage.getItem(APP_REVIEW_PROMPT_STORAGE_KEY),
    ).resolves.toContain(`"ratedAtMs":${shownAtMs}`);
  });

  it('honors existing rated records so previously rated users are not prompted again', async () => {
    const legacyRatedAtMs = new Date(2026, 5, 8, 9).getTime();
    const laterMs = new Date(2026, 5, 15, 9).getTime();

    await AsyncStorage.setItem(
      APP_REVIEW_PROMPT_STORAGE_KEY,
      JSON.stringify({
        version: 1,
        lastShownDateKey: '2026-06-08',
        ratedAtMs: legacyRatedAtMs,
      }),
    );

    await expect(shouldShowAppReviewPrompt(laterMs)).resolves.toBe(false);
  });

  it('opens the Play Store web listing before falling back to market scheme', async () => {
    const openUrl = jest.fn(async () => undefined);

    await openAppReviewPage(openUrl, null);

    expect(openUrl).toHaveBeenCalledTimes(1);
    expect(openUrl).toHaveBeenCalledWith(APP_REVIEW_WEB_URL);
  });

  it('falls back to the market scheme when the web listing cannot open', async () => {
    const openUrl = jest
      .fn()
      .mockRejectedValueOnce(new Error('Web URL failed.'))
      .mockResolvedValueOnce(undefined);

    await openAppReviewPage(openUrl, null);

    expect(openUrl).toHaveBeenNthCalledWith(1, APP_REVIEW_WEB_URL);
    expect(openUrl).toHaveBeenNthCalledWith(2, APP_REVIEW_MARKET_URL);
  });

  it('uses a native Play Store opener before React Native Linking', async () => {
    const openUrl = jest.fn(async () => undefined);
    const openNativeReviewPage = jest.fn(async () => undefined);

    await openAppReviewPage(openUrl, openNativeReviewPage);

    expect(openNativeReviewPage).toHaveBeenCalledTimes(1);
    expect(openUrl).not.toHaveBeenCalled();
  });

  it('falls back to React Native Linking when the native opener fails', async () => {
    const openUrl = jest.fn(async () => undefined);
    const openNativeReviewPage = jest
      .fn()
      .mockRejectedValueOnce(new Error('Native opener failed.'));

    await openAppReviewPage(openUrl, openNativeReviewPage);

    expect(openNativeReviewPage).toHaveBeenCalledTimes(1);
    expect(openUrl).toHaveBeenCalledWith(APP_REVIEW_WEB_URL);
  });
});
