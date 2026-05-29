package com.winktimer.app.alert

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class AlarmAlertReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != AlarmAlertScheduler.ACTION_PLAY) {
      return
    }

    if (!intent.getBooleanExtra(AlarmAlertScheduler.EXTRA_IS_SNOOZE, false)) {
      AlarmAlertScheduler.rescheduleNext(context, intent)
    }

    val serviceIntent =
      TimerAlertService.createPlayIntent(
        context,
        intent.getStringExtra(TimerAlertScheduler.EXTRA_SOUND_ID) ?: "alarm",
        intent.getBooleanExtra(
          TimerAlertScheduler.EXTRA_VIBRATION_ENABLED,
          true,
        ),
        intent.getBooleanExtra(TimerAlertScheduler.EXTRA_SOUND_ENABLED, true),
        intent.getStringExtra(TimerAlertScheduler.EXTRA_DURATION_ID)
          ?: "seconds:20",
        intent.getStringExtra(TimerAlertScheduler.EXTRA_VIBRATION_PATTERN_ID)
          ?: "longRepeat",
        intent.getStringExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_TITLE)
          ?: "Alarm",
        intent.getStringExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_TEXT)
          ?: "Alarm",
        intent.getStringExtra(
          TimerAlertScheduler.EXTRA_NOTIFICATION_CHANNEL_NAME,
        ) ?: "Alarm alerts",
        TimerAlertService.ALERT_OWNER_ALARM,
        intent.getStringExtra(AlarmAlertScheduler.EXTRA_ALARM_ID),
        intent.getFloatExtra(
          TimerAlertScheduler.EXTRA_SOUND_VOLUME,
          TimerAlertPlayback.DEFAULT_ALARM_VOLUME_RATIO,
        ),
      )

    try {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        context.startForegroundService(serviceIntent)
      } else {
        context.startService(serviceIntent)
      }
    } catch (_: IllegalStateException) {
      playWithoutService(context, intent)
    } catch (_: SecurityException) {
      playWithoutService(context, intent)
    }
  }

  private fun playWithoutService(context: Context, intent: Intent) {
    TimerAlertPlayback.play(
      context.applicationContext,
      intent.getStringExtra(TimerAlertScheduler.EXTRA_SOUND_ID) ?: "alarm",
      intent.getBooleanExtra(
        TimerAlertScheduler.EXTRA_VIBRATION_ENABLED,
        true,
      ),
      intent.getBooleanExtra(TimerAlertScheduler.EXTRA_SOUND_ENABLED, true),
      intent.getStringExtra(TimerAlertScheduler.EXTRA_DURATION_ID)
        ?: "seconds:20",
      intent.getStringExtra(TimerAlertScheduler.EXTRA_VIBRATION_PATTERN_ID)
        ?: "longRepeat",
      TimerAlertService.ALERT_OWNER_ALARM,
      intent.getFloatExtra(
        TimerAlertScheduler.EXTRA_SOUND_VOLUME,
        TimerAlertPlayback.DEFAULT_ALARM_VOLUME_RATIO,
      ),
    )
  }
}
