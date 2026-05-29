import React from 'react';
import {BackHandler, Modal, StatusBar, StyleSheet, Text, View} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {AppStateProvider, useAppState, type AppScreen} from './state/AppState';
import {HistoryScreen} from './screens/HistoryScreen';
import {SessionSummaryScreen} from './screens/SessionSummaryScreen';
import {SettingsScreen} from './screens/SettingsScreen';
import {TimerScreen} from './screens/TimerScreen';
import {AlarmsScreen} from './screens/AlarmsScreen';
import {MascotImageCache} from './components/MascotImageCache';
import {PrimaryButton} from './components/PrimaryButton';
import {preloadMascotImages} from './components/mascotImages';
import {AdMobBanner} from './ads/AdMobBanner';
import {showAlarmStopInterstitialIfEligible} from './ads/interstitialAd';
import {initializeInterstitialAdRemoteConfig} from './ads/interstitialAdRemoteConfig';
import {ensureAnonymousUser} from './auth/anonymousAuth';
import {initializeMobileAds} from './ads/mobileAds';
import {arcadeTheme} from './theme/arcadeTheme';
import {createTranslator} from './i18n/localization';

type SetScreen = React.Dispatch<React.SetStateAction<AppScreen>>;

export function createHardwareBackPressHandler(
  screen: AppScreen,
  setScreen: SetScreen,
) {
  return () => {
    if (screen === 'alarms') {
      return false;
    }

    if (screen !== 'timer') {
      setScreen('timer');
    }

    return true;
  };
}

function CurrentScreen() {
  const {screen, setScreen} = useAppState();
  const handleHardwareBackPress = React.useMemo(
    () => createHardwareBackPressHandler(screen, setScreen),
    [screen, setScreen],
  );

  React.useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      handleHardwareBackPress,
    );

    return () => {
      subscription.remove();
    };
  }, [handleHardwareBackPress]);

  switch (screen) {
    case 'timer':
      return <TimerScreen />;
    case 'summary':
      return <SessionSummaryScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'alarms':
      return <AlarmsScreen />;
    default:
      return <TimerScreen />;
  }
}

function ActiveAlarmAlertPopup() {
  const {
    activeAlarmAlert,
    alarms,
    silenceActiveAlarmAlert,
    snoozeActiveAlarmAlert,
    stopActiveAlarmAlert,
    locale,
  } = useAppState();
  const t = createTranslator(locale);
  const [snoozeOptionsVisible, setSnoozeOptionsVisible] =
    React.useState(false);

  React.useEffect(() => {
    setSnoozeOptionsVisible(false);
  }, [activeAlarmAlert?.alarmId]);

  const handleStopAlarmAlert = React.useCallback(() => {
    stopActiveAlarmAlert();
    showAlarmStopInterstitialIfEligible().catch(() => undefined);
  }, [stopActiveAlarmAlert]);

  if (activeAlarmAlert === null) {
    return null;
  }

  const activeAlarm =
    activeAlarmAlert.alarmId === null
      ? null
      : alarms.find(alarm => alarm.id === activeAlarmAlert.alarmId) ?? null;
  const canSnooze = activeAlarm?.snoozeEnabled ?? true;
  const showSnoozeOptions = canSnooze && snoozeOptionsVisible;

  return (
    <Modal transparent animationType="fade" visible>
      <View style={styles.alarmModalBackdrop} testID="active-alarm-alert-popup">
        <View style={styles.alarmModalPanel} testID="active-alarm-alert-panel">
          <Text style={styles.alarmModalEyebrow}>{t('alarm.ringing')}</Text>
          <Text style={styles.alarmModalTitle}>{activeAlarmAlert.title}</Text>
          <Text style={styles.alarmModalText}>{activeAlarmAlert.text}</Text>
          <View style={styles.alarmModalActions}>
            <PrimaryButton
              label={t('alarm.stop')}
              onPress={handleStopAlarmAlert}
              testID="active-alarm-alert-stop-button"
              style={styles.alarmModalPrimaryAction}
            />
            {canSnooze ? (
              <PrimaryButton
                label={t('alarm.snooze')}
                onPress={() => {
                  silenceActiveAlarmAlert();
                  setSnoozeOptionsVisible(true);
                }}
                testID="active-alarm-alert-snooze-button"
                variant="secondary"
                style={styles.alarmModalPrimaryAction}
              />
            ) : null}
          </View>
          {showSnoozeOptions ? (
            <View
              style={styles.alarmSnoozeOptions}
              testID="active-alarm-snooze-options">
              {[1, 5, 10].map(minutes => (
                <PrimaryButton
                  key={minutes}
                  label={t('alarm.snoozeMinutes', {minutes})}
                  onPress={() => snoozeActiveAlarmAlert(minutes)}
                  testID={`active-alarm-snooze-${minutes}-button`}
                  variant="secondary"
                  style={styles.alarmSnoozeOptionButton}
                />
              ))}
            </View>
          ) : null}
        </View>
      </View>
    </Modal>
  );
}

function SharedPrimaryScreenAd() {
  const {screen} = useAppState();

  if (screen !== 'timer' && screen !== 'alarms') {
    return null;
  }

  return (
    <View style={styles.sharedAdFrame} testID="shared-primary-screen-ad">
      <AdMobBanner />
    </View>
  );
}

export default function App() {
  React.useEffect(() => {
    preloadMascotImages().catch(() => undefined);
  }, []);

  React.useEffect(() => {
    ensureAnonymousUser().catch(() => undefined);
  }, []);

  React.useEffect(() => {
    initializeMobileAds().catch(() => undefined);
  }, []);

  React.useEffect(() => {
    initializeInterstitialAdRemoteConfig().catch(() => undefined);
  }, []);

  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <SafeAreaView style={styles.container}>
          <MascotImageCache />
          <StatusBar barStyle="dark-content" />
          <View style={styles.screenHost}>
            <CurrentScreen />
          </View>
          <SharedPrimaryScreenAd />
          <ActiveAlarmAlertPopup />
        </SafeAreaView>
      </AppStateProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: arcadeTheme.colors.background,
  },
  screenHost: {
    flex: 1,
    minHeight: 0,
  },
  sharedAdFrame: {
    width: '100%',
  },
  alarmModalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(13, 20, 16, 0.68)',
    padding: 18,
  },
  alarmModalPanel: {
    width: '100%',
    maxWidth: 420,
    borderRadius: 8,
    backgroundColor: '#FFFFFF',
    borderWidth: 2,
    borderColor: '#1B1B1B',
    padding: 22,
    gap: 16,
  },
  alarmModalEyebrow: {
    color: '#A12A2A',
    fontSize: 14,
    fontWeight: '900',
    letterSpacing: 0,
    textAlign: 'center',
  },
  alarmModalTitle: {
    color: '#17201A',
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: 0,
    lineHeight: 40,
    textAlign: 'center',
  },
  alarmModalText: {
    color: '#4E5A52',
    fontSize: 30,
    fontVariant: ['tabular-nums'],
    fontWeight: '900',
    lineHeight: 36,
    marginBottom: 6,
    textAlign: 'center',
  },
  alarmModalActions: {
    flexDirection: 'row',
    gap: 10,
  },
  alarmModalPrimaryAction: {
    flex: 1,
    minHeight: 58,
  },
  alarmSnoozeOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  alarmSnoozeOptionButton: {
    flex: 1,
    minHeight: 48,
    paddingHorizontal: 6,
  },
});
