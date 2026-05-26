package com.winktimer.app.alert

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.content.pm.ServiceInfo
import android.os.Build
import android.os.Handler
import android.os.IBinder
import android.os.Looper
import com.winktimer.app.MainActivity

class TimerAlertService : Service() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val stopRunnable = Runnable {
    stopSelf()
  }

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      stopSelf()
      return START_NOT_STICKY
    }

    if (intent?.action != ACTION_PLAY) {
      stopSelf()
      return START_NOT_STICKY
    }

    startAlertForeground()

    val soundId = intent.getStringExtra(TimerAlertScheduler.EXTRA_SOUND_ID) ?: "alarm"
    val vibrationEnabled =
      intent.getBooleanExtra(TimerAlertScheduler.EXTRA_VIBRATION_ENABLED, true)
    val soundEnabled =
      intent.getBooleanExtra(TimerAlertScheduler.EXTRA_SOUND_ENABLED, true)
    val durationId =
      intent.getStringExtra(TimerAlertScheduler.EXTRA_DURATION_ID)
        ?: "seconds:4"
    val vibrationPatternId =
      intent.getStringExtra(TimerAlertScheduler.EXTRA_VIBRATION_PATTERN_ID)
        ?: "double"

    TimerAlertPlayback.play(
      applicationContext,
      soundId,
      vibrationEnabled,
      soundEnabled,
      durationId,
      vibrationPatternId,
    )

    TimerAlertPlayback.getAlertDurationMs(durationId)?.let { durationMs ->
      mainHandler.postDelayed(stopRunnable, durationMs)
    }

    return START_NOT_STICKY
  }

  override fun onDestroy() {
    mainHandler.removeCallbacks(stopRunnable)
    TimerAlertPlayback.stop(applicationContext)
    super.onDestroy()
  }

  private fun startAlertForeground() {
    createNotificationChannel()
    val notification = createNotification()

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
      startForeground(
        NOTIFICATION_ID,
        notification,
        ServiceInfo.FOREGROUND_SERVICE_TYPE_MEDIA_PLAYBACK,
      )
    } else {
      startForeground(NOTIFICATION_ID, notification)
    }
  }

  private fun createNotification(): Notification {
    val openIntent =
      Intent(this, MainActivity::class.java).apply {
        flags = Intent.FLAG_ACTIVITY_SINGLE_TOP or Intent.FLAG_ACTIVITY_CLEAR_TOP
      }
    val openPendingIntent =
      PendingIntent.getActivity(
        this,
        0,
        openIntent,
        PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE,
      )

    val builder =
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
        Notification.Builder(this, CHANNEL_ID)
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(this)
      }

    return builder
      .setContentTitle("Timer alert")
      .setContentText("Wink Timer finished")
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setCategory(Notification.CATEGORY_ALARM)
      .setOngoing(true)
      .setContentIntent(openPendingIntent)
      .build()
  }

  private fun createNotificationChannel() {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val notificationManager =
      getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        ?: return

    if (notificationManager.getNotificationChannel(CHANNEL_ID) != null) {
      return
    }

    val channel =
      NotificationChannel(
        CHANNEL_ID,
        "Timer alerts",
        NotificationManager.IMPORTANCE_LOW,
      )

    notificationManager.createNotificationChannel(channel)
  }

  companion object {
    private const val ACTION_PLAY = "com.winktimer.app.alert.START_ALERT_SERVICE"
    private const val ACTION_STOP = "com.winktimer.app.alert.STOP_ALERT_SERVICE"
    private const val CHANNEL_ID = "winktimer_timer_alerts"
    private const val NOTIFICATION_ID = 9202

    fun createPlayIntent(
      context: Context,
      soundId: String,
      vibrationEnabled: Boolean,
      soundEnabled: Boolean,
      durationId: String,
      vibrationPatternId: String,
    ): Intent =
      Intent(context, TimerAlertService::class.java).apply {
        action = ACTION_PLAY
        putExtra(TimerAlertScheduler.EXTRA_SOUND_ID, soundId)
        putExtra(TimerAlertScheduler.EXTRA_VIBRATION_ENABLED, vibrationEnabled)
        putExtra(TimerAlertScheduler.EXTRA_SOUND_ENABLED, soundEnabled)
        putExtra(TimerAlertScheduler.EXTRA_DURATION_ID, durationId)
        putExtra(
          TimerAlertScheduler.EXTRA_VIBRATION_PATTERN_ID,
          vibrationPatternId,
        )
      }

    fun stop(context: Context) {
      try {
        context.startService(
          Intent(context, TimerAlertService::class.java).apply {
            action = ACTION_STOP
          },
        )
      } catch (_: IllegalStateException) {
        TimerAlertPlayback.stop(context)
      } catch (_: SecurityException) {
        TimerAlertPlayback.stop(context)
      }
    }
  }
}
