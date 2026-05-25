import {NativeModules} from 'react-native';

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
