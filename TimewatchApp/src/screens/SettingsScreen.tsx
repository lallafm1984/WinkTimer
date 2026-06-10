import React, {useEffect, useRef, useState} from 'react';
import {
  type LayoutChangeEvent,
  Modal,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {
  TIMER_ALERT_MAX_DURATION_SECONDS,
  TIMER_ALERT_MIN_DURATION_SECONDS,
  TIMER_ALERT_UNTIL_STOPPED_ID,
  createTimerAlertSecondsDurationId,
  getTimerAlertDurationSeconds,
  isTimerAlertUntilStopped,
  loadTimerAlertSoundOptions,
  playTimerAlertSoundPreview,
  stopTimerAlertSoundPreview,
  timerAlertSoundOptions,
  timerAlertVibrationPatternOptions,
  type TimerAlertDurationId,
  type TimerAlertSoundOption,
  type TimerAlertSoundId,
  type TimerAlertVibrationPatternId,
} from '../alerts/timerAlert';
import {
  ensureCameraPermission,
  hasCameraPermission,
} from '../detection/GazeDetector';
import type {
  DetectionReading,
  DetectionFrameIntervalLevel,
  DetectionPerformanceMode,
  DetectionResolutionLevel,
  FaceHeightAngleLevel,
  LookAngleLevel,
  SmileDistanceLevel,
  SmileThreshold,
  WinkDistanceLevel,
  WinkEyeClosedThreshold,
  WinkEyeProbabilityGapThreshold,
} from '../domain/detection';
import {
  detectionFrameIntervalMsByLevel,
  detectionFrameIntervalLevels,
  detectionResolutionByLevel,
  detectionResolutionLevels,
  faceHeightAngleLevels,
  lookAngleLevels,
  normalizeSmileThreshold,
  smileDistanceLevels,
  winkDistanceLevels,
} from '../domain/detection';
import {useAppState} from '../state/AppState';
import {
  appLanguageOptions,
  createTranslator,
  type AppLocale,
  type TranslationKey,
} from '../i18n/localization';
import {
  ensureBackgroundTimekeepingNotificationPermission,
  hasBackgroundTimekeepingNotificationPermission,
} from '../notifications/timekeepingNotification';

type Translator = ReturnType<typeof createTranslator>;

const WINK_CALIBRATION_POLL_MS = 100;
const WINK_CALIBRATION_COUNTDOWN_MS = 3000;
const WINK_CALIBRATION_REQUIRED_WINKS = 3;
const WINK_CALIBRATION_CAPTURE_TIMEOUT_MS = 15000;
const WINK_CALIBRATION_RAW_CLOSED_THRESHOLD = 0.2;
const WINK_CALIBRATION_RAW_DROP_THRESHOLD = 0.25;
const WINK_CALIBRATION_RAW_DROP_CLOSED_MAX = 0.45;
const WINK_CALIBRATION_RAW_RELEASE_THRESHOLD = 0.45;
const WINK_CALIBRATION_CLOSED_EYE_MAX_OPEN_PROBABILITY = 0.4;
const WINK_CALIBRATION_OPEN_EYE_MIN_OPEN_PROBABILITY = 0.4;
const WINK_CALIBRATION_MIN_GAP_THRESHOLD = 0.2;
const SMILE_CALIBRATION_REQUIRED_SMILES = 3;
const SMILE_CALIBRATION_RAW_SMILE_THRESHOLD = 0.45;
const SMILE_CALIBRATION_RAW_RELEASE_THRESHOLD = 0.35;
const SMILE_CALIBRATION_THRESHOLD_OFFSET = -0.01;
const SHOW_REMOVE_ADS_SETTINGS = false;
const LANGUAGE_OPTION_SCROLL_MAX_HEIGHT = 300;
const LANGUAGE_SCROLLBAR_MIN_THUMB_HEIGHT = 44;
const LANGUAGE_SCROLLBAR_FALLBACK_CONTENT_HEIGHT =
  appLanguageOptions.length * 56 + 20;
const detectionPerformanceLevels = [1, 2] as const;

type WinkCalibrationSide = 'left' | 'right';

type WinkCalibrationPhase = 'ready' | 'countdown' | 'measuring' | 'failed';

type WinkCalibrationSample = {
  status: DetectionReading['status'];
  eyeState: DetectionReading['eyeState'];
  selectedEyeOpenProbability: number | null | undefined;
  otherEyeOpenProbability: number | null | undefined;
  gapThreshold: number | null | undefined;
  faceAngleValid: boolean;
};

type CompleteWinkCalibrationSample = WinkCalibrationSample & {
  selectedEyeOpenProbability: number;
  otherEyeOpenProbability: number;
  gapThreshold: number;
};

type RawWinkCalibrationCaptureState = {
  isCapturingWink: boolean;
  selectedOpenBaseline: number | null;
  currentSampleIndex: number | null;
};

type WinkCalibrationResult =
  | {
      ok: true;
      eyeClosedThreshold: WinkEyeClosedThreshold;
      gapThreshold: WinkEyeProbabilityGapThreshold;
    }
  | {
      ok: false;
      messageKey: TranslationKey;
    };

type SmileCalibrationPhase = WinkCalibrationPhase;

type SmileCalibrationSample = {
  status: DetectionReading['status'];
  smileProbability: number | null | undefined;
  faceAngleValid: boolean;
};

type CompleteSmileCalibrationSample = SmileCalibrationSample & {
  smileProbability: number;
};

type RawSmileCalibrationCaptureState = {
  isCapturingSmile: boolean;
  currentSampleIndex: number | null;
};

type SmileCalibrationResult =
  | {
      ok: true;
      threshold: SmileThreshold;
    }
  | {
      ok: false;
      messageKey: TranslationKey;
    };

type PermissionStatus = 'checking' | 'granted' | 'denied';

type PermissionStatuses = {
  camera: PermissionStatus;
  notifications: PermissionStatus;
};

type AccordionGroupProps = {
  title: string;
  summary: string;
  testID: string;
  expanded: boolean;
  onToggle(): void;
  emphasized?: boolean;
  children: React.ReactNode;
};

type OptionButtonControlProps = {
  title: string;
  value: number;
  levels: readonly number[];
  testID: string;
  labelForLevel?: (level: number) => string;
  onChange(value: number): void;
};

type BooleanButtonControlProps = {
  title: string;
  value: boolean;
  testID: string;
  t: Translator;
  onChange(value: boolean): void;
};

type PermissionRowProps = {
  title: string;
  status: PermissionStatus;
  testID: string;
  t: Translator;
  onRequest(): void;
};

type SoundOptionControlProps = {
  value: TimerAlertSoundId;
  t: Translator;
  onChange(value: TimerAlertSoundId): void;
};

type TimerAlertDurationControlProps = {
  value: TimerAlertDurationId;
  t: Translator;
  onChange(value: TimerAlertDurationId): void;
};

type TimerAlertVibrationPatternControlProps = {
  value: TimerAlertVibrationPatternId;
  t: Translator;
  onChange(value: TimerAlertVibrationPatternId): void;
};

type LanguageOptionControlProps = {
  value: AppLocale;
  t: Translator;
  onChange(value: AppLocale): void;
};

function AccordionGroup({
  title,
  summary,
  testID,
  expanded,
  onToggle,
  emphasized = false,
  children,
}: AccordionGroupProps) {
  return (
    <View style={[styles.group, emphasized ? styles.emphasizedGroup : null]}>
      <Pressable
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{expanded}}
        onPress={onToggle}
        style={[
          styles.groupHeader,
          emphasized ? styles.emphasizedGroupHeader : null,
        ]}
        testID={`${testID}-accordion`}>
        <View style={styles.groupHeaderCopy}>
          <Text
            style={[
              styles.groupTitle,
              emphasized ? styles.emphasizedGroupTitle : null,
            ]}>
            {title}
          </Text>
          <Text
            style={[
              styles.groupSummary,
              emphasized ? styles.emphasizedGroupSummary : null,
            ]}>
            {summary}
          </Text>
        </View>
        <Text
          style={[
            styles.groupCue,
            emphasized ? styles.emphasizedGroupCue : null,
          ]}>
          {expanded ? '-' : '+'}
        </Text>
      </Pressable>
      {expanded ? (
        <View style={styles.groupBody} testID={`${testID}-body`}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getWinkTestEyeOpenProbability(
  winkDebug: DetectionReading['winkDebug'] | undefined,
  side: 'left' | 'right',
) {
  if (winkDebug === undefined) {
    return undefined;
  }

  return side === 'left'
    ? winkDebug.leftEyeOpenProbability
    : winkDebug.rightEyeOpenProbability;
}

function getOtherWinkTestEyeOpenProbability(
  winkDebug: DetectionReading['winkDebug'] | undefined,
  side: 'left' | 'right',
) {
  if (winkDebug === undefined) {
    return undefined;
  }

  return side === 'left'
    ? winkDebug.rightEyeOpenProbability
    : winkDebug.leftEyeOpenProbability;
}

function getCalibrationEyeName(side: WinkCalibrationSide, t: Translator) {
  return side === 'left'
    ? t('calibration.eye.left')
    : t('calibration.eye.right');
}

function isWinkCalibrationJudgmentUnavailable(
  sample: Pick<WinkCalibrationSample, 'status' | 'eyeState'>,
) {
  return (
    sample.status !== 'looking' ||
    sample.eyeState === undefined ||
    sample.eyeState === 'unknown' ||
    sample.eyeState === 'bothClosed'
  );
}

function getHalfThreshold(value: number) {
  return Math.round((value / 2) * 1000) / 1000;
}

function getClosedEyeThreshold(value: number) {
  return Math.round((value + 0.01) * 1000) / 1000;
}

function isWithinFaceAngleLimit(
  value: number | null | undefined,
  limit: number | null | undefined,
) {
  if (!isFiniteNumber(value) || !isFiniteNumber(limit)) {
    return false;
  }

  return Math.abs(value) <= limit;
}

function isWinkCalibrationFaceAngleValid(
  winkDebug: DetectionReading['winkDebug'] | undefined,
) {
  if (winkDebug === undefined) {
    return false;
  }

  return (
    isWithinFaceAngleLimit(
      winkDebug.facePitchDegrees,
      winkDebug.maxFacePitchDegrees,
    ) &&
    isWithinFaceAngleLimit(winkDebug.faceYawDegrees, winkDebug.maxFaceYawDegrees) &&
    isWithinFaceAngleLimit(
      winkDebug.faceRollDegrees,
      winkDebug.maxFaceRollDegrees,
    )
  );
}

function createWinkCalibrationSample(
  reading: DetectionReading,
  side: WinkCalibrationSide,
): WinkCalibrationSample {
  const winkDebug = reading.winkDebug;

  return {
    status: reading.status,
    eyeState: reading.eyeState,
    selectedEyeOpenProbability: getWinkTestEyeOpenProbability(winkDebug, side),
    otherEyeOpenProbability: getOtherWinkTestEyeOpenProbability(
      winkDebug,
      side,
    ),
    gapThreshold: winkDebug?.eyeProbabilityGap,
    faceAngleValid: isWinkCalibrationFaceAngleValid(winkDebug),
  };
}

function hasCompleteWinkCalibrationValues(
  sample: WinkCalibrationSample,
): sample is CompleteWinkCalibrationSample {
  return (
    sample.status === 'looking' &&
    !isWinkCalibrationJudgmentUnavailable(sample) &&
    sample.faceAngleValid &&
    isFiniteNumber(sample.selectedEyeOpenProbability) &&
    isFiniteNumber(sample.otherEyeOpenProbability) &&
    isFiniteNumber(sample.gapThreshold)
  );
}

function isRawWinkCalibrationAttempt(
  sample: WinkCalibrationSample,
  selectedOpenBaseline: number | null,
) {
  if (!hasCompleteWinkCalibrationValues(sample)) {
    return false;
  }

  const selectedEye = sample.selectedEyeOpenProbability;
  const isAbsoluteClosed =
    selectedEye <= WINK_CALIBRATION_RAW_CLOSED_THRESHOLD;
  const isSharpDrop =
    selectedOpenBaseline !== null &&
    selectedOpenBaseline - selectedEye >= WINK_CALIBRATION_RAW_DROP_THRESHOLD &&
    selectedEye <= WINK_CALIBRATION_RAW_DROP_CLOSED_MAX;

  return isAbsoluteClosed || isSharpDrop;
}

function isRawWinkCalibrationReleased(
  sample: WinkCalibrationSample,
): sample is CompleteWinkCalibrationSample {
  return (
    hasCompleteWinkCalibrationValues(sample) &&
    sample.selectedEyeOpenProbability >= WINK_CALIBRATION_RAW_RELEASE_THRESHOLD
  );
}

function getNextRawWinkCalibrationBaseline(
  currentBaseline: number | null,
  sample: WinkCalibrationSample,
) {
  if (!isRawWinkCalibrationReleased(sample)) {
    return currentBaseline;
  }

  return Math.max(
    currentBaseline ?? 0,
    sample.selectedEyeOpenProbability,
  );
}

function isBetterRawWinkCalibrationSample(
  nextSample: WinkCalibrationSample,
  currentSample: WinkCalibrationSample,
) {
  if (
    !hasCompleteWinkCalibrationValues(nextSample) ||
    !hasCompleteWinkCalibrationValues(currentSample)
  ) {
    return false;
  }

  return (
    nextSample.selectedEyeOpenProbability <
      currentSample.selectedEyeOpenProbability ||
    (nextSample.selectedEyeOpenProbability ===
      currentSample.selectedEyeOpenProbability &&
      nextSample.gapThreshold > currentSample.gapThreshold)
  );
}

function getWinkCalibrationResult(
  samples: readonly WinkCalibrationSample[],
): WinkCalibrationResult {
  const validSamples = samples.filter(
    hasCompleteWinkCalibrationValues,
  );

  if (validSamples.length < WINK_CALIBRATION_REQUIRED_WINKS) {
    const angleInvalidCount = samples.filter(
      sample => sample.status === 'looking' && !sample.faceAngleValid,
    ).length;
    const notLookingCount = samples.filter(
      sample => sample.status !== 'looking',
    ).length;

    if (angleInvalidCount > samples.length * 0.35) {
      return {
        ok: false,
        messageKey: 'calibration.failed.faceCamera',
      };
    }

    if (notLookingCount > samples.length * 0.35) {
      return {
        ok: false,
        messageKey: 'calibration.failed.faceInView',
      };
    }

    return {
      ok: false,
      messageKey: 'calibration.failed.steadyValues',
    };
  }

  const selectedEyeValues = validSamples.map(
    sample => sample.selectedEyeOpenProbability as number,
  );
  const otherEyeValues = validSamples.map(
    sample => sample.otherEyeOpenProbability as number,
  );
  const gapValues = validSamples.map(
    sample => sample.gapThreshold as number,
  );
  const maxSelectedEye = Math.max(...selectedEyeValues);
  const minOtherEye = Math.min(...otherEyeValues);
  const minGap = Math.min(...gapValues);

  if (
    maxSelectedEye >=
    WINK_CALIBRATION_CLOSED_EYE_MAX_OPEN_PROBABILITY
  ) {
    return {
      ok: false,
      messageKey: 'calibration.failed.selectedEye',
    };
  }

  if (
    minOtherEye <
    WINK_CALIBRATION_OPEN_EYE_MIN_OPEN_PROBABILITY
  ) {
    return {
      ok: false,
      messageKey: 'calibration.failed.bothEyes',
    };
  }

  if (minGap < WINK_CALIBRATION_MIN_GAP_THRESHOLD) {
    return {
      ok: false,
      messageKey: 'calibration.failed.eyeGap',
    };
  }

  return {
    ok: true,
    eyeClosedThreshold: getClosedEyeThreshold(
      maxSelectedEye,
    ) as WinkEyeClosedThreshold,
    gapThreshold: getHalfThreshold(
      minGap,
    ) as WinkEyeProbabilityGapThreshold,
  };
}

function createSmileCalibrationSample(
  reading: DetectionReading,
): SmileCalibrationSample {
  return {
    status: reading.status,
    smileProbability: reading.winkDebug?.smileProbability,
    faceAngleValid: isWinkCalibrationFaceAngleValid(reading.winkDebug),
  };
}

function isSmileCalibrationJudgmentUnavailable(
  sample: SmileCalibrationSample,
) {
  return (
    sample.status !== 'looking' ||
    !sample.faceAngleValid ||
    !isFiniteNumber(sample.smileProbability)
  );
}

function hasCompleteSmileCalibrationValues(
  sample: SmileCalibrationSample,
): sample is CompleteSmileCalibrationSample {
  return (
    sample.status === 'looking' &&
    sample.faceAngleValid &&
    isFiniteNumber(sample.smileProbability)
  );
}

function isRawSmileCalibrationAttempt(sample: SmileCalibrationSample) {
  return (
    hasCompleteSmileCalibrationValues(sample) &&
    sample.smileProbability >= SMILE_CALIBRATION_RAW_SMILE_THRESHOLD
  );
}

function isRawSmileCalibrationReleased(sample: SmileCalibrationSample) {
  return (
    hasCompleteSmileCalibrationValues(sample) &&
    sample.smileProbability <= SMILE_CALIBRATION_RAW_RELEASE_THRESHOLD
  );
}

function isBetterRawSmileCalibrationSample(
  nextSample: SmileCalibrationSample,
  currentSample: SmileCalibrationSample,
) {
  return (
    hasCompleteSmileCalibrationValues(nextSample) &&
    hasCompleteSmileCalibrationValues(currentSample) &&
    nextSample.smileProbability > currentSample.smileProbability
  );
}

function getCalibratedSmileThreshold(value: number): SmileThreshold {
  const threshold =
    Math.round((value + SMILE_CALIBRATION_THRESHOLD_OFFSET) * 1000) / 1000;

  return normalizeSmileThreshold(threshold) as SmileThreshold;
}

function getSmileCalibrationResult(
  samples: readonly SmileCalibrationSample[],
): SmileCalibrationResult {
  const validSamples = samples.filter(hasCompleteSmileCalibrationValues);

  if (validSamples.length < SMILE_CALIBRATION_REQUIRED_SMILES) {
    const angleInvalidCount = samples.filter(
      sample => sample.status === 'looking' && !sample.faceAngleValid,
    ).length;
    const notLookingCount = samples.filter(
      sample => sample.status !== 'looking',
    ).length;

    if (angleInvalidCount > samples.length * 0.35) {
      return {
        ok: false,
        messageKey: 'calibration.failed.faceCamera',
      };
    }

    if (notLookingCount > samples.length * 0.35) {
      return {
        ok: false,
        messageKey: 'calibration.failed.faceInView',
      };
    }

    return {
      ok: false,
      messageKey: 'calibration.failed.steadyValues',
    };
  }

  const smileValues = validSamples.map(sample => sample.smileProbability);
  const maxSmileValue = Math.max(...smileValues);

  return {
    ok: true,
    threshold: getCalibratedSmileThreshold(maxSmileValue),
  };
}

function getRangeLabel(level: number, t: Translator): string {
  switch (level) {
    case 1:
      return t('option.narrow');
    case 3:
      return t('option.wide');
    default:
      return t('option.normal');
  }
}

function getDistanceLabel(level: number, t: Translator): string {
  switch (level) {
    case 1:
      return t('option.close');
    case 3:
      return t('option.mid');
    default:
      return t('option.far');
  }
}

function getSmileThresholdLabel(value: number): string {
  return `${Math.round(value * 100)}%`;
}

function getDetectionPerformanceLevel(
  mode: DetectionPerformanceMode,
): number {
  return mode === 'accurate' ? 2 : 1;
}

function getDetectionPerformanceMode(
  level: number,
): DetectionPerformanceMode {
  return level === 2 ? 'accurate' : 'fast';
}

function getDetectionPerformanceLabel(level: number, t: Translator): string {
  return getDetectionPerformanceMode(level) === 'accurate'
    ? t('option.accurate')
    : t('option.fast');
}

function getResolutionLabel(level: number): string {
  const resolution =
    detectionResolutionByLevel[level as DetectionResolutionLevel];

  return `${resolution.width}x${resolution.height}`;
}

function getFrameIntervalLabel(level: number, t: Translator): string {
  const interval =
    detectionFrameIntervalMsByLevel[level as DetectionFrameIntervalLevel];

  return interval === 0 ? t('option.realtime') : `${interval} MS`;
}

function getPermissionStatusLabel(
  status: PermissionStatus,
  t: Translator,
): string {
  if (status === 'granted') {
    return t('settings.permission.allowed');
  }

  if (status === 'checking') {
    return t('settings.permission.checking');
  }

  return t('settings.permission.missing');
}

function getPermissionActionLabel(
  status: PermissionStatus,
  t: Translator,
): string {
  if (status === 'granted') {
    return t('settings.permission.allowed');
  }

  if (status === 'checking') {
    return t('settings.permission.checking');
  }

  return t('settings.permission.allow');
}

function permissionStatusFromGranted(granted: boolean): PermissionStatus {
  return granted ? 'granted' : 'denied';
}

async function getPermissionStatuses(): Promise<PermissionStatuses> {
  const [cameraGranted, notificationsGranted] = await Promise.all([
    hasCameraPermission(),
    hasBackgroundTimekeepingNotificationPermission(),
  ]);

  return {
    camera: permissionStatusFromGranted(cameraGranted),
    notifications: permissionStatusFromGranted(notificationsGranted),
  };
}

function OptionButtonControl({
  title,
  value,
  levels,
  testID,
  labelForLevel,
  onChange,
}: OptionButtonControlProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.toggleGrid} testID={testID}>
        {levels.map(level => (
          <PrimaryButton
            key={level}
            accessibilityState={{selected: value === level}}
            label={labelForLevel?.(level) ?? `${level}`}
            onPress={() => {
              onChange(level);
            }}
            testID={`${testID}-option-${level}`}
            variant={value === level ? 'primary' : 'secondary'}
            style={styles.toggleButton}
          />
        ))}
      </View>
    </View>
  );
}

function PermissionRow({
  title,
  status,
  testID,
  t,
  onRequest,
}: PermissionRowProps) {
  const canRequest = status === 'denied';

  return (
    <View style={styles.permissionRow} testID={`${testID}-row`}>
      <View style={styles.permissionCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text
          style={[
            styles.permissionStatus,
            status === 'granted'
              ? styles.permissionStatusGranted
              : status === 'denied'
                ? styles.permissionStatusMissing
                : null,
          ]}
          testID={`${testID}-status`}>
          {getPermissionStatusLabel(status, t)}
        </Text>
      </View>
      <PrimaryButton
        disabled={!canRequest}
        label={getPermissionActionLabel(status, t)}
        onPress={onRequest}
        testID={`${testID}-request`}
        variant={canRequest ? 'primary' : 'secondary'}
        style={styles.permissionButton}
      />
    </View>
  );
}

function BooleanButtonControl({
  title,
  value,
  testID,
  t,
  onChange,
}: BooleanButtonControlProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.toggleGrid} testID={testID}>
        <PrimaryButton
          accessibilityState={{selected: value}}
          label={t('common.on')}
          onPress={() => {
            onChange(true);
          }}
          testID={`${testID}-on`}
          variant={value ? 'primary' : 'secondary'}
          style={styles.toggleButton}
        />
        <PrimaryButton
          accessibilityState={{selected: !value}}
          label={t('common.off')}
          onPress={() => {
            onChange(false);
          }}
          testID={`${testID}-off`}
          variant={!value ? 'primary' : 'secondary'}
          style={styles.toggleButton}
        />
      </View>
    </View>
  );
}

function SoundOptionControl({value, t, onChange}: SoundOptionControlProps) {
  const [soundOptions, setSoundOptions] = useState<TimerAlertSoundOption[]>(
    () => [...timerAlertSoundOptions],
  );
  const [soundModalVisible, setSoundModalVisible] = useState(false);
  const [playingPreviewSoundId, setPlayingPreviewSoundId] = useState<
    string | null
  >(null);
  const selectedOption =
    soundOptions.find(option => option.id === value) ??
    timerAlertSoundOptions.find(option => option.id === value);

  const stopSoundPreview = React.useCallback(() => {
    setPlayingPreviewSoundId(null);
    stopTimerAlertSoundPreview().catch(() => undefined);
  }, []);

  useEffect(() => {
    let mounted = true;

    loadTimerAlertSoundOptions()
      .then(options => {
        if (mounted) {
          setSoundOptions(options);
        }
      })
      .catch(() => undefined);

    return () => {
      mounted = false;
      stopTimerAlertSoundPreview().catch(() => undefined);
    };
  }, []);

  const toggleSoundPreview = (soundId: string) => {
    if (playingPreviewSoundId === soundId) {
      stopSoundPreview();
      return;
    }

    setPlayingPreviewSoundId(soundId);
    playTimerAlertSoundPreview(soundId).catch(() => {
      setPlayingPreviewSoundId(current =>
        current === soundId ? null : current,
      );
    });
  };

  return (
    <View style={styles.section}>
      <View style={styles.soundHeader}>
        <View style={styles.soundTitleGroup}>
          <Text style={styles.sectionTitle}>{t('settings.soundSelect')}</Text>
          <Text
            style={styles.soundSelectedName}
            testID="timer-alert-selected-sound-name">
            {selectedOption
              ? formatSoundOptionLabel(selectedOption, t)
              : t('alert.sound.custom')}
          </Text>
        </View>
        <PrimaryButton
          label={t('common.select')}
          onPress={() => {
            setSoundModalVisible(true);
          }}
          testID="timer-alert-sound-open"
          variant="secondary"
          style={styles.soundPreviewButton}
        />
      </View>
      {soundModalVisible ? (
        <Modal
          animationType="fade"
          onRequestClose={() => {
            stopSoundPreview();
            setSoundModalVisible(false);
          }}
          transparent
          visible={soundModalVisible}>
          <View style={styles.modalBackdrop} testID="timer-alert-sound-popup">
            <View style={styles.soundModalPanel}>
              <View style={styles.soundModalHeader}>
                <Text style={styles.modalTitle}>{t('settings.soundSelect')}</Text>
                <PrimaryButton
                  label={t('common.close')}
                  onPress={() => {
                    stopSoundPreview();
                    setSoundModalVisible(false);
                  }}
                  testID="timer-alert-sound-close"
                  variant="secondary"
                  style={styles.soundPreviewButton}
                />
              </View>
              <ScrollView
                nestedScrollEnabled
                style={styles.soundOptionScroller}
                contentContainerStyle={styles.soundOptionList}
                testID="timer-alert-sound-scroll">
                <Text style={styles.soundListTitle}>{t('settings.alarmSounds')}</Text>
                {soundOptions.map((option, index) => (
                  <View key={option.id} style={styles.soundOptionRow}>
                    <PrimaryButton
                      accessibilityState={{selected: value === option.id}}
                      label={formatSoundOptionLabel(option, t)}
                      onPress={() => {
                        stopSoundPreview();
                        onChange(option.id);
                        setSoundModalVisible(false);
                      }}
                      testID={getSoundOptionSelectTestID(option, index)}
                      variant={value === option.id ? 'primary' : 'secondary'}
                      style={styles.soundOptionSelectButton}
                    />
                    <PrimaryButton
                      accessibilityLabel={
                        playingPreviewSoundId === option.id
                          ? t('alarm.stopPreview')
                          : t('common.preview')
                      }
                      label={playingPreviewSoundId === option.id ? '■' : '▶'}
                      onPress={() => {
                        toggleSoundPreview(option.id);
                      }}
                      testID={getSoundOptionPreviewTestID(option, index)}
                      variant={
                        playingPreviewSoundId === option.id
                          ? 'primary'
                          : 'secondary'
                      }
                      style={styles.soundOptionPreviewButton}
                    />
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

function formatSoundOptionLabel(
  option: TimerAlertSoundOption,
  t: Translator,
) {
  return option.id === 'alarm' ? t('alert.sound.default') : option.label;
}

function getSoundOptionSelectTestID(
  option: TimerAlertSoundOption,
  index: number,
) {
  return option.category === 'Default'
    ? `timer-alert-sound-select-${option.id}`
    : `timer-alert-sound-select-${index}`;
}

function getSoundOptionPreviewTestID(
  option: TimerAlertSoundOption,
  index: number,
) {
  return option.category === 'Default'
    ? `timer-alert-sound-preview-${option.id}`
    : `timer-alert-sound-preview-${index}`;
}

function TimerAlertDurationControl({
  value,
  t,
  onChange,
}: TimerAlertDurationControlProps) {
  const currentSeconds = getTimerAlertDurationSeconds(value);
  const untilStopped = isTimerAlertUntilStopped(value);
  const lastSecondsRef = useRef(currentSeconds);

  useEffect(() => {
    if (!untilStopped) {
      lastSecondsRef.current = currentSeconds;
    }
  }, [currentSeconds, untilStopped]);

  const changeSecondsBy = (delta: number) => {
    if (untilStopped) {
      return;
    }

    const nextDurationId = createTimerAlertSecondsDurationId(
      currentSeconds + delta,
    );

    if (nextDurationId !== value) {
      onChange(nextDurationId);
    }
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('settings.alertLength')}</Text>
      <View
        style={[
          styles.durationStepper,
          untilStopped ? styles.durationStepperDisabled : null,
        ]}
        testID="timer-alert-duration-stepper">
        <PrimaryButton
          accessibilityLabel={`${t('action.RESET')} ${t(
            'settings.alertLength',
          )}`}
          disabled={
            untilStopped || currentSeconds <= TIMER_ALERT_MIN_DURATION_SECONDS
          }
          label="-"
          onPress={() => {
            changeSecondsBy(-1);
          }}
          testID="timer-alert-duration-decrement"
          variant="secondary"
          style={styles.durationStepButton}
        />
        <Text
          style={[
            styles.durationValue,
            untilStopped ? styles.durationValueDisabled : null,
          ]}
          testID="timer-alert-duration-value">
          {untilStopped ? '--' : t('alert.seconds', {count: currentSeconds})}
        </Text>
        <PrimaryButton
          accessibilityLabel={`${t('common.start')} ${t(
            'settings.alertLength',
          )}`}
          disabled={
            untilStopped || currentSeconds >= TIMER_ALERT_MAX_DURATION_SECONDS
          }
          label="+"
          onPress={() => {
            changeSecondsBy(1);
          }}
          testID="timer-alert-duration-increment"
          variant="secondary"
          style={styles.durationStepButton}
        />
      </View>
      <View style={styles.toggleGrid} testID="timer-alert-duration-options">
        <PrimaryButton
          accessibilityState={{selected: untilStopped}}
          label={t('settings.untilStopped')}
          onPress={() => {
            onChange(
              untilStopped
                ? createTimerAlertSecondsDurationId(lastSecondsRef.current)
                : TIMER_ALERT_UNTIL_STOPPED_ID,
            );
          }}
          testID="timer-alert-duration-untilStopped"
          variant={untilStopped ? 'primary' : 'secondary'}
          style={styles.soundOptionButton}
        />
      </View>
    </View>
  );
}

const vibrationPatternLabelKeys: Record<
  TimerAlertVibrationPatternId,
  TranslationKey
> = {
  double: 'alert.vibration.double',
  longRepeat: 'alert.vibration.longRepeat',
  short: 'alert.vibration.short',
};

function getVibrationPatternLabel(
  id: TimerAlertVibrationPatternId,
  t: Translator,
) {
  return t(vibrationPatternLabelKeys[id]);
}

function TimerAlertVibrationPatternControl({
  value,
  t,
  onChange,
}: TimerAlertVibrationPatternControlProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('settings.vibrationPattern')}</Text>
      <View
        style={styles.toggleGrid}
        testID="timer-alert-vibration-pattern-options">
        {timerAlertVibrationPatternOptions.map(option => (
          <PrimaryButton
            key={option.id}
            accessibilityState={{selected: value === option.id}}
            label={getVibrationPatternLabel(option.id, t)}
            onPress={() => {
              onChange(option.id);
            }}
            testID={`timer-alert-vibration-pattern-${option.id}`}
            variant={value === option.id ? 'primary' : 'secondary'}
            style={styles.soundOptionButton}
          />
        ))}
      </View>
    </View>
  );
}

function LanguageOptionControl({
  value,
  t,
  onChange,
}: LanguageOptionControlProps) {
  const [languageScrollMetrics, setLanguageScrollMetrics] = useState({
    contentHeight: LANGUAGE_SCROLLBAR_FALLBACK_CONTENT_HEIGHT,
    scrollY: 0,
    viewportHeight: LANGUAGE_OPTION_SCROLL_MAX_HEIGHT,
  });
  const selectedOption =
    appLanguageOptions.find(option => option.locale === value) ??
    appLanguageOptions[0];
  const languageScrollViewportHeight = Math.max(
    1,
    languageScrollMetrics.viewportHeight,
  );
  const languageScrollContentHeight = Math.max(
    languageScrollViewportHeight,
    languageScrollMetrics.contentHeight,
  );
  const languageScrollMaxY = Math.max(
    1,
    languageScrollContentHeight - languageScrollViewportHeight,
  );
  const languageScrollbarThumbHeight = Math.min(
    languageScrollViewportHeight,
    Math.max(
      LANGUAGE_SCROLLBAR_MIN_THUMB_HEIGHT,
      (languageScrollViewportHeight / languageScrollContentHeight) *
        languageScrollViewportHeight,
    ),
  );
  const languageScrollbarMaxOffset = Math.max(
    0,
    languageScrollViewportHeight - languageScrollbarThumbHeight,
  );
  const languageScrollbarThumbOffset = Math.min(
    languageScrollbarMaxOffset,
    Math.max(
      0,
      (languageScrollMetrics.scrollY / languageScrollMaxY) *
        languageScrollbarMaxOffset,
    ),
  );
  const handleLanguageScrollLayout = (event: LayoutChangeEvent) => {
    const viewportHeight = event.nativeEvent.layout.height;

    setLanguageScrollMetrics(previous =>
      previous.viewportHeight === viewportHeight
        ? previous
        : {
            ...previous,
            viewportHeight,
          },
    );
  };
  const handleLanguageContentSizeChange = (_width: number, height: number) => {
    setLanguageScrollMetrics(previous =>
      previous.contentHeight === height
        ? previous
        : {
            ...previous,
            contentHeight: height,
          },
    );
  };
  const handleLanguageScroll = (
    event: NativeSyntheticEvent<NativeScrollEvent>,
  ) => {
    const scrollY = event.nativeEvent.contentOffset.y;

    setLanguageScrollMetrics(previous =>
      previous.scrollY === scrollY
        ? previous
        : {
            ...previous,
            scrollY,
          },
    );
  };

  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{t('settings.appLanguage')}</Text>
      <Text style={styles.description}>
        {t('settings.selectedLanguage', {
          language: selectedOption.nativeName,
        })}
      </Text>
      <View style={styles.languageOptionScrollFrame}>
        <ScrollView
          nestedScrollEnabled
          onContentSizeChange={handleLanguageContentSizeChange}
          onLayout={handleLanguageScrollLayout}
          onScroll={handleLanguageScroll}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator
          style={styles.languageOptionScroll}
          contentContainerStyle={styles.languageOptionList}
          testID="language-option-scroll">
          {appLanguageOptions.map(option => {
            const selected = option.locale === value;

            return (
              <View
                key={option.locale}
                style={styles.languageOptionRow}
                testID="language-option-row">
                <Pressable
                  accessibilityLabel={option.nativeName}
                  accessibilityRole="button"
                  accessibilityState={{selected}}
                  onPress={() => {
                    onChange(option.locale);
                  }}
                  style={({pressed}) => [
                    styles.languageOptionButton,
                    selected && styles.selectedLanguageOptionButton,
                    pressed && styles.pressedLanguageOptionButton,
                  ]}
                  testID={`language-option-${option.locale}`}>
                  <View style={styles.languageOptionCopy}>
                    <Text style={styles.languageOptionName}>
                      {option.nativeName}
                    </Text>
                  </View>
                  <Text style={styles.languageOptionCheck}>
                    {selected ? '✓' : ''}
                  </Text>
                </Pressable>
              </View>
            );
          })}
        </ScrollView>
        <View
          pointerEvents="none"
          style={styles.languageScrollbarTrack}
          testID="language-scrollbar-track">
          <View
            style={[
              styles.languageScrollbarThumb,
              {
                height: languageScrollbarThumbHeight,
                transform: [{translateY: languageScrollbarThumbOffset}],
              },
            ]}
            testID="language-scrollbar-thumb"
          />
        </View>
      </View>
    </View>
  );
}

export function SettingsScreen() {
  const {
    setWinkLeftEyeClosedThreshold,
    setWinkRightEyeClosedThreshold,
    setWinkLeftEyeProbabilityGapThreshold,
    setWinkRightEyeProbabilityGapThreshold,
    winkDistanceLevel,
    setWinkDistanceLevel,
    smileThreshold,
    setSmileThreshold,
    smileDistanceLevel,
    setSmileDistanceLevel,
    lookAngleLevel,
    setLookAngleLevel,
    faceHeightAngleLevel,
    setFaceHeightAngleLevel,
    detectionResolutionLevel,
    setDetectionResolutionLevel,
    detectionFrameIntervalLevel,
    setDetectionFrameIntervalLevel,
    detectionPerformanceMode,
    setDetectionPerformanceMode,
    timerAlertVibrationEnabled,
    setTimerAlertVibrationEnabled,
    timerAlertSoundEnabled,
    setTimerAlertSoundEnabled,
    timerAlertSoundId,
    setTimerAlertSoundId,
    timerAlertDurationId,
    setTimerAlertDurationId,
    timerAlertVibrationPatternId,
    setTimerAlertVibrationPatternId,
    locale,
    setLocale,
    gazeDetector,
    setScreen,
  } = useAppState();
  const t = createTranslator(locale);
  const translatorRef = useRef<Translator>(t);
  const [winkCalibrationSide, setWinkCalibrationSide] =
    useState<WinkCalibrationSide | null>(null);
  const [winkCalibrationPhase, setWinkCalibrationPhase] =
    useState<WinkCalibrationPhase>('ready');
  const [winkCalibrationRemainingMs, setWinkCalibrationRemainingMs] =
    useState(WINK_CALIBRATION_COUNTDOWN_MS);
  const [winkCalibrationRemainingWinks, setWinkCalibrationRemainingWinks] =
    useState(WINK_CALIBRATION_REQUIRED_WINKS);
  const [winkCalibrationFailureMessage, setWinkCalibrationFailureMessage] =
    useState('');
  const [smileCalibrationOpen, setSmileCalibrationOpen] = useState(false);
  const [smileCalibrationPhase, setSmileCalibrationPhase] =
    useState<SmileCalibrationPhase>('ready');
  const [smileCalibrationRemainingMs, setSmileCalibrationRemainingMs] =
    useState(WINK_CALIBRATION_COUNTDOWN_MS);
  const [smileCalibrationRemainingSmiles, setSmileCalibrationRemainingSmiles] =
    useState(SMILE_CALIBRATION_REQUIRED_SMILES);
  const [smileCalibrationFailureMessage, setSmileCalibrationFailureMessage] =
    useState('');
  const [expandedSettingsGroup, setExpandedSettingsGroup] = useState<
    string | null
  >(null);
  const [permissionStatuses, setPermissionStatuses] =
    useState<PermissionStatuses>({
      camera: 'checking',
      notifications: 'checking',
    });
  const [
    winkCalibrationJudgmentUnavailable,
    setWinkCalibrationJudgmentUnavailable,
  ] = useState(false);
  const [
    smileCalibrationJudgmentUnavailable,
    setSmileCalibrationJudgmentUnavailable,
  ] = useState(false);
  const [activeWinkCalibrationRunId, setActiveWinkCalibrationRunId] = useState<
    number | null
  >(null);
  const [activeSmileCalibrationRunId, setActiveSmileCalibrationRunId] =
    useState<number | null>(null);
  const winkCalibrationSamplesRef = useRef<WinkCalibrationSample[]>([]);
  const winkCalibrationRunCounterRef = useRef(0);
  const smileCalibrationSamplesRef = useRef<SmileCalibrationSample[]>([]);
  const smileCalibrationRunCounterRef = useRef(0);

  const toggleSettingsGroup = (groupId: string) => {
    setExpandedSettingsGroup(current => (current === groupId ? null : groupId));
  };

  const refreshPermissionStatuses = React.useCallback(() => {
    setPermissionStatuses({
      camera: 'checking',
      notifications: 'checking',
    });
    getPermissionStatuses()
      .then(setPermissionStatuses)
      .catch(() => {
        setPermissionStatuses({
          camera: 'denied',
          notifications: 'denied',
        });
      });
  }, []);

  const requestCameraPermissionFromSettings = React.useCallback(() => {
    setPermissionStatuses(current => ({
      ...current,
      camera: 'checking',
    }));
    ensureCameraPermission({openSettingsIfBlocked: true})
      .then(granted => {
        setPermissionStatuses(current => ({
          ...current,
          camera: permissionStatusFromGranted(granted),
        }));
      })
      .catch(() => {
        setPermissionStatuses(current => ({
          ...current,
          camera: 'denied',
        }));
      });
  }, []);

  const requestNotificationPermissionFromSettings = React.useCallback(() => {
    setPermissionStatuses(current => ({
      ...current,
      notifications: 'checking',
    }));
    ensureBackgroundTimekeepingNotificationPermission({
      openSettingsIfBlocked: true,
    })
      .then(granted => {
        setPermissionStatuses(current => ({
          ...current,
          notifications: permissionStatusFromGranted(granted),
        }));
      })
      .catch(() => {
        setPermissionStatuses(current => ({
          ...current,
          notifications: 'denied',
        }));
      });
  }, []);

  const isWinkCalibrating = winkCalibrationSide !== null;
  const isSmileCalibrating = smileCalibrationOpen;
  const isAnyCalibrating = isWinkCalibrating || isSmileCalibrating;

  useEffect(() => {
    translatorRef.current = t;
  }, [t]);

  const openWinkCalibration = (side: WinkCalibrationSide) => {
    setActiveWinkCalibrationRunId(null);
    setWinkCalibrationFailureMessage('');
    setWinkCalibrationJudgmentUnavailable(false);
    setWinkCalibrationPhase('ready');
    setWinkCalibrationRemainingMs(WINK_CALIBRATION_COUNTDOWN_MS);
    setWinkCalibrationRemainingWinks(WINK_CALIBRATION_REQUIRED_WINKS);
    setWinkCalibrationSide(side);
  };

  const closeWinkCalibration = () => {
    setActiveWinkCalibrationRunId(null);
    setWinkCalibrationSide(null);
    setWinkCalibrationFailureMessage('');
    setWinkCalibrationJudgmentUnavailable(false);
    setWinkCalibrationPhase('ready');
    setWinkCalibrationRemainingMs(WINK_CALIBRATION_COUNTDOWN_MS);
    setWinkCalibrationRemainingWinks(WINK_CALIBRATION_REQUIRED_WINKS);
  };

  const openSmileCalibration = () => {
    setActiveSmileCalibrationRunId(null);
    setSmileCalibrationFailureMessage('');
    setSmileCalibrationJudgmentUnavailable(false);
    setSmileCalibrationPhase('ready');
    setSmileCalibrationRemainingMs(WINK_CALIBRATION_COUNTDOWN_MS);
    setSmileCalibrationRemainingSmiles(SMILE_CALIBRATION_REQUIRED_SMILES);
    setSmileCalibrationOpen(true);
  };

  const closeSmileCalibration = () => {
    setActiveSmileCalibrationRunId(null);
    setSmileCalibrationOpen(false);
    setSmileCalibrationFailureMessage('');
    setSmileCalibrationJudgmentUnavailable(false);
    setSmileCalibrationPhase('ready');
    setSmileCalibrationRemainingMs(WINK_CALIBRATION_COUNTDOWN_MS);
    setSmileCalibrationRemainingSmiles(SMILE_CALIBRATION_REQUIRED_SMILES);
  };

  const startWinkCalibration = () => {
    if (winkCalibrationSide === null) {
      return;
    }

    winkCalibrationSamplesRef.current = [];
    gazeDetector.suppressSingleWinkUntilOpen();
    winkCalibrationRunCounterRef.current += 1;
    setWinkCalibrationFailureMessage('');
    setWinkCalibrationJudgmentUnavailable(false);
    setWinkCalibrationPhase('countdown');
    setWinkCalibrationRemainingMs(WINK_CALIBRATION_COUNTDOWN_MS);
    setWinkCalibrationRemainingWinks(WINK_CALIBRATION_REQUIRED_WINKS);
    setActiveWinkCalibrationRunId(winkCalibrationRunCounterRef.current);
  };

  const startSmileCalibration = () => {
    if (!smileCalibrationOpen) {
      return;
    }

    smileCalibrationSamplesRef.current = [];
    smileCalibrationRunCounterRef.current += 1;
    setSmileCalibrationFailureMessage('');
    setSmileCalibrationJudgmentUnavailable(false);
    setSmileCalibrationPhase('countdown');
    setSmileCalibrationRemainingMs(WINK_CALIBRATION_COUNTDOWN_MS);
    setSmileCalibrationRemainingSmiles(SMILE_CALIBRATION_REQUIRED_SMILES);
    setActiveSmileCalibrationRunId(smileCalibrationRunCounterRef.current);
  };

  useEffect(() => {
    if (
      winkCalibrationSide === null ||
      activeWinkCalibrationRunId === null
    ) {
      return;
    }

    let countdownIntervalId: ReturnType<typeof setInterval> | null = null;
    let captureIntervalId: ReturnType<typeof setInterval> | null = null;
    const rawCaptureState: RawWinkCalibrationCaptureState = {
      currentSampleIndex: null,
      isCapturingWink: false,
      selectedOpenBaseline: null,
    };
    let didFinish = false;
    let isCancelled = false;

    const clearCalibrationTimers = () => {
      if (countdownIntervalId !== null) {
        clearInterval(countdownIntervalId);
        countdownIntervalId = null;
      }

      if (captureIntervalId !== null) {
        clearInterval(captureIntervalId);
        captureIntervalId = null;
      }
    };

    const stopDetector = () => {
      gazeDetector.stop().catch(() => undefined);
    };

    const failCalibration = (message: string) => {
      if (didFinish || isCancelled) {
        return;
      }

      didFinish = true;
      clearCalibrationTimers();
      setWinkCalibrationFailureMessage(message);
      setWinkCalibrationJudgmentUnavailable(false);
      setWinkCalibrationPhase('failed');
      setWinkCalibrationRemainingMs(0);
      setWinkCalibrationRemainingWinks(0);
      setActiveWinkCalibrationRunId(null);
      stopDetector();
    };

    const saveSuccessfulCalibration = (
      result: Extract<WinkCalibrationResult, {ok: true}>,
    ) => {
      if (winkCalibrationSide === 'left') {
        setWinkLeftEyeClosedThreshold(result.eyeClosedThreshold);
        setWinkLeftEyeProbabilityGapThreshold(result.gapThreshold);
      } else {
        setWinkRightEyeClosedThreshold(result.eyeClosedThreshold);
        setWinkRightEyeProbabilityGapThreshold(result.gapThreshold);
      }
    };

    const finishCalibration = () => {
      if (didFinish || isCancelled) {
        return;
      }

      const result = getWinkCalibrationResult(
        winkCalibrationSamplesRef.current,
      );

      if (!result.ok) {
        failCalibration(translatorRef.current(result.messageKey));
        return;
      }

      didFinish = true;
      clearCalibrationTimers();
      saveSuccessfulCalibration(result);
      setWinkCalibrationRemainingMs(0);
      setWinkCalibrationRemainingWinks(0);
      setWinkCalibrationFailureMessage('');
      setWinkCalibrationJudgmentUnavailable(false);
      setWinkCalibrationPhase('ready');
      setActiveWinkCalibrationRunId(null);
      setWinkCalibrationSide(null);
      stopDetector();
    };

    const startWinkCapture = () => {
      if (didFinish || isCancelled) {
        return;
      }

      const captureStartedAtMs = Date.now();
      winkCalibrationSamplesRef.current = [];
      setWinkCalibrationJudgmentUnavailable(false);
      setWinkCalibrationPhase('measuring');
      setWinkCalibrationRemainingWinks(WINK_CALIBRATION_REQUIRED_WINKS);

      const captureCalibrationWink = () => {
        const now = Date.now();
        const elapsedMs = now - captureStartedAtMs;
        const nextReading = gazeDetector.getLatestReading(now);
        const nextSample = createWinkCalibrationSample(
          nextReading,
          winkCalibrationSide,
        );

        setWinkCalibrationJudgmentUnavailable(
          isWinkCalibrationJudgmentUnavailable(nextSample),
        );

        if (isRawWinkCalibrationReleased(nextSample)) {
          rawCaptureState.selectedOpenBaseline =
            getNextRawWinkCalibrationBaseline(
              rawCaptureState.selectedOpenBaseline,
              nextSample,
            );

          if (
            rawCaptureState.isCapturingWink &&
            winkCalibrationSamplesRef.current.length >=
              WINK_CALIBRATION_REQUIRED_WINKS
          ) {
            rawCaptureState.isCapturingWink = false;
            rawCaptureState.currentSampleIndex = null;
            finishCalibration();
            return;
          }

          rawCaptureState.isCapturingWink = false;
          rawCaptureState.currentSampleIndex = null;
        } else if (
          isRawWinkCalibrationAttempt(
            nextSample,
            rawCaptureState.selectedOpenBaseline,
          )
        ) {
          if (!rawCaptureState.isCapturingWink) {
            winkCalibrationSamplesRef.current.push(nextSample);
            rawCaptureState.isCapturingWink = true;
            rawCaptureState.currentSampleIndex =
              winkCalibrationSamplesRef.current.length - 1;
          } else if (
            rawCaptureState.currentSampleIndex !== null &&
            isBetterRawWinkCalibrationSample(
              nextSample,
              winkCalibrationSamplesRef.current[
                rawCaptureState.currentSampleIndex
              ],
            )
          ) {
            winkCalibrationSamplesRef.current[
              rawCaptureState.currentSampleIndex
            ] = nextSample;
          }

          const remainingWinks = Math.max(
            0,
            WINK_CALIBRATION_REQUIRED_WINKS -
              winkCalibrationSamplesRef.current.length,
          );
          setWinkCalibrationRemainingWinks(remainingWinks);
        }

        if (elapsedMs >= WINK_CALIBRATION_CAPTURE_TIMEOUT_MS) {
          finishCalibration();
        }
      };

      captureCalibrationWink();
      captureIntervalId = setInterval(
        captureCalibrationWink,
        WINK_CALIBRATION_POLL_MS,
      );
    };

    const startCountdown = () => {
      const countdownStartedAtMs = Date.now();

      const updateCountdown = () => {
        const elapsedMs = Date.now() - countdownStartedAtMs;

        setWinkCalibrationRemainingMs(
          Math.max(0, WINK_CALIBRATION_COUNTDOWN_MS - elapsedMs),
        );

        if (elapsedMs >= WINK_CALIBRATION_COUNTDOWN_MS) {
          if (countdownIntervalId !== null) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
          }

          startWinkCapture();
        }
      };

      updateCountdown();
      countdownIntervalId = setInterval(
        updateCountdown,
        WINK_CALIBRATION_POLL_MS,
      );
    };

    gazeDetector.start().catch(() => {
      failCalibration(translatorRef.current('calibration.failed.cameraStart'));
    });
    startCountdown();

    return () => {
      isCancelled = true;
      clearCalibrationTimers();
      if (!didFinish) {
        stopDetector();
      }
    };
  }, [
    activeWinkCalibrationRunId,
    gazeDetector,
    setWinkLeftEyeClosedThreshold,
    setWinkLeftEyeProbabilityGapThreshold,
    setWinkRightEyeClosedThreshold,
    setWinkRightEyeProbabilityGapThreshold,
    winkCalibrationSide,
  ]);

  useEffect(() => {
    if (!smileCalibrationOpen || activeSmileCalibrationRunId === null) {
      return;
    }

    let countdownIntervalId: ReturnType<typeof setInterval> | null = null;
    let captureIntervalId: ReturnType<typeof setInterval> | null = null;
    const rawCaptureState: RawSmileCalibrationCaptureState = {
      currentSampleIndex: null,
      isCapturingSmile: false,
    };
    let didFinish = false;
    let isCancelled = false;

    const clearCalibrationTimers = () => {
      if (countdownIntervalId !== null) {
        clearInterval(countdownIntervalId);
        countdownIntervalId = null;
      }

      if (captureIntervalId !== null) {
        clearInterval(captureIntervalId);
        captureIntervalId = null;
      }
    };

    const stopDetector = () => {
      gazeDetector.stop().catch(() => undefined);
    };

    const failCalibration = (message: string) => {
      if (didFinish || isCancelled) {
        return;
      }

      didFinish = true;
      clearCalibrationTimers();
      setSmileCalibrationFailureMessage(message);
      setSmileCalibrationJudgmentUnavailable(false);
      setSmileCalibrationPhase('failed');
      setSmileCalibrationRemainingMs(0);
      setSmileCalibrationRemainingSmiles(0);
      setActiveSmileCalibrationRunId(null);
      stopDetector();
    };

    const finishCalibration = () => {
      if (didFinish || isCancelled) {
        return;
      }

      const result = getSmileCalibrationResult(
        smileCalibrationSamplesRef.current,
      );

      if (!result.ok) {
        failCalibration(translatorRef.current(result.messageKey));
        return;
      }

      didFinish = true;
      clearCalibrationTimers();
      setSmileThreshold(result.threshold);
      setSmileCalibrationRemainingMs(0);
      setSmileCalibrationRemainingSmiles(0);
      setSmileCalibrationFailureMessage('');
      setSmileCalibrationJudgmentUnavailable(false);
      setSmileCalibrationPhase('ready');
      setActiveSmileCalibrationRunId(null);
      setSmileCalibrationOpen(false);
      stopDetector();
    };

    const startSmileCapture = () => {
      if (didFinish || isCancelled) {
        return;
      }

      const captureStartedAtMs = Date.now();
      smileCalibrationSamplesRef.current = [];
      setSmileCalibrationJudgmentUnavailable(false);
      setSmileCalibrationPhase('measuring');
      setSmileCalibrationRemainingSmiles(SMILE_CALIBRATION_REQUIRED_SMILES);

      const captureCalibrationSmile = () => {
        const now = Date.now();
        const elapsedMs = now - captureStartedAtMs;
        const nextReading = gazeDetector.getLatestReading(now);
        const nextSample = createSmileCalibrationSample(nextReading);

        setSmileCalibrationJudgmentUnavailable(
          isSmileCalibrationJudgmentUnavailable(nextSample),
        );

        if (isRawSmileCalibrationReleased(nextSample)) {
          if (
            rawCaptureState.isCapturingSmile &&
            smileCalibrationSamplesRef.current.length >=
              SMILE_CALIBRATION_REQUIRED_SMILES
          ) {
            rawCaptureState.isCapturingSmile = false;
            rawCaptureState.currentSampleIndex = null;
            finishCalibration();
            return;
          }

          rawCaptureState.isCapturingSmile = false;
          rawCaptureState.currentSampleIndex = null;
        } else if (isRawSmileCalibrationAttempt(nextSample)) {
          if (!rawCaptureState.isCapturingSmile) {
            smileCalibrationSamplesRef.current.push(nextSample);
            rawCaptureState.isCapturingSmile = true;
            rawCaptureState.currentSampleIndex =
              smileCalibrationSamplesRef.current.length - 1;
          } else if (
            rawCaptureState.currentSampleIndex !== null &&
            isBetterRawSmileCalibrationSample(
              nextSample,
              smileCalibrationSamplesRef.current[
                rawCaptureState.currentSampleIndex
              ],
            )
          ) {
            smileCalibrationSamplesRef.current[
              rawCaptureState.currentSampleIndex
            ] = nextSample;
          }

          const remainingSmiles = Math.max(
            0,
            SMILE_CALIBRATION_REQUIRED_SMILES -
              smileCalibrationSamplesRef.current.length,
          );
          setSmileCalibrationRemainingSmiles(remainingSmiles);
        }

        if (elapsedMs >= WINK_CALIBRATION_CAPTURE_TIMEOUT_MS) {
          finishCalibration();
        }
      };

      captureCalibrationSmile();
      captureIntervalId = setInterval(
        captureCalibrationSmile,
        WINK_CALIBRATION_POLL_MS,
      );
    };

    const startCountdown = () => {
      const countdownStartedAtMs = Date.now();

      const updateCountdown = () => {
        const elapsedMs = Date.now() - countdownStartedAtMs;

        setSmileCalibrationRemainingMs(
          Math.max(0, WINK_CALIBRATION_COUNTDOWN_MS - elapsedMs),
        );

        if (elapsedMs >= WINK_CALIBRATION_COUNTDOWN_MS) {
          if (countdownIntervalId !== null) {
            clearInterval(countdownIntervalId);
            countdownIntervalId = null;
          }

          startSmileCapture();
        }
      };

      updateCountdown();
      countdownIntervalId = setInterval(
        updateCountdown,
        WINK_CALIBRATION_POLL_MS,
      );
    };

    gazeDetector.start().catch(() => {
      failCalibration(translatorRef.current('calibration.failed.cameraStart'));
    });
    startCountdown();

    return () => {
      isCancelled = true;
      clearCalibrationTimers();
      if (!didFinish) {
        stopDetector();
      }
    };
  }, [
    activeSmileCalibrationRunId,
    gazeDetector,
    setSmileThreshold,
    smileCalibrationOpen,
  ]);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title} testID="settings-title">
          {t('settings.title')}
        </Text>
        <PrimaryButton
          label={t('common.back')}
          onPress={() => {
            setScreen('timer');
          }}
          testID="settings-back-button"
          variant="secondary"
          style={styles.returnButton}
        />
      </View>

      {SHOW_REMOVE_ADS_SETTINGS ? (
        <AccordionGroup
          title={t('settings.removeAds.title')}
          summary={t('settings.removeAds.summary')}
          expanded={expandedSettingsGroup === 'remove-ads-settings'}
          onToggle={() => {
            toggleSettingsGroup('remove-ads-settings');
          }}
          emphasized
          testID="remove-ads-settings">
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>{t('settings.adStatus')}</Text>
            <Text style={styles.description}>
              {t('settings.standardWithAds')}
            </Text>
          </View>
        </AccordionGroup>
      ) : null}

      <AccordionGroup
        title={t('settings.timer.title')}
        summary={t('settings.timer.summary')}
        expanded={expandedSettingsGroup === 'timer-alert-settings'}
        onToggle={() => {
          toggleSettingsGroup('timer-alert-settings');
        }}
        testID="timer-alert-settings">
        <BooleanButtonControl
          title={t('settings.vibration')}
          value={timerAlertVibrationEnabled}
          testID="timer-alert-vibration"
          t={t}
          onChange={setTimerAlertVibrationEnabled}
        />
        <BooleanButtonControl
          title={t('settings.sound')}
          value={timerAlertSoundEnabled}
          testID="timer-alert-sound"
          t={t}
          onChange={setTimerAlertSoundEnabled}
        />
        <SoundOptionControl
          value={timerAlertSoundId}
          t={t}
          onChange={setTimerAlertSoundId}
        />
        <TimerAlertDurationControl
          value={timerAlertDurationId}
          t={t}
          onChange={setTimerAlertDurationId}
        />
        <TimerAlertVibrationPatternControl
          value={timerAlertVibrationPatternId}
          t={t}
          onChange={setTimerAlertVibrationPatternId}
        />
      </AccordionGroup>

      <AccordionGroup
        title={t('settings.permissions.title')}
        summary={t('settings.permissions.summary')}
        expanded={expandedSettingsGroup === 'permissions-settings'}
        onToggle={() => {
          toggleSettingsGroup('permissions-settings');
          refreshPermissionStatuses();
        }}
        testID="permissions-settings">
        <View style={styles.section}>
          <PermissionRow
            title={t('settings.permission.camera')}
            status={permissionStatuses.camera}
            testID="permission-camera"
            t={t}
            onRequest={requestCameraPermissionFromSettings}
          />
          <PermissionRow
            title={t('settings.permission.notifications')}
            status={permissionStatuses.notifications}
            testID="permission-notifications"
            t={t}
            onRequest={requestNotificationPermissionFromSettings}
          />
        </View>
      </AccordionGroup>

      <AccordionGroup
        title={t('settings.look.title')}
        summary={t('settings.look.summary')}
        expanded={expandedSettingsGroup === 'look-settings'}
        onToggle={() => {
          toggleSettingsGroup('look-settings');
        }}
        testID="look-settings">
        <OptionButtonControl
          title={t('settings.faceDirection')}
          value={lookAngleLevel}
          levels={lookAngleLevels}
          labelForLevel={level => getRangeLabel(level, t)}
          testID="look-angle-levels"
          onChange={level => {
            setLookAngleLevel(level as LookAngleLevel);
          }}
        />
        <OptionButtonControl
          title={t('settings.verticalRange')}
          value={faceHeightAngleLevel}
          levels={faceHeightAngleLevels}
          labelForLevel={level => getRangeLabel(level, t)}
          testID="face-height-angle-levels"
          onChange={level => {
            setFaceHeightAngleLevel(level as FaceHeightAngleLevel);
          }}
        />
      </AccordionGroup>

      <AccordionGroup
        title={t('settings.wink.title')}
        summary={t('settings.wink.summary')}
        expanded={expandedSettingsGroup === 'wink-settings'}
        onToggle={() => {
          toggleSettingsGroup('wink-settings');
        }}
        testID="wink-settings">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('settings.winkCalibration')}
          </Text>
          <View style={styles.calibrationRow}>
            <PrimaryButton
              label={t('settings.leftWink')}
              disabled={isAnyCalibrating}
              onPress={() => {
                openWinkCalibration('left');
              }}
              testID="calibrate-left-wink"
              style={styles.calibrationButton}
            />
            <PrimaryButton
              label={t('settings.rightWink')}
              disabled={isAnyCalibrating}
              onPress={() => {
                openWinkCalibration('right');
              }}
              testID="calibrate-right-wink"
              style={styles.calibrationButton}
            />
          </View>
        </View>
        <OptionButtonControl
          title={t('settings.faceDistance')}
          value={winkDistanceLevel}
          levels={winkDistanceLevels}
          labelForLevel={level => getDistanceLabel(level, t)}
          testID="wink-distance-levels"
          onChange={level => {
            setWinkDistanceLevel(level as WinkDistanceLevel);
          }}
        />
      </AccordionGroup>

      <AccordionGroup
        title={t('settings.smile.title')}
        summary={t('settings.smile.summary')}
        expanded={expandedSettingsGroup === 'smile-settings'}
        onToggle={() => {
          toggleSettingsGroup('smile-settings');
        }}
        testID="smile-settings">
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {t('settings.smileCalibration')}
          </Text>
          <Text style={styles.description} testID="smile-threshold-value">
            {t('settings.currentValue', {
              value: getSmileThresholdLabel(smileThreshold),
            })}
          </Text>
          <PrimaryButton
            label={t('settings.smileSetting')}
            disabled={isAnyCalibrating}
            onPress={openSmileCalibration}
            testID="calibrate-smile"
            style={styles.calibrationButton}
          />
        </View>
        <OptionButtonControl
          title={t('settings.faceDistance')}
          value={smileDistanceLevel}
          levels={smileDistanceLevels}
          labelForLevel={level => getDistanceLabel(level, t)}
          testID="smile-distance-levels"
          onChange={level => {
            setSmileDistanceLevel(level as SmileDistanceLevel);
          }}
        />
      </AccordionGroup>

      <AccordionGroup
        title={t('settings.camera.title')}
        summary={t('settings.camera.summary')}
        expanded={expandedSettingsGroup === 'camera-settings'}
        onToggle={() => {
          toggleSettingsGroup('camera-settings');
        }}
        testID="camera-settings">
        <Text
          style={styles.cameraSettingsWarning}
          testID="camera-settings-warning">
          {t('settings.camera.warning')}
        </Text>
        <OptionButtonControl
          title={t('settings.imageSize')}
          value={detectionResolutionLevel}
          levels={detectionResolutionLevels}
          labelForLevel={getResolutionLabel}
          testID="detection-resolution-levels"
          onChange={level => {
            setDetectionResolutionLevel(level as DetectionResolutionLevel);
          }}
        />
        <OptionButtonControl
          title={t('settings.frameRate')}
          value={detectionFrameIntervalLevel}
          levels={detectionFrameIntervalLevels}
          labelForLevel={level => getFrameIntervalLabel(level, t)}
          testID="detection-frame-interval-levels"
          onChange={level => {
            setDetectionFrameIntervalLevel(
              level as DetectionFrameIntervalLevel,
            );
          }}
        />
        <OptionButtonControl
          title={t('settings.analysisMode')}
          value={getDetectionPerformanceLevel(detectionPerformanceMode)}
          levels={detectionPerformanceLevels}
          labelForLevel={level => getDetectionPerformanceLabel(level, t)}
          testID="detection-performance-mode-levels"
          onChange={level => {
            setDetectionPerformanceMode(getDetectionPerformanceMode(level));
          }}
        />
      </AccordionGroup>

      <AccordionGroup
        title={t('settings.language.title')}
        summary={t('settings.language.summary')}
        expanded={expandedSettingsGroup === 'language-settings'}
        onToggle={() => {
          toggleSettingsGroup('language-settings');
        }}
        testID="language-settings">
        <LanguageOptionControl value={locale} t={t} onChange={setLocale} />
      </AccordionGroup>

      <Modal
        animationType="fade"
        transparent
        visible={winkCalibrationSide !== null}>
        <View style={styles.modalBackdrop} testID="wink-calibration-popup">
          <View
            pointerEvents="none"
            style={styles.cameraDotBackground}
            testID="calibration-camera-dot-background">
            <View
              style={styles.cameraDot}
              testID="calibration-camera-dot"
            />
          </View>
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>{t('calibration.winkSetting')}</Text>
            <Text style={styles.modalMessage}>
              {winkCalibrationFailureMessage !== ''
                ? winkCalibrationFailureMessage
                : winkCalibrationPhase === 'ready'
                  ? t('calibration.winkLookAtCameraStart')
                  : winkCalibrationPhase === 'countdown'
                    ? t('calibration.winkMeasurementStarts')
                    : winkCalibrationSide === null
                      ? ''
                      : t('calibration.winkPrompt', {
                          eye: getCalibrationEyeName(winkCalibrationSide, t),
                        })}
            </Text>
            {winkCalibrationPhase === 'countdown' ? (
              <Text style={styles.modalTimer}>
                {Math.ceil(winkCalibrationRemainingMs / 1000)}s
              </Text>
            ) : winkCalibrationPhase === 'measuring' ? (
              <>
                <Text
                  style={styles.modalTimer}
                  testID="wink-calibration-count">
                  {winkCalibrationRemainingWinks}
                </Text>
                <Text
                  style={styles.calibrationUnavailableMessage}
                  testID="wink-calibration-unavailable-message">
                  {winkCalibrationJudgmentUnavailable
                    ? t('calibration.winkUnavailable')
                    : ''}
                </Text>
              </>
            ) : null}
            <View style={styles.modalActions}>
              {winkCalibrationPhase === 'ready' ||
              winkCalibrationPhase === 'failed' ? (
                <PrimaryButton
                  label={
                    winkCalibrationPhase === 'failed'
                      ? t('common.retry')
                      : t('common.start')
                  }
                  onPress={startWinkCalibration}
                  testID="start-wink-calibration"
                  style={styles.modalButton}
                />
              ) : null}
              <PrimaryButton
                label={t('common.cancel')}
                onPress={closeWinkCalibration}
                testID="cancel-wink-calibration"
                variant="secondary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
      <Modal animationType="fade" transparent visible={smileCalibrationOpen}>
        <View style={styles.modalBackdrop} testID="smile-calibration-popup">
          <View
            pointerEvents="none"
            style={styles.cameraDotBackground}
            testID="smile-calibration-camera-dot-background">
            <View
              style={styles.cameraDot}
              testID="smile-calibration-camera-dot"
            />
          </View>
          <View style={styles.modalPanel}>
            <Text style={styles.modalTitle}>
              {t('calibration.smileSetting')}
            </Text>
            <Text style={styles.modalMessage}>
              {smileCalibrationFailureMessage !== ''
                ? smileCalibrationFailureMessage
                : smileCalibrationPhase === 'ready'
                  ? t('calibration.smileLookAtCameraStart')
                  : smileCalibrationPhase === 'countdown'
                    ? t('calibration.smileMeasurementStarts')
                    : t('calibration.smilePrompt')}
            </Text>
            {smileCalibrationPhase === 'countdown' ? (
              <Text style={styles.modalTimer}>
                {Math.ceil(smileCalibrationRemainingMs / 1000)}s
              </Text>
            ) : smileCalibrationPhase === 'measuring' ? (
              <>
                <Text
                  style={styles.modalTimer}
                  testID="smile-calibration-count">
                  {smileCalibrationRemainingSmiles}
                </Text>
                <Text
                  style={styles.calibrationUnavailableMessage}
                  testID="smile-calibration-unavailable-message">
                  {smileCalibrationJudgmentUnavailable
                    ? t('calibration.smileUnavailable')
                    : ''}
                </Text>
              </>
            ) : null}
            <View style={styles.modalActions}>
              {smileCalibrationPhase === 'ready' ||
              smileCalibrationPhase === 'failed' ? (
                <PrimaryButton
                  label={
                    smileCalibrationPhase === 'failed'
                      ? t('common.retry')
                      : t('common.start')
                  }
                  onPress={startSmileCalibration}
                  testID="start-smile-calibration"
                  style={styles.modalButton}
                />
              ) : null}
              <PrimaryButton
                label={t('common.cancel')}
                onPress={closeSmileCalibration}
                testID="cancel-smile-calibration"
                variant="secondary"
                style={styles.modalButton}
              />
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    gap: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  title: {
    color: '#121A14',
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 25,
  },
  returnButton: {
    minHeight: 34,
    paddingHorizontal: 14,
    paddingVertical: 4,
  },
  group: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE2DE',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
  },
  emphasizedGroup: {
    borderColor: '#D5972B',
  },
  groupHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 68,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  emphasizedGroupHeader: {
    backgroundColor: '#FFF4D8',
  },
  groupHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  groupTitle: {
    color: '#121A14',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 22,
  },
  emphasizedGroupTitle: {
    color: '#7A3E00',
  },
  groupSummary: {
    color: '#5D6A62',
    fontSize: 12,
    fontWeight: '600',
    lineHeight: 16,
  },
  emphasizedGroupSummary: {
    color: '#7C5B1D',
  },
  groupCue: {
    color: '#121A14',
    fontSize: 22,
    fontWeight: '900',
    minWidth: 24,
    textAlign: 'center',
  },
  emphasizedGroupCue: {
    color: '#7A3E00',
  },
  groupBody: {
    backgroundColor: '#F3F6F1',
    borderColor: '#DCE2DE',
    borderTopWidth: 1,
    gap: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    color: '#121A14',
    fontSize: 14,
    fontWeight: '800',
    lineHeight: 18,
  },
  cameraSettingsWarning: {
    color: '#B42318',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  settingCopy: {
    gap: 4,
  },
  description: {
    color: '#5D6A62',
    fontSize: 12,
    lineHeight: 16,
    textTransform: 'uppercase',
  },
  permissionRow: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE2DE',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  permissionCopy: {
    flex: 1,
    gap: 4,
  },
  permissionStatus: {
    color: '#5D6A62',
    fontSize: 12,
    fontWeight: '800',
    lineHeight: 16,
  },
  permissionStatusGranted: {
    color: '#1D4D3A',
  },
  permissionStatusMissing: {
    color: '#B42318',
  },
  permissionButton: {
    minHeight: 40,
    minWidth: 96,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  toggleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  soundHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  soundTitleGroup: {
    flex: 1,
    gap: 4,
  },
  soundSelectedName: {
    color: '#5D6A62',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  soundPreviewButton: {
    minHeight: 34,
    minWidth: 84,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  soundModalPanel: {
    alignItems: 'stretch',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE2DE',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    maxHeight: '78%',
    maxWidth: 380,
    paddingHorizontal: 16,
    paddingVertical: 16,
    width: '100%',
  },
  soundModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  soundOptionScroller: {
    backgroundColor: '#F3F6F1',
    borderColor: '#DCE2DE',
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: 320,
  },
  soundOptionList: {
    gap: 8,
    padding: 10,
  },
  soundOptionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  soundListTitle: {
    color: '#5D6A62',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
  },
  toggleButton: {
    minHeight: 40,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  soundOptionButton: {
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
    width: '100%',
  },
  soundOptionSelectButton: {
    flex: 1,
    minHeight: 40,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  soundOptionPreviewButton: {
    minHeight: 34,
    minWidth: 44,
    paddingHorizontal: 6,
    paddingVertical: 6,
    width: 44,
  },
  languageOptionScrollFrame: {
    position: 'relative',
  },
  languageOptionScroll: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D2CB',
    borderRadius: 8,
    borderWidth: 1,
    maxHeight: LANGUAGE_OPTION_SCROLL_MAX_HEIGHT,
  },
  languageOptionList: {
    gap: 8,
    padding: 10,
    paddingRight: 22,
  },
  languageScrollbarTrack: {
    backgroundColor: '#D8E0DA',
    borderRadius: 2,
    bottom: 8,
    position: 'absolute',
    right: 6,
    top: 8,
    width: 4,
  },
  languageScrollbarThumb: {
    backgroundColor: '#1D4D3A',
    borderRadius: 2,
    width: 4,
  },
  languageOptionRow: {
    minHeight: 48,
  },
  languageOptionButton: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE2DE',
    borderRadius: 8,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
    minHeight: 48,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  selectedLanguageOptionButton: {
    backgroundColor: '#EAF4EE',
    borderColor: '#1D4D3A',
  },
  pressedLanguageOptionButton: {
    opacity: 0.82,
  },
  languageOptionCopy: {
    flex: 1,
    minWidth: 0,
  },
  languageOptionName: {
    color: '#121A14',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 20,
  },
  languageOptionCountry: {
    color: '#5D6A62',
    fontSize: 12,
    fontWeight: '700',
    lineHeight: 16,
  },
  languageOptionCheck: {
    color: '#1D4D3A',
    fontSize: 18,
    fontWeight: '900',
    minWidth: 20,
    textAlign: 'center',
  },
  durationStepper: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  durationStepperDisabled: {
    opacity: 0.46,
  },
  durationStepButton: {
    minHeight: 44,
    minWidth: 56,
    paddingHorizontal: 0,
    paddingVertical: 8,
    width: 56,
  },
  durationValue: {
    backgroundColor: '#FFFFFF',
    borderColor: '#C9D2CB',
    borderRadius: 8,
    borderWidth: 1,
    color: '#121A14',
    flex: 1,
    fontSize: 22,
    fontWeight: '900',
    minHeight: 44,
    paddingVertical: 8,
    textAlign: 'center',
  },
  durationValueDisabled: {
    color: '#6A746D',
  },
  calibrationRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  calibrationButton: {
    flexGrow: 1,
    minHeight: 42,
    minWidth: 142,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(18, 26, 20, 0.48)',
    flex: 1,
    justifyContent: 'flex-start',
    paddingBottom: 20,
    paddingHorizontal: 20,
    paddingTop: 84,
    position: 'relative',
  },
  modalPanel: {
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE2DE',
    borderRadius: 8,
    borderWidth: 1,
    gap: 14,
    maxWidth: 360,
    paddingHorizontal: 20,
    paddingVertical: 20,
    width: '100%',
  },
  cameraDotBackground: {
    alignSelf: 'center',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE2DE',
    borderRadius: 14,
    borderWidth: 1,
    elevation: 12,
    height: 28,
    justifyContent: 'center',
    position: 'absolute',
    shadowColor: '#000000',
    shadowOffset: {height: 2, width: 0},
    shadowOpacity: 0.16,
    shadowRadius: 4,
    top: 8,
    width: 38,
    zIndex: 12,
  },
  cameraDot: {
    backgroundColor: '#D93025',
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  modalTitle: {
    color: '#121A14',
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  modalMessage: {
    color: '#253029',
    fontSize: 15,
    fontWeight: '700',
    lineHeight: 22,
    textAlign: 'center',
  },
  modalTimer: {
    color: '#121A14',
    fontSize: 34,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 0,
  },
  calibrationUnavailableMessage: {
    color: '#B42318',
    fontSize: 13,
    fontWeight: '900',
    lineHeight: 18,
    minHeight: 18,
    textAlign: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'center',
    width: '100%',
  },
  modalButton: {
    flexGrow: 1,
    minHeight: 42,
    minWidth: 118,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
});
