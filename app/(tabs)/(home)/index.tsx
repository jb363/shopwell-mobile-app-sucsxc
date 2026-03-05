
import React from 'react';
import { Platform } from 'react-native';

// Platform-specific implementations
let HomeScreenIOS: any;
let HomeScreenAndroid: any;
let HomeScreenWeb: any;

if (Platform.OS === 'ios') {
  HomeScreenIOS = require('./index.ios').default;
} else if (Platform.OS === 'android') {
  HomeScreenAndroid = require('./index.android').default;
} else {
  HomeScreenWeb = require('./index.web').default;
}

export default function HomeScreen() {
  if (Platform.OS === 'ios' && HomeScreenIOS) {
    return <HomeScreenIOS />;
  } else if (Platform.OS === 'android' && HomeScreenAndroid) {
    return <HomeScreenAndroid />;
  } else if (HomeScreenWeb) {
    return <HomeScreenWeb />;
  }
  
  // Fallback - should never reach here
  return null;
}
