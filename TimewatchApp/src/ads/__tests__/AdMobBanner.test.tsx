import React from 'react';
import analytics from '@react-native-firebase/analytics';
import ReactTestRenderer from 'react-test-renderer';
import {BannerAd} from 'react-native-google-mobile-ads';
import {AdMobBanner} from '../AdMobBanner';
import {
  getAdDiagnosticLogEntries,
  getAdDiagnosticLogText,
  resetAdDiagnosticLogsForTests,
} from '../adDiagnosticLog';
import {getBannerAdUnitId} from '../adMobConfig';

describe('AdMobBanner', () => {
  const mockedAnalytics = analytics as unknown as jest.Mock;
  let logEvent: jest.Mock<Promise<void>, [string, Record<string, unknown>]>;

  beforeEach(() => {
    logEvent = jest
      .fn<Promise<void>, [string, Record<string, unknown>]>()
      .mockResolvedValue(undefined);
    mockedAnalytics.mockReturnValue({logEvent});
    resetAdDiagnosticLogsForTests();
    jest.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  afterEach(() => {
    resetAdDiagnosticLogsForTests();
    jest.restoreAllMocks();
  });

  it('records banner load lifecycle events for diagnostics', async () => {
    let renderer: ReactTestRenderer.ReactTestRenderer | undefined;

    await ReactTestRenderer.act(async () => {
      renderer = ReactTestRenderer.create(<AdMobBanner />);
    });

    const banner = renderer!.root.findByType(BannerAd);

    expect(typeof banner.props.onAdLoaded).toBe('function');
    expect(typeof banner.props.onAdFailedToLoad).toBe('function');
    expect(typeof banner.props.onAdImpression).toBe('function');

    banner.props.onAdLoaded({width: 320, height: 50});
    banner.props.onAdImpression();
    banner.props.onAdFailedToLoad({
      code: 'googleMobileAds/no-fill',
      message: 'No fill',
    });

    const expectedAdUnitId = getBannerAdUnitId();
    expect(getAdDiagnosticLogEntries().map(entry => entry.message)).toEqual([
      `banner.load_error code=googleMobileAds/no-fill message="No fill" adUnitId=${expectedAdUnitId}`,
      `banner.impression adUnitId=${expectedAdUnitId}`,
      `banner.loaded adUnitId=${expectedAdUnitId}`,
    ]);
    expect(getAdDiagnosticLogText(getAdDiagnosticLogEntries())).toContain(
      'banner.load_error code=googleMobileAds/no-fill',
    );
    expect(logEvent).toHaveBeenCalledWith('wt_banner_load_result', {
      result: 'loaded',
      ad_unit_type: 'banner',
    });
    expect(logEvent).toHaveBeenCalledWith('wt_banner_load_result', {
      result: 'error',
      ad_unit_type: 'banner',
      error_code: 'googleMobileAds/no-fill',
    });

    await ReactTestRenderer.act(async () => {
      renderer!.unmount();
    });
  });
});
