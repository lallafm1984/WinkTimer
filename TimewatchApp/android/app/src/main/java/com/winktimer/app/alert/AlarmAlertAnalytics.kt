package com.winktimer.app.alert

import android.content.Context
import android.content.Intent
import android.os.Bundle
import com.google.firebase.analytics.FirebaseAnalytics

object AlarmAlertAnalytics {
  private const val EVENT_NAME = "wt_alarm_fire"

  fun createAlarmFireParams(
    isSnooze: Boolean,
    soundEnabled: Boolean,
    vibrationEnabled: Boolean,
    durationId: String,
  ): Map<String, Any> =
    mapOf(
      "source" to "alarm",
      "is_snooze" to if (isSnooze) 1L else 0L,
      "sound_enabled" to if (soundEnabled) 1L else 0L,
      "vibration_enabled" to if (vibrationEnabled) 1L else 0L,
      "duration_id" to durationId,
    )

  fun logAlarmFire(context: Context, intent: Intent) {
    FirebaseAnalytics.getInstance(context).logEvent(
      EVENT_NAME,
      createBundle(
        createAlarmFireParams(
          isSnooze =
            intent.getBooleanExtra(AlarmAlertScheduler.EXTRA_IS_SNOOZE, false),
          soundEnabled =
            intent.getBooleanExtra(
              TimerAlertScheduler.EXTRA_SOUND_ENABLED,
              true,
            ),
          vibrationEnabled =
            intent.getBooleanExtra(
              TimerAlertScheduler.EXTRA_VIBRATION_ENABLED,
              true,
            ),
          durationId =
            intent.getStringExtra(TimerAlertScheduler.EXTRA_DURATION_ID)
              ?: "seconds:20",
        ),
      ),
    )
  }

  private fun createBundle(params: Map<String, Any>) =
    Bundle().apply {
      params.forEach { (key, value) ->
        when (value) {
          is String -> putString(key, value)
          is Long -> putLong(key, value)
          is Int -> putLong(key, value.toLong())
          is Double -> putDouble(key, value)
          is Float -> putDouble(key, value.toDouble())
        }
      }
    }
}
