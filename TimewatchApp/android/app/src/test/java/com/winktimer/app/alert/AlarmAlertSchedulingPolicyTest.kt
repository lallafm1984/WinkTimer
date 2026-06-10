package com.winktimer.app.alert

import org.junit.Assert.assertEquals
import org.junit.Test

class AlarmAlertSchedulingPolicyTest {
  @Test
  fun userVisibleAlarmsUseAlarmClockSchedulingWhenExactAlarmsAreAllowed() {
    assertEquals(
      AlarmAlertSchedulingPolicy.SCHEDULE_MODE_ALARM_CLOCK,
      AlarmAlertSchedulingPolicy.getScheduleMode(
        isExactAlarmPermissionRequired = true,
        canScheduleExactAlarms = true,
      ),
    )
  }

  @Test
  fun userVisibleAlarmsFallBackWhenExactAlarmsAreDenied() {
    assertEquals(
      AlarmAlertSchedulingPolicy.SCHEDULE_MODE_ALLOW_WHILE_IDLE,
      AlarmAlertSchedulingPolicy.getScheduleMode(
        isExactAlarmPermissionRequired = true,
        canScheduleExactAlarms = false,
      ),
    )
  }

  @Test
  fun userVisibleAlarmsUseAlarmClockSchedulingBeforeExactAlarmPermissionExists() {
    assertEquals(
      AlarmAlertSchedulingPolicy.SCHEDULE_MODE_ALARM_CLOCK,
      AlarmAlertSchedulingPolicy.getScheduleMode(
        isExactAlarmPermissionRequired = false,
        canScheduleExactAlarms = false,
      ),
    )
  }
}
