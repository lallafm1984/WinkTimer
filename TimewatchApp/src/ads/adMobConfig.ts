import {TestIds} from 'react-native-google-mobile-ads';
import {FORCE_TEST_ADS} from './adMobEnvironment';

export const ADMOB_ANDROID_APP_ID =
  'ca-app-pub-9163944262143117~4717352665';
export const PRODUCTION_BANNER_AD_UNIT_ID =
  'ca-app-pub-9163944262143117/2913693702';
export const PRODUCTION_REWARDED_AD_UNIT_ID =
  'ca-app-pub-9163944262143117/3954935331';

export function getBannerAdUnitId(useTestAds = __DEV__ || FORCE_TEST_ADS) {
  return useTestAds ? TestIds.ADAPTIVE_BANNER : PRODUCTION_BANNER_AD_UNIT_ID;
}

export function getRewardedAdUnitId(useTestAds = __DEV__ || FORCE_TEST_ADS) {
  return useTestAds ? TestIds.REWARDED : PRODUCTION_REWARDED_AD_UNIT_ID;
}
