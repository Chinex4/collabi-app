import { PayloadAction, createSlice } from '@reduxjs/toolkit';

import { ToastMessage } from '@/types';
import { generateId } from '@/utils/helpers';

type UiState = {
  themeMode: 'light' | 'dark';
  toast: ToastMessage | null;
};

const initialState: UiState = {
  themeMode: 'light',
  toast: null,
};

const uiSlice = createSlice({
  name: 'ui',
  initialState,
  reducers: {
    setThemeMode(state, action: PayloadAction<'light' | 'dark'>) {
      state.themeMode = action.payload;
    },
    showToast(state, action: PayloadAction<{ type: ToastMessage['type']; message: string }>) {
      state.toast = {
        id: generateId('toast'),
        ...action.payload,
      };
    },
    clearToast(state) {
      state.toast = null;
    },
  },
});

export const { setThemeMode, showToast, clearToast } = uiSlice.actions;
export const uiReducer = uiSlice.reducer;
