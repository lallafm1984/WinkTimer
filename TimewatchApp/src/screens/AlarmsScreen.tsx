import React, { useEffect, useState } from 'react';
import {
  BackHandler,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  type GestureResponderEvent,
  type LayoutChangeEvent,
  type StyleProp,
  type ViewStyle,
  View,
} from 'react-native';
import {
  loadTimerAlertSoundOptions,
  playTimerAlertSoundPreview,
  stopTimerAlertSoundPreview,
  timerAlertSoundOptions,
  type TimerAlertSoundOption,
} from '../alerts/timerAlert';
import { PrimaryButton } from '../components/PrimaryButton';
import { TimekeepingModeBar } from '../components/TimekeepingModeBar';
import {
  createDefaultAlarm,
  formatAlarmTime,
  getTodayIsoDate,
  normalizeAlarmSoundVolume,
  toggleAlarmWeekday,
  type AlarmSchedule,
  type AlarmWeekday,
  type ScheduledAlarm,
} from '../domain/alarm';
import { createTranslator, type TranslationKey } from '../i18n/localization';
import { useAppState } from '../state/AppState';
import { arcadeTheme } from '../theme/arcadeTheme';

const alarmWeekdays: AlarmWeekday[] = [0, 1, 2, 3, 4, 5, 6];
const ALARM_TIME_DRAG_ACTIVATION_PX = 14;
const ALARM_TIME_DRAG_PX_PER_STEP = 22;
const ALARM_VOLUME_MIN = 0.1;
const ALARM_VOLUME_MAX = 1;
const ACTIVE_SWITCH_COLOR = '#1D4D3A';
const ACTIVE_SWITCH_TINT = '#E7F1EA';
const CALENDAR_COLUMN_WIDTH = '14.2857142857%';
type Translator = ReturnType<typeof createTranslator>;

const weekdayLabelKeys: Record<AlarmWeekday, TranslationKey> = {
  0: 'alarm.weekday.sun',
  1: 'alarm.weekday.mon',
  2: 'alarm.weekday.tue',
  3: 'alarm.weekday.wed',
  4: 'alarm.weekday.thu',
  5: 'alarm.weekday.fri',
  6: 'alarm.weekday.sat',
};

function wrapValue(value: number, maxExclusive: number) {
  return (value + maxExclusive) % maxExclusive;
}

function getLocalizedAlarmWeekdayLabel(weekday: AlarmWeekday, t: Translator) {
  return t(weekdayLabelKeys[weekday]);
}

function getAlarmListDateLabel(schedule: AlarmSchedule) {
  if (schedule.kind !== 'dates' || schedule.dates.length === 0) {
    return null;
  }

  const todayIsoDate = getTodayIsoDate();
  const sortedDates = [...schedule.dates].sort();

  return (
    sortedDates.find(date => date >= todayIsoDate) ??
    sortedDates[sortedDates.length - 1]
  );
}

function getLocalizedAlarmScheduleLabel(
  schedule: AlarmSchedule,
  t: Translator,
) {
  switch (schedule.kind) {
    case 'weekly':
      return schedule.weekdays
        .map(weekday => getLocalizedAlarmWeekdayLabel(weekday, t))
        .join(' ');
    case 'dates':
      return schedule.dates.join(', ');
    case 'daily':
    default:
      return t('alarm.everyDay');
  }
}

function getAlarmScheduleBadges(schedule: AlarmSchedule, t: Translator) {
  if (schedule.kind === 'weekly') {
    return schedule.weekdays.map(weekday =>
      getLocalizedAlarmWeekdayLabel(weekday, t),
    );
  }

  if (schedule.kind === 'dates') {
    const dateLabel = getAlarmListDateLabel(schedule);
    return dateLabel === null
      ? [t('alarm.repeatDate')]
      : [t('alarm.repeatDate'), dateLabel];
  }

  return [t('alarm.everyDay')];
}

function createWeeklySchedule(): { kind: 'weekly'; weekdays: AlarmWeekday[] } {
  return { kind: 'weekly', weekdays: [1, 2, 3, 4, 5] };
}

function formatWheelValue(value: number) {
  return String(value).padStart(2, '0');
}

function getWheelDisplayValue(
  value: number,
  min: number,
  max: number,
  offset: number,
) {
  const range = max - min + 1;
  return ((value - min + offset + range) % range) + min;
}

function getNextWheelValue(
  value: number,
  min: number,
  max: number,
  step: number,
) {
  const range = max - min + 1;
  return ((value - min + step + range) % range) + min;
}

function getResponderPageY(event: GestureResponderEvent) {
  const pageY = event.nativeEvent.pageY;
  return typeof pageY === 'number' ? pageY : null;
}

function getResponderLocationX(event: GestureResponderEvent) {
  const locationX = event.nativeEvent.locationX;
  return typeof locationX === 'number' ? locationX : null;
}

function getResponderPageX(event: GestureResponderEvent) {
  const pageX = event.nativeEvent.pageX;
  return typeof pageX === 'number' ? pageX : null;
}

function getAlarmVolumePercent(value: number) {
  return Math.round(normalizeAlarmSoundVolume(value) * 100);
}

function getAlarmVolumeFillPercent(value: number) {
  const normalized = normalizeAlarmSoundVolume(value);
  return (
    ((normalized - ALARM_VOLUME_MIN) / (ALARM_VOLUME_MAX - ALARM_VOLUME_MIN)) *
    100
  );
}

function getAlarmVolumeFromLocationX(locationX: number, trackWidth: number) {
  const safeTrackWidth = Math.max(1, trackWidth);
  const positionRatio = Math.min(1, Math.max(0, locationX / safeTrackWidth));
  const volume =
    ALARM_VOLUME_MIN +
    positionRatio * (ALARM_VOLUME_MAX - ALARM_VOLUME_MIN);

  return normalizeAlarmSoundVolume(Math.round(volume * 20) / 20);
}

function getAlarmTimeDragStep(dy: number) {
  if (Math.abs(dy) < ALARM_TIME_DRAG_ACTIVATION_PX) {
    return 0;
  }

  const step = Math.max(
    1,
    Math.round(Math.abs(dy) / ALARM_TIME_DRAG_PX_PER_STEP),
  );
  return dy < 0 ? step : -step;
}

function parseIsoDate(isoDate: string) {
  const [year, month, day] = isoDate.split('-').map(Number);
  return new Date(year, month - 1, day);
}

function getMonthIsoDate(isoDate: string) {
  const date = parseIsoDate(isoDate);
  return getTodayIsoDate(new Date(date.getFullYear(), date.getMonth(), 1));
}

function addCalendarMonths(monthIsoDate: string, months: number) {
  const date = parseIsoDate(monthIsoDate);
  return getTodayIsoDate(
    new Date(date.getFullYear(), date.getMonth() + months, 1),
  );
}

function getCalendarMonthLabel(monthIsoDate: string) {
  const [year, month] = monthIsoDate.split('-');
  return `${year}.${month}`;
}

