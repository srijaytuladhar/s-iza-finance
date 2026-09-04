import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FinanceIcon } from '../utils/iconMap';
import { useTheme } from '../utils/theme';
import { useFinance } from '../context/FinanceContext';
import { Numpad } from './Numpad';

interface AmountDisplayProps {
  value: string;
  onClear?: () => void;
  label?: string;
  error?: string;
}

export const formatDisplayAmount = (val: string): string => {
  if (!val) return '0';
  const parts = val.split('.');
  const integerFormatted = parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  if (parts.length > 1) {
    return `${integerFormatted}.${parts[1]}`;
  }
  return integerFormatted;
};

export const AmountDisplay: React.FC<AmountDisplayProps> = ({
  value,
  onClear,
  label = 'Amount',
  error,
}) => {
  const { colors } = useTheme();
  const { state } = useFinance();
  const currency = state?.settings?.currencySymbol || '$';

  const formattedValue = formatDisplayAmount(value);
  const isZero = !value || value === '0';

  return (
    <View style={styles.displayWrapper}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <View
        style={[
          styles.displayCard,
          {
            backgroundColor: colors.inputBackground,
            borderColor: error ? '#EF4444' : colors.border,
          },
        ]}
      >
        <View style={styles.amountRow}>
          <View style={[styles.currencyBadge, { backgroundColor: `${colors.primary}18` }]}>
            <Text style={[styles.currencyText, { color: colors.primary }]}>{currency}</Text>
          </View>
          <Text
            style={[
              styles.amountText,
              { color: isZero ? colors.textSecondary : colors.text },
            ]}
            numberOfLines={1}
            adjustsFontSizeToFit
          >
            {formattedValue}
          </Text>
        </View>

        {!isZero && onClear && (
          <Pressable
            style={({ pressed }) => [
              styles.clearBtn,
              { backgroundColor: colors.card, opacity: pressed ? 0.7 : 1 },
            ]}
            onPress={onClear}
            hitSlop={8}
          >
            <FinanceIcon name="times" size={14} color={colors.textSecondary} />
          </Pressable>
        )}
      </View>
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
};

interface AmountInputProps {
  value: string;
  onChangeText: (text: string) => void;
  label?: string;
  error?: string;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChangeText,
  label = 'Amount',
  error,
}) => {
  return (
    <View style={styles.container}>
      <AmountDisplay
        value={value}
        onClear={() => onChangeText('')}
        label={label}
        error={error}
      />
      <Numpad
        value={value}
        onChange={onChangeText}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 8,
  },
  displayWrapper: {
    marginBottom: 8,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  displayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1.5,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 60,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    marginRight: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyText: {
    fontSize: 16,
    fontWeight: '700',
  },
  amountText: {
    fontSize: 28,
    fontWeight: '700',
    flex: 1,
  },
  clearBtn: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});
