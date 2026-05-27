package com.winktimer.app.alert

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class TimerAlertReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != TimerAlertScheduler.ACTION_PLAY) {
      return
    }

    showTimerFinishedNotification(context, intent)

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
          ?: "seconds:4",
        intent.getStringExtra(TimerAlertScheduler.EXTRA_VIBRATION_PATTERN_ID)
          ?: "double",
        intent.getStringExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_TITLE)
          ?: "Timer alert",
        intent.getStringExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_TEXT)
          ?: "Timer finished",
        intent.getStringExtra(
          TimerAlertScheduler.EXTRA_NOTIFICATION_CHANNEL_NAME,
        ) ?: "Timer alerts",
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

  private fun showTimerFinishedNotification(context: Context, intent: Intent) {
    val notificationText =
      intent.getStringExtra(TimerAlertScheduler.EXTRA_TIMEKEEPING_FINISHED_TEXT)
        ?: intent.getStringExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_TEXT)
        ?: "Timer finished"

    TimekeepingNotification.show(
      context.applicationContext,
      "timer",
      System.currentTimeMillis(),
      countDown = false,
      isRunning = false,
      displayText = notificationText,
      title =
        intent.getStringExtra(
          TimerAlertScheduler.EXTRA_TIMEKEEPING_FINISHED_TITLE,
        ) ?: "Timer",
      text = notificationText,
      channelName =
        intent.getStringExtra(TimerAlertScheduler.EXTRA_TIMEKEEPING_CHANNEL_NAME)
          ?: "Background time",
    )
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
        ?: "seconds:4",
      intent.getStringExtra(TimerAlertScheduler.EXTRA_VIBRATION_PATTERN_ID)
        ?: "double",
    )
  }
}
