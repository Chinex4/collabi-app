import React from 'react';

import { db } from '@/data/mockDb';
import { useSession } from '@/hooks/useSession';

import { ProjectListScreen } from './shared';

export const SavedProjectsScreen = ({ navigation }: any) => {
  const { currentUser } = useSession();
  const projects = db.projects.filter((project) =>
    project.bookmarkedBy.includes(currentUser?.id ?? '')
  );

  return (
    <ProjectListScreen
      title="Saved Projects"
      subtitle="Ideas you bookmarked for later review."
      projects={projects}
      navigation={navigation}
    />
  );
};
