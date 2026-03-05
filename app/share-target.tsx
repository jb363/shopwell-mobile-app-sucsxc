
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Stack, router, useLocalSearchParams, Redirect } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function ShareTargetScreen() {
  const params = useLocalSearchParams();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    console.log('[ShareTarget] 📤 Screen opened with params:', JSON.stringify(params));
    
    // Immediately redirect to home with shared data
    const redirectToHome = () => {
      // Extract shared data from URL parameters
      let sharedContent = '';
      let sharedType = 'text';
      
      // Handle text sharing (from Android SEND intent with text/plain)
      if (params.text) {
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
      
      console.log('[ShareTarget] 🚀 Redirecting to home with:', { sharedContent, sharedType });
      
      // Navigate to home and pass the shared data
      router.replace({
        pathname: '/(tabs)/(home)/',
        params: {
          sharedContent: sharedContent || '',
          sharedType: sharedType,
        },
      });
    };

    // Small delay to ensure params are fully loaded
    setTimeout(() => {
      redirectToHome();
    }, 100);
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
