import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { View } from 'react-native';

import { projectService } from '@/api/services/projectService';
import { uploadService } from '@/api/services/uploadService';
import {
  AppButton,
  AppHeader,
  AppScreen,
  Chip,
  EmptyState,
  LoadingState,
} from '@/components/common';
import {
  FormDatePicker,
  FormMultiSelect,
  FormSelect,
  FormTagInput,
  FormTextArea,
  FormTextInput,
  useAppForm,
} from '@/components/forms';
import { ProjectCard } from '@/components/project';
import { QUERY_KEYS, VISIBILITY_OPTIONS } from '@/constants';
import { db } from '@/data/mockDb';
import { useLookups } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';
import { projectSchema } from '@/utils/validation';

export const buildProjectOptions = (lookups: ReturnType<typeof useLookups>['data']) => ({
  facultyOptions: lookups?.faculties.map((item) => ({ label: item.name, value: item.id })) ?? [],
  departmentOptions:
    lookups?.departments.map((item) => ({ label: item.name, value: item.id })) ?? [],
  categoryOptions: lookups?.categories.map((item) => ({ label: item.name, value: item.id })) ?? [],
  skillOptions: lookups?.skills.map((item) => ({ label: item.name, value: item.id })) ?? [],
});

type ProjectFormValues = {
  title: string;
  description: string;
  categoryId: string;
  departmentId: string;
  facultyId: string;
  requiredSkillIds: string[];
  optionalSkillIds: string[];
  teamSizeLimit: number;
  deadline: string;
  visibility: 'public' | 'private' | 'department_only';
  tags: string[];
};

export const ProjectFormScreen = ({
  navigation,
  projectId,
}: {
  navigation: any;
  projectId?: string;
}) => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const lookups = useLookups();
  const project = projectId ? db.projects.find((item) => item.id === projectId) : undefined;
  const [attachments, setAttachments] = useState(project?.attachments ?? []);
  const options = buildProjectOptions(lookups.data);

  const form = useAppForm<ProjectFormValues>({
    defaultValues: {
      title: project?.title ?? '',
      description: project?.description ?? '',
      categoryId: project?.categoryId ?? '',
      departmentId: project?.departmentId ?? currentUser?.departmentId ?? '',
      facultyId: project?.facultyId ?? currentUser?.facultyId ?? '',
      requiredSkillIds: project?.requiredSkillIds ?? [],
      optionalSkillIds: project?.optionalSkillIds ?? [],
      teamSizeLimit: project?.teamSizeLimit ?? 4,
      deadline: project?.deadline ?? '',
      visibility: project?.visibility ?? 'public',
      tags: project?.tags ?? [],
    },
    schema: projectSchema,
  });

  const mutation = useMutation({
    mutationFn: async (values: ProjectFormValues) => {
      const payload = {
        ...values,
        teamSizeLimit: Number(values.teamSizeLimit),
        status: project?.status ?? 'open',
        attachments,
      };
      if (projectId) {
        return projectService.updateProject(projectId, payload);
      }
      return projectService.createProject(currentUser!.id, payload);
    },
    onSuccess: (result: any) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.projects });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.memberships });
      dispatch(
        showToast({ type: 'success', message: projectId ? 'Project updated' : 'Project created' })
      );
      navigation.replace('ProjectDetail', { projectId: result.id ?? projectId });
    },
    onError: (error: Error) => dispatch(showToast({ type: 'error', message: error.message })),
  });

  const uploadMutation = useMutation({
    mutationFn: () => uploadService.pickDocument(currentUser!.id, 'project'),
    onSuccess: (file) => {
      if (!file) {
        return;
      }
      setAttachments((current) => [...current, file]);
      dispatch(showToast({ type: 'success', message: 'Attachment uploaded' }));
    },
  });

  if (lookups.isLoading) {
    return <LoadingState label="Loading project form..." />;
  }

  return (
    <AppScreen>
      <AppHeader
        title={projectId ? 'Edit Project' : 'Create Project'}
        subtitle="Build a clear brief so strong teammates know exactly where they fit."
      />
      <View className="rounded-[32px] bg-white p-5">
        <FormTextInput
          control={form.control}
          name="title"
          label="Project Title"
          placeholder="Campus Shuttle Tracker"
        />
        <FormTextArea
          control={form.control}
          name="description"
          label="Description"
          placeholder="Describe the scope, problem, and expected deliverables."
        />
        <FormSelect
          control={form.control}
          name="categoryId"
          label="Category"
          options={options.categoryOptions}
        />
        <FormSelect
          control={form.control}
          name="facultyId"
          label="Faculty"
          options={options.facultyOptions}
        />
        <FormSelect
          control={form.control}
          name="departmentId"
          label="Department"
          options={options.departmentOptions}
        />
        <FormMultiSelect
          control={form.control}
          name="requiredSkillIds"
          label="Required Skills"
          options={options.skillOptions}
        />
        <FormMultiSelect
          control={form.control}
          name="optionalSkillIds"
          label="Optional Skills"
          options={options.skillOptions}
        />
        <FormTextInput
          control={form.control}
          name="teamSizeLimit"
          label="Team Size Limit"
          placeholder="4"
          keyboardType="numeric"
        />
        <FormDatePicker control={form.control} name="deadline" label="Deadline" />
        <FormSelect
          control={form.control}
          name="visibility"
          label="Visibility"
          options={VISIBILITY_OPTIONS}
        />
        <FormTagInput control={form.control} name="tags" label="Tags" />
        <AppButton
          label="Attach File"
          onPress={() => uploadMutation.mutate()}
          variant="secondary"
          className="mb-4"
        />
        {attachments.length ? (
          <View className="mb-4 flex-row flex-wrap">
            {attachments.map((file) => (
              <Chip key={file.id} label={file.name} />
            ))}
          </View>
        ) : null}
        <AppButton
          label={projectId ? 'Save Changes' : 'Create Project'}
          onPress={form.handleSubmit((values) => mutation.mutate(values))}
          loading={mutation.isPending}
        />
      </View>
    </AppScreen>
  );
};

export const ProjectListScreen = ({
  title,
  subtitle,
  projects,
  navigation,
}: {
  title: string;
  subtitle: string;
  projects: any[];
  navigation: any;
}) => (
  <AppScreen>
    <AppHeader title={title} subtitle={subtitle} />
    {projects.length ? (
      projects.map((project) => (
        <ProjectCard
          key={project.id}
          project={project}
          onPress={() => navigation.navigate('ProjectDetail', { projectId: project.id })}
        />
      ))
    ) : (
      <EmptyState
        title="Nothing here yet"
        message="Projects will appear here when the matching action happens."
      />
    )}
  </AppScreen>
);
