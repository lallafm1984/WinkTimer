import React from 'react';
import {
  Animated,
  Easing,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  type GestureResponderEvent,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import {ArcadePanel} from '../components/ArcadePanel';
import {
  GhostMascot,
  type GhostExpression,
  type WinkSide,
} from '../components/GhostMascot';
import {PrimaryButton} from '../components/PrimaryButton';
import {formatDuration, TimerDisplay} from '../components/TimerDisplay';
import type {SessionHistoryEvent} from '../domain/sessionHistory';
import {
  getTimerModePreset,
  timerModePresets,
  type TimerModeId,
  type TimerModePreset,
} from '../domain/timerMode';
import type {TimerState} from '../domain/timerEngine';
import {
  createTimerTargetDurationMs,
  getTimekeepingDisplayDurationMs,
  getTimerTargetParts,
  MAX_TIMER_TARGET_HOURS,
  MAX_TIMER_TARGET_UNIT_VALUE,
  type TimekeepingMode,
} from '../domain/timekeeping';
import {useAppState} from '../state/AppState';
import {arcadeTheme} from '../theme/arcadeTheme';

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
};

type TimerTargetWheelProps = {
  wheelTestID: string;
  reelTestID: string;
  label: string;
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

function getStatusLabel(timer: TimerState, mode: TimerModePreset) {
  if (isWinkJudgmentUnavailable(timer, mode)) {
    return '윙크 판정 불가능 상태.';
  }

  if (
    timer.phase === 'active' &&
    mode.pauseGesture === 'look' &&
    (timer.isLookPaused || timer.detectionStatus === 'looking')
  ) {
    return '- 정지 -';
  }

  switch (timer.phase) {
    case 'active':
      return '- 측정중 -';
    case 'manualPaused':
      return '- 정지 -';
    case 'ended':
      return '- 종료 -';
    case 'idle':
    default:
      return '- 준비 -';
  }
}

function isWinkJudgmentUnavailable(
  timer: TimerState,
  mode: TimerModePreset,
) {
  return (
    mode.id === 'winkControl' &&
    timer.detectionStatus === 'looking' &&
    timer.eyeState === 'unknown'
  );
}

function getGhostState(timer: TimerState): {
  expression: GhostExpression;
  winkSide: WinkSide;
} {
  if (timer.recentWinkSide === 'left') {
    return {expression: 'leftWink', winkSide: 'left'};
  }

  if (timer.recentWinkSide === 'right') {
    return {expression: 'rightWink', winkSide: 'right'};
  }

  if (timer.detectionStatus === 'looking') {
    return {expression: 'looking', winkSide: 'any'};
  }

  if (timer.phase === 'ended') {
    return {expression: 'resetFlash', winkSide: 'any'};
  }

  return {expression: 'ready', winkSide: 'any'};
}

function getModeHint(mode: TimerModePreset, label: string) {
  return mode.actions.find(action => action.label === label)?.value ?? '-';
}

function getModeActionSummary(mode: TimerModePreset) {
  return mode.actions
    .map(action => `${action.label} ${action.value}`)
    .join(' / ');
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
) {
  return isTimerMarkEvent(event, timekeepingMode) ? 'MARK' : event.type;
}

function getHistoryElapsedLabel(
  event: SessionHistoryEvent,
  timekeepingMode: TimekeepingMode,
) {
  const elapsed = formatHistoryDurationMs(event.elapsedMs);

  return isTimerMarkEvent(event, timekeepingMode) ? `E ${elapsed}` : elapsed;
}

function getTimerMarkLeftLabel(
  event: SessionHistoryEvent,
  targetDurationMs: number,
) {
  return `L ${formatHistoryDurationMs(targetDurationMs - event.elapsedMs)}`;
}

function getHistoryDeltaLabel(
  event: SessionHistoryEvent,
  timekeepingMode: TimekeepingMode,
  targetDurationMs: number,
) {
  if (isTimerMarkEvent(event, timekeepingMode)) {
    return getTimerMarkLeftLabel(event, targetDurationMs);
  }

  return `+${formatHistoryDurationMs(event.deltaMs)}`;
}

function formatWheelValue(value: number) {
  return String(value).padStart(2, '0');
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
}: SessionHistoryOverlayProps) {
  const orderedEvents = [...events].reverse();

  return (
    <View style={styles.historyOverlay} testID="session-history-overlay">
      <View style={styles.historyHeader}>
        <Text style={styles.historyTitle}>HISTORY</Text>
        <Text style={styles.historyCount}>{events.length} RECORDS</Text>
      </View>
      <ScrollView
        style={styles.historyScroll}
        contentContainerStyle={styles.historyList}>
        {events.length === 0 ? (
          <Text style={styles.historyEmpty}>NO RECORDS YET</Text>
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
                  {getHistoryTypeLabel(event, timekeepingMode)}
                </Text>
                <Text style={styles.historyElapsed}>
                  {getHistoryElapsedLabel(event, timekeepingMode)}
                </Text>
                <Text style={styles.historyDelta}>
                  {getHistoryDeltaLabel(
                    event,
                    timekeepingMode,
                    targetDurationMs,
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
      accessibilityLabel={`${label} timer target wheel`}
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
    setTimerTargetDurationMs,
    timerModeId,
    setTimerModeId,
    setGestureInputsBlocked,
    sessionHistory,
  } = useAppState();
  const [modeMenuOpen, setModeMenuOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);
  const [timerTargetPopupOpen, setTimerTargetPopupOpen] =
    React.useState(false);
  const openTimerTargetAfterModeSwitchRef = React.useRef(false);
  const closeModeMenuAfterTimekeepingModeRef =
    React.useRef<TimekeepingMode | null>(null);

  const ghostState = getGhostState(timer);
  const selectedMode = getTimerModePreset(timerModeId);
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
  const canChangeMode = timer.phase === 'idle' || isStoppedState(timer, selectedMode);
  const canReset = canResetTimer(timer, selectedMode) && !isFinishingSession;
  const shouldShowLapAction =
    timer.phase === 'active' &&
    selectedMode.lapGesture !== undefined &&
    !isStoppedState(timer, selectedMode);
  const canRecordLap =
    shouldShowLapAction && !isFinishingSession;
  const startGesture = getModeHint(selectedMode, 'START');
  const pauseGesture = getModeHint(selectedMode, 'PAUSE');
  const resumeGesture = getModeHint(selectedMode, 'RESUME');
  const resetGesture = getModeHint(selectedMode, 'RESET');
  const lapGesture = getModeHint(selectedMode, 'LAP');
  const lapActionLabel = timekeepingMode === 'timer' ? 'MARK' : 'LAP';
  const resumeRequiresDeviceFlip =
    timer.phase === 'manualPaused' &&
    selectedMode.resumeGesture === 'deviceFaceDown';
  const startBlockedByModeMenu = timer.phase === 'idle' && modeMenuOpen;
  const timerDisplayDurationMs = getTimekeepingDisplayDurationMs(
    timer.focusDurationMs,
    timekeepingMode,
    timer.targetDurationMs,
    timerTargetDurationMs,
  );
  const effectiveTimerTargetDurationMs =
    timer.targetDurationMs ?? timerTargetDurationMs;
  const timerTargetParts = getTimerTargetParts(effectiveTimerTargetDurationMs);
  const showsTimerTargetControls = timekeepingMode === 'timer';
  const canAdjustTimerTarget =
    showsTimerTargetControls &&
    (timer.phase === 'idle' ||
      timer.phase === 'manualPaused' ||
      timer.phase === 'ended');
  const canOpenTimerTargetPopup = showsTimerTargetControls && canAdjustTimerTarget;
  const appTitle =
    timekeepingMode === 'timer' ? 'WINK TIMER' : 'WINK STOPWATCH';
  const primaryAction =
    timer.phase === 'active'
      ? {
          label: 'PAUSE',
          gesture: pauseGesture,
          onPress: pauseTimerSession,
          disabled: isFinishingSession,
        }
      : timer.phase === 'manualPaused'
        ? {
            label: 'RESUME',
            gesture: resumeGesture,
            onPress: resumeTimerSession,
            disabled: isFinishingSession || resumeRequiresDeviceFlip,
          }
        : {
            label: timer.phase === 'ended' ? 'RESTART' : 'START',
            gesture: startGesture,
            onPress: startTimerSession,
            disabled: isFinishingSession || startBlockedByModeMenu,
          };

  React.useEffect(() => {
    if (!canChangeMode && modeMenuOpen) {
      setModeMenuOpen(false);
    }
  }, [canChangeMode, modeMenuOpen]);

  React.useEffect(() => {
    const shouldBlockGestures = modeMenuOpen;

    setGestureInputsBlocked(shouldBlockGestures);

    return () => {
      setGestureInputsBlocked(false);
    };
  }, [modeMenuOpen, setGestureInputsBlocked]);

  React.useEffect(() => {
    if (openTimerTargetAfterModeSwitchRef.current && canOpenTimerTargetPopup) {
      openTimerTargetAfterModeSwitchRef.current = false;
      setTimerTargetPopupOpen(true);
      return;
    }

    if (!canOpenTimerTargetPopup && timerTargetPopupOpen) {
      setTimerTargetPopupOpen(false);
    }
  }, [canOpenTimerTargetPopup, timerTargetPopupOpen]);

  React.useEffect(() => {
    if (closeModeMenuAfterTimekeepingModeRef.current !== timekeepingMode) {
      return;
    }

    closeModeMenuAfterTimekeepingModeRef.current = null;
    setModeMenuOpen(false);
  }, [timekeepingMode]);

  const handleSelectTimekeepingMode = (mode: TimekeepingMode) => {
    if (mode === timekeepingMode) {
      setModeMenuOpen(false);
      return;
    }

    closeModeMenuAfterTimekeepingModeRef.current = mode;
    openTimerTargetAfterModeSwitchRef.current = mode === 'timer';
    setTimerTargetPopupOpen(false);
    setTimekeepingMode(mode);
  };

  const handleSelectMode = (modeId: TimerModeId) => {
    if (!canChangeMode) {
      return;
    }

    if (modeId !== timerModeId) {
      resetTimerSession();
      setTimerModeId(modeId);
    }

    setModeMenuOpen(false);
  };

  const setTimerTargetPartValue = (
    part: keyof typeof timerTargetParts,
    nextValue: number,
  ) => {
    if (!canAdjustTimerTarget) {
      return false;
    }

    const currentParts = getTimerTargetParts(timerTargetDurationMs);
    const nextParts = {
      ...currentParts,
      [part]: nextValue,
    };
    const nextDurationMs = createTimerTargetDurationMs(
      nextParts.hours,
      nextParts.minutes,
      nextParts.seconds,
    );

    if (nextDurationMs === timerTargetDurationMs) {
      return false;
    }

    setTimerTargetDurationMs(nextDurationMs);
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
            label="SETTINGS"
            onPress={() => {
              setScreen('settings');
            }}
            variant="secondary"
            testID="settings-button"
            style={styles.navButton}
          />
        </View>
      </View>

      <ArcadePanel style={styles.timerPanel}>
        <View style={styles.timerTopStrip} testID="top-timer-readout">
          <Pressable
            accessibilityLabel="Open timer target settings"
            accessibilityRole="button"
            accessibilityState={{disabled: !canOpenTimerTargetPopup}}
            disabled={!canOpenTimerTargetPopup}
            onPress={
              canOpenTimerTargetPopup
                ? () => {
                    setTimerTargetPopupOpen(true);
                  }
                : undefined
            }
            style={({pressed}) => [
              styles.timerReadoutButton,
              pressed && canOpenTimerTargetPopup && styles.pressedControl,
            ]}>
            <TimerDisplay
              durationMs={timerDisplayDurationMs}
              displayMode={timekeepingMode}
            />
          </Pressable>
        </View>

        <View style={styles.timerContentArea}>
          <View style={styles.timerStage} testID="timer-history-stage">
            <View style={styles.timerBlock} testID="timer-main-content">
              <GhostMascot
                expression={ghostState.expression}
                winkSide={ghostState.winkSide}
              />
              <Text
                numberOfLines={2}
                adjustsFontSizeToFit
                style={[
                  styles.statusLabel,
                  isWinkJudgmentUnavailable(timer, selectedMode) &&
                    styles.statusLabelDanger,
                ]}
                testID="timer-status-label">
                {getStatusLabel(timer, selectedMode)}
              </Text>
              {finishError ? <Text style={styles.error}>{finishError}</Text> : null}
            </View>

            {latestHistoryRecord ? (
              <View
                style={styles.latestLapRecord}
                testID="latest-history-record">
                <Text style={styles.latestLapLabel}>
                  {isTimerMarkEvent(latestHistoryRecord, timekeepingMode)
                    ? 'LAST MARK'
                    : latestHistoryRecord.type === 'LAP'
                      ? 'LAST LAP'
                      : latestHistoryRecord.type}
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={styles.latestLapValue}>
                  {getHistoryElapsedLabel(latestHistoryRecord, timekeepingMode)}
                </Text>
                {isTimerMarkEvent(latestHistoryRecord, timekeepingMode) ? (
                  <Text
                    numberOfLines={1}
                    adjustsFontSizeToFit
                    style={styles.latestLapSecondaryValue}>
                    {getTimerMarkLeftLabel(
                      latestHistoryRecord,
                      effectiveTimerTargetDurationMs,
                    )}
                  </Text>
                ) : null}
              </View>
            ) : null}

            {historyOpen ? (
              <SessionHistoryOverlay
                events={historyEvents}
                targetDurationMs={effectiveTimerTargetDurationMs}
                timekeepingMode={timekeepingMode}
              />
            ) : null}
          </View>

          <View style={styles.actionDock}>
            <TimerActionButton
              label={shouldShowLapAction ? lapActionLabel : 'RESET'}
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
              label="HISTORY"
              gesture="Button"
              onPress={handleToggleHistory}
              disabled={false}
              accessibilityState={{selected: historyOpen}}
            />
          </View>
        </View>

        {timerTargetPopupOpen ? (
          <View style={styles.timerTargetPopupBackdrop}>
            <View
              style={styles.timerTargetPopup}
              testID="timer-target-popup">
              <Text style={styles.timerTargetPopupTitle}>SET TIMER</Text>
              <View
                style={styles.timerTargetControls}
                testID="timer-target-controls">
              <TimerTargetWheel
                wheelTestID="timer-target-hour-wheel"
                reelTestID="timer-target-hour-reel"
                label="HOUR"
                value={timerTargetParts.hours}
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
                label="MIN"
                value={timerTargetParts.minutes}
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
                label="SEC"
                value={timerTargetParts.seconds}
                min={0}
                max={MAX_TIMER_TARGET_UNIT_VALUE}
                disabled={!canAdjustTimerTarget}
                wraps
                onValueChange={nextValue => {
                  return setTimerTargetPartValue('seconds', nextValue);
                }}
              />
              </View>
              <PrimaryButton
                label="DONE"
                onPress={() => {
                  setTimerTargetPopupOpen(false);
                }}
                variant="secondary"
                style={styles.timerTargetDoneButton}
              />
            </View>
          </View>
        ) : null}
      </ArcadePanel>

      <View style={styles.modeSection} testID="mode-selector-bottom">
        {canChangeMode && modeMenuOpen ? (
          <>
            <View style={styles.modeMenu} testID="mode-menu">
              {timerModePresets.map(mode => {
                const active = mode.id === timerModeId;

                return (
                  <Pressable
                    accessibilityLabel={`${mode.title} mode`}
                    accessibilityRole="button"
                    accessibilityState={{selected: active}}
                    key={mode.id}
                    onPress={() => handleSelectMode(mode.id)}
                    style={({pressed}) => [
                      styles.modeMenuItem,
                      active && styles.activeModeMenuItem,
                      pressed && canChangeMode && styles.pressedControl,
                    ]}>
                    <View style={styles.modeMenuCopy}>
                      <Text style={styles.modeMenuTitle}>{mode.title}</Text>
                      <Text style={styles.modeMenuDescription}>
                        {mode.description}
                      </Text>
                      <Text style={styles.modeMenuActions}>
                        {getModeActionSummary(mode)}
                      </Text>
                    </View>
                    <View style={styles.modeMenuBadges}>
                      {active ? (
                        <Text style={[styles.menuBadge, styles.activeMenuBadge]}>
                          ACTIVE
                        </Text>
                      ) : null}
                    </View>
                  </Pressable>
                );
              })}
            </View>
            <View
              style={styles.timekeepingModeOptions}
              testID="timekeeping-mode-options">
              <TimerActionButton
                accessibilityState={{selected: timekeepingMode === 'stopwatch'}}
                hideGesture
                label="STOPWATCH"
                onPress={() => handleSelectTimekeepingMode('stopwatch')}
                variant={
                  timekeepingMode === 'stopwatch' ? 'primary' : 'secondary'
                }
                testID="timekeeping-stopwatch-button"
                style={styles.timekeepingModeChoice}
              />
              <TimerActionButton
                accessibilityState={{selected: timekeepingMode === 'timer'}}
                hideGesture
                label="TIMER"
                onPress={() => handleSelectTimekeepingMode('timer')}
                variant={timekeepingMode === 'timer' ? 'primary' : 'secondary'}
                testID="timekeeping-timer-button"
                style={styles.timekeepingModeChoice}
              />
            </View>
          </>
        ) : (
          <Pressable
            accessibilityLabel="Open mode menu"
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
              <Text style={styles.modeButtonLabel}>MODE</Text>
              <Text style={styles.modeButtonTitle}>{selectedMode.title}</Text>
            </View>
            <Text style={styles.modeButtonCue}>CHANGE</Text>
          </Pressable>
        )}
      </View>

      <View style={styles.adSlot} testID="ad-slot" />
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
  timerTargetPopupTitle: {
    color: arcadeTheme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 22,
    textAlign: 'center',
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
  statusLabelDanger: {
    color: arcadeTheme.colors.danger,
    fontSize: 30,
    lineHeight: 36,
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
    position: 'relative',
    elevation: 40,
    zIndex: 40,
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
    bottom: 66,
    elevation: 50,
    gap: arcadeTheme.spacing.sm,
    left: 0,
    padding: arcadeTheme.spacing.sm,
    position: 'absolute',
    right: 0,
    zIndex: 50,
  },
  modeMenuItem: {
    alignItems: 'flex-start',
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
  },
  modeMenuTitle: {
    ...arcadeTheme.typography.body,
    color: arcadeTheme.colors.ink,
    fontWeight: '900',
  },
  modeMenuDescription: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.mutedInk,
    fontWeight: '400',
  },
  modeMenuActions: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.softInk,
  },
  modeMenuBadges: {
    alignItems: 'flex-end',
    gap: arcadeTheme.spacing.xs,
  },
  menuBadge: {
    ...arcadeTheme.typography.label,
    borderRadius: arcadeTheme.radii.chip,
    borderWidth: 1,
    overflow: 'hidden',
    paddingHorizontal: arcadeTheme.spacing.sm,
    paddingVertical: arcadeTheme.spacing.xs,
  },
  activeMenuBadge: {
    backgroundColor: arcadeTheme.colors.accent,
    borderColor: arcadeTheme.colors.accent,
    color: arcadeTheme.colors.panel,
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
  historyTitle: {
    color: arcadeTheme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 22,
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
  adSlot: {
    minHeight: 86,
  },
});
