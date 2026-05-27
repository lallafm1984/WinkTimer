package com.winktimer.app.alert

import org.junit.Assert.assertEquals
import org.junit.Test

class TimerAlertVibrationPolicyTest {
  @Test
  fun finiteAlertDurationsDoNotUsePlatformInfiniteRepeat() {
    assertEquals(
      -1,
      TimerAlertVibrationPolicy.getRepeatIndex(4000L),
    )
  }

  @Test
  fun untilStoppedAlertsRepeatVibrationUntilManuallyStopped() {
    assertEquals(
      0,
      TimerAlertVibrationPolicy.getRepeatIndex(null),
    )
  }
}
