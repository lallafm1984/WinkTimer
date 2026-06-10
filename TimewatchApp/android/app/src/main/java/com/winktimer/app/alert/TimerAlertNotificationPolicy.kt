package com.winktimer.app.alert

import android.app.Notification
import android.app.NotificationManager

object TimerAlertNotificationPolicy {
  private const val TIMER_CHANNEL_ID = "winktimer_timer_alerts"
  private const val ALARM_CHANNEL_ID = "winktimer_alarm_alerts_v2"

  fun getChannelId(alertOwner: String): String =
    if (alertOwner == TimerAlertService.ALERT_OWNER_ALARM) {
      ALARM_CHANNEL_ID
    } else {
      TIMER_CHANNEL_ID
    }

  fun getChannelImportance(alertOwner: String): Int =
    if (alertOwner == TimerAlertService.ALERT_OWNER_ALARM) {
      NotificationManager.IMPORTANCE_HIGH
    } else {
      NotificationManager.IMPORTANCE_LOW
    }

  fun getNotificationPriority(alertOwner: String): Int =
    if (alertOwner == TimerAlertService.ALERT_OWNER_ALARM) {
      Notification.PRIORITY_HIGH
    } else {
      Notification.PRIORITY_LOW
    }
}
