
import React from 'react';
import { Stack } from 'expo-router';

export default function HomeLayout() {
  return (
    <Stack
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <Stack.Screen name="index" />
      <Stack.Screen name="scan" />
      <Stack.Screen name="shopping-lists" />
      <Stack.Screen name="search" />
      <Stack.Screen name="insights" />
    </Stack>
  );
}
