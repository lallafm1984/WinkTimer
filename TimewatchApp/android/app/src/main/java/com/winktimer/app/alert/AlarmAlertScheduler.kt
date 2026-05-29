package com.winktimer.app.alert

import android.app.AlarmManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import java.util.Calendar

object AlarmAlertScheduler {
  const val ACTION_PLAY = "com.winktimer.app.alert.PLAY_SCHEDULED_ALARM"
  const val EXTRA_ALARM_ID = "alarmId"
  const val EXTRA_HOUR = "hour"
  const val EXTRA_MINUTE = "minute"
  const val EXTRA_SCHEDULE_KIND = "scheduleKind"
  const val EXTRA_WEEKDAYS_CSV = "weekdaysCsv"
  const val EXTRA_DATES_CSV = "datesCsv"
  const val EXTRA_IS_SNOOZE = "isSnooze"

  private const val REQUEST_CODE_BASE = 120_000
  private const val DEFAULT_DURATION_ID = "untilStopped"
  private const val DEFAULT_VIBRATION_PATTERN_ID = "longRepeat"

  fun schedule(
    context: Context,
    alarmId: String,
    triggerAtMs: Long,
    hour: Int,
    minute: Int,
    scheduleKind: String,
    weekdaysCsv: String,
    datesCsv: String,
    soundId: String,
    vibrationEnabled: Boolean,
    soundEnabled: Boolean,
    soundVolume: Float,
    notificationTitle: String,
    notificationText: String,
    notificationChannelName: String,
  ) {
    if (!vibrationEnabled && !soundEnabled) {
      cancel(context, alarmId)
      return
    }

    val alarmManager =
      context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        ?: return
    val pendingIntent =
      createPendingIntent(
        context,
        alarmId,
        hour,
        minute,
        scheduleKind,
        weekdaysCsv,
        datesCsv,
        soundId,
        vibrationEnabled,
        soundEnabled,
        soundVolume,
        notificationTitle,
        notificationText,
        notificationChannelName,
        isSnooze = false,
        PendingIntent.FLAG_UPDATE_CURRENT,
      ) ?: return

    schedulePendingIntent(
      alarmManager,
      triggerAtMs.coerceAtLeast(System.currentTimeMillis()),
      pendingIntent,
    )
  }

  fun cancel(context: Context, alarmId: String) {
    val alarmManager =
      context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        ?: return
    val pendingIntent =
      createPendingIntent(
        context,
        alarmId,
        hour = 0,
        minute = 0,
        scheduleKind = "daily",
        weekdaysCsv = "",
        datesCsv = "",
        soundId = "alarm",
        vibrationEnabled = true,
        soundEnabled = true,
        soundVolume = TimerAlertPlayback.DEFAULT_ALARM_VOLUME_RATIO,
        notificationTitle = "Alarm",
        notificationText = "Alarm",
        notificationChannelName = "Alarm alerts",
        isSnooze = false,
        PendingIntent.FLAG_NO_CREATE,
      ) ?: return

    alarmManager.cancel(pendingIntent)
    pendingIntent.cancel()
    cancelSnooze(context, alarmId)
  }

  fun scheduleSnooze(
    context: Context,
    alarmId: String,
    triggerAtMs: Long,
    soundId: String,
    vibrationEnabled: Boolean,
    soundEnabled: Boolean,
    soundVolume: Float,
    notificationTitle: String,
    notificationText: String,
    notificationChannelName: String,
  ) {
    if (!vibrationEnabled && !soundEnabled) {
      return
    }

    val alarmManager =
      context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        ?: return
    val pendingIntent =
      createPendingIntent(
        context,
        alarmId,
        hour = 0,
        minute = 0,
        scheduleKind = "snooze",
        weekdaysCsv = "",
        datesCsv = "",
        soundId,
        vibrationEnabled,
        soundEnabled,
        soundVolume,
        notificationTitle,
        notificationText,
        notificationChannelName,
        isSnooze = true,
        PendingIntent.FLAG_UPDATE_CURRENT,
      ) ?: return

    schedulePendingIntent(
      alarmManager,
      triggerAtMs.coerceAtLeast(System.currentTimeMillis()),
      pendingIntent,
    )
  }

