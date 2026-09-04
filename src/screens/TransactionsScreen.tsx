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
import { Transaction, TransactionType, Split } from '../types/finance';
import { TransactionRow } from '../components/TransactionRow';
import { AmountInput, AmountDisplay } from '../components/AmountInput';
import { Numpad } from '../components/Numpad';
import { CategoryPicker } from '../components/CategoryPicker';
import { DatePicker } from '../components/DatePicker';
import { SplitEditor } from '../components/SplitEditor';
import { FinanceIcon } from '../utils/iconMap';
import { useForm, Controller } from 'react-hook-form';
import { showAlert } from '../utils/alert';
import { useTheme } from '../utils/theme';
import { GlassBackground } from '../components/GlassBackground';

export const TransactionsScreen: React.FC = () => {
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

  // Modal form states
  const [modalVisible, setModalVisible] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);

  // react-hook-form initialization
  const { control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      type: 'Expense' as TransactionType,
      accountId: '',
      toAccountId: '',
      amount: '',
      description: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      isReceivable: false,
      contactId: '',
      splits: [] as Split[],
    }
  });

  const selectedType = watch('type');
  const watchAmount = watch('amount');

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
    if (filterCategory && tx.category.toLowerCase() !== filterCategory.toLowerCase()) {
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
    const defaultAcc = state.accounts.find(a => a.isDefault)?.id || (state.accounts[0]?.id || '');
    reset({
      type: 'Expense',
      accountId: defaultAcc,
      toAccountId: '',
      amount: '',
      description: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      isReceivable: false,
      contactId: '',
      splits: [],
    });
    setModalVisible(true);
  };

  const openEditModal = (tx: Transaction) => {
    setEditingTransaction(tx);
    reset({
      type: tx.type,
      accountId: tx.accountId,
      toAccountId: tx.toAccountId || '',
      amount: tx.amount.toString(),
      description: tx.description || '',
      category: tx.category,
      date: tx.date.split('T')[0],
      isReceivable: tx.isReceivable || false,
      contactId: tx.contactId || '',
      splits: tx.splits || [],
    });
    setModalVisible(true);
  };

  const onSubmit = async (data: any) => {
    const amountVal = parseFloat(data.amount);
    if (isNaN(amountVal) || amountVal <= 0) {
      showAlert('Validation Error', 'Please enter a valid amount greater than 0.');
      return;
    }

    if (!data.accountId) {
      showAlert('Validation Error', 'Please select an account.');
      return;
    }

    if (data.type === 'Transfer') {
      if (!data.toAccountId) {
        showAlert('Validation Error', 'Please select destination account.');
        return;
      }
      if (data.accountId === data.toAccountId) {
        showAlert('Validation Error', 'Source and destination accounts must be different.');
        return;
      }
    } else {
      if (!data.category) {
        showAlert('Validation Error', 'Please select a category.');
        return;
      }
    }

    // Prepare transaction payload
    const txPayload: Omit<Transaction, 'id'> = {
      accountId: data.accountId,
      type: data.type,
      amount: amountVal,
      description: data.description,
      category: data.type === 'Transfer' ? 'Transfer' : data.category,
      date: new Date(data.date).toISOString(),
      isReceivable: data.isReceivable,
      ...(data.type === 'Transfer' && { toAccountId: data.toAccountId }),
      ...(data.isReceivable && {
        contactId: data.contactId,
        splits: data.splits,
      }),
    };

    try {
      if (editingTransaction) {
        await editTransaction({ ...txPayload, id: editingTransaction.id });
      } else {
        await addTransaction(txPayload);
      }
      setModalVisible(false);
    } catch (e) {
      showAlert('Error', 'Failed to save transaction: ' + e);
    }
  };

  const handleDelete = () => {
    if (!editingTransaction) return;
    showAlert(
      'Confirm Delete',
      'Are you sure you want to delete this transaction?',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await deleteTransaction(editingTransaction.id);
            setModalVisible(false);
          } 
        }
      ]
    );
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container}>
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
                backgroundColor: showFilters ? colors.primary : colors.glassInput, 
                borderColor: showFilters ? colors.primary : colors.glassBorder 
              }
            ]}
            onPress={() => setShowFilters(!showFilters)}
          >
            <FinanceIcon name="filter" size={16} color={showFilters ? '#FFF' : colors.textSecondary} />
          </Pressable>
        </View>

        {/* Expanded Filters Glass Card */}
        {showFilters && (
          <View style={[styles.filtersPanel, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <Text style={[styles.filterTitle, { color: colors.text }]}>Filters</Text>
            <View style={styles.filtersRow}>
              {/* Account Selector */}
              <View style={styles.filterGroup}>
                <Text style={[styles.filterLabel, { color: colors.textSecondary }]}>Account</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false}>
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

            <View style={styles.filtersRow}>
              {/* Type Selector */}
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
                      onPress={() => setFilterType(t as any)}
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
              <FinanceIcon name="file-invoice-dollar" size={36} color={colors.primary} />
            </View>
            <Text style={[styles.emptyText, { color: colors.text }]}>No transactions found.</Text>
            <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>Add some transactions to track your finances.</Text>
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
      <Modal
        visible={modalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setModalVisible(false)}
      >
        <GlassBackground>
        <SafeAreaView style={[styles.modalContainer, { backgroundColor: 'transparent' }]}>
          <View style={[styles.modalHeader, { borderBottomColor: colors.border }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              {editingTransaction ? 'Edit Transaction' : 'New Transaction'}
            </Text>
            <View style={styles.modalHeaderButtons}>
              {editingTransaction && (
                <Pressable onPress={handleDelete} style={styles.deleteButton}>
                  <FinanceIcon name="trash" size={16} color="#EF4444" />
                </Pressable>
              )}
              <Pressable onPress={() => setModalVisible(false)} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSubmit(onSubmit)} style={styles.headerSaveButton}>
                <Text style={[styles.headerSaveButtonText, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.form} contentContainerStyle={styles.formContent}>
            {/* Type Switcher */}
            <View style={styles.typeSelectorContainer}>
              <Controller
                name="type"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <View style={[styles.typeTabs, { backgroundColor: colors.inputBackground }]}>
                    {(['Expense', 'Income', 'Transfer'] as TransactionType[]).map(t => (
                      <Pressable
                        key={t}
                        style={[
                          styles.typeTab,
                          value === t && styles.activeTypeTab,
                          value === t && t === 'Expense' && { backgroundColor: '#EF4444' },
                          value === t && t === 'Income' && { backgroundColor: '#10B981' },
                          value === t && t === 'Transfer' && { backgroundColor: '#3B82F6' },
                        ]}
                        onPress={() => {
                          onChange(t);
                          setValue('category', '');
                        }}
                      >
                        <Text style={[styles.typeTabText, { color: colors.textSecondary }, value === t && { color: '#FFFFFF', fontWeight: '700' }]}>
                          {t}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                )}
              />
            </View>

            {/* Amount Display */}
            <Controller
              name="amount"
              control={control}
              render={({ field: { value, onChange } }) => (
                <AmountDisplay
                  value={value}
                  onClear={() => onChange('')}
                  label="Amount"
                />
              )}
            />

            {/* Category Picker (Fixed horizontal scroll for Expense/Income) */}
            {selectedType !== 'Transfer' && (
              <Controller
                name="category"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <CategoryPicker
                    value={value}
                    onChange={onChange}
                    type={selectedType as any}
                  />
                )}
              />
            )}

            {/* Account / From Account Selector */}
            <Text style={[styles.label, { color: colors.textSecondary }]}>{selectedType === 'Transfer' ? 'From Account' : 'Account'}</Text>
            <Controller
              name="accountId"
              control={control}
              render={({ field: { value, onChange } }) => (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsRow}>
                  {state.accounts.map(acc => (
                    <Pressable
                      key={acc.id}
                      style={[
                        styles.accountSelectorCard,
                        { backgroundColor: colors.card, borderColor: colors.border },
                        value === acc.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}
                      onPress={() => onChange(acc.id)}
                    >
                      <Text style={[
                        styles.accountSelectorName,
                        { color: colors.text },
                        value === acc.id && { color: '#FFFFFF', fontWeight: '700' }
                      ]}>{acc.name}</Text>
                    </Pressable>
                  ))}
                </ScrollView>
              )}
            />

            {/* To Account Selector (Only for Transfer) */}
            {selectedType === 'Transfer' && (
              <>
                <Text style={[styles.label, { color: colors.textSecondary }]}>To Account</Text>
                <Controller
                  name="toAccountId"
                  control={control}
                  render={({ field: { value, onChange } }) => (
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.accountsRow}>
                      {state.accounts.map(acc => (
                        <Pressable
                          key={acc.id}
                          style={[
                            styles.accountSelectorCard,
                            { backgroundColor: colors.card, borderColor: colors.border },
                            value === acc.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                          ]}
                          onPress={() => onChange(acc.id)}
                        >
                          <Text style={[
                            styles.accountSelectorName,
                            { color: colors.text },
                            value === acc.id && { color: '#FFFFFF', fontWeight: '700' }
                          ]}>{acc.name}</Text>
                        </Pressable>
                      ))}
                    </ScrollView>
                  )}
                />
              </>
            )}

            {/* Numpad for entering amount */}
            <Controller
              name="amount"
              control={control}
              render={({ field: { value, onChange } }) => (
                <Numpad
                  value={value}
                  onChange={onChange}
                />
              )}
            />

            {/* Date Picker */}
            <Controller
              name="date"
              control={control}
              render={({ field: { value, onChange } }) => (
                <DatePicker
                  value={value}
                  onChange={onChange}
                  label="Date"
                />
              )}
            />

            {/* Description Input */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Description</Text>
              <Controller
                name="description"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g. Groceries, Salary, etc."
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>

            {/* Split / Receivable (Only for Expense) */}
            {selectedType === 'Expense' && (
              <Controller
                name="splits"
                control={control}
                render={({ field: { value, onChange } }) => {
                  const isReceivableVal = watch('isReceivable');
                  const contactIdVal = watch('contactId');
                  
                  return (
                    <SplitEditor
                      totalAmount={parseFloat(watchAmount) || 0}
                      splits={value}
                      onChangeSplits={onChange}
                      contactId={contactIdVal}
                      onChangeContactId={(id) => setValue('contactId', id)}
                      isReceivable={isReceivableVal}
                      onChangeIsReceivable={(val) => setValue('isReceivable', val)}
                    />
                  );
                }}
              />
            )}

            {/* Save Button */}
            <Pressable style={styles.saveButton} onPress={handleSubmit(onSubmit)}>
              <Text style={styles.saveButtonText}>Save Transaction</Text>
            </Pressable>
          </ScrollView>
        </SafeAreaView>
        </GlassBackground>
      </Modal>
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
  filtersPanel: {
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    borderRadius: 20,
    borderWidth: 1.2,
  },
  filterTitle: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  filtersRow: {
    marginBottom: 12,
  },
  filterGroup: {
    flex: 1,
  },
  filterLabel: {
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 6,
  },
  chipGroup: {
    flexDirection: 'row',
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
