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
import androidx.core.app.NotificationManagerCompat
import com.winktimer.app.MainActivity

data class ActiveAlarmAlert(
  val alarmId: String?,
  val title: String,
  val text: String,
)

class TimerAlertService : Service() {
  private val mainHandler = Handler(Looper.getMainLooper())
  private val stopRunnable = Runnable {
    stopSelf()
  }
  private var requestedStopOwner: String? = null

  override fun onBind(intent: Intent?): IBinder? = null

  override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
    if (intent?.action == ACTION_STOP) {
      val requestedOwner =
        intent.getStringExtra(EXTRA_ALERT_OWNER) ?: ALERT_OWNER_TIMER

      if (
        TimerAlertServiceStopPolicy.shouldStopServiceForOwner(
          activeAlertOwner,
          requestedOwner,
        )
      ) {
        requestedStopOwner = requestedOwner
        stopSelf()
      }

      return START_NOT_STICKY
    }

    if (intent?.action != ACTION_PLAY) {
      stopSelf()
      return START_NOT_STICKY
    }

    val soundId = intent.getStringExtra(TimerAlertScheduler.EXTRA_SOUND_ID) ?: "alarm"
    val vibrationEnabled =
      intent.getBooleanExtra(TimerAlertScheduler.EXTRA_VIBRATION_ENABLED, true)
    val soundEnabled =
      intent.getBooleanExtra(TimerAlertScheduler.EXTRA_SOUND_ENABLED, true)
    val soundVolume =
      if (intent.hasExtra(TimerAlertScheduler.EXTRA_SOUND_VOLUME)) {
        intent.getFloatExtra(
          TimerAlertScheduler.EXTRA_SOUND_VOLUME,
          TimerAlertPlayback.DEFAULT_ALARM_VOLUME_RATIO,
        )
      } else {
        null
      }
    val durationId =
      intent.getStringExtra(TimerAlertScheduler.EXTRA_DURATION_ID)
        ?: "seconds:4"
    val vibrationPatternId =
      intent.getStringExtra(TimerAlertScheduler.EXTRA_VIBRATION_PATTERN_ID)
        ?: "double"
    val notificationTitle =
      intent.getStringExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_TITLE)
        ?: "Timer alert"
    val notificationText =
      intent.getStringExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_TEXT)
        ?: "Timer finished"
    val notificationChannelName =
      intent.getStringExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_CHANNEL_NAME)
        ?: "Timer alerts"
    val alertOwner =
      intent.getStringExtra(EXTRA_ALERT_OWNER) ?: ALERT_OWNER_TIMER
    val alarmId = intent.getStringExtra(AlarmAlertScheduler.EXTRA_ALARM_ID)

    requestedStopOwner = null
    startAlertForeground(
      notificationTitle,
      notificationText,
      notificationChannelName,
      alertOwner,
    )

    setActiveAlertState(alertOwner, alarmId, notificationTitle, notificationText)
    TimerAlertPlayback.play(
      applicationContext,
      soundId,
      vibrationEnabled,
      soundEnabled,
      durationId,
      vibrationPatternId,
      alertOwner,
      soundVolume,
    )

    TimerAlertPlayback.getAlertDurationMs(durationId)?.let { durationMs ->
      mainHandler.postDelayed(stopRunnable, durationMs)
    }

    return START_NOT_STICKY
  }

  override fun onDestroy() {
    mainHandler.removeCallbacks(stopRunnable)
    val alertOwner =
      TimerAlertServiceStopPolicy.getDestroyPlaybackOwner(
        activeAlertOwner,
        requestedStopOwner,
      )
    clearActiveAlertState(alertOwner)
    TimerAlertPlayback.stop(applicationContext, alertOwner)
    requestedStopOwner = null
    super.onDestroy()
  }

  private fun startAlertForeground(
    notificationTitle: String,
    notificationText: String,
    notificationChannelName: String,
    alertOwner: String,
  ) {
    createNotificationChannel(notificationChannelName, alertOwner)
    val notification =
      createNotification(notificationTitle, notificationText, alertOwner)

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

  private fun createNotification(
    notificationTitle: String,
    notificationText: String,
    alertOwner: String,
  ): Notification {
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
        Notification.Builder(
          this,
          TimerAlertNotificationPolicy.getChannelId(alertOwner),
        )
      } else {
        @Suppress("DEPRECATION")
        Notification.Builder(this)
      }

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      builder.setBadgeIconType(Notification.BADGE_ICON_NONE)
    }

    return builder
      .setContentTitle(notificationTitle.trim().ifEmpty { "Timer alert" })
      .setContentText(notificationText.trim().ifEmpty { "Timer finished" })
      .setSmallIcon(android.R.drawable.ic_lock_idle_alarm)
      .setCategory(Notification.CATEGORY_ALARM)
      .setPriority(TimerAlertNotificationPolicy.getNotificationPriority(alertOwner))
      .setVisibility(Notification.VISIBILITY_PUBLIC)
      .setOngoing(true)
      .setContentIntent(openPendingIntent)
      .apply {
        if (alertOwner == ALERT_OWNER_ALARM) {
          setFullScreenIntent(openPendingIntent, true)
        }
      }
      .build()
  }

  private fun createNotificationChannel(
    notificationChannelName: String,
    alertOwner: String,
  ) {
    if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
      return
    }

    val notificationManager =
      getSystemService(Context.NOTIFICATION_SERVICE) as? NotificationManager
        ?: return

    val channelId = TimerAlertNotificationPolicy.getChannelId(alertOwner)

    notificationManager.getNotificationChannel(channelId)?.let { channel ->
      channel.setShowBadge(false)
      notificationManager.createNotificationChannel(channel)
      return
    }

    val channel =
      NotificationChannel(
        channelId,
        notificationChannelName.trim().ifEmpty { "Timer alerts" },
        TimerAlertNotificationPolicy.getChannelImportance(alertOwner),
      ).apply {
        setShowBadge(false)
        lockscreenVisibility = Notification.VISIBILITY_PUBLIC
      }

    notificationManager.createNotificationChannel(channel)
  }

  companion object {
    const val ALERT_OWNER_TIMER = "timer"
    const val ALERT_OWNER_ALARM = "alarm"
    private const val ACTION_PLAY = "com.winktimer.app.alert.START_ALERT_SERVICE"
    private const val ACTION_STOP = "com.winktimer.app.alert.STOP_ALERT_SERVICE"
    private const val EXTRA_ALERT_OWNER = "alertOwner"
    private const val NOTIFICATION_ID = 9202
    private var activeAlertOwner: String? = null
    private var activeAlarmId: String? = null
    private var activeNotificationTitle: String? = null
    private var activeNotificationText: String? = null

    fun createPlayIntent(
      context: Context,
      soundId: String,
      vibrationEnabled: Boolean,
      soundEnabled: Boolean,
      durationId: String,
      vibrationPatternId: String,
      notificationTitle: String,
      notificationText: String,
      notificationChannelName: String,
      alertOwner: String = ALERT_OWNER_TIMER,
      alarmId: String? = null,
      soundVolume: Float? = null,
    ): Intent =
      Intent(context, TimerAlertService::class.java).apply {
        action = ACTION_PLAY
        putExtra(TimerAlertScheduler.EXTRA_SOUND_ID, soundId)
        putExtra(TimerAlertScheduler.EXTRA_VIBRATION_ENABLED, vibrationEnabled)
        putExtra(TimerAlertScheduler.EXTRA_SOUND_ENABLED, soundEnabled)
        soundVolume?.let {
          putExtra(TimerAlertScheduler.EXTRA_SOUND_VOLUME, it)
        }
        putExtra(TimerAlertScheduler.EXTRA_DURATION_ID, durationId)
        putExtra(
          TimerAlertScheduler.EXTRA_VIBRATION_PATTERN_ID,
          vibrationPatternId,
        )
        putExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_TITLE, notificationTitle)
        putExtra(TimerAlertScheduler.EXTRA_NOTIFICATION_TEXT, notificationText)
        putExtra(
          TimerAlertScheduler.EXTRA_NOTIFICATION_CHANNEL_NAME,
          notificationChannelName,
        )
        putExtra(EXTRA_ALERT_OWNER, alertOwner)
        alarmId?.let {
          putExtra(AlarmAlertScheduler.EXTRA_ALARM_ID, it)
        }
      }

    fun stop(context: Context, alertOwner: String = ALERT_OWNER_TIMER) {
      if (
        !TimerAlertServiceStopPolicy.shouldStartServiceForStop(
          activeAlertOwner,
          alertOwner,
        )
      ) {
        TimerAlertPlayback.stop(context, alertOwner)
        return
      }

      try {
        context.startService(
          Intent(context, TimerAlertService::class.java).apply {
            action = ACTION_STOP
            putExtra(EXTRA_ALERT_OWNER, alertOwner)
          },
        )
      } catch (_: IllegalStateException) {
        TimerAlertPlayback.stop(context, alertOwner)
      } catch (_: SecurityException) {
        TimerAlertPlayback.stop(context, alertOwner)
      }

      if (activeAlertOwner == null || activeAlertOwner == alertOwner) {
        clearActiveAlertState(alertOwner)
        clearNotification(context)
      }
    }

    fun getActiveAlarmAlert(): ActiveAlarmAlert? {
      if (activeAlertOwner != ALERT_OWNER_ALARM) {
        return null
      }

      return ActiveAlarmAlert(
        activeAlarmId,
        activeNotificationTitle?.trim()?.ifEmpty { null } ?: "Alarm",
        activeNotificationText?.trim()?.ifEmpty { null } ?: "Alarm",
      )
    }

    fun setFallbackActiveAlarmAlert(
      alarmId: String?,
      notificationTitle: String,
      notificationText: String,
    ) {
      setActiveAlertState(
        ALERT_OWNER_ALARM,
        alarmId,
        notificationTitle,
        notificationText,
      )
    }

    fun clearNotification(context: Context) {
      NotificationManagerCompat.from(context).cancel(NOTIFICATION_ID)
    }

    private fun setActiveAlertState(
      alertOwner: String,
      alarmId: String?,
      notificationTitle: String,
      notificationText: String,
    ) {
      activeAlertOwner = alertOwner
      activeAlarmId = if (alertOwner == ALERT_OWNER_ALARM) alarmId else null
      activeNotificationTitle = notificationTitle
      activeNotificationText = notificationText
    }

    private fun clearActiveAlertState(alertOwner: String?) {
      if (alertOwner != null && activeAlertOwner != alertOwner) {
        return
      }

      activeAlertOwner = null
      activeAlarmId = null
      activeNotificationTitle = null
      activeNotificationText = null
    }
  }
}
