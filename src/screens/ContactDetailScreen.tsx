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
  const [settleMode, setSettleMode] = useState<'all' | 'custom'>('all');
  const [selectedTxIds, setSelectedTxIds] = useState<string[]>([]);
  const [singleTargetTx, setSingleTargetTx] = useState<UnsettledSplitItem | null>(null);

  const [selectedAccountId, setSelectedAccountId] = useState(
    state.accounts.find(a => a.isDefault)?.id || (state.accounts[0]?.id || '')
  );

  const contact = state.contacts.find(c => c.id === contactId);
  const currencySymbol = state.settings.currencySymbol;

  React.useLayoutEffect(() => {
    if (contact?.name) {
      navigation.setOptions({ title: contact.name });
    }
  }, [navigation, contact?.name]);

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
    if (!tx.isReceivable) return;

    if (tx.splits && tx.splits.length > 0) {
      tx.splits.forEach(s => {
        if (s.contactId === contactId && !s.isSettled) {
          unsettledSplits.push({
            transactionId: tx.id,
            description: tx.description || tx.category,
            date: tx.date,
            amount: s.amount,
            type: tx.type === 'Expense' ? 'Expense' : 'Income',
          });
          if (tx.type === 'Expense') {
            totalOwedToUs += s.amount;
          } else {
            totalWeOwe += s.amount;
          }
        }
      });
    } else if (tx.contactId === contactId) {
      const isAlreadySettled = tx.isSettled || tx.splits?.some(s => s.contactId === contactId && s.isSettled);
      if (!isAlreadySettled) {
        unsettledSplits.push({
          transactionId: tx.id,
          description: tx.description || tx.category,
          date: tx.date,
          amount: tx.amount,
          type: tx.type === 'Expense' ? 'Expense' : 'Income',
        });
        if (tx.type === 'Expense') {
          totalOwedToUs += tx.amount;
        } else if (tx.type === 'Income') {
          totalWeOwe += tx.amount;
        }
      }
    }
  });

  const netOwed = totalOwedToUs - totalWeOwe;

  // Active items being settled in the modal
  const effectiveTxIds: string[] = singleTargetTx
    ? [singleTargetTx.transactionId]
    : settleMode === 'all'
      ? unsettledSplits.map(s => s.transactionId)
      : selectedTxIds;

  const activeSettlementSplits = unsettledSplits.filter(s => effectiveTxIds.includes(s.transactionId));

  let activeOwedToUs = 0;
  let activeWeOwe = 0;
  activeSettlementSplits.forEach(s => {
    if (s.type === 'Expense') {
      activeOwedToUs += s.amount;
    } else {
      activeWeOwe += s.amount;
    }
  });
  const activeNetOwed = activeOwedToUs - activeWeOwe;

  const handleOpenSettleAll = () => {
    setSingleTargetTx(null);
    setSettleMode('all');
    setSelectedTxIds(unsettledSplits.map(s => s.transactionId));
    setSettlementModalVisible(true);
  };

  const handleOpenSingleSettle = (item: UnsettledSplitItem) => {
    setSingleTargetTx(item);
    setSettleMode('custom');
    setSelectedTxIds([item.transactionId]);
    setSettlementModalVisible(true);
  };

  const handleToggleTx = (txId: string) => {
    if (singleTargetTx) {
      setSingleTargetTx(null);
    }
    setSelectedTxIds(prev => 
      prev.includes(txId) ? prev.filter(id => id !== txId) : [...prev, txId]
    );
  };

  const handleSelectAll = () => {
    setSingleTargetTx(null);
    setSelectedTxIds(unsettledSplits.map(s => s.transactionId));
  };

  const handleDeselectAll = () => {
    setSingleTargetTx(null);
    setSelectedTxIds([]);
  };

  const handleSettle = async () => {
    if (effectiveTxIds.length === 0) {
      showAlert('Validation Error', 'Please select at least one transaction to settle.');
      return;
    }

    if (activeNetOwed !== 0 && !selectedAccountId) {
      showAlert('Error', 'Please select an account for the settlement transaction.');
      return;
    }

    try {
      await settleContactBalance(contactId, selectedAccountId, effectiveTxIds);
      setSettlementModalVisible(false);
      setSingleTargetTx(null);
      const settledCount = effectiveTxIds.length;
      showAlert(
        'Success', 
        settledCount === 1 
          ? 'Transaction settled successfully!' 
          : `${settledCount} transactions settled successfully!`
      );
      if (settledCount >= unsettledSplits.length) {
        navigation.goBack();
      }
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
              style={[styles.settleButton, { backgroundColor: colors.primary }]}
              onPress={handleOpenSettleAll}
            >
              <FinanceIcon name="hand-holding-usd" size={15} color="#FFFFFF" style={{ marginRight: 6 }} />
              <Text style={styles.settleButtonText}>Settle Balance</Text>
            </Pressable>
          )}
        </View>

        {/* Unsettled Splits List */}
        <View style={[styles.listSection, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
          <View style={styles.sectionHeaderRow}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Unsettled Splits</Text>
            {unsettledSplits.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.18)' : 'rgba(2, 132, 199, 0.12)' }]}>
                <Text style={[styles.countBadgeText, { color: isDarkMode ? '#38BDF8' : '#0284C7' }]}>
                  {unsettledSplits.length} pending
                </Text>
              </View>
            )}
          </View>

          {unsettledSplits.length === 0 ? (
            <View style={styles.emptyContainer}>
              <FinanceIcon name="check-circle" size={36} color="#10B981" />
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>No unsettled splits for this contact.</Text>
            </View>
          ) : (
            <FlatList
              data={unsettledSplits}
              keyExtractor={item => item.transactionId + '-' + item.type}
              showsVerticalScrollIndicator={false}
              renderItem={({ item }) => (
                <View style={[styles.splitRow, { borderBottomColor: colors.border }]}>
                  <View style={styles.splitLeft}>
                    <View style={[
                      styles.typeIndicator, 
                      { backgroundColor: item.type === 'Expense' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)' }
                    ]}>
                      <FinanceIcon 
                        name={item.type === 'Expense' ? 'arrow-down' : 'arrow-up'} 
                        size={12} 
                        color={item.type === 'Expense' ? '#10B981' : '#EF4444'} 
                      />
                    </View>
                    <View style={styles.splitDetails}>
                      <Text style={[styles.splitDesc, { color: colors.text }]} numberOfLines={1}>{item.description}</Text>
                      <Text style={[styles.splitDate, { color: colors.textSecondary }]}>
                        {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                  </View>

                  <View style={styles.splitRight}>
                    <Text style={[
                      styles.splitAmount,
                      { color: item.type === 'Expense' ? '#10B981' : '#EF4444' }
                    ]}>
                      {item.type === 'Expense' ? '+' : '-'}{formatNumber(item.amount, currencySymbol)}
                    </Text>
                    <Pressable 
                      style={({ pressed }) => [
                        styles.singleSettleBtn, 
                        { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9', borderColor: colors.border },
                        pressed && { opacity: 0.75, transform: [{ scale: 0.96 }] }
                      ]}
                      onPress={() => handleOpenSingleSettle(item)}
                      accessibilityRole="button"
                      accessibilityLabel={`Settle ${item.description}`}
                    >
                      <FinanceIcon name="check" size={9} color={colors.primary} />
                      <Text style={[styles.singleSettleBtnText, { color: colors.primary }]}>Settle</Text>
                    </Pressable>
                  </View>
                </View>
              )}
            />
          )}
        </View>

        {/* Settlement Modal */}
        <Modal
          visible={settlementModalVisible}
          transparent={true}
          animationType="fade"
          onRequestClose={() => {
            setSettlementModalVisible(false);
            setSingleTargetTx(null);
          }}
        >
          <View style={styles.modalOverlay}>
            <View style={[styles.modalContent, colors.glassShadow, { backgroundColor: colors.card, borderColor: colors.glassBorder }]}>
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalHeaderTitleRow}>
                  <FinanceIcon name="hand-holding-usd" size={18} color={colors.primary} />
                  <Text style={[styles.modalTitle, { color: colors.text }]}>
                    {singleTargetTx ? 'Settle Transaction' : 'Settle Balance'}
                  </Text>
                </View>
                <Text style={[styles.modalSubTitle, { color: colors.textSecondary }]}>
                  {singleTargetTx 
                    ? `Settle single transaction for ${contact.name}`
                    : `Settle receivables for ${contact.name}`}
                </Text>
              </View>

              <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
                {/* Single Item Highlight OR Mode Selector */}
                {singleTargetTx ? (
                  <View style={[styles.singleItemCard, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.singleItemTitle, { color: colors.text }]} numberOfLines={1}>
                        {singleTargetTx.description}
                      </Text>
                      <Text style={[styles.singleItemSub, { color: colors.textSecondary }]}>
                        {new Date(singleTargetTx.date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}
                      </Text>
                    </View>
                    <Text style={[
                      styles.singleItemAmount,
                      { color: singleTargetTx.type === 'Expense' ? '#10B981' : '#EF4444' }
                    ]}>
                      {singleTargetTx.type === 'Expense' ? '+' : '-'}{formatNumber(singleTargetTx.amount, currencySymbol)}
                    </Text>
                    {unsettledSplits.length > 1 && (
                      <Pressable 
                        style={styles.switchMultiBtn}
                        onPress={() => {
                          setSingleTargetTx(null);
                          setSettleMode('custom');
                        }}
                      >
                        <Text style={[styles.actionLinkText, { color: colors.primary }]}>
                          Select multiple items instead
                        </Text>
                      </Pressable>
                    )}
                  </View>
                ) : (
                  <>
                    {unsettledSplits.length > 1 && (
                      <View style={[styles.modeTabs, { backgroundColor: isDarkMode ? '#1E293B' : '#F1F5F9' }]}>
                        <Pressable
                          style={[
                            styles.modeTab,
                            settleMode === 'all' && [styles.modeTabActive, { backgroundColor: colors.card }]
                          ]}
                          onPress={() => setSettleMode('all')}
                        >
                          <Text style={[
                            styles.modeTabText,
                            { color: settleMode === 'all' ? colors.text : colors.textSecondary },
                            settleMode === 'all' && { fontWeight: '700' }
                          ]}>
                            Settle All ({unsettledSplits.length})
                          </Text>
                        </Pressable>
                        <Pressable
                          style={[
                            styles.modeTab,
                            settleMode === 'custom' && [styles.modeTabActive, { backgroundColor: colors.card }]
                          ]}
                          onPress={() => setSettleMode('custom')}
                        >
                          <Text style={[
                            styles.modeTabText,
                            { color: settleMode === 'custom' ? colors.text : colors.textSecondary },
                            settleMode === 'custom' && { fontWeight: '700' }
                          ]}>
                            Select Items ({selectedTxIds.length})
                          </Text>
                        </Pressable>
                      </View>
                    )}

                    {settleMode === 'custom' && (
                      <View style={styles.selectionSection}>
                        <View style={styles.selectionActionRow}>
                          <Text style={[styles.selectionLabel, { color: colors.textSecondary }]}>
                            Select items to settle:
                          </Text>
                          <View style={{ flexDirection: 'row', gap: 12 }}>
                            <Pressable onPress={handleSelectAll}>
                              <Text style={[styles.actionLinkText, { color: colors.primary }]}>Select All</Text>
                            </Pressable>
                            <Pressable onPress={handleDeselectAll}>
                              <Text style={[styles.actionLinkText, { color: colors.textSecondary }]}>Clear</Text>
                            </Pressable>
                          </View>
                        </View>

                        <View style={[styles.checklistContainer, { borderColor: colors.border, backgroundColor: colors.inputBackground }]}>
                          {unsettledSplits.map(item => {
                            const isSelected = selectedTxIds.includes(item.transactionId);
                            return (
                              <Pressable
                                key={item.transactionId + '-' + item.type}
                                style={[
                                  styles.checklistItem,
                                  { borderBottomColor: colors.border },
                                  isSelected && { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.08)' : 'rgba(2, 132, 199, 0.06)' }
                                ]}
                                onPress={() => handleToggleTx(item.transactionId)}
                              >
                                <View style={[
                                  styles.checkbox,
                                  { borderColor: isSelected ? colors.primary : colors.border },
                                  isSelected && { backgroundColor: colors.primary }
                                ]}>
                                  {isSelected && <FinanceIcon name="check" size={9} color="#FFFFFF" />}
                                </View>
                                <View style={styles.checkItemDetails}>
                                  <Text style={[styles.checkItemDesc, { color: colors.text }]} numberOfLines={1}>
                                    {item.description}
                                  </Text>
                                  <Text style={[styles.checkItemDate, { color: colors.textSecondary }]}>
                                    {new Date(item.date).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                                  </Text>
                                </View>
                                <Text style={[
                                  styles.checkItemAmount,
                                  { color: item.type === 'Expense' ? '#10B981' : '#EF4444' }
                                ]}>
                                  {item.type === 'Expense' ? '+' : '-'}{formatNumber(item.amount, currencySymbol)}
                                </Text>
                              </Pressable>
                            );
                          })}
                        </View>
                      </View>
                    )}
                  </>
                )}

                {/* Settlement Summary Card */}
                <View style={[styles.summaryCard, { backgroundColor: isDarkMode ? '#1E293B' : '#F8FAFC', borderColor: colors.border }]}>
                  <View style={styles.summaryRow}>
                    <View>
                      <Text style={[styles.summaryCountText, { color: colors.text }]}>
                        {activeSettlementSplits.length} item{activeSettlementSplits.length === 1 ? '' : 's'} included
                      </Text>
                      <Text style={[styles.summarySubLabel, { color: colors.textSecondary }]}>
                        {activeNetOwed > 0 ? 'You will receive' : activeNetOwed < 0 ? 'You will pay' : 'Net amount'}
                      </Text>
                    </View>
                    <Text style={[
                      styles.summaryNetText,
                      { color: activeNetOwed > 0 ? '#10B981' : activeNetOwed < 0 ? '#EF4444' : colors.textSecondary }
                    ]}>
                      {activeNetOwed !== 0 
                        ? formatNumber(Math.abs(activeNetOwed), currencySymbol)
                        : formatNumber(0, currencySymbol)}
                    </Text>
                  </View>
                </View>

                {/* Account Selection */}
                {activeNetOwed !== 0 && (
                  <View style={styles.accountSection}>
                    <Text style={[styles.sectionHeading, { color: colors.text }]}>
                      {activeNetOwed > 0 ? 'Deposit funds into account:' : 'Pay funds from account:'}
                    </Text>

                    <View style={styles.accountList}>
                      {state.accounts.map(acc => {
                        const isSelected = selectedAccountId === acc.id;
                        return (
                          <Pressable
                            key={acc.id}
                            style={[
                              styles.accountItem,
                              { backgroundColor: colors.inputBackground, borderColor: colors.border },
                              isSelected && { borderColor: colors.primary, borderWidth: 1.5 }
                            ]}
                            onPress={() => setSelectedAccountId(acc.id)}
                          >
                            <View style={[styles.colorIndicator, { backgroundColor: acc.color }]} />
                            <Text style={[styles.accountName, { color: colors.text }]} numberOfLines={1}>
                              {acc.name}
                            </Text>
                            <Text style={[styles.accountBalance, { color: colors.textSecondary }]}>
                              {formatNumber(acc.balance, currencySymbol)}
                            </Text>
                            {isSelected && (
                              <View style={[styles.selectedCheckBadge, { backgroundColor: colors.primary }]}>
                                <FinanceIcon name="check" size={8} color="#FFFFFF" />
                              </View>
                            )}
                          </Pressable>
                        );
                      })}
                    </View>
                  </View>
                )}
              </ScrollView>

              {/* Action Buttons */}
              <View style={[styles.modalButtons, { borderTopColor: colors.border }]}>
                <Pressable 
                  style={[styles.modalBtn, styles.cancelBtn, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]} 
                  onPress={() => {
                    setSettlementModalVisible(false);
                    setSingleTargetTx(null);
                  }}
                >
                  <Text style={[styles.cancelBtnText, { color: colors.textSecondary }]}>Cancel</Text>
                </Pressable>
                <Pressable 
                  style={[
                    styles.modalBtn, 
                    styles.confirmBtn, 
                    { backgroundColor: activeSettlementSplits.length === 0 ? '#94A3B8' : colors.primary }
                  ]} 
                  onPress={handleSettle}
                  disabled={activeSettlementSplits.length === 0}
                >
                  <Text style={styles.confirmBtnText}>
                    {activeSettlementSplits.length === 0 
                      ? 'Select Items' 
                      : `Confirm Settlement (${formatNumber(Math.abs(activeNetOwed), currencySymbol)})`}
                  </Text>
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
    width: '100%',
    borderRadius: 10,
    height: 44,
    flexDirection: 'row',
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
  sectionHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  splitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  splitLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  typeIndicator: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
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
  splitRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  splitAmount: {
    fontSize: 14,
    fontWeight: '700',
  },
  singleSettleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 5,
    borderRadius: 6,
    borderWidth: 1,
  },
  singleSettleBtnText: {
    fontSize: 11,
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
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFFFFF',
    borderRadius: 20,
    width: '100%',
    maxHeight: '85%',
    borderWidth: 1,
    overflow: 'hidden',
  },
  modalHeader: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
  },
  modalHeaderTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
  },
  modalSubTitle: {
    fontSize: 13,
    lineHeight: 18,
  },
  modalScrollView: {
    paddingHorizontal: 20,
    maxHeight: 400,
  },
  singleItemCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 14,
    marginBottom: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  singleItemTitle: {
    fontSize: 15,
    fontWeight: '600',
  },
  singleItemSub: {
    fontSize: 12,
    marginTop: 2,
  },
  singleItemAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  switchMultiBtn: {
    width: '100%',
    marginTop: 10,
    paddingTop: 8,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(148, 163, 184, 0.25)',
  },
  modeTabs: {
    flexDirection: 'row',
    borderRadius: 10,
    padding: 3,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 8,
  },
  modeTabActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
    elevation: 1,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: '500',
  },
  selectionSection: {
    marginBottom: 14,
  },
  selectionActionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectionLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionLinkText: {
    fontSize: 12,
    fontWeight: '600',
  },
  checklistContainer: {
    borderRadius: 10,
    borderWidth: 1,
    maxHeight: 160,
    overflow: 'hidden',
  },
  checklistItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  checkbox: {
    width: 18,
    height: 18,
    borderRadius: 5,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkItemDetails: {
    flex: 1,
    marginRight: 8,
  },
  checkItemDesc: {
    fontSize: 13,
    fontWeight: '600',
  },
  checkItemDate: {
    fontSize: 11,
    marginTop: 1,
  },
  checkItemAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    padding: 12,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryCountText: {
    fontSize: 13,
    fontWeight: '700',
  },
  summarySubLabel: {
    fontSize: 11,
    marginTop: 2,
  },
  summaryNetText: {
    fontSize: 18,
    fontWeight: '800',
  },
  accountSection: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 8,
  },
  accountList: {
    gap: 8,
  },
  accountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderWidth: 1,
    borderRadius: 10,
  },
  colorIndicator: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  accountName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  accountBalance: {
    fontSize: 13,
    fontWeight: '700',
    marginRight: 8,
  },
  selectedCheckBadge: {
    width: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    gap: 10,
  },
  modalBtn: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelBtn: {},
  cancelBtnText: {
    fontWeight: '600',
    fontSize: 13,
  },
  confirmBtn: {
    flex: 1,
  },
  confirmBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 13,
  },
});
