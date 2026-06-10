package com.winktimer.app

import android.app.Application
import com.facebook.react.PackageList
import com.facebook.react.ReactApplication
import com.facebook.react.ReactHost
import com.facebook.react.ReactNativeApplicationEntryPoint.loadReactNative
import com.facebook.react.defaults.DefaultReactHost.getDefaultReactHost
import com.winktimer.app.alert.NativeTimerAlertPackage
import com.winktimer.app.clipboard.NativeTimelineClipboardPackage
import com.winktimer.app.gaze.NativeGazeDetectionPackage
import com.winktimer.app.review.NativeAppReviewPackage
import com.winktimer.app.reward.NativeRewardedAccessPackage

class MainApplication : Application(), ReactApplication {

  override val reactHost: ReactHost by lazy {
    getDefaultReactHost(
      context = applicationContext,
      packageList =
        PackageList(this).packages.apply {
          // Packages that cannot be autolinked yet can be added manually here, for example:
          // add(MyReactNativePackage())
          add(NativeGazeDetectionPackage())
          add(NativeTimerAlertPackage())
          add(NativeTimelineClipboardPackage())
          add(NativeAppReviewPackage())
          add(NativeRewardedAccessPackage())
        },
    )
  }

  override fun onCreate() {
    super.onCreate()
    loadReactNative(this)
  }
}
