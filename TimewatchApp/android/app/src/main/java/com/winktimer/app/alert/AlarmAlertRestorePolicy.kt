package com.winktimer.app.alert

data class PersistedAlarmAlert(
  val alarmId: String,
  val hour: Int,
  val minute: Int,
  val scheduleKind: String,
  val weekdaysCsv: String,
  val datesCsv: String,
  val soundId: String,
  val vibrationEnabled: Boolean,
  val soundEnabled: Boolean,
  val soundVolume: Float,
  val notificationTitle: String,
  val notificationText: String,
  val notificationChannelName: String,
)

data class RestoredAlarmAlert(
  val alarm: PersistedAlarmAlert,
  val triggerAtMs: Long,
)

data class AlarmAlertRestorePlan(
  val alarmsToSchedule: List<RestoredAlarmAlert>,
  val alarmIdsToRemove: List<String>,
)

object AlarmAlertRestorePolicy {
  fun createRestorePlan(
    alarms: List<PersistedAlarmAlert>,
    afterMs: Long,
  ): AlarmAlertRestorePlan {
    val alarmsToSchedule = mutableListOf<RestoredAlarmAlert>()
    val alarmIdsToRemove = mutableListOf<String>()

    alarms.forEach { alarm ->
      if (!alarm.vibrationEnabled && !alarm.soundEnabled) {
        alarmIdsToRemove.add(alarm.alarmId)
        return@forEach
      }

      val triggerAtMs =
        AlarmAlertScheduler.getNextTriggerAtMs(
          alarm.hour,
          alarm.minute,
          alarm.scheduleKind,
          alarm.weekdaysCsv,
          alarm.datesCsv,
          afterMs,
        )

      if (triggerAtMs == null) {
        alarmIdsToRemove.add(alarm.alarmId)
      } else {
        alarmsToSchedule.add(RestoredAlarmAlert(alarm, triggerAtMs))
      }
    }

    return AlarmAlertRestorePlan(alarmsToSchedule, alarmIdsToRemove)
  }
}
