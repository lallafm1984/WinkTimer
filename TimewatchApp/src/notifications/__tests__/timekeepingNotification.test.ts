import {Linking, PermissionsAndroid, Platform} from 'react-native';
import {
  ensureBackgroundTimekeepingNotificationPermission,
} from '../timekeepingNotification';

const originalPlatformOSDescriptor = Object.getOwnPropertyDescriptor(
  Platform,
  'OS',
);
const originalPlatformVersionDescriptor = Object.getOwnPropertyDescriptor(
  Platform,
  'Version',
);

function setAndroidPlatformVersion(version: number) {
  Object.defineProperty(Platform, 'OS', {
    configurable: true,
    value: 'android',
  });
  Object.defineProperty(Platform, 'Version', {
    configurable: true,
    value: version,
  });
}

function restorePlatform() {
  if (originalPlatformOSDescriptor) {
    Object.defineProperty(Platform, 'OS', originalPlatformOSDescriptor);
  }
  if (originalPlatformVersionDescriptor) {
    Object.defineProperty(
      Platform,
      'Version',
      originalPlatformVersionDescriptor,
    );
  }
}

describe('timekeepingNotification permissions', () => {
  afterEach(() => {
    restorePlatform();
    jest.restoreAllMocks();
  });

  it('opens app settings when notification permission prompt is blocked', async () => {
    setAndroidPlatformVersion(36);
    jest.spyOn(PermissionsAndroid, 'check').mockResolvedValue(false);
    jest
      .spyOn(PermissionsAndroid, 'request')
      .mockResolvedValue(PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN);
    const openSettings = jest
      .spyOn(Linking, 'openSettings')
      .mockResolvedValue(undefined);

    await expect(
      ensureBackgroundTimekeepingNotificationPermission({
        openSettingsIfBlocked: true,
      }),
    ).resolves.toBe(false);

    expect(PermissionsAndroid.request).toHaveBeenCalledWith(
      PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
    );
    expect(openSettings).toHaveBeenCalledTimes(1);
  });
});
