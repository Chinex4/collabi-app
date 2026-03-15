import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { View } from 'react-native';

import { AppButton, AppScreen, AppText } from '@/components/common';
import { OTP_LENGTH } from '@/constants';

export const WelcomeScreen = ({ navigation }: any) => (
  <LinearGradient colors={['#2C0B4E', '#7921BF', '#C18AF1']} className="flex-1">
    <AppScreen scroll={false} backgroundClassName="bg-transparent">
      <View className="flex-1 justify-between py-8">
        <View className="mt-8">
          <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-white/15">
            <Ionicons name="people" size={30} color="#fff" />
          </View>
          <AppText className="mt-8 text-4xl font-black leading-[44px] text-white">
            Student Project Collaboration Platform
          </AppText>
          <AppText className="mt-5 text-base leading-7 text-violet-100">
            Discover final year ideas, assemble strong multidisciplinary teams, coordinate work, and
            keep moderation visible from day one.
          </AppText>
        </View>
        <View>
          <View className="rounded-[28px] bg-white/10 p-5">
            <AppText className="text-sm uppercase tracking-[2px] text-violet-100">
              Quick demo accounts
            </AppText>
            <AppText className="mt-3 text-sm text-white">
              Student: `adaeze@university.edu` / `Password1!`
            </AppText>
            <AppText className="mt-1 text-sm text-white">
              Admin: `admin@collabi.edu` / `Admin123!`
            </AppText>
            <AppText className="mt-1 text-sm text-white">
              Mock OTP: `{OTP_LENGTH}` digits, use `123456`
            </AppText>
          </View>
          <AppButton
            label="Student Login"
            onPress={() => navigation.navigate('StudentLogin')}
            className="mt-6"
          />
          <AppButton
            label="Create Student Account"
            onPress={() => navigation.navigate('Register')}
            variant="secondary"
            className="mt-3"
          />
          <AppButton
            label="Admin Login"
            onPress={() => navigation.navigate('AdminLogin')}
            variant="ghost"
            className="mt-3"
          />
        </View>
      </View>
    </AppScreen>
  </LinearGradient>
);
