import { PayloadAction, createSlice } from '@reduxjs/toolkit';

type NotificationState = {
  unreadCount: number;
};

const initialState: NotificationState = {
  unreadCount: 0,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    setUnreadCount(state, action: PayloadAction<number>) {
      state.unreadCount = action.payload;
    },
  },
});

export const { setUnreadCount } = notificationsSlice.actions;
export const notificationsReducer = notificationsSlice.reducer;
