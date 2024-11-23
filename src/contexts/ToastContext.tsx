import React, { createContext, useContext, useState, ReactNode } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./ThemeContext";
import { StatusBar } from "expo-status-bar";

interface ToastContextType {
  showToast: (message: string, type?: "success" | "error" | "info") => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error("useToast deve ser usado dentro de um ToastProvider");
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
  } | null>(null);
  const [slideAnim] = useState(new Animated.Value(-100));
  const { isDarkMode } = useTheme();

  const showToast = (
    message: string,
    type: "success" | "error" | "info" = "info"
  ) => {
    setToast({ message, type });
    Animated.sequence([
      Animated.spring(slideAnim, {
        toValue: 0,
        useNativeDriver: true,
      }),
      Animated.delay(3000),
      Animated.spring(slideAnim, {
        toValue: -100,
        useNativeDriver: true,
      }),
    ]).start(() => setToast(null));
  };

  const handleDismiss = () => {
    Animated.timing(slideAnim, {
      toValue: -100,
      duration: 200,
      useNativeDriver: true,
    }).start(() => setToast(null));
  };

  const getToastIcon = () => {
    switch (toast?.type) {
      case "success":
        return "checkmark-circle-outline";
      case "error":
        return "alert-circle-outline";
      default:
        return "information-circle-outline";
    }
  };

  const getToastColor = () => {
    switch (toast?.type) {
      case "success":
        return isDarkMode ? "#4CAF50" : "#4CAF50";
      case "error":
        return isDarkMode ? "#F44336" : "#F44336";
      default:
        return isDarkMode ? "#2196F3" : "#2196F3";
    }
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <StatusBar style={isDarkMode ? "light" : "dark"} />
      {toast && (
        <Animated.View
          style={[
            styles.toastContainer,
            isDarkMode && styles.darkToastContainer,
            { transform: [{ translateY: slideAnim }] },
          ]}
        >
          <View
            style={[styles.toastContent, { borderLeftColor: getToastColor() }]}
          >
            <Ionicons name={getToastIcon()} size={24} color={getToastColor()} />
            <Text
              style={[styles.toastText, isDarkMode && styles.darkToastText]}
            >
              {toast.message}
            </Text>
            <TouchableOpacity onPress={handleDismiss}>
              <Ionicons
                name="close"
                size={24}
                color={isDarkMode ? "#FFFFFF" : "#000000"}
              />
            </TouchableOpacity>
          </View>
        </Animated.View>
      )}
    </ToastContext.Provider>
  );
};

const styles = StyleSheet.create({
  toastContainer: {
    position: "absolute",
    top: 40,
    left: 20,
    right: 20,
    alignItems: "center",
    zIndex: 9999,
  },
  darkToastContainer: {
    // Estilos específicos para o modo escuro, se necessário
  },
  toastContent: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.9)",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
    borderLeftWidth: 4,
  },
  toastText: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: "#000000",
  },
  darkToastText: {
    color: "#FFFFFF",
  },
});
