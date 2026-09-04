import React from 'react';
import { StyleSheet, View, Platform } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { BlurView } from 'expo-blur';
import { DashboardScreen } from '../screens/DashboardScreen';
import { TransactionsScreen } from '../screens/TransactionsScreen';
import { AccountsScreen } from '../screens/AccountsScreen';
import { CategoriesScreen } from '../screens/CategoriesScreen';
import { MoreScreen } from '../screens/MoreScreen';
import { ContactsScreen } from '../screens/ContactsScreen';
import { ContactDetailScreen } from '../screens/ContactDetailScreen';
import { FinanceIcon } from '../utils/iconMap';
import { useFinance } from '../context/FinanceContext';
import { getThemeColors } from '../utils/theme';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

// Nested stack navigator for the "More" tab
function MoreStackNavigator() {
  const { state } = useFinance();
  const colors = getThemeColors(state.settings.isDarkMode);

  return (
    <Stack.Navigator
      screenOptions={{
        headerStyle: { backgroundColor: colors.glassCard },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background },
      }}
    >
      <Stack.Screen 
        name="MoreHome" 
        component={MoreScreen} 
        options={{ title: 'More Options', headerShown: false }} 
      />
      <Stack.Screen 
        name="Contacts" 
        component={ContactsScreen} 
        options={{ title: 'Contacts' }}
      />
      <Stack.Screen 
        name="ContactDetail" 
        component={ContactDetailScreen} 
        options={{ title: 'Contact Details' }}
      />
    </Stack.Navigator>
  );
}

export function TabNavigator() {
  const { state } = useFinance();
  const colors = getThemeColors(state.settings.isDarkMode);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarIcon: ({ color, size, focused }) => {
          let iconName = 'question-circle';
          if (route.name === 'Dashboard') iconName = 'chart-pie';
          else if (route.name === 'Transactions') iconName = 'file-invoice-dollar';
          else if (route.name === 'Accounts') iconName = 'university';
          else if (route.name === 'Categories') iconName = 'tags';
          else if (route.name === 'More') iconName = 'ellipsis-h';

          return (
            <View style={[styles.iconWrapper, focused && styles.focusedIconWrapper]}>
              <FinanceIcon name={iconName} size={size - 2} color={color} />
            </View>
          );
        },
        tabBarActiveTintColor: colors.primary,
        tabBarInactiveTintColor: colors.textSecondary,
        tabBarBackground: () => (
          <BlurView
            intensity={80}
            tint={colors.blurTint}
            style={[
              StyleSheet.absoluteFill,
              {
                borderRadius: 32,
                overflow: 'hidden',
                backgroundColor: colors.glassCard,
              },
            ]}
          />
        ),
        tabBarStyle: [
          styles.tabBar,
          colors.glassShadow,
          {
            borderColor: colors.glassBorder,
          },
        ],
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '600',
          marginBottom: 4,
        },
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Transactions" component={TransactionsScreen} />
      <Tab.Screen name="Accounts" component={AccountsScreen} />
      <Tab.Screen name="Categories" component={CategoriesScreen} />
      <Tab.Screen 
        name="More" 
        component={MoreStackNavigator} 
        options={{ headerShown: false }} 
      />
    </Tab.Navigator>
  );
}

const styles = StyleSheet.create({
  tabBar: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 24 : 16,
    left: 16,
    right: 16,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.2,
    paddingBottom: 4,
    paddingTop: 6,
    elevation: 8,
    backgroundColor: 'transparent',
  },
  iconWrapper: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  focusedIconWrapper: {
    transform: [{ scale: 1.08 }],
  },
});
