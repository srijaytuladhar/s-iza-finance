import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Pressable, 
  TextInput, 
  SafeAreaView, 
  ScrollView,
  Switch
} from 'react-native';
import { useFinance } from '../context/FinanceContext';
import { FinanceIcon } from '../utils/iconMap';
import { useNavigation } from '@react-navigation/native';
import { showAlert } from '../utils/alert';
import { useTheme } from '../utils/theme';
import { GlassBackground } from '../components/GlassBackground';
import { GlassCard } from '../components/GlassCard';

export const MoreScreen: React.FC = () => {
  const { state, exportBackupData, importBackupData, confirmImport, updateSettings } = useFinance();
  const navigation = useNavigation<any>();
  const [currencySymbol, setCurrencySymbol] = useState(state.settings.currencySymbol || '');
  const [isDarkMode, setIsDarkMode] = useState(state.settings.isDarkMode || false);
  const [monthlyBudget, setMonthlyBudget] = useState(
    state.settings.monthlyBudget ? state.settings.monthlyBudget.toString() : ''
  );

  const handleSaveSettings = async () => {
    try {
      const parsedBudget = parseFloat(monthlyBudget);
      await updateSettings({ 
        currencySymbol, 
        isDarkMode, 
        monthlyBudget: !monthlyBudget || isNaN(parsedBudget) ? 0 : parsedBudget 
      });
      showAlert('Success', 'Settings saved successfully!');
    } catch (e) {
      showAlert('Error', 'Failed to save settings: ' + e);
    }
  };

  const handleToggleDarkMode = async (value: boolean) => {
    setIsDarkMode(value);
    try {
      const parsedBudget = parseFloat(monthlyBudget);
      await updateSettings({ 
        currencySymbol, 
        isDarkMode: value, 
        monthlyBudget: !monthlyBudget || isNaN(parsedBudget) ? 0 : parsedBudget 
      });
    } catch (e) {
      showAlert('Error', 'Failed to update dark mode: ' + e);
    }
  };

  const handleImport = async () => {
    const importResult = await importBackupData();
    if (!importResult) return;

    if (!importResult.success) {
      showAlert('Import Failed', importResult.message);
      return;
    }

    if (importResult.summary && importResult.pendingData) {
      showAlert(
        'Confirm Import',
        importResult.summary,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Import & Overwrite', 
            style: 'destructive',
            onPress: async () => {
              await confirmImport(importResult.pendingData!);
              showAlert('Success', 'Backup imported successfully!');
            } 
          }
        ]
      );
    }
  };

  const { colors, isDarkMode: currentDarkMode } = useTheme();

  return (
    <GlassBackground>
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          
          {/* Header Brand Hero */}
          <GlassCard borderRadius={22} intensity={65} style={styles.heroCard}>
            <View style={styles.heroContent}>
              <View style={[styles.heroIconWrapper, { backgroundColor: `${colors.primary}20`, borderColor: `${colors.primary}40` }]}>
                <FinanceIcon name="wallet" size={26} color={colors.primary} />
              </View>
              <View style={styles.heroTextGroup}>
                <Text style={[styles.heroTitle, { color: colors.text }]}>S-Iza Finance</Text>
                <Text style={[styles.heroSub, { color: colors.textSecondary }]}>Personal Wealth & Expenses</Text>
              </View>
              <View style={[styles.versionBadge, { backgroundColor: colors.glassInput, borderColor: colors.glassBorder }]}>
                <Text style={[styles.versionBadgeText, { color: colors.primary }]}>PRO</Text>
              </View>
            </View>
          </GlassCard>

          {/* Preferences Group */}
          <GlassCard borderRadius={22} intensity={55} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.18)' }]}>
                <FinanceIcon name="cog" size={14} color="#38BDF8" />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Preferences</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Currency Symbol</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.glassInput, borderColor: colors.glassBorder, color: colors.text }]}
                  placeholder="e.g. Rs., $, NPR"
                  placeholderTextColor={colors.textSecondary}
                  value={currencySymbol}
                  onChangeText={setCurrencySymbol}
                />
                <Pressable 
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]} 
                  onPress={handleSaveSettings}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.inputGroup, { marginTop: 14 }]}>
              <Text style={[styles.label, { color: colors.textSecondary }]}>Monthly Budget Limit</Text>
              <View style={styles.row}>
                <TextInput
                  style={[styles.textInput, { backgroundColor: colors.glassInput, borderColor: colors.glassBorder, color: colors.text }]}
                  placeholder="e.g. 35000 (0 or empty for none)"
                  placeholderTextColor={colors.textSecondary}
                  keyboardType="decimal-pad"
                  value={monthlyBudget}
                  onChangeText={setMonthlyBudget}
                />
                <Pressable 
                  style={[styles.saveBtn, { backgroundColor: colors.primary }]} 
                  onPress={handleSaveSettings}
                >
                  <Text style={styles.saveBtnText}>Save</Text>
                </Pressable>
              </View>
            </View>

            <View style={[styles.menuDivider, { backgroundColor: colors.glassBorder }]} />

            <View style={[styles.menuRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(99, 102, 241, 0.18)' }]}>
                <FinanceIcon name="moon" size={16} color="#818CF8" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[styles.menuSubLabel, { color: colors.textSecondary }]}>Switch app appearance</Text>
              </View>
              <Switch
                value={isDarkMode}
                onValueChange={handleToggleDarkMode}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={isDarkMode ? '#FFFFFF' : '#F8FAFC'}
              />
            </View>
          </GlassCard>

          {/* Features Group */}
          <GlassCard borderRadius={22} intensity={55} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.18)' }]}>
                <FinanceIcon name="users" size={14} color="#10B981" />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Features</Text>
            </View>

            <Pressable 
              style={styles.menuRow}
              onPress={() => navigation.navigate('Contacts')}
            >
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(16, 185, 129, 0.18)' }]}>
                <FinanceIcon name="users" size={16} color="#10B981" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>Bill Splitting Contacts</Text>
                <Text style={[styles.menuSubLabel, { color: colors.textSecondary }]}>Track owed amounts & settlements</Text>
              </View>
              <FinanceIcon name="chevron-right" size={14} color={colors.textSecondary} />
            </Pressable>
          </GlassCard>

          {/* Data Management Group */}
          <GlassCard borderRadius={22} intensity={55} style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <View style={[styles.sectionIconCircle, { backgroundColor: 'rgba(139, 92, 246, 0.18)' }]}>
                <FinanceIcon name="database" size={14} color="#A78BFA" />
              </View>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Data Management</Text>
            </View>
            
            <Pressable style={styles.menuRow} onPress={exportBackupData}>
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(56, 189, 248, 0.18)' }]}>
                <FinanceIcon name="file-download" size={16} color="#38BDF8" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>Export Backup</Text>
                <Text style={[styles.menuSubLabel, { color: colors.textSecondary }]}>Save all financial records as JSON</Text>
              </View>
              <FinanceIcon name="chevron-right" size={14} color={colors.textSecondary} />
            </Pressable>

            <View style={[styles.menuDivider, { backgroundColor: colors.glassBorder }]} />

            <Pressable style={styles.menuRow} onPress={handleImport}>
              <View style={[styles.menuIconContainer, { backgroundColor: 'rgba(245, 158, 11, 0.18)' }]}>
                <FinanceIcon name="file-upload" size={16} color="#F59E0B" />
              </View>
              <View style={styles.menuTextCol}>
                <Text style={[styles.menuLabel, { color: colors.text }]}>Import Backup</Text>
                <Text style={[styles.menuSubLabel, { color: colors.textSecondary }]}>Restore records from a backup file</Text>
              </View>
              <FinanceIcon name="chevron-right" size={14} color={colors.textSecondary} />
            </Pressable>
          </GlassCard>

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
    paddingBottom: 110,
  },
  heroCard: {
    marginBottom: 16,
  },
  heroContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 18,
  },
  heroIconWrapper: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    marginRight: 14,
  },
  heroTextGroup: {
    flex: 1,
  },
  heroTitle: {
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: -0.3,
  },
  heroSub: {
    fontSize: 12,
    marginTop: 2,
  },
  versionBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
  },
  versionBadgeText: {
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  sectionCard: {
    marginBottom: 16,
    padding: 18,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionIconCircle: {
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
  inputGroup: {
    marginBottom: 6,
  },
  label: {
    fontSize: 12,
    marginBottom: 8,
    fontWeight: '600',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1.2,
    borderRadius: 14,
    paddingHorizontal: 14,
    height: 44,
    fontSize: 14,
    marginRight: 8,
  },
  saveBtn: {
    paddingHorizontal: 18,
    height: 44,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 14,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '700',
    fontSize: 14,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  menuIconContainer: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  menuTextCol: {
    flex: 1,
  },
  menuLabel: {
    fontSize: 15,
    fontWeight: '600',
  },
  menuSubLabel: {
    fontSize: 12,
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    marginVertical: 14,
  },
});
