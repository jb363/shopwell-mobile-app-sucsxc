
import React from 'react';
import { Platform } from 'react-native';
import HomeScreenIOS from './index.ios';
import HomeScreenAndroid from './index.android';
import HomeScreenWeb from './index.web';

export default function HomeScreen() {
  if (Platform.OS === 'ios') {
    return <HomeScreenIOS />;
  } else if (Platform.OS === 'android') {
    return <HomeScreenAndroid />;
  } else {
    return <HomeScreenWeb />;
  }
}
