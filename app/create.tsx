
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { colors, commonStyles, buttonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useNotifications } from '@/hooks/useNotifications';

export default function CreateScreen() {
  const [listName, setListName] = useState('');
  const [listNameFocused, setListNameFocused] = useState(false);
  const { schedulePushNotification } = useNotifications();

  const createOptions = [
    {
      id: '1',
      title: 'Shopping List',
      description: 'Create a new shopping list',
      icon: 'list.bullet',
      androidIcon: 'list',
      color: colors.primary,
      action: () => handleCreateList(),
    },
    {
      id: '2',
      title: 'Scan Product',
      description: 'Scan a product barcode',
      icon: 'barcode.viewfinder',
      androidIcon: 'qr_code_scanner',
      color: colors.accent,
      action: () => {
        router.back();
        router.push('/(tabs)/(home)/scan');
      },
    },
    {
      id: '3',
      title: 'Search Products',
      description: 'Search for products',
      icon: 'magnifyingglass',
      androidIcon: 'search',
      color: colors.secondary,
      action: () => {
        router.back();
        router.push('/(tabs)/(home)/search');
      },
    },
  ];

  const handleCreateList = () => {
    if (!listName.trim()) {
      Alert.alert('Error', 'Please enter a list name');
      return;
    }

    // Create the list (this would normally save to backend)
    schedulePushNotification(
      'Shopping List Created!',
      `Your list "${listName}" has been created successfully.`
    );

    Alert.alert('Success', `Shopping list "${listName}" created!`, [
      {
        text: 'OK',
        onPress: () => {
          setListName('');
          router.back();
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => router.back()}
        >
          <IconSymbol
            ios_icon_name="xmark"
            android_material_icon_name="close"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Create New</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          <View style={styles.optionsContainer}>
            {createOptions.map((option, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.optionCard, { borderLeftColor: option.color }]}
                onPress={option.action}
              >
                <View style={[styles.optionIconContainer, { backgroundColor: option.color + '20' }]}>
                  <IconSymbol
                    ios_icon_name={option.icon}
                    android_material_icon_name={option.androidIcon}
                    size={28}
                    color={option.color}
                  />
                </View>
                <View style={styles.optionContent}>
                  <Text style={styles.optionTitle}>{option.title}</Text>
                  <Text style={styles.optionDescription}>{option.description}</Text>
                </View>
                <IconSymbol
                  ios_icon_name="chevron.right"
                  android_material_icon_name="chevron_right"
                  size={20}
                  color={colors.textSecondary}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Create Shopping List</Text>
          <View style={styles.formCard}>
            <View style={styles.inputContainer}>
              <IconSymbol
                ios_icon_name="list.bullet"
                android_material_icon_name="list"
                size={20}
                color={listNameFocused ? colors.primary : colors.textSecondary}
                style={styles.inputIcon}
              />
              <TextInput
                style={[
                  commonStyles.input,
                  styles.input,
                  listNameFocused && commonStyles.inputFocused,
                ]}
                placeholder="List name (e.g., Weekly Groceries)"
                placeholderTextColor={colors.textSecondary}
                value={listName}
                onChangeText={setListName}
                onFocus={() => setListNameFocused(true)}
                onBlur={() => setListNameFocused(false)}
              />
            </View>
            <TouchableOpacity
              style={buttonStyles.primary}
              onPress={handleCreateList}
            >
              <Text style={buttonStyles.textWhite}>Create List</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  optionsContainer: {
    gap: 12,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  optionIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  formCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  inputContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  inputIcon: {
    position: 'absolute',
    left: 16,
    top: 17,
    zIndex: 1,
  },
  input: {
    paddingLeft: 48,
  },
});
