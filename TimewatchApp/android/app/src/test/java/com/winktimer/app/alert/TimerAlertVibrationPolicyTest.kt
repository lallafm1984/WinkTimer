package com.winktimer.app.alert

import org.junit.Assert.assertEquals
import org.junit.Assert.assertArrayEquals
import org.junit.Assert.assertTrue
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
  fun finiteAlertDurationsExpandPatternAcrossTheAlertWindow() {
    val basePattern = longArrayOf(0L, 450L, 160L, 450L, 160L)

    val expandedPattern =
      TimerAlertVibrationPolicy.buildPatternForDuration(
        basePattern,
        2000L,
      )

    assertTrue(expandedPattern.size > basePattern.size)
    assertTrue(expandedPattern.sum() >= 2000L)
    assertArrayEquals(
      longArrayOf(0L, 450L, 160L, 450L, 160L, 450L, 160L, 450L),
      expandedPattern,
    )
  }

  @Test
  fun untilStoppedAlertsRepeatVibrationUntilManuallyStopped() {
    assertEquals(
      0,
      TimerAlertVibrationPolicy.getRepeatIndex(null),
    )
  }

  @Test
  fun untilStoppedAlertsKeepBasePatternForPlatformRepeat() {
    val basePattern = longArrayOf(0L, 450L, 160L, 450L, 160L)

    assertArrayEquals(
      basePattern,
      TimerAlertVibrationPolicy.buildPatternForDuration(basePattern, null),
    )
  }

  @Test
  fun vibrationAmplitudesUseFullStrengthOnlyForVibrateSegments() {
    assertArrayEquals(
      intArrayOf(0, 255, 0, 255, 0),
      TimerAlertVibrationPolicy.buildAmplitudePattern(
        longArrayOf(0L, 450L, 160L, 450L, 160L),
      ),
    )
  }
}
