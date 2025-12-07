
import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
} from 'react-native';
import { router } from 'expo-router';
import { colors, commonStyles, buttonStyles } from '@/styles/commonStyles';
import { IconSymbol } from '@/components/IconSymbol';
import { useSharing } from '@/hooks/useSharing';

interface ShoppingList {
  id: string;
  name: string;
  itemCount: number;
  completedCount: number;
  createdAt: Date;
}

export default function ShoppingListsScreen() {
  const { shareShoppingList } = useSharing();
  const [lists, setLists] = useState<ShoppingList[]>([
    {
      id: '1',
      name: 'Weekly Groceries',
      itemCount: 12,
      completedCount: 5,
      createdAt: new Date(),
    },
    {
      id: '2',
      name: 'Healthy Snacks',
      itemCount: 8,
      completedCount: 8,
      createdAt: new Date(),
    },
    {
      id: '3',
      name: 'Meal Prep',
      itemCount: 15,
      completedCount: 3,
      createdAt: new Date(),
    },
  ]);
  const [showNewListInput, setShowNewListInput] = useState(false);
  const [newListName, setNewListName] = useState('');

  const handleCreateList = () => {
    if (!newListName.trim()) {
      Alert.alert('Error', 'Please enter a list name');
      return;
    }

    const newList: ShoppingList = {
      id: Date.now().toString(),
      name: newListName,
      itemCount: 0,
      completedCount: 0,
      createdAt: new Date(),
    };

    setLists([newList, ...lists]);
    setNewListName('');
    setShowNewListInput(false);
    Alert.alert('Success', 'Shopping list created!');
  };

  const handleShareList = (list: ShoppingList) => {
    shareShoppingList(list.name, list.itemCount);
  };

  const handleDeleteList = (listId: string) => {
    Alert.alert(
      'Delete List',
      'Are you sure you want to delete this list?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            setLists(lists.filter(list => list.id !== listId));
          },
        },
      ]
    );
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
        <Text style={styles.headerTitle}>Shopping Lists</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setShowNewListInput(true)}
        >
          <IconSymbol
            ios_icon_name="plus"
            android_material_icon_name="add"
            size={24}
            color={colors.primary}
          />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {showNewListInput && (
          <View style={styles.newListCard}>
            <Text style={styles.newListTitle}>Create New List</Text>
            <TextInput
              style={commonStyles.input}
              placeholder="List name"
              placeholderTextColor={colors.textSecondary}
              value={newListName}
              onChangeText={setNewListName}
              autoFocus
            />
            <View style={styles.newListActions}>
              <TouchableOpacity
                style={[buttonStyles.outline, { flex: 1 }]}
                onPress={() => {
                  setShowNewListInput(false);
                  setNewListName('');
                }}
              >
                <Text style={buttonStyles.text}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[buttonStyles.primary, { flex: 1 }]}
                onPress={handleCreateList}
              >
                <Text style={buttonStyles.textWhite}>Create</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {lists.length === 0 ? (
          <View style={styles.emptyState}>
            <IconSymbol
              ios_icon_name="list.bullet"
              android_material_icon_name="list"
              size={80}
              color={colors.textSecondary}
            />
            <Text style={styles.emptyTitle}>No Shopping Lists</Text>
            <Text style={styles.emptyText}>
              Create your first shopping list to get started
            </Text>
          </View>
        ) : (
          <View style={styles.listsContainer}>
            {lists.map((list, index) => {
              const progress = list.itemCount > 0 ? (list.completedCount / list.itemCount) * 100 : 0;
              return (
                <TouchableOpacity
                  key={index}
                  style={styles.listCard}
                  onPress={() => Alert.alert('List Details', `View items in ${list.name}`)}
                >
                  <View style={styles.listHeader}>
                    <View style={styles.listIconContainer}>
                      <IconSymbol
                        ios_icon_name="list.bullet"
                        android_material_icon_name="list"
                        size={24}
                        color={colors.primary}
                      />
                    </View>
                    <View style={styles.listInfo}>
                      <Text style={styles.listName}>{list.name}</Text>
                      <Text style={styles.listMeta}>
                        {list.completedCount} of {list.itemCount} items
                      </Text>
                    </View>
                    <View style={styles.listActions}>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleShareList(list)}
                      >
                        <IconSymbol
                          ios_icon_name="square.and.arrow.up"
                          android_material_icon_name="share"
                          size={20}
                          color={colors.textSecondary}
                        />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.iconButton}
                        onPress={() => handleDeleteList(list.id)}
                      >
                        <IconSymbol
                          ios_icon_name="trash"
                          android_material_icon_name="delete"
                          size={20}
                          color={colors.error}
                        />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.progressContainer}>
                    <View style={styles.progressBar}>
                      <View
                        style={[
                          styles.progressFill,
                          {
                            width: `${progress}%`,
                            backgroundColor: progress === 100 ? colors.success : colors.primary,
                          },
                        ]}
                      />
                    </View>
                    <Text style={styles.progressText}>{Math.round(progress)}%</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
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
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    paddingBottom: 100,
  },
  newListCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  newListTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 16,
  },
  newListActions: {
    flexDirection: 'row',
    gap: 12,
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
  listsContainer: {
    gap: 16,
  },
  listCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.08)',
    elevation: 3,
  },
  listHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  listIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: colors.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  listInfo: {
    flex: 1,
  },
  listName: {
    fontSize: 18,
    fontWeight: '700',
    color: colors.text,
    marginBottom: 4,
  },
  listMeta: {
    fontSize: 14,
    color: colors.textSecondary,
  },
  listActions: {
    flexDirection: 'row',
    gap: 8,
  },
  iconButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 8,
    backgroundColor: colors.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text,
    minWidth: 40,
    textAlign: 'right',
  },
});
