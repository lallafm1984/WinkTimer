package com.winktimer.app.alert

object AlarmAlertSchedulingPolicy {
  const val SCHEDULE_MODE_ALARM_CLOCK = "alarmClock"
  const val SCHEDULE_MODE_ALLOW_WHILE_IDLE = "allowWhileIdle"

  fun getScheduleMode(
    isExactAlarmPermissionRequired: Boolean,
    canScheduleExactAlarms: Boolean,
  ): String =
    if (isExactAlarmPermissionRequired && !canScheduleExactAlarms) {
      SCHEDULE_MODE_ALLOW_WHILE_IDLE
    } else {
      SCHEDULE_MODE_ALARM_CLOCK
    }
}
