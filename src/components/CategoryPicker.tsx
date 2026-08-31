import React, { useState } from 'react';
import { View, Text, StyleSheet, Modal, FlatList, Pressable, SafeAreaView } from 'react-native';
import { Category, CategoryType } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import { FinanceIcon } from '../utils/iconMap';

interface CategoryPickerProps {
  value: string; // Selected category name
  onChange: (categoryName: string) => void;
  type: CategoryType;
}

export const CategoryPicker: React.FC<CategoryPickerProps> = ({
  value,
  onChange,
  type,
}) => {
  const { state } = useFinance();
  const [modalVisible, setModalVisible] = useState(false);

  // Filter categories matching the type
  const filteredCategories = state.categories.filter(c => c.type === type);

  const selectedCategory = state.categories.find(
    c => c.name.toLowerCase() === value.toLowerCase()
  );

  const handleSelect = (categoryName: string) => {
    onChange(categoryName);
    setModalVisible(false);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.label}>Category</Text>
      <Pressable style={styles.selector} onPress={() => setModalVisible(true)}>
        {selectedCategory ? (
          <View style={styles.selectedContainer}>
            <View style={[styles.iconWrapper, { backgroundColor: `${selectedCategory.color}15` }]}>
              <FinanceIcon name={selectedCategory.icon} size={16} color={selectedCategory.color} />
            </View>
            <Text style={styles.selectedText}>{selectedCategory.name}</Text>
          </View>
        ) : (
          <Text style={styles.placeholder}>Select Category</Text>
        )}
        <FinanceIcon name="chevron-down" size={14} color="#64748B" />
      </Pressable>

      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <SafeAreaView style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Category</Text>
            <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
              <Text style={styles.closeButtonText}>Cancel</Text>
            </Pressable>
          </View>

          {filteredCategories.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>No {type} categories found.</Text>
              <Text style={styles.emptySubText}>Please add a category in the Categories tab first.</Text>
            </View>
          ) : (
            <FlatList
              data={filteredCategories}
              keyExtractor={item => item.id}
              contentContainerStyle={styles.listContent}
              renderItem={({ item }) => (
                <Pressable 
                  style={[
                    styles.itemRow,
                    value.toLowerCase() === item.name.toLowerCase() && styles.selectedItemRow
                  ]}
                  onPress={() => handleSelect(item.name)}
                >
                  <View style={[styles.iconWrapper, { backgroundColor: `${item.color}15` }]}>
                    <FinanceIcon name={item.icon} size={18} color={item.color} />
                  </View>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {value.toLowerCase() === item.name.toLowerCase() && (
                    <FinanceIcon name="check" size={14} color="#0F172A" />
                  )}
                </Pressable>
              )}
            />
          )}
        </SafeAreaView>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 10,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    height: 48,
  },
  selectedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  selectedText: {
    fontSize: 16,
    fontWeight: '500',
    color: '#0F172A',
  },
  placeholder: {
    fontSize: 16,
    color: '#94A3B8',
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
  closeButton: {
    padding: 6,
  },
  closeButtonText: {
    fontSize: 15,
    color: '#3B82F6',
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  selectedItemRow: {
    backgroundColor: '#F8FAFC',
    borderRadius: 8,
  },
  itemName: {
    fontSize: 16,
    color: '#0F172A',
    flex: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748B',
    marginBottom: 8,
  },
  emptySubText: {
    fontSize: 14,
    color: '#94A3B8',
    textAlign: 'center',
  },
});
