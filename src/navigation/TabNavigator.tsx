import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
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
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
        contentStyle: { backgroundColor: colors.background }
      }}
    >
      <Stack.Screen 
        name="MoreHome" 
        component={MoreScreen} 
        options={{ title: 'More Options' }}
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
        tabBarIcon: ({ color, size }) => {
          let iconName = 'question-circle';
          if (route.name === 'Dashboard') iconName = 'chart-pie';
          else if (route.name === 'Transactions') iconName = 'file-invoice-dollar';
          else if (route.name === 'Accounts') iconName = 'university';
          else if (route.name === 'Categories') iconName = 'tags';
          else if (route.name === 'More') iconName = 'ellipsis-h';

          return <FinanceIcon name={iconName} size={size - 2} color={color} />;
        },
        tabBarActiveTintColor: colors.tabBarActive,
        tabBarInactiveTintColor: colors.tabBarInactive,
        tabBarStyle: {
          backgroundColor: colors.tabBarBackground,
          borderTopWidth: 1,
          borderTopColor: colors.border,
          paddingBottom: 6,
          paddingTop: 6,
          height: 60,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
        },
        headerStyle: { backgroundColor: colors.card },
        headerTintColor: colors.text,
        headerTitleStyle: { fontWeight: '700' },
        headerShadowVisible: false,
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
