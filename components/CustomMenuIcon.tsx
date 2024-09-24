import React from "react";
import { View, StyleSheet, TouchableOpacity } from "react-native";
import { useTheme } from "../app/utils/ThemeContext";

interface CustomMenuIconProps {
  onPress: () => void;
}

const CustomMenuIcon: React.FC<CustomMenuIconProps> = ({ onPress }) => {
  const { isDarkMode } = useTheme();

  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <View
        style={[styles.line, styles.topLine, isDarkMode && styles.darkLine]}
      />
      <View
        style={[styles.line, styles.middleLine, isDarkMode && styles.darkLine]}
      />
      <View
        style={[styles.line, styles.bottomLine, isDarkMode && styles.darkLine]}
      />
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    width: 20,
    height: 14,
    marginLeft: 10,
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  line: {
    height: 2,
    backgroundColor: "#333",
    borderRadius: 1,
  },
  darkLine: {
    backgroundColor: "#f0f0f0",
  },
  topLine: {
    width: "100%",
  },
  middleLine: {
    width: "80%",
  },
  bottomLine: {
    width: "100%",
  },
});

export default CustomMenuIcon;
