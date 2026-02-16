
import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEYS = {
  SHOPPING_LISTS: '@shopwell/shopping_lists',
  PRODUCTS: '@shopwell/products',
  OFFLINE_QUEUE: '@shopwell/offline_queue',
  USER_PREFERENCES: '@shopwell/user_preferences',
  CACHED_DATA: '@shopwell/cached_data',
};

export interface ShoppingList {
  id: string;
  name: string;
  items: ShoppingListItem[];
  createdAt: string;
  updatedAt: string;
  synced: boolean;
}

export interface ShoppingListItem {
  id: string;
  productId?: string;
  name: string;
  quantity: number;
  checked: boolean;
  notes?: string;
}

export interface Product {
  id: string;
  barcode?: string;
  name: string;
  brand?: string;
  category?: string;
  imageUrl?: string;
  lastPrice?: number;
  cachedAt: string;
}

export interface OfflineQueueItem {
  id: string;
  type: 'CREATE' | 'UPDATE' | 'DELETE';
  resource: 'list' | 'item' | 'product';
  data: any;
  timestamp: string;
}

// Shopping Lists
export async function getShoppingLists(): Promise<ShoppingList[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.SHOPPING_LISTS);
    const lists = data ? JSON.parse(data) : [];
    console.log('Retrieved shopping lists from storage:', lists.length);
    return lists;
  } catch (error) {
    console.error('Error getting shopping lists:', error);
    return [];
  }
}

export async function saveShoppingList(list: ShoppingList): Promise<void> {
  try {
    const lists = await getShoppingLists();
    const existingIndex = lists.findIndex(l => l.id === list.id);
    
    const updatedList = {
      ...list,
      updatedAt: new Date().toISOString(),
      synced: false,
    };
    
    if (existingIndex >= 0) {
      lists[existingIndex] = updatedList;
    } else {
      lists.push(updatedList);
    }
    
    await AsyncStorage.setItem(STORAGE_KEYS.SHOPPING_LISTS, JSON.stringify(lists));
    console.log('Saved shopping list:', list.id);
    
    // Add to offline queue
    await addToOfflineQueue({
      id: `${Date.now()}-${list.id}`,
      type: existingIndex >= 0 ? 'UPDATE' : 'CREATE',
      resource: 'list',
      data: updatedList,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error saving shopping list:', error);
    throw error;
  }
}

export async function deleteShoppingList(listId: string): Promise<void> {
  try {
    const lists = await getShoppingLists();
    const filteredLists = lists.filter(l => l.id !== listId);
    await AsyncStorage.setItem(STORAGE_KEYS.SHOPPING_LISTS, JSON.stringify(filteredLists));
    console.log('Deleted shopping list:', listId);
    
    // Add to offline queue
    await addToOfflineQueue({
      id: `${Date.now()}-${listId}`,
      type: 'DELETE',
      resource: 'list',
      data: { id: listId },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error deleting shopping list:', error);
    throw error;
  }
}

// Products (Cached)
export async function getCachedProduct(barcode: string): Promise<Product | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const products: Product[] = data ? JSON.parse(data) : [];
    const product = products.find(p => p.barcode === barcode);
    
    if (product) {
      console.log('Found cached product:', product.name);
      return product;
    }
    return null;
  } catch (error) {
    console.error('Error getting cached product:', error);
    return null;
  }
}

export async function cacheProduct(product: Product): Promise<void> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PRODUCTS);
    const products: Product[] = data ? JSON.parse(data) : [];
    
    const existingIndex = products.findIndex(p => p.id === product.id);
    const cachedProduct = {
      ...product,
      cachedAt: new Date().toISOString(),
    };
    
    if (existingIndex >= 0) {
      products[existingIndex] = cachedProduct;
    } else {
      products.push(cachedProduct);
    }
    
    // Keep only last 500 products to avoid storage bloat
    const trimmedProducts = products.slice(-500);
    
    await AsyncStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(trimmedProducts));
    console.log('Cached product:', product.name);
  } catch (error) {
    console.error('Error caching product:', error);
  }
}

// Offline Queue
export async function getOfflineQueue(): Promise<OfflineQueueItem[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.OFFLINE_QUEUE);
    const queue = data ? JSON.parse(data) : [];
    console.log('Offline queue size:', queue.length);
    return queue;
  } catch (error) {
    console.error('Error getting offline queue:', error);
    return [];
  }
}

export async function addToOfflineQueue(item: OfflineQueueItem): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    queue.push(item);
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify(queue));
    console.log('Added to offline queue:', item.type, item.resource);
  } catch (error) {
    console.error('Error adding to offline queue:', error);
  }
}

export async function clearOfflineQueue(): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.OFFLINE_QUEUE, JSON.stringify([]));
    console.log('Cleared offline queue');
  } catch (error) {
    console.error('Error clearing offline queue:', error);
  }
}

export async function processOfflineQueue(): Promise<void> {
  try {
    const queue = await getOfflineQueue();
    console.log('Processing offline queue:', queue.length, 'items');
    
    // TODO: Backend Integration - Process each queue item
    // For each item in queue:
    // - POST /api/lists for CREATE list
    // - PUT /api/lists/:id for UPDATE list
    // - DELETE /api/lists/:id for DELETE list
    // - POST /api/lists/:id/items for CREATE item
    // - PUT /api/lists/:id/items/:itemId for UPDATE item
    // - DELETE /api/lists/:id/items/:itemId for DELETE item
    
    // After successful sync, clear the queue
    // await clearOfflineQueue();
  } catch (error) {
    console.error('Error processing offline queue:', error);
  }
}

// User Preferences
export async function getUserPreferences(): Promise<any> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.USER_PREFERENCES);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting user preferences:', error);
    return {};
  }
}

export async function saveUserPreferences(preferences: any): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.USER_PREFERENCES, JSON.stringify(preferences));
    console.log('Saved user preferences');
  } catch (error) {
    console.error('Error saving user preferences:', error);
  }
}

// Generic Storage
export async function setItem(key: string, value: any): Promise<void> {
  try {
    const jsonValue = JSON.stringify(value);
    await AsyncStorage.setItem(key, jsonValue);
    console.log('Stored item:', key);
  } catch (error) {
    console.error('Error storing item:', error);
    throw error;
  }
}

export async function getItem<T>(key: string): Promise<T | null> {
  try {
    const jsonValue = await AsyncStorage.getItem(key);
    const value = jsonValue != null ? JSON.parse(jsonValue) : null;
    console.log('Retrieved item:', key);
    return value;
  } catch (error) {
    console.error('Error retrieving item:', error);
    return null;
  }
}

export async function removeItem(key: string): Promise<void> {
  try {
    await AsyncStorage.removeItem(key);
    console.log('Removed item:', key);
  } catch (error) {
    console.error('Error removing item:', error);
  }
}

export async function clearAll(): Promise<void> {
  try {
    await AsyncStorage.clear();
    console.log('Cleared all storage');
  } catch (error) {
    console.error('Error clearing storage:', error);
  }
}
