package com.winktimer.app.clipboard

import android.content.ClipData
import android.content.ClipboardManager
import android.content.Context
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NativeTimelineClipboardModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun copyText(text: String, promise: Promise) {
    try {
      val clipboard =
        reactContext.getSystemService(Context.CLIPBOARD_SERVICE) as ClipboardManager
      val clip = ClipData.newPlainText("Wink Timer Timeline", text)
      clipboard.setPrimaryClip(clip)
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_TIMELINE_CLIPBOARD_COPY_FAILED", error)
    }
  }

  companion object {
    const val NAME = "NativeTimelineClipboard"
  }
}
