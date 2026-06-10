package com.winktimer.app.alert

import org.junit.Assert.assertEquals
import org.junit.Test

class TimerAlertServiceStopPolicyTest {
  @Test
  fun ownerScopedStopWithoutServiceStateStopsOnlyRequestedOwnerPlayback() {
    assertEquals(
      TimerAlertService.ALERT_OWNER_TIMER,
      TimerAlertServiceStopPolicy.getDestroyPlaybackOwner(
        activeAlertOwner = null,
        requestedStopOwner = TimerAlertService.ALERT_OWNER_TIMER,
      ),
    )
  }

  @Test
  fun ownerScopedStopWithActiveAlarmKeepsAlarmPlaybackOwner() {
    assertEquals(
      TimerAlertService.ALERT_OWNER_ALARM,
      TimerAlertServiceStopPolicy.getDestroyPlaybackOwner(
        activeAlertOwner = TimerAlertService.ALERT_OWNER_ALARM,
        requestedStopOwner = TimerAlertService.ALERT_OWNER_TIMER,
      ),
    )
  }

  @Test
  fun ownerScopedStopDoesNotStartServiceForDifferentActiveOwner() {
    assertEquals(
      false,
      TimerAlertServiceStopPolicy.shouldStartServiceForStop(
        activeAlertOwner = TimerAlertService.ALERT_OWNER_ALARM,
        requestedStopOwner = TimerAlertService.ALERT_OWNER_TIMER,
      ),
    )
  }
}
