import React from "react";
import { Tabs } from "expo-router";
import { useTheme } from "../src/contexts/ThemeContext";
import {
  HomeIcon,
  BinsIcon,
  SearchIcon,
  SettingsIcon,
} from "../components/MenuIcons";
import { Providers } from "../src/providers";

function TabsLayout() {
  const { isDarkMode } = useTheme();

  return (
    <Tabs
      screenOptions={{
        tabBarStyle: {
          backgroundColor: isDarkMode ? "#1a1a1a" : "#ffffff",
          borderTopColor: isDarkMode ? "#333333" : "#e0e0e0",
        },
        tabBarActiveTintColor: isDarkMode ? "#63B3ED" : "#4299E1",
        tabBarInactiveTintColor: isDarkMode ? "#A0AEC0" : "#718096",
        headerStyle: {
          backgroundColor: isDarkMode ? "#1a1a1a" : "#ffffff",
        },
        headerTintColor: isDarkMode ? "#f0f0f0" : "#333333",
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Início",
          tabBarLabel: "Início",
          tabBarIcon: ({ color, size, focused }) => (
            <HomeIcon size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="controleBins"
        options={{
          title: "Bins",
          tabBarLabel: "Bins",
          tabBarIcon: ({ color, size, focused }) => (
            <BinsIcon size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="buscarExcipiente"
        options={{
          title: "Buscar",
          tabBarLabel: "Buscar",
          tabBarIcon: ({ color, size, focused }) => (
            <SearchIcon size={size} color={color} focused={focused} />
          ),
        }}
      />
      <Tabs.Screen
        name="ajustes"
        options={{
          title: "Ajustes",
          tabBarLabel: "Ajustes",
          tabBarIcon: ({ color, size, focused }) => (
            <SettingsIcon size={size} color={color} focused={focused} />
          ),
        }}
      />
    </Tabs>
  );
}

export default function Layout() {
  return (
    <Providers>
      <TabsLayout />
    </Providers>
  );
}
