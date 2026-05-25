package com.timewatchapp.alert

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioManager
import android.media.MediaPlayer
import android.media.Ringtone
import android.media.RingtoneManager
import android.net.Uri
import android.os.Build
import android.os.Handler
import android.os.Looper
import android.os.VibrationEffect
import android.os.Vibrator
import com.facebook.react.bridge.Arguments
import com.facebook.react.bridge.WritableArray

object TimerAlertPlayback {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var activePlayer: MediaPlayer? = null
  private var activeRingtone: Ringtone? = null
  private var previousAlarmVolume: Int? = null
  private val stopAlertRunnable = Runnable {
    stop(null)
  }

  fun play(
    context: Context,
    soundId: String,
    vibrationEnabled: Boolean,
    soundEnabled: Boolean,
    durationId: String,
    vibrationPatternId: String,
  ) {
    val durationMs = getAlertDurationMs(durationId)
    stop(context)

    if (vibrationEnabled) {
      vibrate(context, vibrationPatternId, durationMs)
    }

    if (soundEnabled) {
      boostAlarmVolume(context)
      playSystemSound(context, soundId)
    }

    durationMs?.let {
      mainHandler.postDelayed(stopAlertRunnable, it)
    }
  }

  fun preview(context: Context, soundId: String, durationMs: Long) {
    stop(context)
    boostAlarmVolume(context)
    playPreviewSound(context, soundId)
    mainHandler.postDelayed(
      stopAlertRunnable,
      durationMs.coerceIn(500L, 10000L),
    )
  }

  fun stop(context: Context?) {
    mainHandler.removeCallbacks(stopAlertRunnable)
    stopActiveSound()
    context?.let(::restoreAlarmVolume)
    context?.let(::cancelVibration)
  }

  fun getAlertDurationMs(durationId: String): Long? =
    when {
      durationId == TIMER_ALERT_UNTIL_STOPPED -> null
      durationId == "long" -> LONG_ALERT_MS
      durationId.startsWith("seconds:") -> {
        val seconds = durationId.removePrefix("seconds:").toLongOrNull() ?: 4L
        seconds.coerceIn(1L, 20L) * 1000L
      }
      else -> SHORT_ALERT_MS
    }

  fun getSoundOptions(context: Context): WritableArray {
    val options = Arguments.createArray()
    val seenSoundIds = mutableSetOf<String>()

    appendDefaultSoundOptions(options, seenSoundIds)
    appendDeviceSoundOptions(
      context,
      options,
      seenSoundIds,
      RingtoneManager.TYPE_ALARM,
      CATEGORY_ALARM,
    )

    return options
  }

