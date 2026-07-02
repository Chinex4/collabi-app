import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { StyleSheet, View } from 'react-native';

import { AppButton, AppScreen, AppText } from '@/components/common';

export const WelcomeScreen = ({ navigation }: any) => (
  <LinearGradient
    colors={['#24043F', '#6D16B8', '#B96CEB']}
    className="flex-1"
    style={styles.screen}>
    <AppScreen scroll={false} backgroundClassName="bg-transparent">
      <View className="flex-1 justify-between">
        <View className="mt-2">
          <View className="h-16 w-16 items-center justify-center rounded-[22px] bg-white/15">
            <Ionicons name="people" size={30} color="#fff" />
          </View>
          <AppText className="mt-8 text-4xl font-black leading-[44px] text-white">
            Student Project Collaboration Platform
          </AppText>
          <AppText className="mt-5 text-base leading-7 text-white/90">
            Discover final year ideas, assemble strong multidisciplinary teams, coordinate work, and
            keep moderation visible from day one.
          </AppText>
        </View>
        <View>
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

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
});
