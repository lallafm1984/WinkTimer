package com.winktimer.app.alert

import android.annotation.SuppressLint
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.content.Context
import android.content.Intent
import android.os.Build
import androidx.core.app.NotificationCompat
import androidx.core.app.NotificationManagerCompat
import com.winktimer.app.MainActivity

object TimekeepingNotification {
  private const val CHANNEL_ID = "winktimer_background_timekeeping"
  private const val NOTIFICATION_ID = 9301

  @SuppressLint("MissingPermission")
  fun show(
    context: Context,
    mode: String,
    whenMs: Long,
    countDown: Boolean,
    isRunning: Boolean,
    displayText: String,
    title: String,
    text: String,
    channelName: String,
  ) {
    createNotificationChannel(context, channelName)

    val safeDisplayText = displayText.trim()
    val safeTitle = title.trim().ifEmpty { getTitle(mode) }
    val safeText = text.trim().ifEmpty { getText(mode, isRunning, safeDisplayText) }
    val builder =
      NotificationCompat.Builder(context, CHANNEL_ID)
        .setContentTitle(safeTitle)
        .setContentText(safeText)
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
        .setBadgeIconType(NotificationCompat.BADGE_ICON_NONE)
        .setNumber(0)
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

  private fun createNotificationChannel(context: Context, channelName: String) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val notificationManager =
      context.getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        ?: return

    notificationManager.getNotificationChannel(CHANNEL_ID)?.let { channel ->
      channel.setShowBadge(false)
      notificationManager.createNotificationChannel(channel)
      return
    }

    val channel =
      NotificationChannel(
        CHANNEL_ID,
        channelName.trim().ifEmpty { "Background time" },
        NotificationManager.IMPORTANCE_LOW,
      ).apply {
        setSound(null, null)
        enableVibration(false)
        setShowBadge(false)
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
