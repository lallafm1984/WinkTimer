package com.winktimer.app.review

import android.content.ActivityNotFoundException
import android.content.Intent
import android.net.Uri
import com.facebook.react.bridge.Promise
import com.facebook.react.bridge.ReactApplicationContext
import com.facebook.react.bridge.ReactContextBaseJavaModule
import com.facebook.react.bridge.ReactMethod

class NativeAppReviewModule(
  private val reactContext: ReactApplicationContext,
) : ReactContextBaseJavaModule(reactContext) {

  override fun getName(): String = NAME

  @ReactMethod
  fun openPlayStoreListing(promise: Promise) {
    val packageName = reactContext.packageName

    try {
      reactContext.startActivity(
        Intent(Intent.ACTION_VIEW, Uri.parse("market://details?id=$packageName")).apply {
          setPackage("com.android.vending")
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        },
      )
      promise.resolve(null)
      return
    } catch (_: ActivityNotFoundException) {
      // Fall back to the web listing below.
    } catch (_: SecurityException) {
      // Fall back to the web listing below.
    }

    try {
      reactContext.startActivity(
        Intent(
          Intent.ACTION_VIEW,
          Uri.parse("https://play.google.com/store/apps/details?id=$packageName"),
        ).apply {
          addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        },
      )
      promise.resolve(null)
    } catch (error: Exception) {
      promise.reject("E_APP_REVIEW_OPEN_FAILED", error)
    }
  }

  companion object {
    const val NAME = "NativeAppReview"
  }
}
