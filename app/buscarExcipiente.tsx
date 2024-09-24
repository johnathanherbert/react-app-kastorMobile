import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Alert,
  ActivityIndicator,
} from "react-native";
import { supabase } from "../utils/supabase";
import { useTheme } from "./utils/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

interface ResultadoBusca {
  codigo_receita: number;
  ativo: string;
  excipiente: string;
  quantidade: number;
  unidade: string;
}

export default function BuscarExcipiente() {
  const { isDarkMode } = useTheme();
  const [excipienteBusca, setExcipienteBusca] = useState("");
  const [resultadoBusca, setResultadoBusca] = useState<ResultadoBusca[]>([]);
  const [filtroAtivo, setFiltroAtivo] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const buscarExcipiente = async () => {
    if (!excipienteBusca) {
      Alert.alert("Erro", "Por favor, insira um código de excipiente.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("DataBase_nmed")
        .select(
          "Codigo_Receita, Ativo, Excipiente, qtd_materia_prima, un_materia_prima"
        )
        .eq("codigo_materia_prima", excipienteBusca);

      if (error) throw error;

      if (data && data.length > 0) {
        const resultados = data.map((item) => ({
          codigo_receita: item.Codigo_Receita,
          ativo: item.Ativo,
          excipiente: item.Excipiente,
          quantidade: item.qtd_materia_prima,
          unidade: item.un_materia_prima,
        }));
        setResultadoBusca(resultados);
        setFiltroAtivo("");
      } else {
        setResultadoBusca([]);
        Alert.alert("Aviso", "Nenhum ativo encontrado com este excipiente.");
      }
    } catch (error) {
      console.error("Erro ao buscar excipiente:", error);
      Alert.alert("Erro", "Ocorreu um erro ao buscar o excipiente.");
    } finally {
      setIsLoading(false);
    }
  };

  const resultadosFiltrados = filtroAtivo
    ? resultadoBusca.filter((item) =>
        item.ativo.toLowerCase().includes(filtroAtivo.toLowerCase())
      )
    : resultadoBusca;

  const renderItem = ({ item }: { item: ResultadoBusca }) => (
    <View
      style={[styles.resultadoItem, isDarkMode && styles.darkResultadoItem]}
    >
      <Text
        style={[
          styles.resultadoText,
          isDarkMode && styles.darkText,
          styles.codigoText,
        ]}
      >
        {item.codigo_receita.toString().padStart(4, "0")}
      </Text>
      <Text
        style={[
          styles.resultadoText,
          isDarkMode && styles.darkText,
          styles.ativoText,
        ]}
      >
        {item.ativo}
      </Text>
      <Text
        style={[
          styles.resultadoText,
          isDarkMode && styles.darkText,
          styles.excipienteText,
        ]}
      >
        {item.excipiente}
      </Text>
      <Text
        style={[
          styles.resultadoText,
          isDarkMode && styles.darkText,
          styles.quantidadeText,
        ]}
      >
        {item.quantidade} {item.unidade}
      </Text>
    </View>
  );

  return (
    <SafeAreaView
      style={[styles.container, isDarkMode && styles.darkContainer]}
    >
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons
            name="search-outline"
            size={24}
            color={isDarkMode ? "#f0f0f0" : "#333"}
          />
          <Text style={[styles.title, isDarkMode && styles.darkText]}>
            Buscar Excipiente
          </Text>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, isDarkMode && styles.darkInput]}
            placeholder="Código do excipiente"
            placeholderTextColor={isDarkMode ? "#A0AEC0" : "#718096"}
            value={excipienteBusca}
            onChangeText={setExcipienteBusca}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[
              styles.searchButton,
              isLoading && styles.searchButtonDisabled,
            ]}
            onPress={buscarExcipiente}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Ionicons name="search" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        </View>
        {resultadoBusca.length > 0 && (
          <View style={styles.filtroContainer}>
            <TextInput
              style={[styles.filtroInput, isDarkMode && styles.darkInput]}
              placeholder="Filtrar por ativo"
              placeholderTextColor={isDarkMode ? "#A0AEC0" : "#718096"}
              value={filtroAtivo}
              onChangeText={setFiltroAtivo}
            />
          </View>
        )}
        <FlatList
          data={resultadosFiltrados}
          renderItem={renderItem}
          keyExtractor={(item, index) => `${item.codigo_receita}-${index}`}
          ListHeaderComponent={
            resultadosFiltrados.length > 0 ? (
              <View
                style={[styles.listHeader, isDarkMode && styles.darkListHeader]}
              >
                <Text
                  style={[
                    styles.headerText,
                    isDarkMode && styles.darkHeaderText,
                    styles.codigoText,
                  ]}
                >
                  Código
                </Text>
                <Text
                  style={[
                    styles.headerText,
                    isDarkMode && styles.darkHeaderText,
                    styles.ativoText,
                  ]}
                >
                  Ativo
                </Text>
                <Text
                  style={[
                    styles.headerText,
                    isDarkMode && styles.darkHeaderText,
                    styles.excipienteText,
                  ]}
                >
                  Excipiente
                </Text>
                <Text
                  style={[
                    styles.headerText,
                    isDarkMode && styles.darkHeaderText,
                    styles.quantidadeText,
                  ]}
                >
                  Qtd.
                </Text>
              </View>
            ) : null
          }
          ListEmptyComponent={
            !isLoading ? (
              <Text style={[styles.emptyText, isDarkMode && styles.darkText]}>
                Nenhum resultado encontrado
              </Text>
            ) : null
          }
        />
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  darkContainer: {
    backgroundColor: "#1a1a1a",
  },
  content: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 12,
    color: "#333",
  },
  darkText: {
    color: "#f0f0f0",
  },
  inputContainer: {
    flexDirection: "row",
    marginBottom: 24,
    paddingHorizontal: 8,
  },
  input: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 12,
  },
  darkInput: {
    backgroundColor: "#2a2a2a",
    borderColor: "#4a4a4a",
    color: "#f0f0f0",
  },
  searchButton: {
    backgroundColor: "#4299E1",
    width: 48,
    height: 48,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  searchButtonDisabled: {
    backgroundColor: "#A0AEC0",
  },
  filtroContainer: {
    marginBottom: 16,
    paddingHorizontal: 8,
  },
  filtroInput: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  listHeader: {
    flexDirection: "row",
    backgroundColor: "#EDF2F7",
    padding: 12,
    borderRadius: 8,
    marginBottom: 12,
    marginHorizontal: 8,
  },
  darkListHeader: {
    backgroundColor: "#2D3748",
  },
  headerText: {
    fontWeight: "bold",
    color: "#4A5568",
    fontSize: 14,
  },
  darkHeaderText: {
    color: "#A0AEC0",
  },
  resultadoItem: {
    flexDirection: "row",
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    marginHorizontal: 8,
    elevation: 2,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
  },
  darkResultadoItem: {
    backgroundColor: "#2a2a2a",
  },
  resultadoText: {
    fontSize: 12,
    color: "#4A5568",
  },
  codigoText: {
    flex: 0.8,
    fontWeight: "bold",
    marginRight: 4,
  },
  ativoText: {
    flex: 1.5,
    fontStyle: "italic",
    marginRight: 4,
  },
  excipienteText: {
    flex: 1.5,
    marginRight: 4,
  },
  quantidadeText: {
    flex: 0.8,
    textAlign: "right",
  },
  emptyText: {
    textAlign: "center",
    marginTop: 24,
    fontSize: 16,
    color: "#718096",
    paddingHorizontal: 8,
  },
});
