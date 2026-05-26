import mockAsyncStorage from '@react-native-async-storage/async-storage/jest';

jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

jest.mock('@react-native-firebase/auth', () => {
  const mockAuth = {
    currentUser: null,
  };
  const mockUser = {
    uid: 'anonymous-test-user',
    isAnonymous: true,
  };

  return {
    __esModule: true,
    getAuth: jest.fn(() => mockAuth),
    signInAnonymously: jest.fn(async () => ({user: mockUser})),
  };
});

jest.mock('react-native-google-mobile-ads', () => {
  const ReactModule = require('react');
  const {View} = require('react-native');

  const mockMobileAds = jest.fn(() => ({
    initialize: jest.fn(async () => []),
    setRequestConfiguration: jest.fn(async () => undefined),
  }));

  const MockBannerAd = () =>
    ReactModule.createElement(View, {testID: 'mock-banner-ad'});

  return {
    __esModule: true,
    default: mockMobileAds,
    BannerAd: MockBannerAd,
    BannerAdSize: {
      BANNER: 'BANNER',
      LARGE_ANCHORED_ADAPTIVE_BANNER: 'LARGE_ANCHORED_ADAPTIVE_BANNER',
    },
    RewardedAd: {
      createForAdRequest: jest.fn(() => ({
        addAdEventListener: jest.fn(() => jest.fn()),
        load: jest.fn(),
        show: jest.fn(async () => undefined),
      })),
    },
    RewardedAdEventType: {
      EARNED_REWARD: 'rewarded_earned_reward',
      LOADED: 'rewarded_loaded',
    },
    AdEventType: {
      CLOSED: 'closed',
      ERROR: 'error',
      LOADED: 'loaded',
    },
    MaxAdContentRating: {
      G: 'G',
    },
    TestIds: {
      ADAPTIVE_BANNER: 'ca-app-pub-3940256099942544/9214589741',
      REWARDED: 'ca-app-pub-3940256099942544/5224354917',
    },
  };
});
