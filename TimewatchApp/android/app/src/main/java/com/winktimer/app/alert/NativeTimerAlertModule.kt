package com.winktimer.app.alert

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

object TimerAlertVibrationPolicy {
  private const val REPEAT_FROM_START = 0

  @Suppress("UNUSED_PARAMETER")
  fun getRepeatIndex(durationMs: Long?): Int = REPEAT_FROM_START
}

class NativeTimerAlertModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun playTimerEndAlert(
    soundId: String,
    vibrationEnabled: Boolean,
    soundEnabled: Boolean,
    durationId: String,
    vibrationPatternId: String,
    promise: Promise,
  ) {
    try {
      TimerAlertPlayback.play(
        reactContext,
        soundId,
        vibrationEnabled,
        soundEnabled,
        durationId,
        vibrationPatternId,
      )
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_TIMER_ALERT_FAILED", error)
    }
  }

  @ReactMethod
  fun scheduleTimerEndAlert(
    triggerAtMs: Double,
    soundId: String,
    vibrationEnabled: Boolean,
    soundEnabled: Boolean,
    durationId: String,
    vibrationPatternId: String,
    notificationTitle: String,
    notificationText: String,
    notificationChannelName: String,
    promise: Promise,
  ) {
    try {
      TimerAlertScheduler.schedule(
        reactContext,
        triggerAtMs.toLong(),
        soundId,
        vibrationEnabled,
        soundEnabled,
        durationId,
        vibrationPatternId,
        notificationTitle,
        notificationText,
        notificationChannelName,
      )
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_TIMER_ALERT_SCHEDULE_FAILED", error)
    }
  }

  @ReactMethod
  fun cancelScheduledTimerEndAlert(promise: Promise) {
    TimerAlertScheduler.cancel(reactContext)
    promise.resolve(null)
  }

  @ReactMethod
  fun showTimekeepingNotification(
    mode: String,
    whenMs: Double,
    countDown: Boolean,
    isRunning: Boolean,
    displayText: String,
    title: String,
    text: String,
    channelName: String,
    promise: Promise,
  ) {
    try {
      TimekeepingNotification.show(
        reactContext,
        mode,
        whenMs.toLong(),
        countDown,
        isRunning,
        displayText,
        title,
        text,
        channelName,
      )
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_TIMEKEEPING_NOTIFICATION_FAILED", error)
    }
  }

  @ReactMethod
  fun hideTimekeepingNotification(promise: Promise) {
    TimekeepingNotification.hide(reactContext)
    promise.resolve(null)
  }

  @ReactMethod
  fun previewTimerAlertSound(
    soundId: String,
    durationMs: Double,
    promise: Promise,
  ) {
    try {
      TimerAlertPlayback.preview(reactContext, soundId, durationMs.toLong())
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_TIMER_ALERT_PREVIEW_FAILED", error)
    }
  }

  @ReactMethod
  fun stopTimerEndAlert(promise: Promise) {
    TimerAlertScheduler.cancel(reactContext)
    TimerAlertService.stop(reactContext)
    TimerAlertPlayback.stop(reactContext)
    promise.resolve(null)
  }

  @ReactMethod
  fun getTimerAlertSoundOptions(promise: Promise) {
    try {
      promise.resolve(TimerAlertPlayback.getSoundOptions(reactContext))
    } catch (error: Exception) {
      promise.reject("E_TIMER_ALERT_SOUND_OPTIONS_FAILED", error)
    }
  }

  override fun invalidate() {
    super.invalidate()
    TimekeepingNotification.hide(reactContext)
    TimerAlertPlayback.stop(reactContext)
  }

  companion object {
    const val NAME = "NativeTimerAlert"
  }
}