function getCalendarCells(monthIsoDate: string) {
  const monthDate = parseIsoDate(monthIsoDate);
  const year = monthDate.getFullYear();
  const monthIndex = monthDate.getMonth();
  const firstDay = new Date(year, monthIndex, 1);
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();

  return Array.from({ length: 42 }, (_, index) => {
    const day = index - firstDay.getDay() + 1;

    if (day < 1 || day > daysInMonth) {
      return null;
    }

    return getTodayIsoDate(new Date(year, monthIndex, day));
  });
}

type AlarmEditorProps = {
  draft: ScheduledAlarm;
  t: Translator;
  onChange(alarm: ScheduledAlarm): void;
  onCancel(): void;
  onSave(): void;
};

type BooleanAlarmOptionControlProps = {
  title: string;
  value: boolean;
  compact?: boolean;
  onLabel: string;
  offLabel: string;
  testID: string;
  style?: StyleProp<ViewStyle>;
  onChange(value: boolean): void;
};

type AlarmSwitchProps = {
  value: boolean;
  switchTestID: string;
  label?: string;
  onLabel?: string;
  offLabel?: string;
  compact?: boolean;
  mini?: boolean;
  accessibilityLabel?: string;
  onChange(value: boolean): void;
};

type AlarmSoundControlProps = {
  value: string;
  soundVolume: number;
  t: Translator;
  onChange(value: string): void;
  onVolumeChange(value: number): void;
};

type AlarmVolumeControlProps = {
  value: number;
  t: Translator;
  onChange(value: number): void;
};

type AlarmTimeWheelProps = {
  value: number;
  min: number;
  max: number;
  label: string;
  testID: string;
  reelTestID: string;
  onValueChange(value: number): void;
};

type AlarmDateCalendarProps = {
  dates: string[];
  t: Translator;
  onChange(dates: string[]): void;
};

type AlarmBadgeProps = {
  label: string;
  compact?: boolean;
  tone?: 'default' | 'enabled' | 'muted';
};

type AlarmListRowProps = {
  alarm: ScheduledAlarm;
  t: Translator;
  onEdit(): void;
  onRequestDelete(): void;
  onToggleEnabled(): void;
};

function formatAlarmSoundOptionLabel(
  option: TimerAlertSoundOption,
  t: Translator,
) {
  return option.id === 'alarm' ? t('alarm.defaultSound') : option.label;
}

function getAlarmSoundOptionSelectTestID(
  option: TimerAlertSoundOption,
  index: number,
) {
  return option.category === 'Default'
    ? `alarm-sound-select-${option.id}`
    : `alarm-sound-select-${index}`;
}

function getAlarmSoundOptionPreviewTestID(
  option: TimerAlertSoundOption,
  index: number,
) {
  return option.category === 'Default'
    ? `alarm-sound-preview-${option.id}`
    : `alarm-sound-preview-${index}`;
}

function AlarmTimeWheel({
  value,
  min,
  max,
  label,
  testID,
  reelTestID,
  onValueChange,
}: AlarmTimeWheelProps) {
  const currentValueRef = React.useRef(value);
  const dragStartYRef = React.useRef<number | null>(null);
  const lastDragStepRef = React.useRef(0);
  const previousValue = getWheelDisplayValue(value, min, max, -1);
  const nextValue = getWheelDisplayValue(value, min, max, 1);

  React.useEffect(() => {
    currentValueRef.current = value;
  }, [value]);

  const applyWheelStep = React.useCallback(
    (step: number) => {
      if (step === 0) {
        return;
      }

      const nextWheelValue = getNextWheelValue(
        currentValueRef.current,
        min,
        max,
        step,
      );

      currentValueRef.current = nextWheelValue;
      onValueChange(nextWheelValue);
    },
    [max, min, onValueChange],
  );

  const applyDragStep = (event: GestureResponderEvent) => {
    const startY = dragStartYRef.current;

    if (startY === null) {
      return;
    }

    const endY = getResponderPageY(event);
    if (endY === null) {
      return;
    }

    const step = getAlarmTimeDragStep(endY - startY);
    const nextStep = step - lastDragStepRef.current;
    if (nextStep !== 0) {
      lastDragStepRef.current = step;
      applyWheelStep(nextStep);
    }
  };

  const handleResponderRelease = (event: GestureResponderEvent) => {
    applyDragStep(event);
    dragStartYRef.current = null;
    lastDragStepRef.current = 0;
  };

  return (
    <View
      accessibilityLabel={label}
      accessibilityRole="adjustable"
      onMoveShouldSetResponder={() => true}
      onResponderGrant={event => {
        currentValueRef.current = value;
        dragStartYRef.current = getResponderPageY(event);
        lastDragStepRef.current = 0;
      }}
      onResponderMove={applyDragStep}
      onResponderRelease={handleResponderRelease}
      onResponderTerminate={() => {
        dragStartYRef.current = null;
        lastDragStepRef.current = 0;
      }}
      onStartShouldSetResponder={() => true}
      style={styles.alarmTimeWheel}
      testID={testID}
    >
      <View style={styles.alarmTimeWheelReel} testID={reelTestID}>
        <Text style={styles.alarmTimeWheelSideValue}>
          {formatWheelValue(previousValue)}
        </Text>
        <Text style={styles.alarmTimeWheelValue}>
          {formatWheelValue(value)}
        </Text>
        <Text style={styles.alarmTimeWheelSideValue}>
          {formatWheelValue(nextValue)}
        </Text>
      </View>
      <Text style={styles.alarmTimeWheelLabel}>{label}</Text>
    </View>
  );
}

function AlarmDateCalendar({ dates, t, onChange }: AlarmDateCalendarProps) {
  const [visibleMonthIsoDate, setVisibleMonthIsoDate] = useState(() =>
    getMonthIsoDate(dates[0] ?? getTodayIsoDate()),
  );
  const selectedDates = new Set(dates);
  const calendarCells = getCalendarCells(visibleMonthIsoDate);

  const selectDate = (date: string) => {
    onChange([date]);
  };

  return (
    <View style={styles.calendar} testID="alarm-date-calendar">
      <View style={styles.calendarHeader}>
        <PrimaryButton
          label={t('alarm.calendarPrev')}
          onPress={() => {
            setVisibleMonthIsoDate(currentMonth =>
              addCalendarMonths(currentMonth, -1),
            );
          }}
          testID="alarm-calendar-prev-month"
          variant="secondary"
          style={styles.calendarMonthButton}
        />
        <Text style={styles.calendarMonthTitle}>
          {getCalendarMonthLabel(visibleMonthIsoDate)}
        </Text>
        <PrimaryButton
          label={t('alarm.calendarNext')}
          onPress={() => {
            setVisibleMonthIsoDate(currentMonth =>
              addCalendarMonths(currentMonth, 1),
            );
          }}
          testID="alarm-calendar-next-month"
          variant="secondary"
          style={styles.calendarMonthButton}
        />
      </View>
      <View style={styles.calendarWeekdays}>
        {alarmWeekdays.map(weekday => (
          <Text key={weekday} style={styles.calendarWeekdayLabel}>
            {getLocalizedAlarmWeekdayLabel(weekday, t)}
          </Text>
        ))}
      </View>
      <View style={styles.calendarGrid}>
        {calendarCells.map((date, index) => {
          if (date === null) {
            return (
              <View
                key={`empty-${index}`}
                style={[styles.calendarCell, styles.calendarEmptyDay]}
                testID="alarm-calendar-empty-day"
              />
            );
          }

          const selected = selectedDates.has(date);

          return (
            <View key={date} style={styles.calendarCell}>
              <PrimaryButton
                accessibilityState={{ selected }}
                label={String(parseIsoDate(date).getDate())}
                onPress={() => selectDate(date)}
                testID={`alarm-calendar-day-${date}`}
                variant={selected ? 'primary' : 'secondary'}
                style={styles.calendarDayButton}
              />
            </View>
          );
        })}
      </View>
    </View>
  );
}

