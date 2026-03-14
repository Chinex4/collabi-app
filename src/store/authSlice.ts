import { PayloadAction, createSlice } from '@reduxjs/toolkit';

import { Session, User } from '@/types';

type AuthState = {
  session: Session | null;
  currentUser: User | null;
  isBootstrapping: boolean;
};

const initialState: AuthState = {
  session: null,
  currentUser: null,
  isBootstrapping: true,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setSession(state, action: PayloadAction<Session | null>) {
      state.session = action.payload;
    },
    setCurrentUser(state, action: PayloadAction<User | null>) {
      state.currentUser = action.payload;
    },
    finishBootstrap(state) {
      state.isBootstrapping = false;
    },
    startBootstrap(state) {
      state.isBootstrapping = true;
    },
    clearAuth(state) {
      state.session = null;
      state.currentUser = null;
    },
  },
});

export const { setSession, setCurrentUser, finishBootstrap, startBootstrap, clearAuth } =
  authSlice.actions;
export const authReducer = authSlice.reducer;
