import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  Modal, 
  TextInput, 
  ScrollView, 
  SafeAreaView,
  Platform 
} from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { Transaction, TransactionType } from '../types/finance';
import { TransactionRow } from '../components/TransactionRow';
import { FinanceIcon } from '../utils/iconMap';
import { useTheme } from '../utils/theme';
import { GlassBackground } from '../components/GlassBackground';
import { TransactionModal } from '../components/TransactionModal';

const DEFAULT_EXPENSE_CATEGORIES = [
  { id: 'def-food', name: 'Food', icon: 'utensils', color: '#EF4444' },
  { id: 'def-shopping', name: 'Shopping', icon: 'shopping-cart', color: '#EC4899' },
  { id: 'def-transport', name: 'Transport', icon: 'car', color: '#3B82F6' },
  { id: 'def-bills', name: 'Bills', icon: 'home', color: '#F59E0B' },
  { id: 'def-entertainment', name: 'Entertainment', icon: 'gamepad', color: '#8B5CF6' },
  { id: 'def-health', name: 'Health', icon: 'medkit', color: '#10B981' },
  { id: 'def-groceries', name: 'Groceries', icon: 'store', color: '#14B8A6' },
];

export const TransactionsScreen: React.FC<{ route?: any; navigation?: any }> = ({ route, navigation }) => {
  const { 
    state, 
    addTransaction, 
    editTransaction, 
    deleteTransaction 
  } = useFinance();
  const { colors, isDarkMode } = useTheme();

  // Search & Filter state
  const [search, setSearch] = useState('');
  const [filterAccount, setFilterAccount] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [filterType, setFilterType] = useState<TransactionType | ''>('');
  const [showFilters, setShowFilters] = useState(false);
  const categoryScrollRef = useRef<ScrollView>(null);

  // Sync route params when navigated with filter parameters
  useEffect(() => {
    if (route?.params?.filterCategory) {
      setFilterCategory(route.params.filterCategory);
      setShowFilters(true);
    }
    if (route?.params?.filterType) {
      setFilterType(route.params.filterType);
      setShowFilters(true);
    }
  }, [route?.params?.filterCategory, route?.params?.filterType]);

  // Modal form states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // Check if any filter is active
  const hasActiveFilters = Boolean(filterAccount || filterCategory || filterType || search);

  // Categories to display for horizontal scroll (defaults to Expense categories, adapts to Income if Income selected)
  const displayedCategories = useMemo(() => {
    const targetType = filterType === 'Income' ? 'Income' : 'Expense';

    // 1. Defined categories from state matching targetType
    const list: { id: string; name: string; icon: string; color: string }[] = state.categories
      .filter(c => c.type === targetType)
      .map(c => ({
        id: c.id,
        name: c.name,
        icon: c.icon || (targetType === 'Expense' ? 'tag' : 'money-bill-wave'),
        color: c.color || (targetType === 'Expense' ? '#EF4444' : '#10B981'),
      }));

    // 2. Also collect any categories present in transactions of this type that might not be in state.categories
    const existingNames = new Set(list.map(c => c.name.toLowerCase()));
    state.transactions.forEach(tx => {
      const matchesType = targetType === 'Income' 
        ? (tx.type || '').toLowerCase() === 'income' 
        : (tx.type || '').toLowerCase() === 'expense';
      if (matchesType && tx.category && !existingNames.has(tx.category.toLowerCase())) {
        existingNames.add(tx.category.toLowerCase());
        list.push({
          id: `tx-cat-${tx.category}`,
          name: tx.category,
          icon: targetType === 'Expense' ? 'tag' : 'money-bill-wave',
          color: targetType === 'Expense' ? colors.primary : '#10B981',
        });
      }
    });

    // 3. Fallback to standard defaults if targetType is Expense and no categories exist yet
    if (targetType === 'Expense' && list.length === 0) {
      return DEFAULT_EXPENSE_CATEGORIES;
    }

    return list;
  }, [state.categories, state.transactions, filterType, colors.primary]);

  // Auto-scroll to selected category if present
  useEffect(() => {
    if (filterCategory && displayedCategories.length > 0) {
      const index = displayedCategories.findIndex(
        c => c.name.toLowerCase() === filterCategory.toLowerCase()
      );
      if (index >= 0 && categoryScrollRef.current) {
        setTimeout(() => {
          categoryScrollRef.current?.scrollTo({ x: Math.max(0, (index + 1) * 95 - 40), animated: true });
        }, 50);
      }
    }
  }, [filterCategory, displayedCategories]);

  const handleResetFilters = () => {
    setFilterAccount('');
    setFilterCategory('');
    setFilterType('');
    setSearch('');
  };

  const handleCategorySelect = (categoryName: string) => {
    if (filterCategory.toLowerCase() === categoryName.toLowerCase()) {
      // Toggle off if already selected
      setFilterCategory('');
    } else {
      setFilterCategory(categoryName);
      // If current filterType is Income or Transfer, adjust to Expense so transactions appear
      if (filterType === 'Income' || filterType === 'Transfer') {
        setFilterType('Expense');
      }
    }
  };

  const handleTypeSelect = (type: TransactionType | '') => {
    setFilterType(type);
    if (type === 'Income' && filterCategory) {
      const isIncome = state.categories.some(
        c => c.type === 'Income' && c.name.toLowerCase() === filterCategory.toLowerCase()
      );
      if (!isIncome) setFilterCategory('');
    } else if (type === 'Expense' && filterCategory) {
      const isExpense = state.categories.some(
        c => c.type === 'Expense' && c.name.toLowerCase() === filterCategory.toLowerCase()
      );
      if (!isExpense) setFilterCategory('');
    } else if (type === 'Transfer') {
      setFilterCategory('');
    }
  };

  // Filter transactions
  const filteredTransactions = state.transactions.filter(tx => {
    // Description search
    if (search && !(tx.description || '').toLowerCase().includes(search.toLowerCase())) {
      return false;
    }
    // Account filter
    if (filterAccount && tx.accountId !== filterAccount && tx.toAccountId !== filterAccount) {
      return false;
    }
    // Category filter
    if (filterCategory && (tx.category || '').toLowerCase() !== filterCategory.toLowerCase()) {
      return false;
    }
    // Type filter
    if (filterType && tx.type !== filterType) {
      return false;
    }
    return true;
  });

  // Group transactions by day
  const groupedTransactions: { title: string; data: Transaction[] }[] = [];
  const groups: Record<string, Transaction[]> = {};

  // Sort: newest first
  const sorted = [...filteredTransactions].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

  sorted.forEach(tx => {
    const d = new Date(tx.date);
    const today = new Date();
    const yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);

    let dayLabel = d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
    if (d.toDateString() === today.toDateString()) {
      dayLabel = 'Today';
    } else if (d.toDateString() === yesterday.toDateString()) {
      dayLabel = 'Yesterday';
    }

    if (!groups[dayLabel]) {
      groups[dayLabel] = [];
    }
    groups[dayLabel].push(tx);
  });

  Object.keys(groups).forEach(label => {
    groupedTransactions.push({
      title: label,
      data: groups[label],
    });
  });

  const openAddModal = () => {
    setEditingTransaction(null);
    setModalVisible(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    setModalVisible(true);
  };

  return (
    <GlassBackground>
      <SafeAreaView style={[styles.container, { paddingTop: Platform.OS === 'android' ? 36 : 8 }]}>
        {/* Floating Liquid Glass Header: Search & Filter */}
        <View style={[styles.header, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
          <View style={[styles.searchBar, { backgroundColor: colors.glassInput, borderColor: colors.glassBorder }]}>
            <FinanceIcon name="search" size={16} color={colors.textSecondary} style={styles.searchIcon} />
            <TextInput
              style={[styles.searchInput, { color: colors.text }]}
              placeholder="Search description..."
              placeholderTextColor={colors.textSecondary}
              value={search}
              onChangeText={setSearch}
            />
            {search ? (
              <Pressable onPress={() => setSearch('')}>
                <FinanceIcon name="times-circle" size={16} color={colors.textSecondary} />
              </Pressable>
            ) : null}
          </View>
          <Pressable 
            style={[
              styles.filterButton, 
              { 
                backgroundColor: showFilters ? colors.primary : (hasActiveFilters ? `${colors.primary}25` : colors.glassInput), 
                borderColor: showFilters ? colors.primary : (hasActiveFilters ? colors.primary : colors.glassBorder) 
              }
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <FinanceIcon 
              name="filter" 
              size={16} 
              color={showFilters ? '#FFF' : (hasActiveFilters ? colors.primary : colors.textSecondary)} 
            />
            {hasActiveFilters && (
              <View style={[styles.filterActiveDot, { backgroundColor: colors.primary }]} />
            )}
          </Pressable>
        </View>

        {/* ALWAYS-VISIBLE HORIZONTAL EXPENSE FILTER SCROLL */}
        <View style={styles.expenseQuickScrollContainer}>
          <ScrollView
            ref={categoryScrollRef}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.horizontalChipsScroll}
            style={styles.horizontalScrollWrapper}
          >
            <Pressable 
              style={[
                styles.filterChip, 
                { 
                  backgroundColor: filterCategory === '' ? colors.primary : colors.glassInput, 
                  borderColor: filterCategory === '' ? colors.primary : colors.glassBorder 
                }
              ]}
              onPress={() => setFilterCategory('')}
            >
              <Text style={[styles.filterChipText, { color: filterCategory === '' ? '#FFF' : colors.text }]}>All</Text>
            </Pressable>

            {displayedCategories.map(cat => {
              const isSelected = filterCategory.toLowerCase() === cat.name.toLowerCase();
              const catColor = cat.color || colors.primary;

              return (
                <Pressable 
                  key={cat.id}
                  style={[
                    styles.categoryFilterChip, 
                    { 
                      backgroundColor: isSelected 
                        ? (isDarkMode ? `${catColor}35` : `${catColor}18`) 
                        : colors.glassInput, 
                      borderColor: isSelected ? catColor : colors.glassBorder 
                    }
                  ]}
                  onPress={() => handleCategorySelect(cat.name)}
                >
                  <View 
                    style={[
                      styles.categoryChipIcon, 
                      { backgroundColor: isSelected ? catColor : `${catColor}24` }
                    ]}
                  >
                    <FinanceIcon 
                      name={cat.icon} 
                      size={11} 
                      color={isSelected ? '#FFFFFF' : catColor} 
                    />
                  </View>
                  <Text 
                    style={[
                      styles.filterChipText, 
                      { 
                        color: isSelected 
                          ? (isDarkMode ? '#FFFFFF' : catColor) 
                          : colors.text,
                        fontWeight: isSelected ? '700' : '600'
                      }
                    ]}
                  >
                    {cat.name}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>
        </View>

        {/* Expanded Filters Glass Card (Account & Type More Filters) */}
        {showFilters && (
          <View style={[styles.filtersPanel, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <View style={styles.filterTitleRow}>
              <Text style={[styles.filterTitle, { color: colors.text }]}>More Filters</Text>
              {hasActiveFilters && (
                <Pressable onPress={handleResetFilters} hitSlop={8}>
                  <Text style={[styles.resetButtonText, { color: colors.primary }]}>Reset All</Text>
                </Pressable>
              )}
            </View>

            {/* Account Selector */}
            <View style={styles.filtersRow}>
              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Account</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.horizontalScrollWrapper}>
                  <Pressable 
                    style={[
                      styles.filterChip, 
                      { 
                        backgroundColor: filterAccount === '' ? colors.primary : colors.glassInput, 
                        borderColor: filterAccount === '' ? colors.primary : colors.glassBorder 
                      }
                    ]}
                    onPress={() => setFilterAccount('')}
                  >
                    <Text style={[styles.filterChipText, { color: filterAccount === '' ? '#FFF' : colors.text }]}>All</Text>
                  </Pressable>
                  {state.accounts.map(acc => (
                    <Pressable 
                      key={acc.id}
                      style={[
                        styles.filterChip, 
                        { 
                          backgroundColor: filterAccount === acc.id ? colors.primary : colors.glassInput, 
                          borderColor: filterAccount === acc.id ? colors.primary : colors.glassBorder 
                        }
                      ]}
                      onPress={() => setFilterAccount(acc.id)}
                    >
                      <Text style={[styles.filterChipText, { color: filterAccount === acc.id ? '#FFF' : colors.text }]}>{acc.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              </View>
            </View>

            {/* Type Selector */}
            <View style={styles.filtersRow}>
              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Type</Text>
                <View style={styles.chipGroup}>
                  {['', 'Expense', 'Income', 'Transfer'].map(t => (
                    <Pressable 
                      key={t}
                      style={[
                        styles.filterChip, 
                        { 
                          backgroundColor: filterType === t ? colors.primary : colors.glassInput, 
                          borderColor: filterType === t ? colors.primary : colors.glassBorder 
                        }
                      ]}
                      onPress={() => handleTypeSelect(t as any)}
                    >
                      <Text style={[styles.filterChipText, { color: filterType === t ? '#FFF' : colors.text }]}>
                        {t === '' ? 'All' : t}
                      </Text>
                    </Pressable>
                  ))}
                </View>
              </View>
            </View>
          </View>
        )}

        {/* Transactions List Grouped in Liquid Glass Cards */}
        {groupedTransactions.length === 0 ? (
          <View style={[styles.emptyContainer, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <View style={[styles.emptyIconCircle, { backgroundColor: `${colors.primary}20` }]}>
              <FinanceIcon name={hasActiveFilters ? "filter" : "file-invoice-dollar"} size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>No transactions found.</Text>
            <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>
              {hasActiveFilters 
                ? 'Try adjusting or clearing your filters.' 
                : 'Add some transactions to track your finances.'}
            </Text>
            {hasActiveFilters && (
              <Pressable
                style={[styles.emptyResetBtn, { backgroundColor: colors.primary }]}
                onPress={handleResetFilters}
              >
                <Text style={styles.emptyResetBtnText}>Clear Filters</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <FlatList
            data={groupedTransactions}
            keyExtractor={item => item.title}
            contentContainerStyle={{ paddingBottom: 110 }}
            showsVerticalScrollIndicator={false}
            renderItem={({ item }) => (
              <View style={styles.dateGroupContainer}>
                <View style={styles.sectionHeader}>
                  <View style={[styles.dateDot, { backgroundColor: colors.primary }]} />
                  <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>{item.title}</Text>
                </View>
                <View style={[styles.transactionGroupCard, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
                  {item.data.map((tx, idx) => (
                    <TransactionRow 
                      key={tx.id} 
                      transaction={tx} 
                      isLast={idx === item.data.length - 1}
                      onPress={() => openEditModal(tx)}
                    />
                  ))}
                </View>
              </View>
            )}
          />
        )}

      {/* Add Button */}
      <Pressable 
        style={[
          styles.fab, 
          { 
            backgroundColor: colors.primary, 
            borderColor: colors.glassBorderHighlight,
            shadowColor: colors.primary,
          }
        ]} 
        onPress={openAddModal}
      >
        <FinanceIcon name="plus" size={20} color="#FFFFFF" />
      </Pressable>

      {/* Add/Edit Modal */}
      <TransactionModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        editingTransaction={editingTransaction}
      />
    </SafeAreaView>
    </GlassBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    marginHorizontal: 16,
    marginTop: 8,
    marginBottom: 12,
    borderRadius: 20,
    borderWidth: 1.2,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
    marginRight: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  filterButton: {
    width: 42,
    height: 42,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterButtonActive: {},
  filterActiveDot: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  activeFilterStrip: {
    marginHorizontal: 16,
    marginBottom: 10,
  },
  activeFilterScroll: {
    alignItems: 'center',
    gap: 8,
    paddingVertical: 2,
  },
  activeFilterPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
  },
  activeFilterPillText: {
    fontSize: 12,
    fontWeight: '600',
  },
  clearAllBtn: {
    paddingHorizontal: 8,
    paddingVertical: 6,
  },
  clearAllText: {
    fontSize: 12,
    fontWeight: '700',
  },
  filtersPanel: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.2,
  },
  filterTitleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  resetButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  expenseQuickScrollContainer: {
    marginBottom: 8,
    marginHorizontal: 16,
  },
  horizontalScrollWrapper: {
    minHeight: 44,
  },
  filtersRow: {
    marginBottom: 12,
  },
  filterGroup: {
    width: '100%',
  },
  filterGroupHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  clearText: {
    fontSize: 11,
    fontWeight: '600',
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  chipGroup: {
    flexDirection: 'row',
  },
  horizontalChipsScroll: {
    alignItems: 'center',
    paddingVertical: 4,
  },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  filterChipActive: {},
  filterChipText: {
    fontSize: 13,
    fontWeight: '600',
  },
  filterChipTextActive: {
    color: '#FFFFFF',
    fontWeight: '700',
  },
  categoryFilterChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
    paddingRight: 12,
    paddingVertical: 6,
    borderRadius: 12,
    borderWidth: 1,
    marginRight: 8,
  },
  categoryChipIcon: {
    width: 22,
    height: 22,
    borderRadius: 11,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  emptyFilterBox: {
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  emptyFilterBoxText: {
    fontSize: 12,
  },
  emptyResetBtn: {
    marginTop: 14,
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 12,
  },
  emptyResetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  dateGroupContainer: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 8,
    gap: 6,
  },
  dateDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  transactionGroupCard: {
    marginHorizontal: 16,
    borderRadius: 20,
    borderWidth: 1.2,
    overflow: 'hidden',
  },
  emptyContainer: {
    marginHorizontal: 16,
    marginTop: 40,
    borderRadius: 24,
    borderWidth: 1.2,
    padding: 32,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 17,
    fontWeight: '700',
    marginBottom: 6,
  },
  emptySubText: {
    fontSize: 14,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    bottom: 96,
    right: 20,
    width: 58,
    height: 58,
    borderRadius: 29,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1.5,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 14,
    elevation: 8,
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
  headerSaveButton: {
    padding: 6,
    marginLeft: 8,
  },
  headerSaveButtonText: {
    fontSize: 15,
    fontWeight: '700',
  },
  form: {
    flex: 1,
  },
  formContent: {
    padding: 16,
  },
  typeSelectorContainer: {
    marginBottom: 16,
  },
  typeTabs: {
    flexDirection: 'row',
    backgroundColor: '#F1F5F9',
    borderRadius: 10,
    padding: 3,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTypeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  typeTabText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748B',
  },
  activeTypeTabText: {
    color: '#FFFFFF',
  },
  label: {
    fontSize: 14,
    color: '#666',
    marginBottom: 6,
    fontWeight: '500',
  },
  accountsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  accountSelectorCard: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  accountSelectorCardSelected: {
    borderColor: '#0F172A',
    backgroundColor: '#0F172A',
  },
  accountSelectorName: {
    fontSize: 14,
    color: '#475569',
    fontWeight: '500',
  },
  accountSelectorNameSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
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
  saveButton: {
    backgroundColor: '#0F172A',
    borderRadius: 10,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 24,
    marginBottom: 40,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
