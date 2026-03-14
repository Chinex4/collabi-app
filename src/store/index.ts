import { configureStore } from '@reduxjs/toolkit';

import { authReducer } from './authSlice';
import { notificationsReducer } from './notificationsSlice';
import { realtimeReducer } from './realtimeSlice';
import { uiReducer } from './uiSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    ui: uiReducer,
    realtime: realtimeReducer,
    notifications: notificationsReducer,
  },
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: false,
    }),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
