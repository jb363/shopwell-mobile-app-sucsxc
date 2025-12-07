
import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { router } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

export default function InsightsScreen() {
  const insights = [
    {
      title: 'Weekly Health Score',
      value: '85',
      change: '+5',
      positive: true,
      icon: 'heart.fill',
      androidIcon: 'favorite',
    },
    {
      title: 'Products Scanned',
      value: '24',
      change: '+8',
      positive: true,
      icon: 'barcode.viewfinder',
      androidIcon: 'qr_code_scanner',
    },
    {
      title: 'Healthy Choices',
      value: '18',
      change: '+6',
      positive: true,
      icon: 'checkmark.circle.fill',
      androidIcon: 'check_circle',
    },
    {
      title: 'Avg. Calories',
      value: '1,850',
      change: '-150',
      positive: true,
      icon: 'flame.fill',
      androidIcon: 'local_fire_department',
    },
  ];

  const nutritionBreakdown = [
    { label: 'Protein', value: 65, color: colors.primary },
    { label: 'Carbs', value: 45, color: colors.secondary },
    { label: 'Fats', value: 30, color: colors.accent },
    { label: 'Fiber', value: 80, color: colors.success },
  ];

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
        <Text style={styles.headerTitle}>Health Insights</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>This Week</Text>
          <View style={styles.insightsGrid}>
            {insights.map((insight, index) => (
              <View key={index} style={styles.insightCard}>
                <View style={[styles.insightIconContainer, { backgroundColor: colors.primary + '20' }]}>
                  <IconSymbol
                    ios_icon_name={insight.icon}
                    android_material_icon_name={insight.androidIcon}
                    size={24}
                    color={colors.primary}
                  />
                </View>
                <Text style={styles.insightTitle}>{insight.title}</Text>
                <Text style={styles.insightValue}>{insight.value}</Text>
                <View style={styles.insightChange}>
                  <IconSymbol
                    ios_icon_name={insight.positive ? 'arrow.up' : 'arrow.down'}
                    android_material_icon_name={insight.positive ? 'arrow_upward' : 'arrow_downward'}
                    size={14}
                    color={insight.positive ? colors.success : colors.error}
                  />
                  <Text
                    style={[
                      styles.insightChangeText,
                      { color: insight.positive ? colors.success : colors.error },
                    ]}
                  >
                    {insight.change}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Nutrition Breakdown</Text>
          <View style={styles.nutritionCard}>
            {nutritionBreakdown.map((item, index) => (
              <View key={index} style={styles.nutritionItem}>
                <View style={styles.nutritionHeader}>
                  <Text style={styles.nutritionLabel}>{item.label}</Text>
                  <Text style={styles.nutritionValue}>{item.value}%</Text>
                </View>
                <View style={styles.nutritionBar}>
                  <View
                    style={[
                      styles.nutritionFill,
                      { width: `${item.value}%`, backgroundColor: item.color },
                    ]}
                  />
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Recommendations</Text>
          <View style={styles.recommendationCard}>
            <IconSymbol
              ios_icon_name="lightbulb.fill"
              android_material_icon_name="lightbulb"
              size={32}
              color={colors.secondary}
            />
            <Text style={styles.recommendationTitle}>Great Progress!</Text>
            <Text style={styles.recommendationText}>
              You&apos;re making healthier choices this week. Keep up the good work by
              maintaining your current shopping habits.
            </Text>
          </View>
          <View style={styles.recommendationCard}>
            <IconSymbol
              ios_icon_name="leaf.fill"
              android_material_icon_name="eco"
              size={32}
              color={colors.accent}
            />
            <Text style={styles.recommendationTitle}>Try More Greens</Text>
            <Text style={styles.recommendationText}>
              Consider adding more leafy vegetables to your diet for better fiber
              intake and overall health.
            </Text>
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
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  insightsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  insightCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  insightIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },
  insightTitle: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  insightValue: {
    fontSize: 28,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  insightChange: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  insightChangeText: {
    fontSize: 14,
    fontWeight: '600',
  },
  nutritionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    gap: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  nutritionItem: {
    gap: 8,
  },
  nutritionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  nutritionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text,
  },
  nutritionValue: {
    fontSize: 16,
    fontWeight: '700',
    color: colors.text,
  },
  nutritionBar: {
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  nutritionFill: {
    height: '100%',
    borderRadius: 4,
  },
  recommendationCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 12,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginTop: 12,
    marginBottom: 8,
  },
  recommendationText: {
    fontSize: 14,
    color: colors.textSecondary,
    lineHeight: 20,
  },
});
