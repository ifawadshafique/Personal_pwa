import React, { useState } from 'react';
import { Platform } from 'react-native';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { StatusBar } from 'expo-status-bar';
import { MaterialCommunityIcons } from '@expo/vector-icons';

import { BudgetProvider } from './src/context/BudgetContext';
import Login     from './src/screens/Login';
import Home      from './src/screens/Home';
import Analytics from './src/screens/Analytics';
import Settings  from './src/screens/Settings';

const Tab = createBottomTabNavigator();

const MyTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    background: '#0F2426',
    card: '#1B3735',
    text: '#ffffff',
    border: '#0F2426',
    primary: '#24D28D',
  },
};

// MaterialCommunityIcons — visually distinct icons
const TAB_ICONS = {
  Home:      { active: 'home',      inactive: 'home-outline'  },
  Analytics: { active: 'chart-pie', inactive: 'chart-pie'     },
  Settings:  { active: 'cog',       inactive: 'cog-outline'   },
};

export default function App() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // ── Show Login screen until authenticated ──
  if (!isAuthenticated) {
    return (
      <>
        <StatusBar style="light" backgroundColor="#0F2426" />
        <Login onLogin={() => setIsAuthenticated(true)} />
      </>
    );
  }

  // ── Main app after login ──
  return (
    <BudgetProvider>
      <NavigationContainer theme={MyTheme}>
        <StatusBar style="light" backgroundColor="#0F2426" />
        <Tab.Navigator
          screenOptions={({ route }) => ({
            headerStyle: {
              backgroundColor: '#1B3735',
              elevation: 0,
              shadowOpacity: 0,
            },
            headerTintColor: '#ffffff',
            headerTitleAlign: 'center',

            // Web needs explicit row layout; mobile uses defaults
            tabBarStyle: Platform.OS === 'web'
              ? {
                  backgroundColor: '#1B3735',
                  borderTopWidth: 0,
                  flexDirection: 'row',
                  height: 60,
                  paddingBottom: 8,
                }
              : {
                  backgroundColor: '#1B3735',
                  borderTopWidth: 0,
                },
            tabBarItemStyle: Platform.OS === 'web'
              ? { flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }
              : {},

            tabBarActiveTintColor: '#24D28D',
            tabBarInactiveTintColor: '#8ea1a3',

            tabBarIcon: ({ focused, color }) => {
              const icons = TAB_ICONS[route.name];
              const iconName = focused ? icons.active : icons.inactive;
              return <MaterialCommunityIcons name={iconName} size={26} color={color} />;
            },
          })}
        >
          <Tab.Screen name="Home"      component={Home}      options={{ title: 'Meri Budget' }} />
          <Tab.Screen name="Analytics" component={Analytics} options={{ title: 'Analytics'   }} />
          <Tab.Screen name="Settings"  component={Settings}  options={{ title: 'Settings'    }} />
        </Tab.Navigator>
      </NavigationContainer>
    </BudgetProvider>
  );
}
