import React from 'react';
import {SafeAreaView, StatusBar, StyleSheet, Text} from 'react-native';

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
