
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Switch,
} from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles, buttonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useNotifications } from '@/hooks/useNotifications';

export default function SettingsScreen() {
  const { user, logout } = useAuth();
  const { expoPushToken } = useNotifications();
  const [notificationsEnabled, setNotificationsEnabled] = React.useState(true);
  const [darkModeEnabled, setDarkModeEnabled] = React.useState(false);

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

  const settingsSections = [
    {
      title: 'Account',
      items: [
        {
          icon: 'person.fill',
          androidIcon: 'person',
          label: 'Profile',
          value: user?.name || 'Guest',
          onPress: () => Alert.alert('Profile', 'Profile settings coming soon'),
        },
        {
          icon: 'envelope.fill',
          androidIcon: 'email',
          label: 'Email',
          value: user?.email || 'Not set',
          onPress: () => Alert.alert('Email', 'Email settings coming soon'),
        },
      ],
    },
    {
      title: 'Preferences',
      items: [
        {
          icon: 'bell.fill',
          androidIcon: 'notifications',
          label: 'Notifications',
          value: notificationsEnabled,
          isSwitch: true,
          onToggle: (value: boolean) => {
            setNotificationsEnabled(value);
            Alert.alert(
              'Notifications',
              value ? 'Notifications enabled' : 'Notifications disabled'
            );
          },
        },
        {
          icon: 'moon.fill',
          androidIcon: 'dark_mode',
          label: 'Dark Mode',
          value: darkModeEnabled,
          isSwitch: true,
          onToggle: (value: boolean) => {
            setDarkModeEnabled(value);
            Alert.alert('Dark Mode', 'Dark mode coming soon');
          },
        },
      ],
    },
    {
      title: 'App Info',
      items: [
        {
          icon: 'info.circle.fill',
          androidIcon: 'info',
          label: 'About',
          value: 'Version 1.0.0',
          onPress: () => Alert.alert('About', 'ShopWell.ai v1.0.0\nShop Smarter, Live Healthier'),
        },
        {
          icon: 'doc.text.fill',
          androidIcon: 'description',
          label: 'Privacy Policy',
          value: '',
          onPress: () => Alert.alert('Privacy Policy', 'Privacy policy coming soon'),
        },
        {
          icon: 'checkmark.shield.fill',
          androidIcon: 'verified_user',
          label: 'Terms of Service',
          value: '',
          onPress: () => Alert.alert('Terms of Service', 'Terms of service coming soon'),
        },
      ],
    },
  ];

  if (expoPushToken) {
    console.log('Push token available:', expoPushToken);
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
        >
          <IconSymbol
            ios_icon_name="chevron.left"
            android_material_icon_name="arrow_back"
            size={24}
            color={colors.text}
          />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Settings</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.profileCard}>
          <View style={styles.avatarContainer}>
            <IconSymbol
              ios_icon_name="person.fill"
              android_material_icon_name="person"
              size={48}
              color={colors.primary}
            />
          </View>
          <Text style={styles.profileName}>{user?.name || 'Guest User'}</Text>
          <Text style={styles.profileEmail}>{user?.email || 'guest@shopwell.ai'}</Text>
        </View>

        {settingsSections.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            <View style={styles.settingsCard}>
              {section.items.map((item, itemIndex) => (
                <React.Fragment key={itemIndex}>
                  <TouchableOpacity
                    style={styles.settingItem}
                    onPress={item.onPress}
                    disabled={item.isSwitch}
                  >
                    <View style={styles.settingLeft}>
                      <View style={styles.settingIconContainer}>
                        <IconSymbol
                          ios_icon_name={item.icon}
                          android_material_icon_name={item.androidIcon}
                          size={20}
                          color={colors.primary}
                        />
                      </View>
                      <Text style={styles.settingLabel}>{item.label}</Text>
                    </View>
                    <View style={styles.settingRight}>
                      {item.isSwitch ? (
                        <Switch
                          value={item.value as boolean}
                          onValueChange={item.onToggle}
                          trackColor={{ false: colors.border, true: colors.primary + '80' }}
                          thumbColor={item.value ? colors.primary : colors.card}
                        />
                      ) : (
                        <>
                          {item.value && (
                            <Text style={styles.settingValue}>{item.value}</Text>
                          )}
                          <IconSymbol
                            ios_icon_name="chevron.right"
                            android_material_icon_name="chevron_right"
                            size={20}
                            color={colors.textSecondary}
                          />
                        </>
                      )}
                    </View>
                  </TouchableOpacity>
                  {itemIndex < section.items.length - 1 && (
                    <View style={styles.divider} />
                  )}
                </React.Fragment>
              ))}
            </View>
          </View>
        ))}

        <TouchableOpacity
          style={[buttonStyles.outline, styles.logoutButton, { borderColor: colors.error }]}
          onPress={handleLogout}
        >
          <IconSymbol
            ios_icon_name="arrow.right.square.fill"
            android_material_icon_name="logout"
            size={20}
            color={colors.error}
          />
          <Text style={[buttonStyles.text, { color: colors.error, marginLeft: 8 }]}>
            Logout
          </Text>
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
  backButton: {
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
  profileCard: {
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
    marginBottom: 24,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 3,
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
  profileName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  profileEmail: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  settingsCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  settingValue: {
    fontSize: 14,
    color: colors.textSecondary,
    maxWidth: 150,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginLeft: 68,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
  },
});
