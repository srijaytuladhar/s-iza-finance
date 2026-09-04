import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
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
  const accColor = account.color || '#38BDF8';

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
      style={({ pressed }) => [
        styles.cardContainer,
        colors.glassShadow,
        {
          borderColor: selected ? accColor : colors.glassBorder,
          opacity: pressed ? 0.88 : 1,
        },
      ]}
      onPress={onPress}
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

          <View style={styles.content}>
            <View style={styles.header}>
              <View style={styles.iconContainer}>
                <View style={[styles.iconCircle, { backgroundColor: `${accColor}22` }]}>
                  <FinanceIcon 
                    name={getAccountIcon(account.type)} 
                    size={16} 
                    color={accColor} 
                  />
                </View>
                <Text style={[styles.name, { color: colors.text }]} numberOfLines={1}>
                  {account.name}
                </Text>
              </View>
              {account.isDefault && (
                <View style={[styles.defaultBadge, { backgroundColor: `${accColor}18` }]}>
                  <Text style={[styles.defaultText, { color: accColor }]}>Default</Text>
                </View>
              )}
            </View>

            <View style={styles.footer}>
              <Text style={[styles.typeLabel, { color: colors.textSecondary }]}>
                {account.type}
              </Text>
              <Text style={[styles.balance, { color: colors.text }]}>
                {formatNumber(account.balance, currencySymbol)}
              </Text>
            </View>
          </View>
        </BlurView>
      </View>
    </Pressable>
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
  content: {
    padding: 18,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  iconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconCircle: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  name: {
    fontSize: 16,
    fontWeight: '700',
    flex: 1,
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
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  typeLabel: {
    fontSize: 13,
    fontWeight: '500',
  },
  balance: {
    fontSize: 22,
    fontWeight: '700',
  },
});
