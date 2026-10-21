import React from 'react';
import { View, Text, StyleSheet, Pressable, Switch, Platform } from 'react-native';
import { BlurView } from 'expo-blur';
import { Account } from '../types/finance';
import { FinanceIcon } from '../utils/iconMap';
import { formatNumber } from '../utils/format';
import { useFinance } from '../context/FinanceContext';
import { useTheme } from '../utils/theme';

interface AccountCardProps {
  account: Account;
  onPress?: () => void;
  onToggleMainBalance?: (value: boolean) => void;
  selected?: boolean;
}

export const AccountCard: React.FC<AccountCardProps> = ({
  account,
  onPress,
  onToggleMainBalance,
  selected = false,
}) => {
  const { state } = useFinance();
  const { colors, isDarkMode } = useTheme();
  const currencySymbol = state.settings.currencySymbol;
  const accColor = account.color || '#38BDF8';
  const isIncluded = account.showInMainBalance !== false;

  const getAccountIcon = (type: Account['type']) => {
    switch (type) {
      case 'Bank': return 'university';
      case 'Wallet': return 'wallet';
      case 'Cash': return 'money-bill-wave';
      default: return 'credit-card';
    }
  };

  return (
    <View
      style={[
        styles.cardContainer,
        colors.glassShadow,
        {
          borderColor: selected ? accColor : colors.glassBorder,
        },
      ]}
    >
      <View style={styles.blurWrapper}>
        <BlurView
          intensity={55}
          tint={colors.blurTint}
          style={[
            styles.blurView,
            { backgroundColor: colors.glassCard },
          ]}
        >
          {/* Specular Top Reflection */}
          <View style={[styles.topSheen, { backgroundColor: colors.glassBorderHighlight }]} />

          {/* Main Card Body (Press to Edit) */}
          <Pressable
            style={({ pressed }) => [
              styles.pressableBody,
              { opacity: pressed ? 0.82 : 1 },
            ]}
            onPress={onPress}
          >
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: `${accColor}22` }]}>
                  <FinanceIcon 
                    name={getAccountIcon(account.type)} 
                    size={16} 
                    color={accColor} 
                  />
                </View>
                <View style={styles.nameCol}>
                  <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                    {account.name}
                  </Text>
                  <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
                    {account.type}
                  </Text>
                </View>
              </View>

              <View style={styles.badgesRow}>
                {account.isDefault && (
                  <View style={[styles.defaultBadge, { backgroundColor: `${accColor}18` }]}>
                    <Text style={[styles.defaultText, { color: accColor }]}>Default</Text>
                  </View>
                )}
                {!isIncluded && (
                  <View style={[styles.hiddenBadge, { backgroundColor: isDarkMode ? 'rgba(239, 68, 68, 0.16)' : 'rgba(239, 68, 68, 0.10)' }]}>
                    <FinanceIcon name="eye-slash" size={10} color="#EF4444" style={{ marginRight: 4 }} />
                    <Text style={styles.hiddenBadgeText}>Hidden</Text>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.balanceSection}>
              <Text style={[styles.balanceCaption, { color: colors.textSecondary }]}>
                Current Balance
              </Text>
              <Text 
                style={[
                  styles.balance, 
                  { 
                    color: isIncluded ? colors.text : (isDarkMode ? '#94A3B8' : '#64748B'),
                    opacity: isIncluded ? 1 : 0.85,
                  }
                ]}
              >
                {formatNumber(account.balance, currencySymbol)}
              </Text>
            </View>
          </Pressable>

          {/* Direct Main Balance Toggle Row */}
          <View 
            style={[
              styles.toggleSection, 
              { 
                borderTopColor: isDarkMode ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.06)',
                backgroundColor: isDarkMode ? 'rgba(255, 255, 255, 0.02)' : 'rgba(0, 0, 0, 0.015)' 
              }
            ]}
          >
            <View style={styles.toggleLeft}>
              <View 
                style={[
                  styles.statusDot, 
                  { backgroundColor: isIncluded ? '#10B981' : (isDarkMode ? '#64748B' : '#94A3B8') }
                ]} 
              />
              <View style={styles.toggleTextCol}>
                <Text style={[styles.toggleTitle, { color: colors.text }]}>
                  Show in Main Balance
                </Text>
                <Text style={[styles.toggleSub, { color: isIncluded ? (isDarkMode ? '#34D399' : '#059669') : colors.textSecondary }]}>
                  {isIncluded ? 'Included in net worth' : 'Excluded from net worth'}
                </Text>
              </View>
            </View>

            <Switch
              value={isIncluded}
              onValueChange={onToggleMainBalance}
              trackColor={{ 
                false: isDarkMode ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)', 
                true: colors.primary 
              }}
              thumbColor={Platform.OS === 'android' ? (isIncluded ? '#FFFFFF' : '#f4f3f4') : undefined}
              ios_backgroundColor={isDarkMode ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.12)'}
              style={Platform.OS === 'ios' ? { transform: [{ scaleX: 0.82 }, { scaleY: 0.82 }] } : undefined}
            />
          </View>
        </BlurView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    borderRadius: 20,
    borderWidth: 1.2,
    marginVertical: 7,
  },
  blurWrapper: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  blurView: {
    width: '100%',
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 24,
    right: 24,
    height: 1,
    opacity: 0.7,
  },
  pressableBody: {
    padding: 16,
    paddingBottom: 14,
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
    marginRight: 8,
  },
  iconCircle: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  nameCol: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
  },
  typeLabel: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  defaultBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  defaultText: {
    fontSize: 11,
    fontWeight: '700',
  },
  hiddenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 10,
  },
  hiddenBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#EF4444',
  },
  balanceSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    marginTop: 4,
  },
  balanceCaption: {
    fontSize: 12,
    fontWeight: '500',
  },
  balance: {
    fontSize: 22,
    fontWeight: '700',
  },
  toggleSection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  toggleLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  toggleTextCol: {
    flex: 1,
  },
  toggleTitle: {
    fontSize: 13,
    fontWeight: '600',
  },
  toggleSub: {
    fontSize: 11,
    marginTop: 1,
  },
});
