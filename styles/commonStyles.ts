
import { StyleSheet } from 'react-native';

export const colors = {
  // Primary colors from ShopWell.ai logo
  primary: '#29ABE2',      // Cyan blue
  secondary: '#A855F7',    // Purple
  accent: '#EC4899',       // Pink
  
  // Background colors
  background: '#F5F5F5',
  backgroundDark: '#1A1A2E',
  card: '#FFFFFF',
  cardDark: '#2D2D44',
  
  // Text colors
  text: '#212121',
  textDark: '#FFFFFF',
  textSecondary: '#757575',
  textSecondaryDark: '#B0B0B0',
  
  // Status colors
  success: '#10B981',
  warning: '#F59E0B',
  error: '#EF4444',
  info: '#3B82F6',
  
  // UI colors
  border: '#E0E0E0',
  borderDark: '#3D3D5C',
  highlight: '#F0F9FF',
  highlightDark: '#1E293B',
  
  // Gradient colors
  gradientStart: '#29ABE2',
  gradientEnd: '#A855F7',
};

export const commonStyles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  containerDark: {
    flex: 1,
    backgroundColor: colors.backgroundDark,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.06)',
    elevation: 2,
  },
  cardDark: {
    backgroundColor: colors.cardDark,
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.3)',
    elevation: 2,
  },
  title: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 8,
  },
  titleDark: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.textDark,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 16,
  },
  subtitleDark: {
    fontSize: 16,
    color: colors.textSecondaryDark,
    marginBottom: 16,
  },
});

export const buttonStyles = StyleSheet.create({
  primary: {
    backgroundColor: colors.primary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondary: {
    backgroundColor: colors.secondary,
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  outline: {
    backgroundColor: 'transparent',
    paddingVertical: 14,
    paddingHorizontal: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  text: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  textLight: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
