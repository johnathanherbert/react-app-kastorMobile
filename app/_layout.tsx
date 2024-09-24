import { GestureHandlerRootView } from "react-native-gesture-handler";
import { Drawer } from "expo-router/drawer";
import { ThemeProvider, useTheme } from "./utils/ThemeContext";
import { ToastProvider } from "./utils/ToastContext";
import { LoadingProvider } from "./utils/LoadingContext";
import CustomMenuIcon from "../components/CustomMenuIcon";
import {
  HomeIcon,
  BinsIcon,
  SearchIcon,
  SettingsIcon,
} from "../components/MenuIcons";

function DrawerContent() {
  const { isDarkMode } = useTheme();

  return (
    <Drawer
      screenOptions={({ navigation }) => ({
        headerStyle: {
          backgroundColor: isDarkMode ? "#1a1a1a" : "#f5f5f5",
        },
        headerTintColor: isDarkMode ? "#f0f0f0" : "#333",
        drawerStyle: {
          backgroundColor: isDarkMode ? "#1a1a1a" : "#f5f5f5",
        },
        drawerActiveTintColor: "#0077ff",
        drawerInactiveTintColor: isDarkMode ? "#f0f0f0" : "#333",
        headerLeft: () => (
          <CustomMenuIcon onPress={() => navigation.toggleDrawer()} />
        ),
      })}
    >
      {/* Pesagem */}
      <Drawer.Screen
        name="index"
        options={{
          drawerLabel: "Pesagem",
          title: "Pesagem",
          headerShown: true,
          drawerIcon: ({ focused, size }) => (
            <HomeIcon size={size} focused={focused} />
          ),
        }}
      />

      {/* Controle de Bins */}
      <Drawer.Screen
        name="controleBins"
        options={{
          drawerLabel: "Controle de Bins",
          title: "Controle de Bins",
          headerShown: true,
          drawerIcon: ({ focused, size }) => (
            <BinsIcon size={size} focused={focused} />
          ),
        }}
      />

      {/* Buscar Excipiente */}
      <Drawer.Screen
        name="buscarExcipiente"
        options={{
          drawerLabel: "Buscar Excipiente",
          title: "Buscar Excipiente",
          headerShown: true,
          drawerIcon: ({ focused, size }) => (
            <SearchIcon size={size} focused={focused} />
          ),
        }}
      />

      <Drawer.Screen
        name="ajustes"
        options={{
          drawerLabel: "Ajustes",
          title: "Ajustes",
          headerShown: true,
          drawerIcon: ({ focused, size }) => (
            <SettingsIcon size={size} focused={focused} />
          ),
        }}
      />
    </Drawer>
  );
}

export default function Layout() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <ThemeProvider>
        <ToastProvider>
          <LoadingProvider>
            <DrawerContent />
          </LoadingProvider>
        </ToastProvider>
      </ThemeProvider>
    </GestureHandlerRootView>
  );
}
