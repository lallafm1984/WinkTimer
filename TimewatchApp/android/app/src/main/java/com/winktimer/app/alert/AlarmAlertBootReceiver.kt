package com.winktimer.app.alert

import android.content.BroadcastReceiver
import android.content.Context
import android.content.Intent
import android.util.Log

class AlarmAlertBootReceiver : BroadcastReceiver() {
  override fun onReceive(context: Context, intent: Intent) {
    if (!AlarmAlertBootReceiverPolicy.shouldRestoreAlarms(intent.action)) {
      return
    }

    val restorePlan =
      AlarmAlertRestorePolicy.createRestorePlan(
        AlarmAlertStore.list(context),
        System.currentTimeMillis() + 1000L,
      )

    restorePlan.alarmIdsToRemove.forEach { alarmId ->
      AlarmAlertStore.remove(context, alarmId)
    }

    restorePlan.alarmsToSchedule.forEach { restoredAlarm ->
      try {
        val alarm = restoredAlarm.alarm
        AlarmAlertScheduler.schedule(
          context,
          alarm.alarmId,
          restoredAlarm.triggerAtMs,
          alarm.hour,
          alarm.minute,
          alarm.scheduleKind,
          alarm.weekdaysCsv,
          alarm.datesCsv,
          alarm.soundId,
          alarm.vibrationEnabled,
          alarm.soundEnabled,
          alarm.soundVolume,
          alarm.notificationTitle,
          alarm.notificationText,
          alarm.notificationChannelName,
        )
      } catch (error: Exception) {
        Log.w(TAG, "Failed to restore scheduled alarm", error)
      }
    }
  }

  companion object {
    private const val TAG = "WinkTimerAlarmBoot"
  }
}

object AlarmAlertBootReceiverPolicy {
  fun shouldRestoreAlarms(action: String?): Boolean =
    action == Intent.ACTION_BOOT_COMPLETED ||
      action == Intent.ACTION_MY_PACKAGE_REPLACED
}
