
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { router } from 'expo-router';
import { colors, commonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';

interface Product {
  id: string;
  name: string;
  brand: string;
  healthScore: number;
  price: number;
  imageUrl: string;
}

export default function SearchScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const [products] = useState<Product[]>([
    {
      id: '1',
      name: 'Organic Almond Milk',
      brand: 'Nature\'s Best',
      healthScore: 92,
      price: 5.99,
      imageUrl: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400',
    },
    {
      id: '2',
      name: 'Greek Yogurt',
      brand: 'Healthy Choice',
      healthScore: 88,
      price: 4.49,
      imageUrl: 'https://images.unsplash.com/photo-1488477181946-6428a0291777?w=400',
    },
    {
      id: '3',
      name: 'Quinoa',
      brand: 'Organic Valley',
      healthScore: 95,
      price: 7.99,
      imageUrl: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400',
    },
    {
      id: '4',
      name: 'Avocado',
      brand: 'Fresh Farms',
      healthScore: 90,
      price: 2.99,
      imageUrl: 'https://images.unsplash.com/photo-1523049673857-eb18f1d7b578?w=400',
    },
  ]);

  const filteredProducts = searchQuery
    ? products.filter(
        product =>
          product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          product.brand.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : products;

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
        <View style={styles.searchContainer}>
          <IconSymbol
            ios_icon_name="magnifyingglass"
            android_material_icon_name="search"
            size={20}
            color={searchFocused ? colors.primary : colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            style={[
              commonStyles.input,
              styles.searchInput,
              searchFocused && commonStyles.inputFocused,
            ]}
            placeholder="Search products..."
            placeholderTextColor={colors.textSecondary}
            value={searchQuery}
            onChangeText={setSearchQuery}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="magnifyingglass"
              android_material_icon_name="search"
              size={80}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No Products Found</Text>
            <Text style={styles.emptyText}>
              Try searching with different keywords
            </Text>
          </View>
        ) : (
          <View style={styles.productsGrid}>
            {filteredProducts.map((product, index) => (
              <TouchableOpacity
                key={index}
                style={styles.productCard}
                onPress={() => console.log('Product selected:', product.name)}
              >
                <Image
                  source={{ uri: product.imageUrl }}
                  style={styles.productImage}
                />
                <View style={styles.productInfo}>
                  <Text style={styles.productName} numberOfLines={2}>
                    {product.name}
                  </Text>
                  <Text style={styles.productBrand}>{product.brand}</Text>
                  <View style={styles.productFooter}>
                    <View
                      style={[
                        styles.healthBadge,
                        {
                          backgroundColor:
                            product.healthScore >= 80
                              ? colors.accent + '20'
                              : colors.secondary + '20',
                        },
                      ]}
                    >
                      <IconSymbol
                        ios_icon_name="heart.fill"
                        android_material_icon_name="favorite"
                        size={14}
                        color={product.healthScore >= 80 ? colors.accent : colors.secondary}
                      />
                      <Text
                        style={[
                          styles.healthScore,
                          {
                            color: product.healthScore >= 80 ? colors.accent : colors.secondary,
                          },
                        ]}
                      >
                        {product.healthScore}
                      </Text>
                    </View>
                    <Text style={styles.productPrice}>${product.price}</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
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
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 16,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    gap: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchContainer: {
    flex: 1,
    position: 'relative',
  },
  searchIcon: {
    position: 'absolute',
    left: 16,
    top: 17,
    zIndex: 1,
  },
  searchInput: {
    paddingLeft: 48,
    marginBottom: 0,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  emptyState: {
    alignItems: 'center',
    paddingTop: 80,
  },
  emptyTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyText: {
    fontSize: 16,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 16,
  },
  productCard: {
    width: '48%',
    backgroundColor: colors.card,
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  productImage: {
    width: '100%',
    height: 140,
    backgroundColor: colors.background,
  },
  productInfo: {
    padding: 12,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
    minHeight: 36,
  },
  productBrand: {
    fontSize: 12,
    color: colors.textSecondary,
    marginBottom: 8,
  },
  productFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  healthBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  healthScore: {
    fontSize: 12,
    fontWeight: '700',
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '800',
    color: colors.text,
  },
});
