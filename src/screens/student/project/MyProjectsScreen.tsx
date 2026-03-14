import React from 'react';

import { db } from '@/data/mockDb';
import { useSession } from '@/hooks/useSession';

import { ProjectListScreen } from './shared';

export const MyProjectsScreen = ({ navigation }: any) => {
  const { currentUser } = useSession();
  const projects = db.projects.filter(
    (project) =>
      project.ownerId === currentUser?.id || project.teamMemberIds.includes(currentUser?.id ?? '')
  );

  return (
    <ProjectListScreen
      title="My Projects"
      subtitle="Projects you own or currently contribute to."
      projects={projects}
      navigation={navigation}
    />
  );
};
