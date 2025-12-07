
import { useState } from 'react';
import * as Sharing from 'expo-sharing';
import { Platform, Alert } from 'react-native';

export function useSharing() {
  const [isSharing, setIsSharing] = useState(false);

  const shareText = async (text: string, title?: string) => {
    try {
      setIsSharing(true);
      
      if (Platform.OS === 'web') {
        if (navigator.share) {
          await navigator.share({
            title: title || 'ShopWell.ai',
            text: text,
          });
        } else {
          Alert.alert('Sharing not supported', 'Your browser does not support sharing.');
        }
      } else {
        // For native platforms, we'll use a workaround with text
        Alert.alert('Share', text, [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Copy', onPress: () => console.log('Text copied') },
        ]);
      }
    } catch (error) {
      console.log('Error sharing:', error);
    } finally {
      setIsSharing(false);
    }
  };

  const shareProduct = async (productName: string, healthScore: number) => {
    const text = `Check out ${productName} on ShopWell.ai! Health Score: ${healthScore}/100`;
    await shareText(text, 'Share Product');
  };

  const shareShoppingList = async (listName: string, itemCount: number) => {
    const text = `My ${listName} shopping list has ${itemCount} items. Created with ShopWell.ai!`;
    await shareText(text, 'Share Shopping List');
  };

  return {
    isSharing,
    shareText,
    shareProduct,
    shareShoppingList,
  };
}
