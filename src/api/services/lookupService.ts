import { cache } from '@/data/cache';

import { apiRequest } from '../http';
import { mapCategory, mapDepartment, mapInterest, mapLookup, mapSkill } from '../mappers';

export const lookupService = {
  async getLookupBundle() {
    const [faculties, departments, skills, interests, categories] = await Promise.all([
      apiRequest<any[]>('/faculties'),
      apiRequest<any[]>('/departments'),
      apiRequest<any[]>('/skills'),
      apiRequest<any[]>('/interests'),
      apiRequest<any[]>('/categories'),
    ]);

    const bundle = {
      faculties: faculties.data.map(mapLookup),
      departments: departments.data.map(mapDepartment),
      skills: skills.data.map(mapSkill),
      interests: interests.data.map(mapInterest),
      categories: categories.data.map(mapCategory),
    };

    cache.replaceLookups(bundle);
    return bundle;
  },
};
