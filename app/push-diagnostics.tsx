
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { Stack } from 'expo-router';
import { colors } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface PushSubscription {
  id: string;
  user_id: string;
  token: string;
  platform: string;
  created_at: string;
  updated_at: string;
}

export default function PushDiagnosticsScreen() {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [subscription, setSubscription] = useState<PushSubscription | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionStatus, setPermissionStatus] = useState<string>('unknown');

  const loadSubscriptionData = async () => {
    console.log('[PushDiagnostics] 🔍 Loading subscription data...');

    try {
      setError(null);

      // Check notification permission status
      let Notifications: any;
      try {
        Notifications = require('expo-notifications');
        const { status } = await Notifications.getPermissionsAsync();
        setPermissionStatus(status);
        console.log('[PushDiagnostics] Permission status:', status);
      } catch (err) {
        console.warn('[PushDiagnostics] Notifications module not available:', err);
        setPermissionStatus('unavailable');
      }

      // TODO: Backend Integration - GET /api/push-subscriptions/me
      // This endpoint should return the current user's push subscription:
      // Response: { id, user_id, token, platform, created_at, updated_at }
      // For now, we'll show a placeholder

      // Simulated data for demonstration
      const mockSubscription: PushSubscription = {
        id: 'sub_' + Math.random().toString(36).substr(2, 9),
        user_id: 'user_' + Math.random().toString(36).substr(2, 9),
        token: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
        platform: Platform.OS,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      setSubscription(mockSubscription);
      console.log('[PushDiagnostics] ✅ Subscription loaded');
    } catch (err) {
      console.error('[PushDiagnostics] ❌ Error loading subscription:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadSubscriptionData();
  }, []);

  const handleRefresh = () => {
    setRefreshing(true);
    loadSubscriptionData();
  };

  const requestPermission = async () => {
    console.log('[PushDiagnostics] 📱 Requesting notification permission...');

    try {
      let Notifications: any;
      try {
        Notifications = require('expo-notifications');
      } catch (err) {
        setError('Notifications module not available');
        return;
      }

      const { status } = await Notifications.requestPermissionsAsync();
      setPermissionStatus(status);
      console.log('[PushDiagnostics] Permission result:', status);

      if (status === 'granted') {
        // Get push token
        const tokenData = await Notifications.getExpoPushTokenAsync();
        console.log('[PushDiagnostics] ✅ Push token:', tokenData.data);

        // TODO: Backend Integration - POST /api/push-subscriptions
        // Body: { token: string, platform: string }
        // Response: { id, user_id, token, platform, created_at, updated_at }

        // Reload subscription data
        await loadSubscriptionData();
      }
    } catch (err) {
      console.error('[PushDiagnostics] ❌ Error requesting permission:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const testNotification = async () => {
    console.log('[PushDiagnostics] 🧪 Testing notification...');

    try {
      let Notifications: any;
      try {
        Notifications = require('expo-notifications');
      } catch (err) {
        setError('Notifications module not available');
        return;
      }

      // Schedule a local notification for testing
      await Notifications.scheduleNotificationAsync({
        content: {
          title: 'Test Notification',
          body: 'This is a test notification from ShopWell.ai',
          data: { test: true },
        },
        trigger: null, // Show immediately
      });

      console.log('[PushDiagnostics] ✅ Test notification sent');
    } catch (err) {
      console.error('[PushDiagnostics] ❌ Error sending test notification:', err);
      setError(err instanceof Error ? err.message : 'Unknown error');
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const dateStr = date.toLocaleDateString();
    const timeStr = date.toLocaleTimeString();
    return `${dateStr} ${timeStr}`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'granted':
        return '#4CAF50';
      case 'denied':
        return '#f44336';
      case 'undetermined':
        return '#FF9800';
      default:
        return '#999999';
    }
  };

  if (loading) {
    return (
      <>
        <Stack.Screen
          options={{
            title: 'Push Notifications',
            headerShown: true,
            headerBackTitle: 'Back',
          }}
        />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Loading subscription data...</Text>
        </View>
      </>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: 'Push Notifications',
          headerShown: true,
          headerBackTitle: 'Back',
        }}
      />

      <ScrollView
        style={styles.container}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Permission Status */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Permission Status</Text>
          <View style={styles.card}>
            <View style={styles.statusRow}>
              <IconSymbol
                ios_icon_name="bell.fill"
                android_material_icon_name="notifications"
                size={24}
                color={getStatusColor(permissionStatus)}
              />
              <View style={styles.statusInfo}>
                <Text style={styles.statusLabel}>Current Status</Text>
                <Text
                  style={[
                    styles.statusValue,
                    { color: getStatusColor(permissionStatus) },
                  ]}
                >
                  {permissionStatus.toUpperCase()}
                </Text>
              </View>
            </View>

            {permissionStatus !== 'granted' && (
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#4CAF50' }]}
                onPress={requestPermission}
              >
                <IconSymbol
                  ios_icon_name="checkmark.circle.fill"
                  android_material_icon_name="check-circle"
                  size={20}
                  color="#ffffff"
                />
                <Text style={styles.actionButtonText}>Request Permission</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Subscription Info */}
        {subscription && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Subscription Details</Text>
            <View style={styles.card}>
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Platform</Text>
                <Text style={styles.infoValue}>{subscription.platform}</Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Token</Text>
                <Text style={styles.infoValueMono} numberOfLines={1}>
                  {subscription.token}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Created</Text>
                <Text style={styles.infoValue}>
                  {formatDate(subscription.created_at)}
                </Text>
              </View>

              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Last Updated</Text>
                <Text style={styles.infoValue}>
                  {formatDate(subscription.updated_at)}
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* Test Actions */}
        {permissionStatus === 'granted' && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Test Actions</Text>
            <View style={styles.card}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: '#2196F3' }]}
                onPress={testNotification}
              >
                <IconSymbol
                  ios_icon_name="paperplane.fill"
                  android_material_icon_name="send"
                  size={20}
                  color="#ffffff"
                />
                <Text style={styles.actionButtonText}>
                  Send Test Notification
                </Text>
              </TouchableOpacity>

              <Text style={styles.testNote}>
                This will send a local test notification to verify that
                notifications are working on your device.
              </Text>
            </View>
          </View>
        )}

        {/* Error Display */}
        {error && (
          <View style={styles.section}>
            <View style={[styles.card, styles.errorCard]}>
              <IconSymbol
                ios_icon_name="exclamationmark.triangle.fill"
                android_material_icon_name="warning"
                size={24}
                color="#f44336"
              />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          </View>
        )}

        {/* Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Troubleshooting</Text>
          <View style={styles.card}>
            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Android:</Text> If notifications
              don't appear in the system tray, ensure the FCM payload includes
              the "notification" field (not just "data").
            </Text>

            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>iOS:</Text> Push notifications
              require a physical device and proper APNs configuration. They
              don't work in the simulator.
            </Text>

            <Text style={styles.infoText}>
              <Text style={styles.infoBold}>Token Registration:</Text> Your
              push token should be automatically sent to the backend when you
              grant permission.
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  content: {
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666666',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666666',
    marginBottom: 8,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  statusInfo: {
    marginLeft: 12,
    flex: 1,
  },
  statusLabel: {
    fontSize: 14,
    color: '#666666',
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  infoLabel: {
    fontSize: 14,
    color: '#666666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 14,
    color: '#333333',
    fontWeight: '600',
  },
  infoValueMono: {
    fontSize: 12,
    color: '#333333',
    fontWeight: '600',
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
    flex: 1,
    textAlign: 'right',
    marginLeft: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginTop: 12,
    gap: 8,
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  testNote: {
    fontSize: 13,
    color: '#999999',
    marginTop: 12,
    lineHeight: 18,
  },
  errorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    borderColor: '#f44336',
    borderWidth: 1,
  },
  errorText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 14,
    color: '#c62828',
    lineHeight: 20,
  },
  infoText: {
    fontSize: 14,
    color: '#666666',
    lineHeight: 20,
    marginBottom: 12,
  },
  infoBold: {
    fontWeight: '700',
    color: '#333333',
  },
});
