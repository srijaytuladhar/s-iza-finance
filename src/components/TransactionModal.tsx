import React, { useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  Modal, 
  TextInput, 
  ScrollView, 
  SafeAreaView 
} from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { Transaction, TransactionType } from '../types/finance';
import { AmountDisplay } from './AmountInput';
import { Numpad } from './Numpad';
import { CategoryPicker } from './CategoryPicker';
import { DatePicker } from './DatePicker';
import { SplitEditor } from './SplitEditor';
import { FinanceIcon } from '../utils/iconMap';
import { useForm, Controller } from 'react-hook-form';
import { showAlert } from '../utils/alert';
import { useTheme } from '../utils/theme';
import { GlassBackground } from './GlassBackground';

export interface TransactionModalProps {
  visible: boolean;
  onClose: () => void;
  initialType?: TransactionType;
  editingTransaction?: Transaction | null;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  visible,
  onClose,
  initialType = 'Expense',
  editingTransaction,
}) => {
  const { 
    state, 
    addTransaction, 
    editTransaction, 
    deleteTransaction 
  } = useFinance();
  const { colors } = useTheme();

  const { control, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      type: initialType as TransactionType,
      accountId: '',
      toAccountId: '',
      amount: '',
      description: '',
      category: '',
      date: new Date().toISOString().split('T')[0],
      isReceivable: false,
      contactId: '',
      splits: [],
    },
  });

  const selectedType = watch('type');
  const watchAmount = watch('amount');

  useEffect(() => {
    if (visible) {
      if (editingTransaction) {
        reset({
          type: editingTransaction.type,
          accountId: editingTransaction.accountId,
          toAccountId: editingTransaction.toAccountId || '',
          amount: editingTransaction.amount.toString(),
          description: editingTransaction.description || '',
          category: editingTransaction.category,
          date: editingTransaction.date.split('T')[0],
          isReceivable: editingTransaction.isReceivable || false,
          contactId: editingTransaction.contactId || '',
          splits: (editingTransaction.splits as any) || [],
        });
      } else {
        const defaultAcc = state.accounts.find(a => a.isDefault)?.id || (state.accounts[0]?.id || '');
        reset({
          type: initialType,
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
      }
    }
  }, [visible, editingTransaction, initialType]);

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
      onClose();
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
            onClose();
          } 
        }
      ]
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
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
              <Pressable onPress={onClose} style={styles.closeButton}>
                <Text style={styles.closeButtonText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={handleSubmit(onSubmit)} style={styles.headerSaveButton}>
                <Text style={[styles.headerSaveButtonText, { color: colors.primary }]}>Save</Text>
              </Pressable>
            </View>
          </View>

          <ScrollView style={styles.form} contentContainerStyle={styles.formContent} showsVerticalScrollIndicator={false}>
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
  );
};

const styles = StyleSheet.create({
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    color: '#64748B',
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
    paddingBottom: 40,
  },
  typeSelectorContainer: {
    marginBottom: 16,
  },
  typeTabs: {
    flexDirection: 'row',
    borderRadius: 12,
    padding: 4,
  },
  typeTab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 9,
  },
  activeTypeTab: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  typeTabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  label: {
    fontSize: 13,
    marginBottom: 8,
    fontWeight: '600',
  },
  accountsRow: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  accountSelectorCard: {
    borderWidth: 1.2,
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 9,
    marginRight: 8,
  },
  accountSelectorName: {
    fontSize: 13,
    fontWeight: '600',
  },
  inputGroup: {
    marginBottom: 16,
  },
  textInput: {
    borderWidth: 1.2,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 48,
    fontSize: 15,
  },
  saveButton: {
    backgroundColor: '#0284C7',
    paddingVertical: 15,
    borderRadius: 16,
    alignItems: 'center',
    marginTop: 14,
    marginBottom: 20,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 4,
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
});
