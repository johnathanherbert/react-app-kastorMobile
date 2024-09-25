import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useTheme } from '../app/utils/ThemeContext';
import Index from '../app/index';
import ControleBins from '../app/controleBins';
import BuscarExcipiente from '../app/buscarExcipiente';
import Ajustes from '../app/ajustes';
import { HomeIcon, BinsIcon, SearchIcon, SettingsIcon } from './MenuIcons';

const Tab = createBottomTabNavigator();

export default function BottomTabNavigator() {
  const { isDarkMode } = useTheme();

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: {
          backgroundColor: isDarkMode ? '#1a1a1a' : '#ffffff',
          borderTopColor: isDarkMode ? '#333333' : '#e0e0e0',
        },
        tabBarActiveTintColor: isDarkMode ? '#63B3ED' : '#4299E1',
        tabBarInactiveTintColor: isDarkMode ? '#A0AEC0' : '#718096',
        headerShown: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={Index}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <HomeIcon size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Bins"
        component={ControleBins}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <BinsIcon size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Buscar"
        component={BuscarExcipiente}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <SearchIcon size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tab.Screen
        name="Ajustes"
        component={Ajustes}
        options={{
          tabBarIcon: ({ color, size, focused }) => (
            <SettingsIcon size={size} color={color} focused={focused} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
