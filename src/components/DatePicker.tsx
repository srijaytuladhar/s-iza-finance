import React, { useState } from 'react';
import { View, Text, StyleSheet, Pressable, Modal } from 'react-native';
import { BlurView } from 'expo-blur';
import { FinanceIcon } from '../utils/iconMap';
import { useTheme } from '../utils/theme';

interface DatePickerProps {
  value: string; // "YYYY-MM-DD"
  onChange: (date: string) => void;
  label?: string;
}

const DAYS_OF_WEEK = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  label = 'Date',
}) => {
  const { colors, isDarkMode } = useTheme();
  const [modalVisible, setModalVisible] = useState(false);

  // Parse current selected date
  const now = new Date();
  const [valYear, valMonth, valDay] = value
    ? value.split('-').map(Number)
    : [now.getFullYear(), now.getMonth() + 1, now.getDate()];

  // Calendar navigation state (0-indexed month)
  const [viewYear, setViewYear] = useState(valYear || now.getFullYear());
  const [viewMonth, setViewMonth] = useState((valMonth ? valMonth - 1 : now.getMonth()));

  const openPicker = () => {
    setViewYear(valYear || now.getFullYear());
    setViewMonth(valMonth ? valMonth - 1 : now.getMonth());
    setModalVisible(true);
  };

  const handlePrevMonth = () => {
    if (viewMonth === 0) {
      setViewYear(prev => prev - 1);
      setViewMonth(11);
    } else {
      setViewMonth(prev => prev - 1);
    }
  };

  const handleNextMonth = () => {
    if (viewMonth === 11) {
      setViewYear(prev => prev + 1);
      setViewMonth(0);
    } else {
      setViewMonth(prev => prev + 1);
    }
  };

  const formatDateStr = (y: number, m: number, d: number) => {
    const mm = String(m + 1).padStart(2, '0');
    const dd = String(d).padStart(2, '0');
    return `${y}-${mm}-${dd}`;
  };

  const handleSelectDay = (day: number) => {
    const dateStr = formatDateStr(viewYear, viewMonth, day);
    onChange(dateStr);
    setModalVisible(false);
  };

  const handleSelectShortcut = (offsetDays: number) => {
    const target = new Date();
    target.setDate(target.getDate() - offsetDays);
    const dateStr = formatDateStr(target.getFullYear(), target.getMonth(), target.getDate());
    onChange(dateStr);
  };

  const selectedDateObj = new Date(valYear, valMonth - 1, valDay);
  const todayObj = new Date();
  const yesterdayObj = new Date();
  yesterdayObj.setDate(todayObj.getDate() - 1);

  const isToday =
    valYear === todayObj.getFullYear() &&
    valMonth - 1 === todayObj.getMonth() &&
    valDay === todayObj.getDate();

  const isYesterday =
    valYear === yesterdayObj.getFullYear() &&
    valMonth - 1 === yesterdayObj.getMonth() &&
    valDay === yesterdayObj.getDate();

  let formattedDate = selectedDateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  if (isToday) {
    formattedDate = `Today, ${selectedDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  } else if (isYesterday) {
    formattedDate = `Yesterday, ${selectedDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}`;
  }

  const firstDayOfWeek = new Date(viewYear, viewMonth, 1).getDay();
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

  const monthLabel = new Date(viewYear, viewMonth, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  return (
    <View style={styles.container}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>

      <View style={styles.inputRow}>
        {/* Main Date Picker Trigger Button */}
        <Pressable
          style={({ pressed }) => [
            styles.dateButton,
            colors.glassShadow,
            {
              backgroundColor: colors.glassCard,
              borderColor: colors.glassBorder,
              opacity: pressed ? 0.85 : 1,
            },
          ]}
          onPress={openPicker}
        >
          <View style={styles.dateInfo}>
            <View style={[styles.iconWrapper, { backgroundColor: `${colors.primary}20` }]}>
              <FinanceIcon name="calendar" size={15} color={colors.primary} />
            </View>
            <Text style={[styles.dateText, { color: colors.text }]}>
              {formattedDate}
            </Text>
          </View>
          <FinanceIcon name="chevron-down" size={12} color={colors.textSecondary} />
        </Pressable>

        {/* Quick Shortcuts */}
        <View style={styles.shortcutsRow}>
          <Pressable
            style={[
              styles.shortcutChip,
              colors.glassShadow,
              {
                backgroundColor: isToday ? colors.primary : colors.glassCard,
                borderColor: isToday ? colors.primary : colors.glassBorder,
              },
            ]}
            onPress={() => handleSelectShortcut(0)}
          >
            <Text
              style={[
                styles.shortcutText,
                { color: isToday ? '#FFFFFF' : colors.text },
                isToday && styles.shortcutTextActive,
              ]}
            >
              Today
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.shortcutChip,
              colors.glassShadow,
              {
                backgroundColor: isYesterday ? colors.primary : colors.glassCard,
                borderColor: isYesterday ? colors.primary : colors.glassBorder,
              },
            ]}
            onPress={() => handleSelectShortcut(1)}
          >
            <Text
              style={[
                styles.shortcutText,
                { color: isYesterday ? '#FFFFFF' : colors.text },
                isYesterday && styles.shortcutTextActive,
              ]}
            >
              Yesterday
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Calendar Modal with Liquid Glass */}
      <Modal
        visible={modalVisible}
        animationType="fade"
        transparent
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable style={styles.modalOverlay} onPress={() => setModalVisible(false)}>
          <Pressable
            style={[
              styles.modalCardContainer,
              colors.glassShadow,
              { borderColor: colors.glassBorder },
            ]}
            onPress={e => e.stopPropagation()}
          >
            <View style={styles.modalBlurWrapper}>
              <BlurView
                intensity={65}
                tint={colors.blurTint}
                style={[
                  styles.modalBlur,
                  { backgroundColor: colors.glassCard },
                ]}
              >
                {/* Specular sheen */}
                <View style={[styles.modalSheen, { backgroundColor: colors.glassBorderHighlight }]} />

                {/* Header / Month Navigation */}
                <View style={styles.calendarHeader}>
                  <Pressable
                    style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}
                    onPress={handlePrevMonth}
                    hitSlop={10}
                  >
                    <FinanceIcon name="chevron-left" size={16} color={colors.text} />
                  </Pressable>

                  <Text style={[styles.calendarMonthText, { color: colors.text }]}>
                    {monthLabel}
                  </Text>

                  <Pressable
                    style={({ pressed }) => [styles.navBtn, { opacity: pressed ? 0.6 : 1 }]}
                    onPress={handleNextMonth}
                    hitSlop={10}
                  >
                    <FinanceIcon name="chevron-right" size={16} color={colors.text} />
                  </Pressable>
                </View>

                {/* Days of Week Header */}
                <View style={styles.daysOfWeekRow}>
                  {DAYS_OF_WEEK.map(d => (
                    <Text key={d} style={[styles.dayOfWeekText, { color: colors.textSecondary }]}>
                      {d}
                    </Text>
                  ))}
                </View>

                {/* Calendar Grid */}
                <View style={styles.grid}>
                  {Array.from({ length: firstDayOfWeek }).map((_, i) => (
                    <View key={`empty-${i}`} style={styles.dayCell} />
                  ))}

                  {Array.from({ length: daysInMonth }).map((_, i) => {
                    const dayNum = i + 1;
                    const isSelected =
                      viewYear === valYear &&
                      viewMonth === valMonth - 1 &&
                      dayNum === valDay;

                    const isCurrentToday =
                      viewYear === todayObj.getFullYear() &&
                      viewMonth === todayObj.getMonth() &&
                      dayNum === todayObj.getDate();

                    return (
                      <Pressable
                        key={`day-${dayNum}`}
                        style={({ pressed }) => [
                          styles.dayCell,
                          isSelected && [styles.selectedDayCell, { backgroundColor: colors.primary }],
                          isCurrentToday && !isSelected && [
                            styles.todayCell,
                            { borderColor: colors.primary },
                          ],
                          pressed && { opacity: 0.7 },
                        ]}
                        onPress={() => handleSelectDay(dayNum)}
                      >
                        <Text
                          style={[
                            styles.dayText,
                            { color: isSelected ? '#FFFFFF' : colors.text },
                            (isSelected || isCurrentToday) && styles.dayTextBold,
                          ]}
                        >
                          {dayNum}
                        </Text>
                      </Pressable>
                    );
                  })}
                </View>

                {/* Modal Actions */}
                <View style={[styles.modalActions, { borderTopColor: colors.glassBorder }]}>
                  <Pressable
                    style={styles.modalCancelBtn}
                    onPress={() => setModalVisible(false)}
                  >
                    <Text style={[styles.modalCancelText, { color: colors.textSecondary }]}>
                      Cancel
                    </Text>
                  </Pressable>

                  <Pressable
                    style={[styles.modalTodayBtn, { backgroundColor: `${colors.primary}20` }]}
                    onPress={() => {
                      handleSelectShortcut(0);
                      setModalVisible(false);
                    }}
                  >
                    <Text style={[styles.modalTodayText, { color: colors.primary }]}>
                      Set to Today
                    </Text>
                  </Pressable>
                </View>
              </BlurView>
            </View>
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 6,
  },
  inputRow: {
    flexDirection: 'column',
    gap: 8,
  },
  dateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 48,
    borderWidth: 1.2,
    borderRadius: 14,
    paddingHorizontal: 12,
  },
  dateInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  iconWrapper: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dateText: {
    fontSize: 15,
    fontWeight: '600',
  },
  shortcutsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  shortcutChip: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    borderWidth: 1,
  },
  shortcutText: {
    fontSize: 12,
    fontWeight: '500',
  },
  shortcutTextActive: {
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalCardContainer: {
    width: '100%',
    maxWidth: 340,
    borderRadius: 22,
    borderWidth: 1.2,
  },
  modalBlurWrapper: {
    borderRadius: 22,
    overflow: 'hidden',
  },
  modalBlur: {
    padding: 20,
  },
  modalSheen: {
    position: 'absolute',
    top: 0,
    left: 20,
    right: 20,
    height: 1,
    opacity: 0.7,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 4,
  },
  navBtn: {
    padding: 8,
  },
  calendarMonthText: {
    fontSize: 16,
    fontWeight: '700',
  },
  daysOfWeekRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  dayOfWeekText: {
    fontSize: 12,
    fontWeight: '600',
    width: 38,
    textAlign: 'center',
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'flex-start',
  },
  dayCell: {
    width: `${100 / 7}%`,
    height: 38,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 19,
    marginVertical: 2,
  },
  selectedDayCell: {
    borderRadius: 19,
  },
  todayCell: {
    borderWidth: 1.5,
  },
  dayText: {
    fontSize: 14,
    fontWeight: '500',
  },
  dayTextBold: {
    fontWeight: '700',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  modalCancelText: {
    fontSize: 14,
    fontWeight: '600',
  },
  modalTodayBtn: {
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  modalTodayText: {
    fontSize: 14,
    fontWeight: '700',
  },
});
