import { useFinance } from '../context/FinanceContext';

export const getThemeColors = (isDarkMode: boolean) => {
  if (isDarkMode) {
    return {
      background: '#0F172A',
      card: '#1E293B',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      border: '#334155',
      primary: '#3B82F6',
      inputBackground: '#0F172A',
      textInput: '#F8FAFC',
      tint: '#F8FAFC',
      tabBarBackground: '#1E293B',
      tabBarActive: '#3B82F6',
      tabBarInactive: '#94A3B8',
      statusBarStyle: 'light' as const,
    };
  }
  return {
    background: '#F8FAFC',
    card: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: '#E2E8F0',
    primary: '#2563EB',
    inputBackground: '#F1F5F9',
    textInput: '#0F172A',
    tint: '#0F172A',
    tabBarBackground: '#FFFFFF',
    tabBarActive: '#2563EB',
    tabBarInactive: '#64748B',
    statusBarStyle: 'dark' as const,
  };
};

export const useTheme = () => {
  const context = useFinance();
  const isDarkMode = context?.state?.settings?.isDarkMode || false;
  const colors = getThemeColors(isDarkMode);
  return { colors, isDarkMode };
};
