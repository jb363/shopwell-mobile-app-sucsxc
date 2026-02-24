
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Modal,
  Platform,
} from 'react-native';
import { useGeofencing } from '@/hooks/useGeofencing';
import { StoreLocation } from '@/utils/locationHandler';
import * as LocationHandler from '@/utils/locationHandler';
import { IconSymbol } from './IconSymbol';
import { colors } from '@/styles/commonStyles';

interface StoreLocationManagerProps {
  visible: boolean;
  onClose: () => void;
}

export default function StoreLocationManager({ visible, onClose }: StoreLocationManagerProps) {
  const {
    isActive,
    hasPermission,
    storeLocations,
    startGeofencing,
    stopGeofencing,
    addStoreLocation,
    removeStoreLocation,
  } = useGeofencing();

  const [showAddForm, setShowAddForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    listName: '',
    listImage: '',
    reservationNumber: '',
    radius: '100',
  });

  const handleRequestPermission = async () => {
    console.log('User tapped Request Location Permission button');
    setLoading(true);
    const granted = await LocationHandler.requestLocationPermission();
    setLoading(false);
    
    if (granted) {
      console.log('Location permission granted');
      Alert.alert('Success', 'Location permission granted! You can now add store locations.');
    } else {
      console.log('Location permission denied');
      Alert.alert(
        'Permission Required',
        'Location permission is required for location-based notifications. Please enable it in your device settings.'
      );
    }
  };

  const handleToggleGeofencing = async () => {
    console.log('User tapped Toggle Geofencing button');
    setLoading(true);
    
    if (isActive) {
      await stopGeofencing();
      console.log('Geofencing stopped');
    } else {
      const started = await startGeofencing();
      if (started) {
        console.log('Geofencing started');
      } else {
        Alert.alert('Error', 'Failed to start geofencing. Please check permissions and add store locations.');
      }
    }
    
    setLoading(false);
  };

  const handleUseCurrentLocation = async () => {
    console.log('User tapped Use Current Location button');
    setLoading(true);
    const location = await LocationHandler.getCurrentLocation();
    setLoading(false);

    if (location) {
      const newStore: StoreLocation = {
        id: `store-${Date.now()}`,
        name: formData.name || 'My Store',
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        radius: parseInt(formData.radius) || 100,
        listName: formData.listName || undefined,
        listImage: formData.listImage || undefined,
        reservationNumber: formData.reservationNumber || undefined,
      };

      await addStoreLocation(newStore);
      console.log('Store location added:', newStore.name);
      
      setFormData({
        name: '',
        listName: '',
        listImage: '',
        reservationNumber: '',
        radius: '100',
      });
      setShowAddForm(false);
      
      Alert.alert('Success', `Added location for ${newStore.name}`);
    } else {
      Alert.alert('Error', 'Failed to get current location. Please try again.');
    }
  };

  const handleRemoveStore = async (storeId: string, storeName: string) => {
    console.log('User tapped Remove Store button:', storeName);
    
    if (Platform.OS === 'web') {
      const confirmed = window.confirm(`Remove ${storeName}?`);
      if (confirmed) {
        await removeStoreLocation(storeId);
        console.log('Store location removed:', storeName);
      }
    } else {
      Alert.alert(
        'Remove Location',
        `Remove ${storeName}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Remove',
            style: 'destructive',
            onPress: async () => {
              await removeStoreLocation(storeId);
              console.log('Store location removed:', storeName);
            },
          },
        ]
      );
    }
  };

  const statusText = isActive ? 'Active' : 'Inactive';
  const permissionText = hasPermission ? 'Granted' : 'Not Granted';
  const storeCountText = `${storeLocations.length}`;

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.title}>Location-Based Notifications</Text>
          <TouchableOpacity onPress={onClose} style={styles.closeButton}>
            <IconSymbol
              ios_icon_name="xmark"
              android_material_icon_name="close"
              size={24}
              color={colors.text}
            />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.content}>
          {/* Status Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Status</Text>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Geofencing:</Text>
              <Text style={[styles.statusValue, isActive && styles.statusActive]}>
                {statusText}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Permission:</Text>
              <Text style={[styles.statusValue, hasPermission && styles.statusActive]}>
                {permissionText}
              </Text>
            </View>
            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Store Locations:</Text>
              <Text style={styles.statusValue}>{storeCountText}</Text>
            </View>
          </View>

          {/* Permission Section */}
          {!hasPermission && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Setup Required</Text>
              <Text style={styles.description}>
                Location permission is required to send you notifications when you're near stores with active lists.
              </Text>
              <TouchableOpacity
                style={styles.primaryButton}
                onPress={handleRequestPermission}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>Grant Permission</Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Controls Section */}
          {hasPermission && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Controls</Text>
              <TouchableOpacity
                style={[styles.primaryButton, isActive && styles.dangerButton]}
                onPress={handleToggleGeofencing}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryButtonText}>
                    {isActive ? 'Stop Monitoring' : 'Start Monitoring'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>
          )}

          {/* Store Locations Section */}
          {hasPermission && (
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Store Locations</Text>
                <TouchableOpacity
                  style={styles.addButton}
                  onPress={() => setShowAddForm(!showAddForm)}
                >
                  <IconSymbol
                    ios_icon_name={showAddForm ? 'minus' : 'plus'}
                    android_material_icon_name={showAddForm ? 'remove' : 'add'}
                    size={20}
                    color="#fff"
                  />
                </TouchableOpacity>
              </View>

              {showAddForm && (
                <View style={styles.form}>
                  <TextInput
                    style={styles.input}
                    placeholder="Store Name (e.g., Costco)"
                    placeholderTextColor="#999"
                    value={formData.name}
                    onChangeText={(text) => setFormData({ ...formData, name: text })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="List Name (optional)"
                    placeholderTextColor="#999"
                    value={formData.listName}
                    onChangeText={(text) => setFormData({ ...formData, listName: text })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Reservation Number (optional)"
                    placeholderTextColor="#999"
                    value={formData.reservationNumber}
                    onChangeText={(text) => setFormData({ ...formData, reservationNumber: text })}
                  />
                  <TextInput
                    style={styles.input}
                    placeholder="Radius (meters)"
                    placeholderTextColor="#999"
                    keyboardType="numeric"
                    value={formData.radius}
                    onChangeText={(text) => setFormData({ ...formData, radius: text })}
                  />
                  <TouchableOpacity
                    style={styles.primaryButton}
                    onPress={handleUseCurrentLocation}
                    disabled={loading}
                  >
                    {loading ? (
                      <ActivityIndicator color="#fff" />
                    ) : (
                      <Text style={styles.primaryButtonText}>Use Current Location</Text>
                    )}
                  </TouchableOpacity>
                </View>
              )}

              {storeLocations.length === 0 ? (
                <Text style={styles.emptyText}>No store locations added yet</Text>
              ) : (
                storeLocations.map((store) => {
                  const radiusText = `${store.radius}m`;
                  return (
                    <View key={store.id} style={styles.storeCard}>
                      <View style={styles.storeInfo}>
                        <Text style={styles.storeName}>{store.name}</Text>
                        {store.listName && (
                          <Text style={styles.storeDetail}>📋 {store.listName}</Text>
                        )}
                        {store.reservationNumber && (
                          <Text style={styles.storeDetail}>
                            🎫 Reservation #{store.reservationNumber}
                          </Text>
                        )}
                        <Text style={styles.storeDetail}>📍 Radius: {radiusText}</Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveStore(store.id, store.name)}
                        style={styles.removeButton}
                      >
                        <IconSymbol
                          ios_icon_name="trash"
                          android_material_icon_name="delete"
                          size={20}
                          color="#ff3b30"
                        />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </View>
          )}

          {/* Info Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>How It Works</Text>
            <Text style={styles.description}>
              1. Add store locations where you have shopping lists or reservations{'\n'}
              2. Enable location monitoring{'\n'}
              3. Get notified when you're near a store with an active list{'\n'}
              4. Tap the notification to view your list or reservation
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingTop: Platform.OS === 'android' ? 48 : 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text,
  },
  closeButton: {
    padding: 8,
  },
  content: {
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
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
    marginBottom: 12,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statusLabel: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statusValue: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
  },
  statusActive: {
    color: '#34c759',
  },
  primaryButton: {
    backgroundColor: '#007aff',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  dangerButton: {
    backgroundColor: '#ff3b30',
  },
  addButton: {
    backgroundColor: '#007aff',
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  form: {
    marginTop: 12,
  },
  input: {
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    fontSize: 16,
    color: colors.text,
    borderWidth: 1,
    borderColor: colors.border,
  },
  emptyText: {
    fontSize: 14,
    color: colors.textSecondary,
    textAlign: 'center',
    marginTop: 12,
  },
  storeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.cardBackground,
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  storeInfo: {
    flex: 1,
  },
  storeName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
    marginBottom: 4,
  },
  storeDetail: {
    fontSize: 14,
    color: colors.textSecondary,
    marginTop: 2,
  },
  removeButton: {
    padding: 8,
  },
});
