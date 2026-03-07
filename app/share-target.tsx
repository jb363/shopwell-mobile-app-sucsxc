
import React, { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { colors } from '@/styles/commonStyles';

export default function ShareTargetScreen() {
  const params = useLocalSearchParams();

  useEffect(() => {
    console.log('[ShareTarget] 📤 Screen opened with params:', JSON.stringify(params));
    
    // Extract shared data from URL parameters
    const extractSharedData = () => {
      let sharedContent = '';
      let sharedType = 'text';
      
      // Handle productUrl from iOS Share Extension
      if (params.productUrl) {
        const urlValue = Array.isArray(params.productUrl) ? params.productUrl[0] : params.productUrl;
        console.log('[ShareTarget] ✅ Extracted productUrl from iOS Share Extension:', urlValue);
        sharedContent = urlValue;
        sharedType = 'url';
      }
      // Handle content from deep link (iOS Share Extension or Android Intent)
      else if (params.content) {
        const contentValue = Array.isArray(params.content) ? params.content[0] : params.content;
        const typeValue = Array.isArray(params.type) ? params.type[0] : params.type;
        
        console.log('[ShareTarget] ✅ Extracted from deep link - Type:', typeValue, 'Content:', contentValue);
        
        sharedContent = contentValue;
        sharedType = typeValue || 'text';
      }
      // Handle text sharing (from Android SEND intent with text/plain)
      else if (params.text) {
        const textContent = Array.isArray(params.text) ? params.text[0] : params.text;
        console.log('[ShareTarget] ✅ Extracted text:', textContent);
        
        // Check if the text is a URL
        const isUrl = textContent.startsWith('http://') || textContent.startsWith('https://');
        sharedContent = textContent;
        sharedType = isUrl ? 'url' : 'text';
      }
      // Handle URL sharing (from Android VIEW intent)
      else if (params.url) {
        const urlContent = Array.isArray(params.url) ? params.url[0] : params.url;
        console.log('[ShareTarget] ✅ Extracted URL:', urlContent);
        sharedContent = urlContent;
        sharedType = 'url';
      }
      // Handle image sharing (from Android SEND intent with image/*)
      else if (params.image) {
        const imageContent = Array.isArray(params.image) ? params.image[0] : params.image;
        console.log('[ShareTarget] ✅ Extracted image:', imageContent);
        sharedContent = imageContent;
        sharedType = 'image';
      }
      // Handle generic data
      else if (params.data) {
        const dataContent = Array.isArray(params.data) ? params.data[0] : params.data;
        console.log('[ShareTarget] ✅ Extracted data:', dataContent);
        sharedContent = dataContent;
        sharedType = 'data';
      }
      
      return { sharedContent, sharedType };
    };

    const { sharedContent, sharedType } = extractSharedData();
    
    console.log('[ShareTarget] 🚀 Redirecting to home with:', { sharedContent, sharedType });
    
    // Navigate to home and pass the shared data
    // The home screen will inject this into the WebView which will navigate to https://shopwell.ai/share-target
    router.replace({
      pathname: '/(tabs)/(home)/',
      params: {
        sharedContent: sharedContent || '',
        sharedType: sharedType,
      },
    });
  }, [params]);

  // Show loading while redirecting
  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Opening ShopWell...',
          headerShown: false,
        }} 
      />
      
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[styles.loadingText, { color: colors.text }]}>
          Opening ShopWell.ai...
        </Text>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
});
