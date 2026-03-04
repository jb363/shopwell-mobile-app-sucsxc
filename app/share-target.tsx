
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, Image, TouchableOpacity } from 'react-native';
import { Stack, router, useLocalSearchParams, Redirect } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function ShareTargetScreen() {
  const params = useLocalSearchParams();
  const [sharedData, setSharedData] = useState<{
    type: string;
    content: string;
    url?: string;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [shouldRedirect, setShouldRedirect] = useState(false);

  useEffect(() => {
    console.log('[ShareTarget] Screen opened with params:', JSON.stringify(params));
    
    // Extract shared data from URL parameters
    const extractSharedData = () => {
      // Handle text sharing (from Android SEND intent with text/plain)
      if (params.text) {
        const textContent = Array.isArray(params.text) ? params.text[0] : params.text;
        console.log('[ShareTarget] Extracted text:', textContent);
        
        // Check if the text is a URL
        const isUrl = textContent.startsWith('http://') || textContent.startsWith('https://');
        
        setSharedData({
          type: isUrl ? 'url' : 'text',
          content: textContent,
          url: isUrl ? textContent : undefined,
        });
      }
      // Handle URL sharing (from Android VIEW intent)
      else if (params.url) {
        const urlContent = Array.isArray(params.url) ? params.url[0] : params.url;
        console.log('[ShareTarget] Extracted URL:', urlContent);
        setSharedData({
          type: 'url',
          content: urlContent,
          url: urlContent,
        });
      }
      // Handle image sharing (from Android SEND intent with image/*)
      else if (params.image) {
        const imageContent = Array.isArray(params.image) ? params.image[0] : params.image;
        console.log('[ShareTarget] Extracted image:', imageContent);
        setSharedData({
          type: 'image',
          content: imageContent,
        });
      }
      // Handle generic data
      else if (params.data) {
        const dataContent = Array.isArray(params.data) ? params.data[0] : params.data;
        console.log('[ShareTarget] Extracted data:', dataContent);
        setSharedData({
          type: 'data',
          content: dataContent,
        });
      }
      // Fallback: check all params
      else {
        const allParams = Object.entries(params)
          .map(([key, value]) => `${key}: ${value}`)
          .join('\n');
        
        if (allParams) {
          console.log('[ShareTarget] Extracted all params:', allParams);
          setSharedData({
            type: 'unknown',
            content: allParams,
          });
        } else {
          console.log('[ShareTarget] No shared data found, redirecting to home');
          // No data, redirect immediately
          setShouldRedirect(true);
        }
      }
      
      setLoading(false);
    };

    extractSharedData();
  }, [params]);

  const handleContinue = () => {
    console.log('[ShareTarget] User continuing with shared data:', sharedData);
    
    // Navigate to home and pass the shared data
    // The WebView will receive this data and populate the "Product URL (Optional)" field
    router.replace({
      pathname: '/(tabs)/(home)/',
      params: {
        sharedContent: sharedData?.url || sharedData?.content,
        sharedType: sharedData?.type,
      },
    });
  };

  const handleCancel = () => {
    console.log('[ShareTarget] User cancelled share');
    router.replace('/(tabs)/(home)/');
  };

  // Redirect immediately if no data
  if (shouldRedirect) {
    console.log('[ShareTarget] Redirecting to home (no data)');
    return <Redirect href="/(tabs)/(home)/" />;
  }

  const typeLabel = sharedData?.type === 'text' ? 'Text' :
                    sharedData?.type === 'url' ? 'Link' :
                    sharedData?.type === 'image' ? 'Image' :
                    'Content';

  return (
    <>
      <Stack.Screen 
        options={{
          title: 'Shared Content',
          headerShown: true,
          presentation: 'modal',
        }} 
      />
      
      <View style={styles.container}>
        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.text }]}>
              Loading shared content...
            </Text>
          </View>
        ) : sharedData ? (
          <ScrollView style={styles.contentContainer} contentContainerStyle={styles.scrollContent}>
            <View style={styles.iconContainer}>
              <IconSymbol
                ios_icon_name="square.and.arrow.up"
                android_material_icon_name="share"
                size={48}
                color={colors.primary}
              />
            </View>

            <Text style={[styles.title, { color: colors.text }]}>
              Shared {typeLabel}
            </Text>

            <View style={[styles.contentBox, { backgroundColor: colors.background, borderColor: colors.border }]}>
              {sharedData.type === 'image' ? (
                <Image 
                  source={{ uri: sharedData.content }} 
                  style={styles.sharedImage}
                  resizeMode="contain"
                />
              ) : (
                <Text style={[styles.contentText, { color: colors.text }]}>
                  {sharedData.content}
                </Text>
              )}
            </View>

            <View style={styles.buttonContainer}>
              <TouchableOpacity 
                style={[styles.button, styles.primaryButton, { backgroundColor: colors.primary }]}
                onPress={handleContinue}
              >
                <Text style={styles.primaryButtonText}>
                  Continue to ShopWell
                </Text>
              </TouchableOpacity>

              <TouchableOpacity 
                style={[styles.button, styles.secondaryButton, { borderColor: colors.border }]}
                onPress={handleCancel}
              >
                <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
        ) : (
          <View style={styles.emptyContainer}>
            <IconSymbol
              ios_icon_name="exclamationmark.triangle"
              android_material_icon_name="warning"
              size={48}
              color={colors.textSecondary}
            />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
              No content was shared
            </Text>
            <TouchableOpacity 
              style={[styles.button, styles.secondaryButton, { borderColor: colors.border, marginTop: 20 }]}
              onPress={handleCancel}
            >
              <Text style={[styles.secondaryButtonText, { color: colors.text }]}>
                Go to Home
              </Text>
            </TouchableOpacity>
          </View>
        )}
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
  },
  contentContainer: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    alignItems: 'center',
  },
  iconContainer: {
    marginTop: 40,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  contentBox: {
    width: '100%',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 30,
  },
  contentText: {
    fontSize: 16,
    lineHeight: 24,
  },
  sharedImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  buttonContainer: {
    width: '100%',
    gap: 12,
  },
  button: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  primaryButton: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  primaryButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
  secondaryButton: {
    borderWidth: 1,
    backgroundColor: 'transparent',
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  emptyText: {
    fontSize: 18,
    marginTop: 16,
    textAlign: 'center',
  },
});
