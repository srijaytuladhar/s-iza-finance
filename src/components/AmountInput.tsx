import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { BlurView } from 'expo-blur';
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
  const { colors, isDarkMode } = useTheme();
  const { state } = useFinance();
  const currency = state?.settings?.currencySymbol || '$';

  const formattedValue = formatDisplayAmount(value);
  const isZero = !value || value === '0';

  return (
    <View style={styles.displayWrapper}>
      {label ? <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text> : null}
      <View
        style={[
          styles.cardContainer,
          colors.glassShadow,
          {
            borderColor: error ? '#EF4444' : colors.glassBorder,
          },
        ]}
      >
        <View style={styles.blurWrapper}>
          <BlurView
            intensity={50}
            tint={colors.blurTint}
            style={[
              styles.displayCard,
              { backgroundColor: colors.glassCard },
            ]}
          >
            {/* Specular sheen */}
            <View style={[styles.topSheen, { backgroundColor: colors.glassBorderHighlight }]} />

            <View style={styles.amountRow}>
              <View style={[styles.currencyBadge, { backgroundColor: `${colors.primary}22` }]}>
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
                  { backgroundColor: colors.inputBackground, opacity: pressed ? 0.7 : 1 },
                ]}
                onPress={onClear}
                hitSlop={8}
              >
                <FinanceIcon name="times" size={13} color={colors.textSecondary} />
              </Pressable>
            )}
          </BlurView>
        </View>
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
  cardContainer: {
    borderRadius: 18,
    borderWidth: 1.2,
  },
  blurWrapper: {
    borderRadius: 18,
    overflow: 'hidden',
  },
  displayCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    height: 64,
  },
  topSheen: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    opacity: 0.8,
  },
  amountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  currencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 10,
    marginRight: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  currencyText: {
    fontSize: 17,
    fontWeight: '700',
  },
  amountText: {
    fontSize: 30,
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
  },
  errorText: {
    fontSize: 12,
    color: '#EF4444',
    marginTop: 4,
  },
});
