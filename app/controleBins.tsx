import React, { useState, useEffect, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  Alert,
  Switch,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "./utils/ThemeContext";
import * as Notifications from "expo-notifications";
import * as Progress from "react-native-progress";
import Toast from "react-native-toast-message";
import { Platform } from "react-native";

interface Bin {
  id: string;
  numero: string;
  tempoLimpeza: number;
  inicioLimpeza: number;
  limpezaTotal: boolean;
  notificado: boolean;
}

export default function ControleBins() {
  const { isDarkMode } = useTheme();
  const [bins, setBins] = useState<Bin[]>([]);
  const [novoBinNumero, setNovoBinNumero] = useState("");
  const [tempoLimpeza, setTempoLimpeza] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [limpezaTotal, setLimpezaTotal] = useState(false);
  const [, updateState] = useState({});
  const forceUpdate = useCallback(() => updateState({}), []);

  useEffect(() => {
    carregarBins();
    configurarNotificacoes();
  }, []);

  useEffect(() => {
    salvarBins();
  }, [bins]);

  useEffect(() => {
    const timer = setInterval(() => {
      bins.forEach((bin) => {
        const tempoRestante = bin.inicioLimpeza + bin.tempoLimpeza - Date.now();
        if (tempoRestante <= 0 && !bin.notificado) {
          Toast.show({
            type: "success",
            text1: "Bin Limpo",
            text2: `O Bin ${bin.numero} está limpo e disponível`,
          });
          bin.notificado = true;
        }
      });
      forceUpdate();
    }, 1000);
    return () => clearInterval(timer);
  }, [bins]);

  const configurarNotificacoes = async () => {
    const { status } = await Notifications.getPermissionsAsync();
    if (status !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Aviso", "As notificações não foram permitidas.");
        return;
      }
    }

    await Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: false,
      }),
    });
  };

  const carregarBins = async () => {
    try {
      const binsArmazenados = await AsyncStorage.getItem("bins");
      if (binsArmazenados) {
        setBins(JSON.parse(binsArmazenados));
      }
    } catch (error) {
      console.error("Erro ao carregar bins:", error);
    }
  };

  const salvarBins = async () => {
    try {
      await AsyncStorage.setItem("bins", JSON.stringify(bins));
    } catch (error) {
      console.error("Erro ao salvar bins:", error);
    }
  };

  const adicionarBin = () => {
    if (novoBinNumero.length !== 8 || !/^\d+$/.test(novoBinNumero)) {
      Alert.alert(
        "Erro",
        "O número do bin deve conter exatamente 8 dígitos numéricos."
      );
      return;
    }

    let tempoEmMinutos = limpezaTotal ? 72 * 60 : parseInt(tempoLimpeza);
    if (!limpezaTotal && (isNaN(tempoEmMinutos) || tempoEmMinutos <= 0)) {
      Alert.alert(
        "Erro",
        "Por favor, insira um tempo de limpeza válido em minutos."
      );
      return;
    }

    const binExistente = bins.find((bin) => bin.numero === novoBinNumero);
    if (binExistente) {
      Alert.alert(
        "Erro",
        "Já existe um bin com este número. Por favor, escolha outro número."
      );
      return;
    }

    const novoBin: Bin = {
      id: Date.now().toString(),
      numero: novoBinNumero,
      tempoLimpeza: tempoEmMinutos * 60 * 1000,
      inicioLimpeza: Date.now(),
      limpezaTotal: limpezaTotal,
      notificado: false,
    };

    setBins([...bins, novoBin]);
    setNovoBinNumero("");
    setTempoLimpeza("");
    setLimpezaTotal(false);
    setIsAdding(false);

    agendarNotificacao(novoBin);
    Toast.show({
      type: "success",
      text1: "Bin adicionado",
      text2: `O Bin ${novoBin.numero} foi adicionado com sucesso.`,
    });
  };

  const agendarNotificacao = async (bin: Bin) => {
    try {
      const identificador = await Notifications.scheduleNotificationAsync({
        content: {
          title: "Limpeza de Bin Concluída",
          body: `O bin ${bin.numero} está limpo e disponível.`,
        },
        trigger: {
          seconds: bin.tempoLimpeza / 1000,
        },
      });

      console.log("Notificação agendada:", identificador);
    } catch (error) {
      console.error("Erro ao agendar notificação:", error);
    }
  };

  const removerBin = (id: string) => {
    Alert.alert(
      "Confirmar remoção",
      "Tem certeza que deseja remover este bin?",
      [
        {
          text: "Cancelar",
          style: "cancel",
        },
        {
          text: "Remover",
          onPress: () => {
            setBins(bins.filter((bin) => bin.id !== id));
            Toast.show({
              type: "info",
              text1: "Bin removido",
              text2: "O bin foi removido com sucesso.",
            });
          },
        },
      ]
    );
  };

  const formatarTempoRestante = (tempoRestante: number) => {
    const horas = Math.floor(tempoRestante / 3600000);
    const minutos = Math.floor((tempoRestante % 3600000) / 60000);
    if (horas > 0) {
      return `${horas}h ${minutos}min restantes`;
    }
    return `${minutos} min restantes`;
  };

  const renderBinItem = ({ item }: { item: Bin }) => {
    const tempoRestante = Math.max(
      0,
      item.inicioLimpeza + item.tempoLimpeza - Date.now()
    );
    const estaLimpo = tempoRestante <= 0;
    const progresso = estaLimpo
      ? 100
      : ((item.tempoLimpeza - tempoRestante) / item.tempoLimpeza) * 100;

    return (
      <View style={[styles.binItem, isDarkMode && styles.darkBinItem]}>
        <Progress.Circle
          size={100}
          progress={progresso / 100}
          showsText
          formatText={() => `${Math.round(progresso)}%`}
          color={isDarkMode ? "#63B3ED" : "#4299E1"}
        />
        <View style={styles.binInfo}>
          <Text style={[styles.binNumero, isDarkMode && styles.darkText]}>
            Bin {item.numero}
          </Text>
          <Text style={[styles.binStatus, isDarkMode && styles.darkText]}>
            {estaLimpo
              ? "Limpo e Disponível"
              : formatarTempoRestante(tempoRestante)}
          </Text>
          {item.limpezaTotal && (
            <Text
              style={[
                styles.limpezaTotalTag,
                isDarkMode && styles.darkLimpezaTotalTag,
              ]}
            >
              Limpeza Total
            </Text>
          )}
        </View>
        <TouchableOpacity
          onPress={() => removerBin(item.id)}
          style={styles.removerBinButton}
        >
          <Ionicons
            name="close-circle-outline"
            size={24}
            color={isDarkMode ? "#FF6B6B" : "#E53E3E"}
          />
        </TouchableOpacity>
      </View>
    );
  };

  const binsSorted = bins.sort((a, b) => {
    const tempoRestanteA = Math.max(
      0,
      a.inicioLimpeza + a.tempoLimpeza - Date.now()
    );
    const tempoRestanteB = Math.max(
      0,
      b.inicioLimpeza + b.tempoLimpeza - Date.now()
    );
    return tempoRestanteB - tempoRestanteA;
  });

  return (
    <View style={[styles.container, isDarkMode && styles.darkContainer]}>
      <Text style={[styles.title, isDarkMode && styles.darkText]}>
        Controle de Bins
      </Text>
      {!isAdding ? (
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => setIsAdding(true)}
        >
          <Ionicons name="add-circle-outline" size={24} color="white" />
          <Text style={styles.addButtonText}>Adicionar Novo Bin</Text>
        </TouchableOpacity>
      ) : (
        <View style={[styles.addForm, isDarkMode && styles.darkAddForm]}>
          <TextInput
            style={[styles.input, isDarkMode && styles.darkInput]}
            placeholder="Número do Bin (8 dígitos)"
            placeholderTextColor={isDarkMode ? "#A0AEC0" : "#718096"}
            value={novoBinNumero}
            onChangeText={setNovoBinNumero}
            keyboardType="numeric"
            maxLength={8}
          />
          {!limpezaTotal && (
            <TextInput
              style={[styles.input, isDarkMode && styles.darkInput]}
              placeholder="Tempo de limpeza (minutos)"
              placeholderTextColor={isDarkMode ? "#A0AEC0" : "#718096"}
              value={tempoLimpeza}
              onChangeText={setTempoLimpeza}
              keyboardType="numeric"
            />
          )}
          <View style={styles.switchContainer}>
            <Text
              style={[styles.switchLabel, isDarkMode && styles.darkSwitchLabel]}
            >
              Limpeza Total (72 min)
            </Text>
            <Switch
              value={limpezaTotal}
              onValueChange={setLimpezaTotal}
              trackColor={{ false: "#CBD5E0", true: "#4299E1" }}
              thumbColor={limpezaTotal ? "#2B6CB0" : "#A0AEC0"}
            />
          </View>
          <View style={styles.addFormButtons}>
            <TouchableOpacity
              style={[
                styles.button,
                styles.cancelButton,
                isDarkMode && styles.darkCancelButton,
              ]}
              onPress={() => setIsAdding(false)}
            >
              <Text style={styles.buttonText}>Cancelar</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.button,
                styles.confirmButton,
                isDarkMode && styles.darkConfirmButton,
              ]}
              onPress={adicionarBin}
            >
              <Text style={styles.buttonText}>Confirmar</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
      <FlatList
        data={binsSorted}
        renderItem={renderBinItem}
        keyExtractor={(item) => item.id}
        style={styles.binList}
      />
      <Toast />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: "#f5f5f5",
  },
  darkContainer: {
    backgroundColor: "#1a1a1a",
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginBottom: 16,
    color: "#333",
  },
  darkText: {
    color: "#f0f0f0",
  },
  addButton: {
    backgroundColor: "#4299E1",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
  },
  addForm: {
    backgroundColor: "#fff",
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  darkAddForm: {
    backgroundColor: "#2a2a2a",
    borderColor: "#4a4a4a",
    borderWidth: 1,
  },
  input: {
    backgroundColor: "#f7fafc",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    color: "#333",
  },
  darkInput: {
    backgroundColor: "#3a3a3a",
    borderColor: "#4a4a4a",
    color: "#f0f0f0",
  },
  addFormButtons: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 16,
  },
  button: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: "center",
  },
  cancelButton: {
    backgroundColor: "#FC8181",
    marginRight: 8,
  },
  darkCancelButton: {
    backgroundColor: "#C53030",
  },
  confirmButton: {
    backgroundColor: "#68D391",
    marginLeft: 8,
  },
  darkConfirmButton: {
    backgroundColor: "#2F855A",
  },
  buttonText: {
    color: "white",
    fontWeight: "bold",
  },
  binList: {
    flex: 1,
  },
  binItem: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: "row",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  darkBinItem: {
    backgroundColor: "#2a2a2a",
  },
  binInfo: {
    flex: 1,
    marginLeft: 12,
  },
  binNumero: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 4,
  },
  binStatus: {
    fontSize: 14,
  },
  removerBinButton: {
    padding: 4,
  },
  switchContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
    marginTop: 8,
  },
  switchLabel: {
    fontSize: 16,
    color: "#4A5568",
  },
  darkSwitchLabel: {
    color: "#A0AEC0",
  },
  limpezaTotalTag: {
    fontSize: 12,
    color: "#4299E1",
    fontWeight: "bold",
    marginTop: 4,
  },
  darkLimpezaTotalTag: {
    color: "#63B3ED",
  },
});
