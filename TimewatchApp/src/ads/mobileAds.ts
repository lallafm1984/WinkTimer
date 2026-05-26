import mobileAds, {MaxAdContentRating} from 'react-native-google-mobile-ads';

let initializationPromise: Promise<void> | null = null;

export function initializeMobileAds() {
  if (initializationPromise !== null) {
    return initializationPromise;
  }

  initializationPromise = mobileAds()
    .setRequestConfiguration({
      maxAdContentRating: MaxAdContentRating.G,
      tagForChildDirectedTreatment: false,
      tagForUnderAgeOfConsent: false,
    })
    .then(() => mobileAds().initialize())
    .then(() => undefined)
    .catch(error => {
      initializationPromise = null;
      throw error;
    });

  return initializationPromise;
}
