
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles, buttonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useNotifications } from '@/hooks/useNotifications';

export default function ProfileScreen() {
  const { user, logout } = useAuth();
  const { expoPushToken, schedulePushNotification } = useNotifications();

  const handleLogout = () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await logout();
            router.replace('/(auth)/login');
          },
        },
      ]
    );
  };

  const handleTestNotification = () => {
    schedulePushNotification(
      'Test Notification',
      'This is a test notification from ShopWell.ai!'
    );
    Alert.alert('Success', 'Test notification scheduled!');
  };

  const menuItems = [
    {
      title: 'Account Settings',
      icon: 'person.circle.fill',
      androidIcon: 'account_circle',
      onPress: () => Alert.alert('Account Settings', 'Coming soon!'),
    },
    {
      title: 'Notifications',
      icon: 'bell.fill',
      androidIcon: 'notifications',
      onPress: () => Alert.alert('Notifications', 'Coming soon!'),
    },
    {
      title: 'Privacy & Security',
      icon: 'lock.shield.fill',
      androidIcon: 'security',
      onPress: () => Alert.alert('Privacy & Security', 'Coming soon!'),
    },
    {
      title: 'Help & Support',
      icon: 'questionmark.circle.fill',
      androidIcon: 'help',
      onPress: () => Alert.alert('Help & Support', 'Coming soon!'),
    },
    {
      title: 'About',
      icon: 'info.circle.fill',
      androidIcon: 'info',
      onPress: () => Alert.alert('About', 'ShopWell.ai v1.0.0'),
    },
  ];

  return (
    <View style={styles.container}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <IconSymbol
              ios_icon_name="person.fill"
              android_material_icon_name="person"
              size={48}
              color={colors.primary}
            />
          </View>
          <Text style={styles.userName}>{user?.name || 'Guest'}</Text>
          <Text style={styles.userEmail}>{user?.email || 'guest@shopwell.ai'}</Text>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Settings</Text>
          <View style={styles.menuContainer}>
            {menuItems.map((item, index) => (
              <TouchableOpacity
                key={index}
                style={styles.menuItem}
                onPress={item.onPress}
              >
                <View style={styles.menuIconContainer}>
                  <IconSymbol
                    ios_icon_name={item.icon}
                    android_material_icon_name={item.androidIcon}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.menuTitle}>{item.title}</Text>
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
          <Text style={styles.sectionTitle}>Developer</Text>
          <TouchableOpacity
            style={[buttonStyles.outline, styles.testButton]}
            onPress={handleTestNotification}
          >
            <IconSymbol
              ios_icon_name="bell.badge.fill"
              android_material_icon_name="notifications_active"
              size={20}
              color={colors.primary}
            />
            <Text style={[buttonStyles.text, { marginLeft: 8 }]}>
              Test Notification
            </Text>
          </TouchableOpacity>
          {expoPushToken && (
            <Text style={styles.tokenText} numberOfLines={2}>
              Push Token: {expoPushToken.substring(0, 40)}...
            </Text>
          )}
        </View>

        <TouchableOpacity
          style={[buttonStyles.primary, styles.logoutButton, { backgroundColor: colors.error }]}
          onPress={handleLogout}
        >
          <IconSymbol
            ios_icon_name="arrow.right.square.fill"
            android_material_icon_name="logout"
            size={20}
            color="#FFFFFF"
          />
          <Text style={[buttonStyles.textWhite, { marginLeft: 8 }]}>Logout</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 32,
    backgroundColor: colors.card,
    marginBottom: 24,
  },
  avatarContainer: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  userName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  userEmail: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
  },
  menuContainer: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  menuIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  menuTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  testButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  tokenText: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  logoutButton: {
    marginHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
