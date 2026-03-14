import React from 'react';
import { View } from 'react-native';

import { AppText } from '@/components/common';
import { db } from '@/data/mockDb';

export const ProjectContextCard = ({ projectId }: { projectId: string }) => {
  const project = db.projects.find((item) => item.id === projectId);
  if (!project) return null;

  return (
    <View className="mb-4 rounded-3xl bg-white p-4">
      <AppText className="text-base font-semibold text-slate-900">{project.title}</AppText>
      <AppText className="mt-1 text-sm text-slate-500">{project.description}</AppText>
    </View>
  );
};
