import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Account } from '../types/finance';
import { FinanceIcon } from '../utils/iconMap';
import { formatNumber } from '../utils/format';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../utils/theme';

interface AccountCardProps {
  account: Account;
  onPress?: () => void;
  selected?: boolean;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onPress,
  selected = false,
}) => {
  const { state } = useFinance();
  const { colors, isDarkMode } = useTheme();
  const currencySymbol = state.settings.currencySymbol;

  // Icon based on type
  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'Bank': return 'university';
      case 'Wallet': return 'wallet';
      case 'Cash': return 'money-bill-wave';
      default: return 'credit-card';
    }
  };

  return (
    <Pressable 
      style={[
        styles.card, 
        { borderLeftColor: account.color || '#3B82F6', backgroundColor: colors.card },
        selected && { borderColor: colors.primary, borderWidth: 1 }
      ]} 
      onPress={onPress}
    >
      <View style={styles.header}>
        <View style={styles.iconContainer}>
          <FinanceIcon 
            name={getAccountIcon(account.type)} 
            size={18} 
            color={account.color || '#3B82F6'} 
          />
          <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>{account.name}</Text>
        </View>
        {account.isDefault && (
          <View style={[styles.defaultBadge, { backgroundColor: isDarkMode ? '#334155' : '#F1F5F9' }]}>
            <Text style={[styles.defaultText, { color: colors.textSecondary }]}>Default</Text>
          </View>
        )}
      </View>
      <View style={styles.footer}>
        <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>{account.type}</Text>
        <Text style={[styles.balance, { color: colors.text }]}>
          {formatNumber(account.balance, currencySymbol)}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    borderLeftWidth: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  selectedCard: {
    borderColor: '#0F172A',
    borderWidth: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
    marginLeft: 10,
    flex: 1,
  },
  defaultBadge: {
    backgroundColor: '#F1F5F9',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  defaultText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#64748B',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  typeLabel: {
    fontSize: 12,
    color: '#94A3B8',
    fontWeight: '500',
  },
  balance: {
    fontSize: 18,
    fontWeight: '700',
    color: '#0F172A',
  },
});
