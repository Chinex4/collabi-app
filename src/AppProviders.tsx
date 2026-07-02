import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode, useEffect } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { StyleSheet, View } from 'react-native';

import { authService } from '@/api/services/authService';
import { chatService } from '@/api/services/chatService';
import { notificationService } from '@/api/services/notificationService';
import { AppText } from '@/components/common';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppStore';
import { store } from '@/store';
import {
  clearAuth,
  finishBootstrap,
  setCurrentUser,
  setSession,
  startBootstrap,
} from '@/store/authSlice';
import { clearToast } from '@/store/uiSlice';
import { sessionStorage } from '@/utils/storage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 20_000,
      retry: false,
      refetchOnWindowFocus: false,
    },
  },
});

const BOOTSTRAP_TIMEOUT_MS = 8000;

const withTimeout = async <T,>(promise: Promise<T>, label: string) =>
  Promise.race<T>([
    promise,
    new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`${label} timed out`)), BOOTSTRAP_TIMEOUT_MS);
    }),
  ]);

const Bootstrapper = ({ children }: { children: ReactNode }) => {
  const dispatch = useAppDispatch();
  const toast = useAppSelector((state) => state.ui.toast);

  useEffect(() => {
    const bootstrap = async () => {
      dispatch(startBootstrap());
      try {
        const session = await sessionStorage.getSession();
        if (!session) {
          chatService.disconnect();
          dispatch(clearAuth());
          dispatch(finishBootstrap());
          return;
        }

        const refreshed = await withTimeout(authService.refreshSession(session), 'Session restore');
        dispatch(setSession(refreshed.session));
        dispatch(setCurrentUser(refreshed.user));
        await sessionStorage.setSession(refreshed.session);
        chatService.connect(refreshed.session.accessToken, queryClient);
        notificationService.subscribe(refreshed.session.userId, queryClient);
      } catch {
        dispatch(clearAuth());
        await sessionStorage.setSession(null);
        chatService.disconnect();
        notificationService.unsubscribe();
      } finally {
        dispatch(finishBootstrap());
      }
    };

    void bootstrap();
  }, [dispatch]);

  useEffect(() => {
    return () => {
      chatService.disconnect();
      notificationService.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!toast) {
      return;
    }

    const timeout = setTimeout(() => {
      dispatch(clearToast());
    }, 2800);

    return () => clearTimeout(timeout);
  }, [dispatch, toast]);

  return (
    <View style={styles.providerRoot}>
      {children}
      {toast ? (
        <View className="absolute bottom-8 left-5 right-5 rounded-2xl bg-slate-950 px-4 py-3">
          <AppText className="text-center text-sm text-white">{toast.message}</AppText>
        </View>
      ) : null}
    </View>
  );
};

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider style={styles.providerRoot}>
        <Bootstrapper>{children}</Bootstrapper>
      </SafeAreaProvider>
    </QueryClientProvider>
  </Provider>
);

const styles = StyleSheet.create({
  providerRoot: {
    flex: 1,
  },
});
