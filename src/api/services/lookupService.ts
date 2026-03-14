import { db } from '@/data/mockDb';

import { simulate } from './base';

export const lookupService = {
  async getLookupBundle() {
    return simulate(() => ({
      faculties: db.faculties,
      departments: db.departments,
      skills: db.skills,
      interests: db.interests,
      categories: db.categories,
    }));
  },
};
