package com.winktimer.app.alert

import android.content.Context
import org.json.JSONArray
import org.json.JSONObject

object AlarmAlertStore {
  private const val PREF_NAME = "winktimer_alarm_alerts"
  private const val PREF_ALARMS = "alarms"
  private const val KEY_ALARM_ID = "alarmId"
  private const val KEY_HOUR = "hour"
  private const val KEY_MINUTE = "minute"
  private const val KEY_SCHEDULE_KIND = "scheduleKind"
  private const val KEY_WEEKDAYS_CSV = "weekdaysCsv"
  private const val KEY_DATES_CSV = "datesCsv"
  private const val KEY_SOUND_ID = "soundId"
  private const val KEY_VIBRATION_ENABLED = "vibrationEnabled"
  private const val KEY_SOUND_ENABLED = "soundEnabled"
  private const val KEY_SOUND_VOLUME = "soundVolume"
  private const val KEY_NOTIFICATION_TITLE = "notificationTitle"
  private const val KEY_NOTIFICATION_TEXT = "notificationText"
  private const val KEY_NOTIFICATION_CHANNEL_NAME = "notificationChannelName"

  @Synchronized
  fun save(context: Context, alarm: PersistedAlarmAlert) {
    val alarms =
      list(context)
        .filterNot { it.alarmId == alarm.alarmId }
        .plus(alarm)

    write(context, alarms)
  }

  @Synchronized
  fun remove(context: Context, alarmId: String) {
    write(context, list(context).filterNot { it.alarmId == alarmId })
  }

  @Synchronized
  fun list(context: Context): List<PersistedAlarmAlert> {
    val rawPayload =
      preferences(context).getString(PREF_ALARMS, null) ?: return emptyList()

    return try {
      val alarms = JSONArray(rawPayload)

      List(alarms.length()) { index -> alarms.optJSONObject(index) }
        .mapNotNull { alarmJson -> alarmJson?.let(::decode) }
    } catch (_: Exception) {
      emptyList()
    }
  }

  private fun write(context: Context, alarms: List<PersistedAlarmAlert>) {
    val payload = JSONArray()

    alarms.forEach { alarm ->
      payload.put(encode(alarm))
    }

    preferences(context).edit().putString(PREF_ALARMS, payload.toString())
      .commit()
  }

  private fun preferences(context: Context) =
    context.applicationContext.getSharedPreferences(
      PREF_NAME,
      Context.MODE_PRIVATE,
    )

  private fun encode(alarm: PersistedAlarmAlert): JSONObject =
    JSONObject()
      .put(KEY_ALARM_ID, alarm.alarmId)
      .put(KEY_HOUR, alarm.hour)
      .put(KEY_MINUTE, alarm.minute)
      .put(KEY_SCHEDULE_KIND, alarm.scheduleKind)
      .put(KEY_WEEKDAYS_CSV, alarm.weekdaysCsv)
      .put(KEY_DATES_CSV, alarm.datesCsv)
      .put(KEY_SOUND_ID, alarm.soundId)
      .put(KEY_VIBRATION_ENABLED, alarm.vibrationEnabled)
      .put(KEY_SOUND_ENABLED, alarm.soundEnabled)
      .put(KEY_SOUND_VOLUME, alarm.soundVolume.toDouble())
      .put(KEY_NOTIFICATION_TITLE, alarm.notificationTitle)
      .put(KEY_NOTIFICATION_TEXT, alarm.notificationText)
      .put(KEY_NOTIFICATION_CHANNEL_NAME, alarm.notificationChannelName)

  private fun decode(json: JSONObject): PersistedAlarmAlert? {
    val alarmId = json.optString(KEY_ALARM_ID).trim()
    if (alarmId.isEmpty()) {
      return null
    }

    return PersistedAlarmAlert(
      alarmId,
      json.optInt(KEY_HOUR, 7).coerceIn(0, 23),
      json.optInt(KEY_MINUTE, 0).coerceIn(0, 59),
      json.optString(KEY_SCHEDULE_KIND, "daily"),
      json.optString(KEY_WEEKDAYS_CSV, ""),
      json.optString(KEY_DATES_CSV, ""),
      json.optString(KEY_SOUND_ID, "alarm"),
      json.optBoolean(KEY_VIBRATION_ENABLED, true),
      json.optBoolean(KEY_SOUND_ENABLED, true),
      json.optDouble(
        KEY_SOUND_VOLUME,
        TimerAlertPlayback.DEFAULT_ALARM_VOLUME_RATIO.toDouble(),
      ).toFloat(),
      json.optString(KEY_NOTIFICATION_TITLE, "Alarm"),
      json.optString(KEY_NOTIFICATION_TEXT, "Alarm"),
      json.optString(KEY_NOTIFICATION_CHANNEL_NAME, "Alarm alerts"),
    )
  }
}
