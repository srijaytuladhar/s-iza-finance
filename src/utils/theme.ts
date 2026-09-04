import { useFinance } from '../context/FinanceContext';

export const getThemeColors = (isDarkMode: boolean) => {
  if (isDarkMode) {
    return {
      background: '#0B0F19',
      card: 'rgba(30, 41, 59, 0.70)',
      cardSolid: '#1E293B',
      text: '#F8FAFC',
      textSecondary: '#94A3B8',
      border: 'rgba(255, 255, 255, 0.12)',
      borderSolid: '#334155',
      primary: '#38BDF8', // Apple electric cyan/sky
      primaryLight: 'rgba(56, 189, 248, 0.18)',
      primaryGradient: ['#38BDF8', '#6366F1'] as const,
      inputBackground: 'rgba(15, 23, 42, 0.60)',
      textInput: '#F8FAFC',
      tint: '#F8FAFC',
      tabBarBackground: 'rgba(15, 23, 42, 0.75)',
      tabBarActive: '#38BDF8',
      tabBarInactive: '#94A3B8',
      statusBarStyle: 'light' as const,
      // Liquid Glass Tokens
      glassCard: 'rgba(26, 35, 50, 0.65)',
      glassBorder: 'rgba(255, 255, 255, 0.14)',
      glassBorderHighlight: 'rgba(255, 255, 255, 0.25)',
      glassInput: 'rgba(15, 23, 42, 0.65)',
      glassHighlight: 'rgba(255, 255, 255, 0.08)',
      glassShadow: {
        shadowColor: '#000000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.35,
        shadowRadius: 18,
        elevation: 6,
      },
      blurTint: 'dark' as const,
      // Ambient Liquid Orbs
      orb1: 'rgba(56, 189, 248, 0.22)',  // Electric Blue
      orb2: 'rgba(139, 92, 246, 0.20)',  // Deep Violet
      orb3: 'rgba(236, 72, 153, 0.15)',  // Neon Pink
      orb4: 'rgba(16, 185, 129, 0.15)',  // Emerald
    };
  }
  return {
    background: '#F1F5F9',
    card: 'rgba(255, 255, 255, 0.75)',
    cardSolid: '#FFFFFF',
    text: '#0F172A',
    textSecondary: '#64748B',
    border: 'rgba(255, 255, 255, 0.8)',
    borderSolid: '#E2E8F0',
    primary: '#0284C7', // Apple vibrant blue
    primaryLight: 'rgba(2, 132, 199, 0.12)',
    primaryGradient: ['#0284C7', '#4F46E5'] as const,
    inputBackground: 'rgba(255, 255, 255, 0.65)',
    textInput: '#0F172A',
    tint: '#0F172A',
    tabBarBackground: 'rgba(255, 255, 255, 0.80)',
    tabBarActive: '#0284C7',
    tabBarInactive: '#64748B',
    statusBarStyle: 'dark' as const,
    // Liquid Glass Tokens
    glassCard: 'rgba(255, 255, 255, 0.72)',
    glassBorder: 'rgba(255, 255, 255, 0.75)',
    glassBorderHighlight: 'rgba(255, 255, 255, 0.95)',
    glassInput: 'rgba(255, 255, 255, 0.60)',
    glassHighlight: 'rgba(255, 255, 255, 0.85)',
    glassShadow: {
      shadowColor: '#475569',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 16,
      elevation: 4,
    },
    blurTint: 'light' as const,
    // Ambient Liquid Orbs
    orb1: 'rgba(56, 189, 248, 0.28)',  // Vibrant Cyan
    orb2: 'rgba(168, 85, 247, 0.22)',  // Vibrant Violet
    orb3: 'rgba(244, 114, 182, 0.18)', // Rose
    orb4: 'rgba(52, 211, 153, 0.22)',  // Mint Emerald
  };
};

export const useTheme = () => {
  const context = useFinance();
  const isDarkMode = context?.state?.settings?.isDarkMode || false;
  const colors = getThemeColors(isDarkMode);
  return { colors, isDarkMode };
};
