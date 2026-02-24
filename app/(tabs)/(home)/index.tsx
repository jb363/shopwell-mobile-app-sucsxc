
import React from 'react';
import { Platform } from 'react-native';

// Platform-specific implementations handle the WebView
// This file serves as a fallback
export default function HomeScreen() {
  if (Platform.OS === 'ios') {
    return require('./index.ios').default();
  } else if (Platform.OS === 'android') {
    return require('./index.android').default();
  } else {
    return require('./index.web').default();
  }
}
