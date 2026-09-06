import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { FinanceIcon } from '../utils/iconMap';
import { useTheme } from '../utils/theme';

interface NumpadProps {
  value: string;
  onChange: (value: string) => void;
  maxDecimals?: number;
  maxDigits?: number;
}

export const Numpad: React.FC<NumpadProps> = ({
  value,
  onChange,
  maxDecimals = 2,
  maxDigits = 9,
}) => {
  const { colors, isDarkMode } = useTheme();

  const handleDigitPress = (digit: string) => {
    // If empty or "0"
    if (!value || value === '0') {
      if (digit === '0') {
        onChange('0');
      } else {
        onChange(digit);
      }
      return;
    }

    // If decimal point exists
    if (value.includes('.')) {
      const parts = value.split('.');
      if (parts[1] && parts[1].length >= maxDecimals) {
        return; // Exceeded max decimal places
      }
      onChange(value + digit);
    } else {
      // Prevent exceeding max digits before decimal
      if (value.replace(/[^0-9]/g, '').length >= maxDigits) {
        return;
      }
      onChange(value + digit);
    }
  };

  const handleDecimalPress = () => {
    if (!value) {
      onChange('0.');
      return;
    }
    if (value.includes('.')) {
      return; // Already has decimal point
    }
    onChange(value + '.');
  };

  const handleBackspacePress = () => {
    if (!value || value.length === 0) return;
    onChange(value.slice(0, -1));
  };

  const handleClear = () => {
    onChange('');
  };

  const rows = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'backspace'],
  ];

  const renderKey = (key: string) => {
    const isBackspace = key === 'backspace';
    const isDecimal = key === '.';

    const onPress = () => {
      if (isBackspace) {
        handleBackspacePress();
      } else if (isDecimal) {
        handleDecimalPress();
      } else {
        handleDigitPress(key);
      }
    };

    return (
      <Pressable
        key={key}
        style={({ pressed }) => [
          styles.key,
          colors.glassShadow,
          {
            backgroundColor: pressed
              ? (isDarkMode ? 'rgba(51, 65, 85, 0.85)' : 'rgba(226, 232, 240, 0.85)')
              : colors.glassCard,
            borderColor: colors.glassBorder,
            transform: [{ scale: pressed ? 0.96 : 1 }],
          },
        ]}
        onPress={onPress}
        onLongPress={isBackspace ? handleClear : undefined}
        delayLongPress={400}
      >
        {isBackspace ? (
          <FinanceIcon name="backspace" size={19} color={colors.text} />
        ) : (
          <Text style={[styles.keyText, { color: colors.text }]}>
            {key}
          </Text>
        )}
      </Pressable>
    );
  };

  return (
    <View style={styles.container}>
      {rows.map((row, rowIndex) => (
        <View key={rowIndex} style={styles.row}>
          {row.map(key => renderKey(key))}
        </View>
      ))}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
    marginVertical: 6,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  key: {
    flex: 1,
    height: 65,
    marginHorizontal: 4,
    borderRadius: 14,
    borderWidth: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  keyText: {
    fontSize: 22,
    fontWeight: '600',
  },
});
