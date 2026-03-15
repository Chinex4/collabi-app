import React from 'react';
import { useQuery } from '@tanstack/react-query';

import { projectService } from '@/api/services/projectService';
import { LoadingState } from '@/components/common';
import { useSession } from '@/hooks/useSession';

import { ProjectListScreen } from './shared';

export const SavedProjectsScreen = ({ navigation }: any) => {
  const { currentUser } = useSession();
  const projectsQuery = useQuery({
    queryKey: ['saved-projects', currentUser?.id],
    queryFn: () => projectService.getSavedProjects(currentUser!.id),
    enabled: Boolean(currentUser?.id),
  });

  if (projectsQuery.isLoading) {
    return <LoadingState label="Loading saved projects..." />;
  }

  return (
    <ProjectListScreen
      title="Saved Projects"
      subtitle="Ideas you bookmarked for later review."
      projects={projectsQuery.data ?? []}
      navigation={navigation}
    />
  );
};
