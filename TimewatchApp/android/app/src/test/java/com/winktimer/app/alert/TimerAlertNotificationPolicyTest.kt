package com.winktimer.app.alert

import android.app.NotificationManager
import org.junit.Assert.assertEquals
import org.junit.Assert.assertNotEquals
import org.junit.Test

class TimerAlertNotificationPolicyTest {
  @Test
  fun alarmAlertsUseDedicatedHighImportanceChannel() {
    assertEquals(
      "winktimer_alarm_alerts_v2",
      TimerAlertNotificationPolicy.getChannelId(
        TimerAlertService.ALERT_OWNER_ALARM,
      ),
    )
    assertEquals(
      NotificationManager.IMPORTANCE_HIGH,
      TimerAlertNotificationPolicy.getChannelImportance(
        TimerAlertService.ALERT_OWNER_ALARM,
      ),
    )
  }

  @Test
  fun timerAlertsKeepSeparateLowImportanceForegroundChannel() {
    assertNotEquals(
      TimerAlertNotificationPolicy.getChannelId(
        TimerAlertService.ALERT_OWNER_ALARM,
      ),
      TimerAlertNotificationPolicy.getChannelId(
        TimerAlertService.ALERT_OWNER_TIMER,
      ),
    )
    assertEquals(
      NotificationManager.IMPORTANCE_LOW,
      TimerAlertNotificationPolicy.getChannelImportance(
        TimerAlertService.ALERT_OWNER_TIMER,
      ),
    )
  }
}
