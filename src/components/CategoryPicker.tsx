import React, { useRef, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, Pressable } from 'react-native';
import { CategoryType } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import { FinanceIcon } from '../utils/iconMap';
import { useTheme } from '../utils/theme';

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
  const { colors } = useTheme();
  const scrollViewRef = useRef<ScrollView>(null);

  // Filter categories matching the current type
  const filteredCategories = state.categories.filter(c => c.type === type);

  const selectedCategory = state.categories.find(
    c => c.name.toLowerCase() === value.toLowerCase()
  );

  // Auto-scroll to selected category if present
  useEffect(() => {
    if (value && filteredCategories.length > 0) {
      const index = filteredCategories.findIndex(
        c => c.name.toLowerCase() === value.toLowerCase()
      );
      if (index > 0 && scrollViewRef.current) {
        // Approximate width per category pill ~110px
        scrollViewRef.current.scrollTo({ x: Math.max(0, index * 110 - 20), animated: true });
      }
    }
  }, [value, type]);

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={[styles.label, { color: colors.textSecondary }]}>Category</Text>
        {selectedCategory && (
          <View style={[styles.selectedBadge, { backgroundColor: `${selectedCategory.color || colors.primary}18` }]}>
            <Text style={[styles.selectedLabel, { color: selectedCategory.color || colors.primary }]}>
              {selectedCategory.name}
            </Text>
          </View>
        )}
      </View>

      {filteredCategories.length === 0 ? (
        <View style={[styles.emptyContainer, { backgroundColor: colors.glassInput, borderColor: colors.glassBorder }]}>
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
            No {type.toLowerCase()} categories found
          </Text>
        </View>
      ) : (
        <View style={styles.fixedScrollWrapper}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {filteredCategories.map(cat => {
              const isSelected = value.toLowerCase() === cat.name.toLowerCase();
              const catColor = cat.color || '#38BDF8';

              return (
                <Pressable
                  key={cat.id}
                  style={({ pressed }) => [
                    styles.categoryPill,
                    colors.glassShadow,
                    {
                      backgroundColor: isSelected ? `${catColor}24` : colors.glassCard,
                      borderColor: isSelected ? catColor : colors.glassBorder,
                      opacity: pressed ? 0.8 : 1,
                      transform: [{ scale: pressed ? 0.96 : 1 }],
                    },
                  ]}
                  onPress={() => onChange(cat.name)}
                >
                  <View
                    style={[
                      styles.iconCircle,
                      { backgroundColor: isSelected ? `${catColor}35` : `${catColor}20` },
                    ]}
                  >
                    <FinanceIcon name={cat.icon} size={14} color={catColor} />
                  </View>
                  <Text
                    style={[
                      styles.categoryName,
                      { color: isSelected ? catColor : colors.text },
                      isSelected && styles.selectedCategoryName,
                    ]}
                    numberOfLines={1}
                  >
                    {cat.name}
                  </Text>
                  {isSelected && (
                    <View style={[styles.checkBadge, { backgroundColor: catColor }]}>
                      <FinanceIcon name="check" size={8} color="#FFFFFF" />
                    </View>
                  )}
                </Pressable>
              );
            })}
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
  },
  selectedBadge: {
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 8,
  },
  selectedLabel: {
    fontSize: 12,
    fontWeight: '700',
  },
  fixedScrollWrapper: {
    height: 48,
  },
  scrollContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingRight: 16,
  },
  categoryPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    height: 44,
    borderRadius: 22,
    borderWidth: 1.2,
    marginRight: 8,
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryName: {
    fontSize: 13,
    fontWeight: '600',
    maxWidth: 120,
  },
  selectedCategoryName: {
    fontWeight: '700',
  },
  checkBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 6,
  },
  emptyContainer: {
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  emptyText: {
    fontSize: 13,
    fontStyle: 'italic',
  },
});
