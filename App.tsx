import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { FinanceProvider, useFinance } from './src/context/FinanceContext';
import { TabNavigator } from './src/navigation/TabNavigator';
import { ActivityIndicator, View, StyleSheet, LogBox } from 'react-native';

import { getThemeColors } from './src/utils/theme';

// Ignore all log notifications (warnings will still be logged to the console, but won't show toasts)
LogBox.ignoreAllLogs();

function MainApp() {
  const { state } = useFinance();
  const colors = getThemeColors(state.settings.isDarkMode);

  if (state.isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0F172A" />
      </View>
    );
  }

  return (
    <SafeAreaProvider>
      <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
        <NavigationContainer>
          <TabNavigator />
          <StatusBar 
            style={state.settings.isDarkMode ? 'light' : 'dark'} 
          />
        </NavigationContainer>
      </SafeAreaView>
    </SafeAreaProvider>
  );
}

export default function App() {
  return (
    <FinanceProvider>
      <MainApp />
    </FinanceProvider>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    backgroundColor: '#F8FAFC',
    justifyContent: 'center',
    alignItems: 'center',
  },
});
