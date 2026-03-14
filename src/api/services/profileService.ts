import { db } from '@/data/mockDb';
import { ProfileFilterInput } from '@/types';

import { clone, requireStudent, simulate } from './base';

export const profileService = {
  async getProfile(userId: string) {
    return simulate(() => {
      const user = requireStudent(userId);
      const profile = db.profiles.find((item) => item.userId === userId);
      return {
        user,
        profile,
      };
    });
  },
  async getProfiles(filters: ProfileFilterInput = {}) {
    return simulate(() => {
      const students = db.users.filter(
        (item) => item.role === 'student' && item.status === 'active'
      );
      const result = students.filter((user) => {
        const profile = db.profiles.find((item) => item.userId === user.id);
        const matchesSearch =
          !filters.search ||
          user.fullName.toLowerCase().includes(filters.search.toLowerCase()) ||
          profile?.bio.toLowerCase().includes(filters.search.toLowerCase());
        const matchesSkills =
          !filters.skillIds?.length ||
          filters.skillIds.every((skillId) => profile?.skills.includes(skillId));
        const matchesInterests =
          !filters.interestIds?.length ||
          filters.interestIds.every((interestId) => profile?.interests.includes(interestId));
        const matchesDepartment =
          !filters.departmentId || user.departmentId === filters.departmentId;
        const matchesAvailability =
          !filters.availability || profile?.availability === filters.availability;

        return (
          matchesSearch &&
          matchesSkills &&
          matchesInterests &&
          matchesDepartment &&
          matchesAvailability
        );
      });

      return result.map((user) => ({
        user,
        profile: clone(db.profiles.find((item) => item.userId === user.id)),
      }));
    });
  },
  async updateProfile(
    userId: string,
    updates: {
      bio: string;
      skills: string[];
      interests: string[];
      availability: string;
      preferredRoles: string[];
      portfolioLinks: string[];
      visibility: string;
      photoUrl?: string;
    }
  ) {
    return simulate(() => {
      const profile = db.profiles.find((item) => item.userId === userId);
      if (!profile) {
        throw new Error('Profile not found');
      }

      Object.assign(profile, updates);
      return { user: requireStudent(userId), profile };
    }, 800);
  },
};
