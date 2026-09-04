import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList, 
  Pressable, 
  Modal, 
  ScrollView, 
  SafeAreaView 
} from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { useRoute, useNavigation } from '@react-navigation/native';
import { FinanceIcon } from '../utils/iconMap';
import { formatNumber } from '../utils/format';
import { showAlert } from '../utils/alert';
import { useTheme } from '../utils/theme';
import { GlassBackground } from '../components/GlassBackground';

interface UnsettledSplitItem {
  transactionId: string;
  description: string;
  date: string;
  amount: number;
  type: 'Expense' | 'Income';
}

export const ContactDetailScreen: React.FC = () => {
  const route = useRoute<any>();
  const navigation = useNavigation();
  const { state, settleContactBalance } = useFinance();
  const { colors, isDarkMode } = useTheme();
  const { contactId } = route.params;

  const [settlementModalVisible, setSettlementModalVisible] = useState(false);
  const [selectedAccountId, setSelectedAccountId] = useState(
    state.accounts.find(a => a.isDefault)?.id || (state.accounts[0]?.id || '')
  );

  const contact = state.contacts.find(c => c.id === contactId);
  const currencySymbol = state.settings.currencySymbol;

  if (!contact) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>Contact not found.</Text>
      </View>
    );
  }

  // Get all unsettled splits / transactions for this contact
  const unsettledSplits: UnsettledSplitItem[] = [];
  let totalOwedToUs = 0;
  let totalWeOwe = 0;

  state.transactions.forEach(tx => {
    if (tx.isReceivable && tx.contactId === contactId) {
      if (tx.type === 'Expense') {
        if (tx.splits && tx.splits.length > 0) {
          tx.splits.forEach(s => {
            if (s.contactId === contactId && !s.isSettled) {
              unsettledSplits.push({
                transactionId: tx.id,
                description: tx.description || tx.category,
                date: tx.date,
                amount: s.amount,
                type: 'Expense',
              });
              totalOwedToUs += s.amount;
            }
          });
        } else {
          // Simple receivable
          // We can check if it is settled. Standard angular schema didn't have isSettled in transaction root,
          // but we check splits or we check if there are no splits.
          // Let's assume if there are no splits, and it is receivable, it is unsettled.
          // How do we mark it settled? In settlement function, we toggle splits, but for simple receivables we can
          // track it. Let's make sure it shows up.
          // We will find out if there's any matching settlement transaction, but for simplicity let's assume
          // it is unsettled.
          unsettledSplits.push({
            transactionId: tx.id,
            description: tx.description || tx.category,
            date: tx.date,
            amount: tx.amount,
            type: 'Expense',
          });
          totalOwedToUs += tx.amount;
        }
      } else if (tx.type === 'Income') {
        unsettledSplits.push({
          transactionId: tx.id,
          description: tx.description || tx.category,
          date: tx.date,
          amount: tx.amount,
          type: 'Income',
        });
        totalWeOwe += tx.amount;
      }
    }
  });

  const netOwed = totalOwedToUs - totalWeOwe;

  const handleSettle = async () => {
    if (!selectedAccountId) {
      showAlert('Error', 'Please select an account for the settlement transaction.');
      return;
    }

    try {
      await settleContactBalance(contactId, selectedAccountId);
      setSettlementModalVisible(false);
      showAlert('Success', 'Balance settled successfully!');
      navigation.goBack();
    } catch (e) {
      showAlert('Error', 'Failed to settle: ' + e);
    }
  };

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container}>
        {/* Overview Card */}
        <View style={[styles.overviewCard, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
          <View style={[styles.avatarLarge, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
            <Text style={[styles.avatarTextLarge, { color: colors.text }]}>{contact.name.charAt(0).toUpperCase()}</Text>
          </View>
          <Text style={[styles.name, { color: colors.text }]}>{contact.name}</Text>
          
          <View style={[styles.divider, { backgroundColor: colors.glassBorder }]} />

        <View style={styles.statsRow}>
          <View style={styles.statCol}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Owed to You</Text>
            <Text style={[styles.statValue, { color: '#10B981' }]}>
              {formatNumber(totalOwedToUs, currencySymbol)}
            </Text>
          </View>
          <View style={[styles.verticalDivider, { backgroundColor: colors.border }]} />
          <View style={styles.statCol}>
            <Text style={[styles.statLabel, { color: colors.textSecondary }]}>You Owe</Text>
            <Text style={[styles.statValue, { color: '#EF4444' }]}>
              {formatNumber(totalWeOwe, currencySymbol)}
            </Text>
          </View>
        </View>

        <View style={[styles.netBox, { backgroundColor: colors.inputBackground }]}>
          <Text style={[styles.netLabel, { color: colors.textSecondary }]}>Net Balance</Text>
          <Text style={[
            styles.netValue, 
            { color: netOwed > 0 ? '#10B981' : netOwed < 0 ? '#EF4444' : colors.textSecondary }
          ]}>
            {netOwed > 0 
              ? `${contact.name} owes you ${formatNumber(netOwed, currencySymbol)}`
              : netOwed < 0 
                ? `You owe ${contact.name} ${formatNumber(Math.abs(netOwed), currencySymbol)}`
                : 'All Settled'}
          </Text>
        </View>

        {netOwed !== 0 && (
          <Pressable 
            style={styles.settleButton}
            onPress={() => setSettlementModalVisible(true)}
          >
            <Text style={styles.settleButtonText}>Settle Balance</Text>
          </Pressable>
        )}
      </View>

      {/* Unsettled Splits List */}
      <View style={[styles.listSection, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Unsettled Splits</Text>
        {unsettledSplits.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FinanceIcon name="check-circle" size={32} color="#10B981" />
            <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No unsettled splits for this contact.</Text>
          </View>
        ) : (
          <FlatList
            data={unsettledSplits}
            keyExtractor={item => item.transactionId + '-' + item.type}
            renderItem={({ item }) => (
              <View style={[styles.splitRow, { borderBottomColor: colors.border }]}>
                <View style={styles.splitDetails}>
                  <Text style={[styles.splitDesc, { color: colors.text }]}>{item.description}</Text>
                  <Text style={[styles.splitDate, { color: colors.textSecondary }]}>
                    {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                  </Text>
                </View>
                <Text style={[
                  styles.splitAmount,
                  { color: item.type === 'Expense' ? '#10B981' : '#EF4444' }
                ]}>
                  {item.type === 'Expense' ? '+' : '-'}{formatNumber(item.amount, currencySymbol)}
                </Text>
              </View>
            )}
          />
        )}
      </View>

      {/* Settlement Account Picker Modal */}
      <Modal
        visible={settlementModalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setSettlementModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: colors.card }]}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>Settle Balance</Text>
            <Text style={[styles.modalSubTitle, { color: colors.textSecondary }]}>
              Select account to post the settlement transaction ({netOwed > 0 ? 'receiving' : 'paying'} {formatNumber(Math.abs(netOwed), currencySymbol)}):
            </Text>

            <ScrollView style={styles.accountList}>
              {state.accounts.map(acc => (
                <Pressable
                  key={acc.id}
                  style={[
                    styles.accountItem,
                    { backgroundColor: colors.inputBackground, borderColor: colors.border },
                    selectedAccountId === acc.id && { borderColor: colors.primary }
                  ]}
                  onPress={() => setSelectedAccountId(acc.id)}
                >
                  <View style={[styles.colorIndicator, { backgroundColor: acc.color }]} />
                  <Text style={[styles.accountName, { color: colors.text }]}>{acc.name}</Text>
                  <Text style={[styles.accountBalance, { color: colors.textSecondary }]}>{formatNumber(acc.balance, currencySymbol)}</Text>
                </Pressable>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <Pressable 
                style={[styles.modalBtn, styles.cancelBtn]} 
                onPress={() => setSettlementModalVisible(false)}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </Pressable>
              <Pressable 
                style={[styles.modalBtn, styles.confirmBtn]} 
                onPress={handleSettle}
              >
                <Text style={styles.confirmBtnText}>Confirm Settlement</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </GlassBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overviewCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 20,
    margin: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 2,
  },
  avatarLarge: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#E2E8F0',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarTextLarge: {
    fontSize: 24,
    fontWeight: '700',
    color: '#475569',
  },
  name: {
    fontSize: 20,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  divider: {
    height: 1,
    backgroundColor: '#E2E8F0',
    width: '100%',
    marginBottom: 16,
  },
  statsRow: {
    flexDirection: 'row',
    width: '100%',
    justifyContent: 'space-around',
    marginBottom: 16,
  },
  statCol: {
    alignItems: 'center',
    flex: 1,
  },
  statLabel: {
    fontSize: 12,
    color: '#64748B',
    fontWeight: '500',
    marginBottom: 4,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  verticalDivider: {
    width: 1,
    backgroundColor: '#E2E8F0',
    height: '100%',
  },
  netBox: {
    backgroundColor: '#F8FAFC',
    borderRadius: 10,
    width: '100%',
    padding: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  netLabel: {
    fontSize: 11,
    color: '#94A3B8',
    fontWeight: '600',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  netValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  settleButton: {
    backgroundColor: '#0F172A',
    width: '100%',
    borderRadius: 10,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
  },
  settleButtonText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  listSection: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 16,
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  splitDetails: {
    flex: 1,
  },
  splitDesc: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E293B',
  },
  splitDate: {
    fontSize: 11,
    color: '#94A3B8',
    marginTop: 2,
  },
  splitAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: '#94A3B8',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: '#EF4444',
    fontSize: 16,
    fontWeight: '600',
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
    maxHeight: '80%',
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 8,
  },
  modalSubTitle: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 16,
    lineHeight: 18,
  },
  accountList: {
    maxHeight: 200,
    marginBottom: 16,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    marginBottom: 8,
  },
  accountItemSelected: {
    borderColor: '#0F172A',
    backgroundColor: '#F8FAFC',
  },
  colorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 10,
  },
  accountName: {
    fontSize: 14,
    color: '#1E293B',
    fontWeight: '600',
    flex: 1,
  },
  accountBalance: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0F172A',
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
  confirmBtn: {
    backgroundColor: '#0F172A',
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
});
