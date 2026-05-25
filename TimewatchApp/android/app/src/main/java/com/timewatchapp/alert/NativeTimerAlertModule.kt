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
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod
import com.facebook.react.bridge.WritableArray

object TimerAlertVibrationPolicy {
  private const val REPEAT_FROM_START = 0

  @Suppress("UNUSED_PARAMETER")
  fun getRepeatIndex(durationMs: Long?): Int = REPEAT_FROM_START
}

class NativeTimerAlertModule(
  private val reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  private val mainHandler = Handler(Looper.getMainLooper())
  private var activePlayer: MediaPlayer? = null
  private var activeRingtone: Ringtone? = null
  private var previousAlarmVolume: Int? = null
  private val stopAlertRunnable =
    Runnable {
      stopActiveAlert()
    }

  override fun getName(): String = NAME

  @ReactMethod
  fun playTimerEndAlert(
    soundId: String,
    vibrationEnabled: Boolean,
    soundEnabled: Boolean,
    durationId: String,
    vibrationPatternId: String,
    promise: Promise,
  ) {
    try {
      val durationMs = getAlertDurationMs(durationId)
      stopActiveAlert()

      if (vibrationEnabled) {
        vibrate(vibrationPatternId, durationMs)
      }

      if (soundEnabled) {
        boostAlarmVolume()
        playSystemSound(soundId)
      }

      durationMs?.let {
        mainHandler.postDelayed(stopAlertRunnable, it)
      }

      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_TIMER_ALERT_FAILED", error)
    }
  }

  @ReactMethod
  fun previewTimerAlertSound(
    soundId: String,
    durationMs: Double,
    promise: Promise,
  ) {
    try {
      stopActiveAlert()
      boostAlarmVolume()
      playPreviewSound(soundId)
      mainHandler.postDelayed(
        stopAlertRunnable,
        durationMs.toLong().coerceIn(500L, 10000L),
      )
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_TIMER_ALERT_PREVIEW_FAILED", error)
    }
  }

  @ReactMethod
  fun stopTimerEndAlert(promise: Promise) {
    stopActiveAlert()
    promise.resolve(null)
  }

  @ReactMethod
  fun getTimerAlertSoundOptions(promise: Promise) {
    try {
      val options = Arguments.createArray()
      val seenSoundIds = mutableSetOf<String>()

      appendDefaultSoundOptions(options, seenSoundIds)
      appendDeviceSoundOptions(
        options,
        seenSoundIds,
        RingtoneManager.TYPE_ALARM,
        CATEGORY_ALARM,
      )

      promise.resolve(options)
    } catch (error: Exception) {
      promise.reject("E_TIMER_ALERT_SOUND_OPTIONS_FAILED", error)
    }
  }

  override fun invalidate() {
    super.invalidate()
    mainHandler.removeCallbacks(stopAlertRunnable)
    stopActiveAlert()
  }

  @Suppress("DEPRECATION")
  private fun vibrate(patternId: String, durationMs: Long?) {
    val vibrator =
      reactContext.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
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

  private fun playSystemSound(soundId: String) {
    val uri = resolveSoundUri(soundId) ?: return
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
        setDataSource(reactContext, uri)
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

  private fun playPreviewSound(soundId: String) {
    val uri = resolveSoundUri(soundId) ?: return
    val ringtone = RingtoneManager.getRingtone(reactContext, uri) ?: return

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

  private fun getAlertDurationMs(durationId: String): Long? =
    when {
      durationId == "untilStopped" -> null
      durationId == "long" -> LONG_ALERT_MS
      durationId.startsWith("seconds:") -> {
        val seconds = durationId.removePrefix("seconds:").toLongOrNull() ?: 4L
        seconds.coerceIn(1L, 20L) * 1000L
      }
      else -> SHORT_ALERT_MS
    }

  private fun getVibrationPattern(patternId: String): LongArray =
    when (patternId) {
      "short" -> longArrayOf(0L, 180L)
      VIBRATION_PATTERN_LONG_REPEAT -> longArrayOf(0L, 450L, 160L, 450L, 160L)
      else -> longArrayOf(0L, 180L, 80L, 240L)
    }

  private fun resolveSoundUri(soundId: String): Uri? {
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
      RingtoneManager.getActualDefaultRingtoneUri(reactContext, type)
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
    options: WritableArray,
    seenSoundIds: MutableSet<String>,
    type: Int,
    category: String,
  ) {
    val manager = RingtoneManager(reactContext).apply {
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

  private fun stopActiveAlert() {
    mainHandler.removeCallbacks(stopAlertRunnable)
    stopActiveSound()
    restoreAlarmVolume()
    cancelVibration()
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

  private fun boostAlarmVolume() {
    val audioManager =
      reactContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
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

  private fun restoreAlarmVolume() {
    val originalVolume = previousAlarmVolume ?: return
    previousAlarmVolume = null
    val audioManager =
      reactContext.getSystemService(Context.AUDIO_SERVICE) as? AudioManager
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
  private fun cancelVibration() {
    val vibrator =
      reactContext.getSystemService(Context.VIBRATOR_SERVICE) as? Vibrator
        ?: return

    vibrator.cancel()
  }

  companion object {
    const val NAME = "NativeTimerAlert"
    private const val SHORT_ALERT_MS = 4000L
    private const val LONG_ALERT_MS = 15000L
    private const val MIN_ALARM_VOLUME_RATIO = 0.85
    private const val MAX_PLAYER_VOLUME = 1.0f
    private const val URI_SOUND_ID_PREFIX = "uri:"
    private const val CATEGORY_DEFAULT = "Default"
    private const val CATEGORY_ALARM = "Alarm"
    private const val VIBRATION_PATTERN_LONG_REPEAT = "longRepeat"
  }
}
