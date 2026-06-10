package com.winktimer.app.alert

import java.util.Calendar
import org.junit.Assert.assertEquals
import org.junit.Assert.assertTrue
import org.junit.Test

class AlarmAlertRestorePolicyTest {
  @Test
  fun restorePlanSchedulesDailyAlarmsAtTheNextMatchingTime() {
    val alarm =
      createPersistedAlarm(
        alarmId = "morning",
        hour = 7,
        minute = 30,
        scheduleKind = "daily",
      )

    val plan =
      AlarmAlertRestorePolicy.createRestorePlan(
        listOf(alarm),
        getLocalTimeMs(2026, Calendar.MAY, 30, 8, 0),
      )

    assertEquals(emptyList<String>(), plan.alarmIdsToRemove)
    assertEquals(1, plan.alarmsToSchedule.size)
    assertEquals("morning", plan.alarmsToSchedule[0].alarm.alarmId)
    assertEquals(
      getLocalTimeMs(2026, Calendar.MAY, 31, 7, 30),
      plan.alarmsToSchedule[0].triggerAtMs,
    )
  }

  @Test
  fun restorePlanRemovesExpiredDateAlarms() {
    val alarm =
      createPersistedAlarm(
        alarmId = "past-date",
        hour = 7,
        minute = 30,
        scheduleKind = "dates",
        datesCsv = "2026-05-29",
      )

    val plan =
      AlarmAlertRestorePolicy.createRestorePlan(
        listOf(alarm),
        getLocalTimeMs(2026, Calendar.MAY, 30, 8, 0),
      )

    assertTrue(plan.alarmsToSchedule.isEmpty())
    assertEquals(listOf("past-date"), plan.alarmIdsToRemove)
  }

  @Test
  fun restorePlanRemovesAlarmsWithNoSoundOrVibration() {
    val alarm =
      createPersistedAlarm(
        alarmId = "silent",
        soundEnabled = false,
        vibrationEnabled = false,
      )

    val plan =
      AlarmAlertRestorePolicy.createRestorePlan(
        listOf(alarm),
        getLocalTimeMs(2026, Calendar.MAY, 30, 8, 0),
      )

    assertTrue(plan.alarmsToSchedule.isEmpty())
    assertEquals(listOf("silent"), plan.alarmIdsToRemove)
  }

  @Test
  fun restorePlanKeepsVibrationOnlyAlarms() {
    val alarm =
      createPersistedAlarm(
        alarmId = "vibration-only",
        hour = 7,
        minute = 15,
        soundEnabled = false,
        vibrationEnabled = true,
      )

    val plan =
      AlarmAlertRestorePolicy.createRestorePlan(
        listOf(alarm),
        getLocalTimeMs(2026, Calendar.MAY, 30, 8, 0),
      )

    assertEquals(emptyList<String>(), plan.alarmIdsToRemove)
    assertEquals(1, plan.alarmsToSchedule.size)
    assertEquals(false, plan.alarmsToSchedule[0].alarm.soundEnabled)
    assertEquals(true, plan.alarmsToSchedule[0].alarm.vibrationEnabled)
    assertEquals(
      getLocalTimeMs(2026, Calendar.MAY, 31, 7, 15),
      plan.alarmsToSchedule[0].triggerAtMs,
    )
  }

  private fun createPersistedAlarm(
    alarmId: String,
    hour: Int = 7,
    minute: Int = 0,
    scheduleKind: String = "daily",
    weekdaysCsv: String = "",
    datesCsv: String = "",
    soundId: String = "alarm",
    vibrationEnabled: Boolean = true,
    soundEnabled: Boolean = true,
    soundVolume: Float = TimerAlertPlayback.DEFAULT_ALARM_VOLUME_RATIO,
    notificationTitle: String = "Alarm",
    notificationText: String = "07:00",
    notificationChannelName: String = "Alarm alerts",
  ): PersistedAlarmAlert =
    PersistedAlarmAlert(
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
    )

  private fun getLocalTimeMs(
    year: Int,
    month: Int,
    day: Int,
    hour: Int,
    minute: Int,
  ): Long =
    Calendar.getInstance()
      .apply {
        clear()
        set(Calendar.YEAR, year)
        set(Calendar.MONTH, month)
        set(Calendar.DAY_OF_MONTH, day)
        set(Calendar.HOUR_OF_DAY, hour)
        set(Calendar.MINUTE, minute)
      }
      .timeInMillis
}
