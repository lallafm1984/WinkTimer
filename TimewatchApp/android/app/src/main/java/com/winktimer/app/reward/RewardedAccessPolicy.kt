package com.winktimer.app.reward

data class RewardedAccessRecord(
  val grantedAtWallMs: Long,
  val expiresAtWallMs: Long,
  val grantedAtElapsedMs: Long,
  val maxSeenWallMs: Long,
)

object RewardedAccessPolicy {
  const val ACCESS_DURATION_MS = 3L * 60L * 60L * 1000L
  const val CLOCK_SKEW_GRACE_MS = 5L * 60L * 1000L
  const val CLOCK_ROLLBACK_GRACE_MS = 5L * 60L * 1000L

  fun createRecord(
    nowWallMs: Long,
    nowElapsedMs: Long,
  ): RewardedAccessRecord =
    RewardedAccessRecord(
      grantedAtWallMs = nowWallMs,
      expiresAtWallMs = nowWallMs + ACCESS_DURATION_MS,
      grantedAtElapsedMs = nowElapsedMs,
      maxSeenWallMs = nowWallMs,
    )

  fun isActive(
    record: RewardedAccessRecord,
    nowWallMs: Long,
    nowElapsedMs: Long,
  ): Boolean {
    if (
      record.grantedAtWallMs < 0L ||
        record.expiresAtWallMs < 0L ||
        record.grantedAtElapsedMs < 0L ||
        record.maxSeenWallMs < 0L ||
        nowWallMs < 0L ||
        nowElapsedMs < 0L
    ) {
      return false
    }

    if (record.expiresAtWallMs <= record.grantedAtWallMs) {
      return false
    }

    if (record.expiresAtWallMs > record.grantedAtWallMs + ACCESS_DURATION_MS) {
      return false
    }

    if (record.grantedAtWallMs > nowWallMs + CLOCK_SKEW_GRACE_MS) {
      return false
    }

    if (record.maxSeenWallMs > nowWallMs + CLOCK_ROLLBACK_GRACE_MS) {
      return false
    }

    if (nowWallMs >= record.expiresAtWallMs) {
      return false
    }

    if (nowElapsedMs >= record.grantedAtElapsedMs) {
      val elapsedAgeMs = nowElapsedMs - record.grantedAtElapsedMs
      if (elapsedAgeMs >= ACCESS_DURATION_MS + CLOCK_SKEW_GRACE_MS) {
        return false
      }
    }

    return true
  }

  fun markSeen(
    record: RewardedAccessRecord,
    nowWallMs: Long,
  ): RewardedAccessRecord =
    if (nowWallMs > record.maxSeenWallMs) {
      record.copy(maxSeenWallMs = nowWallMs)
    } else {
      record
    }
}
