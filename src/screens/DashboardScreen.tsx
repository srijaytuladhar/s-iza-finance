import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Dimensions,
  Pressable,
  SafeAreaView,
  Platform,
} from 'react-native';
import { BlurView } from 'expo-blur';
import { LinearGradient } from 'expo-linear-gradient';
import { useFinance } from '../context/FinanceContext';
import { TransactionType, Category } from '../types/finance';
import { formatNumber } from '../utils/format';
import { FinanceIcon } from '../utils/iconMap';
import { GlassBackground } from '../components/GlassBackground';
import { TransactionModal } from '../components/TransactionModal';
import { TransactionRow } from '../components/TransactionRow';
import { useTheme } from '../utils/theme';

const getGradientStops = (hex: string): [string, string] => {
  if (!hex || !hex.startsWith('#')) return ['#0284C7', '#1E3A8A'];
  let c = hex.replace('#', '');
  if (c.length === 3) c = c.split('').map(x => x + x).join('');
  const num = parseInt(c, 16);
  if (isNaN(num)) return ['#0284C7', '#1E3A8A'];
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;

  // Stop 1: Lighter / vibrant top-left
  const r1 = Math.min(255, Math.floor(r * 1.18));
  const g1 = Math.min(255, Math.floor(g * 1.18));
  const b1 = Math.min(255, Math.floor(b * 1.18));
  const stop1 = `rgb(${r1}, ${g1}, ${b1})`;

  // Stop 2: Deeper, richer base tone
  const r2 = Math.floor(r * 0.62);
  const g2 = Math.floor(g * 0.62);
  const b2 = Math.floor(b * 0.70);
  const stop2 = `rgb(${r2}, ${g2}, ${b2})`;

  return [stop1, stop2];
};

const screenWidth = Dimensions.get('window').width;
const GRID_GAP = 12;
const HORIZONTAL_PADDING = 16;
// 3 equal columns:
const CARD_WIDTH = Math.floor((screenWidth - HORIZONTAL_PADDING * 2 - GRID_GAP * 2) / 3);

