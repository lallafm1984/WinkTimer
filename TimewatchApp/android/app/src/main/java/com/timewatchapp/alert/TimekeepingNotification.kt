package com.timewatchapp.alert

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.timewatchapp.MainActivity

object TimekeepingNotification {
  private const val CHANNEL_ID = "timewatch_background_timekeeping"
  private const val NOTIFICATION_ID = 9301

  @SuppressLint("MissingPermission")
  fun show(
    context: Context,
    mode: String,
    whenMs: Long,
    countDown: Boolean,
    isRunning: Boolean,
    displayText: String,
  ) {
    createNotificationChannel(context)

    val safeDisplayText = displayText.trim()
    val builder =
      NotificationCompat.Builder(context, CHANNEL_ID)
        .setContentTitle(getTitle(mode))
        .setContentText(getText(mode, isRunning, safeDisplayText))
        .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
        .setCategory(NotificationCompat.CATEGORY_STATUS)
        .setPriority(NotificationCompat.PRIORITY_LOW)
        .setVisibility(NotificationCompat.VISIBILITY_PUBLIC)
        .setOngoing(true)
        .setOnlyAlertOnce(true)
        .setSilent(true)
        .setLocalOnly(true)
        .setWhen(whenMs)
        .setRequestPromotedOngoing(true)
        .setContentIntent(createOpenAppPendingIntent(context))

    if (isRunning) {
      builder
        .setShowWhen(true)
        .setUsesChronometer(true)
        .setChronometerCountDown(countDown)
    } else {
      builder
        .setShowWhen(false)
        .setUsesChronometer(false)
        .setShortCriticalText(safeDisplayText)
    }

    val notification = builder.build()

    try {
      NotificationManagerCompat.from(context).notify(
        NOTIFICATION_ID,
        notification,
      )
    } catch (_: SecurityException) {
      // Android 13+ hides non-exempt notifications until POST_NOTIFICATIONS is granted.
    }
  }

  fun hide(context: Context) {
    NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
  }

  private fun createOpenAppPendingIntent(context: Context): PendingIntent =
    PendingIntent.getActivity(
      context,
      0,
      Intent(context, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
      },
      PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
    )

  private fun createNotificationChannel(context: Context) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val notificationManager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        ?: return

    if (notificationManager.getNotificationChannel(CHANNEL_ID) != null) {
      return
    }

    val channel =
      NotificationChannel(
        CHANNEL_ID,
        "Background time",
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        setSound(null, null)
        enableVibration(false)
      }

    notificationManager.createNotificationChannel(channel)
  }

  private fun getTitle(mode: String): String = getModeName(mode)

  private fun getText(
    mode: String,
    isRunning: Boolean,
    displayText: String,
  ): String =
    if (isRunning) {
      if (mode == "timer") {
        "Remaining time is shown in the status area"
      } else {
        "Elapsed time is shown in the status area"
      }
    } else if (displayText.isNotEmpty()) {
      "Paused at $displayText"
    } else {
      "Paused"
    }

  private fun getModeName(mode: String): String =
    if (mode == "timer") {
      "Timer"
    } else {
      "Stopwatch"
    }
}