function AlarmSwitch({
  value,
  switchTestID,
  label,
  onLabel = 'ON',
  offLabel = 'OFF',
  compact = false,
  mini = false,
  accessibilityLabel,
  onChange,
}: AlarmSwitchProps) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel ?? label ?? switchTestID}
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      onPress={() => onChange(!value)}
      style={({ pressed }) => [
        styles.switchControl,
        compact && styles.switchControlCompact,
        mini && styles.switchControlMini,
        value ? styles.switchControlOn : styles.switchControlOff,
        pressed && styles.switchControlPressed,
      ]}
      testID={switchTestID}
    >
      <Text
        testID={`${switchTestID}-label`}
        style={[
          styles.switchLabel,
          compact && styles.switchLabelCompact,
          mini && styles.switchLabelMini,
          value ? styles.switchLabelOn : styles.switchLabelOff,
        ]}
      >
        {label ?? (value ? onLabel : offLabel)}
      </Text>
      <View
        style={[
          styles.switchTrack,
          compact && styles.switchTrackCompact,
          mini && styles.switchTrackMini,
          value ? styles.switchTrackOn : styles.switchTrackOff,
        ]}
        testID={`${switchTestID}-track`}
      >
        <View
          style={[
            styles.switchThumb,
            compact && styles.switchThumbCompact,
            mini && styles.switchThumbMini,
            value ? styles.switchThumbOn : styles.switchThumbOff,
          ]}
        />
      </View>
    </Pressable>
  );
}

