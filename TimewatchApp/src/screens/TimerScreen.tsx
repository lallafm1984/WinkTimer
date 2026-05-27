import React from 'react';
import {
  Animated,
  Easing,
  NativeModules,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import ClockIcon from 'react-native-heroicons/mini/ClockIcon';
import {ArcadePanel} from '../components/ArcadePanel';
import {
  GhostMascot,
  type GhostExpression,
  type WinkSide,
} from '../components/GhostMascot';
import {PrimaryButton} from '../components/PrimaryButton';
import {formatDuration, TimerDisplay} from '../components/TimerDisplay';
import {AdMobBanner} from '../ads/AdMobBanner';
import {
  isRewardedAdNoFillError,
  showRewardedAdForAccess,
} from '../ads/rewardedAdAccess';
import {
  createRewardedModeAccessRepository,
  modeRequiresRewardedAd,
} from '../ads/rewardedModeAccess';
import type {SessionHistoryEvent} from '../domain/sessionHistory';
import {
  getTimerModePreset,
  modeRunsWithoutGaze,
  timerModePresets,
  type TimerModeId,
  type TimerModePreset,
} from '../domain/timerMode';
import type {TimerState} from '../domain/timerEngine';
import {ensureCameraPermission} from '../detection/GazeDetector';
import {
  createTimerTargetDurationMs,
  DEFAULT_RECENT_TIMER_TARGET_DURATIONS_MS,
  getTimekeepingDisplayDurationMs,
  getTimerTargetParts,
  MAX_TIMER_TARGET_HOURS,
  MAX_TIMER_TARGET_UNIT_VALUE,
  type TimekeepingMode,
} from '../domain/timekeeping';
import {useAppState} from '../state/AppState';
import {
  createTranslator,
  getLocalizedModeActionSummary,
  getLocalizedModeHint,
  getLocalizedTimerModeTitle,
  type TranslationKey,
} from '../i18n/localization';
import {arcadeTheme} from '../theme/arcadeTheme';

const MODE_MENU_MAX_HEIGHT = 440;
const MODE_MENU_ULTRA_MAX_HEIGHT = 560;
const MODE_MENU_MIN_HEIGHT = 360;
const MODE_MENU_SCREEN_HEIGHT_RATIO = 0.56;
const MODE_MENU_ULTRA_WINDOW_HEIGHT = 900;
const REWARDED_MODE_ACCESS_PROBE_MODE_ID: TimerModeId = 'lookPause';
const RESPONSIVE_LAYOUT_BASE_HEIGHT = 780;
const RESPONSIVE_LAYOUT_MAX_SCALE = 1.2;
const RESPONSIVE_LAYOUT_MIN_HEIGHT = 900;
const TIMER_TOP_STRIP_MIN_HEIGHT = 88;
const MODE_MENU_ITEM_MIN_HEIGHT = 76;

type Translator = ReturnType<typeof createTranslator>;

type RewardedAdAccessState = 'idle' | 'loading' | 'error';
type RewardedModeAccessStatus = 'active' | 'inactive';

function modeUsesCamera(modeId: TimerModeId) {
  return !modeRunsWithoutGaze(modeId);
}

function getScaledValue(value: number, scale: number) {
  return Math.round(value * scale);
}

export function getResponsiveLayoutScale(windowHeight: number) {
  if (windowHeight < RESPONSIVE_LAYOUT_MIN_HEIGHT) {
    return 1;
  }

  return Math.min(
    RESPONSIVE_LAYOUT_MAX_SCALE,
    Math.max(1, windowHeight / RESPONSIVE_LAYOUT_BASE_HEIGHT),
  );
}

export function getTimerLayoutMetrics(layoutScale: number) {
  return {
    mascotScale: layoutScale,
    timerDisplayScale: layoutScale,
    topStripMinHeight: getScaledValue(
      TIMER_TOP_STRIP_MIN_HEIGHT,
      layoutScale,
    ),
  };
}

export function getModeMenuLayoutMetrics(layoutScale: number) {
  return {
    itemMinHeight: getScaledValue(MODE_MENU_ITEM_MIN_HEIGHT, layoutScale),
    itemPadding: getScaledValue(arcadeTheme.spacing.sm, layoutScale),
    listGap: getScaledValue(arcadeTheme.spacing.sm, layoutScale),
    panelPadding: getScaledValue(arcadeTheme.spacing.sm, layoutScale),
    summaryFontSize: getScaledValue(
      arcadeTheme.typography.label.fontSize as number,
      layoutScale,
    ),
    summaryLineHeight: getScaledValue(18, layoutScale),
    titleFontSize: getScaledValue(
      arcadeTheme.typography.body.fontSize as number,
      layoutScale,
    ),
    titleLineHeight: getScaledValue(
      arcadeTheme.typography.body.lineHeight as number,
      layoutScale,
    ),
  };
}

export function getModeMenuScrollMaxHeight(windowHeight: number) {
  const maxHeight =
    windowHeight >= MODE_MENU_ULTRA_WINDOW_HEIGHT
      ? MODE_MENU_ULTRA_MAX_HEIGHT
      : MODE_MENU_MAX_HEIGHT;

  return Math.max(
    MODE_MENU_MIN_HEIGHT,
    Math.min(
      maxHeight,
      Math.floor(windowHeight * MODE_MENU_SCREEN_HEIGHT_RATIO),
    ),
  );
}

type TimerActionButtonProps = {
  label: string;
  gesture?: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  testID?: string;
  accessibilityLabel?: string;
  accessibilityState?: {
    selected?: boolean;
  };
  emphasisOnPress?: boolean;
  hideGesture?: boolean;
  style?: StyleProp<ViewStyle>;
};

type SessionHistoryOverlayProps = {
  events: SessionHistoryEvent[];
  targetDurationMs: number;
  timekeepingMode: TimekeepingMode;
  t: Translator;
};

type TimelineClipboardModule = {
  copyText(text: string): Promise<void>;
};

type TimerTargetWheelProps = {
  wheelTestID: string;
  reelTestID: string;
  label: string;
  accessibilityLabel: string;
  value: number;
  min: number;
  max: number;
  disabled: boolean;
  wraps?: boolean;
  onValueChange(value: number): boolean;
};

function isStoppedState(timer: TimerState, mode: TimerModePreset) {
  return (
    timer.phase === 'manualPaused' ||
    (timer.phase === 'active' &&
      mode.pauseGesture === 'look' &&
      (timer.isLookPaused || timer.detectionStatus === 'looking'))
  );
}

function canResetTimer(timer: TimerState, mode: TimerModePreset) {
  return isStoppedState(timer, mode);
}

function getStatusLabel(
  timer: TimerState,
  mode: TimerModePreset,
  t: ReturnType<typeof createTranslator>,
) {
  if (
    timer.phase === 'active' &&
    mode.pauseGesture === 'look' &&
    (timer.isLookPaused || timer.detectionStatus === 'looking')
  ) {
    return t('timer.stopped');
  }

  switch (timer.phase) {
    case 'active':
      return t('timer.running');
    case 'manualPaused':
      return t('timer.stopped');
    case 'ended':
      return t('timer.ended');
    case 'idle':
    default:
      return t('timer.ready');
  }
}

function isWinkJudgmentUnavailable(
  timer: TimerState,
  mode: TimerModePreset,
) {
  return (
    mode.id === 'winkControl' &&
    (timer.detectionStatus !== 'looking' ||
      timer.eyeState === 'unknown' ||
      timer.eyeState === 'bothClosed')
  );
}

function isSmileJudgmentUnavailable(
  timer: TimerState,
  mode: TimerModePreset,
) {
  return (
    mode.id === 'smileMode' &&
    (timer.detectionStatus !== 'looking' || timer.smileDetected === null)
  );
}

function getGhostState(
  timer: TimerState,
  mode: TimerModePreset,
): {
  expression: GhostExpression;
  winkSide: WinkSide;
} {
  if (timer.recentWinkSide === 'left') {
    return {expression: 'leftWink', winkSide: 'left'};
  }

  if (timer.recentWinkSide === 'right') {
    return {expression: 'rightWink', winkSide: 'right'};
  }

  if (timer.phase === 'ended') {
    return {expression: 'resetFlash', winkSide: 'any'};
  }

  if (
    mode.id === 'lookPause' &&
    timer.phase === 'active' &&
    timer.detectionStatus === 'looking'
  ) {
    return {expression: 'looking', winkSide: 'any'};
  }

  if (mode.id === 'smileMode' && timer.phase === 'manualPaused') {
    return {expression: 'looking', winkSide: 'any'};
  }

  if (
    (mode.id === 'basicTimer' || mode.id === 'flipTimer') &&
    timer.phase === 'active'
  ) {
    return {expression: 'running', winkSide: 'any'};
  }

  return {expression: 'ready', winkSide: 'any'};
}

const ghostExpressionLabelKeys: Record<GhostExpression, TranslationKey> = {
  leftWink: 'mascot.leftWink',
  looking: 'mascot.looking',
  ready: 'mascot.ready',
  resetFlash: 'mascot.resetFlash',
  rightWink: 'mascot.rightWink',
  running: 'mascot.running',
};

function getLocalizedGhostExpressionLabel(
  expression: GhostExpression,
  t: Translator,
) {
  return t(ghostExpressionLabelKeys[expression]);
}

function getModeHint(
  mode: TimerModePreset,
  label: string,
  locale: Parameters<typeof createTranslator>[0],
) {
  return getLocalizedModeHint(locale, mode, label);
}

function getModeActionSummary(
  mode: TimerModePreset,
  locale: Parameters<typeof createTranslator>[0],
) {
  return getLocalizedModeActionSummary(locale, mode);
}

function formatHistoryDurationMs(durationMs: number) {
  return formatDuration(durationMs);
}

function isTimerMarkEvent(
  event: SessionHistoryEvent,
  timekeepingMode: TimekeepingMode,
) {
  return timekeepingMode === 'timer' && event.type === 'LAP';
}

function getHistoryTypeLabel(
  event: SessionHistoryEvent,
  timekeepingMode: TimekeepingMode,
  t: Translator,
) {
  if (isTimerMarkEvent(event, timekeepingMode)) {
    return t('timer.mark');
  }

  if (event.type === 'LAP') {
    return t('timer.lap');
  }

  const eventLabelKeys: Record<Exclude<SessionHistoryEvent['type'], 'LAP'>, TranslationKey> = {
    END: 'event.END',
    RESET: 'event.RESET',
    RESUME: 'event.RESUME',
    START: 'event.START',
    STOP: 'event.STOP',
  };

  return t(eventLabelKeys[event.type]);
}

function getHistoryElapsedLabel(
  event: SessionHistoryEvent,
  timekeepingMode: TimekeepingMode,
  t: Translator,
) {
  const elapsed = formatHistoryDurationMs(event.elapsedMs);

  return isTimerMarkEvent(event, timekeepingMode)
    ? t('timer.elapsedAt', {time: elapsed})
    : elapsed;
}

function getTimerMarkLeftLabel(
  event: SessionHistoryEvent,
  targetDurationMs: number,
  t: Translator,
) {
  return t('timer.leftAt', {
    time: formatHistoryDurationMs(targetDurationMs - event.elapsedMs),
  });
}

function getHistoryDeltaLabel(
  event: SessionHistoryEvent,
  timekeepingMode: TimekeepingMode,
  targetDurationMs: number,
  t: Translator,
) {
  if (isTimerMarkEvent(event, timekeepingMode)) {
    return getTimerMarkLeftLabel(event, targetDurationMs, t);
  }

  return `+${formatHistoryDurationMs(event.deltaMs)}`;
}

function getTimelineClipboardModule() {
  return NativeModules.NativeTimelineClipboard as
    | TimelineClipboardModule
    | undefined;
}

function getTimelineClipboardText(
  events: SessionHistoryEvent[],
  targetDurationMs: number,
  timekeepingMode: TimekeepingMode,
  t: Translator,
) {
  const orderedEvents = [...events].reverse();
  const lines = [t('timer.timeline'), t('timer.events', {count: events.length})];

  if (events.length === 0) {
    lines.push(t('timer.noEventsYet'));
    return lines.join('\n');
  }

  orderedEvents.forEach((event, index) => {
    const recordNumber = events.length - index;

    lines.push(
      [
        String(recordNumber).padStart(2, '0'),
        getHistoryTypeLabel(event, timekeepingMode, t),
        getHistoryElapsedLabel(event, timekeepingMode, t),
        getHistoryDeltaLabel(event, timekeepingMode, targetDurationMs, t),
      ].join('  '),
    );
  });

  return lines.join('\n');
}

async function copyTimelineToClipboard(
  events: SessionHistoryEvent[],
  targetDurationMs: number,
  timekeepingMode: TimekeepingMode,
  t: Translator,
) {
  const clipboard = getTimelineClipboardModule();

  if (!clipboard) {
    return false;
  }

  try {
    await clipboard.copyText(
      getTimelineClipboardText(events, targetDurationMs, timekeepingMode, t),
    );
    return true;
  } catch {
    return false;
  }
}

function formatWheelValue(value: number) {
  return String(value).padStart(2, '0');
}

function formatRecentTimerTargetDurationMs(durationMs: number) {
  const {hours, minutes, seconds} = getTimerTargetParts(durationMs);

  if (hours > 0) {
    return `${formatWheelValue(hours)}:${formatWheelValue(
      minutes,
    )}:${formatWheelValue(seconds)}`;
  }

  return `${formatWheelValue(minutes)}:${formatWheelValue(seconds)}`;
}

function getWheelDisplayValue(
  value: number,
  min: number,
  max: number,
  offset: number,
  wraps: boolean,
) {
  if (!wraps) {
    return Math.min(max, Math.max(min, value + offset));
  }

  const range = max - min + 1;
  return ((value - min + offset + range) % range) + min;
}

function getNextWheelValue(
  value: number,
  min: number,
  max: number,
  step: number,
  wraps: boolean,
) {
  if (!wraps) {
    return Math.min(max, Math.max(min, value + step));
  }

  const range = max - min + 1;
  return ((value - min + step + range) % range) + min;
}

function getResponderPageY(event: GestureResponderEvent) {
  const pageY = event.nativeEvent.pageY;
  return typeof pageY === 'number' ? pageY : null;
}

const TIMER_TARGET_DRAG_ACTIVATION_PX = 14;
const TIMER_TARGET_DRAG_PX_PER_STEP = 22;
const WINK_UNAVAILABLE_HINT_SHOW_DELAY_MS = 250;
const WINK_UNAVAILABLE_HINT_HIDE_DELAY_MS = 800;

function getTimerTargetDragStep(dy: number) {
  if (Math.abs(dy) < TIMER_TARGET_DRAG_ACTIVATION_PX) {
    return 0;
  }

  const step = Math.max(
    1,
    Math.round(Math.abs(dy) / TIMER_TARGET_DRAG_PX_PER_STEP),
  );
  return dy < 0 ? step : -step;
}

function SessionHistoryOverlay({
  events,
  targetDurationMs,
  timekeepingMode,
  t,
}: SessionHistoryOverlayProps) {
  const orderedEvents = [...events].reverse();
  const handleCopyTimeline = () =>
    copyTimelineToClipboard(events, targetDurationMs, timekeepingMode, t);

  return (
    <View style={styles.historyOverlay} testID="session-history-overlay">
      <View style={styles.historyHeader}>
        <View style={styles.historyTitleGroup}>
          <Text style={styles.historyTitle}>{t('timer.timeline')}</Text>
          <Pressable
            accessibilityLabel={t('timer.copyTimeline')}
            accessibilityRole="button"
            onPress={handleCopyTimeline}
            style={({pressed}) => [
              styles.timelineCopyButton,
              pressed && styles.pressedControl,
            ]}
            testID="timeline-copy-button">
            <View pointerEvents="none" style={styles.timelineCopyIcon}>
              <View style={styles.timelineCopyIconBack} />
              <View style={styles.timelineCopyIconFront} />
            </View>
          </Pressable>
        </View>
        <Text style={styles.historyCount}>
          {t('timer.events', {count: events.length})}
        </Text>
      </View>
      <ScrollView
        style={styles.historyScroll}
        contentContainerStyle={styles.historyList}>
        {events.length === 0 ? (
          <Text style={styles.historyEmpty}>{t('timer.noEventsYet')}</Text>
        ) : (
          orderedEvents.map((event, index) => {
            const recordNumber = events.length - index;
            const parityStyle =
              recordNumber % 2 === 0
                ? styles.historyRowEven
                : styles.historyRowOdd;

            return (
              <View
                key={event.id}
                style={[styles.historyRow, parityStyle]}
                testID="session-history-row">
                <Text style={styles.historyIndex}>
                  {String(recordNumber).padStart(2, '0')}
                </Text>
                <Text style={styles.historyType}>
                  {getHistoryTypeLabel(event, timekeepingMode, t)}
                </Text>
                <Text style={styles.historyElapsed}>
                  {getHistoryElapsedLabel(event, timekeepingMode, t)}
                </Text>
                <Text style={styles.historyDelta}>
                  {getHistoryDeltaLabel(
                    event,
                    timekeepingMode,
                    targetDurationMs,
                    t,
                  )}
                </Text>
              </View>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

function TimerActionButton({
  label,
  gesture,
  onPress,
  disabled = false,
  variant = 'secondary',
  testID,
  accessibilityLabel,
  accessibilityState,
  emphasisOnPress = false,
  hideGesture = false,
  style,
}: TimerActionButtonProps) {
  const canPress = !disabled && typeof onPress === 'function';
  const buttonAccessibilityLabel =
    accessibilityLabel ?? (gesture ? `${label} ${gesture}` : label);

  return (
    <Pressable
      accessibilityLabel={buttonAccessibilityLabel}
      accessibilityRole="button"
      accessibilityState={
        disabled ? {...accessibilityState, disabled} : accessibilityState
      }
      disabled={disabled}
      onPress={canPress ? onPress : undefined}
      testID={testID}
      style={({pressed}) => [
        styles.actionButton,
        variant === 'primary' ? styles.primaryAction : styles.secondaryAction,
        disabled && styles.disabledAction,
        pressed &&
          canPress &&
          (emphasisOnPress ? styles.pressedLapControl : styles.pressedControl),
        style,
      ]}>
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.actionLabel,
          variant === 'primary'
            ? styles.primaryActionLabel
            : styles.secondaryActionLabel,
          disabled && styles.disabledActionLabel,
      ]}>
        {label}
      </Text>
      {!hideGesture && gesture ? (
        <Text
          numberOfLines={1}
          adjustsFontSizeToFit
          style={[
            styles.actionGesture,
            variant === 'primary'
              ? styles.primaryActionGesture
              : styles.secondaryActionGesture,
            disabled && styles.disabledActionLabel,
          ]}>
          {gesture}
        </Text>
      ) : null}
    </Pressable>
  );
}

function TimerTargetWheel({
  wheelTestID,
  reelTestID,
  label,
  accessibilityLabel,
  value,
  min,
  max,
  disabled,
  wraps = false,
  onValueChange,
}: TimerTargetWheelProps) {
  const rollAnim = React.useRef(new Animated.Value(0)).current;
  const currentValueRef = React.useRef(value);
  const dragStartYRef = React.useRef<number | null>(null);
  const lastDragStepRef = React.useRef(0);
  const previousValue = getWheelDisplayValue(value, min, max, -1, wraps);
  const nextValue = getWheelDisplayValue(value, min, max, 1, wraps);

  React.useEffect(() => {
    currentValueRef.current = value;
  }, [value]);

  const animateWheelStep = React.useCallback(
    (step: number) => {
      rollAnim.stopAnimation();
      rollAnim.setValue(step > 0 ? 1 : -1);
      Animated.timing(rollAnim, {
        duration: 90,
        easing: Easing.out(Easing.quad),
        toValue: 0,
        useNativeDriver: true,
      }).start();
    },
    [rollAnim],
  );

  const applyWheelStep = React.useCallback(
    (step: number) => {
      if (disabled || step === 0) {
        return false;
      }

      const currentValue = currentValueRef.current;
      const nextWheelValue = getNextWheelValue(
        currentValue,
        min,
        max,
        step,
        wraps,
      );

      if (nextWheelValue === currentValue) {
        return false;
      }

      const didChange = onValueChange(nextWheelValue);
      if (!didChange) {
        return false;
      }

      currentValueRef.current = nextWheelValue;
      animateWheelStep(step);
      return true;
    },
    [animateWheelStep, disabled, max, min, onValueChange, wraps],
  );

  const applyDragStep = (event: GestureResponderEvent) => {
    const startY = dragStartYRef.current;

    if (disabled || startY === null) {
      return;
    }

    const endY = getResponderPageY(event);
    if (endY === null) {
      return;
    }

    const step = getTimerTargetDragStep(endY - startY);
    const nextStep = step - lastDragStepRef.current;
    if (nextStep !== 0) {
      lastDragStepRef.current = step;
      applyWheelStep(nextStep);
    }
  };

  const reelTranslateY = rollAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-7, 0, 7],
  });

  const handleResponderRelease = (event: GestureResponderEvent) => {
    applyDragStep(event);
    dragStartYRef.current = null;
    lastDragStepRef.current = 0;
  };

  return (
    <View
      accessibilityLabel={accessibilityLabel}
      accessibilityRole="adjustable"
      accessibilityState={{disabled}}
      onMoveShouldSetResponder={() => !disabled}
      onResponderGrant={event => {
        const pageY = getResponderPageY(event);

        currentValueRef.current = value;
        dragStartYRef.current = pageY;
        lastDragStepRef.current = 0;
      }}
      onResponderMove={applyDragStep}
      onResponderRelease={handleResponderRelease}
      onResponderTerminate={() => {
        dragStartYRef.current = null;
        lastDragStepRef.current = 0;
      }}
      onStartShouldSetResponder={() => !disabled}
      style={[styles.timerTargetWheel, disabled && styles.disabledAction]}
      testID={wheelTestID}>
      <Animated.View
        style={[
          styles.timerTargetWheelReel,
          {transform: [{translateY: reelTranslateY}]},
        ]}
        testID={reelTestID}>
        <Text style={styles.timerTargetWheelSideValue}>
          {formatWheelValue(previousValue)}
        </Text>
        <Text style={styles.timerTargetWheelValue}>
          {formatWheelValue(value)}
        </Text>
        <Text style={styles.timerTargetWheelSideValue}>
          {formatWheelValue(nextValue)}
        </Text>
      </Animated.View>
      <Text style={styles.timerTargetWheelLabel}>{label}</Text>
    </View>
  );
}

export function TimerScreen() {
  const {height: windowHeight} = useWindowDimensions();
  const {
    timer,
    setScreen,
    finishError,
    isFinishingSession,
    startTimerSession,
    pauseTimerSession,
    resumeTimerSession,
    resetTimerSession,
    recordLapSession,
    timekeepingMode,
    setTimekeepingMode,
    timerTargetDurationMs,
    recentTimerTargetDurationsMs,
    setTimerTargetDurationMs,
    timerModeId,
    setTimerModeId,
    isTimerAlertActive,
    stopTimerEndAlert,
    setGestureInputsBlocked,
    sessionHistory,
    locale,
  } = useAppState();
  const t = createTranslator(locale);
  const [modeMenuOpen, setModeMenuOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [timerTargetPopupOpen, setTimerTargetPopupOpen] =
    React.useState(false);
  const [timerTargetDraftDurationMs, setTimerTargetDraftDurationMsState] =
    React.useState(timer.targetDurationMs ?? timerTargetDurationMs);
  const [pendingTimekeepingMode, setPendingTimekeepingMode] =
    React.useState<TimekeepingMode | null>(null);
  const [rewardedAdAccessState, setRewardedAdAccessState] =
    React.useState<RewardedAdAccessState>('idle');
  const [rewardedModeAccessStatus, setRewardedModeAccessStatusState] =
    React.useState<RewardedModeAccessStatus>('active');
  const rewardedModeAccessStatusRef =
    React.useRef<RewardedModeAccessStatus>('active');
  const timerTargetDraftDurationMsRef = React.useRef(
    timer.targetDurationMs ?? timerTargetDurationMs,
  );
  const rewardedModeAccessRepository = React.useMemo(
    () => createRewardedModeAccessRepository(),
    [],
  );
  const setRewardedModeAccessStatus = React.useCallback(
    (status: RewardedModeAccessStatus) => {
      if (rewardedModeAccessStatusRef.current === status) {
        return;
      }

      rewardedModeAccessStatusRef.current = status;
      setRewardedModeAccessStatusState(status);
    },
    [],
  );

  const selectedMode = getTimerModePreset(timerModeId);
  const selectedModeTitle = getLocalizedTimerModeTitle(locale, selectedMode.id);
  const visibleTimekeepingMode = pendingTimekeepingMode ?? timekeepingMode;
  const ghostState = getGhostState(timer, selectedMode);
  const responsiveLayoutScale = getResponsiveLayoutScale(windowHeight);
  const timerLayoutMetrics = getTimerLayoutMetrics(responsiveLayoutScale);
  const modeMenuLayoutMetrics =
    getModeMenuLayoutMetrics(responsiveLayoutScale);
  const scaledLayoutActive = responsiveLayoutScale > 1;
  const modeMenuScrollMaxHeight = getModeMenuScrollMaxHeight(windowHeight);
  const gestureJudgmentUnavailable =
    selectedMode.id === 'smileMode'
      ? isSmileJudgmentUnavailable(timer, selectedMode)
      : isWinkJudgmentUnavailable(timer, selectedMode);
  const [
    gestureUnavailableHintVisible,
    setGestureUnavailableHintVisible,
  ] = React.useState(gestureJudgmentUnavailable);
  const shouldRenderWinkJudgmentHint = selectedMode.id === 'winkControl';
  const winkUnavailableHintShown =
    shouldRenderWinkJudgmentHint && gestureUnavailableHintVisible;
  const winkReadyHintShown =
    shouldRenderWinkJudgmentHint && !gestureUnavailableHintVisible;
  const winkJudgmentHintShown =
    winkUnavailableHintShown || winkReadyHintShown;
  const shouldRenderSmileJudgmentHint = selectedMode.id === 'smileMode';
  const smileUnavailableHintShown =
    shouldRenderSmileJudgmentHint && gestureUnavailableHintVisible;
  const smileReadyHintShown =
    shouldRenderSmileJudgmentHint && !gestureUnavailableHintVisible;
  const smileJudgmentHintShown =
    smileUnavailableHintShown || smileReadyHintShown;
  const historyEvents = React.useMemo(
    () =>
      sessionHistory.filter(event =>
        selectedMode.lapGesture === undefined
          ? event.type === 'STOP'
          : event.type === 'LAP',
      ),
    [selectedMode.lapGesture, sessionHistory],
  );
  const latestHistoryRecord = historyEvents[historyEvents.length - 1] ?? null;
  const stoppedState = isStoppedState(timer, selectedMode);
  const canChangeMode =
    !isTimerAlertActive &&
    (timer.phase === 'idle' ||
      timer.phase === 'ended' ||
      stoppedState);
  const canReset = canResetTimer(timer, selectedMode) && !isFinishingSession;
  const shouldShowLapAction =
    timer.phase === 'active' &&
    selectedMode.lapGesture !== undefined &&
    !stoppedState;
  const canRecordLap =
    shouldShowLapAction && !isFinishingSession;
  const startGesture = getModeHint(selectedMode, 'START', locale);
  const pauseGesture = getModeHint(selectedMode, 'PAUSE', locale);
  const resumeGesture = getModeHint(selectedMode, 'RESUME', locale);
  const resetGesture = getModeHint(selectedMode, 'RESET', locale);
  const lapGesture = getModeHint(selectedMode, 'LAP', locale);
  const lapActionLabel =
    visibleTimekeepingMode === 'timer' ? t('timer.mark') : t('timer.lap');
  const resumeRequiresDeviceFlip =
    timer.phase === 'manualPaused' &&
    selectedMode.resumeGesture === 'deviceFaceDown';
  const startBlockedByModeMenu = timer.phase === 'idle' && modeMenuOpen;
  const timerDisplayDurationMs = getTimekeepingDisplayDurationMs(
    timer.focusDurationMs,
    visibleTimekeepingMode,
    timer.targetDurationMs,
    timerTargetDurationMs,
  );
  const effectiveTimerTargetDurationMs =
    timer.targetDurationMs ?? timerTargetDurationMs;
  const timerTargetDraftParts = getTimerTargetParts(timerTargetDraftDurationMs);
  const visibleRecentTimerTargetDurationsMs =
    recentTimerTargetDurationsMs.length > 0
      ? recentTimerTargetDurationsMs.slice(0, 3)
      : DEFAULT_RECENT_TIMER_TARGET_DURATIONS_MS;
  const showsTimerTargetControls = visibleTimekeepingMode === 'timer';
  const canAdjustTimerTarget =
    showsTimerTargetControls &&
    (timer.phase === 'idle' ||
      timer.phase === 'manualPaused' ||
      timer.phase === 'ended');
  const canOpenTimerTargetPopup = showsTimerTargetControls && canAdjustTimerTarget;
  const rewardedAdAccessPending = rewardedAdAccessState === 'loading';
  const rewardedAdAccessMessage =
    rewardedAdAccessState === 'loading'
      ? t('timer.adLoading')
      : rewardedAdAccessState === 'error'
        ? t('timer.adError')
        : null;
  const setTimerTargetDraftDurationMs = React.useCallback(
    (durationMs: number) => {
      timerTargetDraftDurationMsRef.current = durationMs;
      setTimerTargetDraftDurationMsState(durationMs);
    },
    [],
  );
  const openTimerTargetPopup = React.useCallback(() => {
    if (!canOpenTimerTargetPopup) {
      return;
    }

    setTimerTargetDraftDurationMs(effectiveTimerTargetDurationMs);
    setTimerTargetPopupOpen(true);
  }, [
    canOpenTimerTargetPopup,
    effectiveTimerTargetDurationMs,
    setTimerTargetDraftDurationMs,
  ]);
  const cancelTimerTargetPopup = React.useCallback(() => {
    setTimerTargetDraftDurationMs(effectiveTimerTargetDurationMs);
    setTimerTargetPopupOpen(false);
  }, [effectiveTimerTargetDurationMs, setTimerTargetDraftDurationMs]);
  const applyTimerTargetPopup = React.useCallback(() => {
    const nextDurationMs = timerTargetDraftDurationMsRef.current;

    if (
      canAdjustTimerTarget &&
      nextDurationMs !== effectiveTimerTargetDurationMs
    ) {
      setTimerTargetDurationMs(nextDurationMs);
    }

    setTimerTargetPopupOpen(false);
  }, [
    canAdjustTimerTarget,
    effectiveTimerTargetDurationMs,
    setTimerTargetDurationMs,
  ]);
  const handleStartTimerSession = React.useCallback(() => {
    if (isTimerAlertActive) {
      stopTimerEndAlert();
    }

    startTimerSession();
  }, [isTimerAlertActive, startTimerSession, stopTimerEndAlert]);
  const ensureRewardedModeAccess = React.useCallback(async (modeId = timerModeId) => {
    if (!modeRequiresRewardedAd(modeId)) {
      return true;
    }

    if (await rewardedModeAccessRepository.hasActiveAccess(modeId)) {
      setRewardedModeAccessStatus('active');
      setRewardedAdAccessState('idle');
      return true;
    }

    setRewardedModeAccessStatus('inactive');
    setRewardedAdAccessState('loading');

    try {
      await showRewardedAdForAccess();
      await rewardedModeAccessRepository.grantAccess(Date.now());
      setRewardedModeAccessStatus('active');
      setRewardedAdAccessState('idle');
      return true;
    } catch (error) {
      if (isRewardedAdNoFillError(error)) {
        setRewardedModeAccessStatus('inactive');
        setRewardedAdAccessState('idle');
        return true;
      }

      setRewardedModeAccessStatus('inactive');
      setRewardedAdAccessState('error');
      return false;
    }
  }, [
    rewardedModeAccessRepository,
    setRewardedModeAccessStatus,
    timerModeId,
  ]);
  const ensureModeCameraPermission = React.useCallback(
    async (modeId: TimerModeId) => {
      if (!modeUsesCamera(modeId)) {
        return true;
      }

      return ensureCameraPermission({openSettingsIfBlocked: true});
    },
    [],
  );
  const completeTimekeepingModeSelection = React.useCallback(
    (mode: TimekeepingMode) => {
      if (mode !== timekeepingMode) {
        setPendingTimekeepingMode(mode);
      } else {
        setPendingTimekeepingMode(null);
      }

      if (mode === 'timer') {
        setTimerTargetDraftDurationMs(effectiveTimerTargetDurationMs);
        setTimerTargetPopupOpen(true);
      } else {
        setTimerTargetPopupOpen(false);
      }

      setModeMenuOpen(false);

      if (mode === timekeepingMode) {
        return;
      }

      setTimekeepingMode(mode);
    },
    [
      effectiveTimerTargetDurationMs,
      setTimekeepingMode,
      setTimerTargetDraftDurationMs,
      timekeepingMode,
    ],
  );
  const appTitle =
    visibleTimekeepingMode === 'timer'
      ? t('timer.timer')
      : t('timer.stopwatch');
  const primaryAction =
    stoppedState
      ? {
          label: t('timer.resume'),
          gesture: resumeGesture,
          onPress: resumeTimerSession,
          disabled: isFinishingSession || resumeRequiresDeviceFlip,
        }
      : timer.phase === 'active'
        ? {
            label: t('timer.pause'),
            gesture: pauseGesture,
            onPress: pauseTimerSession,
            disabled: isFinishingSession,
          }
        : {
            label:
              timer.phase === 'ended' ? t('timer.restart') : t('common.start'),
            gesture: startGesture,
            onPress: handleStartTimerSession,
            disabled: isFinishingSession || startBlockedByModeMenu,
          };

  React.useEffect(() => {
    if (gestureUnavailableHintVisible === gestureJudgmentUnavailable) {
      return;
    }

    const timeoutId = setTimeout(
      () => {
        setGestureUnavailableHintVisible(gestureJudgmentUnavailable);
      },
      gestureJudgmentUnavailable
        ? WINK_UNAVAILABLE_HINT_SHOW_DELAY_MS
        : WINK_UNAVAILABLE_HINT_HIDE_DELAY_MS,
    );

    return () => {
      clearTimeout(timeoutId);
    };
  }, [gestureJudgmentUnavailable, gestureUnavailableHintVisible]);

  React.useEffect(() => {
    if (!canChangeMode && modeMenuOpen) {
      setModeMenuOpen(false);
    }
  }, [canChangeMode, modeMenuOpen]);

  React.useEffect(() => {
    if (!modeMenuOpen) {
      return;
    }

    let cancelled = false;

    rewardedModeAccessRepository
      .hasActiveAccess(REWARDED_MODE_ACCESS_PROBE_MODE_ID)
      .then(hasActiveAccess => {
        if (cancelled) {
          return;
        }

        setRewardedModeAccessStatus(
          hasActiveAccess ? 'active' : 'inactive',
        );
      })
      .catch(() => {
        if (!cancelled) {
          setRewardedModeAccessStatus('inactive');
        }
      });

    return () => {
      cancelled = true;
    };
  }, [
    modeMenuOpen,
    rewardedModeAccessRepository,
    setRewardedModeAccessStatus,
  ]);

  React.useEffect(() => {
    const shouldBlockGestures = modeMenuOpen || timerTargetPopupOpen;

    setGestureInputsBlocked(shouldBlockGestures);

    return () => {
      setGestureInputsBlocked(false);
    };
  }, [modeMenuOpen, setGestureInputsBlocked, timerTargetPopupOpen]);

  React.useEffect(() => {
    if (
      pendingTimekeepingMode !== null &&
      pendingTimekeepingMode === timekeepingMode
    ) {
      setPendingTimekeepingMode(null);
      return;
    }
  }, [pendingTimekeepingMode, timekeepingMode]);

  React.useEffect(() => {
    if (
      showsTimerTargetControls &&
      !canOpenTimerTargetPopup &&
      timerTargetPopupOpen
    ) {
      setTimerTargetPopupOpen(false);
    }
  }, [
    canOpenTimerTargetPopup,
    showsTimerTargetControls,
    timerTargetPopupOpen,
  ]);

  const handleSelectTimekeepingMode = (mode: TimekeepingMode) => {
    if (rewardedAdAccessPending) {
      return;
    }

    if (!modeRequiresRewardedAd(timerModeId)) {
      completeTimekeepingModeSelection(mode);
      return;
    }

    return ensureRewardedModeAccess().then(hasRewardedModeAccess => {
      if (hasRewardedModeAccess) {
        completeTimekeepingModeSelection(mode);
      }
    });
  };

  const handleSelectMode = (modeId: TimerModeId) => {
    if (!canChangeMode || rewardedAdAccessPending) {
      return;
    }

    if (modeId === timerModeId) {
      return;
    }

    const completeModeSelection = () => {
      setRewardedAdAccessState('idle');
      resetTimerSession();
      setTimerModeId(modeId);
    };

    const continueModeSelection = () => {
      if (!modeRequiresRewardedAd(modeId)) {
        completeModeSelection();
        return;
      }

      return ensureRewardedModeAccess(modeId).then(hasRewardedModeAccess => {
        if (hasRewardedModeAccess) {
          completeModeSelection();
        }
      });
    };

    if (!modeUsesCamera(modeId)) {
      return continueModeSelection();
    }

    return ensureModeCameraPermission(modeId).then(hasCameraPermission => {
      if (hasCameraPermission) {
        return continueModeSelection();
      }
    });
  };

  const setTimerTargetPartValue = (
    part: keyof typeof timerTargetDraftParts,
    nextValue: number,
  ) => {
    if (!canAdjustTimerTarget) {
      return false;
    }

    const currentDraftDurationMs = timerTargetDraftDurationMsRef.current;
    const currentParts = getTimerTargetParts(currentDraftDurationMs);
    const nextParts = {
      ...currentParts,
      [part]: nextValue,
    };
    const nextDurationMs = createTimerTargetDurationMs(
      nextParts.hours,
      nextParts.minutes,
      nextParts.seconds,
    );

    if (nextDurationMs === currentDraftDurationMs) {
      return false;
    }

    setTimerTargetDraftDurationMs(nextDurationMs);
    return true;
  };

  const handleToggleHistory = () => {
    setHistoryOpen(current => !current);
    setModeMenuOpen(false);
    setTimerTargetPopupOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header} testID="timer-header">
        <Text
          testID="timer-title"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.appLabel}>
          {appTitle}
        </Text>
        <View style={styles.navButtons}>
          <PrimaryButton
            label={t('common.settings')}
            onPress={() => {
              setScreen('settings');
            }}
            variant="secondary"
            testID="settings-button"
            style={styles.navButton}
          />
        </View>
      </View>

      {modeMenuOpen ? null : (
        <ArcadePanel style={styles.timerPanel}>
        <View
          style={[
            styles.timerTopStrip,
            {minHeight: timerLayoutMetrics.topStripMinHeight},
          ]}
          testID="top-timer-readout">
          <Pressable
            accessibilityLabel={t('timer.openTargetSettings')}
            accessibilityRole="button"
            accessibilityState={{disabled: !canOpenTimerTargetPopup}}
            disabled={!canOpenTimerTargetPopup}
            onPress={
              canOpenTimerTargetPopup
                ? openTimerTargetPopup
                : undefined
            }
            style={({pressed}) => [
              styles.timerReadoutButton,
              pressed && canOpenTimerTargetPopup && styles.pressedControl,
            ]}>
            <TimerDisplay
              accessibilityLabelPrefix={t('timer.timer')}
              durationMs={timerDisplayDurationMs}
              displayMode={visibleTimekeepingMode}
              scale={timerLayoutMetrics.timerDisplayScale}
            />
          </Pressable>
          {shouldRenderWinkJudgmentHint ? (
            <Text
              accessibilityElementsHidden={!winkJudgmentHintShown}
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[
                styles.winkJudgmentHint,
                winkUnavailableHintShown
                  ? styles.winkJudgmentHintUnavailable
                  : winkReadyHintShown
                    ? styles.winkJudgmentHintReady
                    : styles.winkJudgmentHintHidden,
              ]}
              testID="timer-wink-unavailable-label">
              {winkUnavailableHintShown
                ? t('timer.winkUnavailable')
                : winkReadyHintShown
                  ? t('timer.winkReady')
                  : ' '}
            </Text>
          ) : null}
          {shouldRenderSmileJudgmentHint ? (
            <Text
              accessibilityElementsHidden={!smileJudgmentHintShown}
              adjustsFontSizeToFit
              numberOfLines={1}
              style={[
                styles.winkJudgmentHint,
                smileUnavailableHintShown
                  ? styles.winkJudgmentHintUnavailable
                  : smileReadyHintShown
                    ? styles.winkJudgmentHintReady
                    : styles.winkJudgmentHintHidden,
              ]}
              testID="timer-smile-unavailable-label">
              {smileUnavailableHintShown
                ? t('timer.smileUnavailable')
                : smileReadyHintShown
                  ? timer.smileDetected === true
                    ? t('timer.smileDetected')
                    : t('timer.smileReady')
                  : ' '}
            </Text>
          ) : null}
        </View>

        <View style={styles.timerContentArea}>
          <View style={styles.timerStage} testID="timer-history-stage">
            {showsTimerTargetControls ? (
              <Pressable
                accessibilityLabel={t('timer.resetTime')}
                accessibilityRole="button"
                accessibilityState={{disabled: !canOpenTimerTargetPopup}}
                disabled={!canOpenTimerTargetPopup}
                onPress={
                  canOpenTimerTargetPopup ? openTimerTargetPopup : undefined
                }
                style={({pressed}) => [
                  styles.timerTargetResetButton,
                  !canOpenTimerTargetPopup && styles.disabledAction,
                  pressed && canOpenTimerTargetPopup && styles.pressedControl,
                ]}
                testID="timer-target-reset-button">
                <ClockIcon
                  fill={arcadeTheme.colors.softInk}
                  pointerEvents="none"
                  size={14}
                />
                <Text style={styles.timerTargetResetLabel}>
                  {t('timer.time')}
                </Text>
              </Pressable>
            ) : null}
            <View style={styles.timerBlock} testID="timer-main-content">
              <GhostMascot
                accessibilityLabel={getLocalizedGhostExpressionLabel(
                  ghostState.expression,
                  t,
                )}
                expression={ghostState.expression}
                scale={timerLayoutMetrics.mascotScale}
                winkSide={ghostState.winkSide}
              />
              <Text
                numberOfLines={2}
                adjustsFontSizeToFit
                style={styles.statusLabel}
                testID="timer-status-label">
                {getStatusLabel(timer, selectedMode, t)}
              </Text>
              {finishError ? (
                <Text style={styles.error}>{t(finishError)}</Text>
              ) : null}
            </View>

            {latestHistoryRecord ? (
              <View
                style={styles.latestLapRecord}
                testID="latest-history-record">
                <Text style={styles.latestLapLabel}>
                  {isTimerMarkEvent(latestHistoryRecord, visibleTimekeepingMode)
                    ? t('timer.lastMark')
                    : latestHistoryRecord.type === 'LAP'
                      ? t('timer.lastLap')
                      : getHistoryTypeLabel(
                          latestHistoryRecord,
                          visibleTimekeepingMode,
                          t,
                        )}
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={styles.latestLapValue}>
                  {getHistoryElapsedLabel(
                    latestHistoryRecord,
                    visibleTimekeepingMode,
                    t,
                  )}
                </Text>
                {isTimerMarkEvent(
                  latestHistoryRecord,
                  visibleTimekeepingMode,
                ) ? (
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={styles.latestLapSecondaryValue}>
                    {getTimerMarkLeftLabel(
                      latestHistoryRecord,
                      effectiveTimerTargetDurationMs,
                      t,
                    )}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {historyOpen ? (
              <SessionHistoryOverlay
                events={historyEvents}
                targetDurationMs={effectiveTimerTargetDurationMs}
                timekeepingMode={visibleTimekeepingMode}
                t={t}
              />
            ) : null}
          </View>

          <View style={styles.actionDock}>
            <TimerActionButton
              label={shouldShowLapAction ? lapActionLabel : t('timer.reset')}
              gesture={shouldShowLapAction ? lapGesture : resetGesture}
              onPress={
                shouldShowLapAction
                  ? recordLapSession
                  : resetTimerSession
              }
              disabled={shouldShowLapAction ? !canRecordLap : !canReset}
              emphasisOnPress={shouldShowLapAction}
            />
            <TimerActionButton
              label={primaryAction.label}
              gesture={primaryAction.gesture}
              onPress={primaryAction.onPress}
              disabled={primaryAction.disabled}
              variant="primary"
            />
            <TimerActionButton
              label={
                isTimerAlertActive ? t('timer.stopAlert') : t('timer.timeline')
              }
              gesture={t('gesture.Button')}
              onPress={
                isTimerAlertActive ? stopTimerEndAlert : handleToggleHistory
              }
              disabled={false}
              accessibilityState={{selected: !isTimerAlertActive && historyOpen}}
            />
          </View>
        </View>

        {timerTargetPopupOpen ? (
          <View style={styles.timerTargetPopupBackdrop}>
            <View
              style={styles.timerTargetPopup}
              testID="timer-target-popup">
              <View style={styles.timerTargetPopupHeader}>
                <Text
                  style={styles.timerTargetPopupTitle}
                  testID="timer-target-popup-title">
                  {t('timer.setTimer')}
                </Text>
                <Pressable
                  accessibilityLabel={t('common.cancel')}
                  accessibilityRole="button"
                  onPress={cancelTimerTargetPopup}
                  style={({pressed}) => [
                    styles.timerTargetCancelButton,
                    pressed && styles.pressedControl,
                  ]}
                  testID="timer-target-cancel-button">
                  <Text style={styles.timerTargetCancelLabel}>X</Text>
                </Pressable>
              </View>
              <View
                style={styles.timerTargetControls}
                testID="timer-target-controls">
              <TimerTargetWheel
                wheelTestID="timer-target-hour-wheel"
                reelTestID="timer-target-hour-reel"
                label={t('timer.hour')}
                accessibilityLabel={t('timer.targetWheel', {
                  label: t('timer.hour'),
                })}
                value={timerTargetDraftParts.hours}
                min={0}
                max={MAX_TIMER_TARGET_HOURS}
                disabled={!canAdjustTimerTarget}
                onValueChange={nextValue => {
                  return setTimerTargetPartValue('hours', nextValue);
                }}
              />
              <TimerTargetWheel
                wheelTestID="timer-target-minute-wheel"
                reelTestID="timer-target-minute-reel"
                label={t('timer.minute')}
                accessibilityLabel={t('timer.targetWheel', {
                  label: t('timer.minute'),
                })}
                value={timerTargetDraftParts.minutes}
                min={0}
                max={MAX_TIMER_TARGET_UNIT_VALUE}
                disabled={!canAdjustTimerTarget}
                wraps
                onValueChange={nextValue => {
                  return setTimerTargetPartValue('minutes', nextValue);
                }}
              />
              <TimerTargetWheel
                wheelTestID="timer-target-second-wheel"
                reelTestID="timer-target-second-reel"
                label={t('timer.second')}
                accessibilityLabel={t('timer.targetWheel', {
                  label: t('timer.second'),
                })}
                value={timerTargetDraftParts.seconds}
                min={0}
                max={MAX_TIMER_TARGET_UNIT_VALUE}
                disabled={!canAdjustTimerTarget}
                wraps
                onValueChange={nextValue => {
                  return setTimerTargetPartValue('seconds', nextValue);
                }}
              />
              </View>
              {visibleRecentTimerTargetDurationsMs.length > 0 ? (
                <View
                  style={styles.timerTargetRecentSection}
                  testID="timer-target-recent-section">
                  <Text style={styles.timerTargetRecentTitle}>
                    {t('timer.recent')}
                  </Text>
                  <View style={styles.timerTargetRecentList}>
                    {visibleRecentTimerTargetDurationsMs.map(durationMs => {
                      const selected =
                        durationMs === timerTargetDraftDurationMs;

                      return (
                        <Pressable
                          accessibilityLabel={t('timer.useRecentTarget', {
                            target: formatRecentTimerTargetDurationMs(
                              durationMs,
                            ),
                          })}
                          accessibilityRole="button"
                          accessibilityState={{selected}}
                          key={durationMs}
                          onPress={() => {
                            setTimerTargetDraftDurationMs(durationMs);
                          }}
                          style={({pressed}) => [
                            styles.timerTargetRecentButton,
                            selected && styles.timerTargetRecentButtonSelected,
                            pressed && styles.pressedControl,
                          ]}
                          testID="timer-target-recent-button">
                          <Text style={styles.timerTargetRecentButtonLabel}>
                            {formatRecentTimerTargetDurationMs(durationMs)}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              ) : null}
              <PrimaryButton
                label={t('common.done')}
                onPress={applyTimerTargetPopup}
                variant="secondary"
                style={styles.timerTargetDoneButton}
                testID="timer-target-done-button"
              />
            </View>
          </View>
        ) : null}
        </ArcadePanel>
      )}

      <View style={styles.modeSection} testID="mode-selector-bottom">
        {canChangeMode && modeMenuOpen ? (
          <>
            <View
              style={[
                styles.modeMenu,
                scaledLayoutActive && {
                  padding: modeMenuLayoutMetrics.panelPadding,
                },
              ]}
              testID="mode-menu">
              <ScrollView
                bounces={false}
                contentContainerStyle={[
                  styles.modeMenuList,
                  scaledLayoutActive && {
                    gap: modeMenuLayoutMetrics.listGap,
                  },
                ]}
                nestedScrollEnabled
                showsVerticalScrollIndicator
                style={[
                  styles.modeMenuScroll,
                  {maxHeight: modeMenuScrollMaxHeight},
                ]}
                testID="mode-menu-scroll">
                {timerModePresets.map(mode => {
                  const active = mode.id === timerModeId;
                  const modeTitle = getLocalizedTimerModeTitle(
                    locale,
                    mode.id,
                  );

                  return (
                    <Pressable
                      accessibilityLabel={t('timer.modeAccessibility', {
                        mode: modeTitle,
                      })}
                      accessibilityRole="button"
                      accessibilityState={{selected: active}}
                      key={mode.id}
                      onPress={() => handleSelectMode(mode.id)}
                      style={({pressed}) => [
                        styles.modeMenuItem,
                        scaledLayoutActive && {
                          minHeight: modeMenuLayoutMetrics.itemMinHeight,
                          padding: modeMenuLayoutMetrics.itemPadding,
                        },
                        active && styles.activeModeMenuItem,
                        pressed && canChangeMode && styles.pressedControl,
                      ]}>
                      <View style={styles.modeMenuCopy}>
                        <View style={styles.modeMenuTitleRow}>
                          <Text
                            style={[
                              styles.modeMenuTitle,
                              scaledLayoutActive && {
                                fontSize: modeMenuLayoutMetrics.titleFontSize,
                                lineHeight: modeMenuLayoutMetrics.titleLineHeight,
                              },
                            ]}>
                            {modeTitle}
                          </Text>
                          {modeRequiresRewardedAd(mode.id) &&
                          rewardedModeAccessStatus === 'inactive' ? (
                            <Text
                              style={styles.rewardedModeAccessLabel}
                              testID="rewarded-mode-access-label">
                              {t('rewarded.accessLabel')}
                            </Text>
                          ) : null}
                        </View>
                        <Text
                          style={[
                            styles.modeMenuSummary,
                            scaledLayoutActive && {
                              fontSize: modeMenuLayoutMetrics.summaryFontSize,
                              lineHeight:
                                modeMenuLayoutMetrics.summaryLineHeight,
                            },
                          ]}>
                          {getModeActionSummary(mode, locale)}
                        </Text>
                      </View>
                      <View style={styles.modeMenuState}>
                        <View
                          style={[
                            styles.modeMenuDot,
                            active && styles.activeModeMenuDot,
                          ]}
                          testID={
                            active
                              ? 'active-mode-indicator'
                              : 'inactive-mode-indicator'
                          }
                        />
                      </View>
                    </Pressable>
                  );
                })}
              </ScrollView>
            </View>
            <View
              style={styles.timekeepingModeOptions}
              testID="timekeeping-mode-options">
              <TimerActionButton
                accessibilityState={{
                  selected: visibleTimekeepingMode === 'stopwatch',
                }}
                hideGesture
                label={t('timer.stopwatch')}
                onPress={() => handleSelectTimekeepingMode('stopwatch')}
                disabled={rewardedAdAccessPending}
                variant={
                  visibleTimekeepingMode === 'stopwatch'
                    ? 'primary'
                    : 'secondary'
                }
                testID="timekeeping-stopwatch-button"
                style={styles.timekeepingModeChoice}
              />
              <TimerActionButton
                accessibilityState={{
                  selected: visibleTimekeepingMode === 'timer',
                }}
                hideGesture
                label={t('timer.timer')}
                onPress={() => handleSelectTimekeepingMode('timer')}
                disabled={rewardedAdAccessPending}
                variant={
                  visibleTimekeepingMode === 'timer' ? 'primary' : 'secondary'
                }
                testID="timekeeping-timer-button"
                style={styles.timekeepingModeChoice}
              />
            </View>
            {rewardedAdAccessMessage ? (
              <Text
                style={[
                  styles.rewardedAdAccessMessage,
                  rewardedAdAccessState === 'error' &&
                    styles.rewardedAdAccessErrorMessage,
                ]}
                testID="rewarded-ad-access-message">
                {rewardedAdAccessMessage}
              </Text>
            ) : null}
          </>
        ) : (
          <Pressable
            accessibilityLabel={t('timer.openModeMenu')}
            accessibilityRole="button"
            accessibilityState={{
              disabled: !canChangeMode,
              expanded: false,
            }}
            disabled={!canChangeMode}
            onPress={canChangeMode ? () => setModeMenuOpen(true) : undefined}
            style={({pressed}) => [
              styles.modeButton,
              !canChangeMode && styles.disabledAction,
              pressed && canChangeMode && styles.pressedControl,
            ]}>
            <View style={styles.modeButtonCopy}>
              <Text style={styles.modeButtonLabel}>{t('timer.mode')}</Text>
              <Text style={styles.modeButtonTitle}>{selectedModeTitle}</Text>
            </View>
            <Text style={styles.modeButtonCue}>{t('timer.change')}</Text>
          </Pressable>
        )}
      </View>

      {modeMenuOpen ? (
        <View style={styles.modeMenuAdSpacer} testID="mode-menu-ad-spacer" />
      ) : null}
      <AdMobBanner />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: arcadeTheme.colors.background,
    flex: 1,
    gap: arcadeTheme.spacing.md,
    padding: arcadeTheme.spacing.lg,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    justifyContent: 'space-between',
  },
  appLabel: {
    color: arcadeTheme.colors.ink,
    flex: 1,
    fontSize: 23,
    fontWeight: '900',
    lineHeight: 28,
  },
  navButtons: {
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
  },
  navButton: {
    minHeight: 38,
    paddingHorizontal: arcadeTheme.spacing.sm,
    paddingVertical: arcadeTheme.spacing.sm,
  },
  timerPanel: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
    zIndex: 0,
  },
  timerTopStrip: {
    alignItems: 'center',
    borderColor: arcadeTheme.colors.line,
    borderWidth: 1,
    gap: 2,
    justifyContent: 'center',
    minHeight: 88,
    paddingHorizontal: arcadeTheme.spacing.sm,
    paddingVertical: arcadeTheme.spacing.sm,
  },
  timerReadoutButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  timerTargetPopupBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(245, 239, 218, 0.94)',
    bottom: arcadeTheme.spacing.lg,
    justifyContent: 'center',
    left: arcadeTheme.spacing.lg,
    position: 'absolute',
    right: arcadeTheme.spacing.lg,
    top: arcadeTheme.spacing.lg,
    zIndex: 60,
  },
  timerTargetPopup: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.heavyLine,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 2,
    gap: arcadeTheme.spacing.md,
    padding: arcadeTheme.spacing.md,
    width: '100%',
  },
  timerTargetPopupHeader: {
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: arcadeTheme.dimensions.iconButton,
    position: 'relative',
    width: '100%',
  },
  timerTargetPopupTitle: {
    color: arcadeTheme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 22,
    textAlign: 'center',
  },
  timerTargetCancelButton: {
    alignItems: 'center',
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.control,
    borderWidth: 1,
    height: 36,
    justifyContent: 'center',
    position: 'absolute',
    right: 0,
    top: 4,
    width: 36,
  },
  timerTargetCancelLabel: {
    color: arcadeTheme.colors.ink,
    fontSize: 16,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 18,
  },
  timerTargetControls: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    justifyContent: 'center',
    width: '100%',
  },
  timerTargetWheel: {
    alignItems: 'center',
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 94,
    overflow: 'hidden',
    paddingHorizontal: arcadeTheme.spacing.xs,
    paddingVertical: arcadeTheme.spacing.xs,
  },
  timerTargetWheelReel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  timerTargetWheelSideValue: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 18,
    opacity: 0.62,
  },
  timerTargetWheelValue: {
    color: arcadeTheme.colors.ink,
    fontSize: 28,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 32,
  },
  timerTargetWheelLabel: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 12,
    marginTop: 2,
    textAlign: 'center',
  },
  timerTargetRecentSection: {
    gap: arcadeTheme.spacing.xs,
    width: '100%',
  },
  timerTargetRecentTitle: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.mutedInk,
    fontWeight: '900',
    lineHeight: 14,
  },
  timerTargetRecentList: {
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    width: '100%',
  },
  timerTargetRecentButton: {
    alignItems: 'center',
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.chip,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 38,
  },
  timerTargetRecentButtonSelected: {
    backgroundColor: arcadeTheme.colors.panelMuted,
    borderColor: arcadeTheme.colors.accent,
  },
  timerTargetRecentButtonLabel: {
    color: arcadeTheme.colors.ink,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 18,
  },
  timerTargetDoneButton: {
    minHeight: 42,
  },
  timerBlock: {
    alignItems: 'center',
    flex: 1,
    gap: arcadeTheme.spacing.sm,
    justifyContent: 'center',
    minHeight: 0,
  },
  timerStage: {
    flex: 1,
    minHeight: 0,
    position: 'relative',
  },
  timerTargetResetButton: {
    alignItems: 'center',
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.chip,
    borderWidth: 1,
    flexDirection: 'row',
    gap: arcadeTheme.spacing.xs,
    height: 32,
    justifyContent: 'center',
    left: 0,
    position: 'absolute',
    top: 0,
    width: 72,
    zIndex: 6,
  },
  timerTargetResetLabel: {
    color: arcadeTheme.colors.ink,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 14,
  },
  timerContentArea: {
    flex: 1,
    gap: arcadeTheme.spacing.sm,
    minHeight: 0,
    position: 'relative',
  },
  statusLabel: {
    color: arcadeTheme.colors.ink,
    fontSize: 38,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 46,
    textAlign: 'center',
  },
  winkJudgmentHint: {
    fontSize: 13,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 16,
    minHeight: 16,
    textAlign: 'center',
  },
  winkJudgmentHintUnavailable: {
    color: arcadeTheme.colors.danger,
    opacity: 1,
  },
  winkJudgmentHintReady: {
    color: arcadeTheme.colors.success,
    opacity: 1,
  },
  winkJudgmentHintHidden: {
    opacity: 0,
  },
  error: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.danger,
    textAlign: 'center',
  },
  actionDock: {
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
  },
  actionButton: {
    alignItems: 'center',
    borderRadius: arcadeTheme.radii.control,
    flex: 1,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: arcadeTheme.spacing.xs,
    paddingVertical: arcadeTheme.spacing.sm,
  },
  primaryAction: {
    backgroundColor: '#1D4D3A',
  },
  secondaryAction: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.line,
    borderWidth: 1,
  },
  disabledAction: {
    opacity: 0.48,
  },
  actionLabel: {
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 22,
  },
  primaryActionLabel: {
    color: arcadeTheme.colors.panel,
  },
  secondaryActionLabel: {
    color: arcadeTheme.colors.ink,
  },
  actionGesture: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 0,
    lineHeight: 14,
    marginTop: 2,
  },
  primaryActionGesture: {
    color: '#DCE7E1',
  },
  secondaryActionGesture: {
    color: arcadeTheme.colors.mutedInk,
  },
  disabledActionLabel: {
    color: arcadeTheme.colors.mutedInk,
  },
  modeSection: {
    gap: arcadeTheme.spacing.sm,
    position: 'relative',
    elevation: 40,
    zIndex: 40,
  },
  modeMenuAdSpacer: {
    flex: 1,
    minHeight: 0,
  },
  modeButton: {
    alignItems: 'center',
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.heavyLine,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 2,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 58,
    paddingHorizontal: arcadeTheme.spacing.md,
    paddingVertical: arcadeTheme.spacing.sm,
  },
  modeButtonCopy: {
    flex: 1,
    gap: arcadeTheme.spacing.xs,
  },
  modeButtonLabel: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.mutedInk,
  },
  modeButtonTitle: {
    ...arcadeTheme.typography.body,
    color: arcadeTheme.colors.ink,
    fontWeight: '900',
  },
  modeButtonCue: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.accent,
  },
  timekeepingModeOptions: {
    elevation: 70,
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    minHeight: 58,
    position: 'relative',
    zIndex: 70,
  },
  timekeepingModeChoice: {
    flex: 5,
    minHeight: 58,
    paddingHorizontal: arcadeTheme.spacing.xs,
  },
  pressedControl: {
    opacity: 0.82,
  },
  pressedLapControl: {
    opacity: 0.86,
    transform: [{scale: 0.96}],
  },
  modeMenu: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.heavyLine,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 2,
    elevation: 50,
    padding: arcadeTheme.spacing.sm,
    position: 'relative',
    zIndex: 50,
  },
  modeMenuScroll: {
    width: '100%',
  },
  modeMenuList: {
    gap: arcadeTheme.spacing.sm,
  },
  modeMenuItem: {
    alignItems: 'center',
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 1,
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    justifyContent: 'space-between',
    minHeight: 76,
    padding: arcadeTheme.spacing.sm,
  },
  activeModeMenuItem: {
    borderColor: arcadeTheme.colors.accent,
  },
  modeMenuCopy: {
    flex: 1,
    gap: arcadeTheme.spacing.xs,
    minWidth: 0,
  },
  modeMenuTitleRow: {
    alignItems: 'center',
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: arcadeTheme.spacing.xs,
  },
  modeMenuTitle: {
    ...arcadeTheme.typography.body,
    color: arcadeTheme.colors.ink,
    fontWeight: '900',
  },
  rewardedModeAccessLabel: {
    ...arcadeTheme.typography.label,
    backgroundColor: arcadeTheme.colors.panelMuted,
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.chip,
    borderWidth: 1,
    color: arcadeTheme.colors.softInk,
    overflow: 'hidden',
    paddingHorizontal: arcadeTheme.spacing.sm,
    paddingVertical: 2,
  },
  modeMenuSummary: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.softInk,
    fontWeight: '700',
    lineHeight: 18,
  },
  rewardedAdAccessMessage: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.mutedInk,
    textAlign: 'center',
  },
  rewardedAdAccessErrorMessage: {
    color: arcadeTheme.colors.danger,
  },
  modeMenuState: {
    alignItems: 'center',
    alignSelf: 'stretch',
    justifyContent: 'center',
    width: 20,
  },
  modeMenuDot: {
    borderColor: 'transparent',
    borderRadius: 5,
    borderWidth: 1,
    height: 10,
    width: 10,
  },
  activeModeMenuDot: {
    backgroundColor: arcadeTheme.colors.accent,
    borderColor: arcadeTheme.colors.accent,
  },
  historyOverlay: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.heavyLine,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 2,
    bottom: 0,
    elevation: 20,
    gap: arcadeTheme.spacing.sm,
    left: 0,
    padding: arcadeTheme.spacing.md,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 20,
  },
  latestLapRecord: {
    alignItems: 'flex-end',
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.danger,
    borderRadius: arcadeTheme.radii.chip,
    borderWidth: 1,
    maxWidth: '38%',
    paddingHorizontal: arcadeTheme.spacing.sm,
    paddingVertical: arcadeTheme.spacing.xs,
    position: 'absolute',
    right: 0,
    top: 0,
    zIndex: 5,
  },
  latestLapLabel: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.danger,
  },
  latestLapValue: {
    color: arcadeTheme.colors.ink,
    fontSize: 15,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 18,
  },
  latestLapSecondaryValue: {
    color: arcadeTheme.colors.accent,
    fontSize: 12,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 15,
  },
  historyHeader: {
    alignItems: 'center',
    borderBottomColor: arcadeTheme.colors.line,
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: arcadeTheme.spacing.sm,
  },
  historyTitleGroup: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.xs,
  },
  historyTitle: {
    color: arcadeTheme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 22,
  },
  timelineCopyButton: {
    alignItems: 'center',
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.chip,
    borderWidth: 1,
    height: 30,
    justifyContent: 'center',
    width: 30,
  },
  timelineCopyIcon: {
    height: 17,
    position: 'relative',
    width: 15,
  },
  timelineCopyIconBack: {
    borderColor: arcadeTheme.colors.mutedInk,
    borderRadius: 2,
    borderWidth: 1.5,
    height: 12,
    left: 0,
    position: 'absolute',
    top: 0,
    width: 10,
  },
  timelineCopyIconFront: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.ink,
    borderRadius: 2,
    borderWidth: 1.5,
    bottom: 0,
    height: 12,
    position: 'absolute',
    right: 0,
    width: 10,
  },
  historyCount: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.mutedInk,
  },
  historyList: {
    gap: arcadeTheme.spacing.xs,
    paddingBottom: arcadeTheme.spacing.sm,
  },
  historyScroll: {
    flex: 1,
    minHeight: 0,
  },
  historyEmpty: {
    ...arcadeTheme.typography.body,
    color: arcadeTheme.colors.mutedInk,
    fontWeight: '700',
    textAlign: 'center',
  },
  historyRow: {
    alignItems: 'center',
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.chip,
    borderWidth: 1,
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    minHeight: 34,
    paddingHorizontal: arcadeTheme.spacing.sm,
  },
  historyRowEven: {
    backgroundColor: arcadeTheme.colors.panel,
  },
  historyRowOdd: {
    backgroundColor: '#F7F8F4',
  },
  historyIndex: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.mutedInk,
    width: 22,
  },
  historyType: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.ink,
    flex: 1,
  },
  historyElapsed: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.ink,
    fontVariant: ['tabular-nums'],
    minWidth: 72,
    textAlign: 'right',
  },
  historyDelta: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.accent,
    fontVariant: ['tabular-nums'],
    minWidth: 72,
    textAlign: 'right',
  },
});
