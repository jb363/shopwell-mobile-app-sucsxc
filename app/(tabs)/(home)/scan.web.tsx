
import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { colors } from '@/styles/commonStyles';

export default function ScanScreen() {
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.card}>
        <Text style={styles.title}>Scan Products</Text>
        <Text style={styles.description}>
          The product scanning feature is part of the ShopWell.ai website loaded in the home tab.
        </Text>
        <Text style={styles.description}>
          Please navigate to the home tab to access the scanner and all website features.
        </Text>
      </View>
      
      <View style={styles.infoCard}>
        <Text style={styles.infoTitle}>Camera Access</Text>
        <Text style={styles.infoText}>
          Camera features work best on native iOS and Android devices. 
          The web preview has limited camera support.
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 20,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 20,
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text,
    marginBottom: 12,
  },
  description: {
    fontSize: 16,
    color: colors.text,
    lineHeight: 24,
    marginBottom: 8,
  },
  infoCard: {
    backgroundColor: colors.primary + '20',
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.primary,
    marginBottom: 8,
  },
  infoText: {
    fontSize: 14,
    color: colors.text,
    lineHeight: 20,
  },
});
