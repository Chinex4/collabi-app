import React from 'react';
import { View } from 'react-native';

import { authService } from '@/api/services/authService';
import {
  AppButton,
  AppHeader,
  AppScreen,
  AppText,
  ConfirmModal,
  SectionHeader,
} from '@/components/common';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch } from '@/hooks/useAppStore';
import { showToast } from '@/store/uiSlice';

export const AccountSettingsScreen = ({ navigation }: any) => {
  const dispatch = useAppDispatch();
  const { currentUser, signOut } = useSession();
  const [showDeactivate, setShowDeactivate] = React.useState(false);
  const [showDelete, setShowDelete] = React.useState(false);

  return (
    <AppScreen>
      <AppHeader
        title="Account Settings"
        subtitle="Manage security, session, and profile visibility controls."
      />
      <View className="rounded-[32px] bg-white p-5">
        <SectionHeader title="Account" />
        <AppText className="text-sm text-slate-500">{currentUser?.email}</AppText>
        <AppText className="mt-1 text-sm text-slate-500">Role: {currentUser?.role}</AppText>
        <View className="mt-5 flex-row flex-wrap gap-3">
          <AppButton
            label="Change Password"
            onPress={() => navigation.navigate('ChangePassword')}
          />
          <AppButton
            label="Edit Profile"
            onPress={() => navigation.navigate('EditProfile')}
            variant="secondary"
          />
        </View>
      </View>
      <View className="mt-4 rounded-[32px] bg-white p-5">
        <SectionHeader title="Session" />
        <AppButton
          label="Logout"
          onPress={async () => {
            await signOut();
            dispatch(showToast({ type: 'success', message: 'Logged out' }));
          }}
          variant="secondary"
        />
      </View>
      <View className="mt-4 rounded-[32px] bg-white p-5">
        <SectionHeader title="Danger Zone" />
        <AppButton
          label="Deactivate Account"
          onPress={() => setShowDeactivate(true)}
          variant="danger"
          className="mb-3"
        />
        <AppButton
          label="Soft Delete Account"
          onPress={() => setShowDelete(true)}
          variant="danger"
        />
      </View>
      <ConfirmModal
        visible={showDeactivate}
        title="Deactivate account?"
        message="This deactivates your account and signs you out."
        confirmLabel="Deactivate"
        onClose={() => setShowDeactivate(false)}
        onConfirm={async () => {
          if (!currentUser) return;
          await authService.deactivateAccount(currentUser.id);
          setShowDeactivate(false);
          await signOut();
        }}
      />
      <ConfirmModal
        visible={showDelete}
        title="Soft delete account?"
        message="This marks the account as deleted in the mock dataset and ends the session."
        confirmLabel="Delete"
        onClose={() => setShowDelete(false)}
        onConfirm={async () => {
          if (!currentUser) return;
          await authService.softDeleteAccount(currentUser.id);
          setShowDelete(false);
          await signOut();
        }}
      />
    </AppScreen>
  );
};