export const DashboardScreen: React.FC<{ navigation?: any }> = ({ navigation }) => {
  const { state } = useFinance();
  const { colors, isDarkMode } = useTheme();
  const currencySymbol = state.settings.currencySymbol;

  // Modal form states
  const [txModalVisible, setTxModalVisible] = useState(false);
  const [txModalType, setTxModalType] = useState<TransactionType>('Expense');
  const [selectedCategory, setSelectedCategory] = useState<string>('');

  // Total balance across all accounts
  const totalBalance = state.accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);

  // Filter only Expense categories
  const expenseCategories = state.categories.filter(c => c.type === 'Expense');

  // Compute current month income and expense for quick summary
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let monthlyIncome = 0;
  let monthlyExpense = 0;
  const categorySpendMap: Record<string, number> = {};

  state.transactions.forEach(tx => {
    const txDate = new Date(tx.date);
    if (txDate.getFullYear() === currentYear && txDate.getMonth() === currentMonth) {
      if (tx.type === 'Income') {
        monthlyIncome += tx.amount;
      } else if (tx.type === 'Expense') {
        monthlyExpense += tx.amount;
        categorySpendMap[tx.category.toLowerCase()] = (categorySpendMap[tx.category.toLowerCase()] || 0) + tx.amount;
      }
    }
  });

  // Recent transactions (latest 4)
  const recentTransactions = [...state.transactions]
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    .slice(0, 4);

  const handleOpenCategoryExpense = (categoryName: string) => {
    setSelectedCategory(categoryName);
    setTxModalType('Expense');
    setTxModalVisible(true);
  };

  const handleOpenTransaction = (type: TransactionType) => {
    setSelectedCategory('');
    setTxModalType(type);
    setTxModalVisible(true);
  };

  const formattedDate = new Intl.DateTimeFormat('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  }).format(new Date());

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView
          style={styles.container}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          {/* HEADER / GREETING */}
          <View style={styles.header}>
            <View>
              <Text style={[styles.headerGreeting, { color: colors.textSecondary }]}>
                {formattedDate}
              </Text>
              <Text style={[styles.headerTitle, { color: colors.text }]}>
                Dashboard
              </Text>
            </View>

            <Pressable
              style={({ pressed }) => [
                styles.headerActionBtn,
                colors.glassShadow,
                {
                  backgroundColor: colors.glassCard,
                  borderColor: colors.glassBorder,
                  opacity: pressed ? 0.8 : 1,
                  transform: [{ scale: pressed ? 0.95 : 1 }],
                },
              ]}
              onPress={() => navigation?.navigate?.('Statistics')}
            >
              <FinanceIcon name="chart-pie" size={16} color={colors.primary} />
            </Pressable>
          </View>

          {/* TOTAL NET WORTH HERO CARD */}
          <View style={[styles.netWorthWrapper, colors.glassShadow, { borderColor: colors.glassBorder }]}>
            <BlurView
              intensity={65}
              tint={colors.blurTint}
              style={[
                styles.netWorthBlur,
                { backgroundColor: isDarkMode ? 'rgba(15, 23, 42, 0.78)' : 'rgba(255, 255, 255, 0.82)' },
              ]}
            >
              {/* Specular Sheen */}
              <View
                style={[
                  styles.specularSheen,
                  { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.45)' : 'rgba(255, 255, 255, 0.95)' },
                ]}
              />

              {/* Net Worth Top Row */}
              <View style={styles.netWorthTopRow}>
                <View style={styles.netWorthLabelGroup}>
                  <Text style={[styles.netWorthLabel, { color: isDarkMode ? '#94A3B8' : '#64748B' }]}>
                    Total Net Worth
                  </Text>
                  <Text style={[styles.netWorthSub, { color: isDarkMode ? '#64748B' : '#94A3B8' }]}>
                    {state.accounts.length} {state.accounts.length === 1 ? 'account' : 'accounts'}
                  </Text>
                </View>

                <View style={[styles.liveChip, { backgroundColor: isDarkMode ? 'rgba(56, 189, 248, 0.18)' : 'rgba(2, 132, 199, 0.12)' }]}>
                  <View style={[styles.pulsingDot, { backgroundColor: isDarkMode ? '#38BDF8' : '#0284C7' }]} />
                  <Text style={[styles.liveChipText, { color: isDarkMode ? '#38BDF8' : '#0284C7' }]}>
                    Live
                  </Text>
                </View>
              </View>

              {/* Net Worth Balance Value */}
              <Text
                style={[styles.netWorthValue, { color: isDarkMode ? '#FFFFFF' : '#0F172A' }]}
                numberOfLines={1}
                adjustsFontSizeToFit
              >
                {formatNumber(totalBalance, currencySymbol)}
              </Text>

              {/* Monthly Quick Flow Pills */}
              <View style={[styles.monthlyFlowRow, { borderTopColor: isDarkMode ? 'rgba(255, 255, 255, 0.10)' : 'rgba(0, 0, 0, 0.06)' }]}>
                <View style={styles.flowItem}>
                  <View style={[styles.flowIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.16)' }]}>
                    <FinanceIcon name="arrow-up" size={10} color="#10B981" />
                  </View>
                  <View>
                    <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>This Month In</Text>
                    <Text style={[styles.flowValue, { color: '#10B981' }]}>
                      +{formatNumber(monthlyIncome, currencySymbol)}
                    </Text>
                  </View>
                </View>

                <View style={[styles.flowDivider, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.12)' : 'rgba(0, 0, 0, 0.08)' }]} />

                <View style={styles.flowItem}>
                  <View style={[styles.flowIconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.16)' }]}>
                    <FinanceIcon name="arrow-down" size={10} color="#EF4444" />
                  </View>
                  <View>
                    <Text style={[styles.flowLabel, { color: colors.textSecondary }]}>This Month Out</Text>
                    <Text style={[styles.flowValue, { color: '#EF4444' }]}>
                      -{formatNumber(monthlyExpense, currencySymbol)}
                    </Text>
                  </View>
                </View>
              </View>
            </BlurView>
          </View>

          {/* ACCOUNTS HORIZONTAL SCROLL SECTION */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Accounts
              </Text>
              <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.countBadgeText, { color: colors.primary }]}>
                  {state.accounts.length}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => navigation?.navigate?.('Accounts')}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                Manage
              </Text>
            </Pressable>
          </View>

          {state.accounts.length === 0 ? (
            <View style={[styles.emptyAccountsCard, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
              <FinanceIcon name="university" size={28} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>No accounts linked</Text>
              <Pressable
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation?.navigate?.('Accounts')}
              >
                <Text style={styles.emptyButtonText}>Add Account</Text>
              </Pressable>
            </View>
          ) : (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.accountsScrollContent}
              style={styles.accountsScrollView}
            >
              {state.accounts.map(acc => {
                const accColor = acc.color || '#38BDF8';
                const [stop1, stop2] = getGradientStops(accColor);
                const getAccIcon = (type: string) => {
                  switch (type) {
                    case 'Bank': return 'university';
                    case 'Wallet': return 'wallet';
                    case 'Cash': return 'money-bill-wave';
                    default: return 'credit-card';
                  }
                };

                return (
                  <View
                    key={acc.id}
                    style={[
                      styles.horizontalAccountPressable,
                      {
                        shadowColor: accColor,
                      },
                    ]}
                  >
                    <LinearGradient
                      colors={[stop1, stop2]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.horizontalAccountCard}
                    >
                      {/* Top specular reflection */}
                      <View style={styles.cardSheen} />

                      {/* Ambient glowing orb in card */}
                      <View style={styles.cardAmbientOrb} />

                      {/* Top row: Icon + Name + Default Pill */}
                      <View style={styles.accCardTopRow}>
                        <View style={styles.accIconCircle}>
                          <FinanceIcon name={getAccIcon(acc.type)} size={16} color="#FFFFFF" />
                        </View>
                        <View style={styles.accNameCol}>
                          <Text style={styles.accNameText} numberOfLines={1}>
                            {acc.name}
                          </Text>
                          <Text style={styles.accTypeText}>
                            {acc.type}
                          </Text>
                        </View>
                        {acc.isDefault && (
                          <View style={styles.defaultBadge}>
                            <Text style={styles.defaultBadgeText}>Default</Text>
                          </View>
                        )}
                      </View>

                      {/* Bottom row: Balance */}
                      <View style={styles.accBalanceRow}>
                        <Text style={styles.accBalanceLabel}>
                          Current Balance
                        </Text>
                        <Text style={styles.accBalanceValue} numberOfLines={1}>
                          {formatNumber(acc.balance, currencySymbol)}
                        </Text>
                      </View>
                    </LinearGradient>
                  </View>
                );
              })}

              {/* Add Account Shortcut Card */}
              <Pressable
                style={({ pressed }) => [
                  styles.addAccountCard,
                  {
                    backgroundColor: colors.glassInput,
                    borderColor: colors.glassBorder,
                    opacity: pressed ? 0.7 : 1,
                  },
                ]}
                onPress={() => navigation?.navigate?.('Accounts')}
              >
                <View style={[styles.addAccountIconCircle, { backgroundColor: colors.primaryLight }]}>
                  <FinanceIcon name="plus" size={16} color={colors.primary} />
                </View>
                <Text style={[styles.addAccountLabel, { color: colors.text }]}>Add Account</Text>
              </Pressable>
            </ScrollView>
          )}

          {/* EXPENSE CATEGORIES SECTION HEADER */}
          <View style={styles.sectionHeader}>
            <View style={styles.sectionTitleRow}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Expense Categories
              </Text>
              <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
                <Text style={[styles.countBadgeText, { color: colors.primary }]}>
                  {expenseCategories.length}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={() => navigation?.navigate?.('Categories')}
              style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
            >
              <Text style={[styles.seeAllText, { color: colors.primary }]}>
                Manage
              </Text>
            </Pressable>
          </View>

          <Text style={[styles.sectionSubtitle, { color: colors.textSecondary }]}>
            Tap any category to quickly log an expense
          </Text>

          {/* EXPENSE CATEGORIES GRID */}
          {expenseCategories.length === 0 ? (
            <View style={[styles.emptyCard, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
              <FinanceIcon name="tags" size={32} color={colors.textSecondary} />
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                No Expense Categories
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
                Create expense categories to track your spending effortlessly.
              </Text>
              <Pressable
                style={[styles.emptyButton, { backgroundColor: colors.primary }]}
                onPress={() => navigation?.navigate?.('Categories')}
              >
                <Text style={styles.emptyButtonText}>Add Category</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.gridContainer}>
              {expenseCategories.map(cat => {
                const catColor = cat.color || '#EF4444';
                const spent = categorySpendMap[cat.name.toLowerCase()] || 0;

                return (
                  <Pressable
                    key={cat.id}
                    style={({ pressed }) => [
                      styles.categoryCard,
                      colors.glassShadow,
                      {
                        backgroundColor: colors.glassCard,
                        borderColor: colors.glassBorder,
                        transform: [{ scale: pressed ? 0.94 : 1 }],
                        opacity: pressed ? 0.85 : 1,
                      },
                    ]}
                    onPress={() => handleOpenCategoryExpense(cat.name)}
                  >
                    {/* Top specular highlight on card */}
                    <View
                      style={[
                        styles.cardSheen,
                        { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.75)' },
                      ]}
                    />

                    {/* Category Icon Badge */}
                    <View
                      style={[
                        styles.categoryIconCircle,
                        {
                          backgroundColor: `${catColor}24`,
                          borderColor: `${catColor}40`,
                        },
                      ]}
                    >
                      <FinanceIcon name={cat.icon || 'tag'} size={18} color={catColor} />
                    </View>

                    {/* Category Name */}
                    <Text
                      style={[styles.categoryName, { color: colors.text }]}
                      numberOfLines={1}
                      ellipsizeMode="tail"
                    >
                      {cat.name}
                    </Text>

                    {/* Month spend if recorded */}
                    {spent > 0 ? (
                      <Text style={[styles.categorySpend, { color: colors.textSecondary }]} numberOfLines={1}>
                        {formatNumber(spent, currencySymbol)}
                      </Text>
                    ) : (
                      <Text style={[styles.categoryTapHint, { color: colors.textSecondary }]}>
                        Tap to log
                      </Text>
                    )}
                  </Pressable>
                );
              })}
            </View>
          )}

          {/* RECENT EXPENSES / TRANSACTIONS PREVIEW */}
          {recentTransactions.length > 0 && (
            <View style={styles.recentSection}>
              <View style={styles.sectionHeader}>
                <Text style={[styles.sectionTitle, { color: colors.text }]}>
                  Recent Activity
                </Text>
                <Pressable
                  onPress={() => navigation?.navigate?.('Transactions')}
                  style={({ pressed }) => [{ opacity: pressed ? 0.6 : 1 }]}
                >
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>
                    All
                  </Text>
                </Pressable>
              </View>

              <View style={[styles.recentListCard, colors.glassShadow, { backgroundColor: colors.glassCard, borderColor: colors.glassBorder }]}>
                {recentTransactions.map((tx, idx) => (
                  <View key={tx.id}>
                    <TransactionRow
                      transaction={tx}
                      onPress={() => {
                        setSelectedCategory(tx.category || '');
                        setTxModalType(tx.type);
                        setTxModalVisible(true);
                      }}
                    />
                    {idx < recentTransactions.length - 1 && (
                      <View style={[styles.rowDivider, { backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)' }]} />
                    )}
                  </View>
                ))}
              </View>
            </View>
          )}

          {/* Bottom spacer for TabBar and Floating Action Dock */}
          <View style={{ height: 160 }} />
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

          {/* TRANSFER BUTTON */}
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

        {/* TRANSACTION / EXPENSE MODAL */}
        <TransactionModal
          visible={txModalVisible}
          onClose={() => {
            setTxModalVisible(false);
            setSelectedCategory('');
          }}
          initialType={txModalType}
          initialCategory={selectedCategory}
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
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingTop: Platform.OS === 'android' ? 16 : 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingTop: 4,
  },
  headerGreeting: {
    fontSize: 13,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: 2,
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  headerActionBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    borderWidth: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // HERO NET WORTH CARD
  netWorthWrapper: {
    borderRadius: 24,
    borderWidth: 1.2,
    overflow: 'hidden',
    marginBottom: 24,
  },
  netWorthBlur: {
    padding: 20,
    borderRadius: 24,
  },
  specularSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
    opacity: 0.85,
  },
  netWorthTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  netWorthLabelGroup: {
    flexDirection: 'column',
  },
  netWorthLabel: {
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  netWorthSub: {
    fontSize: 12,
    marginTop: 2,
    fontWeight: '500',
  },
  liveChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 5,
  },
  pulsingDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  liveChipText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.3,
  },
  netWorthValue: {
    fontSize: 34,
    fontWeight: '900',
    letterSpacing: -0.8,
    marginVertical: 4,
  },
  monthlyFlowRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 14,
    paddingTop: 14,
    borderTopWidth: 1,
  },
  flowItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  flowIconCircle: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
  },
  flowLabel: {
    fontSize: 11,
    fontWeight: '600',
  },
  flowValue: {
    fontSize: 13,
    fontWeight: '700',
    marginTop: 1,
  },
  flowDivider: {
    width: 1,
    height: 28,
    marginHorizontal: 12,
  },
  // SECTION HEADERS
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: -0.3,
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  countBadgeText: {
    fontSize: 11,
    fontWeight: '700',
  },
  sectionSubtitle: {
    fontSize: 13,
    fontWeight: '500',
    marginBottom: 14,
  },
  seeAllText: {
    fontSize: 13,
    fontWeight: '600',
  },
  // ACCOUNTS HORIZONTAL SCROLL
  accountsScrollView: {
    marginBottom: 24,
    marginHorizontal: -HORIZONTAL_PADDING,
  },
  accountsScrollContent: {
    paddingHorizontal: HORIZONTAL_PADDING,
    paddingVertical: 6,
    gap: 12,
  },
  horizontalAccountPressable: {
    borderRadius: 24,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.38,
    shadowRadius: 14,
    elevation: 8,
  },
  horizontalAccountCard: {
    width: 250,
    minHeight: 132,
    padding: 18,
    borderRadius: 24,
    borderWidth: 1.2,
    borderColor: 'rgba(255, 255, 255, 0.28)',
    position: 'relative',
    overflow: 'hidden',
    justifyContent: 'space-between',
  },
  cardAmbientOrb: {
    position: 'absolute',
    right: -25,
    bottom: -25,
    width: 105,
    height: 105,
    borderRadius: 55,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
  },
  accCardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
  },
  accIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  accNameCol: {
    flex: 1,
  },
  accNameText: {
    fontSize: 16,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: -0.2,
  },
  accTypeText: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: 2,
  },
  defaultBadge: {
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.4)',
    marginLeft: 4,
  },
  defaultBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    color: '#FFFFFF',
    letterSpacing: 0.3,
  },
  accBalanceRow: {
    marginTop: 'auto',
  },
  accBalanceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: 'rgba(255, 255, 255, 0.82)',
    marginBottom: 2,
  },
  accBalanceValue: {
    fontSize: 22,
    fontWeight: '900',
    color: '#FFFFFF',
    letterSpacing: -0.5,
  },
  addAccountCard: {
    width: 120,
    minHeight: 132,
    borderRadius: 24,
    borderWidth: 1.2,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 12,
  },
  addAccountIconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  addAccountLabel: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyAccountsCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1.2,
    alignItems: 'center',
    marginBottom: 24,
  },
  // EXPENSE CATEGORIES GRID
  gridContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: GRID_GAP,
    marginBottom: 24,
  },
  categoryCard: {
    width: CARD_WIDTH,
    paddingVertical: 14,
    paddingHorizontal: 8,
    borderRadius: 20,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    overflow: 'hidden',
  },
  cardSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.2,
  },
  categoryIconCircle: {
    width: 44,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryName: {
    fontSize: 12,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
    width: '100%',
  },
  categorySpend: {
    fontSize: 11,
    fontWeight: '600',
  },
  categoryTapHint: {
    fontSize: 10,
    fontStyle: 'italic',
    opacity: 0.7,
  },
  // EMPTY CATEGORIES CARD
  emptyCard: {
    padding: 24,
    borderRadius: 20,
    borderWidth: 1.2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 24,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginTop: 10,
    marginBottom: 4,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 18,
    maxWidth: 240,
  },
  emptyButton: {
    paddingHorizontal: 18,
    paddingVertical: 10,
    borderRadius: 14,
  },
  emptyButtonText: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: '700',
  },
  // RECENT TRANSACTIONS
  recentSection: {
    marginBottom: 16,
  },
  recentListCard: {
    borderRadius: 20,
    borderWidth: 1.2,
    overflow: 'hidden',
    marginTop: 8,
    paddingVertical: 4,
  },
  rowDivider: {
    height: 1,
    marginHorizontal: 16,
  },
  // FLOATING ACTION DOCK
  floatingActionDock: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 96 : 84,
    left: 20,
    right: 20,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    zIndex: 100,
  },
  expenseFloatingBtn: {
    flex: 1.15,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#EF4444',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#EF4444',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    marginRight: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  transferFloatingBtn: {
    flex: 0.95,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#3B82F6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    marginHorizontal: 4,
    overflow: 'hidden',
    position: 'relative',
  },
  incomeFloatingBtn: {
    flex: 1.15,
    height: 46,
    borderRadius: 23,
    backgroundColor: '#10B981',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#10B981',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 8,
    marginLeft: 6,
    overflow: 'hidden',
    position: 'relative',
  },
  floatingSpecularSheen: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 1.5,
  },
  btnIconCircle: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.25)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 6,
  },
  expenseBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.2,
  },
  transferBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 12,
    marginLeft: 5,
    letterSpacing: 0.2,
  },
  incomeBtnText: {
    color: '#FFFFFF',
    fontWeight: '800',
    fontSize: 13,
    letterSpacing: 0.2,
  },
});