function AlarmBadge({ label, compact = false, tone = 'default' }: AlarmBadgeProps) {
  return (
    <View
      style={[
        styles.alarmBadge,
        compact && styles.alarmBadgeCompact,
        tone === 'enabled' && styles.alarmBadgeEnabled,
        tone === 'muted' && styles.alarmBadgeMuted,
      ]}
      testID="alarm-info-badge"
    >
      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={[
          styles.alarmBadgeText,
          compact && styles.alarmBadgeTextCompact,
          tone === 'enabled' && styles.alarmBadgeTextEnabled,
          tone === 'muted' && styles.alarmBadgeTextMuted,
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function AlarmListRow({
  alarm,
  t,
  onEdit,
  onRequestDelete,
  onToggleEnabled,
}: AlarmListRowProps) {
  const enabledAlertBadges = [
    alarm.soundEnabled ? t('alarm.soundOn') : null,
    alarm.vibrationEnabled ? t('alarm.vibrationOn') : null,
    alarm.snoozeEnabled ? t('alarm.snoozeOn') : null,
  ].filter((label): label is string => label !== null);
  const usesWeekdayBadges = alarm.schedule.kind === 'weekly';

  return (
    <View style={styles.alarmRow} testID="alarm-row">
      <View style={styles.alarmMain}>
        <Text style={styles.alarmTime}>{formatAlarmTime(alarm)}</Text>
        <View
          style={[
            styles.alarmBadgeRow,
            usesWeekdayBadges && styles.alarmWeekdayBadgeRow,
          ]}
          testID={`alarm-schedule-badges-${alarm.id}`}
        >
          {getAlarmScheduleBadges(alarm.schedule, t).map(label => (
            <AlarmBadge key={label} label={label} compact={usesWeekdayBadges} />
          ))}
        </View>
        {enabledAlertBadges.length > 0 ? (
          <View
            style={styles.alarmBadgeRow}
            testID={`alarm-alert-badges-${alarm.id}`}
          >
            {enabledAlertBadges.map(label => (
              <AlarmBadge key={label} label={label} tone="enabled" />
            ))}
          </View>
        ) : null}
      </View>
      <View
        style={styles.alarmSideControls}
        testID={`alarm-side-controls-${alarm.id}`}
      >
        <AlarmSwitch
          compact
          accessibilityLabel={
            alarm.enabled
              ? t('alarm.enabledAccessibility')
              : t('alarm.disabledAccessibility')
          }
          label={alarm.enabled ? t('common.on') : t('common.off')}
          value={alarm.enabled}
          switchTestID={`alarm-enabled-switch-${alarm.id}`}
          onChange={onToggleEnabled}
        />
        <View
          style={styles.alarmActions}
          testID={`alarm-row-actions-${alarm.id}`}
        >
          <PrimaryButton
            label={t('alarm.edit')}
            onPress={onEdit}
            testID={`alarm-edit-${alarm.id}`}
            variant="secondary"
            style={styles.compactButton}
          />
          <PrimaryButton
            label={t('alarm.deleteShort')}
            onPress={onRequestDelete}
            testID={`alarm-delete-${alarm.id}`}
            variant="secondary"
            style={styles.compactButton}
          />
        </View>
      </View>
    </View>
  );
}

function BooleanAlarmOptionControl({
  title,
  value,
  compact = false,
  onLabel,
  offLabel,
  testID,
  style,
  onChange,
}: BooleanAlarmOptionControlProps) {
  return (
    <View
      style={[
        styles.section,
        styles.secondarySettingSection,
        compact && styles.compactSettingSection,
        style,
      ]}
      testID={`${testID}-section`}
    >
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[styles.sectionTitle, compact && styles.compactSectionTitle]}
      >
        {title}
      </Text>
      <AlarmSwitch
        accessibilityLabel={title}
        mini={compact}
        onLabel={onLabel}
        offLabel={offLabel}
        value={value}
        switchTestID={`${testID}-switch`}
        onChange={onChange}
      />
    </View>
  );
}

function AlarmVolumeControl({ value, t, onChange }: AlarmVolumeControlProps) {
  const [trackWidth, setTrackWidth] = useState(240);
  const trackRef = React.useRef<React.ElementRef<typeof View> | null>(null);
  const trackPageXRef = React.useRef<number | null>(null);
  const fillPercent = getAlarmVolumeFillPercent(value);
  const updateTrackMeasurements = () => {
    trackRef.current?.measure((_x, _y, width, _height, pageX) => {
      if (width > 0) {
        setTrackWidth(width);
      }
      trackPageXRef.current = pageX;
    });
  };
  const updateVolumeFromEvent = (event: GestureResponderEvent) => {
    const pageX = getResponderPageX(event);
    const pageStartX = trackPageXRef.current;
    const locationX =
      pageX !== null && pageStartX !== null
        ? pageX - pageStartX
        : getResponderLocationX(event);

    if (locationX === null) {
      return;
    }

    onChange(getAlarmVolumeFromLocationX(locationX, trackWidth));
  };
  const handleTrackLayout = (event: LayoutChangeEvent) => {
    setTrackWidth(Math.max(1, event.nativeEvent.layout.width));
    updateTrackMeasurements();
  };

  return (
    <View style={styles.volumeControl} testID="alarm-sound-volume-control">
      <View style={styles.volumeHeader}>
        <Text style={styles.volumeTitle}>{t('alarm.volume')}</Text>
        <Text style={styles.volumeValue} testID="alarm-sound-volume-value">
          {getAlarmVolumePercent(value)}%
        </Text>
      </View>
      <View
        accessibilityLabel={t('alarm.soundVolume')}
        accessibilityRole="adjustable"
        ref={trackRef}
        onLayout={handleTrackLayout}
        onMoveShouldSetResponder={() => true}
        onResponderGrant={event => {
          updateTrackMeasurements();
          updateVolumeFromEvent(event);
        }}
        onResponderMove={updateVolumeFromEvent}
        onResponderRelease={updateVolumeFromEvent}
        onStartShouldSetResponder={() => true}
        style={styles.volumeSliderTrack}
        testID="alarm-sound-volume-slider"
      >
        <View
          pointerEvents="none"
          style={[styles.volumeSliderFill, { width: `${fillPercent}%` }]}
          testID="alarm-sound-volume-slider-fill"
        />
        <View
          pointerEvents="none"
          style={[styles.volumeSliderThumb, { left: `${fillPercent}%` }]}
          testID="alarm-sound-volume-slider-thumb"
        />
      </View>
    </View>
  );
}

function AlarmSoundControl({
  value,
  soundVolume,
  t,
  onChange,
  onVolumeChange,
}: AlarmSoundControlProps) {
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
    <View style={[styles.section, styles.secondarySettingSection]}>
      <View style={styles.soundHeader}>
        <View style={styles.soundTitleGroup}>
          <Text style={styles.sectionTitle}>{t('alarm.alertSound')}</Text>
          <Text
            style={styles.soundSelectedName}
            testID="alarm-selected-sound-name"
          >
            {selectedOption
              ? formatAlarmSoundOptionLabel(selectedOption, t)
              : t('alarm.customSound')}
          </Text>
        </View>
        <PrimaryButton
          label={t('common.select')}
          onPress={() => setSoundModalVisible(true)}
          testID="alarm-sound-open"
          variant="secondary"
          style={styles.soundHeaderButton}
        />
      </View>

      <AlarmVolumeControl
        value={soundVolume}
        t={t}
        onChange={onVolumeChange}
      />

      {soundModalVisible ? (
        <Modal
          animationType="fade"
          onRequestClose={() => {
            stopSoundPreview();
            setSoundModalVisible(false);
          }}
          transparent
          visible={soundModalVisible}
        >
          <View style={styles.modalBackdrop} testID="alarm-sound-popup">
            <View style={styles.soundModalPanel}>
              <View style={styles.soundModalHeader}>
                <Text style={styles.modalTitle}>{t('alarm.alertSound')}</Text>
                <PrimaryButton
                  label={t('common.close')}
                  onPress={() => {
                    stopSoundPreview();
                    setSoundModalVisible(false);
                  }}
                  testID="alarm-sound-close"
                  variant="secondary"
                  style={styles.soundHeaderButton}
                />
              </View>
              <ScrollView
                nestedScrollEnabled
                style={styles.soundOptionScroller}
                contentContainerStyle={styles.soundOptionList}
                testID="alarm-sound-scroll"
              >
                <Text style={styles.soundListTitle}>
                  {t('alarm.soundOptions')}
                </Text>
                {soundOptions.map((option, index) => (
                  <View key={option.id} style={styles.soundOptionRow}>
                    <PrimaryButton
                      accessibilityState={{ selected: value === option.id }}
                      label={formatAlarmSoundOptionLabel(option, t)}
                      onPress={() => {
                        stopSoundPreview();
                        onChange(option.id);
                        setSoundModalVisible(false);
                      }}
                      testID={getAlarmSoundOptionSelectTestID(option, index)}
                      variant={value === option.id ? 'primary' : 'secondary'}
                      style={styles.soundOptionSelectButton}
                    />
                    <PrimaryButton
                      accessibilityLabel={
                        playingPreviewSoundId === option.id
                          ? t('alarm.stopPreview')
                          : t('alarm.preview')
                      }
                      label={
                        playingPreviewSoundId === option.id ? '■' : '▶'
                      }
                      onPress={() => {
                        toggleSoundPreview(option.id);
                      }}
                      testID={getAlarmSoundOptionPreviewTestID(option, index)}
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

function AlarmEditor({ draft, t, onChange, onCancel, onSave }: AlarmEditorProps) {
  const [timePopupOpen, setTimePopupOpen] = useState(false);
  const [timeDraftHour, setTimeDraftHour] = useState(draft.hour);
  const [timeDraftMinute, setTimeDraftMinute] = useState(draft.minute);
  const [datePopupOpen, setDatePopupOpen] = useState(false);
  const [dateDrafts, setDateDrafts] = useState<string[]>(() =>
    draft.schedule.kind === 'dates'
      ? draft.schedule.dates
      : [getTodayIsoDate()],
  );
  const [weekdayPopupOpen, setWeekdayPopupOpen] = useState(false);
  const [weekdayDrafts, setWeekdayDrafts] = useState<AlarmWeekday[]>(() =>
    draft.schedule.kind === 'weekly'
      ? draft.schedule.weekdays
      : createWeeklySchedule().weekdays,
  );
  const setSchedule = (schedule: AlarmSchedule) => {
    onChange({ ...draft, schedule });
  };
  const openTimePopup = () => {
    setTimeDraftHour(draft.hour);
    setTimeDraftMinute(draft.minute);
    setTimePopupOpen(true);
  };
  const applyTimePopup = () => {
    onChange({
      ...draft,
      hour: wrapValue(timeDraftHour, 24),
      minute: wrapValue(timeDraftMinute, 60),
    });
    setTimePopupOpen(false);
  };
  const openDatePopup = () => {
    setDateDrafts([
      draft.schedule.kind === 'dates'
        ? draft.schedule.dates[0] ?? getTodayIsoDate()
        : getTodayIsoDate(),
    ]);
    setDatePopupOpen(true);
  };
  const applyDatePopup = () => {
    setSchedule({ kind: 'dates', dates: [dateDrafts[0] ?? getTodayIsoDate()] });
    setDatePopupOpen(false);
  };
  const openWeekdayPopup = () => {
    setWeekdayDrafts(
      draft.schedule.kind === 'weekly'
        ? draft.schedule.weekdays
        : createWeeklySchedule().weekdays,
    );
    setWeekdayPopupOpen(true);
  };
  const applyWeekdayPopup = () => {
    setSchedule({ kind: 'weekly', weekdays: weekdayDrafts });
    setWeekdayPopupOpen(false);
  };

  return (
    <View style={styles.editor} testID="alarm-editor">
      <View style={styles.editorHeader}>
        <Text style={styles.editorTitle}>{t('alarm.setupTitle')}</Text>
      </View>

      <View style={styles.editorContent} testID="alarm-editor-content">
        <View
          style={[styles.section, styles.primarySettingSection]}
          testID="alarm-time-section"
        >
          <Text style={styles.sectionTitle}>{t('alarm.time')}</Text>
          <Pressable
            accessibilityLabel={t('alarm.openTimeSettings')}
            accessibilityRole="button"
            onPress={openTimePopup}
            style={({ pressed }) => [
              styles.timeOpenButton,
              pressed && styles.pressedControl,
            ]}
            testID="alarm-time-open"
          >
            <Text style={styles.timeOpenValue}>{formatAlarmTime(draft)}</Text>
            <Text style={styles.timeOpenHint}>{t('alarm.tapToSet')}</Text>
          </Pressable>
        </View>

        <View
          style={[styles.section, styles.secondarySettingSection]}
          testID="alarm-repeat-section"
        >
          <Text style={styles.sectionTitle}>{t('alarm.repeat')}</Text>
          <View style={styles.optionRow}>
            <PrimaryButton
              accessibilityState={{ selected: draft.schedule.kind === 'daily' }}
              label={t('alarm.repeatDaily')}
              onPress={() => setSchedule({ kind: 'daily' })}
              testID="alarm-schedule-daily"
              variant={
                draft.schedule.kind === 'daily' ? 'primary' : 'secondary'
              }
              style={styles.optionButton}
            />
            <PrimaryButton
              accessibilityState={{
                selected: draft.schedule.kind === 'weekly',
              }}
              label={t('alarm.repeatWeekdays')}
              onPress={openWeekdayPopup}
              testID="alarm-schedule-weekly"
              variant={
                draft.schedule.kind === 'weekly' ? 'primary' : 'secondary'
              }
              style={styles.optionButton}
            />
            <PrimaryButton
              accessibilityState={{ selected: draft.schedule.kind === 'dates' }}
              label={t('alarm.repeatDate')}
              onPress={openDatePopup}
              testID="alarm-schedule-dates"
              variant={
                draft.schedule.kind === 'dates' ? 'primary' : 'secondary'
              }
              style={styles.optionButton}
            />
          </View>
          <Text style={styles.repeatSummary} testID="alarm-repeat-summary">
            {getLocalizedAlarmScheduleLabel(draft.schedule, t)}
          </Text>
        </View>

        <AlarmSoundControl
          value={draft.alertSoundId}
          soundVolume={draft.soundVolume}
          t={t}
          onChange={alertSoundId => onChange({ ...draft, alertSoundId })}
          onVolumeChange={soundVolume => onChange({ ...draft, soundVolume })}
        />

        <View style={styles.alertToggleRow} testID="alarm-alert-toggle-row">
          <BooleanAlarmOptionControl
            title={t('alarm.sound')}
            value={draft.soundEnabled}
            compact
            onLabel={t('common.on')}
            offLabel={t('common.off')}
            testID="alarm-sound-enabled"
            style={styles.alertToggleSection}
            onChange={soundEnabled => onChange({ ...draft, soundEnabled })}
          />

          <BooleanAlarmOptionControl
            title={t('alarm.vibration')}
            value={draft.vibrationEnabled}
            compact
            onLabel={t('common.on')}
            offLabel={t('common.off')}
            testID="alarm-vibration-enabled"
            style={styles.alertToggleSection}
            onChange={vibrationEnabled =>
              onChange({ ...draft, vibrationEnabled })
            }
          />

        </View>

        <BooleanAlarmOptionControl
          title={t('alarm.snooze')}
          value={draft.snoozeEnabled}
          onLabel={t('common.on')}
          offLabel={t('common.off')}
          testID="alarm-snooze-enabled"
          style={styles.snoozeSection}
          onChange={snoozeEnabled => onChange({ ...draft, snoozeEnabled })}
        />
      </View>

      <View style={styles.editorActions} testID="alarm-editor-actions">
        <PrimaryButton
          label={t('common.cancel')}
          onPress={onCancel}
          testID="cancel-alarm-edit-button"
          variant="secondary"
          style={styles.actionButton}
        />
        <PrimaryButton
          label={t('alarm.save')}
          onPress={onSave}
          testID="save-alarm-button"
          style={styles.actionButton}
        />
      </View>

      {timePopupOpen ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setTimePopupOpen(false)}
          transparent
          visible={timePopupOpen}
        >
          <View
            style={[styles.modalBackdrop, styles.centeredModalBackdrop]}
            testID="alarm-time-popup"
          >
            <View style={styles.timeModalPanel}>
              <View style={styles.soundModalHeader}>
                <Text style={styles.modalTitle}>{t('alarm.time')}</Text>
              </View>
              <View style={styles.timeEditor}>
                <AlarmTimeWheel
                  value={timeDraftHour}
                  min={0}
                  max={23}
                  label={t('alarm.hour')}
                  testID="alarm-time-hour-wheel"
                  reelTestID="alarm-time-hour-reel"
                  onValueChange={setTimeDraftHour}
                />
                <Text style={styles.timeSeparator}>:</Text>
                <AlarmTimeWheel
                  value={timeDraftMinute}
                  min={0}
                  max={59}
                  label={t('alarm.minute')}
                  testID="alarm-time-minute-wheel"
                  reelTestID="alarm-time-minute-reel"
                  onValueChange={setTimeDraftMinute}
                />
              </View>
              <View style={styles.modalActions}>
                <PrimaryButton
                  label={t('common.cancel')}
                  onPress={() => setTimePopupOpen(false)}
                  testID="alarm-time-cancel-button"
                  variant="secondary"
                  style={styles.actionButton}
                />
                <PrimaryButton
                  label={t('alarm.confirm')}
                  onPress={applyTimePopup}
                  testID="alarm-time-confirm-button"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {weekdayPopupOpen ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setWeekdayPopupOpen(false)}
          transparent
          visible={weekdayPopupOpen}
        >
          <View
            style={[styles.modalBackdrop, styles.centeredModalBackdrop]}
            testID="alarm-weekday-popup"
          >
            <View style={styles.weekdayModalPanel}>
              <View style={styles.soundModalHeader}>
                <Text style={styles.modalTitle}>
                  {t('alarm.repeatWeekdays')}
                </Text>
              </View>
              <View style={styles.weekdayGrid} testID="alarm-weekday-options">
                {alarmWeekdays.map(weekday => {
                  const selected = weekdayDrafts.includes(weekday);

                  return (
                    <PrimaryButton
                      key={weekday}
                      accessibilityState={{ selected }}
                      label={getLocalizedAlarmWeekdayLabel(weekday, t)}
                      onPress={() =>
                        setWeekdayDrafts(currentWeekdays =>
                          toggleAlarmWeekday(currentWeekdays, weekday),
                        )
                      }
                      testID={`alarm-weekday-${weekday}`}
                      variant={selected ? 'primary' : 'secondary'}
                      style={styles.weekdayButton}
                    />
                  );
                })}
              </View>
              <View style={styles.modalActions}>
                <PrimaryButton
                  label={t('common.cancel')}
                  onPress={() => setWeekdayPopupOpen(false)}
                  testID="alarm-weekday-cancel-button"
                  variant="secondary"
                  style={styles.actionButton}
                />
                <PrimaryButton
                  label={t('alarm.confirm')}
                  onPress={applyWeekdayPopup}
                  testID="alarm-weekday-confirm-button"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}

      {datePopupOpen ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setDatePopupOpen(false)}
          transparent
          visible={datePopupOpen}
        >
          <View
            style={[styles.modalBackdrop, styles.centeredModalBackdrop]}
            testID="alarm-date-popup"
          >
            <View style={styles.dateModalPanel}>
              <View style={styles.soundModalHeader}>
                <Text style={styles.modalTitle}>{t('alarm.repeatDate')}</Text>
              </View>
              <AlarmDateCalendar
                dates={dateDrafts}
                t={t}
                onChange={setDateDrafts}
              />
              <View style={styles.modalActions}>
                <PrimaryButton
                  label={t('common.cancel')}
                  onPress={() => setDatePopupOpen(false)}
                  testID="alarm-date-cancel-button"
                  variant="secondary"
                  style={styles.actionButton}
                />
                <PrimaryButton
                  label={t('alarm.confirm')}
                  onPress={applyDatePopup}
                  testID="alarm-date-confirm-button"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

export function AlarmsScreen() {
  const {
    alarms,
    saveAlarm,
    deleteAlarm,
    toggleAlarmEnabled,
    setScreen,
    setTimekeepingMode,
    requestTimerTargetPopup,
    locale,
  } = useAppState();
  const t = createTranslator(locale);
  const [draft, setDraft] = useState<ScheduledAlarm | null>(null);
  const [deleteCandidateId, setDeleteCandidateId] = useState<string | null>(
    null,
  );
  const deleteCandidate = alarms.find(alarm => alarm.id === deleteCandidateId);

  const openNewAlarm = () => {
    setDraft(createDefaultAlarm(Date.now()));
  };
  const openExistingAlarm = (alarm: ScheduledAlarm) => {
    setDraft({ ...alarm });
  };
  const saveDraft = () => {
    if (draft === null) {
      return;
    }

    saveAlarm(draft);
    setDraft(null);
  };
  const confirmDeleteAlarm = () => {
    if (deleteCandidateId === null) {
      return;
    }

    deleteAlarm(deleteCandidateId);
    setDeleteCandidateId(null);
  };
  const returnToTimekeepingMode = (mode: 'stopwatch' | 'timer') => {
    if (mode === 'timer') {
      requestTimerTargetPopup();
    }

    setTimekeepingMode(mode);
    setScreen('timer');
  };

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (draft !== null) {
          setDraft(null);
        }

        return true;
      },
    );

    return () => {
      subscription.remove();
    };
  }, [draft]);

  return (
    <View style={styles.screen} testID="alarms-screen">
      {draft === null ? (
        <View style={styles.fixedContent} testID="alarm-list-fixed-area">
          <View style={styles.header}>
            <Text style={styles.title} testID="alarms-title">
              {t('alarm.title')}
            </Text>
            <PrimaryButton
              label={t('settings.title')}
              onPress={() => setScreen('settings')}
              testID="alarms-settings-button"
              variant="secondary"
              style={styles.headerButton}
            />
          </View>

          <View style={styles.topActions}>
            <PrimaryButton
              label={t('alarm.add')}
              onPress={openNewAlarm}
              testID="add-alarm-button"
              style={styles.fullButton}
            />
          </View>
        </View>
      ) : null}

      {draft !== null ? (
        <AlarmEditor
          draft={draft}
          t={t}
          onCancel={() => setDraft(null)}
          onChange={setDraft}
          onSave={saveDraft}
        />
      ) : (
        <ScrollView
          persistentScrollbar
          showsVerticalScrollIndicator
          style={styles.scroll}
          contentContainerStyle={styles.listScrollContent}
          testID="alarms-scroll"
        >
          <View style={styles.list} testID="alarm-list">
            {alarms.length === 0 ? (
              <View style={styles.emptyState} testID="alarm-empty-state">
                <Text style={styles.emptyTitle}>{t('alarm.empty')}</Text>
              </View>
            ) : (
              alarms.map(alarm => (
                <AlarmListRow
                  key={alarm.id}
                  alarm={alarm}
                  t={t}
                  onEdit={() => openExistingAlarm(alarm)}
                  onRequestDelete={() => setDeleteCandidateId(alarm.id)}
                  onToggleEnabled={() => toggleAlarmEnabled(alarm.id)}
                />
              ))
            )}
          </View>
        </ScrollView>
      )}
      {draft === null ? (
        <View style={styles.modeSection} testID="mode-selector-bottom">
          <TimekeepingModeBar
            activeTarget="alarm"
            alarmLabel={t('alarm.modeTitle')}
            onSelectAlarm={() => setScreen('alarms')}
            onSelectStopwatch={() => returnToTimekeepingMode('stopwatch')}
            onSelectTimer={() => returnToTimekeepingMode('timer')}
            stopwatchLabel={t('timer.stopwatch')}
            timerLabel={t('timer.timer')}
          />
        </View>
      ) : null}
      {deleteCandidateId !== null ? (
        <Modal
          animationType="fade"
          onRequestClose={() => setDeleteCandidateId(null)}
          transparent
          visible={deleteCandidateId !== null}
        >
          <View
            style={[styles.modalBackdrop, styles.centeredModalBackdrop]}
            testID="alarm-delete-confirm-popup"
          >
            <View style={styles.deleteModalPanel}>
              <Text style={styles.modalTitle}>
                {t('alarm.deleteConfirmTitle')}
              </Text>
              <Text style={styles.deleteModalCopy}>
                {deleteCandidate
                  ? t('alarm.deleteConfirmCopyWithTime', {
                      time: formatAlarmTime(deleteCandidate),
                    })
                  : t('alarm.deleteConfirmCopy')}
              </Text>
              <View style={styles.modalActions}>
                <PrimaryButton
                  label={t('common.cancel')}
                  onPress={() => setDeleteCandidateId(null)}
                  testID="alarm-delete-cancel-button"
                  variant="secondary"
                  style={styles.actionButton}
                />
                <PrimaryButton
                  label={t('alarm.delete')}
                  onPress={confirmDeleteAlarm}
                  testID="alarm-delete-confirm-button"
                  style={styles.actionButton}
                />
              </View>
            </View>
          </View>
        </Modal>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    backgroundColor: arcadeTheme.colors.background,
    flex: 1,
    gap: arcadeTheme.spacing.sm,
    paddingHorizontal: arcadeTheme.spacing.lg,
    paddingTop: arcadeTheme.spacing.md,
    paddingBottom: arcadeTheme.spacing.sm,
  },
  scroll: {
    flex: 1,
    minHeight: 0,
  },
  container: {
    gap: arcadeTheme.spacing.md,
  },
  fixedContent: {
    gap: arcadeTheme.spacing.sm,
  },
  listScrollContent: {
    paddingBottom: arcadeTheme.spacing.xs,
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    justifyContent: 'space-between',
  },
  title: {
    color: arcadeTheme.colors.ink,
    flex: 1,
    fontSize: 21,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 25,
  },
  headerButton: {
    minHeight: 34,
    paddingHorizontal: arcadeTheme.spacing.sm,
    paddingVertical: arcadeTheme.spacing.xs,
  },
  topActions: {
    flexDirection: 'row',
  },
  fullButton: {
    minHeight: 40,
    width: '100%',
  },
  editor: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.heavyLine,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 2,
    flex: 1,
    gap: 6,
    minHeight: 0,
    padding: 8,
  },
  editorHeader: {
    gap: 0,
  },
  editorContent: {
    flexShrink: 1,
    gap: 5,
    justifyContent: 'flex-start',
    minHeight: 0,
  },
  editorTitle: {
    color: arcadeTheme.colors.ink,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 21,
  },
  editorSubtitle: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 16,
  },
  timeEditor: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    justifyContent: 'center',
  },
  alarmTimeWheel: {
    alignItems: 'center',
    backgroundColor: arcadeTheme.colors.background,
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.control,
    borderWidth: 1,
    flex: 1,
    justifyContent: 'center',
    minHeight: 102,
    overflow: 'hidden',
    paddingHorizontal: arcadeTheme.spacing.xs,
    paddingVertical: arcadeTheme.spacing.xs,
  },
  alarmTimeWheelReel: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  alarmTimeWheelSideValue: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 21,
    opacity: 0.58,
  },
  alarmTimeWheelValue: {
    color: arcadeTheme.colors.ink,
    fontSize: 34,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 40,
    textAlign: 'center',
  },
  alarmTimeWheelLabel: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 15,
  },
  timeSeparator: {
    color: arcadeTheme.colors.ink,
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 42,
  },
  section: {
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.control,
    borderWidth: 1,
    gap: 4,
    padding: 6,
  },
  compactSettingSection: {
    gap: 4,
    paddingHorizontal: 5,
    paddingVertical: 6,
  },
  primarySettingSection: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.heavyLine,
  },
  secondarySettingSection: {
    backgroundColor: arcadeTheme.colors.background,
  },
  sectionTitle: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 16,
  },
  compactSectionTitle: {
    fontSize: 11,
    lineHeight: 14,
  },
  optionRow: {
    flexDirection: 'row',
    gap: 6,
  },
  optionButton: {
    flex: 1,
    minHeight: 34,
    paddingHorizontal: arcadeTheme.spacing.xs,
    paddingVertical: 3,
  },
  repeatSummary: {
    backgroundColor: ACTIVE_SWITCH_TINT,
    borderColor: ACTIVE_SWITCH_COLOR,
    borderRadius: arcadeTheme.radii.control,
    borderWidth: 1,
    color: arcadeTheme.colors.ink,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 18,
    minHeight: 30,
    paddingHorizontal: arcadeTheme.spacing.sm,
    paddingVertical: 4,
    textAlign: 'center',
    textAlignVertical: 'center',
  },
  timeOpenButton: {
    alignItems: 'center',
    backgroundColor: arcadeTheme.colors.background,
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.control,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 58,
    paddingHorizontal: arcadeTheme.spacing.sm,
    paddingVertical: 5,
  },
  timeOpenValue: {
    color: arcadeTheme.colors.ink,
    fontSize: 30,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 34,
  },
  timeOpenHint: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 14,
  },
  pressedControl: {
    opacity: 0.82,
  },
  switchControl: {
    alignItems: 'center',
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.control,
    borderWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 40,
    paddingHorizontal: arcadeTheme.spacing.sm,
    paddingVertical: arcadeTheme.spacing.xs,
  },
  switchControlCompact: {
    minHeight: 36,
    minWidth: 92,
    paddingLeft: 10,
    paddingRight: arcadeTheme.spacing.xs,
  },
  switchControlMini: {
    minHeight: 30,
    minWidth: 0,
    paddingHorizontal: 5,
    paddingVertical: 3,
  },
  switchControlOn: {
    backgroundColor: ACTIVE_SWITCH_TINT,
    borderColor: ACTIVE_SWITCH_COLOR,
  },
  switchControlOff: {
    backgroundColor: arcadeTheme.colors.panel,
  },
  switchControlPressed: {
    opacity: 0.82,
  },
  switchLabel: {
    fontSize: 15,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 19,
  },
  switchLabelCompact: {
    minWidth: 28,
    fontSize: 13,
    lineHeight: 16,
    textAlign: 'center',
  },
  switchLabelMini: {
    fontSize: 12,
    lineHeight: 15,
    minWidth: 21,
    textAlign: 'center',
  },
  switchLabelOn: {
    color: ACTIVE_SWITCH_COLOR,
  },
  switchLabelOff: {
    color: arcadeTheme.colors.mutedInk,
  },
  switchTrack: {
    borderRadius: 18,
    height: 26,
    justifyContent: 'center',
    paddingHorizontal: 3,
    width: 52,
  },
  switchTrackOn: {
    alignItems: 'flex-end',
    backgroundColor: ACTIVE_SWITCH_COLOR,
  },
  switchTrackOff: {
    alignItems: 'flex-start',
    backgroundColor: arcadeTheme.colors.line,
  },
  switchThumb: {
    backgroundColor: arcadeTheme.colors.panel,
    borderRadius: 10,
    height: 20,
    width: 20,
  },
  switchTrackCompact: {
    height: 24,
    width: 48,
  },
  switchTrackMini: {
    height: 20,
    width: 40,
  },
  switchThumbCompact: {
    borderRadius: 9,
    height: 18,
    width: 18,
  },
  switchThumbMini: {
    borderRadius: 7,
    height: 14,
    width: 14,
  },
  switchThumbOn: {
    backgroundColor: arcadeTheme.colors.panel,
  },
  switchThumbOff: {
    backgroundColor: arcadeTheme.colors.mutedInk,
  },
  soundHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    justifyContent: 'space-between',
  },
  soundTitleGroup: {
    flex: 1,
    gap: 3,
    minWidth: 0,
  },
  soundSelectedName: {
    color: arcadeTheme.colors.ink,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 15,
  },
  soundHeaderButton: {
    minHeight: 36,
    minWidth: 68,
    paddingHorizontal: 6,
    paddingVertical: arcadeTheme.spacing.xs,
  },
  volumeControl: {
    gap: 4,
  },
  volumeHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  volumeTitle: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 14,
  },
  volumeValue: {
    color: ACTIVE_SWITCH_COLOR,
    fontSize: 12,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 15,
  },
  volumeSliderTrack: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.round,
    borderWidth: 1,
    height: 24,
    justifyContent: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  volumeSliderFill: {
    backgroundColor: ACTIVE_SWITCH_TINT,
    borderRightColor: ACTIVE_SWITCH_COLOR,
    borderRightWidth: 1,
    bottom: 0,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  volumeSliderThumb: {
    backgroundColor: ACTIVE_SWITCH_COLOR,
    borderColor: arcadeTheme.colors.panel,
    borderRadius: 8,
    borderWidth: 2,
    height: 14,
    marginLeft: -7,
    position: 'absolute',
    width: 14,
  },
  modalBackdrop: {
    alignItems: 'center',
    backgroundColor: 'rgba(18, 26, 20, 0.48)',
    flex: 1,
    justifyContent: 'flex-start',
    paddingBottom: arcadeTheme.spacing.lg,
    paddingHorizontal: arcadeTheme.spacing.lg,
    paddingTop: 84,
  },
  centeredModalBackdrop: {
    justifyContent: 'center',
    paddingTop: arcadeTheme.spacing.lg,
  },
  timeModalPanel: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.heavyLine,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 2,
    gap: arcadeTheme.spacing.md,
    maxWidth: 420,
    padding: arcadeTheme.spacing.md,
    width: '100%',
  },
  weekdayModalPanel: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.heavyLine,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 2,
    gap: arcadeTheme.spacing.md,
    maxWidth: 420,
    padding: arcadeTheme.spacing.md,
    width: '100%',
  },
  dateModalPanel: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.heavyLine,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 2,
    gap: arcadeTheme.spacing.md,
    maxHeight: '78%',
    maxWidth: 420,
    padding: arcadeTheme.spacing.md,
    width: '100%',
  },
  deleteModalPanel: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.heavyLine,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 2,
    gap: arcadeTheme.spacing.md,
    maxWidth: 420,
    padding: arcadeTheme.spacing.md,
    width: '100%',
  },
  deleteModalCopy: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 14,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 18,
  },
  soundModalPanel: {
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.heavyLine,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 2,
    gap: arcadeTheme.spacing.md,
    maxHeight: '78%',
    maxWidth: 420,
    padding: arcadeTheme.spacing.md,
    width: '100%',
  },
  soundModalHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    justifyContent: 'space-between',
  },
  modalTitle: {
    color: arcadeTheme.colors.ink,
    flex: 1,
    fontSize: 18,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 22,
  },
  soundOptionScroller: {
    backgroundColor: arcadeTheme.colors.background,
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.control,
    borderWidth: 1,
    maxHeight: 320,
  },
  soundOptionList: {
    gap: arcadeTheme.spacing.sm,
    padding: arcadeTheme.spacing.sm,
  },
  soundListTitle: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 14,
  },
  soundOptionRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
  },
  soundOptionSelectButton: {
    flex: 1,
    minHeight: 40,
    minWidth: 0,
    paddingHorizontal: arcadeTheme.spacing.xs,
    paddingVertical: arcadeTheme.spacing.xs,
  },
  soundOptionPreviewButton: {
    minHeight: 40,
    minWidth: 58,
    paddingHorizontal: arcadeTheme.spacing.xs,
    paddingVertical: arcadeTheme.spacing.xs,
    width: 58,
  },
  weekdayGrid: {
    flexDirection: 'row',
    flexWrap: 'nowrap',
    gap: 4,
  },
  weekdayButton: {
    flex: 1,
    minHeight: 40,
    minWidth: 0,
    paddingHorizontal: 0,
    paddingVertical: arcadeTheme.spacing.sm,
  },
  calendar: {
    backgroundColor: arcadeTheme.colors.background,
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.control,
    borderWidth: 1,
    gap: arcadeTheme.spacing.sm,
    padding: arcadeTheme.spacing.sm,
  },
  calendarHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    justifyContent: 'space-between',
  },
  calendarMonthButton: {
    minHeight: 34,
    minWidth: 70,
    paddingHorizontal: arcadeTheme.spacing.xs,
    paddingVertical: arcadeTheme.spacing.xs,
  },
  calendarMonthTitle: {
    color: arcadeTheme.colors.ink,
    flex: 1,
    fontSize: 17,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 21,
    textAlign: 'center',
  },
  calendarWeekdays: {
    flexDirection: 'row',
  },
  calendarWeekdayLabel: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 10,
    fontWeight: '900',
    letterSpacing: 0,
    paddingHorizontal: 2,
    textAlign: 'center',
    width: CALENDAR_COLUMN_WIDTH,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  calendarCell: {
    minHeight: 40,
    padding: 2,
    width: CALENDAR_COLUMN_WIDTH,
  },
  calendarDayButton: {
    minHeight: 36,
    paddingHorizontal: 0,
    paddingVertical: arcadeTheme.spacing.xs,
    width: '100%',
  },
  calendarEmptyDay: {
    minHeight: 40,
  },
  editorActions: {
    flexDirection: 'row',
    gap: 6,
    marginTop: 'auto',
  },
  alertToggleRow: {
    flexDirection: 'row',
    gap: 6,
  },
  alertToggleSection: {
    flex: 1,
    minWidth: 0,
  },
  modalActions: {
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
  },
  actionButton: {
    flex: 1,
    minHeight: 40,
    paddingVertical: 7,
  },
  snoozeSection: {
    minHeight: 0,
    paddingVertical: 5,
  },
  list: {
    gap: arcadeTheme.spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 1,
    justifyContent: 'center',
    minHeight: 86,
    padding: arcadeTheme.spacing.md,
  },
  emptyTitle: {
    color: arcadeTheme.colors.mutedInk,
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 18,
  },
  alarmRow: {
    alignItems: 'stretch',
    backgroundColor: arcadeTheme.colors.panel,
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.panel,
    borderWidth: 1,
    flexDirection: 'row',
    gap: arcadeTheme.spacing.sm,
    padding: arcadeTheme.spacing.sm,
  },
  alarmMain: {
    flex: 1,
    gap: arcadeTheme.spacing.sm,
    minWidth: 0,
  },
  alarmTime: {
    color: arcadeTheme.colors.ink,
    fontSize: 26,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 31,
  },
  alarmBadgeRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: arcadeTheme.spacing.xs,
  },
  alarmWeekdayBadgeRow: {
    flexWrap: 'nowrap',
    gap: 2,
  },
  alarmBadge: {
    backgroundColor: arcadeTheme.colors.background,
    borderColor: arcadeTheme.colors.line,
    borderRadius: arcadeTheme.radii.chip,
    borderWidth: 1,
    minHeight: 26,
    paddingHorizontal: arcadeTheme.spacing.sm,
    paddingVertical: 4,
  },
  alarmBadgeCompact: {
    flexShrink: 0,
    minHeight: 24,
    minWidth: 0,
    paddingHorizontal: 2,
    paddingVertical: 3,
    width: 30,
  },
  alarmBadgeEnabled: {
    backgroundColor: ACTIVE_SWITCH_TINT,
    borderColor: ACTIVE_SWITCH_COLOR,
  },
  alarmBadgeMuted: {
    backgroundColor: arcadeTheme.colors.panelMuted,
  },
  alarmBadgeText: {
    color: arcadeTheme.colors.ink,
    fontSize: 11,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 14,
  },
  alarmBadgeTextCompact: {
    fontSize: 10,
    lineHeight: 13,
    textAlign: 'center',
  },
  alarmBadgeTextEnabled: {
    color: ACTIVE_SWITCH_COLOR,
  },
  alarmBadgeTextMuted: {
    color: arcadeTheme.colors.mutedInk,
  },
  alarmSideControls: {
    gap: arcadeTheme.spacing.xs,
    width: 92,
  },
  alarmActions: {
    alignItems: 'flex-end',
    gap: arcadeTheme.spacing.xs,
  },
  compactButton: {
    minHeight: 28,
    paddingHorizontal: 4,
    paddingVertical: 2,
    width: 64,
  },
  modeSection: {
    elevation: 40,
    gap: arcadeTheme.spacing.xs,
    position: 'relative',
    zIndex: 40,
  },
});
