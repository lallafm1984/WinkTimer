import React from 'react';
import {BackHandler, StatusBar, StyleSheet} from 'react-native';
import {SafeAreaProvider, SafeAreaView} from 'react-native-safe-area-context';
import {AppStateProvider, useAppState, type AppScreen} from './state/AppState';
import {HistoryScreen} from './screens/HistoryScreen';
import {SessionSummaryScreen} from './screens/SessionSummaryScreen';
import {SettingsScreen} from './screens/SettingsScreen';
import {TimerScreen} from './screens/TimerScreen';
import {preloadMascotImages} from './components/mascotImages';
import {arcadeTheme} from './theme/arcadeTheme';

type SetScreen = React.Dispatch<React.SetStateAction<AppScreen>>;

export function createHardwareBackPressHandler(
  screen: AppScreen,
  setScreen: SetScreen,
) {
  return () => {
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
    default:
      return <TimerScreen />;
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
