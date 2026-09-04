import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  Dimensions, 
  Pressable, 
  Modal, 
  TextInput,
  SafeAreaView
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useFinance } from '../context/FinanceContext';
import { formatNumber } from '../utils/format';
import { FinanceIcon } from '../utils/iconMap';
import { TransactionRow } from '../components/TransactionRow';
import { GlassBackground } from '../components/GlassBackground';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../utils/theme';
import { showAlert } from '../utils/alert';

const screenWidth = Dimensions.get('window').width;

export const DashboardScreen: React.FC = () => {
  const { state, updateSettings } = useFinance();
  const { colors, isDarkMode } = useTheme();
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

  const getBudgetColor = () => {
    if (isBudgetExceeded) return '#EF4444';
    if (percentRemaining < 20) return '#EF4444';
    if (percentRemaining < 50) return '#F59E0B';
    return '#10B981';
  };

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
      const catColor = catObj?.color || '#38BDF8';
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

  const chartData = sortedCategories.map(c => ({
    name: c.name,
    amount: c.amount,
    color: c.color,
    legendFontColor: colors.textSecondary,
    legendFontSize: 12,
  }));

  const recentTransactions = [...state.transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 5);

  const monthYearLabel = selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' });

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView 
          style={styles.container} 
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
        {/* SHIMMERING LIQUID GLASS BALANCE CARD */}
        <View style={[styles.balanceCardWrapper, colors.glassShadow, { borderColor: colors.glassBorder }]}>
          <BlurView
            intensity={60}
            tint={colors.blurTint}
            style={[
              styles.balanceCardBlur,
              { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.75)' : 'rgba(15, 23, 42, 0.88)' },
            ]}
          >
            {/* Top Specular Sheen */}
            <View style={[styles.specularSheen, { backgroundColor: 'rgba(255, 255, 255, 0.4)' }]} />

            <View style={styles.balanceTopRow}>
              <Text style={styles.balanceLabel}>Total Net Worth</Text>
              <View style={styles.balanceChip}>
                <FinanceIcon name="shield-alt" size={11} color="#38BDF8" />
                <Text style={styles.balanceChipText}>Live Balance</Text>
              </View>
            </View>

            <Text style={styles.balanceValue}>
              {formatNumber(totalBalance, currencySymbol)}
            </Text>

            <View style={styles.balanceFooterRow}>
              <Text style={styles.balanceFooterSub}>Across {state.accounts.length} linked accounts</Text>
            </View>
          </BlurView>
        </View>

        {/* FROSTED GLASS MONTH SELECTOR */}
        <View style={[styles.monthSelector, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
          <Pressable onPress={handlePrevMonth} style={styles.monthArrow} hitSlop={10}>
            <FinanceIcon name="chevron-left" size={15} color={colors.textSecondary} />
          </Pressable>
          <Text style={[styles.monthLabel, { color: colors.text }]}>{monthYearLabel}</Text>
          <Pressable onPress={handleNextMonth} style={styles.monthArrow} hitSlop={10}>
            <FinanceIcon name="chevron-right" size={15} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* FROSTED GLASS MONTHLY SUMMARY (INCOME / EXPENSE) */}
        <View style={styles.summaryRow}>
          <View style={[styles.summaryCard, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <View style={styles.summaryHeader}>
              <View style={[styles.miniIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.18)' }]}>
                <FinanceIcon name="arrow-up" size={12} color="#10B981" />
              </View>
              <Text style={[styles.summaryCardLabel, { color: colors.textSecondary }]}>Income</Text>
            </View>
            <Text style={[styles.summaryValue, { color: '#10B981' }]}>
              {formatNumber(monthlyIncome, currencySymbol)}
            </Text>
          </View>

          <View style={[styles.summaryCard, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <View style={styles.summaryHeader}>
              <View style={[styles.miniIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.18)' }]}>
                <FinanceIcon name="arrow-down" size={12} color="#EF4444" />
              </View>
              <Text style={[styles.summaryCardLabel, { color: colors.textSecondary }]}>Expense</Text>
            </View>
            <Text style={[styles.summaryValue, { color: '#EF4444' }]}>
              {formatNumber(monthlyExpense, currencySymbol)}
            </Text>
          </View>
        </View>

        {/* MONTHLY BUDGET CARD WITH DECREASING GLASS PROGRESS BAR */}
        <View style={[styles.glassCard, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <View style={[styles.headerIconCircle, { backgroundColor: `${colors.primary}20` }]}>
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

              {/* Decreasing Glass Progress Bar */}
              <View style={[styles.budgetBarTrack, { backgroundColor: colors.glassInput }]}>
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

              <View style={styles.budgetFooterRow}>
                <Text style={[styles.budgetFooterText, { color: colors.textSecondary }]}>
                  {percentRemaining.toFixed(0)}% budget left
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
                Set a monthly spending limit to track your remaining budget in real-time.
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
        <View style={[styles.glassCard, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
          <View style={styles.cardHeaderRow}>
            <View style={styles.cardTitleGroup}>
              <View style={[styles.headerIconCircle, { backgroundColor: isSurplus ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)' }]}>
                <FinanceIcon name={isSurplus ? 'piggy-bank' : 'exclamation-circle'} size={14} color={isSurplus ? '#10B981' : '#EF4444'} />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Net Cash Flow</Text>
            </View>
            <View style={[styles.badge, { backgroundColor: isSurplus ? 'rgba(16, 185, 129, 0.18)' : 'rgba(239, 68, 68, 0.18)' }]}>
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

          {(monthlyIncome > 0 || monthlyExpense > 0) && (
            <View style={[styles.ratioBarContainer, { backgroundColor: colors.glassInput }]}>
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
          <View style={[styles.metricTile, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Daily Avg</Text>
            <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
              {formatNumber(dailyAvgSpend, currencySymbol)}
            </Text>
            <Text style={[styles.metricSub, { color: colors.textSecondary }]}>Per day spend</Text>
          </View>

          <View style={[styles.metricTile, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Top Category</Text>
            <Text style={[styles.metricValue, { color: topCategory?.color || colors.text }]} numberOfLines={1}>
              {topCategory ? topCategory.name : 'None'}
            </Text>
            <Text style={[styles.metricSub, { color: colors.textSecondary }]}>
              {topCategory ? `${((topCategory.amount / (monthlyExpense || 1)) * 100).toFixed(0)}% of total` : 'No expenses'}
            </Text>
          </View>

          <View style={[styles.metricTile, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Activity</Text>
            <Text style={[styles.metricValue, { color: colors.text }]} numberOfLines={1}>
              {monthTransactions.length}
            </Text>
            <Text style={[styles.metricSub, { color: colors.textSecondary }]}>Transactions</Text>
          </View>
        </View>

        {/* SPENDING BY CATEGORY WITH LIQUID BAR GRAPH & DONUT TOGGLE */}
        <View style={[styles.glassCard, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
          <View style={styles.cardHeaderRow}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>Spending by Category</Text>
            <View style={[styles.chartToggleGroup, { backgroundColor: colors.glassInput }]}>
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
            <View style={styles.barGraphContainer}>
              {sortedCategories.map(cat => {
                const percentOfTotal = ((cat.amount / (monthlyExpense || 1)) * 100).toFixed(0);
                const barWidthPercent = ((cat.amount / maxCategoryAmount) * 100);

                return (
                  <View key={cat.name} style={styles.categoryBarItem}>
                    <View style={styles.categoryBarHeader}>
                      <View style={styles.categoryBarLeft}>
                        <View style={[styles.categoryIconCircle, { backgroundColor: `${cat.color}25` }]}>
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

                    <View style={[styles.categoryBarTrack, { backgroundColor: colors.glassInput }]}>
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
            <PieChart
              data={chartData}
              width={screenWidth - 48}
              height={190}
              chartConfig={{
                color: (opacity = 1) => isDarkMode ? `rgba(255, 255, 255, ${opacity})` : `rgba(0, 0, 0, ${opacity})`,
              }}
              accessor="amount"
              backgroundColor="transparent"
              paddingLeft="0"
              absolute
              hasLegend={true}
            />
          )}
        </View>

        {/* FROSTED GLASS RECENT TRANSACTIONS */}
        <View style={[styles.glassCard, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder, paddingHorizontal: 0, paddingBottom: 0 }]}>
          <Text style={[styles.cardTitle, { color: colors.text, paddingHorizontal: 16, marginBottom: 8 }]}>
            Recent Transactions
          </Text>
          {recentTransactions.length === 0 ? (
            <View style={styles.emptyRecent}>
              <Text style={styles.emptyRecentText}>No transactions recorded yet.</Text>
            </View>
          ) : (
            recentTransactions.map((tx, idx) => (
              <TransactionRow 
                key={tx.id} 
                transaction={tx} 
                isLast={idx === recentTransactions.length - 1} 
              />
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
              style={[styles.modalCardContainer, colors.glassShadow, { borderColor: colors.glassBorder }]}
              onPress={e => e.stopPropagation()}
            >
              <View style={styles.modalBlurWrapper}>
                <BlurView
                  intensity={70}
                  tint={colors.blurTint}
                  style={[styles.modalBlur, { backgroundColor: colors.glassCard }]}
                >
                  <View style={[styles.specularSheen, { backgroundColor: colors.glassBorderHighlight }]} />

                  <Text style={[styles.modalTitle, { color: colors.text }]}>Monthly Budget Limit</Text>
                  <Text style={[styles.modalSub, { color: colors.textSecondary }]}>
                    Set a spending limit for each month. The dashboard bar will decrease as you make expenses.
                  </Text>

                  <View style={[styles.modalInputWrapper, { backgroundColor: colors.glassInput, borderColor: colors.glassBorder }]}>
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

                  <View style={styles.presetRow}>
                    {[500, 1000, 2000, 5000].map(val => (
                      <Pressable
                        key={val}
                        style={[styles.presetChip, { backgroundColor: colors.glassInput, borderColor: colors.glassBorder }]}
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
                      style={[styles.modalBtn, { borderColor: colors.glassBorder, borderWidth: 1 }]}
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
                </BlurView>
              </View>
            </Pressable>
          </Pressable>
        </Modal>
      </ScrollView>
      </SafeAreaView>
    </GlassBackground>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    padding: 16,
    paddingBottom: 110, // Account for floating tab bar
  },
  balanceCardWrapper: {
    borderRadius: 24,
    borderWidth: 1.2,
    marginBottom: 16,
    overflow: 'hidden',
  },
  balanceCardBlur: {
    padding: 24,
  },
  specularSheen: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    opacity: 0.8,
  },
  balanceTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    color: '#94A3B8',
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.18)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  balanceChipText: {
    fontSize: 10,
    color: '#38BDF8',
    fontWeight: '700',
  },
  balanceValue: {
    color: '#FFFFFF',
    fontSize: 34,
    fontWeight: '800',
    letterSpacing: -0.5,
    marginVertical: 4,
  },
  balanceFooterRow: {
    marginTop: 4,
  },
  balanceFooterSub: {
    fontSize: 12,
    color: '#94A3B8',
  },
  monthSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 18,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 14,
    borderWidth: 1.2,
  },
  monthArrow: {
    padding: 6,
  },
  monthLabel: {
    fontSize: 16,
    fontWeight: '700',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 14,
    gap: 10,
  },
  summaryCard: {
    flex: 1,
    borderRadius: 20,
    padding: 16,
    borderWidth: 1.2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniIconCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  summaryCardLabel: {
    fontSize: 13,
    fontWeight: '600',
  },
  summaryValue: {
    fontSize: 20,
    fontWeight: '800',
  },
  glassCard: {
    borderRadius: 22,
    padding: 18,
    marginBottom: 14,
    borderWidth: 1.2,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  editBudgetBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
    gap: 4,
  },
  editBudgetBtnText: {
    fontSize: 12,
    fontWeight: '700',
  },
  budgetBody: {
    marginTop: 2,
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
    fontSize: 26,
    fontWeight: '800',
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
    paddingVertical: 14,
    alignItems: 'center',
  },
  emptyBudgetText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 14,
    lineHeight: 18,
  },
  setBudgetBtn: {
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
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
    fontSize: 24,
    fontWeight: '800',
  },
  cashflowSub: {
    fontSize: 12,
    marginTop: 2,
  },
  ratioBarContainer: {
    height: 7,
    flexDirection: 'row',
    borderRadius: 3.5,
    overflow: 'hidden',
  },
  ratioSegment: {
    height: '100%',
  },
  metricsGrid: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 14,
  },
  metricTile: {
    flex: 1,
    padding: 12,
    borderRadius: 18,
    borderWidth: 1.2,
  },
  metricLabel: {
    fontSize: 10,
    fontWeight: '700',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
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
    borderRadius: 10,
    padding: 2,
  },
  chartToggleBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
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
    width: 26,
    height: 26,
    borderRadius: 13,
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
    width: 34,
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
  emptyChart: {
    height: 120,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyChartText: {
    color: '#94A3B8',
    fontSize: 14,
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
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCardContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 24,
    borderWidth: 1.2,
  },
  modalBlurWrapper: {
    borderRadius: 24,
    overflow: 'hidden',
  },
  modalBlur: {
    padding: 22,
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
    borderWidth: 1.2,
    borderRadius: 14,
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
    borderRadius: 12,
  },
  modalBtnText: {
    fontSize: 14,
    fontWeight: '600',
  },
});
