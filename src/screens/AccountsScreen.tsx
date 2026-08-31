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
  SafeAreaView, 
  Switch 
} from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { Account, AccountType } from '../types/finance';
import { AccountCard } from '../components/AccountCard';
import { FinanceIcon } from '../utils/iconMap';
import { useForm, Controller } from 'react-hook-form';
import { showAlert } from '../utils/alert';
import { useTheme } from '../utils/theme';

const PRESETS_COLORS = [
  '#3B82F6', // Blue
  '#10B981', // Green
  '#EF4444', // Red
  '#F59E0B', // Amber
  '#8B5CF6', // Purple
  '#EC4899', // Pink
  '#06B6D4', // Cyan
  '#14B8A6', // Teal
  '#64748B', // Slate
];

export const AccountsScreen: React.FC = () => {
  const { state, addAccount, editAccount, deleteAccount } = useFinance();
  const { colors, isDarkMode } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);
  const [editingAccount, setEditingAccount] = useState<Account | null>(null);

  const { control, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      name: '',
      type: 'Bank' as AccountType,
      initialBalance: '',
      color: '#3B82F6',
      isDefault: false,
    }
  });

  const openAddModal = () => {
    setEditingAccount(null);
    reset({
      name: '',
      type: 'Bank',
      initialBalance: '0',
      color: '#3B82F6',
      isDefault: state.accounts.length === 0, // default if first account
    });
    setModalVisible(true);
  };

  const openEditModal = (acc: Account) => {
    setEditingAccount(acc);
    reset({
      name: acc.name,
      type: acc.type,
      initialBalance: acc.initialBalance.toString(),
      color: acc.color,
      isDefault: acc.isDefault || false,
    });
    setModalVisible(true);
  };

  const onSubmit = async (data: any) => {
    if (!data.name.trim()) {
      showAlert('Validation Error', 'Please enter an account name.');
      return;
    }

    const initBal = parseFloat(data.initialBalance);
    if (isNaN(initBal)) {
      showAlert('Validation Error', 'Please enter a valid initial balance.');
      return;
    }

    const accountPayload = {
      name: data.name.trim(),
      type: data.type,
      initialBalance: initBal,
      color: data.color,
      isDefault: data.isDefault,
    };

    try {
      if (editingAccount) {
        await editAccount({
          ...editingAccount,
          ...accountPayload,
        });
      } else {
        await addAccount(accountPayload);
      }
      setModalVisible(false);
    } catch (e) {
      showAlert('Error', 'Failed to save account: ' + e);
    }
  };

  const handleDelete = () => {
    if (!editingAccount) return;
    
    // Check if account is in use by any transaction
    const inUse = state.transactions.some(
      tx => tx.accountId === editingAccount.id || tx.toAccountId === editingAccount.id
    );

    if (inUse) {
      showAlert(
        'Cannot Delete',
        'This account is in use by one or more transactions. Please delete or reassign those transactions first.'
      );
      return;
    }

    showAlert(
      'Confirm Delete',
      `Are you sure you want to delete "${editingAccount.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await deleteAccount(editingAccount.id);
            setModalVisible(false);
          } 
        }
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {state.accounts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FinanceIcon name="university" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No accounts added yet.</Text>
          <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>Create your first Bank, Wallet, or Cash account.</Text>
          <Pressable style={styles.emptyButton} onPress={openAddModal}>
            <Text style={styles.emptyButtonText}>Add Account</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={state.accounts}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => (
            <AccountCard 
              account={item} 
              onPress={() => openEditModal(item)}
            />
          )}
        />
      )}

      {state.accounts.length > 0 && (
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
              {editingAccount ? 'Edit Account' : 'New Account'}
            </Text>
            <View style={styles.modalHeaderButtons}>
              {editingAccount && (
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
            {/* Account Name */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Account Name</Text>
              <Controller
                name="name"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                    placeholder="e.g. Nabil Bank, Cash Wallet"
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                  />
                )}
              />
            </View>

            {/* Type Selector */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Account Type</Text>
              <Controller
                name="type"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <View style={styles.typeSelectorRow}>
                    {(['Bank', 'Wallet', 'Cash'] as AccountType[]).map(t => (
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

            {/* Initial Balance */}
            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Initial Balance</Text>
              <Controller
                name="initialBalance"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <TextInput
                    style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                    keyboardType="decimal-pad"
                    placeholder="0.00"
                    placeholderTextColor={colors.textSecondary}
                    value={value}
                    onChangeText={onChange}
                    editable={!editingAccount} // Initial balance edit can be restricted, but allow if needed.
                  />
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

            {/* Set Default Toggle */}
            <View style={styles.toggleRow}>
              <View>
                <Text style={[styles.toggleLabel, { color: colors.text }]}>Default Account</Text>
                <Text style={[styles.toggleDesc, { color: colors.textSecondary }]}>Use this account as default for new transactions</Text>
              </View>
              <Controller
                name="isDefault"
                control={control}
                render={({ field: { value, onChange } }) => (
                  <Switch
                    value={value}
                    onValueChange={onChange}
                    disabled={editingAccount?.isDefault} // Cannot turn off if it is already default
                  />
                )}
              />
            </View>

            {/* Save Button */}
            <Pressable style={styles.saveButton} onPress={handleSubmit(onSubmit)}>
              <Text style={styles.saveButtonText}>Save Account</Text>
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
  listContent: {
    padding: 16,
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
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: '#F1F5F9',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
    marginBottom: 24,
  },
  toggleLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  toggleDesc: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
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
