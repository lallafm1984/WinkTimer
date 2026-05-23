import React from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
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
import {TimerDisplay} from '../components/TimerDisplay';
import type {SessionHistoryEvent} from '../domain/sessionHistory';
import {
  getTimerModePreset,
  timerModePresets,
  type TimerModeId,
  type TimerModePreset,
} from '../domain/timerMode';
import type {TimerState} from '../domain/timerEngine';
import {useAppState} from '../state/AppState';
import {arcadeTheme} from '../theme/arcadeTheme';

type TimerActionButtonProps = {
  label: string;
  gesture: string;
  onPress?: () => void;
  disabled?: boolean;
  variant?: 'primary' | 'secondary';
  accessibilityState?: {
    selected?: boolean;
  };
  emphasisOnPress?: boolean;
  style?: StyleProp<ViewStyle>;
};

type SessionHistoryOverlayProps = {
  events: SessionHistoryEvent[];
};

function isStoppedState(timer: TimerState, mode: TimerModePreset) {
  return (
    timer.phase === 'manualPaused' ||
    (timer.phase === 'active' &&
      mode.pauseGesture === 'look' &&
      (timer.isLookPaused || timer.detectionStatus === 'looking'))
  );
}

function canFinishTimer(timer: TimerState, mode: TimerModePreset) {
  return isStoppedState(timer, mode);
}

function canResetTimer(timer: TimerState, mode: TimerModePreset) {
  return isStoppedState(timer, mode);
}

function getStatusLabel(timer: TimerState, mode: TimerModePreset) {
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
      return '- 멈춤 -';
    case 'ended':
      return '- 종료 -';
    case 'idle':
    default:
      return '- 준비 -';
  }
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
  const clampedMs = Math.max(0, Math.floor(durationMs / 10) * 10);
  const totalHundredths = Math.floor(clampedMs / 10);
  const hundredths = totalHundredths % 100;
  const totalSeconds = Math.floor(totalHundredths / 100);
  const seconds = totalSeconds % 60;
  const minutes = Math.floor(totalSeconds / 60);

  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(
    2,
    '0',
  )}.${String(hundredths).padStart(2, '0')}`;
}

function SessionHistoryOverlay({events}: SessionHistoryOverlayProps) {
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
          orderedEvents.map((event, index) => (
            <View key={event.id} style={styles.historyRow}>
              <Text style={styles.historyIndex}>
                {String(events.length - index).padStart(2, '0')}
              </Text>
              <Text style={styles.historyType}>{event.type}</Text>
              <Text style={styles.historyElapsed}>
                {formatHistoryDurationMs(event.elapsedMs)}
              </Text>
              <Text style={styles.historyDelta}>
                +{formatHistoryDurationMs(event.deltaMs)}
              </Text>
            </View>
          ))
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
  accessibilityState,
  emphasisOnPress = false,
  style,
}: TimerActionButtonProps) {
  const canPress = !disabled && typeof onPress === 'function';

  return (
    <Pressable
      accessibilityLabel={`${label} ${gesture}`}
      accessibilityRole="button"
      accessibilityState={
        disabled ? {...accessibilityState, disabled} : accessibilityState
      }
      disabled={disabled}
      onPress={canPress ? onPress : undefined}
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
    </Pressable>
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
    finishTimerSession,
    timerModeId,
    setTimerModeId,
    sessionHistory,
  } = useAppState();
  const [modeMenuOpen, setModeMenuOpen] = React.useState(false);
  const [historyOpen, setHistoryOpen] = React.useState(false);

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
  const canChangeMode = timer.phase === 'idle';
  const canFinish = canFinishTimer(timer, selectedMode) && !isFinishingSession;
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
  const resumeRequiresDeviceFlip =
    timer.phase === 'manualPaused' &&
    selectedMode.resumeGesture === 'deviceFaceDown';
  const startBlockedByModeMenu = timer.phase === 'idle' && modeMenuOpen;
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

  const handleSelectMode = (modeId: TimerModeId) => {
    if (!canChangeMode) {
      return;
    }

    setTimerModeId(modeId);
    setModeMenuOpen(false);
  };

  const handleToggleHistory = () => {
    setHistoryOpen(current => !current);
    setModeMenuOpen(false);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header} testID="timer-header">
        <Text
          testID="timer-title"
          numberOfLines={1}
          adjustsFontSizeToFit
          style={styles.appLabel}>
          WINK TIMER
        </Text>
        <View style={styles.navButtons}>
          <PrimaryButton
            label="SETTINGS"
            onPress={() => {
              setScreen('settings');
            }}
            variant="secondary"
            style={styles.navButton}
          />
          <PrimaryButton
            label="EXIT"
            onPress={finishTimerSession}
            variant="secondary"
            disabled={!canFinish}
            testID="exit-button"
            style={styles.navButton}
          />
        </View>
      </View>

      <ArcadePanel style={styles.timerPanel}>
        <View style={styles.timerTopStrip} testID="top-timer-readout">
          <TimerDisplay durationMs={timer.focusDurationMs} />
        </View>

        <View style={styles.timerContentArea}>
          <View style={styles.timerStage} testID="timer-history-stage">
            <View style={styles.timerBlock} testID="timer-main-content">
              <GhostMascot
                expression={ghostState.expression}
                winkSide={ghostState.winkSide}
              />
              <Text style={styles.statusLabel} testID="timer-status-label">
                {getStatusLabel(timer, selectedMode)}
              </Text>
              {finishError ? <Text style={styles.error}>{finishError}</Text> : null}
            </View>

            {latestHistoryRecord ? (
              <View
                style={styles.latestLapRecord}
                testID="latest-history-record">
                <Text style={styles.latestLapLabel}>
                  {latestHistoryRecord.type}
                </Text>
                <Text
                  numberOfLines={1}
                  adjustsFontSizeToFit
                  style={styles.latestLapValue}>
                  {formatHistoryDurationMs(latestHistoryRecord.elapsedMs)}
                </Text>
              </View>
            ) : null}

            {historyOpen ? (
              <SessionHistoryOverlay events={historyEvents} />
            ) : null}
          </View>

          <View style={styles.actionDock}>
            <TimerActionButton
              label={shouldShowLapAction ? 'LAP' : 'RESET'}
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
      </ArcadePanel>

      <View style={styles.modeSection} testID="mode-selector-bottom">
        <Pressable
          accessibilityLabel={modeMenuOpen ? 'Close mode menu' : 'Open mode menu'}
          accessibilityRole="button"
          accessibilityState={{
            disabled: !canChangeMode,
            expanded: canChangeMode && modeMenuOpen,
          }}
          disabled={!canChangeMode}
          onPress={
            canChangeMode
              ? () => setModeMenuOpen(current => !current)
              : undefined
          }
          style={({pressed}) => [
            styles.modeButton,
            !canChangeMode && styles.disabledAction,
            pressed && canChangeMode && styles.pressedControl,
          ]}>
          <View style={styles.modeButtonCopy}>
            <Text style={styles.modeButtonLabel}>MODE</Text>
            <Text style={styles.modeButtonTitle}>{selectedMode.title}</Text>
          </View>
          <Text style={styles.modeButtonCue}>
            {modeMenuOpen ? 'CLOSE' : 'CHANGE'}
          </Text>
        </Pressable>

        {canChangeMode && modeMenuOpen ? (
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
        ) : null}
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
  },
  historyDelta: {
    ...arcadeTheme.typography.label,
    color: arcadeTheme.colors.accent,
    fontVariant: ['tabular-nums'],
    minWidth: 58,
    textAlign: 'right',
  },
  adSlot: {
    minHeight: 86,
  },
});
