import React from 'react';
import {StatusBar, StyleSheet, Text} from 'react-native';
import {SafeAreaView} from 'react-native-safe-area-context';

export default function App() {
  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      <Text style={styles.title}>Timewatch</Text>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F7F4EE',
  },
  title: {
    color: '#17201A',
    fontSize: 32,
    fontWeight: '700',
  },
});
