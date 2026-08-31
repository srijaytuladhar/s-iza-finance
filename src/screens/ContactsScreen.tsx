import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  Modal, 
  TextInput, 
  SafeAreaView 
} from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { Contact } from '../types/finance';
import { FinanceIcon } from '../utils/iconMap';
import { formatNumber } from '../utils/format';
import { useNavigation } from '@react-navigation/native';
import { showAlert } from '../utils/alert';
import { useTheme } from '../utils/theme';

export const ContactsScreen: React.FC = () => {
  const { state, addContact, deleteContact } = useFinance();
  const { colors, isDarkMode } = useTheme();
  const navigation = useNavigation<any>();
  const [modalVisible, setModalVisible] = useState(false);
  const [contactName, setContactName] = useState('');
  const currencySymbol = state.settings.currencySymbol;

  const handleAddContact = async () => {
    if (!contactName.trim()) {
      showAlert('Validation Error', 'Please enter a name.');
      return;
    }
    await addContact(contactName.trim());
    setContactName('');
    setModalVisible(false);
  };

  const handleDeleteContact = (contact: Contact) => {
    showAlert(
      'Confirm Delete',
      `Are you sure you want to delete "${contact.name}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Delete', 
          style: 'destructive',
          onPress: async () => {
            await deleteContact(contact.id);
          } 
        }
      ]
    );
  };

  // Helper to compute net balance for a contact
  const getContactNetBalance = (contactId: string): number => {
    let owedToUs = 0;
    let weOwe = 0;

    state.transactions.forEach(tx => {
      if (tx.isReceivable && tx.contactId === contactId) {
        if (tx.type === 'Expense') {
          if (tx.splits && tx.splits.length > 0) {
            tx.splits.forEach(s => {
              if (s.contactId === contactId && !s.isSettled) {
                owedToUs += s.amount;
              }
            });
          } else {
            owedToUs += tx.amount;
          }
        } else if (tx.type === 'Income') {
          weOwe += tx.amount;
        }
      }
    });

    return owedToUs - weOwe;
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      {state.contacts.length === 0 ? (
        <View style={styles.emptyContainer}>
          <FinanceIcon name="users" size={48} color={colors.textSecondary} />
          <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No contacts added yet.</Text>
          <Text style={[styles.emptySubText, { color: colors.textSecondary }]}>Add contacts to split bills and track shared expenses.</Text>
          <Pressable style={styles.emptyButton} onPress={() => setModalVisible(true)}>
            <Text style={styles.emptyButtonText}>Add Contact</Text>
          </Pressable>
        </View>
      ) : (
        <FlatList
          data={state.contacts}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.listContent}
          renderItem={({ item }) => {
            const netBalance = getContactNetBalance(item.id);
            const balanceColor = netBalance > 0 ? '#10B981' : netBalance < 0 ? '#EF4444' : colors.textSecondary;
            const balanceLabel = netBalance > 0 
              ? `owes you ${formatNumber(netBalance, currencySymbol)}` 
              : netBalance < 0 
                ? `you owe ${formatNumber(Math.abs(netBalance), currencySymbol)}`
                : 'Settled';

            return (
              <Pressable 
                style={[styles.contactRow, { backgroundColor: colors.card, borderColor: colors.border }]}
                onPress={() => navigation.navigate('ContactDetail', { contactId: item.id })}
              >
                <View style={[styles.avatar, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
                  <Text style={[styles.avatarText, { color: colors.text }]}>{item.name.charAt(0).toUpperCase()}</Text>
                </View>
                <View style={styles.contactInfo}>
                  <Text style={[styles.contactName, { color: colors.text }]}>{item.name}</Text>
                  <Text style={[styles.balanceText, { color: balanceColor }]}>{balanceLabel}</Text>
                </View>
                <Pressable onPress={() => handleDeleteContact(item)} style={styles.deleteBtn}>
                  <FinanceIcon name="trash" size={14} color="#EF4444" />
                </Pressable>
              </Pressable>
            );
          }}
        />
      )}

      {state.contacts.length > 0 && (
        <Pressable style={styles.fab} onPress={() => setModalVisible(true)}>
          <FinanceIcon name="plus" size={20} color="#FFFFFF" />
        </Pressable>
      )}

      {/* Add Contact Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Add Contact</Text>
            <TextInput
              style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
              placeholder="Contact Name"
              placeholderTextColor={colors.textSecondary}
              value={contactName}
              onChangeText={setContactName}
              autoFocus
            />
            <View style={styles.modalButtons}>
              <Pressable style={[styles.modalBtn, styles.cancelBtn]} onPress={() => setModalVisible(false)}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable style={[styles.modalBtn, styles.saveBtn]} onPress={handleAddContact}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
        </View>
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
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    padding: 14,
    borderRadius: 12,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  avatarText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#475569',
  },
  contactInfo: {
    flex: 1,
  },
  contactName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
  },
  balanceText: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  deleteBtn: {
    padding: 6,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    width: '100%',
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
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
    marginBottom: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    marginLeft: 8,
  },
  cancelBtn: {
    backgroundColor: '#F1F5F9',
  },
  cancelBtnText: {
    color: '#475569',
    fontWeight: '600',
  },
  saveBtn: {
    backgroundColor: '#0F172A',
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
