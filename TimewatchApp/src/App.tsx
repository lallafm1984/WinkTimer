import React from 'react';
import {StatusBar, StyleSheet} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {AppStateProvider, useAppState} from './state/AppState';
import {HistoryScreen} from './screens/HistoryScreen';
import {OnboardingScreen} from './screens/OnboardingScreen';
import {SessionSummaryScreen} from './screens/SessionSummaryScreen';
import {SettingsScreen} from './screens/SettingsScreen';
import {TimerScreen} from './screens/TimerScreen';
import {preloadMascotImages} from './components/mascotImages';
import {arcadeTheme} from './theme/arcadeTheme';

function CurrentScreen() {
  const {screen} = useAppState();

  switch (screen) {
    case 'timer':
      return <TimerScreen />;
    case 'summary':
      return <SessionSummaryScreen />;
    case 'history':
      return <HistoryScreen />;
    case 'settings':
      return <SettingsScreen />;
    case 'onboarding':
    default:
      return <OnboardingScreen />;
  }
}

export default function App() {
  React.useEffect(() => {
    preloadMascotImages().catch(() => undefined);
  }, []);

  return (
    <SafeAreaProvider>
      <AppStateProvider>
        <SafeAreaView style={styles.container}>
          <StatusBar barStyle="dark-content" />
          <CurrentScreen />
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
});
