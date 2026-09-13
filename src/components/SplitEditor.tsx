import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, TextInput, ScrollView } from 'react-native';
import { Contact, Split } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../utils/theme';
import { FinanceIcon } from '../utils/iconMap';

interface SplitEditorProps {
  totalAmount: number;
  splits: Split[];
  onChangeSplits: (newSplits: Split[]) => void;
  contactId: string; // The primary contact if single receivable, or empty
  onChangeContactId: (id: string) => void;
  isReceivable: boolean;
  onChangeIsReceivable: (value: boolean) => void;
}

export const SplitEditor: React.FC<SplitEditorProps> = ({
  totalAmount,
  splits,
  onChangeSplits,
  contactId,
  onChangeContactId,
  isReceivable,
  onChangeIsReceivable,
}) => {
  const { state } = useFinance();
  const { colors, isDarkMode } = useTheme();

  const [splitMode, setSplitMode] = useState<'single' | 'multi'>(() => {
    if (splits && splits.length > 0) return 'multi';
    return 'single';
  });
  const [multiSplitType, setMultiSplitType] = useState<'even' | 'custom'>(() => {
    if (splits && splits.length > 1) {
      const firstAmount = splits[0].amount;
      const isAllEven = splits.every(s => s.amount === firstAmount);
      return isAllEven ? 'even' : 'custom';
    }
    return 'even';
  });
  
  // Local state to track which contacts are selected and their custom split amounts
  const [selectedContacts, setSelectedContacts] = useState<Record<string, boolean>>(() => {
    const selected: Record<string, boolean> = {};
    if (splits && splits.length > 0) {
      splits.forEach(s => {
        selected[s.contactId] = true;
      });
    }
    return selected;
  });
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>(() => {
    const amounts: Record<string, string> = {};
    if (splits && splits.length > 0) {
      splits.forEach(s => {
        amounts[s.contactId] = s.amount.toString();
      });
    }
    return amounts;
  });

  // Automatically recalculate split amounts when totalAmount, selectedContacts, or mode changes
  useEffect(() => {
    if (!isReceivable) {
      return;
    }

    if (splitMode === 'single') {
      if (splits && splits.length > 0) {
        onChangeSplits([]);
      }
    } else {
      const activeContactIds = Object.keys(selectedContacts).filter(id => selectedContacts[id]);
      if (activeContactIds.length === 0) {
        if (splits && splits.length > 0) {
          onChangeSplits([]);
        }
        return;
      }

      let newSplits: Split[];
      if (multiSplitType === 'even') {
        // Evenly split between us + selected contacts (activeContactIds.length + 1)
        const divisor = activeContactIds.length + 1;
        const evenAmount = Number((totalAmount / divisor).toFixed(2));
        
        newSplits = activeContactIds.map(id => ({
          contactId: id,
          amount: evenAmount,
          isSettled: false,
        }));
      } else {
        // Custom split: use input amounts
        newSplits = activeContactIds.map(id => ({
          contactId: id,
          amount: Number(customAmounts[id] || 0),
          isSettled: false,
        }));
      }

      // Only emit if splits actually changed to avoid redundant parent updates
      const isDifferent =
        !splits ||
        splits.length !== newSplits.length ||
        splits.some((s, idx) => s.contactId !== newSplits[idx]?.contactId || s.amount !== newSplits[idx]?.amount);

      if (isDifferent) {
        onChangeSplits(newSplits);
      }
    }
  }, [totalAmount, selectedContacts, splitMode, multiSplitType, customAmounts, isReceivable]);

  const handleToggleContact = (id: string) => {
    setSelectedContacts(prev => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleCustomAmountChange = (id: string, text: string) => {
    // Only numeric
    const cleaned = text.replace(/[^0-9.]/g, '');
    setCustomAmounts(prev => ({
      ...prev,
      [id]: cleaned,
    }));
  };

  if (state.contacts.length === 0) {
    return (
      <View style={[styles.noContactsContainer, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
        <Text style={[styles.noContactsText, { color: '#F59E0B' }]}>No contacts saved yet.</Text>
        <Text style={[styles.noContactsSubText, { color: colors.textSecondary }]}>Add contacts under "More ➔ Contacts" to split bills.</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
      <View style={styles.headerRow}>
        <Text style={[styles.sectionLabel, { color: colors.text }]}>Split / Receivable</Text>
        <Switch
          value={isReceivable}
          onValueChange={(val) => {
            onChangeIsReceivable(val);
            if (!val) {
              onChangeContactId('');
              onChangeSplits([]);
              setSelectedContacts({});
              setCustomAmounts({});
              setSplitMode('single');
              setMultiSplitType('even');
            }
          }}
          trackColor={{ false: colors.border, true: colors.primary }}
          thumbColor={isReceivable ? '#FFFFFF' : '#F4F4F5'}
        />
      </View>

      {isReceivable && (
        <View style={styles.editorBody}>
          {/* Mode Selector */}
          <View style={[styles.modeTabs, { backgroundColor: colors.inputBackground }]}>
            <Pressable 
              style={[styles.modeTab, splitMode === 'single' && [styles.activeModeTab, { backgroundColor: colors.card, borderColor: colors.glassBorder }]]}
              onPress={() => {
                setSplitMode('single');
                onChangeSplits([]);
                setSelectedContacts({});
                setCustomAmounts({});
              }}
            >
              <Text style={[styles.modeTabText, { color: colors.textSecondary }, splitMode === 'single' && [styles.activeModeTabText, { color: colors.text }]]}>
                Single Contact
              </Text>
            </Pressable>
            <Pressable 
              style={[styles.modeTab, splitMode === 'multi' && [styles.activeModeTab, { backgroundColor: colors.card, borderColor: colors.glassBorder }]]}
              onPress={() => {
                setSplitMode('multi');
                onChangeContactId('');
              }}
            >
              <Text style={[styles.modeTabText, { color: colors.textSecondary }, splitMode === 'multi' && [styles.activeModeTabText, { color: colors.text }]]}>
                Split Among Many
              </Text>
            </Pressable>
          </View>

          {/* Single Contact View */}
          {splitMode === 'single' && (
            <View style={styles.singleContainer}>
              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Who owes / is owed this full amount?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsScroll}>
                {state.contacts.map(c => (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.contactChip,
                      { backgroundColor: colors.inputBackground, borderColor: colors.border },
                      contactId === c.id && { backgroundColor: colors.primary, borderColor: colors.primary }
                    ]}
                    onPress={() => onChangeContactId(c.id)}
                  >
                    <Text style={[
                      styles.contactChipText, 
                      { color: colors.textSecondary },
                      contactId === c.id && { color: '#FFFFFF', fontWeight: '700' }
                    ]}>
                      {c.name}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          )}

          {/* Multi Split View */}
          {splitMode === 'multi' && (
            <View style={styles.multiContainer}>
              <View style={styles.splitTypeRow}>
                <Pressable
                  style={[
                    styles.splitTypeBtn, 
                    { borderColor: colors.border, backgroundColor: colors.inputBackground },
                    multiSplitType === 'even' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setMultiSplitType('even')}
                >
                  <Text style={[
                    styles.splitTypeBtnText, 
                    { color: colors.textSecondary },
                    multiSplitType === 'even' && { color: '#FFFFFF', fontWeight: '700' }
                  ]}>
                    Evenly
                  </Text>
                </Pressable>
                <Pressable
                  style={[
                    styles.splitTypeBtn, 
                    { borderColor: colors.border, backgroundColor: colors.inputBackground },
                    multiSplitType === 'custom' && { backgroundColor: colors.primary, borderColor: colors.primary }
                  ]}
                  onPress={() => setMultiSplitType('custom')}
                >
                  <Text style={[
                    styles.splitTypeBtnText, 
                    { color: colors.textSecondary },
                    multiSplitType === 'custom' && { color: '#FFFFFF', fontWeight: '700' }
                  ]}>
                    Custom
                  </Text>
                </Pressable>
              </View>

              <Text style={[styles.subLabel, { color: colors.textSecondary }]}>Select contacts involved in the split:</Text>
              {state.contacts.map(c => {
                const isSelected = !!selectedContacts[c.id];
                const shareAmount = multiSplitType === 'even'
                  ? (splits.find(s => s.contactId === c.id)?.amount || 0)
                  : (customAmounts[c.id] || '0');

                return (
                  <View key={c.id} style={[styles.contactSplitRow, { borderBottomColor: colors.border }]}>
                    <Pressable 
                      style={styles.contactInfo}
                      onPress={() => handleToggleContact(c.id)}
                    >
                      <View style={[
                        styles.checkbox, 
                        { borderColor: colors.border },
                        isSelected && { backgroundColor: colors.primary, borderColor: colors.primary }
                      ]}>
                        {isSelected && <FinanceIcon name="check" size={10} color="#fff" />}
                      </View>
                      <Text style={[styles.contactName, { color: colors.text }]}>{c.name}</Text>
                    </Pressable>

                    {isSelected && (
                      <View style={styles.amountContainer}>
                        {multiSplitType === 'even' ? (
                          <Text style={[styles.calculatedAmount, { color: colors.text }]}>{shareAmount}</Text>
                        ) : (
                          <TextInput
                            style={[styles.amountInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                            placeholderTextColor={colors.textSecondary}
                            value={customAmounts[c.id] || ''}
                            onChangeText={(val) => handleCustomAmountChange(c.id, val)}
                          />
                        )}
                      </View>
                    )}
                  </View>
                );
              })}

              {multiSplitType === 'even' && splits.length > 0 && (
                <Text style={[styles.summaryText, { color: colors.textSecondary }]}>
                  Your share: {(totalAmount / (splits.length + 1)).toFixed(2)} | Contacts share: {(totalAmount - (totalAmount / (splits.length + 1))).toFixed(2)}
                </Text>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8FAFC',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  noContactsContainer: {
    backgroundColor: '#FFFBEB',
    borderColor: '#FDE68A',
    borderWidth: 1,
    borderRadius: 10,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  noContactsText: {
    fontWeight: '600',
    color: '#B45309',
    fontSize: 14,
  },
  noContactsSubText: {
    fontSize: 12,
    color: '#D97706',
    textAlign: 'center',
    marginTop: 4,
  },
  editorBody: {
    marginTop: 16,
  },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#E2E8F0',
    borderRadius: 8,
    padding: 2,
    marginBottom: 12,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 6,
    alignItems: 'center',
    borderRadius: 6,
  },
  activeModeTab: {
    backgroundColor: '#FFFFFF',
  },
  modeTabText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#64748B',
  },
  activeModeTabText: {
    color: '#0F172A',
    fontWeight: '600',
  },
  subLabel: {
    fontSize: 13,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '500',
  },
  contactsScroll: {
    flexDirection: 'row',
    paddingVertical: 4,
  },
  contactChip: {
    backgroundColor: '#E2E8F0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    marginRight: 8,
  },
  activeContactChip: {
    backgroundColor: '#0F172A',
  },
  contactChipText: {
    fontSize: 13,
    color: '#475569',
    fontWeight: '500',
  },
  activeContactChipText: {
    color: '#FFFFFF',
  },
  singleContainer: {
    paddingVertical: 4,
  },
  multiContainer: {
    paddingVertical: 4,
  },
  splitTypeRow: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  splitTypeBtn: {
    flex: 1,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: '#CBD5E1',
    alignItems: 'center',
    marginHorizontal: 4,
    borderRadius: 6,
  },
  activeSplitTypeBtn: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  splitTypeBtnText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#475569',
  },
  activeSplitTypeBtnText: {
    color: '#FFFFFF',
  },
  contactSplitRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  contactInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: '#94A3B8',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: '#0F172A',
    borderColor: '#0F172A',
  },
  contactName: {
    fontSize: 14,
    color: '#0F172A',
    fontWeight: '500',
  },
  amountContainer: {
    width: 100,
    alignItems: 'flex-end',
  },
  calculatedAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0F172A',
  },
  amountInput: {
    borderWidth: 1,
    borderColor: '#CBD5E1',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    width: '100%',
    textAlign: 'right',
    fontSize: 14,
    color: '#0F172A',
    backgroundColor: '#FFF',
  },
  summaryText: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 12,
    fontStyle: 'italic',
    textAlign: 'center',
  },
});
