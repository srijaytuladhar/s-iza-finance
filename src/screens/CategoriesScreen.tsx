import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  Modal, 
  TextInput, 
  ScrollView, 
  SafeAreaView 
} from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { Category, CategoryType } from '../types/finance';
import { FinanceIcon } from '../utils/iconMap';
import { useForm, Controller } from 'react-hook-form';
import { showAlert } from '../utils/alert';
import { useTheme } from '../utils/theme';

const PRESET_ICONS = [
  'shopping-cart',
  'utensils',
  'car',
  'home',
  'coffee',
  'gift',
  'plane',
  'gamepad',
  'briefcase',
  'wallet',
  'university',
  'medkit',
  'heart',
  'tag',
  'wrench',
  'cog',
  'music',
  'tv',
];

const PRESETS_COLORS = [
  '#EF4444', // Red
  '#10B981', // Green
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#64748B', // Slate
];

export const CategoriesScreen: React.FC = () => {
  const { state, addCategory, editCategory, deleteCategory } = useFinance();
  const { colors, isDarkMode } = useTheme();
  const [activeTab, setActiveTab] = useState<CategoryType>('Expense');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      name: '',
      type: 'Expense' as CategoryType,
      icon: 'tag',
      color: '#EF4444',
    }
  });

  // Filter categories by type
  const filteredCategories = state.categories.filter(c => c.type === activeTab);

  const openAddModal = () => {
    setEditingCategory(null);
    reset({
      name: '',
      type: activeTab,
      icon: 'tag',
      color: activeTab === 'Expense' ? '#EF4444' : '#10B981',
    });
    setModalVisible(true);
  };

  const openEditModal = (cat: Category) => {
    setEditingCategory(cat);
    reset({
      name: cat.name,
      type: cat.type,
      icon: cat.icon,
      color: cat.color,
    });
    setModalVisible(true);
  };

  const onSubmit = async (data: any) => {
    if (!data.name.trim()) {
      showAlert('Validation Error', 'Please enter a category name.');
      return;
    }

    const payload = {
      name: data.name.trim(),
      type: data.type,
      icon: data.icon,
      color: data.color,
    };

    try {
      if (editingCategory) {
        // If renaming, update transactions category reference?
        // In the data model, Transaction points to category name string.
        // We will edit the category name. If editing, we just update it.
        await editCategory({
          ...editingCategory,
          ...payload,
        });
      } else {
        await addCategory(payload);
      }
      setModalVisible(false);
    } catch (e) {
      showAlert('Error', 'Failed to save category: ' + e);
    }
  };

  const handleDelete = () => {
    if (!editingCategory) return;

    // Check if category is used in any transactions
    const isUsed = state.transactions.some(
      tx => tx.category.toLowerCase() === editingCategory.name.toLowerCase()
    );

    if (isUsed) {
      showAlert(
        'Category In Use',
        `The category "${editingCategory.name}" is used by one or more transactions. You cannot delete it.`
      );
      return;
    }

    showAlert(
      'Confirm Delete',
      `Are you sure you want to delete "${editingCategory.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await deleteCategory(editingCategory.id);
            setModalVisible(false);
          }
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Category Type Tabs */}
      <View style={[styles.tabsContainer, { backgroundColor: colors.card, borderBottomColor: colors.border }]}>
        {(['Expense', 'Income'] as CategoryType[]).map(t => (
          <Pressable
            key={t}
            style={[styles.tab, activeTab === t && styles.activeTab, activeTab === t && { borderBottomColor: colors.primary }]}
            onPress={() => setActiveTab(t)}
          >
            <Text style={[styles.tabText, activeTab === t && styles.activeTabText, { color: activeTab === t ? colors.primary : colors.textSecondary }]}>
              {t} Categories
            </Text>
          </Pressable>
        ))}
      </View>

      {filteredCategories.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FinanceIcon name="tags" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No categories defined yet.</Text>
          <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>Add custom categories for your {activeTab.toLowerCase()} transactions.</Text>
          <Pressable style={styles.emptyButton} onPress={openAddModal}>
            <Text style={styles.emptyButtonText}>Add Category</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={filteredCategories}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <Pressable style={[styles.categoryItem, { backgroundColor: colors.card, borderColor: colors.border }]} onPress={() => openEditModal(item)}>
              <View style={[styles.iconWrapper, { backgroundColor: `${item.color}15` }]}>
                <FinanceIcon name={item.icon} size={18} color={item.color} />
              </View>
              <Text style={[styles.categoryName, { color: colors.text }]}>{item.name}</Text>
              <FinanceIcon name="chevron-right" size={14} color={colors.textSecondary} />
            </Pressable>
          )}
        />
      )}

      {filteredCategories.length > 0 && (
        <Pressable style={styles.fab} onPress={openAddModal}>
          <FinanceIcon name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Add/Edit Modal */}
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: colors.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingCategory ? 'Edit Category' : 'New Category'}
            </Text>
            <View style={styles.modalHeaderButtons}>
              {editingCategory && (
                <Pressable onPress={handleDelete} style={styles.deleteButton}>
                  <FinanceIcon name="trash" size={16} color="#EF4444" />
                </Pressable>
              )}
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Cancel</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
            {/* Category Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Category Name</Text>
              <Controller
                name="name"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g. Groceries, Coffee, Salary"
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>

            {/* Type Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Category Type</Text>
              <Controller
                name="type"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <View style={styles.typeSelectorRow}>
                    {(['Expense', 'Income'] as CategoryType[]).map(t => (
                      <Pressable
                        key={t}
                        style={[
                          styles.typeSelectorBtn,
                          { backgroundColor: colors.inputBackground, borderColor: colors.border },
                          value === t && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                        onPress={() => onChange(t)}
                      >
                        <Text style={[
                          styles.typeSelectorText,
                          { color: colors.textSecondary },
                          value === t && { color: '#FFFFFF', fontWeight: '700' }
                        ]}>{t}</Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              />
            </View>

            {/* Color Swatch */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Theme Color</Text>
              <Controller
                name="color"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <View style={styles.colorPalette}>
                    {PRESETS_COLORS.map(c => (
                      <Pressable
                        key={c}
                        style={[
                          styles.colorCircle,
                          { backgroundColor: c },
                          value === c && styles.colorCircleSelected
                        ]}
                        onPress={() => onChange(c)}
                      >
                        {value === c && (
                          <FinanceIcon name="check" size={14} color="#FFF" />
                        )}
                      </Pressable>
                    ))}
                  </View>
                )}
              />
            </View>

            {/* Icon Picker */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Select Icon</Text>
              <Controller
                name="icon"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <View style={styles.iconGrid}>
                    {PRESET_ICONS.map(i => (
                      <Pressable
                        key={i}
                        style={[
                          styles.iconGridCell,
                          { backgroundColor: colors.card, borderColor: colors.border },
                          value === i && { backgroundColor: colors.primary, borderColor: colors.primary }
                        ]}
                        onPress={() => onChange(i)}
                      >
                        <FinanceIcon name={i} size={20} color={value === i ? '#FFFFFF' : colors.textSecondary} />
                      </Pressable>
                    ))}
                  </View>
                )}
              />
            </View>

            {/* Save Button */}
            <Pressable style={styles.saveButton} onPress={handleSubmit(onSubmit)}>
              <Text style={styles.saveButtonText}>Save Category</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  tabsContainer: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: '#0F172A',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTabText: {
    color: '#0F172A',
  },
  listContent: {
    padding: 16,
  },
  categoryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  iconWrapper: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  categoryName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    flex: 1,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginTop: 12,
    marginBottom: 4,
  },
  emptySubText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
    marginBottom: 20,
  },
  emptyButton: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
  modalHeaderButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  deleteButton: {
    padding: 8,
    marginRight: 12,
  },
  closeButton: {
    padding: 6,
  },
  closeButtonText: {
    fontSize: 15,
    color: '#3B82F6',
    fontWeight: '600',
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  textInput: {
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    height: 48,
    fontSize: 16,
    color: '#0F172A',
  },
  typeSelectorRow: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  typeSelectorBtn: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  typeSelectorBtnActive: {
    backgroundColor: '#FFFFFF',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  typeSelectorText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  typeSelectorTextActive: {
    color: '#0F172A',
  },
  colorPalette: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    margin: 6,
    justifyContent: 'center',
    alignItems: 'center',
  },
  colorCircleSelected: {
    borderWidth: 2,
    borderColor: '#0F172A',
  },
  iconGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  iconGridCell: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    margin: 6,
  },
  iconGridCellSelected: {
    borderColor: '#0F172A',
    backgroundColor: '#F1F5F9',
    borderWidth: 2,
  },
  saveButton: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
    marginBottom: 40,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
