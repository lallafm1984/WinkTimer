package com.winktimer.app.alert

object TimerAlertServiceStopPolicy {
  fun shouldStopServiceForOwner(
    activeAlertOwner: String?,
    requestedStopOwner: String,
  ): Boolean = activeAlertOwner == null || activeAlertOwner == requestedStopOwner

  fun shouldStartServiceForStop(
    activeAlertOwner: String?,
    requestedStopOwner: String,
  ): Boolean = activeAlertOwner == null || activeAlertOwner == requestedStopOwner

  fun getDestroyPlaybackOwner(
    activeAlertOwner: String?,
    requestedStopOwner: String?,
  ): String? = activeAlertOwner ?: requestedStopOwner
}
