package com.timewatchapp.gaze

import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NativeGazeDetectionModule(
  reactContext: ReactApplicationContext
) : ReactContextBaseJavaModule(reactContext) {
  override fun getName(): String = NAME

  @ReactMethod
  fun start(promise: Promise) {
    promise.resolve(null)
  }

  @ReactMethod
  fun stop(promise: Promise) {
    promise.resolve(null)
  }

  companion object {
    const val NAME = "NativeGazeDetection"
  }
}
