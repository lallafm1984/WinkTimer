import React from 'react';
import {StyleSheet, View} from 'react-native';
import {BannerAd, BannerAdSize} from 'react-native-google-mobile-ads';
import {arcadeTheme} from '../theme/arcadeTheme';
import {getBannerAdUnitId} from './adMobConfig';
import {recordAdDiagnosticLog} from './adDiagnosticLog';

type BannerAdLoadError = Error & {
  code?: unknown;
  userInfo?: unknown;
};

export function AdMobBanner() {
  const adUnitId = getBannerAdUnitId();

  const handleAdLoaded = React.useCallback(() => {
    recordAdDiagnosticLog('banner.loaded', {adUnitId});
  }, [adUnitId]);

  const handleAdFailedToLoad = React.useCallback(
    (error: BannerAdLoadError) => {
      recordAdDiagnosticLog('banner.load_error', {
        code: error.code,
        message: error.message,
        userInfo: error.userInfo,
        adUnitId,
      });
    },
    [adUnitId],
  );

  const handleAdImpression = React.useCallback(() => {
    recordAdDiagnosticLog('banner.impression', {adUnitId});
  }, [adUnitId]);

  return (
    <View style={styles.container} testID="ad-slot">
      <View style={styles.bannerHost} testID="admob-banner">
        <BannerAd
          unitId={adUnitId}
          size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{requestNonPersonalizedAdsOnly: true}}
          onAdLoaded={handleAdLoaded}
          onAdFailedToLoad={handleAdFailedToLoad}
          onAdImpression={handleAdImpression}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 86,
    width: '100%',
  },
  bannerHost: {
    alignItems: 'center',
    borderTopColor: arcadeTheme.colors.line,
    borderTopWidth: StyleSheet.hairlineWidth,
    justifyContent: 'center',
    minHeight: 64,
    paddingTop: arcadeTheme.spacing.xs,
    width: '100%',
  },
});
