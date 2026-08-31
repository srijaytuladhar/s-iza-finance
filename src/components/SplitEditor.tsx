import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Switch, TextInput, ScrollView } from 'react-native';
import { Contact, Split } from '../types/finance';
import { useFinance } from '../context/FinanceContext';
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
  const [splitMode, setSplitMode] = useState<'single' | 'multi'>('single');
  const [multiSplitType, setMultiSplitType] = useState<'even' | 'custom'>('even');
  
  // Local state to track which contacts are selected and their custom split amounts
  const [selectedContacts, setSelectedContacts] = useState<Record<string, boolean>>({});
  const [customAmounts, setCustomAmounts] = useState<Record<string, string>>({});

  // Initialize selected contacts from splits if multi-split was already saved
  useEffect(() => {
    if (splits && splits.length > 0) {
      setSplitMode('multi');
      const selected: Record<string, boolean> = {};
      const amounts: Record<string, string> = {};
      
      let isAllEven = true;
      const firstAmount = splits[0].amount;
      
      splits.forEach(s => {
        selected[s.contactId] = true;
        amounts[s.contactId] = s.amount.toString();
        if (s.amount !== firstAmount) {
          isAllEven = false;
        }
      });
      
      setSelectedContacts(selected);
      setCustomAmounts(amounts);
      setMultiSplitType(isAllEven ? 'even' : 'custom');
    } else if (contactId) {
      setSplitMode('single');
    }
  }, []);

  // Automatically recalculate split amounts when totalAmount, selectedContacts, or mode changes
  useEffect(() => {
    if (splitMode === 'single') {
      onChangeSplits([]); // Clear splits for single contact receivable
    } else {
      const activeContactIds = Object.keys(selectedContacts).filter(id => selectedContacts[id]);
      if (activeContactIds.length === 0) {
        onChangeSplits([]);
        return;
      }

      if (multiSplitType === 'even') {
        // Evenly split between us + selected contacts (activeContactIds.length + 1)
        const divisor = activeContactIds.length + 1;
        const evenAmount = Number((totalAmount / divisor).toFixed(2));
        
        const newSplits = activeContactIds.map(id => ({
          contactId: id,
          amount: evenAmount,
          isSettled: false,
        }));
        onChangeSplits(newSplits);
      } else {
        // Custom split: use input amounts
        const newSplits = activeContactIds.map(id => ({
          contactId: id,
          amount: Number(customAmounts[id] || 0),
          isSettled: false,
        }));
        onChangeSplits(newSplits);
      }
    }
  }, [totalAmount, selectedContacts, splitMode, multiSplitType, customAmounts]);

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
      <View style={styles.noContactsContainer}>
        <Text style={styles.noContactsText}>No contacts saved yet.</Text>
        <Text style={styles.noContactsSubText}>Add contacts under "More ➔ Contacts" to split bills.</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.headerRow}>
        <Text style={styles.sectionLabel}>Split / Receivable</Text>
        <Switch
          value={isReceivable}
          onValueChange={(val) => {
            onChangeIsReceivable(val);
            if (!val) {
              onChangeContactId('');
              onChangeSplits([]);
            }
          }}
        />
      </View>

      {isReceivable && (
        <View style={styles.editorBody}>
          {/* Mode Selector */}
          <View style={styles.modeTabs}>
            <Pressable 
              style={[styles.modeTab, splitMode === 'single' && styles.activeModeTab]}
              onPress={() => {
                setSplitMode('single');
                onChangeSplits([]);
              }}
            >
              <Text style={[styles.modeTabText, splitMode === 'single' && styles.activeModeTabText]}>
                Single Contact
              </Text>
            </Pressable>
            <Pressable 
              style={[styles.modeTab, splitMode === 'multi' && styles.activeModeTab]}
              onPress={() => {
                setSplitMode('multi');
                onChangeContactId('');
              }}
            >
              <Text style={[styles.modeTabText, splitMode === 'multi' && styles.activeModeTabText]}>
                Split Among Many
              </Text>
            </Pressable>
          </View>

          {/* Single Contact View */}
          {splitMode === 'single' && (
            <View style={styles.singleContainer}>
              <Text style={styles.subLabel}>Who owes / is owed this full amount?</Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.contactsScroll}>
                {state.contacts.map(c => (
                  <Pressable
                    key={c.id}
                    style={[
                      styles.contactChip,
                      contactId === c.id && styles.activeContactChip
                    ]}
                    onPress={() => onChangeContactId(c.id)}
                  >
                    <Text style={[styles.contactChipText, contactId === c.id && styles.activeContactChipText]}>
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
                  style={[styles.splitTypeBtn, multiSplitType === 'even' && styles.activeSplitTypeBtn]}
                  onPress={() => setMultiSplitType('even')}
                >
                  <Text style={[styles.splitTypeBtnText, multiSplitType === 'even' && styles.activeSplitTypeBtnText]}>
                    Evenly
                  </Text>
                </Pressable>
                <Pressable
                  style={[styles.splitTypeBtn, multiSplitType === 'custom' && styles.activeSplitTypeBtn]}
                  onPress={() => setMultiSplitType('custom')}
                >
                  <Text style={[styles.splitTypeBtnText, multiSplitType === 'custom' && styles.activeSplitTypeBtnText]}>
                    Custom
                  </Text>
                </Pressable>
              </View>

              <Text style={styles.subLabel}>Select contacts involved in the split:</Text>
              {state.contacts.map(c => {
                const isSelected = !!selectedContacts[c.id];
                const shareAmount = multiSplitType === 'even'
                  ? (splits.find(s => s.contactId === c.id)?.amount || 0)
                  : (customAmounts[c.id] || '0');

                return (
                  <View key={c.id} style={styles.contactSplitRow}>
                    <Pressable 
                      style={styles.contactInfo}
                      onPress={() => handleToggleContact(c.id)}
                    >
                      <View style={[styles.checkbox, isSelected && styles.checkboxChecked]}>
                        {isSelected && <FinanceIcon name="check" size={10} color="#fff" />}
                      </View>
                      <Text style={styles.contactName}>{c.name}</Text>
                    </Pressable>

                    {isSelected && (
                      <View style={styles.amountContainer}>
                        {multiSplitType === 'even' ? (
                          <Text style={styles.calculatedAmount}>{shareAmount}</Text>
                        ) : (
                          <TextInput
                            style={styles.amountInput}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
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
                <Text style={styles.summaryText}>
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
