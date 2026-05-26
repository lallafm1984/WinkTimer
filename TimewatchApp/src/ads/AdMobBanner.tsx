import React from 'react';
import {StyleSheet, View} from 'react-native';
import {BannerAd, BannerAdSize} from 'react-native-google-mobile-ads';
import {arcadeTheme} from '../theme/arcadeTheme';
import {getBannerAdUnitId} from './adMobConfig';

export function AdMobBanner() {
  return (
    <View style={styles.container} testID="ad-slot">
      <View style={styles.bannerHost} testID="admob-banner">
        <BannerAd
          unitId={getBannerAdUnitId()}
          size={BannerAdSize.LARGE_ANCHORED_ADAPTIVE_BANNER}
          requestOptions={{requestNonPersonalizedAdsOnly: true}}
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
