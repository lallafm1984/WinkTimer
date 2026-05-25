import React, {useEffect, useRef, useState} from 'react';
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import type {
  DetectionReading,
  DetectionFrameIntervalLevel,
  DetectionPerformanceMode,
  DetectionResolutionLevel,
  FaceHeightAngleLevel,
  LookAngleLevel,
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
  winkDistanceLevels,
} from '../domain/detection';
import {useAppState} from '../state/AppState';

const WINK_TEST_POLL_MS = 100;
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
const detectionPerformanceLevels = [1, 2] as const;

type WinkCalibrationSide = 'left' | 'right';

type WinkCalibrationPhase = 'ready' | 'countdown' | 'measuring' | 'failed';

type WinkCalibrationSample = {
  status: DetectionReading['status'];
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
      message: string;
    };

type AccordionGroupProps = {
  title: string;
  summary: string;
  testID: string;
  children: React.ReactNode;
};

type OptionButtonControlProps = {
  title: string;
  value: number;
  valueLabel: string;
  levels: readonly number[];
  testID: string;
  labelForLevel?: (level: number) => string;
  onChange(value: number): void;
};

type MetricProps = {
  label: string;
  value: string;
};

function AccordionGroup({
  title,
  summary,
  testID,
  children,
}: AccordionGroupProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <View style={styles.group}>
      <Pressable
        accessibilityLabel={title}
        accessibilityRole="button"
        accessibilityState={{expanded}}
        onPress={() => {
          setExpanded(current => !current);
        }}
        style={styles.groupHeader}
        testID={`${testID}-accordion`}>
        <View style={styles.groupHeaderCopy}>
          <Text style={styles.groupTitle}>{title}</Text>
          <Text style={styles.groupSummary}>{summary}</Text>
        </View>
        <Text style={styles.groupCue}>{expanded ? '-' : '+'}</Text>
      </Pressable>
      {expanded ? (
        <View style={styles.groupBody} testID={`${testID}-body`}>
          {children}
        </View>
      ) : null}
    </View>
  );
}

