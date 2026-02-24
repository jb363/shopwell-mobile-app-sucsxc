
import React from 'react';
import { Platform } from 'react-native';

// Platform-specific implementations
const HomeScreenIOS = require('./index.ios').default;
const HomeScreenAndroid = require('./index.android').default;
const HomeScreenWeb = require('./index.web').default;

export default function HomeScreen() {
  if (Platform.OS === 'ios') {
    return <HomeScreenIOS />;
  } else if (Platform.OS === 'android') {
    return <HomeScreenAndroid />;
  } else {
    return <HomeScreenWeb />;
  }
}
