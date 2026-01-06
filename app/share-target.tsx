
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, router } from 'expo-router';
import * as Linking from 'expo-linking';
import { colors } from '@/styles/commonStyles';

export default function ShareTargetScreen() {
  const [sharedData, setSharedData] = useState<any>(null);

  useEffect(() => {
    const handleSharedContent = async () => {
      try {
        const url = await Linking.getInitialURL();
        if (url) {
          const { queryParams } = Linking.parse(url);
          console.log('Shared content:', queryParams);
          setSharedData(queryParams);
          
          // Redirect to home with shared data
          // The WebView will handle the shared data via the bridge
          setTimeout(() => {
            router.replace('/(tabs)/(home)');
          }, 1000);
        }
      } catch (error) {
        console.error('Error handling shared content:', error);
        router.replace('/(tabs)/(home)');
      }
    };

    handleSharedContent();
  }, []);

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={styles.container}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.text}>Processing shared content...</Text>
        {sharedData && (
          <Text style={styles.dataText}>
            {JSON.stringify(sharedData, null, 2)}
          </Text>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
    padding: 20,
  },
  text: {
    marginTop: 20,
    fontSize: 16,
    color: colors.text,
  },
  dataText: {
    marginTop: 20,
    fontSize: 12,
    color: colors.textSecondary,
    fontFamily: 'monospace',
  },
});
