import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Dimensions, 
  Pressable, 
  Modal, 
  TextInput 
} from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { formatNumber } from '../utils/format';
import { FinanceIcon } from '../utils/iconMap';
import { TransactionRow } from '../components/TransactionRow';
import { PieChart } from 'react-native-chart-kit';
import { getThemeColors } from '../utils/theme';
import { showAlert } from '../utils/alert';

const screenWidth = Dimensions.get('window').width;

export const DashboardScreen: React.FC = () => {
  const { state, updateSettings } = useFinance();
  const colors = getThemeColors(state.settings.isDarkMode);
  const currencySymbol = state.settings.currencySymbol;

  // Selected date state (defaults to current month/year)
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  // Chart view mode: 'bars' or 'donut'
  const [chartView, setChartView] = useState<'bars' | 'donut'>('bars');

  // Budget modal state
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

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

  // Net Savings & Cash Flow
  const netSavings = monthlyIncome - monthlyExpense;
  const isSurplus = netSavings >= 0;
  const savingsRate = monthlyIncome > 0 ? Math.max(0, (netSavings / monthlyIncome) * 100) : 0;

  // Monthly Budget Logic
  const monthlyBudget = state.settings.monthlyBudget || 0;
  const hasBudget = monthlyBudget > 0;
  const remainingBudget = Math.max(0, monthlyBudget - monthlyExpense);
  const percentRemaining = hasBudget
    ? Math.min(100, Math.max(0, (remainingBudget / monthlyBudget) * 100))
    : 0;
  const isBudgetExceeded = hasBudget && monthlyExpense > monthlyBudget;
  const exceededAmount = monthlyExpense - monthlyBudget;

  // Calculate daily burn rate and safe daily spend
  const today = new Date();
  const isCurrentMonth = today.getFullYear() === targetYear && today.getMonth() === targetMonth;
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;
  const daysLeft = isCurrentMonth ? Math.max(1, daysInMonth - currentDay + 1) : 1;
  const dailySafeSpend = hasBudget ? remainingBudget / daysLeft : 0;
  const dailyAvgSpend = currentDay > 0 ? monthlyExpense / currentDay : 0;

  // Budget color indicator (decreases as expense increases)
  const getBudgetColor = () => {
    if (isBudgetExceeded) return '#EF4444'; // Red
    if (percentRemaining < 20) return '#EF4444'; // Red (Danger)
    if (percentRemaining < 50) return '#F59E0B'; // Amber (Warning)
    return '#10B981'; // Green (Healthy)
  };

  // Open budget edit modal
  const openBudgetModal = () => {
    setBudgetInput(monthlyBudget > 0 ? monthlyBudget.toString() : '');
    setBudgetModalVisible(true);
  };

  const handleSaveBudget = async () => {
    const val = parseFloat(budgetInput);
    if (budgetInput && (isNaN(val) || val < 0)) {
      showAlert('Invalid Budget', 'Please enter a valid positive number.');
      return;
    }
    try {
      await updateSettings({
        ...state.settings,
        monthlyBudget: isNaN(val) ? 0 : val,
      });
      setBudgetModalVisible(false);
    } catch (e) {
      showAlert('Error', 'Failed to update budget: ' + e);
    }
  };

  // Calculate spending by category for the selected month
  const categoryTotals: Record<string, { amount: number; color: string; icon: string; count: number }> = {};

  monthTransactions.forEach(tx => {
    if (tx.type === 'Expense') {
      const catName = tx.category;
      const catObj = state.categories.find(c => c.name.toLowerCase() === catName.toLowerCase());
      const catColor = catObj?.color || '#94A3B8';
      const catIcon = catObj?.icon || 'tag';

      if (!categoryTotals[catName]) {
        categoryTotals[catName] = { amount: 0, color: catColor, icon: catIcon, count: 0 };
      }
      categoryTotals[catName].amount += tx.amount;
      categoryTotals[catName].count += 1;
    }
  });

  const sortedCategories = Object.keys(categoryTotals).map(name => ({
    name,
    amount: categoryTotals[name].amount,
    color: categoryTotals[name].color,
    icon: categoryTotals[name].icon,
    count: categoryTotals[name].count,
  })).sort((a, b) => b.amount - a.amount);

  const maxCategoryAmount = sortedCategories.length > 0 ? sortedCategories[0].amount : 1;
  const topCategory = sortedCategories.length > 0 ? sortedCategories[0] : null;

  // Chart kit data for Pie/Donut Chart
  const chartData = sortedCategories.map(c => ({
    name: c.name,
    amount: c.amount,
    color: c.color,
    legendFontColor: colors.textSecondary,
    legendFontSize: 12,
  }));

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

      {/* Monthly Summary Cards (Income & Expense) */}
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

      {/* MONTHLY BUDGET CARD WITH DECREASING PROGRESS BAR */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleGroup}>
            <View style={[styles.iconCircle, { backgroundColor: `${colors.primary}18` }]}>
              <FinanceIcon name="wallet" size={14} color={colors.primary} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Monthly Budget</Text>
          </View>
          <Pressable
            style={({ pressed }) => [styles.editBudgetBtn, { opacity: pressed ? 0.7 : 1 }]}
            onPress={openBudgetModal}
          >
            <FinanceIcon name="pencil-alt" size={12} color={colors.primary} />
            <Text style={[styles.editBudgetBtnText, { color: colors.primary }]}>
              {hasBudget ? 'Edit Limit' : 'Set Budget'}
            </Text>
          </Pressable>
        </View>

        {hasBudget ? (
          <View style={styles.budgetBody}>
            {/* Top metrics */}
            <View style={styles.budgetMetricsRow}>
              <View>
                <Text style={[styles.budgetSubtitle, { color: colors.textSecondary }]}>Remaining</Text>
                <Text style={[styles.budgetRemainingValue, { color: getBudgetColor() }]}>
                  {formatNumber(remainingBudget, currencySymbol)}
                </Text>
              </View>
              <View style={styles.budgetRightStats}>
                <Text style={[styles.budgetSubDetail, { color: colors.textSecondary }]}>
                  Limit: <Text style={{ color: colors.text, fontWeight: '600' }}>{formatNumber(monthlyBudget, currencySymbol)}</Text>
                </Text>
                <Text style={[styles.budgetSubDetail, { color: colors.textSecondary }]}>
                  Spent: <Text style={{ color: colors.text, fontWeight: '600' }}>{formatNumber(monthlyExpense, currencySymbol)}</Text>
                </Text>
              </View>
            </View>

            {/* Decreasing Budget Progress Bar */}
            <View style={[styles.budgetBarTrack, { backgroundColor: colors.inputBackground }]}>
              <View
                style={[
                  styles.budgetBarFill,
                  {
                    width: `${percentRemaining}%`,
                    backgroundColor: getBudgetColor(),
                  },
                ]}
              />
            </View>

            {/* Bottom Bar Info & Burn Rate */}
            <View style={styles.budgetFooterRow}>
              <Text style={[styles.budgetFooterText, { color: colors.textSecondary }]}>
                {percentRemaining.toFixed(0)}% remaining
              </Text>
              {isCurrentMonth && (
                <Text style={[styles.budgetFooterText, { color: colors.textSecondary }]}>
                  {isBudgetExceeded ? (
                    <Text style={{ color: '#EF4444', fontWeight: '700' }}>
                      Over by {formatNumber(exceededAmount, currencySymbol)}
                    </Text>
                  ) : (
                    `Safe daily: ${formatNumber(dailySafeSpend, currencySymbol)}/day`
                  )}
                </Text>
              )}
            </View>
          </View>
        ) : (
          <View style={styles.emptyBudgetContainer}>
            <Text style={[styles.emptyBudgetText, { color: colors.textSecondary }]}>
              Set a monthly spending limit to track your remaining budget.
            </Text>
            <Pressable
              style={[styles.setBudgetBtn, { backgroundColor: colors.primary }]}
              onPress={openBudgetModal}
            >
              <Text style={styles.setBudgetBtnText}>+ Set Monthly Budget</Text>
            </Pressable>
          </View>
        )}
      </View>

      {/* NET CASHFLOW & SAVINGS RATE */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeaderRow}>
          <View style={styles.cardTitleGroup}>
            <View style={[styles.iconCircle, { backgroundColor: isSurplus ? '#10B98118' : '#EF444418' }]}>
              <FinanceIcon name={isSurplus ? 'piggy-bank' : 'exclamation-circle'} size={14} color={isSurplus ? '#10B981' : '#EF4444'} />
            </View>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Net Cash Flow</Text>
          </View>
          <View style={[styles.badge, { backgroundColor: isSurplus ? '#10B98118' : '#EF444418' }]}>
            <Text style={[styles.badgeText, { color: isSurplus ? '#10B981' : '#EF4444' }]}>
              {isSurplus ? `+${savingsRate.toFixed(0)}% Saved` : 'Deficit'}
            </Text>
          </View>
        </View>

        <View style={styles.cashflowRow}>
          <View>
            <Text style={[styles.cashflowValue, { color: isSurplus ? '#10B981' : '#EF4444' }]}>
              {isSurplus ? '+' : ''}{formatNumber(netSavings, currencySymbol)}
            </Text>
            <Text style={[styles.cashflowSub, { color: colors.textSecondary }]}>
              {isSurplus ? 'Net positive savings this month' : 'Expenses exceed income'}
            </Text>
          </View>
        </View>

        {/* Visual Cashflow Proportion Bar */}
        {(monthlyIncome > 0 || monthlyExpense > 0) && (
          <View style={styles.ratioBarContainer}>
            <View
              style={[
                styles.ratioSegment,
                {
                  flex: Math.max(0.01, monthlyIncome),
                  backgroundColor: '#10B981',
                  borderTopLeftRadius: 4,
                  borderBottomLeftRadius: 4,
                },
              ]}
            />
            <View
              style={[
                styles.ratioSegment,
                {
                  flex: Math.max(0.01, monthlyExpense),
                  backgroundColor: '#EF4444',
                  borderTopRightRadius: 4,
                  borderBottomRightRadius: 4,
                },
              ]}
            />
          </View>
        )}
      </View>

      {/* QUICK ANALYTICS METRIC TILES */}
      <View style={styles.metricsGrid}>
        <View style={[styles.metricTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Daily Avg</Text>
          <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
            {formatNumber(dailyAvgSpend, currencySymbol)}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textSecondary }]}>Per day spend</Text>
        </View>

        <View style={[styles.metricTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Top Category</Text>
          <Text style={[styles.metricValue, { color: topCategory?.color || colors.text }]} numberOfLines={1}>
            {topCategory ? topCategory.name : 'None'}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textSecondary }]}>
            {topCategory ? `${((topCategory.amount / (monthlyExpense || 1)) * 100).toFixed(0)}% of total` : 'No expenses'}
          </Text>
        </View>

        <View style={[styles.metricTile, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Activity</Text>
          <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
            {monthTransactions.length}
          </Text>
          <Text style={[styles.metricSub, { color: colors.textSecondary }]}>Total transactions</Text>
        </View>
      </View>

      {/* SPENDING BY CATEGORY WITH BAR GRAPH & DONUT CHART TOGGLE */}
      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <View style={styles.cardHeaderRow}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Spending by Category</Text>
          {/* View Toggle */}
          <View style={[styles.chartToggleGroup, { backgroundColor: colors.inputBackground }]}>
            <Pressable
              style={[
                styles.chartToggleBtn,
                chartView === 'bars' && [styles.chartToggleBtnActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setChartView('bars')}
            >
              <Text
                style={[
                  styles.chartToggleBtnText,
                  { color: chartView === 'bars' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Bars
              </Text>
            </Pressable>
            <Pressable
              style={[
                styles.chartToggleBtn,
                chartView === 'donut' && [styles.chartToggleBtnActive, { backgroundColor: colors.primary }],
              ]}
              onPress={() => setChartView('donut')}
            >
              <Text
                style={[
                  styles.chartToggleBtnText,
                  { color: chartView === 'donut' ? '#FFFFFF' : colors.textSecondary },
                ]}
              >
                Donut
              </Text>
            </Pressable>
          </View>
        </View>

        {sortedCategories.length === 0 ? (
          <View style={styles.emptyChart}>
            <Text style={styles.emptyChartText}>No expenses recorded this month.</Text>
          </View>
        ) : chartView === 'bars' ? (
          /* BAR GRAPH VIEW */
          <View style={styles.barGraphContainer}>
            {sortedCategories.map(cat => {
              const percentOfTotal = ((cat.amount / (monthlyExpense || 1)) * 100).toFixed(0);
              const barWidthPercent = ((cat.amount / maxCategoryAmount) * 100);

              return (
                <View key={cat.name} style={styles.categoryBarItem}>
                  {/* Category Header (Icon, Name, Amount, %) */}
                  <View style={styles.categoryBarHeader}>
                    <View style={styles.categoryBarLeft}>
                      <View style={[styles.categoryIconCircle, { backgroundColor: `${cat.color}20` }]}>
                        <FinanceIcon name={cat.icon} size={13} color={cat.color} />
                      </View>
                      <Text style={[styles.categoryBarName, { color: colors.text }]} numberOfLines={1}>
                        {cat.name}
                      </Text>
                    </View>
                    <View style={styles.categoryBarRight}>
                      <Text style={[styles.categoryBarAmount, { color: colors.text }]}>
                        {formatNumber(cat.amount, currencySymbol)}
                      </Text>
                      <Text style={[styles.categoryBarPercent, { color: colors.textSecondary }]}>
                        {percentOfTotal}%
                      </Text>
                    </View>
                  </View>

                  {/* Horizontal Bar */}
                  <View style={[styles.categoryBarTrack, { backgroundColor: colors.inputBackground }]}>
                    <View
                      style={[
                        styles.categoryBarFill,
                        {
                          width: `${barWidthPercent}%`,
                          backgroundColor: cat.color,
                        },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        ) : (
          /* DONUT CHART VIEW */
          <PieChart
            data={chartData}
            width={screenWidth - 48}
            height={190}
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

      {/* BUDGET EDIT MODAL */}
      <Modal
        visible={budgetModalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setBudgetModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setBudgetModalVisible(false)}>
          <Pressable
            style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}
            onPress={e => e.stopPropagation()}
          >
            <Text style={[styles.modalTitle, { color: colors.text }]}>Monthly Budget Limit</Text>
            <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
              Set a spending limit for each month. The dashboard bar will decrease as you make expenses.
            </Text>

            <View style={[styles.modalInputWrapper, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}>
              <Text style={[styles.modalCurrencyPrefix, { color: colors.primary }]}>{currencySymbol || '$'}</Text>
              <TextInput
                style={[styles.modalInput, { color: colors.text }]}
                placeholder="0.00"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={budgetInput}
                onChangeText={setBudgetInput}
                autoFocus
              />
            </View>

            {/* Quick preset buttons */}
            <View style={styles.presetRow}>
              {[500, 1000, 2000, 5000].map(val => (
                <Pressable
                  key={val}
                  style={[styles.presetChip, { backgroundColor: colors.inputBackground, borderColor: colors.border }]}
                  onPress={() => setBudgetInput(val.toString())}
                >
                  <Text style={[styles.presetChipText, { color: colors.text }]}>
                    +{val}
                  </Text>
                </Pressable>
              ))}
            </View>

            <View style={styles.modalButtonsRow}>
              <Pressable
                style={[styles.modalBtn, { borderColor: colors.border, borderWidth: 1 }]}
                onPress={() => setBudgetModalVisible(false)}
              >
                <Text style={[styles.modalBtnText, { color: colors.textSecondary }]}>Cancel</Text>
              </Pressable>
              <Pressable
                style={[styles.modalBtn, { backgroundColor: colors.primary }]}
                onPress={handleSaveBudget}
              >
                <Text style={[styles.modalBtnText, { color: '#FFFFFF', fontWeight: '700' }]}>Save Budget</Text>
              </Pressable>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
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
    paddingBottom: 40,
  },
  balanceCard: {
    backgroundColor: '#0F172A',
    borderRadius: 16,
    padding: 24,
    marginBottom: 16,
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
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 15,
    fontWeight: '700',
  },
  editBudgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 6,
    gap: 4,
  },
  editBudgetBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  budgetBody: {
    marginTop: 4,
  },
  budgetMetricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginBottom: 12,
  },
  budgetSubtitle: {
    fontSize: 12,
    fontWeight: '500',
    marginBottom: 2,
  },
  budgetRemainingValue: {
    fontSize: 24,
    fontWeight: '700',
  },
  budgetRightStats: {
    alignItems: 'flex-end',
  },
  budgetSubDetail: {
    fontSize: 12,
    lineHeight: 18,
  },
  budgetBarTrack: {
    height: 10,
    borderRadius: 5,
    overflow: 'hidden',
    marginBottom: 8,
  },
  budgetBarFill: {
    height: '100%',
    borderRadius: 5,
  },
  budgetFooterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  budgetFooterText: {
    fontSize: 12,
    fontWeight: '500',
  },
  emptyBudgetContainer: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  emptyBudgetText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 18,
  },
  setBudgetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  setBudgetBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
  },
  badgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  cashflowRow: {
    marginBottom: 12,
  },
  cashflowValue: {
    fontSize: 22,
    fontWeight: '700',
  },
  cashflowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  ratioBarContainer: {
    height: 6,
    flexDirection: 'row',
    borderRadius: 3,
    overflow: 'hidden',
  },
  ratioSegment: {
    height: '100%',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  metricTile: {
    flex: 1,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  metricLabel: {
    fontSize: 11,
    fontWeight: '600',
    marginBottom: 4,
    textTransform: 'uppercase',
  },
  metricValue: {
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 2,
  },
  metricSub: {
    fontSize: 10,
  },
  chartToggleGroup: {
    flexDirection: 'row',
    borderRadius: 8,
    padding: 2,
  },
  chartToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 6,
  },
  chartToggleBtnActive: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  chartToggleBtnText: {
    fontSize: 12,
    fontWeight: '600',
  },
  barGraphContainer: {
    paddingTop: 8,
  },
  categoryBarItem: {
    marginBottom: 14,
  },
  categoryBarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  categoryBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  categoryIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  categoryBarName: {
    fontSize: 13,
    fontWeight: '600',
    flex: 1,
  },
  categoryBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  categoryBarAmount: {
    fontSize: 13,
    fontWeight: '700',
  },
  categoryBarPercent: {
    fontSize: 12,
    width: 32,
    textAlign: 'right',
  },
  categoryBarTrack: {
    height: 8,
    borderRadius: 4,
    overflow: 'hidden',
  },
  categoryBarFill: {
    height: '100%',
    borderRadius: 4,
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
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCard: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 18,
    borderWidth: 1,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 6,
  },
  modalSub: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1.5,
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 52,
    marginBottom: 14,
  },
  modalCurrencyPrefix: {
    fontSize: 18,
    fontWeight: '700',
    marginRight: 8,
  },
  modalInput: {
    flex: 1,
    fontSize: 20,
    fontWeight: '700',
  },
  presetRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  presetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
  },
  presetChipText: {
    fontSize: 12,
    fontWeight: '600',
  },
  modalButtonsRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
  },
  modalBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
