import { db } from '@/data/mockDb';
import { AuthResponse, Session, User } from '@/types';
import { generateId } from '@/utils/helpers';

import { getCurrentRoleLabel, requireUser, simulate } from './base';

const OTP_CODE = '123456';

const buildSession = (user: User): AuthResponse => ({
  session: {
    accessToken: `access_${user.id}_${Date.now()}`,
    refreshToken: `refresh_${user.id}_${Date.now()}`,
    role: user.role,
    userId: user.id,
  },
  user,
});

export const authService = {
  async studentLogin(email: string, password: string) {
    return simulate(() => {
      const user = db.users.find(
        (item) => item.email.toLowerCase() === email.toLowerCase() && item.role === 'student'
      );
      if (!user || user.password !== password) {
        throw new Error('Invalid student credentials');
      }
      if (!user.isVerified) {
        throw new Error('Email not verified yet. Use OTP 123456 for the mock flow.');
      }
      if (user.status === 'suspended') {
        throw new Error('This account is suspended');
      }

      return buildSession(user);
    });
  },
  async adminLogin(email: string, password: string) {
    return simulate(() => {
      const user = db.users.find(
        (item) => item.email.toLowerCase() === email.toLowerCase() && item.role === 'admin'
      );
      if (!user || user.password !== password) {
        throw new Error('Invalid admin credentials');
      }

      return buildSession(user);
    });
  },
  async registerStudent(payload: {
    fullName: string;
    email: string;
    password: string;
    facultyId: string;
    departmentId: string;
    level: string;
  }) {
    return simulate(() => {
      const existing = db.users.find(
        (item) => item.email.toLowerCase() === payload.email.toLowerCase()
      );
      if (existing) {
        throw new Error('An account with this email already exists');
      }

      const id = generateId('student');
      const user: User = {
        id,
        role: 'student',
        fullName: payload.fullName,
        email: payload.email,
        facultyId: payload.facultyId,
        departmentId: payload.departmentId,
        level: payload.level,
        avatar: `https://api.dicebear.com/9.x/adventurer/png?seed=${encodeURIComponent(payload.fullName)}`,
        isVerified: false,
        status: 'active',
        password: payload.password,
        createdAt: new Date().toISOString(),
      };

      db.users.unshift(user);
      db.profiles.unshift({
        userId: id,
        bio: 'Tell teammates about your strengths and final year interests.',
        skills: [],
        interests: [],
        availability: 'part_time',
        preferredRoles: [],
        portfolioLinks: [],
        visibility: 'public',
        photoUrl: user.avatar,
        completedProjectsCount: 0,
        activeProjectsCount: 0,
      });

      return {
        email: user.email,
        message: 'Account created. Use OTP 123456 to verify email.',
      };
    }, 900);
  },
  async verifyEmailOtp(email: string, otp: string) {
    return simulate(() => {
      const user = db.users.find(
        (item) => item.email.toLowerCase() === email.toLowerCase() && item.role === 'student'
      );
      if (!user) {
        throw new Error('Student account not found');
      }
      if (otp !== OTP_CODE) {
        throw new Error('Invalid OTP. Use 123456 for this mock build.');
      }

      user.isVerified = true;
      return buildSession(user);
    });
  },
  async resendVerificationOtp(email: string) {
    return simulate(() => {
      const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        throw new Error('Account not found');
      }

      return { message: `New verification code sent to ${email}. Use ${OTP_CODE}.` };
    }, 600);
  },
  async forgotPassword(email: string) {
    return simulate(() => {
      const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        throw new Error('Account not found');
      }

      return { email: user.email, message: `Password reset OTP sent. Use ${OTP_CODE}.` };
    }, 700);
  },
  async resetPassword(email: string, otp: string, password: string) {
    return simulate(() => {
      const user = db.users.find((item) => item.email.toLowerCase() === email.toLowerCase());
      if (!user) {
        throw new Error('Account not found');
      }
      if (otp !== OTP_CODE) {
        throw new Error('Invalid OTP. Use 123456.');
      }

      user.password = password;
      return { message: 'Password updated successfully' };
    });
  },
  async changePassword(userId: string, currentPassword: string, newPassword: string) {
    return simulate(() => {
      const user = requireUser(userId);
      if (user.password !== currentPassword) {
        throw new Error('Current password is incorrect');
      }

      user.password = newPassword;
      return { message: 'Password changed successfully' };
    });
  },
  async deactivateAccount(userId: string) {
    return simulate(() => {
      const user = requireUser(userId);
      user.status = 'suspended';
      return { message: `${getCurrentRoleLabel(user.role)} account deactivated` };
    });
  },
  async softDeleteAccount(userId: string) {
    return simulate(() => {
      const user = requireUser(userId);
      user.status = 'deleted';
      return { message: 'Account removed from active listings' };
    });
  },
  async refreshSession(session: Session) {
    return simulate(() => {
      const user = requireUser(session.userId);
      return buildSession(user);
    }, 400);
  },
  async getCurrentUser(userId: string) {
    return simulate(() => requireUser(userId), 400);
  },
  async logout() {
    return simulate(() => ({ success: true }), 250);
  },
};
