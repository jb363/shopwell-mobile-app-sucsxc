
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  console.log('[Web HomeScreen] Component mounting - loading website directly');

  // On web, we simply load the website in an iframe without any script injection
  // The website itself will detect it's running in a browser and handle everything natively
  // No need for native app bridge on web platform

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <iframe
        src={SHOPWELL_URL}
        style={{
          width: '100%',
          height: '100%',
          border: 'none',
        }}
        title="ShopWell.ai"
        allow="geolocation; microphone; camera"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
    position: 'relative',
  },
});
