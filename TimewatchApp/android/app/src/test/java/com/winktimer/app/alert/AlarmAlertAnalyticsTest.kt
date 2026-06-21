package com.winktimer.app.alert

import org.junit.Assert.assertEquals
import org.junit.Test

class AlarmAlertAnalyticsTest {
  @Test
  fun alarmFireParamsUseAnalyticsSafePrimitiveValues() {
    val params =
      AlarmAlertAnalytics.createAlarmFireParams(
        isSnooze = false,
        soundEnabled = true,
        vibrationEnabled = false,
        durationId = "seconds:20",
      )

    assertEquals(
      mapOf(
        "source" to "alarm",
        "is_snooze" to 0L,
        "sound_enabled" to 1L,
        "vibration_enabled" to 0L,
        "duration_id" to "seconds:20",
      ),
      params,
    )
  }
}
