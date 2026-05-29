package com.winktimer.app.alert

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

object TimerAlertVibrationPolicy {
  private const val REPEAT_FROM_START = 0
  private const val NO_REPEAT = -1
  private const val SILENT_AMPLITUDE = 0
  private const val FULL_AMPLITUDE = 255

  @Suppress("UNUSED_PARAMETER")
  fun getRepeatIndex(durationMs: Long?): Int =
    if (durationMs == null) REPEAT_FROM_START else NO_REPEAT

  fun buildPatternForDuration(
    basePattern: LongArray,
    durationMs: Long?,
  ): LongArray {
    if (
      durationMs == null ||
      durationMs <= 0L ||
      basePattern.isEmpty() ||
      basePattern.sum() <= 0L
    ) {
      return basePattern
    }

    val expandedPattern = mutableListOf<Long>()
    var elapsedMs = 0L

    while (elapsedMs < durationMs) {
      val startIndex =
        if (expandedPattern.isEmpty() || expandedPattern.size % 2 == 0) {
          0
        } else {
          1
        }

      for (index in startIndex until basePattern.size) {
        val segmentMs = basePattern[index]
        expandedPattern.add(segmentMs)
        elapsedMs += segmentMs

        if (elapsedMs >= durationMs) {
          break
        }
      }
    }

    return expandedPattern.toLongArray()
  }

  fun buildAmplitudePattern(pattern: LongArray): IntArray =
    IntArray(pattern.size) { index ->
      if (index % 2 == 1 && pattern[index] > 0L) {
        FULL_AMPLITUDE
      } else {
        SILENT_AMPLITUDE
      }
    }
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
    timekeepingFinishedTitle: String,
    timekeepingFinishedText: String,
    timekeepingChannelName: String,
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
        timekeepingFinishedTitle,
        timekeepingFinishedText,
        timekeepingChannelName,
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
  fun scheduleAlarmAlert(
    alarmId: String,
    triggerAtMs: Double,
    hour: Double,
    minute: Double,
    scheduleKind: String,
    weekdaysCsv: String,
    datesCsv: String,
    soundId: String,
    vibrationEnabled: Boolean,
    soundEnabled: Boolean,
    soundVolume: Double,
    notificationTitle: String,
    notificationText: String,
    notificationChannelName: String,
    promise: Promise,
  ) {
    try {
      AlarmAlertScheduler.schedule(
        reactContext,
        alarmId,
        triggerAtMs.toLong(),
        hour.toInt(),
        minute.toInt(),
        scheduleKind,
        weekdaysCsv,
        datesCsv,
        soundId,
        vibrationEnabled,
        soundEnabled,
        soundVolume.toFloat(),
        notificationTitle,
        notificationText,
        notificationChannelName,
      )
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_ALARM_ALERT_SCHEDULE_FAILED", error)
    }
  }

  @ReactMethod
  fun cancelAlarmAlert(alarmId: String, promise: Promise) {
    AlarmAlertScheduler.cancel(reactContext, alarmId)
    promise.resolve(null)
  }

  @ReactMethod
  fun snoozeAlarmAlert(
    alarmId: String,
    triggerAtMs: Double,
    soundId: String,
    vibrationEnabled: Boolean,
    soundEnabled: Boolean,
    soundVolume: Double,
    notificationTitle: String,
    notificationText: String,
    notificationChannelName: String,
    promise: Promise,
  ) {
    try {
      TimerAlertService.stop(reactContext, TimerAlertService.ALERT_OWNER_ALARM)
      TimerAlertPlayback.stop(reactContext, TimerAlertService.ALERT_OWNER_ALARM)
      AlarmAlertScheduler.scheduleSnooze(
        reactContext,
        alarmId,
        triggerAtMs.toLong(),
        soundId,
        vibrationEnabled,
        soundEnabled,
        soundVolume.toFloat(),
        notificationTitle,
        notificationText,
        notificationChannelName,
      )
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_ALARM_ALERT_SNOOZE_FAILED", error)
    }
  }

  @ReactMethod
  fun getActiveAlarmAlert(promise: Promise) {
    val activeAlarmAlert = TimerAlertService.getActiveAlarmAlert()

    if (activeAlarmAlert == null) {
      promise.resolve(null)
      return
    }

    promise.resolve(
      Arguments.createMap().apply {
        putBoolean("active", true)
        putString("alarmId", activeAlarmAlert.alarmId)
        putString("title", activeAlarmAlert.title)
        putString("text", activeAlarmAlert.text)
      },
    )
  }

  @ReactMethod
  fun stopAlarmAlert(promise: Promise) {
    TimerAlertService.stop(reactContext, TimerAlertService.ALERT_OWNER_ALARM)
    TimerAlertPlayback.stop(reactContext, TimerAlertService.ALERT_OWNER_ALARM)
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
    TimerAlertService.stop(reactContext, TimerAlertService.ALERT_OWNER_TIMER)
    TimekeepingNotification.hide(reactContext)
    TimerAlertPlayback.stop(reactContext, TimerAlertService.ALERT_OWNER_TIMER)
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
  }

  companion object {
    const val NAME = "NativeTimerAlert"
  }
}
