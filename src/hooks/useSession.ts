import { useQueryClient } from '@tanstack/react-query';

import { authService } from '@/api/services/authService';
import { QUERY_KEYS } from '@/constants';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppStore';
import { clearAuth, setCurrentUser, setSession } from '@/store/authSlice';
import { sessionStorage } from '@/utils/storage';

export const useSession = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const auth = useAppSelector((state) => state.auth);

  const completeAuth = async (payload: {
    session: typeof auth.session;
    user: typeof auth.currentUser;
  }) => {
    dispatch(setSession(payload.session));
    dispatch(setCurrentUser(payload.user));
    await sessionStorage.setSession(payload.session);
    queryClient.setQueryData(QUERY_KEYS.currentUser, payload.user);
  };

  const signOut = async () => {
    await authService.logout();
    dispatch(clearAuth());
    await sessionStorage.setSession(null);
    queryClient.clear();
  };

  return {
    ...auth,
    completeAuth,
    signOut,
  };
};
