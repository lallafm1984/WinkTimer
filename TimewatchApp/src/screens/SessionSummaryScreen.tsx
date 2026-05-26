import React from 'react';
import {StyleSheet, Text, View} from 'react-native';
import {PrimaryButton} from '../components/PrimaryButton';
import {TimerDisplay} from '../components/TimerDisplay';
import {createTranslator} from '../i18n/localization';
import {useAppState} from '../state/AppState';

export function SessionSummaryScreen() {
  const {lastSummary, locale, setScreen} = useAppState();
  const t = createTranslator(locale);

  if (lastSummary === null) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>{t('summary.noSession')}</Text>
        <PrimaryButton
          label={t('summary.returnTimer')}
          onPress={() => {
            setScreen('timer');
          }}
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.eyebrow}>{t('summary.eyebrow')}</Text>
      <Text style={styles.title}>{t('summary.title')}</Text>

      <View style={styles.metricHero}>
        <TimerDisplay
          accessibilityLabelPrefix={t('summary.title')}
          durationMs={lastSummary.focusDurationMs}
        />
      </View>

      <View style={styles.metrics}>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{t('summary.pausedTime')}</Text>
          <TimerDisplay
            accessibilityLabelPrefix={t('summary.pausedTime')}
            durationMs={lastSummary.lookPausedDurationMs}
            size="medium"
          />
        </View>
        <View style={styles.metricRow}>
          <Text style={styles.metricLabel}>{t('summary.pauseCount')}</Text>
          <Text style={styles.metricValue}>
            {lastSummary.lookPauseCount}
            {t('history.countUnit')}
          </Text>
        </View>
      </View>

      <PrimaryButton
        label={t('summary.returnTimer')}
        onPress={() => {
          setScreen('timer');
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  eyebrow: {
    color: '#406455',
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 8,
  },
  title: {
    color: '#121A14',
    fontSize: 28,
    fontWeight: '800',
    letterSpacing: 0,
    lineHeight: 36,
    marginBottom: 28,
  },
  metricHero: {
    alignItems: 'flex-start',
    marginBottom: 28,
  },
  metrics: {
    borderColor: '#DCE2DE',
    borderTopWidth: 1,
    gap: 16,
    marginBottom: 28,
    paddingTop: 20,
  },
  metricRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricLabel: {
    color: '#5D6A62',
    fontSize: 16,
    fontWeight: '700',
  },
  metricValue: {
    color: '#121A14',
    fontSize: 28,
    fontVariant: ['tabular-nums'],
    fontWeight: '800',
  },
});
