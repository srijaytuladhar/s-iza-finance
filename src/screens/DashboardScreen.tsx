import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, Dimensions, Pressable } from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { formatNumber } from '../utils/format';
import { FinanceIcon } from '../utils/iconMap';
import { TransactionRow } from '../components/TransactionRow';
import { PieChart } from 'react-native-chart-kit';
import { Transaction } from '../types/finance';
import { getThemeColors } from '../utils/theme';

const screenWidth = Dimensions.get('window').width;

export const DashboardScreen: React.FC = () => {
  const { state } = useFinance();
  const colors = getThemeColors(state.settings.isDarkMode);
  const currencySymbol = state.settings.currencySymbol;

  // Selected date state (defaults to current month/year)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());

  const handlePrevMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setSelectedDate(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  // Filter transactions for the selected month
  const targetYear = selectedDate.getFullYear();
  const targetMonth = selectedDate.getMonth();

  const monthTransactions = state.transactions.filter(tx => {
    const d = new Date(tx.date);
    return d.getFullYear() === targetYear && d.getMonth() === targetMonth;
  });

  // Calculate total balance across all accounts
  const totalBalance = state.accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // Calculate total income and expense for the selected month
  let monthlyIncome = 0;
  let monthlyExpense = 0;

  monthTransactions.forEach(tx => {
    if (tx.type === 'Income') {
      monthlyIncome += tx.amount;
    } else if (tx.type === 'Expense') {
      monthlyExpense += tx.amount;
    }
  });

  // Calculate spending by category for the selected month (donut chart data)
  const categoryTotals: Record<string, { amount: number; color: string }> = {};
  
  monthTransactions.forEach(tx => {
    if (tx.type === 'Expense') {
      const catName = tx.category;
      const catObj = state.categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
      const catColor = catObj?.color || '#94A3B8';
      
      if (!categoryTotals[catName]) {
        categoryTotals[catName] = { amount: 0, color: catColor };
      }
      categoryTotals[catName].amount += tx.amount;
    }
  });

  const chartData = Object.keys(categoryTotals).map(name => ({
    name,
    amount: categoryTotals[name].amount,
    color: categoryTotals[name].color,
    legendFontColor: colors.textSecondary,
    legendFontSize: 12,
  })).sort((a, b) => b.amount - a.amount);

  // Get recent transactions (last 5, newest first)
  const recentTransactions = [...state.transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const monthYearLabel = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <ScrollView style={[styles.container, { backgroundColor: colors.background }]} contentContainerStyle={styles.content}>
      {/* Balance Card */}
      <View style={[styles.balanceCard, state.settings.isDarkMode ? { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border } : null]}>
        <Text style={styles.balanceLabel}>Total Balance</Text>
        <Text style={styles.balanceValue}>
          {formatNumber(totalBalance, currencySymbol)}
        </Text>
      </View>

      {/* Month Selector */}
      <View style={[styles.monthSelector, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Pressable onPress={handlePrevMonth} style={styles.monthArrow}>
          <FinanceIcon name="chevron-left" size={16} color={colors.textSecondary} />
        </Pressable>
        <Text style={[styles.monthLabel, { color: colors.text }]}>{monthYearLabel}</Text>
        <Pressable onPress={handleNextMonth} style={styles.monthArrow}>
          <FinanceIcon name="chevron-right" size={16} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* Monthly Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { borderLeftColor: '#10B981', backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryHeader}>
            <FinanceIcon name="arrow-up" size={14} color="#10B981" />
            <Text style={[styles.summaryCardLabel, { color: colors.textSecondary }]}>Income</Text>
          </View>
          <Text style={[styles.summaryValue, { color: '#10B981' }]}>
            {formatNumber(monthlyIncome, currencySymbol)}
          </Text>
        </View>

        <View style={[styles.summaryCard, { borderLeftColor: '#EF4444', backgroundColor: colors.card, borderColor: colors.border }]}>
          <View style={styles.summaryHeader}>
            <FinanceIcon name="arrow-down" size={14} color="#EF4444" />
            <Text style={[styles.summaryCardLabel, { color: colors.textSecondary }]}>Expense</Text>
          </View>
          <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
            {formatNumber(monthlyExpense, currencySymbol)}
          </Text>
        </View>
      </View>

      {/* Spending Donut Chart */}
      <View style={[styles.chartCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text }]}>Spending by Category</Text>
        {chartData.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartText}>No expenses recorded this month.</Text>
          </View>
        ) : (
          <PieChart
            data={chartData}
            width={screenWidth - 32}
            height={180}
            chartConfig={{
              color: (opacity = 1) => state.settings.isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
            }}
            accessor="amount"
            backgroundColor="transparent"
            paddingLeft="0"
            absolute
            hasLegend={true}
          />
        )}
      </View>

      {/* Recent Transactions */}
      <View style={[styles.recentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.sectionTitle, { color: colors.text, paddingHorizontal: 16, paddingTop: 16 }]}>Recent Transactions</Text>
        {recentTransactions.length === 0 ? (
          <View style={styles.emptyRecent}>
            <Text style={styles.emptyRecentText}>No transactions recorded yet.</Text>
          </View>
        ) : (
          recentTransactions.map(tx => (
            <TransactionRow key={tx.id} transaction={tx} />
          ))
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
  },
  balanceCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 24,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 4,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 8,
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: '700',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  monthArrow: {
    padding: 6,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1E293B',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  summaryCardLabel: {
    fontSize: 12,
    color: '#64748B',
    marginLeft: 6,
    fontWeight: '500',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  chartCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1E293B',
    marginBottom: 12,
  },
  emptyChart: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    color: '#94A3B8',
    fontSize: 14,
  },
  recentCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  emptyRecent: {
    padding: 24,
    alignItems: 'center',
  },
  emptyRecentText: {
    color: '#94A3B8',
    fontSize: 14,
  },
});
