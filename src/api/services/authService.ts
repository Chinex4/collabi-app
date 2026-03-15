import { cache } from '@/data/cache';
import { AuthResponse, Session } from '@/types';

import { apiRequest } from '../http';
import { mapUser } from '../mappers';

const buildAuthResponse = (data: any): AuthResponse => {
  const user = mapUser(data.user);
  cache.syncUsers([user]);

  return {
    session: {
      accessToken: data.accessToken,
      refreshToken: data.refreshToken,
      role: user.role,
      userId: user.id,
    },
    user,
  };
};

export const authService = {
  async studentLogin(email: string, password: string) {
    const response = await apiRequest<any>('/auth/login', {
      method: 'POST',
      json: { email, password },
    });

    return buildAuthResponse(response.data);
  },
  async adminLogin(email: string, password: string) {
    const response = await apiRequest<any>('/auth/admin/login', {
      method: 'POST',
      json: { email, password },
    });

    return buildAuthResponse(response.data);
  },
  async registerStudent(payload: {
    fullName: string;
    email: string;
    password: string;
    facultyId: string;
    departmentId: string;
    level: string;
  }) {
    const response = await apiRequest<any>('/auth/register', {
      method: 'POST',
      json: {
        fullName: payload.fullName,
        email: payload.email,
        password: payload.password,
        faculty: payload.facultyId,
        department: payload.departmentId,
        level: Number(payload.level) || payload.level,
      },
    });

    return {
      email: payload.email,
      message: response.message,
    };
  },
  async verifyEmailOtp(email: string, otp: string) {
    const response = await apiRequest<any>('/auth/verify-email', {
      method: 'POST',
      json: { email, otp },
    });

    const user = mapUser(response.data);
    cache.syncUsers([user]);

    return { user, message: response.message };
  },
  async resendVerificationOtp(email: string) {
    const response = await apiRequest('/auth/resend-verification-otp', {
      method: 'POST',
      json: { email },
    });

    return { message: response.message };
  },
  async forgotPassword(email: string) {
    const response = await apiRequest('/auth/forgot-password', {
      method: 'POST',
      json: { email },
    });

    return { email, message: response.message };
  },
  async resetPassword(email: string, otp: string, password: string) {
    const response = await apiRequest('/auth/reset-password', {
      method: 'POST',
      json: { email, otp, password },
    });

    return { message: response.message };
  },
  async changePassword(_userId: string, currentPassword: string, newPassword: string) {
    const response = await apiRequest('/auth/change-password', {
      method: 'POST',
      auth: true,
      json: { currentPassword, newPassword },
    });

    return { message: response.message };
  },
  async deactivateAccount(_userId: string) {
    const response = await apiRequest('/auth/deactivate', {
      method: 'PATCH',
      auth: true,
    });

    return { message: response.message };
  },
  async softDeleteAccount(_userId: string) {
    const response = await apiRequest('/auth/delete-account', {
      method: 'DELETE',
      auth: true,
    });

    return { message: response.message };
  },
  async refreshSession(session: Session) {
    const response = await apiRequest<any>('/auth/refresh', {
      method: 'POST',
      json: { refreshToken: session.refreshToken },
    });

    return buildAuthResponse(response.data);
  },
  async getCurrentUser(_userId: string) {
    const response = await apiRequest<any>('/auth/me', {
      auth: true,
    });
    const user = mapUser(response.data);
    cache.syncUsers([user]);
    return user;
  },
  async logout() {
    await apiRequest('/auth/logout', {
      method: 'POST',
      auth: true,
    });

    return { success: true };
  },
};
