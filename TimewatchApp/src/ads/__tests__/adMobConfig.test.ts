import {
  PRODUCTION_BANNER_AD_UNIT_ID,
  PRODUCTION_REWARDED_AD_UNIT_ID,
  getBannerAdUnitId,
  getRewardedAdUnitId,
} from '../adMobConfig';

describe('adMobConfig', () => {
  it('uses Google test ad units for development requests', () => {
    expect(getBannerAdUnitId(true)).toBe(
      'ca-app-pub-3940256099942544/9214589741',
    );
    expect(getRewardedAdUnitId(true)).toBe(
      'ca-app-pub-3940256099942544/5224354917',
    );
  });

  it('keeps the production ad unit IDs available for release builds', () => {
    expect(getBannerAdUnitId(false)).toBe(PRODUCTION_BANNER_AD_UNIT_ID);
    expect(getRewardedAdUnitId(false)).toBe(PRODUCTION_REWARDED_AD_UNIT_ID);
  });

  it('keeps checked-in ad environment configured for production by default', () => {
    const environment = require('../adMobEnvironment');

    expect(environment.FORCE_TEST_ADS).toBe(false);
  });
});
