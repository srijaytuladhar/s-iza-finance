import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { Transaction } from '../types/finance';
import { FinanceIcon } from '../utils/iconMap';
import { formatNumber } from '../utils/format';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../utils/theme';

interface TransactionRowProps {
  transaction: Transaction;
  onPress?: () => void;
  isLast?: boolean;
}

export const TransactionRow: React.FC<TransactionRowProps> = ({
  transaction,
  onPress,
  isLast = false,
}) => {
  const { state } = useFinance();
  const { colors } = useTheme();
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
    ? '#38BDF8' // Liquid blue
    : category?.color || (transaction.type === 'Expense' ? '#EF4444' : '#10B981');
    
  const displayIcon = isTransfer 
    ? 'exchange-alt' 
    : category?.icon || (transaction.type === 'Expense' ? 'arrow-down' : 'arrow-up');

  // Amount text color based on type
  const getAmountColor = () => {
    switch (transaction.type) {
      case 'Expense': return '#EF4444';
      case 'Income': return '#10B981';
      case 'Transfer': return '#38BDF8';
      default: return colors.text;
    }
  };

  const formattedAmount = `${transaction.type === 'Expense' ? '-' : transaction.type === 'Income' ? '+' : ''}${formatNumber(transaction.amount, currencySymbol)}`;

  return (
    <Pressable
      style={({ pressed }) => [
        styles.container,
        {
          backgroundColor: pressed ? colors.glassHighlight : 'transparent',
          borderBottomColor: colors.glassBorder,
          borderBottomWidth: isLast ? 0 : StyleSheet.hairlineWidth,
          opacity: pressed ? 0.85 : 1,
        },
      ]}
      onPress={onPress}
    >
      <View style={[styles.iconWrapper, { backgroundColor: `${displayColor}20` }]}>
        <FinanceIcon name={displayIcon} size={15} color={displayColor} />
      </View>

      <View style={styles.detailsContainer}>
        <Text style={[styles.description, { color: colors.text }]} numberOfLines={1}>
          {transaction.description || transaction.category}
        </Text>
        <Text style={[styles.meta, { color: colors.textSecondary }]} numberOfLines={1}>
          {isTransfer 
            ? `${account?.name || 'Unknown'} ➔ ${toAccount?.name || 'Unknown'}`
            : `${account?.name || 'Unknown'}${transaction.isReceivable ? ` • Split` : ''}`}
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
    paddingVertical: 13,
    paddingHorizontal: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  iconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    marginBottom: 2,
  },
  meta: {
    fontSize: 12,
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
    fontSize: 11,
    marginTop: 2,
  },
});
