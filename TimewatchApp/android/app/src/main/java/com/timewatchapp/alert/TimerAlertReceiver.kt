package com.timewatchapp.alert

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.os.Build

class TimerAlertReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (intent.action != TimerAlertScheduler.ACTION_PLAY) {
      return
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
          ?: "seconds:4",
        intent.getStringExtra(TimerAlertScheduler.EXTRA_VIBRATION_PATTERN_ID)
          ?: "double",
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
        ?: "seconds:4",
      intent.getStringExtra(TimerAlertScheduler.EXTRA_VIBRATION_PATTERN_ID)
        ?: "double",
    )
  }
}
