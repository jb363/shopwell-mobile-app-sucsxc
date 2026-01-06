
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
        // For native platforms, use the native share sheet
        // TODO: Backend Integration - When sharing lists/products, send share event to backend analytics
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
    // TODO: Backend Integration - Track product share event in analytics
    await shareText(text, 'Share Product');
  };

  const shareShoppingList = async (listName: string, itemCount: number) => {
    const text = `My ${listName} shopping list has ${itemCount} items. Created with ShopWell.ai!`;
    // TODO: Backend Integration - Track shopping list share event in analytics
    await shareText(text, 'Share Shopping List');
  };

  return {
    isSharing,
    shareText,
    shareProduct,
    shareShoppingList,
  };
}
