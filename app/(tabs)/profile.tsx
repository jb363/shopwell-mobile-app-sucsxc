
import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform } from 'react-native';
import { Stack } from 'expo-router';
import { IconSymbol } from '@/components/IconSymbol';
import { colors } from '@/styles/commonStyles';
import { useGeofencing } from '@/hooks/useGeofencing';
import StoreLocationManager from '@/components/StoreLocationManager';

export default function ProfileScreen() {
  const [showLocationManager, setShowLocationManager] = React.useState(false);
  const { isActive, hasPermission, storeLocations } = useGeofencing();

  const statusText = isActive ? 'Active' : 'Inactive';
  const permissionText = hasPermission ? 'Granted' : 'Not Granted';
  const storeCountText = `${storeLocations.length}`;

  return (
    <View style={styles.container}>
      <Stack.Screen 
        options={{ 
          title: 'Profile',
          headerShown: true,
        }} 
      />
      
      <ScrollView style={styles.scrollView}>
        {/* Location-Based Notifications Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <IconSymbol
              ios_icon_name="location.fill"
              android_material_icon_name="location-on"
              size={24}
              color={colors.primary}
            />
            <Text style={styles.sectionTitle}>Location-Based Notifications</Text>
          </View>
          
          <Text style={styles.sectionDescription}>
            Get notified when you're near stores with active shopping lists or trip reservations.
          </Text>

          {/* Status Cards */}
          <View style={styles.statusContainer}>
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={[styles.statusValue, isActive && styles.statusActive]}>
                {statusText}
              </Text>
            </View>
            
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Permission</Text>
              <Text style={[styles.statusValue, hasPermission && styles.statusActive]}>
                {permissionText}
              </Text>
            </View>
            
            <View style={styles.statusCard}>
              <Text style={styles.statusLabel}>Locations</Text>
              <Text style={styles.statusValue}>{storeCountText}</Text>
            </View>
          </View>

          {/* Manage Button */}
          <TouchableOpacity
            style={styles.manageButton}
            onPress={() => {
              console.log('User tapped Manage Locations button');
              setShowLocationManager(true);
            }}
          >
            <IconSymbol
              ios_icon_name="gear"
              android_material_icon_name="settings"
              size={20}
              color="#fff"
            />
            <Text style={styles.manageButtonText}>Manage Locations</Text>
          </TouchableOpacity>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <IconSymbol
              ios_icon_name="info.circle"
              android_material_icon_name="info"
              size={20}
              color={colors.primary}
            />
            <Text style={styles.infoText}>
              Lists and trips with addresses will automatically trigger notifications when you're nearby.
            </Text>
          </View>
        </View>

        {/* App Info Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>About</Text>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>App Version</Text>
            <Text style={styles.infoValue}>1.0.0</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Platform</Text>
            <Text style={styles.infoValue}>{Platform.OS}</Text>
          </View>
        </View>
      </ScrollView>

      {/* Location Manager Modal */}
      <StoreLocationManager
        visible={showLocationManager}
        onClose={() => setShowLocationManager(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: colors.text,
    marginLeft: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 16,
  },
  statusContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  statusCard: {
    flex: 1,
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
  },
  statusLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  statusValue: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  statusActive: {
    color: '#34c759',
  },
  manageButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  manageButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  infoBox: {
    flexDirection: 'row',
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: colors.primary,
  },
  infoText: {
    flex: 1,
    fontSize: 13,
    color: colors.textSecondary,
    lineHeight: 18,
    marginLeft: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 16,
    color: colors.text,
  },
  infoValue: {
    fontSize: 16,
    color: colors.textSecondary,
  },
});
