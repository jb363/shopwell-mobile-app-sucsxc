
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { router } from 'expo-router';
import { colors, commonStyles, buttonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useNotifications } from '@/hooks/useNotifications';
import { useSharing } from '@/hooks/useSharing';

export default function ScanScreen() {
  const [isScanning, setIsScanning] = useState(false);
  const [scannedProduct, setScannedProduct] = useState<any>(null);
  const { schedulePushNotification } = useNotifications();
  const { shareProduct } = useSharing();

  const handleScan = async () => {
    setIsScanning(true);
    
    // Simulate scanning
    setTimeout(() => {
      const mockProduct = {
        id: '1',
        name: 'Organic Whole Wheat Bread',
        brand: 'Nature\'s Best',
        healthScore: 87,
        category: 'Bakery',
        price: 4.99,
        ingredients: ['Whole wheat flour', 'Water', 'Yeast', 'Salt', 'Honey'],
        nutritionFacts: {
          calories: 120,
          protein: 5,
          carbs: 22,
          fat: 2,
          fiber: 4,
          sugar: 2,
          sodium: 180,
        },
        isHealthy: true,
      };
      
      setScannedProduct(mockProduct);
      setIsScanning(false);
      
      // Send notification
      schedulePushNotification(
        'Product Scanned!',
        `${mockProduct.name} - Health Score: ${mockProduct.healthScore}/100`
      );
    }, 2000);
  };

  const handleShare = () => {
    if (scannedProduct) {
      shareProduct(scannedProduct.name, scannedProduct.healthScore);
    }
  };

  const handleAddToList = () => {
    Alert.alert('Success', 'Product added to your shopping list!');
  };

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
        <Text style={styles.headerTitle}>Scan Product</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {!scannedProduct ? (
          <View style={styles.scannerContainer}>
            <View style={styles.scannerFrame}>
              {isScanning ? (
                <ActivityIndicator size="large" color={colors.primary} />
              ) : (
                <IconSymbol
                  ios_icon_name="barcode.viewfinder"
                  android_material_icon_name="qr_code_scanner"
                  size={120}
                  color={colors.primary}
                />
              )}
            </View>
            <Text style={styles.scannerText}>
              {isScanning ? 'Scanning...' : 'Tap to scan a product barcode'}
            </Text>
            <TouchableOpacity
              style={[buttonStyles.primary, styles.scanButton]}
              onPress={handleScan}
              disabled={isScanning}
            >
              <Text style={buttonStyles.textWhite}>
                {isScanning ? 'Scanning...' : 'Start Scan'}
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.resultContainer}>
            <View style={[styles.scoreCard, { backgroundColor: scannedProduct.isHealthy ? colors.accent + '20' : colors.error + '20' }]}>
              <Text style={styles.scoreLabel}>Health Score</Text>
              <Text style={[styles.scoreValue, { color: scannedProduct.isHealthy ? colors.accent : colors.error }]}>
                {scannedProduct.healthScore}
              </Text>
              <Text style={styles.scoreMax}>/100</Text>
            </View>

            <View style={styles.productInfo}>
              <Text style={styles.productName}>{scannedProduct.name}</Text>
              <Text style={styles.productBrand}>{scannedProduct.brand}</Text>
              <View style={styles.productMeta}>
                <View style={styles.metaItem}>
                  <IconSymbol
                    ios_icon_name="tag.fill"
                    android_material_icon_name="label"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.metaText}>{scannedProduct.category}</Text>
                </View>
                <View style={styles.metaItem}>
                  <IconSymbol
                    ios_icon_name="dollarsign.circle.fill"
                    android_material_icon_name="attach_money"
                    size={16}
                    color={colors.textSecondary}
                  />
                  <Text style={styles.metaText}>${scannedProduct.price}</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Nutrition Facts</Text>
              <View style={styles.nutritionGrid}>
                {Object.entries(scannedProduct.nutritionFacts).map(([key, value], index) => (
                  <View key={index} style={styles.nutritionItem}>
                    <Text style={styles.nutritionLabel}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                    <Text style={styles.nutritionValue}>{value}{key === 'calories' ? '' : 'g'}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Ingredients</Text>
              <View style={styles.ingredientsContainer}>
                {scannedProduct.ingredients.map((ingredient: string, index: number) => (
                  <View key={index} style={styles.ingredientChip}>
                    <Text style={styles.ingredientText}>{ingredient}</Text>
                  </View>
                ))}
              </View>
            </View>

            <View style={styles.actions}>
              <TouchableOpacity
                style={[buttonStyles.primary, styles.actionButton]}
                onPress={handleAddToList}
              >
                <IconSymbol
                  ios_icon_name="plus.circle.fill"
                  android_material_icon_name="add_circle"
                  size={20}
                  color="#FFFFFF"
                />
                <Text style={[buttonStyles.textWhite, { marginLeft: 8 }]}>Add to List</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[buttonStyles.outline, styles.actionButton]}
                onPress={handleShare}
              >
                <IconSymbol
                  ios_icon_name="square.and.arrow.up"
                  android_material_icon_name="share"
                  size={20}
                  color={colors.primary}
                />
                <Text style={[buttonStyles.text, { marginLeft: 8 }]}>Share</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.scanAgainButton}
              onPress={() => setScannedProduct(null)}
            >
              <Text style={styles.scanAgainText}>Scan Another Product</Text>
            </TouchableOpacity>
          </View>
        )}
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
  scannerContainer: {
    alignItems: 'center',
    paddingTop: 40,
  },
  scannerFrame: {
    width: 250,
    height: 250,
    borderRadius: 20,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
    borderWidth: 3,
    borderColor: colors.primary,
    borderStyle: 'dashed',
  },
  scannerText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
    marginBottom: 24,
  },
  scanButton: {
    width: '100%',
  },
  resultContainer: {
    gap: 20,
  },
  scoreCard: {
    borderRadius: 20,
    padding: 24,
    alignItems: 'center',
  },
  scoreLabel: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  scoreValue: {
    fontSize: 64,
    fontWeight: '800',
  },
  scoreMax: {
    fontSize: 24,
    color: colors.textSecondary,
  },
  productInfo: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
  },
  productName: {
    fontSize: 24,
    fontWeight: '800',
    color: colors.text,
    marginBottom: 4,
  },
  productBrand: {
    fontSize: 16,
    color: colors.textSecondary,
    marginBottom: 12,
  },
  productMeta: {
    flexDirection: 'row',
    gap: 16,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  section: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  nutritionGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  nutritionItem: {
    width: '48%',
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 12,
  },
  nutritionLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 4,
  },
  nutritionValue: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
  },
  ingredientsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  ingredientChip: {
    backgroundColor: colors.highlight,
    borderRadius: 20,
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  ingredientText: {
    fontSize: 14,
    color: colors.text,
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanAgainButton: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  scanAgainText: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
});