  @Suppress("DEPRECATION")
  private fun vibrate(context: Context, patternId: String, durationMs: Long?) {
    val vibrator =
      context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        ?: return
    val pattern = getVibrationPattern(patternId)
    val repeatIndex = TimerAlertVibrationPolicy.getRepeatIndex(durationMs)

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      vibrator.vibrate(
        VibrationEffect.createWaveform(pattern, repeatIndex),
      )
    } else {
      vibrator.vibrate(pattern, repeatIndex)
    }
  }

  private fun playSystemSound(context: Context, soundId: String) {
    val uri = resolveSoundUri(context, soundId) ?: return
    val player =
      MediaPlayer().apply {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          setAudioAttributes(
            AudioAttributes.Builder()
              .setUsage(AudioAttributes.USAGE_ALARM)
              .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
              .build(),
          )
        }
        setDataSource(context, uri)
        isLooping = true
        setVolume(MAX_PLAYER_VOLUME, MAX_PLAYER_VOLUME)
        setOnPreparedListener { preparedPlayer ->
          if (activePlayer == preparedPlayer) {
            preparedPlayer.start()
          } else {
            preparedPlayer.release()
          }
        }
        setOnErrorListener { erroredPlayer, _, _ ->
          if (activePlayer == erroredPlayer) {
            activePlayer = null
          }
          erroredPlayer.release()
          true
        }
      }

    activePlayer = player
    player.prepareAsync()
  }

  private fun playPreviewSound(context: Context, soundId: String) {
    val uri = resolveSoundUri(context, soundId) ?: return
    val ringtone = RingtoneManager.getRingtone(context, uri) ?: return

    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      ringtone.audioAttributes =
        AudioAttributes.Builder()
          .setUsage(AudioAttributes.USAGE_ALARM)
          .setContentType(AudioAttributes.CONTENT_TYPE_SONIFICATION)
          .build()
    }

    activeRingtone = ringtone
    ringtone.play()
  }

  private fun getVibrationPattern(patternId: String): LongArray =
    when (patternId) {
      "short" -> longArrayOf(0L, 180L)
      VIBRATION_PATTERN_LONG_REPEAT -> longArrayOf(0L, 450L, 160L, 450L, 160L)
      else -> longArrayOf(0L, 180L, 80L, 240L)
    }

  private fun resolveSoundUri(context: Context, soundId: String): Uri? {
    if (soundId.startsWith(URI_SOUND_ID_PREFIX)) {
      return Uri.parse(soundId.removePrefix(URI_SOUND_ID_PREFIX))
    }

    val preferredType = getRingtoneType(soundId)
    val fallbackTypes =
      listOf(
        preferredType,
        RingtoneManager.TYPE_ALARM,
        RingtoneManager.TYPE_NOTIFICATION,
        RingtoneManager.TYPE_RINGTONE,
      ).distinct()

    return fallbackTypes.firstNotNullOfOrNull { type ->
      RingtoneManager.getActualDefaultRingtoneUri(context, type)
        ?: RingtoneManager.getDefaultUri(type)
    }
  }

  private fun getRingtoneType(soundId: String): Int =
    when (soundId) {
      "notification" -> RingtoneManager.TYPE_NOTIFICATION
      "ringtone" -> RingtoneManager.TYPE_RINGTONE
      else -> RingtoneManager.TYPE_ALARM
    }

  private fun appendDefaultSoundOptions(
    options: WritableArray,
    seenSoundIds: MutableSet<String>,
  ) {
    appendSoundOption(
      options,
      seenSoundIds,
      "alarm",
      "DEFAULT ALARM",
      CATEGORY_DEFAULT,
    )
  }

  private fun appendDeviceSoundOptions(
    context: Context,
    options: WritableArray,
    seenSoundIds: MutableSet<String>,
    type: Int,
    category: String,
  ) {
    val manager = RingtoneManager(context).apply {
      setType(type)
    }
    val cursor = manager.cursor ?: return

    if (!cursor.moveToFirst()) {
      return
    }

    do {
      val uri = manager.getRingtoneUri(cursor.position) ?: continue
      val title = cursor.getString(RingtoneManager.TITLE_COLUMN_INDEX)
        ?: continue
      appendSoundOption(
        options,
        seenSoundIds,
        "$URI_SOUND_ID_PREFIX$uri",
        title,
        category,
      )
    } while (cursor.moveToNext())
  }

  private fun appendSoundOption(
    options: WritableArray,
    seenSoundIds: MutableSet<String>,
    id: String,
    label: String,
    category: String,
  ) {
    val trimmedLabel = label.trim()

    if (trimmedLabel.isEmpty() || !seenSoundIds.add(id)) {
      return
    }

    options.pushMap(
      Arguments.createMap().apply {
        putString("id", id)
        putString("label", trimmedLabel)
        putString("category", category)
      },
    )
  }

  private fun stopActiveSound() {
    activePlayer?.let { player ->
      try {
        player.setOnPreparedListener(null)
        player.setOnErrorListener(null)
        if (player.isPlaying) {
          player.stop()
        }
      } catch (_: IllegalStateException) {
        // The player can still be preparing when a preview/alert is cancelled.
      } finally {
        player.release()
      }
    }
    activePlayer = null

    activeRingtone?.stop()
    activeRingtone = null
  }

  private fun boostAlarmVolume(context: Context) {
    val audioManager =
      context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        ?: return
    val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)

    if (maxVolume <= 0) {
      return
    }

    val currentVolume = audioManager.getStreamVolume(AudioManager.STREAM_ALARM)
    val boostedVolume =
      kotlin.math.ceil(maxVolume * MIN_ALARM_VOLUME_RATIO).toInt()
        .coerceIn(1, maxVolume)

    if (currentVolume >= boostedVolume) {
      return
    }

    if (previousAlarmVolume == null) {
      previousAlarmVolume = currentVolume
    }

    try {
      audioManager.setStreamVolume(
        AudioManager.STREAM_ALARM,
        boostedVolume,
        0,
      )
    } catch (_: SecurityException) {
      previousAlarmVolume = null
    }
  }

  private fun restoreAlarmVolume(context: Context) {
    val originalVolume = previousAlarmVolume ?: return
    previousAlarmVolume = null
    val audioManager =
      context.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
        ?: return
    val maxVolume = audioManager.getStreamMaxVolume(AudioManager.STREAM_ALARM)

    if (maxVolume <= 0) {
      return
    }

    try {
      audioManager.setStreamVolume(
        AudioManager.STREAM_ALARM,
        originalVolume.coerceIn(0, maxVolume),
        0,
      )
    } catch (_: SecurityException) {
      // If the platform blocks volume restoration, leave the current user-visible value.
    }
  }

  @Suppress("DEPRECATION")
  private fun cancelVibration(context: Context) {
    val vibrator =
      context.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        ?: return

    vibrator.cancel()
  }

  private const val SHORT_ALERT_MS = 4000L
  private const val LONG_ALERT_MS = 15000L
  private const val MIN_ALARM_VOLUME_RATIO = 0.85
  private const val MAX_PLAYER_VOLUME = 1.0f
  private const val URI_SOUND_ID_PREFIX = "uri:"
  private const val CATEGORY_DEFAULT = "Default"
  private const val CATEGORY_ALARM = "Alarm"
  private const val VIBRATION_PATTERN_LONG_REPEAT = "longRepeat"
  private const val TIMER_ALERT_UNTIL_STOPPED = "untilStopped"
}
