import {Linking, NativeModules, PermissionsAndroid, Platform} from 'react-native';

export type BackgroundTimekeepingMode = 'stopwatch' | 'timer';

type NativeTimekeepingNotificationModule = {
  showTimekeepingNotification?(
    mode: BackgroundTimekeepingMode,
    whenMs: number,
    countDown: boolean,
    isRunning: boolean,
    displayText: string,
    title: string,
    text: string,
    channelName: string,
  ): Promise<void>;
  hideTimekeepingNotification?(): Promise<void>;
};

type EnsureNotificationPermissionOptions = {
  openSettingsIfBlocked?: boolean;
};

function getNativeTimekeepingNotification() {
  return NativeModules.NativeTimerAlert as
    | NativeTimekeepingNotificationModule
    | undefined;
}

async function openAppPermissionSettings() {
  try {
    await Linking.openSettings();
  } catch {
    // The permission result still stays denied; callers handle that state.
  }
}

export async function ensureBackgroundTimekeepingNotificationPermission({
  openSettingsIfBlocked = false,
}: EnsureNotificationPermissionOptions = {}): Promise<boolean> {
  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  const alreadyGranted =
    await hasBackgroundTimekeepingNotificationPermission();

  if (alreadyGranted) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission);

  if (result === PermissionsAndroid.RESULTS.GRANTED) {
    return true;
  }

  if (
    openSettingsIfBlocked &&
    result === PermissionsAndroid.RESULTS.NEVER_ASK_AGAIN
  ) {
    await openAppPermissionSettings();
  }

  return false;
}

export async function hasBackgroundTimekeepingNotificationPermission(): Promise<boolean> {
  if (Platform.OS !== 'android') {
    return true;
  }

  const androidVersion =
    typeof Platform.Version === 'number'
      ? Platform.Version
      : Number.parseInt(String(Platform.Version), 10);

  if (!Number.isFinite(androidVersion) || androidVersion < 33) {
    return true;
  }

  return PermissionsAndroid.check(
    PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
  );
}

export function showBackgroundTimekeepingNotification(
  mode: BackgroundTimekeepingMode,
  whenMs: number,
  countDown: boolean,
  isRunning: boolean,
  displayText: string,
  title: string,
  text: string,
  channelName: string,
): Promise<void> {
  return (
    getNativeTimekeepingNotification()?.showTimekeepingNotification?.(
      mode,
      whenMs,
      countDown,
      isRunning,
      displayText,
      title,
      text,
      channelName,
    ) ?? Promise.resolve()
  );
}

export function hideBackgroundTimekeepingNotification(): Promise<void> {
  return (
    getNativeTimekeepingNotification()?.hideTimekeepingNotification?.() ??
    Promise.resolve()
  );
}
