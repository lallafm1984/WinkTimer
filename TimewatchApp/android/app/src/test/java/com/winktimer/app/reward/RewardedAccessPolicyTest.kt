package com.winktimer.app.reward

import org.junit.Assert.assertFalse
import org.junit.Assert.assertTrue
import org.junit.Test

class RewardedAccessPolicyTest {
  @Test
  fun activeRewardStaysValidBeforeThreeHoursExpire() {
    val grantedAtWallMs = 100_000L
    val grantedAtElapsedMs = 50_000L

    assertTrue(RewardedAccessPolicy.ACCESS_DURATION_MS == 3L * 60L * 60L * 1000L)

    assertTrue(
      RewardedAccessPolicy.isActive(
        record =
          RewardedAccessRecord(
            grantedAtWallMs = grantedAtWallMs,
            expiresAtWallMs = grantedAtWallMs + RewardedAccessPolicy.ACCESS_DURATION_MS,
            grantedAtElapsedMs = grantedAtElapsedMs,
            maxSeenWallMs = grantedAtWallMs,
          ),
        nowWallMs = grantedAtWallMs + 30_000L,
        nowElapsedMs = grantedAtElapsedMs + 30_000L,
      ),
    )
  }

  @Test
  fun futureRewardTimestampIsRejected() {
    val nowWallMs = 100_000L

    assertFalse(
      RewardedAccessPolicy.isActive(
        record =
          RewardedAccessRecord(
            grantedAtWallMs = nowWallMs + RewardedAccessPolicy.CLOCK_SKEW_GRACE_MS + 1L,
            expiresAtWallMs = nowWallMs + RewardedAccessPolicy.ACCESS_DURATION_MS,
            grantedAtElapsedMs = 50_000L,
            maxSeenWallMs = nowWallMs,
          ),
        nowWallMs = nowWallMs,
        nowElapsedMs = 50_000L,
      ),
    )
  }

  @Test
  fun elapsedRealtimeExpiryIsRejectedEvenWhenWallClockMovesBack() {
    val grantedAtWallMs = 100_000L
    val grantedAtElapsedMs = 50_000L

    assertFalse(
      RewardedAccessPolicy.isActive(
        record =
          RewardedAccessRecord(
            grantedAtWallMs = grantedAtWallMs,
            expiresAtWallMs = grantedAtWallMs + RewardedAccessPolicy.ACCESS_DURATION_MS,
            grantedAtElapsedMs = grantedAtElapsedMs,
            maxSeenWallMs = grantedAtWallMs + 30_000L,
          ),
        nowWallMs = grantedAtWallMs + 30_000L,
        nowElapsedMs =
          grantedAtElapsedMs +
            RewardedAccessPolicy.ACCESS_DURATION_MS +
            RewardedAccessPolicy.CLOCK_SKEW_GRACE_MS +
            1L,
      ),
    )
  }

  @Test
  fun largeWallClockRollbackIsRejected() {
    val grantedAtWallMs = 100_000L

    assertFalse(
      RewardedAccessPolicy.isActive(
        record =
          RewardedAccessRecord(
            grantedAtWallMs = grantedAtWallMs,
            expiresAtWallMs = grantedAtWallMs + RewardedAccessPolicy.ACCESS_DURATION_MS,
            grantedAtElapsedMs = 50_000L,
            maxSeenWallMs = grantedAtWallMs + 30_000L,
          ),
        nowWallMs =
          grantedAtWallMs +
            30_000L -
            RewardedAccessPolicy.CLOCK_ROLLBACK_GRACE_MS -
            1L,
        nowElapsedMs = 60_000L,
      ),
    )
  }
}