  private fun cancelSnooze(context: Context, alarmId: String) {
    val alarmManager =
      context.getSystemService(Context.ALARM_SERVICE) as? AlarmManager
        ?: return
    val pendingIntent =
      createPendingIntent(
        context,
        alarmId,
        hour = 0,
        minute = 0,
        scheduleKind = "snooze",
        weekdaysCsv = "",
        datesCsv = "",
        soundId = "alarm",
        vibrationEnabled = true,
        soundEnabled = true,
        soundVolume = TimerAlertPlayback.DEFAULT_ALARM_VOLUME_RATIO,
        notificationTitle = "Alarm",
        notificationText = "Alarm",
        notificationChannelName = "Alarm alerts",
        isSnooze = true,
        PendingIntent.FLAG_NO_CREATE,
      ) ?: return

    alarmManager.cancel(pendingIntent)
    pendingIntent.cancel()
  }

  fun rescheduleNext(context: Context, intent: Intent) {
    val alarmId = intent.getStringExtra(EXTRA_ALARM_ID) ?: return
    val hour = intent.getIntExtra(EXTRA_HOUR, 7)
    val minute = intent.getIntExtra(EXTRA_MINUTE, 0)
    val scheduleKind = intent.getStringExtra(EXTRA_SCHEDULE_KIND) ?: "daily"
    val weekdaysCsv = intent.getStringExtra(EXTRA_WEEKDAYS_CSV) ?: ""
    val datesCsv = intent.getStringExtra(EXTRA_DATES_CSV) ?: ""
    val nextTriggerAtMs =
      getNextTriggerAtMs(
        hour,
        minute,
        scheduleKind,
        weekdaysCsv,
        datesCsv,
        System.currentTimeMillis() + 1000L,
      ) ?: return

    schedule(
      context,
      alarmId,
      nextTriggerAtMs,
      hour,
      minute,
      scheduleKind,
      weekdaysCsv,
      datesCsv,
      intent.getStringExtra(TimerAlertScheduler.EXTRA_SOUND_ID) ?: "alarm",
      intent.getBooleanExtra(
        TimerAlertScheduler.EXTRA_VIBRATION_ENABLED,
        true,
      ),
      intent.getBooleanExtra(TimerAlertScheduler.EXTRA_SOUND_ENABLED, true),
      intent.getFloatExtra(
        TimerAlertScheduler.EXTRA_SOUND_VOLUME,
        TimerAlertPlayback.DEFAULT_ALARM_VOLUME_RATIO,
      ),
      intent.getStringExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_TITLE)
        ?: "Alarm",
      intent.getStringExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_TEXT)
        ?: "Alarm",
      intent.getStringExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_CHANNEL_NAME)
        ?: "Alarm alerts",
    )
  }

  private fun schedulePendingIntent(
    alarmManager: AlarmManager,
    triggerAtMs: Long,
    pendingIntent: PendingIntent,
  ) {
    when {
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.S &&
        !alarmManager.canScheduleExactAlarms() ->
        alarmManager.setAndAllowWhileIdle(
          AlarmManager.RTC_WAKEUP,
          triggerAtMs,
          pendingIntent,
        )
      Build.VERSION.SDK_INT >= Build.VERSION_CODES.M ->
        alarmManager.setExactAndAllowWhileIdle(
          AlarmManager.RTC_WAKEUP,
          triggerAtMs,
          pendingIntent,
        )
      else ->
        alarmManager.setExact(
          AlarmManager.RTC_WAKEUP,
          triggerAtMs,
          pendingIntent,
        )
    }
  }

  private fun createPendingIntent(
    context: Context,
    alarmId: String,
    hour: Int,
    minute: Int,
    scheduleKind: String,
    weekdaysCsv: String,
    datesCsv: String,
    soundId: String,
    vibrationEnabled: Boolean,
    soundEnabled: Boolean,
    soundVolume: Float,
    notificationTitle: String,
    notificationText: String,
    notificationChannelName: String,
    isSnooze: Boolean,
    baseFlag: Int,
  ): PendingIntent? {
    val flags = baseFlag or PendingIntent.FLAG_IMMUTABLE
    val intent =
      Intent(context, AlarmAlertReceiver::class.java).apply {
        action = ACTION_PLAY
        putExtra(EXTRA_ALARM_ID, alarmId)
        putExtra(EXTRA_HOUR, hour)
        putExtra(EXTRA_MINUTE, minute)
        putExtra(EXTRA_SCHEDULE_KIND, scheduleKind)
        putExtra(EXTRA_WEEKDAYS_CSV, weekdaysCsv)
        putExtra(EXTRA_DATES_CSV, datesCsv)
        putExtra(EXTRA_IS_SNOOZE, isSnooze)
        putExtra(TimerAlertScheduler.EXTRA_SOUND_ID, soundId)
        putExtra(TimerAlertScheduler.EXTRA_VIBRATION_ENABLED, vibrationEnabled)
        putExtra(TimerAlertScheduler.EXTRA_SOUND_ENABLED, soundEnabled)
        putExtra(TimerAlertScheduler.EXTRA_SOUND_VOLUME, soundVolume)
        putExtra(TimerAlertScheduler.EXTRA_DURATION_ID, DEFAULT_DURATION_ID)
        putExtra(
          TimerAlertScheduler.EXTRA_VIBRATION_PATTERN_ID,
          DEFAULT_VIBRATION_PATTERN_ID,
        )
        putExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_TITLE, notificationTitle)
        putExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_TEXT, notificationText)
        putExtra(
          TimerAlertScheduler.EXTRA_NOTIFICATION_CHANNEL_NAME,
          notificationChannelName,
        )
      }

    return PendingIntent.getBroadcast(
      context,
      getRequestCode(alarmId, isSnooze),
      intent,
      flags,
    )
  }

  private fun getRequestCode(alarmId: String, isSnooze: Boolean): Int =
    REQUEST_CODE_BASE +
      ((if (isSnooze) "$alarmId:snooze" else alarmId).hashCode() and
        0x0FFFFFFF)

  private fun getNextTriggerAtMs(
    hour: Int,
    minute: Int,
    scheduleKind: String,
    weekdaysCsv: String,
    datesCsv: String,
    afterMs: Long,
  ): Long? =
    when (scheduleKind) {
      "weekly" -> getNextWeeklyTriggerAtMs(hour, minute, weekdaysCsv, afterMs)
      "dates" -> getNextDateTriggerAtMs(hour, minute, datesCsv, afterMs)
      else -> getNextDailyTriggerAtMs(hour, minute, afterMs)
    }

  private fun getNextDailyTriggerAtMs(
    hour: Int,
    minute: Int,
    afterMs: Long,
  ): Long {
    val candidate = createCandidateCalendar(afterMs, hour, minute)

    if (candidate.timeInMillis <= afterMs) {
      candidate.add(Calendar.DATE, 1)
    }

    return candidate.timeInMillis
  }

  private fun getNextWeeklyTriggerAtMs(
    hour: Int,
    minute: Int,
    weekdaysCsv: String,
    afterMs: Long,
  ): Long {
    val weekdays = parseCsvNumbers(weekdaysCsv).filter { it in 0..6 }
    if (weekdays.isEmpty()) {
      return getNextDailyTriggerAtMs(hour, minute, afterMs)
    }

    return weekdays.minOf { weekday ->
      val base = Calendar.getInstance().apply { timeInMillis = afterMs }
      val currentWeekday = base.get(Calendar.DAY_OF_WEEK) - 1
      val daysUntilWeekday = (weekday - currentWeekday + 7) % 7
      val candidate = createCandidateCalendar(afterMs, hour, minute)

      candidate.add(Calendar.DATE, daysUntilWeekday)
      if (candidate.timeInMillis <= afterMs) {
        candidate.add(Calendar.DATE, 7)
      }

      candidate.timeInMillis
    }
  }

  private fun getNextDateTriggerAtMs(
    hour: Int,
    minute: Int,
    datesCsv: String,
    afterMs: Long,
  ): Long? =
    datesCsv
      .split(",")
      .mapNotNull { getDateTriggerAtMs(it, hour, minute) }
      .filter { it > afterMs }
      .minOrNull()

  private fun getDateTriggerAtMs(
    isoDate: String,
    hour: Int,
    minute: Int,
  ): Long? {
    val parts = isoDate.split("-").mapNotNull { it.toIntOrNull() }
    if (parts.size != 3) {
      return null
    }

    val calendar =
      Calendar.getInstance().apply {
        isLenient = false
        set(Calendar.YEAR, parts[0])
        set(Calendar.MONTH, parts[1] - 1)
        set(Calendar.DAY_OF_MONTH, parts[2])
        set(Calendar.HOUR_OF_DAY, hour)
        set(Calendar.MINUTE, minute)
        set(Calendar.SECOND, 0)
        set(Calendar.MILLISECOND, 0)
      }

    return try {
      calendar.timeInMillis
    } catch (_: IllegalArgumentException) {
      null
    }
  }

  private fun createCandidateCalendar(
    afterMs: Long,
    hour: Int,
    minute: Int,
  ): Calendar =
    Calendar.getInstance().apply {
      timeInMillis = afterMs
      set(Calendar.HOUR_OF_DAY, hour)
      set(Calendar.MINUTE, minute)
      set(Calendar.SECOND, 0)
      set(Calendar.MILLISECOND, 0)
    }

  private fun parseCsvNumbers(value: String): List<Int> =
    value
      .split(",")
      .mapNotNull { it.trim().toIntOrNull() }
}
