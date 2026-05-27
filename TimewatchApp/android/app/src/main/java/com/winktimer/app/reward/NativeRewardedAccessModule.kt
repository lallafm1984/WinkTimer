package com.winktimer.app.reward

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NativeRewardedAccessModule(
  reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {
  private val secureStore = RewardedAccessSecureStore(reactContext.applicationContext)

  override fun getName(): String = NAME

  @ReactMethod
  fun grantAccess(promise: Promise) {
    try {
      secureStore.grantAccess()
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_REWARDED_ACCESS_GRANT_FAILED", error)
    }
  }

  @ReactMethod
  fun getAccessGrantedAtMs(promise: Promise) {
    try {
      promise.resolve(secureStore.getAccessGrantedAtMs()?.toDouble())
    } catch (error: Exception) {
      promise.reject("E_REWARDED_ACCESS_READ_FAILED", error)
    }
  }

  @ReactMethod
  fun hasActiveAccess(promise: Promise) {
    try {
      promise.resolve(secureStore.hasActiveAccess())
    } catch (error: Exception) {
      promise.reject("E_REWARDED_ACCESS_CHECK_FAILED", error)
    }
  }

  @ReactMethod
  fun clearAccess(promise: Promise) {
    try {
      secureStore.clear()
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_REWARDED_ACCESS_CLEAR_FAILED", error)
    }
  }

  companion object {
    const val NAME = "NativeRewardedAccess"
  }
}
