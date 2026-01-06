
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';

export const useSharing = () => {
  const shareContent = async (message: string, url?: string) => {
    const fullMessage = url ? `${message}\n${url}` : message;

    if (Platform.OS === 'web') {
      // Web sharing using the navigator API
      if (navigator.share) {
        try {
          await navigator.share({
            title: 'ShopWell.ai',
            text: fullMessage,
            url: url || undefined,
          });
          console.log('Shared successfully');
        } catch (error) {
          console.error('Error sharing:', error);
        }
      } else {
        console.warn('Web sharing is not supported on this browser.');
      }
    } else {
      // Native sharing using Expo Sharing API
      await Sharing.shareAsync(url || 'https://shopwell.ai', {
        dialogTitle: message,
        UTI: url ? 'public.url' : 'text/plain',
      });
    }
  };

  return { shareContent };
};
