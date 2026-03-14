import AsyncStorage from '@react-native-async-storage/async-storage';

import { STORAGE_KEYS } from '@/constants';
import { Session } from '@/types';

export const sessionStorage = {
  async getSession() {
    const raw = await AsyncStorage.getItem(STORAGE_KEYS.session);
    return raw ? (JSON.parse(raw) as Session) : null;
  },
  async setSession(session: Session | null) {
    if (!session) {
      await AsyncStorage.removeItem(STORAGE_KEYS.session);
      return;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.session, JSON.stringify(session));
  },
};
