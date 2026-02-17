
import React from 'react';
import { View, StyleSheet } from 'react-native';
import { Stack } from 'expo-router';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
});
