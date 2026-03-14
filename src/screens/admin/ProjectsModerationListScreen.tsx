import React, { useState } from 'react';
import { View } from 'react-native';

import {
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  Badge,
  LoadingState,
  SearchBar,
} from '@/components/common';
import { useAdminProjects } from '@/hooks/useQueries';

export const ProjectsModerationListScreen = ({ navigation }: any) => {
  const [search, setSearch] = useState('');
  const projects = useAdminProjects(search);

  return (
    <AppScreen>
      <AppHeader
        title="Projects"
        subtitle="Review all project briefs, statuses, and moderation actions."
      />
      <SearchBar value={search} onChangeText={setSearch} placeholder="Search projects" />
      {projects.isLoading ? <LoadingState label="Loading projects..." /> : null}
      {projects.data?.map((project) => (
        <View key={project.id} className="mt-4 rounded-3xl bg-white p-4">
          <AppText className="text-base font-semibold text-slate-900">{project.title}</AppText>
          <AppText className="mt-1 text-sm text-slate-500">{project.description}</AppText>
          <View className="mt-3 flex-row items-center justify-between">
            <Badge
              label={project.status}
              tone={project.status === 'completed' ? 'success' : 'warning'}
            />
            <AppButton
              label="Open"
              onPress={() =>
                navigation.navigate('ProjectModerationDetail', { projectId: project.id })
              }
              variant="secondary"
            />
          </View>
        </View>
      ))}
    </AppScreen>
  );
};
