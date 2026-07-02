import React, { Component, ErrorInfo, ReactNode, useEffect, useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { StatusBar } from 'expo-status-bar';

import './global.css';

import { AppProviders } from '@/AppProviders';
import { RootNavigator } from '@/navigation/RootNavigator';

class AppErrorBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('App startup failed', error, errorInfo.componentStack);
  }

  render() {
    if (this.state.error) {
      return (
        <View style={styles.errorScreen}>
          <Text style={styles.errorTitle}>App startup failed</Text>
          <Text style={styles.errorMessage}>{this.state.error.message}</Text>
        </View>
      );
    }

    return this.props.children;
  }
}

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
      <AppErrorBoundary>
        <AppProviders>
          <RootNavigator />
        </AppProviders>
      </AppErrorBoundary>
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
  errorScreen: {
    alignItems: 'center',
    backgroundColor: '#F6F4FB',
    flex: 1,
    justifyContent: 'center',
    padding: 24,
  },
  errorTitle: {
    color: '#1F1230',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    color: '#6B5B78',
    fontSize: 14,
    lineHeight: 20,
    textAlign: 'center',
  },
});
