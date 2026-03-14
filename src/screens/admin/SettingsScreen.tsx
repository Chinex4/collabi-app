import { useMutation, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import { View } from 'react-native';

import { adminService } from '@/api/services/adminService';
import { SettingRow } from '@/components/admin';
import { AppButton, AppHeader, AppScreen, SectionHeader } from '@/components/common';
import { FormTextArea, FormTextInput, useAppForm } from '@/components/forms';
import { QUERY_KEYS } from '@/constants';
import { useAdminSettings } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';
import { settingSchema } from '@/utils/validation';

export const SettingsScreen = () => {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const { currentUser } = useSession();
  const settings = useAdminSettings();
  const [editingId, setEditingId] = useState<string | undefined>();
  const currentSetting = settings.data?.find((item) => item.id === editingId);

  const form = useAppForm({
    defaultValues: {
      label: currentSetting?.label ?? '',
      value: currentSetting?.value ?? '',
      description: currentSetting?.description ?? '',
      category: currentSetting?.category ?? '',
    },
    schema: settingSchema,
  });

  const mutation = useMutation({
    mutationFn: (values: { label: string; value: string; description: string; category: string }) =>
      adminService.upsertSetting(currentUser!.id, { id: editingId, ...values }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings });
      dispatch(
        showToast({ type: 'success', message: editingId ? 'Setting updated' : 'Setting created' })
      );
      setEditingId(undefined);
      form.reset({ label: '', value: '', description: '', category: '' });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (settingId: string) => adminService.deleteSetting(settingId, currentUser!.id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.settings });
      dispatch(showToast({ type: 'success', message: 'Setting deleted' }));
    },
  });

  return (
    <AppScreen>
      <AppHeader
        title="Settings"
        subtitle="Edit operational values that will later map to real admin-managed lookup data."
      />
      <View className="rounded-[32px] bg-white p-5">
        <FormTextInput
          control={form.control}
          name="label"
          label="Label"
          placeholder="Max Team Size"
        />
        <FormTextInput control={form.control} name="value" label="Value" placeholder="6" />
        <FormTextArea
          control={form.control}
          name="description"
          label="Description"
          placeholder="What this setting controls"
        />
        <FormTextInput
          control={form.control}
          name="category"
          label="Category"
          placeholder="Projects"
        />
        <AppButton
          label={editingId ? 'Update Setting' : 'Create Setting'}
          onPress={form.handleSubmit((values) => mutation.mutate(values))}
          loading={mutation.isPending}
        />
      </View>
      <SectionHeader title="Current settings" />
      {settings.data?.map((setting) => (
        <View key={setting.id}>
          <SettingRow
            setting={setting}
            onPress={() => {
              setEditingId(setting.id);
              form.reset({
                label: setting.label,
                value: setting.value,
                description: setting.description,
                category: setting.category,
              });
            }}
          />
          <AppButton
            label="Delete Setting"
            onPress={() => deleteMutation.mutate(setting.id)}
            variant="danger"
            className="mb-4"
          />
        </View>
      ))}
    </AppScreen>
  );
};
