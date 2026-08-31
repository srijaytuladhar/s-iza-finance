import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Transaction, Account, Category } from '../types/finance';
import { FinanceIcon } from '../utils/iconMap';
import { formatNumber } from '../utils/format';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../utils/theme';

interface TransactionRowProps {
  transaction: Transaction;
  onPress?: () => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  onPress,
}) => {
  const { state } = useFinance();
  const { colors, isDarkMode } = useTheme();
  const currencySymbol = state.settings.currencySymbol;

  // Find associated account
  const account = state.accounts.find(a => a.id === transaction.accountId);
  const toAccount = transaction.toAccountId 
    ? state.accounts.find(a => a.id === transaction.toAccountId)
    : null;

  // Find category to display its color and icon
  const category = state.categories.find(
    c => c.name.toLowerCase() === transaction.category.toLowerCase()
  );

  // If it's a Transfer, show a standard blue transfer icon and color.
  const isTransfer = transaction.type === 'Transfer';
  const displayColor = isTransfer 
    ? '#3B82F6' // Blue
    : category?.color || (transaction.type === 'Expense' ? '#EF4444' : '#10B981');
    
  const displayIcon = isTransfer 
    ? 'exchange-alt' 
    : category?.icon || (transaction.type === 'Expense' ? 'arrow-down' : 'arrow-up');

  // Amount text color based on type
  const getAmountColor = () => {
    switch (transaction.type) {
      case 'Expense': return '#EF4444'; // Red
      case 'Income': return '#10B981'; // Green
      case 'Transfer': return '#3B82F6'; // Blue
      default: return '#0F172A';
    }
  };

  const formattedAmount = `${transaction.type === 'Expense' ? '-' : transaction.type === 'Income' ? '+' : ''}${formatNumber(transaction.amount, currencySymbol)}`;

  return (
    <Pressable style={[styles.container, { backgroundColor: colors.card, borderBottomColor: colors.border }]} onPress={onPress}>
      <View style={[styles.iconWrapper, { backgroundColor: `${displayColor}15` }]}>
        <FinanceIcon name={displayIcon} size={16} color={displayColor} />
      </View>

      <View style={styles.detailsContainer}>
        <Text style={[styles.description, { color: colors.text }]} numberOfLines={1}>
          {transaction.description || transaction.category}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {isTransfer 
            ? `${account?.name || 'Unknown'} ➔ ${toAccount?.name || 'Unknown'}`
            : `${account?.name || 'Unknown'}${transaction.contactId ? ` • Split` : ''}`}
        </Text>
      </View>

      <View style={styles.amountContainer}>
        <Text style={[styles.amount, { color: getAmountColor() }]}>
          {formattedAmount}
        </Text>
        <Text style={[styles.dateLabel, { color: colors.textSecondary }]}>
          {new Date(transaction.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </Text>
      </View>
    </Pressable>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: '#FFFFFF',
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  iconWrapper: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  detailsContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  description: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1E293B',
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
    color: '#64748B',
  },
  amountContainer: {
    alignItems: 'flex-end',
    justifyContent: 'center',
  },
  amount: {
    fontSize: 15,
    fontWeight: '700',
  },
  dateLabel: {
    fontSize: 10,
    color: '#94A3B8',
    marginTop: 2,
  },
});
