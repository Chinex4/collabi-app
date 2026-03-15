import { Ionicons } from '@expo/vector-icons';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React, { useEffect } from 'react';
import { View } from 'react-native';

import { AppButton, AppHeader, AppScreen, AppText, LoadingState } from '@/components/common';
import { useNotifications } from '@/hooks/useQueries';
import { useSession } from '@/hooks/useSession';
import { useAppDispatch, useAppSelector } from '@/hooks/useAppStore';
import {
  AdminDashboardScreen,
  AnalyticsScreen,
  AnnouncementsScreen,
  AuditLogsScreen,
  ProjectModerationDetailScreen,
  ProjectsModerationListScreen,
  ReportDetailScreen,
  ReportsListScreen,
  SettingsScreen,
  UserDetailScreen,
  UsersListScreen,
} from '@/screens/admin';
import {
  AdminLoginScreen,
  ForgotPasswordScreen,
  RegisterScreen,
  ResetPasswordScreen,
  StudentLoginScreen,
  VerifyEmailOtpScreen,
  WelcomeScreen,
} from '@/screens/auth';
import {
  AccountSettingsScreen,
  ApplicationsScreen,
  ChangePasswordScreen,
  ChatInboxScreen,
  CreateProjectScreen,
  EditProfileScreen,
  EditProjectScreen,
  HomeScreen,
  InvitationsScreen,
  InviteStudentScreen,
  MyProfileScreen,
  MyProjectsScreen,
  MyReportsScreen,
  MyTasksScreen,
  NotificationsScreen,
  PrivateChatScreen,
  ProjectChatScreen,
  ProjectDetailScreen,
  ProjectTaskBoardScreen,
  PublicProfileScreen,
  ReportTargetScreen,
  SavedProjectsScreen,
  SearchProfilesScreen,
  TaskDetailScreen,
  TaskFormScreen,
  TeamMembersScreen,
} from '@/screens/student';
import { setUnreadCount } from '@/store/notificationsSlice';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

const navTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#F6F4FB',
    primary: '#7921BF',
    card: '#FFFFFF',
    text: '#1F1230',
    border: '#E5D8F4',
  },
};

const GuestNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="Welcome" component={WelcomeScreen} />
    <Stack.Screen name="StudentLogin" component={StudentLoginScreen} />
    <Stack.Screen name="AdminLogin" component={AdminLoginScreen} />
    <Stack.Screen name="Register" component={RegisterScreen} />
    <Stack.Screen name="VerifyEmailOtp" component={VerifyEmailOtpScreen} />
    <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
    <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
  </Stack.Navigator>
);

const StudentTabs = () => {
  const { currentUser } = useSession();
  const dispatch = useAppDispatch();
  const notifications = useNotifications(currentUser?.id);

  useEffect(() => {
    if (notifications.data) {
      dispatch(setUnreadCount(notifications.data.filter((item) => !item.isRead).length));
    }
  }, [dispatch, notifications.data]);

  const unreadCount = useAppSelector((state) => state.notifications.unreadCount);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarActiveTintColor: '#7921BF',
        tabBarInactiveTintColor: '#7C6C90',
        tabBarStyle: {
          height: 78,
          paddingTop: 8,
          paddingBottom: 14,
          borderTopWidth: 0,
          backgroundColor: '#FFFFFF',
        },
        tabBarIcon: ({ color, size }) => {
          const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
            HomeTab: 'home',
            ProfilesTab: 'people',
            ProjectsTab: 'folder-open',
            TasksTab: 'checkbox',
            ChatTab: 'chatbubbles',
            NotificationsTab: 'notifications',
            ProfileTab: 'person-circle',
          };
          return (
            <View>
              <Ionicons name={icons[route.name]} size={size} color={color} />
              {route.name === 'NotificationsTab' && unreadCount > 0 ? (
                <View className="absolute -right-2 -top-1 min-w-[18px] rounded-full bg-rose-500 px-1">
                  <AppText className="text-center text-[10px] font-semibold text-white">
                    {unreadCount}
                  </AppText>
                </View>
              ) : null}
            </View>
          );
        },
      })}>
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: 'Home' }} />
      <Tab.Screen
        name="ProfilesTab"
        component={SearchProfilesScreen}
        options={{ title: 'Profiles' }}
      />
      <Tab.Screen name="ProjectsTab" component={MyProjectsScreen} options={{ title: 'Projects' }} />
      <Tab.Screen name="TasksTab" component={MyTasksScreen} options={{ title: 'Tasks' }} />
      <Tab.Screen name="ChatTab" component={ChatInboxScreen} options={{ title: 'Chat' }} />
      <Tab.Screen
        name="NotificationsTab"
        component={NotificationsScreen}
        options={{ title: 'Alerts' }}
      />
      <Tab.Screen name="ProfileTab" component={MyProfileScreen} options={{ title: 'Profile' }} />
    </Tab.Navigator>
  );
};

const StudentNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="StudentTabs" component={StudentTabs} />
    <Stack.Screen name="ProjectDetail" component={ProjectDetailScreen} />
    <Stack.Screen name="CreateProject" component={CreateProjectScreen} />
    <Stack.Screen name="EditProject" component={EditProjectScreen} />
    <Stack.Screen name="SavedProjects" component={SavedProjectsScreen} />
    <Stack.Screen name="PublicProfile" component={PublicProfileScreen} />
    <Stack.Screen name="EditProfile" component={EditProfileScreen} />
    <Stack.Screen name="Invitations" component={InvitationsScreen} />
    <Stack.Screen name="Applications" component={ApplicationsScreen} />
    <Stack.Screen name="TeamMembers" component={TeamMembersScreen} />
    <Stack.Screen name="InviteStudent" component={InviteStudentScreen} />
    <Stack.Screen name="ProjectTaskBoard" component={ProjectTaskBoardScreen} />
    <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
    <Stack.Screen name="TaskForm" component={TaskFormScreen} />
    <Stack.Screen name="PrivateChat" component={PrivateChatScreen} />
    <Stack.Screen name="ProjectChat" component={ProjectChatScreen} />
    <Stack.Screen name="MyReports" component={MyReportsScreen} />
    <Stack.Screen name="AccountSettings" component={AccountSettingsScreen} />
    <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
    <Stack.Screen name="ReportTarget" component={ReportTargetScreen} />
  </Stack.Navigator>
);

const AdminMoreScreen = ({ navigation }: any) => (
  <AppScreen>
    <AppHeader
      title="Admin Tools"
      subtitle="Platform configuration, audit trails, and announcement controls."
    />
    <AppButton label="Settings" onPress={() => navigation.navigate('Settings')} className="mb-3" />
    <AppButton
      label="Audit Logs"
      onPress={() => navigation.navigate('AuditLogs')}
      variant="secondary"
      className="mb-3"
    />
    <AppButton
      label="Announcements"
      onPress={() => navigation.navigate('Announcements')}
      variant="secondary"
    />
  </AppScreen>
);

const AdminTabs = () => (
  <Tab.Navigator
    screenOptions={({ route }) => ({
      headerShown: false,
      tabBarActiveTintColor: '#7921BF',
      tabBarInactiveTintColor: '#7C6C90',
      tabBarStyle: {
        height: 78,
        paddingTop: 8,
        paddingBottom: 14,
        borderTopWidth: 0,
        backgroundColor: '#FFFFFF',
      },
      tabBarIcon: ({ color, size }) => {
        const icons: Record<string, keyof typeof Ionicons.glyphMap> = {
          DashboardTab: 'speedometer',
          AnalyticsTab: 'bar-chart',
          UsersTab: 'people',
          ProjectsAdminTab: 'briefcase',
          ReportsTab: 'flag',
          MoreTab: 'grid',
        };
        return <Ionicons name={icons[route.name]} size={size} color={color} />;
      },
    })}>
    <Tab.Screen
      name="DashboardTab"
      component={AdminDashboardScreen}
      options={{ title: 'Dashboard' }}
    />
    <Tab.Screen name="AnalyticsTab" component={AnalyticsScreen} options={{ title: 'Analytics' }} />
    <Tab.Screen name="UsersTab" component={UsersListScreen} options={{ title: 'Users' }} />
    <Tab.Screen
      name="ProjectsAdminTab"
      component={ProjectsModerationListScreen}
      options={{ title: 'Projects' }}
    />
    <Tab.Screen name="ReportsTab" component={ReportsListScreen} options={{ title: 'Reports' }} />
    <Tab.Screen name="MoreTab" component={AdminMoreScreen} options={{ title: 'More' }} />
  </Tab.Navigator>
);

const AdminNavigator = () => (
  <Stack.Navigator screenOptions={{ headerShown: false }}>
    <Stack.Screen name="AdminTabs" component={AdminTabs} />
    <Stack.Screen name="UserDetail" component={UserDetailScreen} />
    <Stack.Screen name="ProjectModerationDetail" component={ProjectModerationDetailScreen} />
    <Stack.Screen name="ReportDetail" component={ReportDetailScreen} />
    <Stack.Screen name="AuditLogs" component={AuditLogsScreen} />
    <Stack.Screen name="Settings" component={SettingsScreen} />
    <Stack.Screen name="Announcements" component={AnnouncementsScreen} />
    <Stack.Screen name="UsersList" component={UsersListScreen} />
    <Stack.Screen name="ProjectsList" component={ProjectsModerationListScreen} />
    <Stack.Screen name="ReportsList" component={ReportsListScreen} />
  </Stack.Navigator>
);

export const RootNavigator = () => {
  const { session, isBootstrapping } = useSession();

  if (isBootstrapping) {
    return <LoadingState label="Restoring your session..." fullscreen />;
  }

  return (
    <NavigationContainer theme={navTheme}>
      {!session ? (
        <GuestNavigator />
      ) : session.role === 'admin' ? (
        <AdminNavigator />
      ) : (
        <StudentNavigator />
      )}
    </NavigationContainer>
  );
};
