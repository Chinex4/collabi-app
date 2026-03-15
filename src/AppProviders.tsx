import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import React, { ReactNode, useEffect } from 'react';
import { Provider } from 'react-redux';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { View } from 'react-native';

import { authService } from '@/api/services/authService';
import { chatService } from '@/api/services/chatService';
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

        const refreshed = await authService.refreshSession(session);
        dispatch(setSession(refreshed.session));
        dispatch(setCurrentUser(refreshed.user));
        await sessionStorage.setSession(refreshed.session);
        chatService.connect(refreshed.session.accessToken, queryClient);
      } catch {
        dispatch(clearAuth());
        await sessionStorage.setSession(null);
        chatService.disconnect();
      } finally {
        dispatch(finishBootstrap());
      }
    };

    void bootstrap();
  }, [dispatch]);

  useEffect(() => {
    return () => {
      chatService.disconnect();
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
    <>
      {children}
      {toast ? (
        <View className="absolute bottom-8 left-5 right-5 rounded-2xl bg-slate-950 px-4 py-3">
          <AppText className="text-center text-sm text-white">{toast.message}</AppText>
        </View>
      ) : null}
    </>
  );
};

export const AppProviders = ({ children }: { children: ReactNode }) => (
  <Provider store={store}>
    <QueryClientProvider client={queryClient}>
      <SafeAreaProvider>
        <Bootstrapper>{children}</Bootstrapper>
      </SafeAreaProvider>
    </QueryClientProvider>
  </Provider>
);
