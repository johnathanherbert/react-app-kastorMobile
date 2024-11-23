import React from "react";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "../src/contexts/ThemeContext";
import { Colors } from "../constants/Colors";

interface IconProps {
  size?: number;
  color?: string;
  focused?: boolean;
}

const useIconColor = (focused: boolean, customColor?: string) => {
  const { isDarkMode } = useTheme();
  if (customColor) return customColor;

  if (focused) {
    return isDarkMode ? Colors.dark.iconActive : Colors.light.iconActive;
  } else {
    return isDarkMode ? Colors.dark.iconPrimary : Colors.light.iconPrimary;
  }
};

export const HomeIcon: React.FC<IconProps> = ({
  size = 24,
  color,
  focused = false,
}) => {
  const iconColor = useIconColor(focused, color);
  return <Ionicons name="home-outline" size={size} color={iconColor} />;
};

export const BinsIcon: React.FC<IconProps> = ({
  size = 24,
  color,
  focused = false,
}) => {
  const iconColor = useIconColor(focused, color);
  return <Ionicons name="cube-outline" size={size} color={iconColor} />;
};

export const SearchIcon: React.FC<IconProps> = ({
  size = 24,
  color,
  focused = false,
}) => {
  const iconColor = useIconColor(focused, color);
  return <Ionicons name="search-outline" size={size} color={iconColor} />;
};

export const SettingsIcon: React.FC<IconProps> = ({
  size = 24,
  color,
  focused = false,
}) => {
  const iconColor = useIconColor(focused, color);
  return <Ionicons name="settings-outline" size={size} color={iconColor} />;
};
