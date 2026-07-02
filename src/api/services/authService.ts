import { cache } from '@/data/cache';
import { AuthResponse, Session } from '@/types';

import { ApiError, requireData, throwIfSupabaseError } from '../errors';
import { mapUser } from '../mappers';
import { supabase } from '../supabase';

const supabaseAny = supabase as any;

const getUserProfile = async (userId: string) => {
  const { data, error } = await supabase.from('users').select('*').eq('id', userId).single();

  throwIfSupabaseError(error);

  const user = mapUser(requireData(data, 'User profile not found'));
  cache.syncUsers([user]);

  return user;
};

const buildAuthResponse = async (
  accessToken: string | undefined,
  refreshToken: string | undefined,
  userId: string | undefined
): Promise<AuthResponse> => {
  if (!accessToken || !refreshToken || !userId) {
    throw new ApiError('Session not available', 401);
  }

  const user = await getUserProfile(userId);

  return {
    session: {
      accessToken,
      refreshToken,
      role: user.role,
      userId: user.id,
    },
    user,
  };
};

const login = async (email: string, password: string, role: 'student' | 'admin') => {
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  throwIfSupabaseError(error);

  const response = await buildAuthResponse(
    data.session?.access_token,
    data.session?.refresh_token,
    data.user?.id
  );

  if (response.user.role !== role) {
    await supabase.auth.signOut();
    throw new ApiError(`This account is not a ${role} account`, 403);
  }

  if (response.user.status !== 'active') {
    await supabase.auth.signOut();
    throw new ApiError('This account is not active', 403);
  }

  return response;
};

export const authService = {
  async studentLogin(email: string, password: string) {
    return login(email, password, 'student');
  },
  async adminLogin(email: string, password: string) {
    return login(email, password, 'admin');
  },
  async registerStudent(payload: {
    fullName: string;
    email: string;
    password: string;
    facultyId: string;
    departmentId: string;
    level: string;
  }) {
    const { error } = await supabase.auth.signUp({
      email: payload.email,
      password: payload.password,
      options: {
        data: {
          role: 'student',
          full_name: payload.fullName,
          faculty_id: payload.facultyId,
          department_id: payload.departmentId,
          level: payload.level,
        },
      },
    });

    throwIfSupabaseError(error);

    return {
      email: payload.email,
      message: 'Account created. Please sign in.',
    };
  },
  async forgotPassword(email: string) {
    const { error } = await supabase.auth.resetPasswordForEmail(email);
    throwIfSupabaseError(error);

    return { email, message: 'Password reset code sent' };
  },
  async resetPassword(email: string, otp: string, password: string) {
    const { error: verifyError } = await supabase.auth.verifyOtp({
      email,
      token: otp,
      type: 'recovery',
    });
    throwIfSupabaseError(verifyError);

    const { error: updateError } = await supabase.auth.updateUser({ password });
    throwIfSupabaseError(updateError);

    return { message: 'Password reset successfully' };
  },
  async changePassword(_userId: string, _currentPassword: string, newPassword: string) {
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    throwIfSupabaseError(error);

    return { message: 'Password updated successfully' };
  },
  async deactivateAccount(userId: string) {
    const { error } = await supabaseAny
      .from('users')
      .update({ status: 'suspended' })
      .eq('id', userId);
    throwIfSupabaseError(error);

    return { message: 'Account deactivated' };
  },
  async softDeleteAccount(userId: string) {
    const { error } = await supabaseAny
      .from('users')
      .update({ status: 'deleted' })
      .eq('id', userId);
    throwIfSupabaseError(error);

    await supabase.auth.signOut();

    return { message: 'Account deleted' };
  },
  async refreshSession(session: Session) {
    const { data, error } = await supabase.auth.setSession({
      access_token: session.accessToken,
      refresh_token: session.refreshToken,
    });

    throwIfSupabaseError(error);

    return buildAuthResponse(
      data.session?.access_token,
      data.session?.refresh_token,
      data.user?.id
    );
  },
  async getCurrentUser(userId: string) {
    return getUserProfile(userId);
  },
  async logout() {
    const { error } = await supabase.auth.signOut();
    throwIfSupabaseError(error);

    return { success: true };
  },
};
