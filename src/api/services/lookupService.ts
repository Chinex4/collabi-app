import { cache } from '@/data/cache';

import { throwIfSupabaseError } from '../errors';
import { mapCategory, mapDepartment, mapInterest, mapLookup, mapSkill } from '../mappers';
import { supabase } from '../supabase';

export const lookupService = {
  async getLookupBundle() {
    const [faculties, departments, skills, interests, categories] = await Promise.all([
      supabase.from('faculties').select('*').order('name'),
      supabase.from('departments').select('*').order('name'),
      supabase.from('skills').select('*').order('name'),
      supabase.from('interests').select('*').order('name'),
      supabase.from('categories').select('*').order('name'),
    ]);

    [faculties.error, departments.error, skills.error, interests.error, categories.error].forEach(
      throwIfSupabaseError
    );

    const bundle = {
      faculties: (faculties.data ?? []).map(mapLookup),
      departments: (departments.data ?? []).map(mapDepartment),
      skills: (skills.data ?? []).map(mapSkill),
      interests: (interests.data ?? []).map(mapInterest),
      categories: (categories.data ?? []).map(mapCategory),
    };

    cache.replaceLookups(bundle);
    return bundle;
  },
};
