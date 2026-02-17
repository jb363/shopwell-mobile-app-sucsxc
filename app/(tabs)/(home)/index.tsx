
import React from 'react';
import { View, Text, StyleSheet, Linking, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  const openWebsite = () => {
    Linking.openURL(SHOPWELL_URL);
  };

  return (
    <View style={styles.container}>
      <Stack.Screen options={{ headerShown: false }} />
      <Text style={styles.text}>ShopWell.ai</Text>
      <Text style={styles.subtext}>For the best experience, please use:</Text>
      <Text style={styles.note}>• iOS app for full native functionality</Text>
      <Text style={styles.note}>• Android app for full native functionality</Text>
      <TouchableOpacity style={styles.button} onPress={openWebsite}>
        <Text style={styles.buttonText}>Open Website in Browser</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#000',
  },
  text: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 20,
  },
  subtext: {
    fontSize: 16,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
  },
  note: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 10,
  },
  button: {
    marginTop: 30,
    backgroundColor: '#4CAF50',
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 8,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