function Metric({label, value}: MetricProps) {
  return (
    <View style={styles.metric}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function formatRatio(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(2)
    : '--';
}

function formatPercent(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${Math.round(value * 100)}%`
    : '--';
}

function formatDegrees(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? value.toFixed(1)
    : '--';
}

function formatMs(value: number | null | undefined): string {
  return typeof value === 'number' && Number.isFinite(value)
    ? `${Math.round(value)} ms`
    : '--';
}

function isFiniteNumber(value: number | null | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function getWinkSideLabel(reading: DetectionReading | null): string {
  return reading?.winkSide ?? '--';
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

function getCalibrationEyeName(side: WinkCalibrationSide) {
  return side === 'left' ? '왼쪽 눈' : '오른쪽 눈';
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
        message:
          '측정 실패: 얼굴을 카메라 정면에 맞춘 뒤 다시 측정하세요.',
      };
    }

    if (notLookingCount > samples.length * 0.35) {
      return {
        ok: false,
        message:
          '측정 실패: 얼굴과 눈 값이 안정적으로 잡히지 않았습니다. 조명과 카메라 위치를 확인하세요.',
      };
    }

    return {
      ok: false,
      message:
        '측정 실패: 눈 값이 안정적으로 측정되지 않았습니다. 밝은 곳에서 다시 측정하세요.',
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
      message:
        '측정 실패: 선택한 눈이 충분히 감기지 않았습니다. 다시 측정하세요.',
    };
  }

  if (
    minOtherEye <
    WINK_CALIBRATION_OPEN_EYE_MIN_OPEN_PROBABILITY
  ) {
    return {
      ok: false,
      message:
        '측정 실패: 양쪽 눈이 모두 감긴 것으로 측정되었습니다. 반대쪽 눈은 뜬 상태로 다시 측정하세요.',
    };
  }

  if (minGap < WINK_CALIBRATION_MIN_GAP_THRESHOLD) {
    return {
      ok: false,
      message:
        '측정 실패: 양쪽 눈 차이가 작아 윙크로 구분하기 어렵습니다. 조명과 눈 각도를 조정하세요.',
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

function getRangeLabel(level: number): string {
  switch (level) {
    case 1:
      return 'NARROW';
    case 3:
      return 'WIDE';
    default:
      return 'NORMAL';
  }
}

function getDistanceLabel(level: number): string {
  switch (level) {
    case 1:
      return 'CLOSE';
    case 3:
      return 'MID';
    default:
      return 'FAR';
  }
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

function getDetectionPerformanceLabel(level: number): string {
  return getDetectionPerformanceMode(level).toUpperCase();
}

function getResolutionLabel(level: number): string {
  const resolution =
    detectionResolutionByLevel[level as DetectionResolutionLevel];

  return `${resolution.width}x${resolution.height}`;
}

function getFrameIntervalLabel(level: number): string {
  const interval =
    detectionFrameIntervalMsByLevel[level as DetectionFrameIntervalLevel];

  return interval === 0 ? 'REALTIME' : `${interval} MS`;
}

function getFrameIntervalValueLabel(level: DetectionFrameIntervalLevel) {
  const interval = detectionFrameIntervalMsByLevel[level];

  return interval === 0 ? 'REALTIME' : `${interval} ms`;
}

function OptionButtonControl({
  title,
  value,
  valueLabel,
  levels,
  testID,
  labelForLevel,
  onChange,
}: OptionButtonControlProps) {
  return (
    <View style={styles.section}>
      <View style={styles.settingCopy}>
        <Text style={styles.sectionTitle}>{title}</Text>
        <Text style={styles.description}>{valueLabel}</Text>
      </View>
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

export function SettingsScreen() {
  const {
    winkLeftEyeClosedThreshold,
    setWinkLeftEyeClosedThreshold,
    winkRightEyeClosedThreshold,
    setWinkRightEyeClosedThreshold,
    winkLeftEyeProbabilityGapThreshold,
    setWinkLeftEyeProbabilityGapThreshold,
    winkRightEyeProbabilityGapThreshold,
    setWinkRightEyeProbabilityGapThreshold,
    winkDistanceLevel,
    setWinkDistanceLevel,
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
    gazeDetector,
    setScreen,
  } = useAppState();
  const [winkTestEnabled, setWinkTestEnabled] = useState(false);
  const [winkTestReading, setWinkTestReading] =
    useState<DetectionReading | null>(null);
  const [lastWinkReading, setLastWinkReading] =
    useState<DetectionReading | null>(null);
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
  const [activeWinkCalibrationRunId, setActiveWinkCalibrationRunId] = useState<
    number | null
  >(null);
  const winkCalibrationSamplesRef = useRef<WinkCalibrationSample[]>([]);
  const winkCalibrationRunCounterRef = useRef(0);

  useEffect(() => {
    if (!winkTestEnabled) {
      return;
    }

    let isCancelled = false;
    gazeDetector.start().catch(() => {
      if (!isCancelled) {
        setWinkTestReading({
          status: 'unknown',
          confidence: 0,
          eyeState: 'unknown',
          atMs: Date.now(),
        });
      }
    });

    const intervalId = setInterval(() => {
      const now = Date.now();
      const consumedWink = gazeDetector.consumeSingleWink(now);
      const nextReading = consumedWink ?? gazeDetector.getLatestReading(now);

      if (consumedWink !== null) {
        setLastWinkReading(consumedWink);
      }

      setWinkTestReading(nextReading);
    }, WINK_TEST_POLL_MS);

    return () => {
      isCancelled = true;
      clearInterval(intervalId);
      gazeDetector.stop().catch(() => undefined);
    };
  }, [gazeDetector, winkTestEnabled]);

  const winkDebug = winkTestReading?.winkDebug;
  const isWinkCalibrating = winkCalibrationSide !== null;

  const openWinkCalibration = (side: WinkCalibrationSide) => {
    setWinkTestEnabled(false);
    setActiveWinkCalibrationRunId(null);
    setWinkCalibrationFailureMessage('');
    setWinkCalibrationPhase('ready');
    setWinkCalibrationRemainingMs(WINK_CALIBRATION_COUNTDOWN_MS);
    setWinkCalibrationRemainingWinks(WINK_CALIBRATION_REQUIRED_WINKS);
    setWinkCalibrationSide(side);
  };

  const closeWinkCalibration = () => {
    setActiveWinkCalibrationRunId(null);
    setWinkCalibrationSide(null);
    setWinkCalibrationFailureMessage('');
    setWinkCalibrationPhase('ready');
    setWinkCalibrationRemainingMs(WINK_CALIBRATION_COUNTDOWN_MS);
    setWinkCalibrationRemainingWinks(WINK_CALIBRATION_REQUIRED_WINKS);
  };

  const startWinkCalibration = () => {
    if (winkCalibrationSide === null) {
      return;
    }

    winkCalibrationSamplesRef.current = [];
    gazeDetector.suppressSingleWinkUntilOpen();
    winkCalibrationRunCounterRef.current += 1;
    setWinkCalibrationFailureMessage('');
    setWinkCalibrationPhase('countdown');
    setWinkCalibrationRemainingMs(WINK_CALIBRATION_COUNTDOWN_MS);
    setWinkCalibrationRemainingWinks(WINK_CALIBRATION_REQUIRED_WINKS);
    setActiveWinkCalibrationRunId(winkCalibrationRunCounterRef.current);
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
        failCalibration(result.message);
        return;
      }

      didFinish = true;
      clearCalibrationTimers();
      saveSuccessfulCalibration(result);
      setWinkCalibrationRemainingMs(0);
      setWinkCalibrationRemainingWinks(0);
      setWinkCalibrationFailureMessage('');
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

        setWinkTestReading(nextReading);

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
          setLastWinkReading({
            ...nextReading,
            winkSide: winkCalibrationSide,
          });

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
        WINK_TEST_POLL_MS,
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
      countdownIntervalId = setInterval(updateCountdown, WINK_TEST_POLL_MS);
    };

    gazeDetector.start().catch(() => {
      failCalibration(
        '측정 실패: 카메라를 시작할 수 없습니다. 권한과 조명을 확인한 뒤 다시 측정하세요.',
      );
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

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>SETTINGS</Text>
        <PrimaryButton
          label="BACK"
          onPress={() => {
            setScreen('timer');
          }}
          variant="secondary"
          style={styles.returnButton}
        />
      </View>

      <AccordionGroup
        title="LOOK MODE"
        summary="Face direction controls"
        testID="look-settings">
        <OptionButtonControl
          title="FACE DIRECTION"
          value={lookAngleLevel}
          valueLabel={getRangeLabel(lookAngleLevel)}
          levels={lookAngleLevels}
          labelForLevel={getRangeLabel}
          testID="look-angle-levels"
          onChange={level => {
            setLookAngleLevel(level as LookAngleLevel);
          }}
        />
        <OptionButtonControl
          title="VERTICAL RANGE"
          value={faceHeightAngleLevel}
          valueLabel={getRangeLabel(faceHeightAngleLevel)}
          levels={faceHeightAngleLevels}
          labelForLevel={getRangeLabel}
          testID="face-height-angle-levels"
          onChange={level => {
            setFaceHeightAngleLevel(level as FaceHeightAngleLevel);
          }}
        />
      </AccordionGroup>

      <AccordionGroup
        title="WINK MODE"
        summary="Eye thresholds and face distance"
        testID="wink-settings">
        <View style={styles.section}>
          <View style={styles.settingCopy}>
            <Text style={styles.sectionTitle}>WINK CALIBRATION</Text>
            <Text style={styles.description}>3 WINKS</Text>
          </View>
          <View style={styles.calibrationRow}>
            <PrimaryButton
              label="LEFT WINK SETTING"
              disabled={isWinkCalibrating}
              onPress={() => {
                openWinkCalibration('left');
              }}
              testID="calibrate-left-wink"
              style={styles.calibrationButton}
            />
            <PrimaryButton
              label="RIGHT WINK SETTING"
              disabled={isWinkCalibrating}
              onPress={() => {
                openWinkCalibration('right');
              }}
              testID="calibrate-right-wink"
              style={styles.calibrationButton}
            />
          </View>
        </View>
        <OptionButtonControl
          title="FACE DISTANCE"
          value={winkDistanceLevel}
          valueLabel={getDistanceLabel(winkDistanceLevel)}
          levels={winkDistanceLevels}
          labelForLevel={getDistanceLabel}
          testID="wink-distance-levels"
          onChange={level => {
            setWinkDistanceLevel(level as WinkDistanceLevel);
          }}
        />
      </AccordionGroup>

      <AccordionGroup
        title="CAMERA"
        summary="Camera analysis controls"
        testID="camera-settings">
        <OptionButtonControl
          title="IMAGE SIZE"
          value={detectionResolutionLevel}
          valueLabel={`${detectionResolutionByLevel[detectionResolutionLevel].width} x ${detectionResolutionByLevel[detectionResolutionLevel].height}`}
          levels={detectionResolutionLevels}
          labelForLevel={getResolutionLabel}
          testID="detection-resolution-levels"
          onChange={level => {
            setDetectionResolutionLevel(level as DetectionResolutionLevel);
          }}
        />
        <OptionButtonControl
          title="FRAME RATE"
          value={detectionFrameIntervalLevel}
          valueLabel={getFrameIntervalValueLabel(detectionFrameIntervalLevel)}
          levels={detectionFrameIntervalLevels}
          labelForLevel={getFrameIntervalLabel}
          testID="detection-frame-interval-levels"
          onChange={level => {
            setDetectionFrameIntervalLevel(
              level as DetectionFrameIntervalLevel,
            );
          }}
        />
        <OptionButtonControl
          title="ANALYSIS MODE"
          value={getDetectionPerformanceLevel(detectionPerformanceMode)}
          valueLabel={detectionPerformanceMode.toUpperCase()}
          levels={detectionPerformanceLevels}
          labelForLevel={getDetectionPerformanceLabel}
          testID="detection-performance-mode-levels"
          onChange={level => {
            setDetectionPerformanceMode(getDetectionPerformanceMode(level));
          }}
        />
      </AccordionGroup>

      <AccordionGroup
        title="WINK TEST"
        summary="Live values and calibration"
        testID="wink-test">
        <View style={styles.section}>
          <View style={styles.testHeader}>
            <View style={styles.settingCopy}>
              <Text style={styles.sectionTitle}>LIVE CAMERA</Text>
              <Text style={styles.description}>
                {winkTestEnabled ? 'CAMERA ON' : 'CAMERA OFF'}
              </Text>
            </View>
            <PrimaryButton
              label={winkTestEnabled ? 'STOP' : 'START'}
              onPress={() => {
                setWinkTestEnabled(enabled => !enabled);
              }}
              testID="wink-test-toggle"
              variant={winkTestEnabled ? 'secondary' : 'primary'}
              style={styles.testButton}
            />
          </View>

          <View style={styles.metricGrid}>
            <Metric
              label="SAVED LEFT"
              value={formatRatio(winkLeftEyeClosedThreshold)}
            />
            <Metric
              label="SAVED RIGHT"
              value={formatRatio(winkRightEyeClosedThreshold)}
            />
            <Metric
              label="SAVED LEFT GAP"
              value={formatRatio(winkLeftEyeProbabilityGapThreshold)}
            />
            <Metric
              label="SAVED RIGHT GAP"
              value={formatRatio(winkRightEyeProbabilityGapThreshold)}
            />
            <Metric label="STATUS" value={winkTestReading?.status ?? '--'} />
            <Metric label="EYE" value={winkTestReading?.eyeState ?? '--'} />
            <Metric label="SIDE" value={getWinkSideLabel(winkTestReading)} />
            <Metric
              label="CONFIDENCE"
              value={formatPercent(winkTestReading?.confidence)}
            />
            <Metric
              label="LEFT EYE"
              value={formatRatio(
                getWinkTestEyeOpenProbability(winkDebug, 'left'),
              )}
            />
            <Metric
              label="RIGHT EYE"
              value={formatRatio(
                getWinkTestEyeOpenProbability(winkDebug, 'right'),
              )}
            />
            <Metric
              label="GAP"
              value={formatRatio(winkDebug?.eyeProbabilityGap)}
            />
            <Metric
              label="FACE AREA"
              value={formatRatio(winkDebug?.faceAreaRatio)}
            />
            <Metric
              label="FRAME MS"
              value={formatMs(winkDebug?.analysisDurationMs)}
            />
            <Metric
              label="PITCH"
              value={formatDegrees(winkDebug?.facePitchDegrees)}
            />
            <Metric
              label="PITCH LIMIT"
              value={formatDegrees(winkDebug?.maxFacePitchDegrees)}
            />
            <Metric
              label="LEFT LIMIT"
              value={formatRatio(
                winkDebug?.leftEyeClosedThreshold ??
                  winkLeftEyeClosedThreshold,
              )}
            />
            <Metric
              label="RIGHT LIMIT"
              value={formatRatio(
                winkDebug?.rightEyeClosedThreshold ??
                  winkRightEyeClosedThreshold,
              )}
            />
            <Metric
              label="LEFT GAP LIMIT"
              value={formatRatio(
                winkDebug?.leftEyeProbabilityGapThreshold ??
                  winkLeftEyeProbabilityGapThreshold,
              )}
            />
            <Metric
              label="RIGHT GAP LIMIT"
              value={formatRatio(
                winkDebug?.rightEyeProbabilityGapThreshold ??
                  winkRightEyeProbabilityGapThreshold,
              )}
            />
            <Metric
              label="FACE LIMIT"
              value={formatRatio(winkDebug?.minFaceAreaRatio)}
            />
            <Metric
              label="LAST WINK"
              value={getWinkSideLabel(lastWinkReading)}
            />
          </View>
        </View>
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
            <Text style={styles.modalTitle}>WINK SETTING</Text>
            <Text style={styles.modalMessage}>
              {winkCalibrationFailureMessage !== ''
                ? winkCalibrationFailureMessage
                : winkCalibrationPhase === 'ready'
                  ? '카메라를 정면으로 보고 시작을 누르세요'
                  : winkCalibrationPhase === 'countdown'
                    ? '3초 뒤 측정을 시작합니다. 카메라를 정면으로 보세요'
                    : winkCalibrationSide === null
                      ? ''
                      : `${getCalibrationEyeName(
                          winkCalibrationSide,
                        )}으로 3번 윙크하세요`}
            </Text>
            {winkCalibrationPhase === 'countdown' ? (
              <Text style={styles.modalTimer}>
                {Math.ceil(winkCalibrationRemainingMs / 1000)}s
              </Text>
            ) : winkCalibrationPhase === 'measuring' ? (
              <Text
                style={styles.modalTimer}
                testID="wink-calibration-count">
                {winkCalibrationRemainingWinks}
              </Text>
            ) : null}
            <View style={styles.modalActions}>
              {winkCalibrationPhase === 'ready' ||
              winkCalibrationPhase === 'failed' ? (
                <PrimaryButton
                  label={winkCalibrationPhase === 'failed' ? 'RETRY' : 'START'}
                  onPress={startWinkCalibration}
                  testID="start-wink-calibration"
                  style={styles.modalButton}
                />
              ) : null}
              <PrimaryButton
                label="CANCEL"
                onPress={closeWinkCalibration}
                testID="cancel-wink-calibration"
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
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
  },
  returnButton: {
    minHeight: 42,
    paddingHorizontal: 14,
    paddingVertical: 8,
  },
  group: {
    backgroundColor: '#FFFFFF',
    borderColor: '#DCE2DE',
    borderRadius: 8,
    borderWidth: 1,
    overflow: 'hidden',
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
  groupHeaderCopy: {
    flex: 1,
    gap: 4,
  },
  groupTitle: {
    color: '#121A14',
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
  },
  groupSummary: {
    color: '#5D6A62',
    fontSize: 13,
    fontWeight: '600',
    lineHeight: 18,
  },
  groupCue: {
    color: '#121A14',
    fontSize: 22,
    fontWeight: '900',
    minWidth: 24,
    textAlign: 'center',
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
    fontSize: 16,
    fontWeight: '800',
  },
  settingCopy: {
    gap: 4,
  },
  description: {
    color: '#5D6A62',
    fontSize: 13,
    lineHeight: 18,
    textTransform: 'uppercase',
  },
  toggleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  toggleButton: {
    minHeight: 40,
    minWidth: 72,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  testHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  testButton: {
    minHeight: 42,
    minWidth: 92,
    paddingHorizontal: 14,
    paddingVertical: 8,
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
  metricGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  metric: {
    backgroundColor: '#F7F8F5',
    borderColor: '#DCE2DE',
    borderRadius: 8,
    borderWidth: 1,
    flexBasis: '47%',
    flexGrow: 1,
    minHeight: 58,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  metricLabel: {
    color: '#5D6A62',
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    marginBottom: 4,
  },
  metricValue: {
    color: '#121A14',
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
    letterSpacing: 0,
  },
});
