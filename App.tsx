import 'react-native-gesture-handler';

import React, { useEffect, useState } from 'react';
import { Image, StyleSheet, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import './global.css';

import { AppProviders } from '@/AppProviders';
import { RootNavigator } from '@/navigation/RootNavigator';

export default function App() {
  const [showStartupSplash, setShowStartupSplash] = useState(true);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setShowStartupSplash(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, []);

  if (showStartupSplash) {
    return (
      <GestureHandlerRootView style={styles.appRoot}>
        <View style={styles.splashScreen}>
          <Image source={require('./assets/logo.png')} style={styles.logo} resizeMode="contain" />
        </View>
        <StatusBar style="light" />
      </GestureHandlerRootView>
    );
  }

  return (
    <GestureHandlerRootView style={styles.appRoot}>
      <AppProviders>
        <RootNavigator />
      </AppProviders>
      <StatusBar style="auto" />
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  appRoot: {
    flex: 1,
    backgroundColor: '#F6F4FB',
  },
  splashScreen: {
    alignItems: 'center',
    backgroundColor: '#7921BF',
    flex: 1,
    justifyContent: 'center',
  },
  logo: {
    height: 300,
    width: 300,
  },
});
