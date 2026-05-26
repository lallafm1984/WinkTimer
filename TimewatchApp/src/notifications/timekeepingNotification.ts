import {NativeModules, PermissionsAndroid, Platform} from 'react-native';

export type BackgroundTimekeepingMode = 'stopwatch' | 'timer';

type NativeTimekeepingNotificationModule = {
  showTimekeepingNotification?(
    mode: BackgroundTimekeepingMode,
    whenMs: number,
    countDown: boolean,
    isRunning: boolean,
    displayText: string,
  ): Promise<void>;
  hideTimekeepingNotification?(): Promise<void>;
};

function getNativeTimekeepingNotification() {
  return NativeModules.NativeTimerAlert as
    | NativeTimekeepingNotificationModule
    | undefined;
}

export async function ensureBackgroundTimekeepingNotificationPermission(): Promise<boolean> {
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

  const permission = PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS;
  const alreadyGranted = await PermissionsAndroid.check(permission);

  if (alreadyGranted) {
    return true;
  }

  const result = await PermissionsAndroid.request(permission);
  return result === PermissionsAndroid.RESULTS.GRANTED;
}

export function showBackgroundTimekeepingNotification(
  mode: BackgroundTimekeepingMode,
  whenMs: number,
  countDown: boolean,
  isRunning: boolean,
  displayText: string,
): Promise<void> {
  return (
    getNativeTimekeepingNotification()?.showTimekeepingNotification?.(
      mode,
      whenMs,
      countDown,
      isRunning,
      displayText,
    ) ?? Promise.resolve()
  );
}

export function hideBackgroundTimekeepingNotification(): Promise<void> {
  return (
    getNativeTimekeepingNotification()?.hideTimekeepingNotification?.() ??
    Promise.resolve()
  );
}
