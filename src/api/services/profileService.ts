import { cache } from '@/data/cache';
import { db } from '@/data/mockDb';
import { ProfileFilterInput } from '@/types';

import { apiRequest } from '../http';
import { mapProfile, mapUser } from '../mappers';

const buildPortfolioLinks = (links: string[]) => ({
  github: links[0] || undefined,
  linkedin: links[1] || undefined,
  portfolio: links[2] || undefined,
});

export const profileService = {
  async getProfile(profileId: string) {
    const endpoint = profileId === 'me' ? '/profiles/me' : `/profiles/${profileId}`;
    const response = await apiRequest<any>(endpoint, {
      auth: profileId === 'me',
    });

    const raw = response.data;
    const user = raw.user ? mapUser(raw.user) : null;
    const profile = raw._id ? mapProfile(raw) : mapProfile(raw.profile ?? raw);

    if (user) {
      cache.syncUsers([user]);
    }
    cache.syncProfiles([profile]);

    return { user: user ?? cacheFallbackUser(profile.userId), profile };
  },
  async getProfiles(filters: ProfileFilterInput = {}) {
    const response = await apiRequest<any[]>('/profiles', {
      query: {
        search: filters.search,
        department: filters.departmentId,
        skill: filters.skillIds?.[0],
        interest: filters.interestIds?.[0],
        availability: filters.availability,
      },
    });

    const profiles = response.data.map((item) => {
      const user = mapUser(item.user);
      const profile = mapProfile(item);
      cache.syncUsers([user]);
      cache.syncProfiles([profile]);
      return { user, profile };
    });

    return profiles;
  },
  async updateProfile(
    _userId: string,
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
    const response = await apiRequest<any>('/profiles/me', {
      method: 'PATCH',
      auth: true,
      json: {
        bio: updates.bio,
        skills: updates.skills.map((skill) => ({ skill, level: 'intermediate' })),
        interests: updates.interests,
        availability: updates.availability,
        preferredRoles: updates.preferredRoles,
        portfolioLinks: buildPortfolioLinks(updates.portfolioLinks),
        visibility: updates.visibility,
      },
    });

    const profile = mapProfile(response.data);
    const user = response.data.user ? mapUser(response.data.user) : cacheFallbackUser(profile.userId);
    if (user) {
      const avatar = updates.photoUrl ?? user.avatar;
      cache.syncUsers([{ ...user, avatar }]);
    }
    cache.syncProfiles([{ ...profile, photoUrl: updates.photoUrl ?? profile.photoUrl }]);

    return { user, profile };
  },
};

const cacheFallbackUser = (userId: string) => db.users.find((item) => item.id === userId) ?? null;
