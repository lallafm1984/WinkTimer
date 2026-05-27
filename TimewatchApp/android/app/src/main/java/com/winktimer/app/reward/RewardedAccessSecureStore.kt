package com.winktimer.app.reward

import android.content.Context
import android.os.SystemClock
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.Base64
import java.nio.charset.StandardCharsets
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec
import org.json.JSONObject

class RewardedAccessSecureStore(
  private val context: Context,
) {
  fun grantAccess() {
    val record =
      RewardedAccessPolicy.createRecord(
        nowWallMs = System.currentTimeMillis(),
        nowElapsedMs = SystemClock.elapsedRealtime(),
      )
    writeRecord(record)
  }

  fun getAccessGrantedAtMs(): Long? {
    val record = readRecordOrClear() ?: return null
    val nowWallMs = System.currentTimeMillis()
    val nowElapsedMs = SystemClock.elapsedRealtime()

    if (!RewardedAccessPolicy.isActive(record, nowWallMs, nowElapsedMs)) {
      clear()
      return null
    }

    writeRecord(RewardedAccessPolicy.markSeen(record, nowWallMs))
    return record.grantedAtWallMs
  }

  fun hasActiveAccess(): Boolean {
    val record = readRecordOrClear() ?: return false
    val nowWallMs = System.currentTimeMillis()
    val nowElapsedMs = SystemClock.elapsedRealtime()

    if (!RewardedAccessPolicy.isActive(record, nowWallMs, nowElapsedMs)) {
      clear()
      return false
    }

    writeRecord(RewardedAccessPolicy.markSeen(record, nowWallMs))
    return true
  }

  fun clear() {
    preferences.edit().remove(PREF_PAYLOAD).apply()
  }

  private val preferences by lazy {
    context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE)
  }

  private fun readRecordOrClear(): RewardedAccessRecord? {
    return try {
      readRecord()
    } catch (_: Exception) {
      clear()
      null
    }
  }

  private fun readRecord(): RewardedAccessRecord? {
    val rawPayload = preferences.getString(PREF_PAYLOAD, null) ?: return null
    val container = JSONObject(rawPayload)

    if (container.optInt("version") != STORAGE_VERSION) {
      return null
    }

    val iv = Base64.decode(container.getString("iv"), Base64.NO_WRAP)
    val ciphertext = Base64.decode(container.getString("ciphertext"), Base64.NO_WRAP)
    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.DECRYPT_MODE, getOrCreateSecretKey(), GCMParameterSpec(GCM_TAG_LENGTH_BITS, iv))

    val plaintext = cipher.doFinal(ciphertext)
    val recordJson = JSONObject(String(plaintext, StandardCharsets.UTF_8))

    if (recordJson.optInt("version") != RECORD_VERSION) {
      return null
    }

    return RewardedAccessRecord(
      grantedAtWallMs = recordJson.getLong("grantedAtWallMs"),
      expiresAtWallMs = recordJson.getLong("expiresAtWallMs"),
      grantedAtElapsedMs = recordJson.getLong("grantedAtElapsedMs"),
      maxSeenWallMs = recordJson.getLong("maxSeenWallMs"),
    )
  }

  private fun writeRecord(record: RewardedAccessRecord) {
    val recordJson =
      JSONObject()
        .put("version", RECORD_VERSION)
        .put("grantedAtWallMs", record.grantedAtWallMs)
        .put("expiresAtWallMs", record.expiresAtWallMs)
        .put("grantedAtElapsedMs", record.grantedAtElapsedMs)
        .put("maxSeenWallMs", record.maxSeenWallMs)

    val cipher = Cipher.getInstance(TRANSFORMATION)
    cipher.init(Cipher.ENCRYPT_MODE, getOrCreateSecretKey())

    val ciphertext =
      cipher.doFinal(recordJson.toString().toByteArray(StandardCharsets.UTF_8))

    val container =
      JSONObject()
        .put("version", STORAGE_VERSION)
        .put("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
        .put("ciphertext", Base64.encodeToString(ciphertext, Base64.NO_WRAP))

    preferences.edit().putString(PREF_PAYLOAD, container.toString()).apply()
  }

  private fun getOrCreateSecretKey(): SecretKey {
    val keyStore = KeyStore.getInstance(ANDROID_KEYSTORE)
    keyStore.load(null)

    val existingKey = keyStore.getKey(KEY_ALIAS, null) as? SecretKey
    if (existingKey != null) {
      return existingKey
    }

    val keyGenerator =
      KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, ANDROID_KEYSTORE)
    keyGenerator.init(
      KeyGenParameterSpec
        .Builder(
          KEY_ALIAS,
          KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT,
        )
        .setBlockModes(KeyProperties.BLOCK_MODE_GCM)
        .setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
        .setKeySize(KEY_SIZE_BITS)
        .build(),
    )

    return keyGenerator.generateKey()
  }

  companion object {
    private const val ANDROID_KEYSTORE = "AndroidKeyStore"
    private const val KEY_ALIAS = "winktimer.rewarded_access.v1"
    private const val KEY_SIZE_BITS = 256
    private const val TRANSFORMATION = "AES/GCM/NoPadding"
    private const val GCM_TAG_LENGTH_BITS = 128
    private const val PREF_NAME = "winktimer_rewarded_access"
    private const val PREF_PAYLOAD = "payload"
    private const val STORAGE_VERSION = 1
    private const val RECORD_VERSION = 1
  }
}
