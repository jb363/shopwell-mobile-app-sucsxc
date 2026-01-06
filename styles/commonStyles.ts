
import { StyleSheet } from 'react-native';
import { shopWellColors } from '@/constants/Colors';

export const colors = {
  // ShopWell.ai Brand Colors
  primary: shopWellColors.cyan,
  secondary: shopWellColors.magenta,
  accent: shopWellColors.purple,
  background: shopWellColors.darkBg,
  
  // Gradient colors
  gradientStart: shopWellColors.cyan,
  gradientMid1: shopWellColors.blue,
  gradientMid2: shopWellColors.purple,
  gradientEnd: shopWellColors.magenta,
  
  // UI Colors
  text: '#ECEDEE',
  textSecondary: '#9BA1A6',
  border: '#A1A1AA80',
  card: '#27272a',
  success: '#34C759',
  error: '#FF3B30',
  warning: '#FF9500',
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  gradientCard: {
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
  },
  text: {
    color: colors.text,
    fontSize: 16,
  },
  textSecondary: {
    color: colors.textSecondary,
    fontSize: 14,
  },
  title: {
    color: colors.text,
    fontSize: 24,
    fontWeight: 'bold',
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: 18,
    fontWeight: '600',
  },
});
