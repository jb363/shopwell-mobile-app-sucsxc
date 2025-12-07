
import React from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity, Image } from 'react-native';
import { router } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';
import { colors, commonStyles, buttonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function HomeScreen() {
  const { user } = useAuth();

  const features = [
    {
      id: '1',
      title: 'Scan Products',
      description: 'Scan barcodes to get instant health insights',
      icon: 'barcode.viewfinder',
      androidIcon: 'qr_code_scanner',
      route: '/(tabs)/(home)/scan',
      color: colors.primary,
    },
    {
      id: '2',
      title: 'Shopping Lists',
      description: 'Create and manage your healthy shopping lists',
      icon: 'list.bullet',
      androidIcon: 'list',
      route: '/(tabs)/(home)/shopping-lists',
      color: colors.accent,
    },
    {
      id: '3',
      title: 'Product Search',
      description: 'Search and compare products',
      icon: 'magnifyingglass',
      androidIcon: 'search',
      route: '/(tabs)/(home)/search',
      color: colors.secondary,
    },
    {
      id: '4',
      title: 'Health Insights',
      description: 'View your nutrition trends and insights',
      icon: 'chart.bar.fill',
      androidIcon: 'bar_chart',
      route: '/(tabs)/(home)/insights',
      color: colors.primary,
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
          <View>
            <Text style={styles.greeting}>Hello, {user?.name || 'Guest'}!</Text>
            <Text style={styles.subtitle}>What would you like to do today?</Text>
          </View>
          <View style={styles.logoContainer}>
            <IconSymbol
              ios_icon_name="cart.fill"
              android_material_icon_name="shopping_cart"
              size={32}
              color={colors.primary}
            />
          </View>
        </View>

        <View style={styles.featuredCard}>
          <Image
            source={{ uri: 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=800' }}
            style={styles.featuredImage}
          />
          <View style={styles.featuredOverlay}>
            <Text style={styles.featuredTitle}>Shop Smarter</Text>
            <Text style={styles.featuredText}>
              Make healthier choices with AI-powered insights
            </Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Features</Text>
          <View style={styles.featuresGrid}>
            {features.map((feature, index) => (
              <TouchableOpacity
                key={index}
                style={[styles.featureCard, { borderLeftColor: feature.color }]}
                onPress={() => router.push(feature.route as any)}
              >
                <View style={[styles.featureIconContainer, { backgroundColor: feature.color + '20' }]}>
                  <IconSymbol
                    ios_icon_name={feature.icon}
                    android_material_icon_name={feature.androidIcon}
                    size={28}
                    color={feature.color}
                  />
                </View>
                <View style={styles.featureContent}>
                  <Text style={styles.featureTitle}>{feature.title}</Text>
                  <Text style={styles.featureDescription}>{feature.description}</Text>
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
          <Text style={styles.sectionTitle}>Quick Stats</Text>
          <View style={styles.statsContainer}>
            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="checkmark.circle.fill"
                android_material_icon_name="check_circle"
                size={32}
                color={colors.success}
              />
              <Text style={styles.statValue}>24</Text>
              <Text style={styles.statLabel}>Products Scanned</Text>
            </View>
            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="list.bullet.circle.fill"
                android_material_icon_name="list"
                size={32}
                color={colors.primary}
              />
              <Text style={styles.statValue}>3</Text>
              <Text style={styles.statLabel}>Shopping Lists</Text>
            </View>
            <View style={styles.statCard}>
              <IconSymbol
                ios_icon_name="heart.circle.fill"
                android_material_icon_name="favorite"
                size={32}
                color={colors.accent}
              />
              <Text style={styles.statValue}>85%</Text>
              <Text style={styles.statLabel}>Health Score</Text>
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingTop: 60,
    paddingBottom: 100,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  greeting: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
  },
  logoContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featuredCard: {
    marginHorizontal: 20,
    marginBottom: 24,
    borderRadius: 20,
    overflow: 'hidden',
    height: 180,
  },
  featuredImage: {
    width: '100%',
    height: '100%',
  },
  featuredOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  featuredTitle: {
    fontSize: 24,
    fontWeight: '800',
    color: '#FFFFFF',
    marginBottom: 4,
  },
  featuredText: {
    fontSize: 14,
    color: '#FFFFFF',
  },
  section: {
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  featuresGrid: {
    gap: 12,
  },
  featureCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderLeftWidth: 4,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  featureIconContainer: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  featureContent: {
    flex: 1,
  },
  featureTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  featureDescription: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  statValue: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: 'center',
  },
});
