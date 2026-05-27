package com.winktimer.app.alert

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build

object TimerAlertScheduler {
  const val ACTION_PLAY = "com.winktimer.app.alert.PLAY_TIMER_END_ALERT"
  const val EXTRA_SOUND_ID = "soundId"
  const val EXTRA_VIBRATION_ENABLED = "vibrationEnabled"
  const val EXTRA_SOUND_ENABLED = "soundEnabled"
  const val EXTRA_DURATION_ID = "durationId"
  const val EXTRA_VIBRATION_PATTERN_ID = "vibrationPatternId"
  const val EXTRA_NOTIFICATION_TITLE = "notificationTitle"
  const val EXTRA_NOTIFICATION_TEXT = "notificationText"
  const val EXTRA_NOTIFICATION_CHANNEL_NAME = "notificationChannelName"
  const val EXTRA_TIMEKEEPING_FINISHED_TITLE = "timekeepingFinishedTitle"
  const val EXTRA_TIMEKEEPING_FINISHED_TEXT = "timekeepingFinishedText"
  const val EXTRA_TIMEKEEPING_CHANNEL_NAME = "timekeepingChannelName"

  private const val REQUEST_CODE = 9201

  fun schedule(
    context: Context,
    triggerAtMs: Long,
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
  ) {
    val alarmManager =
      context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        ?: return
    val pendingIntent =
      createPendingIntent(
        context,
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
        PendingIntent.FLAG_UPDATE_CURRENT,
      ) ?: return
    val safeTriggerAtMs = triggerAtMs.coerceAtLeast(System.currentTimeMillis())

    if (
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
      alarmManager.canScheduleExactAlarms()
    ) {
      alarmManager.setExactAndAllowWhileIdle(
        AlarmManager.RTC_WAKEUP,
        safeTriggerAtMs,
        pendingIntent,
      )
    } else {
      alarmManager.setAndAllowWhileIdle(
        AlarmManager.RTC_WAKEUP,
        safeTriggerAtMs,
        pendingIntent,
      )
    }
  }

  fun cancel(context: Context) {
    val alarmManager =
      context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        ?: return
    val pendingIntent =
      createPendingIntent(
        context,
        "alarm",
        vibrationEnabled = true,
        soundEnabled = true,
        durationId = "seconds:4",
        vibrationPatternId = "double",
        notificationTitle = "Timer alert",
        notificationText = "Timer finished",
        notificationChannelName = "Timer alerts",
        timekeepingFinishedTitle = "Timer",
        timekeepingFinishedText = "Timer finished",
        timekeepingChannelName = "Background time",
        PendingIntent.FLAG_NO_CREATE,
      ) ?: return

    alarmManager.cancel(pendingIntent)
    pendingIntent.cancel()
  }

  private fun createPendingIntent(
    context: Context,
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
    baseFlag: Int,
  ): PendingIntent? {
    val flags = baseFlag or PendingIntent.FLAG_IMMUTABLE
    val intent =
      Intent(context, TimerAlertReceiver::class.java).apply {
        action = ACTION_PLAY
        putExtra(EXTRA_SOUND_ID, soundId)
        putExtra(EXTRA_VIBRATION_ENABLED, vibrationEnabled)
        putExtra(EXTRA_SOUND_ENABLED, soundEnabled)
        putExtra(EXTRA_DURATION_ID, durationId)
        putExtra(EXTRA_VIBRATION_PATTERN_ID, vibrationPatternId)
        putExtra(EXTRA_NOTIFICATION_TITLE, notificationTitle)
        putExtra(EXTRA_NOTIFICATION_TEXT, notificationText)
        putExtra(EXTRA_NOTIFICATION_CHANNEL_NAME, notificationChannelName)
        putExtra(EXTRA_TIMEKEEPING_FINISHED_TITLE, timekeepingFinishedTitle)
        putExtra(EXTRA_TIMEKEEPING_FINISHED_TEXT, timekeepingFinishedText)
        putExtra(EXTRA_TIMEKEEPING_CHANNEL_NAME, timekeepingChannelName)
      }

    return PendingIntent.getBroadcast(context, REQUEST_CODE, intent, flags)
  }
}
