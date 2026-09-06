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
  SafeAreaView,
  Platform
} from 'react-native';
import { BlurView } from 'expo-blur';
import { useFinance } from '../context/FinanceContext';
import { TransactionType } from '../types/finance';
import { formatNumber } from '../utils/format';
import { FinanceIcon } from '../utils/iconMap';
import { TransactionRow } from '../components/TransactionRow';
import { GlassBackground } from '../components/GlassBackground';
import { TransactionModal } from '../components/TransactionModal';
import { DatePicker } from '../components/DatePicker';
import { PieChart } from 'react-native-chart-kit';
import { useTheme } from '../utils/theme';
import { showAlert } from '../utils/alert';

type RangePreset = 'month' | '7days' | '30days' | 'year' | 'custom';

const toDateString = (d: Date): string => {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

const getMonthRange = (d: Date) => {
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return {
    start: toDateString(start),
    end: toDateString(end),
  };
};

const getLastNDaysRange = (days: number) => {
  const end = new Date();
  const start = new Date();
  start.setDate(end.getDate() - (days - 1));
  return {
    start: toDateString(start),
    end: toDateString(end),
  };
};

const getYearRange = (year: number) => {
  return {
    start: `${year}-01-01`,
    end: `${year}-12-31`,
  };
};

const screenWidth = Dimensions.get('window').width;

export const DashboardScreen: React.FC = () => {
  const { state, updateSettings, updateDateFilter } = useFinance();
  const { colors, isDarkMode } = useTheme();
  const currencySymbol = state.settings.currencySymbol;

  // Cached Date Range Filter State from FinanceContext & AsyncStorage
  const dateFilter = state.dateFilter;
  const rangePreset = dateFilter.rangePreset;
  const currentMonthDate = new Date(dateFilter.currentMonthDate);
  const customStartDate = dateFilter.customStartDate;
  const customEndDate = dateFilter.customEndDate;
  const [isCustomExpanded, setIsCustomExpanded] = useState<boolean>(false);

  // Chart view mode: 'bars' or 'donut'
  const [chartView, setChartView] = useState<'bars' | 'donut'>('bars');

  // Floating action transaction modal state
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('Expense');

  const handleOpenTransaction = (type: TransactionType) => {
    setTxModalType(type);
    setTxModalVisible(true);
  };

  // Budget modal state
  const [budgetModalVisible, setBudgetModalVisible] = useState(false);
  const [budgetInput, setBudgetInput] = useState('');

  // Determine active start and end dates
  let activeStartDate = customStartDate;
  let activeEndDate = customEndDate;

  if (rangePreset === 'month') {
    const r = getMonthRange(currentMonthDate);
    activeStartDate = r.start;
    activeEndDate = r.end;
  } else if (rangePreset === '7days') {
    const r = getLastNDaysRange(7);
    activeStartDate = r.start;
    activeEndDate = r.end;
  } else if (rangePreset === '30days') {
    const r = getLastNDaysRange(30);
    activeStartDate = r.start;
    activeEndDate = r.end;
  } else if (rangePreset === 'year') {
    const r = getYearRange(currentMonthDate.getFullYear());
    activeStartDate = r.start;
    activeEndDate = r.end;
  }

  // Calculate days count in active range
  const startTs = new Date(activeStartDate).getTime();
  const endTs = new Date(activeEndDate).getTime();
  const activeRangeDays = Math.max(1, Math.round((endTs - startTs) / (1000 * 60 * 60 * 24)) + 1);

  const formatRangeLabel = () => {
    if (rangePreset === 'month') {
      return currentMonthDate.toLocaleString('default', { month: 'long', year: 'numeric' });
    }
    if (rangePreset === 'year') {
      return `Year ${currentMonthDate.getFullYear()}`;
    }
    if (activeStartDate === activeEndDate) {
      const [y, m, d] = activeStartDate.split('-').map(Number);
      return new Date(y, m - 1, d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    }
    const [y1, m1, d1] = activeStartDate.split('-').map(Number);
    const [y2, m2, d2] = activeEndDate.split('-').map(Number);
    const dt1 = new Date(y1, m1 - 1, d1);
    const dt2 = new Date(y2, m2 - 1, d2);
    const s1 = dt1.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const s2 = dt2.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    return `${s1} – ${s2}`;
  };

  const handleSelectPreset = (preset: RangePreset) => {
    let newFilter = { ...dateFilter, rangePreset: preset };
    if (preset === 'custom') {
      setIsCustomExpanded(true);
    } else {
      setIsCustomExpanded(false);
      if (preset === '7days') {
        const r = getLastNDaysRange(7);
        newFilter = { ...newFilter, customStartDate: r.start, customEndDate: r.end };
      } else if (preset === '30days') {
        const r = getLastNDaysRange(30);
        newFilter = { ...newFilter, customStartDate: r.start, customEndDate: r.end };
      } else if (preset === 'year') {
        const r = getYearRange(new Date().getFullYear());
        newFilter = { ...newFilter, customStartDate: r.start, customEndDate: r.end };
      } else if (preset === 'month') {
        const r = getMonthRange(new Date());
        newFilter = {
          ...newFilter,
          currentMonthDate: new Date().toISOString(),
          customStartDate: r.start,
          customEndDate: r.end,
        };
      }
    }
    updateDateFilter(newFilter);
  };

  const handlePrevPeriod = () => {
    let newFilter = { ...dateFilter };
    if (rangePreset === 'month') {
      const prev = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() - 1, 1);
      const r = getMonthRange(prev);
      newFilter = {
        ...newFilter,
        currentMonthDate: prev.toISOString(),
        customStartDate: r.start,
        customEndDate: r.end,
      };
    } else if (rangePreset === 'year') {
      const prevYear = currentMonthDate.getFullYear() - 1;
      const prev = new Date(prevYear, 0, 1);
      const r = getYearRange(prevYear);
      newFilter = {
        ...newFilter,
        currentMonthDate: prev.toISOString(),
        customStartDate: r.start,
        customEndDate: r.end,
      };
    } else {
      const [y1, m1, d1] = activeStartDate.split('-').map(Number);
      const [y2, m2, d2] = activeEndDate.split('-').map(Number);
      const s = new Date(y1, m1 - 1, d1);
      s.setDate(s.getDate() - activeRangeDays);
      const e = new Date(y2, m2 - 1, d2);
      e.setDate(e.getDate() - activeRangeDays);
      newFilter = {
        ...newFilter,
        rangePreset: 'custom',
        customStartDate: toDateString(s),
        customEndDate: toDateString(e),
      };
    }
    updateDateFilter(newFilter);
  };

  const handleNextPeriod = () => {
    let newFilter = { ...dateFilter };
    if (rangePreset === 'month') {
      const next = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 1);
      const r = getMonthRange(next);
      newFilter = {
        ...newFilter,
        currentMonthDate: next.toISOString(),
        customStartDate: r.start,
        customEndDate: r.end,
      };
    } else if (rangePreset === 'year') {
      const nextYear = currentMonthDate.getFullYear() + 1;
      const next = new Date(nextYear, 0, 1);
      const r = getYearRange(nextYear);
      newFilter = {
        ...newFilter,
        currentMonthDate: next.toISOString(),
        customStartDate: r.start,
        customEndDate: r.end,
      };
    } else {
      const [y1, m1, d1] = activeStartDate.split('-').map(Number);
      const [y2, m2, d2] = activeEndDate.split('-').map(Number);
      const s = new Date(y1, m1 - 1, d1);
      s.setDate(s.getDate() + activeRangeDays);
      const e = new Date(y2, m2 - 1, d2);
      e.setDate(e.getDate() + activeRangeDays);
      newFilter = {
        ...newFilter,
        rangePreset: 'custom',
        customStartDate: toDateString(s),
        customEndDate: toDateString(e),
      };
    }
    updateDateFilter(newFilter);
  };

  // Filter transactions for the selected date range
  const rangeTransactions = state.transactions.filter(tx => {
    const txDateStr = tx.date.split('T')[0];
    return txDateStr >= activeStartDate && txDateStr <= activeEndDate;
  });
  const monthTransactions = rangeTransactions; // backward compatibility

  // Calculate total balance across all accounts
  const totalBalance = state.accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // Calculate total income and expense for the selected range
  let monthlyIncome = 0;
  let monthlyExpense = 0;

  rangeTransactions.forEach(tx => {
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
  const isCurrentMonth = rangePreset === 'month' && today.getFullYear() === currentMonthDate.getFullYear() && today.getMonth() === currentMonthDate.getMonth();
  const daysInMonth = new Date(currentMonthDate.getFullYear(), currentMonthDate.getMonth() + 1, 0).getDate();
  const currentDay = isCurrentMonth ? today.getDate() : daysInMonth;
  const daysLeft = isCurrentMonth ? Math.max(1, daysInMonth - currentDay + 1) : 1;
  const dailySafeSpend = hasBudget ? remainingBudget / daysLeft : 0;
  const dailyAvgSpend = activeRangeDays > 0 ? monthlyExpense / activeRangeDays : 0;

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
                { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.75)' : 'rgba(255, 255, 255, 0.78)' },
              ]}
            >
              {/* Top Specular Sheen */}
              <View style={[styles.specularSheen, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.4)' : 'rgba(255, 255, 255, 0.9)' }]} />

              <View style={styles.balanceTopRow}>
                <Text style={[styles.balanceLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Total Net Worth</Text>
                <View style={[styles.balanceChip, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.18)' : 'rgba(2, 132, 199, 0.12)' }]}>
                  <FinanceIcon name="shield-alt" size={11} color={isDarkMode ? '#38BDF8' : '#0284C7'} />
                  <Text style={[styles.balanceChipText, { color: isDarkMode ? '#38BDF8' : '#0284C7' }]}>Live Balance</Text>
                </View>
              </View>

              <Text style={[styles.balanceValue, { color: isDarkMode ? '#FFFFFF' : '#000000' }]}>
                {formatNumber(totalBalance, currencySymbol)}
              </Text>

              <View style={styles.balanceFooterRow}>
                <Text style={[styles.balanceFooterSub, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>Across {state.accounts.length} linked accounts</Text>
              </View>
            </BlurView>
          </View>

          {/* FROSTED LIQUID GLASS DATE RANGE FILTER JUST ABOVE INCOME & EXPENSE */}
          <View style={[styles.dateFilterCard, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
            {/* Specular sheen */}
            <View style={[styles.specularSheen, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.25)' : 'rgba(255, 255, 255, 0.75)' }]} />

            {/* Top Bar: Nav Arrows + Date Range Display Pill */}
            <View style={styles.dateFilterTopRow}>
              <Pressable onPress={handlePrevPeriod} style={styles.periodArrowBtn} hitSlop={10}>
                <FinanceIcon name="chevron-left" size={14} color={colors.textSecondary} />
              </Pressable>

              <Pressable
                style={({ pressed }) => [
                  styles.rangeDisplayPill,
                  {
                    backgroundColor: colors.glassInput,
                    borderColor: isCustomExpanded ? colors.primary : colors.glassBorder,
                    opacity: pressed ? 0.82 : 1,
                  },
                ]}
                onPress={() => {
                  if (rangePreset !== 'custom') {
                    updateDateFilter({
                      ...dateFilter,
                      rangePreset: 'custom',
                    });
                  }
                  setIsCustomExpanded(prev => !prev);
                }}
              >
                <View style={[styles.rangeIconCircle, { backgroundColor: `${colors.primary}20` }]}>
                  <FinanceIcon name="calendar-alt" size={12} color={colors.primary} />
                </View>
                <View style={styles.rangeTextContainer}>
                  <Text style={[styles.rangeLabelText, { color: colors.text }]} numberOfLines={1}>
                    {formatRangeLabel()}
                  </Text>
                  <Text style={[styles.rangeDaysSubText, { color: colors.textSecondary }]}>
                    {activeRangeDays} {activeRangeDays === 1 ? 'day' : 'days'}
                  </Text>
                </View>
                <FinanceIcon
                  name={isCustomExpanded ? 'chevron-up' : 'sliders-h'}
                  size={11}
                  color={isCustomExpanded ? colors.primary : colors.textSecondary}
                />
              </Pressable>

              <Pressable onPress={handleNextPeriod} style={styles.periodArrowBtn} hitSlop={10}>
                <FinanceIcon name="chevron-right" size={14} color={colors.textSecondary} />
              </Pressable>
            </View>

            {/* Preset Quick Filter Chips */}
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.presetScrollContent}
              style={styles.presetScrollView}
            >
              {[
                { id: 'month', label: 'This Month' },
                { id: '7days', label: 'Last 7 Days' },
                { id: '30days', label: 'Last 30 Days' },
                { id: 'year', label: 'This Year' },
                { id: 'custom', label: 'Custom Range ⚙️' },
              ].map(p => {
                const isSelected = rangePreset === p.id;
                return (
                  <Pressable
                    key={p.id}
                    style={[
                      styles.rangePresetChip,
                      {
                        backgroundColor: isSelected ? colors.primary : colors.glassInput,
                        borderColor: isSelected ? colors.primary : colors.glassBorder,
                      },
                    ]}
                    onPress={() => handleSelectPreset(p.id as RangePreset)}
                  >
                    <Text
                      style={[
                        styles.rangePresetChipText,
                        { color: isSelected ? '#FFFFFF' : colors.textSecondary },
                        isSelected && styles.rangePresetChipTextActive,
                      ]}
                    >
                      {p.label}
                    </Text>
                  </Pressable>
                );
              })}
            </ScrollView>

            {/* Expandable Custom Range Drawer */}
            {isCustomExpanded && (
              <View style={[styles.customRangeDrawer, { borderTopColor: colors.glassBorder }]}>
                <View style={styles.customDrawerHeader}>
                  <View style={styles.customDrawerTitleGroup}>
                    <FinanceIcon name="calendar" size={13} color={colors.primary} />
                    <Text style={[styles.customDrawerTitle, { color: colors.text }]}>Custom Date Range</Text>
                  </View>
                  <Pressable
                    style={styles.closeDrawerBtn}
                    onPress={() => setIsCustomExpanded(false)}
                    hitSlop={8}
                  >
                    <FinanceIcon name="times" size={12} color={colors.textSecondary} />
                  </Pressable>
                </View>

                <View style={styles.customPickersContainer}>
                  <DatePicker
                    label="Start Date"
                    value={customStartDate}
                    onChange={val => {
                      const newEnd = val > customEndDate ? val : customEndDate;
                      updateDateFilter({
                        ...dateFilter,
                        rangePreset: 'custom',
                        customStartDate: val,
                        customEndDate: newEnd,
                      });
                    }}
                  />
                  <DatePicker
                    label="End Date"
                    value={customEndDate}
                    onChange={val => {
                      const newStart = val < customStartDate ? val : customStartDate;
                      updateDateFilter({
                        ...dateFilter,
                        rangePreset: 'custom',
                        customStartDate: newStart,
                        customEndDate: val,
                      });
                    }}
                  />
                </View>

                <Pressable
                  style={({ pressed }) => [
                    styles.applyRangeBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
                  ]}
                  onPress={() => setIsCustomExpanded(false)}
                >
                  <Text style={styles.applyRangeBtnText}>
                    Apply Filter ({activeRangeDays} {activeRangeDays === 1 ? 'day' : 'days'})
                  </Text>
                </Pressable>
              </View>
            )}
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
                          onPress={() => {
                            const currentVal = parseFloat(budgetInput) || 0;
                            setBudgetInput((currentVal + val).toString());
                          }}
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

        {/* FLOATING ACTION BUTTONS DOCK: Expense, Transfer, Income */}
        <View style={styles.floatingActionDock}>
          {/* EXPENSE BUTTON */}
          <Pressable
            style={({ pressed }) => [
              styles.expenseFloatingBtn,
              { opacity: pressed ? 0.88 : 0.75, transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
            onPress={() => handleOpenTransaction('Expense')}
          >
            <View style={[styles.floatingSpecularSheen, { backgroundColor: 'rgba(255, 255, 255, 0.45)' }]} />
            <View style={styles.btnIconCircle}>
              <FinanceIcon name="arrow-down" size={12} color="#FFFFFF" />
            </View>
            <Text style={styles.expenseBtnText}>Expense</Text>
          </Pressable>

          {/* TRANSFER BUTTON (A bit smaller) */}
          <Pressable
            style={({ pressed }) => [
              styles.transferFloatingBtn,
              { opacity: pressed ? 0.88 : 0.75, transform: [{ scale: pressed ? 0.95 : 1 }] },
            ]}
            onPress={() => handleOpenTransaction('Transfer')}
          >
            <View style={[styles.floatingSpecularSheen, { backgroundColor: 'rgba(255, 255, 255, 0.45)' }]} />
            <FinanceIcon name="exchange-alt" size={13} color="#FFFFFF" />
            <Text style={styles.transferBtnText}>Transfer</Text>
          </Pressable>

          {/* INCOME BUTTON */}
          <Pressable
            style={({ pressed }) => [
              styles.incomeFloatingBtn,
              { opacity: pressed ? 0.88 : 0.75, transform: [{ scale: pressed ? 0.96 : 1 }] },
            ]}
            onPress={() => handleOpenTransaction('Income')}
          >
            <View style={[styles.floatingSpecularSheen, { backgroundColor: 'rgba(255, 255, 255, 0.45)' }]} />
            <View style={styles.btnIconCircle}>
              <FinanceIcon name="arrow-up" size={12} color="#FFFFFF" />
            </View>
            <Text style={styles.incomeBtnText}>Income</Text>
          </Pressable>
        </View>

        {/* TRANSACTION MODAL */}
        <TransactionModal
          visible={txModalVisible}
          initialType={txModalType}
          onClose={() => setTxModalVisible(false)}
        />
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
    paddingBottom: 175, // Account for floating action buttons and floating tab bar
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
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  balanceChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
  },
  balanceChipText: {
    fontSize: 10,
    fontWeight: '700',
  },
  balanceValue: {
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
  },
  dateFilterCard: {
    borderRadius: 20,
    padding: 12,
    marginBottom: 14,
    borderWidth: 1.2,
    overflow: 'hidden',
  },
  dateFilterTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  periodArrowBtn: {
    padding: 8,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rangeDisplayPill: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  rangeIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  rangeTextContainer: {
    flex: 1,
    marginRight: 6,
  },
  rangeLabelText: {
    fontSize: 14,
    fontWeight: '700',
  },
  rangeDaysSubText: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 1,
  },
  presetScrollView: {
    marginTop: 10,
  },
  presetScrollContent: {
    flexDirection: 'row',
    gap: 8,
    paddingRight: 8,
  },
  rangePresetChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 14,
    borderWidth: 1,
  },
  rangePresetChipText: {
    fontSize: 12,
    fontWeight: '500',
  },
  rangePresetChipTextActive: {
    fontWeight: '700',
  },
  customRangeDrawer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  customDrawerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  customDrawerTitleGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customDrawerTitle: {
    fontSize: 13,
    fontWeight: '700',
  },
  closeDrawerBtn: {
    padding: 4,
  },
  customPickersContainer: {
    gap: 2,
  },
  applyRangeBtn: {
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 8,
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 4,
  },
  applyRangeBtnText: {
    color: '#FFFFFF',
    fontSize: 13,
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
  floatingActionDock: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 98 : 90,
    left: 16,
    right: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 999,
  },
  expenseFloatingBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 68, 68, 0.90)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    marginRight: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 7,
    overflow: 'hidden',
  },
  transferFloatingBtn: {
    height: 38, // Noticeably smaller than Expense/Income 48!
    paddingHorizontal: 13,
    borderRadius: 19,
    backgroundColor: 'rgba(2, 132, 199, 0.90)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    shadowColor: '#0284C7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 5,
    overflow: 'hidden',
    gap: 5,
  },
  incomeFloatingBtn: {
    flex: 1,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(16, 185, 129, 0.90)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.45,
    shadowRadius: 12,
    elevation: 7,
    overflow: 'hidden',
  },
  btnIconCircle: {
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  expenseBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  transferBtnText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '700',
  },
  incomeBtnText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  floatingSpecularSheen: {
    position: 'absolute',
    top: 0,
    left: 10,
    right: 10,
    height: 1.2,
  },
});
