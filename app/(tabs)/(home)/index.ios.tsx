
import React, { useRef, useEffect, useState, useMemo } from 'react';
import { StyleSheet, View, Platform, Alert, ActivityIndicator, Text } from 'react-native';
import { Stack, router, useLocalSearchParams } from 'expo-router';
import { WebView } from 'react-native-webview';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import * as Clipboard from 'expo-clipboard';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import * as ImagePicker from 'expo-image-picker';
import { Audio } from 'expo-audio';
import { useNotifications } from '@/hooks/useNotifications';
import { useOfflineSync } from '@/hooks/useOfflineSync';
import { useGeofencing } from '@/hooks/useGeofencing';
import { useQuickActions } from '@/hooks/useQuickActions';
import * as OfflineStorage from '@/utils/offlineStorage';
import * as ContactsHandler from '@/utils/contactsHandler';
import * as AudioHandler from '@/utils/audioHandler';
import * as LocationHandler from '@/utils/locationHandler';
import * as BiometricHandler from '@/utils/biometricHandler';
import { crashReporter } from '@/utils/crashReporter';

const SHOPWELL_URL = 'https://shopwell.ai';

export default function HomeScreen() {
  console.log('[iOS HomeScreen] ═══════════════════════════════════════');
  console.log('[iOS HomeScreen] Component mounting - ShopWell.ai iOS App');
  console.log('[iOS HomeScreen] Target URL:', SHOPWELL_URL);
  console.log('[iOS HomeScreen] ═══════════════════════════════════════');
  
  const webViewRef = useRef<WebView>(null);
  const params = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  
  const [currentRecording, setCurrentRecording] = useState<Audio.Recording | null>(null);
  const [contactsPermissionStatus, setContactsPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [locationPermissionStatus, setLocationPermissionStatus] = useState<'granted' | 'denied' | 'undetermined'>('undetermined');
  const [isNativeReady, setIsNativeReady] = useState(false);
  const [webViewLoaded, setWebViewLoaded] = useState(false);
  const [webViewError, setWebViewError] = useState<string | null>(null);
  
  // ALWAYS call hooks unconditionally - React rules
  const notificationsHook = useNotifications();
  const offlineSyncHook = useOfflineSync();
  const geofencingHook = useGeofencing();
  useQuickActions(webViewRef);
  
  // Extract values from hooks
  const expoPushToken = notificationsHook.expoPushToken;
  const isSyncing = offlineSyncHook.isSyncing;
  const queueSize = offlineSyncHook.queueSize;
  const isOnline = offlineSyncHook.isOnline;
  const manualSync = offlineSyncHook.manualSync;
  const isGeofencingActive = geofencingHook.isActive;
  const geofencePermissionStatus = geofencingHook.hasPermission;
  const addStoreLocation = geofencingHook.addStoreLocation;
  const removeStoreLocation = geofencingHook.removeStoreLocation;
  const loadStoreLocations = geofencingHook.loadStoreLocations;
  const startGeofencing = geofencingHook.startGeofencing;
  const stopGeofencing = geofencingHook.stopGeofencing;
  
  // Memoize storeLocations to prevent dependency issues
  const storeLocations = useMemo(() => geofencingHook.storeLocations, [geofencingHook.storeLocations]);

  useEffect(() => {
    if (!isNativeReady && webViewRef.current && webViewLoaded) {
      console.log('[iOS HomeScreen] 🚀 Native app ready, signaling to website...');
      setIsNativeReady(true);
      
      setTimeout(() => {
        try {
          webViewRef.current?.injectJavaScript(`
            (function() {
              try {
                console.log('[ShopWell Native] Sending NATIVE_APP_READY signal');
                window.postMessage({ 
                  type: 'NATIVE_APP_READY', 
                  platform: 'ios',
                  timestamp: Date.now(),
                  features: ['contacts', 'camera', 'sharing', 'notifications', 'offline', 'accountDeletion', 'microphone', 'audioRecording', 'location', 'geofencing', 'locationNotifications', 'quickActions', 'addToHomeScreen', 'biometric']
                }, '*');
                console.log('[ShopWell Native] ✅ NATIVE_APP_READY signal sent');
              } catch (error) {
                console.error('[ShopWell Native] ❌ Error sending ready signal:', error);
              }
            })();
            true;
          `);
          console.log('[iOS HomeScreen] ✅ Ready signal injected');
        } catch (error) {
          console.error('[iOS HomeScreen] ❌ Error sending ready signal:', error);
        }
      }, 1000);
    }
  }, [isNativeReady, webViewLoaded]);

  useEffect(() => {
    if (params.sharedContent && params.sharedType && webViewRef.current && isNativeReady) {
      console.log('[iOS HomeScreen] 📤 Received shared content');
      
      const sharedContentStr = Array.isArray(params.sharedContent) ? params.sharedContent[0] : params.sharedContent;
      const sharedTypeStr = Array.isArray(params.sharedType) ? params.sharedType[0] : params.sharedType;
      
      setTimeout(() => {
        try {
          webViewRef.current?.injectJavaScript(`
            (function() {
              try {
                window.postMessage({ 
                  type: 'SHARED_CONTENT', 
                  contentType: '${sharedTypeStr}',
                  content: ${JSON.stringify(sharedContentStr)}
                }, '*');
              } catch (error) {
                console.error('[ShopWell Native] Error sending shared content:', error);
              }
            })();
            true;
          `);
        } catch (error) {
          console.error('[iOS HomeScreen] Error injecting shared content:', error);
        }
      }, 500);
    }
  }, [params.sharedContent, params.sharedType, isNativeReady]);

  useEffect(() => {
    if (expoPushToken && webViewRef.current && isNativeReady) {
      console.log('[iOS HomeScreen] 📲 Sending push token to web');
      setTimeout(() => {
        try {
          webViewRef.current?.injectJavaScript(`
            (function() {
              try {
                window.postMessage({ type: 'PUSH_TOKEN', token: '${expoPushToken}' }, '*');
              } catch (error) {
                console.error('[ShopWell Native] Error sending push token:', error);
              }
            })();
            true;
          `);
        } catch (error) {
          console.error('[iOS HomeScreen] Error injecting push token:', error);
        }
      }, 300);
    }
  }, [expoPushToken, isNativeReady]);

  useEffect(() => {
    if (webViewRef.current && isNativeReady) {
      try {
        webViewRef.current.injectJavaScript(`
          (function() {
            try {
              window.postMessage({ 
                type: 'SYNC_STATUS', 
                isSyncing: ${isSyncing}, 
                queueSize: ${queueSize},
                isOnline: ${isOnline}
              }, '*');
            } catch (error) {
              console.error('[ShopWell Native] Error sending sync status:', error);
            }
          })();
          true;
        `);
      } catch (error) {
        console.error('[iOS HomeScreen] Error injecting sync status:', error);
      }
    }
  }, [isSyncing, queueSize, isOnline, isNativeReady]);

  useEffect(() => {
    if (webViewRef.current && isNativeReady) {
      console.log('[iOS HomeScreen] 📍 Sending geofencing status to web:', { 
        isGeofencingActive, 
        geofencePermissionStatus,
        locationCount: storeLocations.length 
      });
      try {
        webViewRef.current.injectJavaScript(`
          (function() {
            try {
              window.postMessage({ 
                type: 'GEOFENCING_STATUS', 
                isActive: ${isGeofencingActive},
                permissionStatus: '${geofencePermissionStatus ? 'granted' : 'denied'}',
                locationCount: ${storeLocations.length},
                locations: ${JSON.stringify(storeLocations)},
                platform: 'ios'
              }, '*');
            } catch (error) {
              console.error('[ShopWell Native] Error sending geofencing status:', error);
            }
          })();
          true;
        `);
      } catch (error) {
        console.error('[iOS HomeScreen] Error injecting geofencing status:', error);
      }
    }
  }, [isGeofencingActive, geofencePermissionStatus, storeLocations, isNativeReady]);

  useEffect(() => {
    if (webViewRef.current && isNativeReady) {
      try {
        webViewRef.current.injectJavaScript(`
          (function() {
            try {
              window.postMessage({ 
                type: 'PERMISSIONS_STATUS', 
                contacts: '${contactsPermissionStatus}',
                location: '${locationPermissionStatus}',
                notifications: '${notificationsHook.permissionStatus}'
              }, '*');
            } catch (error) {
              console.error('[ShopWell Native] Error sending permissions status:', error);
            }
          })();
          true;
        `);
      } catch (error) {
        console.error('[iOS HomeScreen] Error injecting permissions status:', error);
      }
    }
  }, [contactsPermissionStatus, locationPermissionStatus, notificationsHook.permissionStatus, isNativeReady]);

  const handleMessage = async (event: any) => {
    try {
      const data = JSON.parse(event.nativeEvent.data);
      console.log('[iOS HomeScreen] 📨 Received message:', data.type);
      
      if (!isNativeReady && !data.type?.startsWith('WEB_')) {
        console.log('[iOS HomeScreen] ⏸️ Native not ready, ignoring message');
        return;
      }
      
      switch (data.type) {
        case 'WEB_PAGE_READY':
          console.log('[iOS HomeScreen] 🌐 Website ready, sending native capabilities...');
          setTimeout(() => {
            try {
              webViewRef.current?.injectJavaScript(`
                (function() {
                  try {
                    window.postMessage({ 
                      type: 'NATIVE_APP_READY', 
                      platform: 'ios',
                      timestamp: Date.now(),
                      features: ['contacts', 'camera', 'sharing', 'notifications', 'offline', 'accountDeletion', 'microphone', 'audioRecording', 'location', 'geofencing', 'locationNotifications', 'quickActions', 'addToHomeScreen', 'biometric']
                    }, '*');
                  } catch (error) {
                    console.error('[ShopWell Native] Error sending ready signal:', error);
                  }
                })();
                true;
              `);
              
              webViewRef.current?.injectJavaScript(`
                (function() {
                  try {
                    window.postMessage({ 
                      type: 'GEOFENCING_STATUS', 
                      isActive: ${isGeofencingActive},
                      permissionStatus: '${geofencePermissionStatus ? 'granted' : 'denied'}',
                      locationCount: ${storeLocations.length},
                      locations: ${JSON.stringify(storeLocations)},
                      platform: 'ios'
                    }, '*');
                  } catch (error) {
                    console.error('[ShopWell Native] Error sending geofencing status:', error);
                  }
                })();
                true;
              `);
              
              webViewRef.current?.injectJavaScript(`
                (function() {
                  try {
                    window.postMessage({ 
                      type: 'PERMISSIONS_STATUS', 
                      contacts: '${contactsPermissionStatus}',
                      location: '${locationPermissionStatus}',
                      notifications: '${notificationsHook.permissionStatus}'
                    }, '*');
                  } catch (error) {
                    console.error('[ShopWell Native] Error sending permissions status:', error);
                  }
                })();
                true;
              `);
              console.log('[iOS HomeScreen] ✅ All native capabilities sent to website');
            } catch (error) {
              console.error('[iOS HomeScreen] ❌ Error responding to WEB_PAGE_READY:', error);
            }
          }, 200);
          break;

        case 'natively.biometric.isSupported':
          console.log('[iOS HomeScreen] 🔐 Check biometric support');
          try {
            const capabilities = await BiometricHandler.checkBiometricCapabilities();
            const biometricName = BiometricHandler.getBiometricTypeName(capabilities);
            
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'BIOMETRIC_SUPPORT_RESPONSE', 
                isSupported: ${capabilities.isAvailable},
                hasHardware: ${capabilities.hasHardware},
                isEnrolled: ${capabilities.isEnrolled},
                biometricType: '${biometricName}'
              }, '*');
              true;
            `);
          } catch (error) {
            console.error('[iOS HomeScreen] Error checking biometric support:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'BIOMETRIC_SUPPORT_RESPONSE', 
                isSupported: false,
                error: 'Failed to check biometric support'
              }, '*');
              true;
            `);
          }
          break;

        case 'natively.biometric.authenticate':
          console.log('[iOS HomeScreen] 🔐 Authenticate with biometrics');
          try {
            const reason = data.reason || 'Authenticate to continue';
            const success = await BiometricHandler.authenticateWithBiometrics(reason);
            
            if (success) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } else {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            }
            
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'BIOMETRIC_AUTH_RESPONSE', 
                success: ${success}
              }, '*');
              true;
            `);
          } catch (error) {
            console.error('[iOS HomeScreen] Error authenticating with biometrics:', error);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'BIOMETRIC_AUTH_RESPONSE', 
                success: false,
                error: 'Failed to authenticate'
              }, '*');
              true;
            `);
          }
          break;

        case 'natively.clipboard.copy':
          console.log('[iOS HomeScreen] 📋 Copy to clipboard');
          try {
            await Clipboard.setStringAsync(data.text);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ type: 'CLIPBOARD_COPY_RESPONSE', success: true }, '*');
              true;
            `);
          } catch (error) {
            console.error('[iOS HomeScreen] Error copying to clipboard:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ type: 'CLIPBOARD_COPY_RESPONSE', success: false, error: 'Failed to copy' }, '*');
              true;
            `);
          }
          break;

        case 'natively.share':
          console.log('[iOS HomeScreen] 🔗 Share content');
          try {
            const shareOptions: any = {};
            if (data.url) shareOptions.url = data.url;
            if (data.message) shareOptions.message = data.message;
            
            const canShare = await Sharing.isAvailableAsync();
            if (canShare) {
              if (data.url) {
                await Sharing.shareAsync(data.url, shareOptions);
              } else if (data.message) {
                await Sharing.shareAsync(data.message);
              }
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ type: 'SHARE_RESPONSE', success: true }, '*');
                true;
              `);
            } else {
              throw new Error('Sharing not available');
            }
          } catch (error) {
            console.error('[iOS HomeScreen] Error sharing:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ type: 'SHARE_RESPONSE', success: false, error: 'Failed to share' }, '*');
              true;
            `);
          }
          break;

        case 'natively.camera.takePicture':
          console.log('[iOS HomeScreen] 📷 Take picture');
          try {
            const permissionResult = await ImagePicker.requestCameraPermissionsAsync();
            if (!permissionResult.granted) {
              throw new Error('Camera permission denied');
            }
            
            const result = await ImagePicker.launchCameraAsync({
              mediaTypes: 'images',
              allowsEditing: data.allowsEditing !== false,
              quality: data.quality || 0.8,
            });
            
            if (!result.canceled && result.assets && result.assets.length > 0) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'CAMERA_RESPONSE', 
                  success: true, 
                  uri: '${result.assets[0].uri}',
                  width: ${result.assets[0].width},
                  height: ${result.assets[0].height}
                }, '*');
                true;
              `);
            } else {
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ type: 'CAMERA_RESPONSE', success: false, cancelled: true }, '*');
                true;
              `);
            }
          } catch (error) {
            console.error('[iOS HomeScreen] Error taking picture:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ type: 'CAMERA_RESPONSE', success: false, error: 'Failed to take picture' }, '*');
              true;
            `);
          }
          break;

        case 'natively.imagePicker.pick':
          console.log('[iOS HomeScreen] 🖼️ Pick image');
          try {
            const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
            if (!permissionResult.granted) {
              throw new Error('Media library permission denied');
            }
            
            const result = await ImagePicker.launchImageLibraryAsync({
              mediaTypes: 'images',
              allowsEditing: data.allowsEditing !== false,
              quality: data.quality || 0.8,
            });
            
            if (!result.canceled && result.assets && result.assets.length > 0) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'IMAGE_PICKER_RESPONSE', 
                  success: true, 
                  uri: '${result.assets[0].uri}',
                  width: ${result.assets[0].width},
                  height: ${result.assets[0].height}
                }, '*');
                true;
              `);
            } else {
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ type: 'IMAGE_PICKER_RESPONSE', success: false, cancelled: true }, '*');
                true;
              `);
            }
          } catch (error) {
            console.error('[iOS HomeScreen] Error picking image:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ type: 'IMAGE_PICKER_RESPONSE', success: false, error: 'Failed to pick image' }, '*');
              true;
            `);
          }
          break;

        case 'natively.contacts.pick':
          console.log('[iOS HomeScreen] 👤 Pick contact');
          try {
            const contact = await ContactsHandler.pickContact();
            if (contact) {
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              setContactsPermissionStatus('granted');
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'CONTACT_PICKER_RESPONSE', 
                  success: true, 
                  contact: ${JSON.stringify(contact)}
                }, '*');
                true;
              `);
            } else {
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ type: 'CONTACT_PICKER_RESPONSE', success: false, cancelled: true }, '*');
                true;
              `);
            }
          } catch (error) {
            console.error('[iOS HomeScreen] Error picking contact:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ type: 'CONTACT_PICKER_RESPONSE', success: false, error: 'Failed to pick contact' }, '*');
              true;
            `);
          }
          break;

        case 'natively.contacts.requestPermission':
          console.log('[iOS HomeScreen] 🔐 Request contacts permission');
          try {
            const granted = await ContactsHandler.requestContactsPermission();
            setContactsPermissionStatus(granted ? 'granted' : 'denied');
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'CONTACTS_PERMISSION_RESPONSE', 
                granted: ${granted},
                status: '${granted ? 'granted' : 'denied'}'
              }, '*');
              true;
            `);
            
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'PERMISSIONS_STATUS', 
                contacts: '${granted ? 'granted' : 'denied'}',
                location: '${locationPermissionStatus}',
                notifications: '${notificationsHook.permissionStatus}'
              }, '*');
              true;
            `);
          } catch (error) {
            console.error('[iOS HomeScreen] Error requesting contacts permission:', error);
            setContactsPermissionStatus('denied');
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'CONTACTS_PERMISSION_RESPONSE', 
                granted: false,
                status: 'denied',
                error: 'Failed to request permission'
              }, '*');
              true;
            `);
          }
          break;

        case 'natively.audio.startRecording':
          console.log('[iOS HomeScreen] 🎤 Start audio recording');
          try {
            const recording = await AudioHandler.startRecording();
            setCurrentRecording(recording);
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ type: 'AUDIO_RECORDING_STARTED', success: true }, '*');
              true;
            `);
          } catch (error) {
            console.error('[iOS HomeScreen] Error starting recording:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ type: 'AUDIO_RECORDING_STARTED', success: false, error: 'Failed to start recording' }, '*');
              true;
            `);
          }
          break;

        case 'natively.audio.stopRecording':
          console.log('[iOS HomeScreen] ⏹️ Stop audio recording');
          try {
            if (currentRecording) {
              const uri = await AudioHandler.stopRecording(currentRecording);
              setCurrentRecording(null);
              await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'AUDIO_RECORDING_STOPPED', 
                  success: true, 
                  uri: '${uri}'
                }, '*');
                true;
              `);
            } else {
              throw new Error('No active recording');
            }
          } catch (error) {
            console.error('[iOS HomeScreen] Error stopping recording:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ type: 'AUDIO_RECORDING_STOPPED', success: false, error: 'Failed to stop recording' }, '*');
              true;
            `);
          }
          break;

        case 'natively.haptics.impact':
          console.log('[iOS HomeScreen] 📳 Haptic feedback');
          try {
            const style = data.style || 'medium';
            if (style === 'light') {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            } else if (style === 'heavy') {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
            } else {
              await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
            }
          } catch (error) {
            console.error('[iOS HomeScreen] Error with haptics:', error);
          }
          break;

        case 'natively.geofence.enableNotifications':
          console.log('[iOS HomeScreen] 📍 Toggle location notifications:', data.enabled);
          try {
            if (data.enabled) {
              const started = await startGeofencing();
              console.log('[iOS HomeScreen] Geofencing started:', started);
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'GEOFENCE_ENABLE_RESPONSE', 
                  success: ${started},
                  enabled: ${started}
                }, '*');
                true;
              `);
              
              const updatedLocations = await loadStoreLocations();
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'GEOFENCING_STATUS', 
                  isActive: ${started},
                  permissionStatus: 'granted',
                  locationCount: ${updatedLocations.length},
                  locations: ${JSON.stringify(updatedLocations)},
                  platform: 'ios'
                }, '*');
                true;
              `);
            } else {
              await stopGeofencing();
              console.log('[iOS HomeScreen] Geofencing stopped');
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'GEOFENCE_ENABLE_RESPONSE', 
                  success: true,
                  enabled: false
                }, '*');
                true;
              `);
              
              const updatedLocations = await loadStoreLocations();
              webViewRef.current?.injectJavaScript(`
                window.postMessage({ 
                  type: 'GEOFENCING_STATUS', 
                  isActive: false,
                  permissionStatus: 'granted',
                  locationCount: ${updatedLocations.length},
                  locations: ${JSON.stringify(updatedLocations)},
                  platform: 'ios'
                }, '*');
                true;
              `);
            }
          } catch (error) {
            console.error('[iOS HomeScreen] Error toggling geofencing:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_ENABLE_RESPONSE', 
                success: false,
                error: 'Failed to toggle notifications'
              }, '*');
              true;
            `);
          }
          break;

        case 'natively.geofence.requestPermission':
          console.log('[iOS HomeScreen] 🔐 Request location permission');
          try {
            Alert.alert(
              'Location Permission',
              'ShopWell needs access to your location to notify you when you\'re near stores with active shopping lists or reservations.',
              [
                {
                  text: 'Not Now',
                  style: 'cancel',
                  onPress: () => {
                    console.log('[iOS HomeScreen] User declined location permission');
                    setLocationPermissionStatus('denied');
                    webViewRef.current?.injectJavaScript(`
                      window.postMessage({ 
                        type: 'GEOFENCE_PERMISSION_RESPONSE', 
                        foreground: false,
                        background: false,
                        permissionStatus: 'denied',
                        status: 'denied',
                        userCancelled: true
                      }, '*');
                      true;
                    `);
                  }
                },
                {
                  text: 'Allow',
                  onPress: async () => {
                    console.log('[iOS HomeScreen] User accepted, requesting permission...');
                    try {
                      const permissionGranted = await LocationHandler.requestLocationPermission();
                      console.log('[iOS HomeScreen] Permission granted:', permissionGranted);
                      
                      setLocationPermissionStatus(permissionGranted ? 'granted' : 'denied');
                      
                      webViewRef.current?.injectJavaScript(`
                        window.postMessage({ 
                          type: 'GEOFENCE_PERMISSION_RESPONSE', 
                          foreground: ${permissionGranted},
                          background: ${permissionGranted},
                          permissionStatus: '${permissionGranted ? 'granted' : 'denied'}',
                          status: '${permissionGranted ? 'granted' : 'denied'}'
                        }, '*');
                        true;
                      `);
                      
                      webViewRef.current?.injectJavaScript(`
                        window.postMessage({ 
                          type: 'PERMISSIONS_STATUS', 
                          contacts: '${contactsPermissionStatus}',
                          location: '${permissionGranted ? 'granted' : 'denied'}',
                          notifications: '${notificationsHook.permissionStatus}'
                        }, '*');
                        true;
                      `);
                    } catch (permError) {
                      console.error('[iOS HomeScreen] Error requesting permission:', permError);
                      setLocationPermissionStatus('denied');
                      webViewRef.current?.injectJavaScript(`
                        window.postMessage({ 
                          type: 'GEOFENCE_PERMISSION_RESPONSE', 
                          foreground: false,
                          background: false,
                          permissionStatus: 'denied',
                          status: 'denied',
                          error: 'Failed to request permission'
                        }, '*');
                        true;
                      `);
                    }
                  }
                }
              ]
            );
          } catch (error) {
            console.error('[iOS HomeScreen] Error showing permission prompt:', error);
            setLocationPermissionStatus('denied');
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_PERMISSION_RESPONSE', 
                foreground: false,
                background: false,
                permissionStatus: 'denied',
                status: 'denied',
                error: 'Failed to show permission prompt'
              }, '*');
              true;
            `);
          }
          break;

        case 'natively.geofence.getStatus':
          console.log('[iOS HomeScreen] 📊 Get geofencing status');
          const locations = await loadStoreLocations();
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'GEOFENCE_STATUS_RESPONSE', 
              isActive: ${isGeofencingActive},
              permissionStatus: '${geofencePermissionStatus ? 'granted' : 'denied'}',
              locationCount: ${locations.length},
              locations: ${JSON.stringify(locations)},
              platform: 'ios'
            }, '*');
            true;
          `);
          break;

        case 'natively.geofence.add':
          console.log('[iOS HomeScreen] ➕ Add geofence:', data.location);
          try {
            await addStoreLocation(data.location);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_ADD_RESPONSE', 
                success: true,
                locationId: '${data.location.id}'
              }, '*');
              true;
            `);
            
            const updatedLocations = await loadStoreLocations();
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCING_STATUS', 
                isActive: ${isGeofencingActive},
                permissionStatus: 'granted',
                locationCount: ${updatedLocations.length},
                locations: ${JSON.stringify(updatedLocations)},
                platform: 'ios'
              }, '*');
              true;
            `);
          } catch (error) {
            console.error('[iOS HomeScreen] Error adding geofence:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_ADD_RESPONSE', 
                success: false,
                error: 'Failed to add location'
              }, '*');
              true;
            `);
          }
          break;

        case 'natively.geofence.remove':
          console.log('[iOS HomeScreen] ➖ Remove geofence:', data.locationId);
          try {
            await removeStoreLocation(data.locationId);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_REMOVE_RESPONSE', 
                success: true,
                locationId: '${data.locationId}'
              }, '*');
              true;
            `);
            
            const updatedLocations = await loadStoreLocations();
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCING_STATUS', 
                isActive: ${isGeofencingActive},
                permissionStatus: 'granted',
                locationCount: ${updatedLocations.length},
                locations: ${JSON.stringify(updatedLocations)},
                platform: 'ios'
              }, '*');
              true;
            `);
          } catch (error) {
            console.error('[iOS HomeScreen] Error removing geofence:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'GEOFENCE_REMOVE_RESPONSE', 
                success: false,
                error: 'Failed to remove location'
              }, '*');
              true;
            `);
          }
          break;

        case 'natively.geofence.getAll':
          console.log('[iOS HomeScreen] 📋 Get all monitored locations');
          const allLocations = await loadStoreLocations();
          console.log(`[iOS HomeScreen] Sending ${allLocations.length} locations to web`);
          webViewRef.current?.injectJavaScript(`
            window.postMessage({ 
              type: 'GEOFENCE_LIST_RESPONSE', 
              locations: ${JSON.stringify(allLocations)}
            }, '*');
            true;
          `);
          break;

        case 'natively.notifications.requestPermission':
          console.log('[iOS HomeScreen] 📲 Request notification permission');
          try {
            const granted = await notificationsHook.requestPermissions();
            console.log('[iOS HomeScreen] Notification permission result:', granted);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'NOTIFICATIONS_PERMISSION_RESPONSE', 
                granted: ${granted},
                status: '${granted ? 'granted' : 'denied'}'
              }, '*');
              true;
            `);
            
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'PERMISSIONS_STATUS', 
                contacts: '${contactsPermissionStatus}',
                location: '${locationPermissionStatus}',
                notifications: '${granted ? 'granted' : 'denied'}'
              }, '*');
              true;
            `);
          } catch (error) {
            console.error('[iOS HomeScreen] Error requesting notification permission:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'NOTIFICATIONS_PERMISSION_RESPONSE', 
                granted: false,
                status: 'denied',
                error: 'Failed to request permission'
              }, '*');
              true;
            `);
          }
          break;

        case 'natively.notifications.getStatus':
          console.log('[iOS HomeScreen] 📊 Get notification status');
          try {
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ 
                type: 'NOTIFICATIONS_STATUS_RESPONSE', 
                status: '${notificationsHook.permissionStatus}',
                granted: ${notificationsHook.permissionStatus === 'granted'}
              }, '*');
              true;
            `);
          } catch (error) {
            console.error('[iOS HomeScreen] Error getting notification status:', error);
          }
          break;

        case 'natively.offline.sync':
          console.log('[iOS HomeScreen] 🔄 Manual sync requested');
          try {
            await manualSync();
            await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ type: 'OFFLINE_SYNC_RESPONSE', success: true }, '*');
              true;
            `);
          } catch (error) {
            console.error('[iOS HomeScreen] Error syncing:', error);
            webViewRef.current?.injectJavaScript(`
              window.postMessage({ type: 'OFFLINE_SYNC_RESPONSE', success: false, error: 'Failed to sync' }, '*');
              true;
            `);
          }
          break;
        
        default:
          console.log('[iOS HomeScreen] ❓ Unknown message type:', data.type);
      }
    } catch (error) {
      console.error('[iOS HomeScreen] ❌ Error handling message:', error);
    }
  };

  const injectedJavaScript = `
    (function() {
      console.log('[ShopWell Native] ═══════════════════════════════════════');
      console.log('[ShopWell Native] Initializing native bridge...');
      console.log('[ShopWell Native] ═══════════════════════════════════════');
      
      window.isNativeApp = true;
      window.nativeAppPlatform = 'ios';
      window.nativeAppReady = false;
      window.nativelyMessageQueue = [];
      
      const originalPostMessage = window.postMessage;
      window.postMessage = function(message, targetOrigin) {
        if (typeof message === 'object' && message.type && message.type.startsWith('natively.')) {
          if (!window.nativeAppReady) {
            console.log('[ShopWell Native] ⏸️ Queueing message:', message.type);
            window.nativelyMessageQueue.push({ message, targetOrigin });
            return;
          }
        }
        originalPostMessage.call(window, message, targetOrigin);
      };
      
      window.addEventListener('message', function(event) {
        if (event.data && event.data.type === 'NATIVE_APP_READY') {
          console.log('[ShopWell Native] 🚀 Native app ready! Processing queue...');
          window.nativeAppReady = true;
          
          const queue = window.nativelyMessageQueue;
          window.nativelyMessageQueue = [];
          console.log('[ShopWell Native] 📦 Processing', queue.length, 'queued messages');
          queue.forEach(function(item) {
            console.log('[ShopWell Native] ▶️ Processing queued:', item.message.type);
            originalPostMessage.call(window, item.message, item.targetOrigin);
          });
          console.log('[ShopWell Native] ✅ Queue processed');
        }
      });
      
      setTimeout(function() {
        originalPostMessage.call(window, { 
          type: 'WEB_PAGE_READY',
          timestamp: Date.now()
        }, '*');
        console.log('[ShopWell Native] 📤 Sent WEB_PAGE_READY signal');
      }, 100);
      
      console.log('[ShopWell Native] ✅ Native bridge initialized');
      
      // Hide "Download App" menu item from More Options menu
      function hideDownloadAppMenuItem() {
        try {
          console.log('[ShopWell Native] 🔍 Searching for Download App menu item...');
          
          // Try multiple selectors to find the Download App menu item
          const selectors = [
            'a[href*="download"]',
            'button:contains("Download App")',
            '[data-action="download-app"]',
            '.download-app',
            '#download-app'
          ];
          
          selectors.forEach(function(selector) {
            try {
              const elements = document.querySelectorAll(selector);
              elements.forEach(function(element) {
                const text = element.textContent || element.innerText || '';
                if (text.toLowerCase().includes('download') && text.toLowerCase().includes('app')) {
                  console.log('[ShopWell Native] ✅ Found and hiding Download App menu item');
                  element.style.display = 'none';
                  // Also hide parent list item if it exists
                  const parentLi = element.closest('li');
                  if (parentLi) {
                    parentLi.style.display = 'none';
                  }
                }
              });
            } catch (e) {
              console.log('[ShopWell Native] Error with selector:', selector, e);
            }
          });
          
          // Also try to find by text content in all clickable elements
          const clickableElements = document.querySelectorAll('a, button, [role="button"], [role="menuitem"]');
          clickableElements.forEach(function(element) {
            const text = element.textContent || element.innerText || '';
            if (text.toLowerCase().includes('download') && text.toLowerCase().includes('app')) {
              console.log('[ShopWell Native] ✅ Found and hiding Download App element by text');
              element.style.display = 'none';
              const parentLi = element.closest('li');
              if (parentLi) {
                parentLi.style.display = 'none';
              }
            }
          });
        } catch (error) {
          console.error('[ShopWell Native] Error hiding Download App menu item:', error);
        }
      }
      
      // Run immediately
      hideDownloadAppMenuItem();
      
      // Run after DOM is fully loaded
      if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', hideDownloadAppMenuItem);
      } else {
        setTimeout(hideDownloadAppMenuItem, 500);
      }
      
      // Run periodically to catch dynamically added elements
      setInterval(hideDownloadAppMenuItem, 2000);
      
      // Watch for DOM changes
      if (typeof MutationObserver !== 'undefined') {
        const observer = new MutationObserver(function(mutations) {
          hideDownloadAppMenuItem();
        });
        observer.observe(document.body, { childList: true, subtree: true });
      }
    })();
    true;
  `;

  if (webViewError) {
    return (
      <View style={[styles.errorContainer, { paddingTop: insets.top }]}>
        <Stack.Screen options={{ headerShown: false }} />
        <Text style={styles.errorTitle}>Unable to Load ShopWell.ai</Text>
        <Text style={styles.errorMessage}>{webViewError}</Text>
        <Text style={styles.errorDetails}>Please check your internet connection and try again.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      <Stack.Screen options={{ headerShown: false }} />
      <WebView
          ref={webViewRef}
          source={{ uri: SHOPWELL_URL }}
          style={styles.webview}
          onMessage={handleMessage}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          startInLoadingState={true}
          pullToRefreshEnabled={true}
          sharedCookiesEnabled={true}
          injectedJavaScript={injectedJavaScript}
          onLoadStart={() => {
            console.log('[iOS HomeScreen] 🌐 WebView loading started...');
            console.log('[iOS HomeScreen] Loading URL:', SHOPWELL_URL);
            setWebViewLoaded(false);
            setWebViewError(null);
          }}
          onLoadEnd={() => {
            console.log('[iOS HomeScreen] ✅ WebView loaded successfully');
            setWebViewLoaded(true);
            if (webViewRef.current) {
              setTimeout(() => {
                try {
                  console.log('[iOS HomeScreen] 💉 Re-injecting JavaScript bridge...');
                  webViewRef.current?.injectJavaScript(injectedJavaScript);
                } catch (error) {
                  console.error('[iOS HomeScreen] ❌ Error re-injecting JS:', error);
                }
              }, 300);
            }
          }}
          onError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('[iOS HomeScreen] ❌ WebView error:', nativeEvent);
            setWebViewError(`Error loading website: ${nativeEvent.description || 'Unknown error'}`);
          }}
          onHttpError={(syntheticEvent) => {
            const { nativeEvent } = syntheticEvent;
            console.error('[iOS HomeScreen] ❌ HTTP error:', nativeEvent.statusCode);
            setWebViewError(`HTTP Error ${nativeEvent.statusCode}: Unable to load ShopWell.ai`);
          }}
          renderLoading={() => (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="large" color="#007AFF" />
              <Text style={styles.loadingText}>Loading ShopWell.ai...</Text>
            </View>
          )}
        />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  webview: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#ffffff',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#ffffff',
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333333',
    marginBottom: 12,
    textAlign: 'center',
  },
  errorMessage: {
    fontSize: 16,
    color: '#666666',
    marginBottom: 8,
    textAlign: 'center',
  },
  errorDetails: {
    fontSize: 14,
    color: '#999999',
    textAlign: 'center',
  },
});
