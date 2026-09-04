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
import { getThemeColors } from '../utils/theme';

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

  const colors = getThemeColors(state.settings.isDarkMode);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView contentContainerStyle={styles.content}>
        
        {/* Settings Group */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Settings</Text>
          <View style={styles.inputGroup}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Currency Symbol (e.g. Rs., $, NPR)</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. Rs. (leave empty for none)"
                placeholderTextColor={colors.textSecondary}
                value={currencySymbol}
                onChangeText={setCurrencySymbol}
              />
              <Pressable style={styles.saveBtn} onPress={handleSaveSettings}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
          
          <View style={[styles.inputGroup, { marginTop: 12 }]}>
            <Text style={[styles.label, { color: colors.textSecondary }]}>Monthly Budget Limit</Text>
            <View style={styles.row}>
              <TextInput
                style={[styles.textInput, { backgroundColor: colors.inputBackground, borderColor: colors.border, color: colors.text }]}
                placeholder="e.g. 5000 (0 or empty for none)"
                placeholderTextColor={colors.textSecondary}
                keyboardType="decimal-pad"
                value={monthlyBudget}
                onChangeText={setMonthlyBudget}
              />
              <Pressable style={styles.saveBtn} onPress={handleSaveSettings}>
                <Text style={styles.saveBtnText}>Save</Text>
              </Pressable>
            </View>
          </View>
          
          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

          <View style={[styles.menuRow, { borderBottomWidth: 0, paddingBottom: 0 }]}>
            <View style={[styles.menuIconContainer, { backgroundColor: state.settings.isDarkMode ? '#334155' : '#F1F5F9' }]}>
              <FinanceIcon name="moon" size={16} color={colors.text} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Dark Mode</Text>
              <Text style={[styles.menuSubLabel, { color: colors.textSecondary }]}>Switch app theme to dark mode</Text>
            </View>
            <Switch
              value={isDarkMode}
              onValueChange={handleToggleDarkMode}
              trackColor={{ false: '#CBD5E1', true: '#2563EB' }}
              thumbColor={isDarkMode ? '#FFFFFF' : '#F8FAFC'}
            />
          </View>
        </View>

        {/* Features Group */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Features</Text>
          <Pressable 
            style={styles.menuRow}
            onPress={() => navigation.navigate('Contacts')}
          >
            <View style={[styles.menuIconContainer, { backgroundColor: state.settings.isDarkMode ? '#334155' : '#F1F5F9' }]}>
              <FinanceIcon name="users" size={16} color={colors.text} />
            </View>
            <Text style={[styles.menuLabel, { color: colors.text }]}>Bill Splitting Contacts</Text>
            <FinanceIcon name="chevron-right" size={14} color={colors.textSecondary} />
          </Pressable>
        </View>

        {/* Data Management Group */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.cardTitle, { color: colors.text }]}>Data Backup & Restore</Text>
          
          <Pressable style={styles.menuRow} onPress={exportBackupData}>
            <View style={[styles.menuIconContainer, { backgroundColor: state.settings.isDarkMode ? '#1E3A8A' : '#E0F2FE' }]}>
              <FinanceIcon name="file-download" size={16} color={state.settings.isDarkMode ? '#60A5FA' : '#0284C7'} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Export Backup</Text>
              <Text style={[styles.menuSubLabel, { color: colors.textSecondary }]}>Export all data to a .json file</Text>
            </View>
            <FinanceIcon name="chevron-right" size={14} color={colors.textSecondary} />
          </Pressable>

          <View style={[styles.menuDivider, { backgroundColor: colors.border }]} />

          <Pressable style={styles.menuRow} onPress={handleImport}>
            <View style={[styles.menuIconContainer, { backgroundColor: state.settings.isDarkMode ? '#065F46' : '#F0FDF4' }]}>
              <FinanceIcon name="file-upload" size={16} color={state.settings.isDarkMode ? '#34D399' : '#16A34A'} />
            </View>
            <View style={styles.menuTextCol}>
              <Text style={[styles.menuLabel, { color: colors.text }]}>Import Backup</Text>
              <Text style={[styles.menuSubLabel, { color: colors.textSecondary }]}>Restore all data from a backup .json file</Text>
            </View>
            <FinanceIcon name="chevron-right" size={14} color={colors.textSecondary} />
          </Pressable>
        </View>

      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F8FAFC',
  },
  content: {
    padding: 16,
  },
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0F172A',
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 8,
  },
  label: {
    fontSize: 12,
    color: '#64748B',
    marginBottom: 8,
    fontWeight: '500',
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    backgroundColor: '#F8FAFC',
    paddingHorizontal: 12,
    height: 40,
    fontSize: 14,
    color: '#0F172A',
    marginRight: 8,
  },
  saveBtn: {
    backgroundColor: '#0F172A',
    paddingHorizontal: 16,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  saveBtnText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 14,
  },
  menuRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  menuIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#F1F5F9',
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
    color: '#1E293B',
    flex: 1,
  },
  menuSubLabel: {
    fontSize: 12,
    color: '#64748B',
    marginTop: 2,
  },
  menuDivider: {
    height: 1,
    backgroundColor: '#F1F5F9',
    marginVertical: 12,
  },
});
