import { cache } from '@/data/cache';
import { ProfileFilterInput, StudentProfile, User } from '@/types';

import { requireData, throwIfSupabaseError } from '../errors';
import { mapProfile, mapUser } from '../mappers';
import { supabase } from '../supabase';

const supabaseAny = supabase as any;

const profileSelect = `
  *,
  user:users(*),
  skills:student_profile_skills(skill:skills(*)),
  interests:student_profile_interests(interest:interests(*))
`;

const syncProfileRow = (row: any) => {
  const profile = mapProfile(row);
  const user = row.user ? mapUser(row.user) : null;

  cache.syncProfiles([profile]);
  if (user) {
    cache.syncUsers([user]);
  }

  return { user, profile };
};

export const profileService = {
  async getProfile(profileId: string) {
    const userId = profileId === 'me' ? (await supabase.auth.getUser()).data.user?.id : profileId;

    if (!userId) {
      throw new Error('Current user not found');
    }

    const { data, error } = await supabase
      .from('student_profiles')
      .select(profileSelect)
      .eq('user_id', userId)
      .single();

    throwIfSupabaseError(error);

    const result = syncProfileRow(requireData(data));
    return { user: result.user, profile: result.profile };
  },
  async getProfiles(filters: ProfileFilterInput = {}) {
    let query = supabase
      .from('student_profiles')
      .select(profileSelect)
      .order('updated_at', { ascending: false })
      .limit(50);

    if (filters.search) {
      query = query.textSearch('bio', filters.search, { type: 'websearch' });
    }
    if (filters.availability) {
      query = query.eq('availability', filters.availability);
    }

    const { data, error } = await query;
    throwIfSupabaseError(error);

    return (data ?? [])
      .map(syncProfileRow)
      .filter((item): item is { user: User; profile: StudentProfile } => {
        if (!item.user) {
          return false;
        }
        if (filters.departmentId && item.user?.departmentId !== filters.departmentId) {
          return false;
        }
        if (
          filters.skillIds?.length &&
          !filters.skillIds.some((skillId) => item.profile.skills.includes(skillId))
        ) {
          return false;
        }
        if (
          filters.interestIds?.length &&
          !filters.interestIds.some((interestId) => item.profile.interests.includes(interestId))
        ) {
          return false;
        }
        return true;
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
    const { error } = await supabaseAny.rpc('update_student_profile', {
      p_bio: updates.bio,
      p_availability: updates.availability as any,
      p_preferred_roles: updates.preferredRoles,
      p_portfolio_links: updates.portfolioLinks,
      p_visibility: updates.visibility as any,
      p_skill_ids: updates.skills,
      p_interest_ids: updates.interests,
      p_photo_url: updates.photoUrl ?? null,
    });

    throwIfSupabaseError(error);

    return this.getProfile(userId);
  },
};
