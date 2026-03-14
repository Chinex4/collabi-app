import { PayloadAction, createSlice } from '@reduxjs/toolkit';

type RealtimeState = {
  isConnected: boolean;
  activeConversationId?: string;
};

const initialState: RealtimeState = {
  isConnected: true,
};

const realtimeSlice = createSlice({
  name: 'realtime',
  initialState,
  reducers: {
    setRealtimeConnected(state, action: PayloadAction<boolean>) {
      state.isConnected = action.payload;
    },
    setActiveConversation(state, action: PayloadAction<string | undefined>) {
      state.activeConversationId = action.payload;
    },
  },
});

export const { setRealtimeConnected, setActiveConversation } = realtimeSlice.actions;
export const realtimeReducer = realtimeSlice.reducer;
