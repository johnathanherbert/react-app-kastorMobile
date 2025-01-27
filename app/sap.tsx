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
import { useTheme } from "../src/contexts/ThemeContext";
import { Ionicons } from "@expo/vector-icons";

interface ResultadoBusca {
  lote: string;
  quantidade: number;
  unidade: string;
  data_validade: string;
}

interface MaterialResumo {
  codigo: string;
  descricao: string;
  quantidadeTotal: number;
  unidade: string;
}

const formatarQuantidade = (quantidade: number) => {
  return `${quantidade.toFixed(3)} KG`;
};

export default function BuscarExcipiente() {
  const { isDarkMode } = useTheme();
  const [excipienteBusca, setExcipienteBusca] = useState("");
  const [resultadoBusca, setResultadoBusca] = useState<ResultadoBusca[]>([]);
  const [materialResumo, setMaterialResumo] = useState<MaterialResumo | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const buscarExcipiente = async () => {
    if (!excipienteBusca) {
      Alert.alert("Erro", "Por favor, insira um código de material.");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("materials_database")
        .select("*")
        .eq("codigo_materia_prima", excipienteBusca);

      if (error) throw error;

      if (data && data.length > 0) {
        // Calcula o resumo do material
        const quantidadeTotal = data.reduce((sum, item) => sum + Number(item.qtd_materia_prima), 0);
        setMaterialResumo({
          codigo: excipienteBusca,
          descricao: data[0].descricao,
          quantidadeTotal,
          unidade: "KG" // Fixado como KG
        });

        // Prepara os dados dos lotes
        const resultados = data.map((item) => ({
          lote: item.lote,
          quantidade: Number(item.qtd_materia_prima), // Garantir que é número
          unidade: "KG", // Fixado como KG
          data_validade: new Date(item.data_validade).toLocaleDateString(),
        }));
        setResultadoBusca(resultados);
      } else {
        setResultadoBusca([]);
        setMaterialResumo(null);
        Alert.alert("Aviso", "Nenhum material encontrado com este código.");
      }
    } catch (error) {
      console.error("Erro ao buscar material:", error);
      Alert.alert("Erro", "Ocorreu um erro ao buscar o material.");
    } finally {
      setIsLoading(false);
    }
  };

  const renderItem = ({ item }: { item: ResultadoBusca }) => (
    <View style={[styles.tableRow, isDarkMode && styles.darkTableRow]}>
      <View style={[styles.tableCell, styles.loteCell]}>
        <Text 
          style={[styles.cellText, isDarkMode && styles.darkText, styles.loteText]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {item.lote}
        </Text>
      </View>
      
      <View style={[styles.tableCell, styles.quantidadeCell]}>
        <Text 
          style={[styles.cellText, isDarkMode && styles.darkText, styles.quantidadeText]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {formatarQuantidade(item.quantidade)}
        </Text>
      </View>

      <View style={[styles.tableCell, styles.validadeCell]}>
        <Text 
          style={[styles.cellText, isDarkMode && styles.darkText, styles.dataText]}
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {item.data_validade}
        </Text>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, isDarkMode && styles.darkContainer]}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Ionicons
            name="search-outline"
            size={24}
            color={isDarkMode ? "#f0f0f0" : "#333"}
          />
          <Text style={[styles.title, isDarkMode && styles.darkText]}>
            Sistema SAP
          </Text>
        </View>
        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, isDarkMode && styles.darkInput]}
            placeholder="Código do material"
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

        {materialResumo && (
          <View style={[styles.resumoContainer, isDarkMode && styles.darkResumoContainer]}>
            <View style={styles.resumoHeader}>
              <Text style={[styles.resumoLabel, isDarkMode && styles.darkText]}>
                Código: 
                <Text style={styles.resumoValue}> {materialResumo.codigo}</Text>
              </Text>
            </View>
            <Text style={[styles.resumoDescricao, isDarkMode && styles.darkText]}>
              {materialResumo.descricao}
            </Text>
            <Text style={[styles.resumoTotal, isDarkMode && styles.darkText]}>
              Quantidade Total: 
              <Text style={styles.resumoTotalValue}>
                {' '}{formatarQuantidade(materialResumo.quantidadeTotal)}
              </Text>
            </Text>
          </View>
        )}

        {resultadoBusca.length > 0 && (
          <FlatList
            data={resultadoBusca}
            renderItem={renderItem}
            keyExtractor={(item, index) => `${item.lote}-${index}`}
            ListHeaderComponent={
              <View style={[styles.tableHeader, isDarkMode && styles.darkTableHeader]}>
                <View style={[styles.tableCell, styles.loteCell]}>
                  <Text style={[styles.headerText, isDarkMode && styles.darkHeaderText]}>Lote</Text>
                </View>
                <View style={[styles.tableCell, styles.quantidadeCell]}>
                  <Text style={[styles.headerText, isDarkMode && styles.darkHeaderText]}>Quantidade</Text>
                </View>
                <View style={[styles.tableCell, styles.validadeCell]}>
                  <Text style={[styles.headerText, isDarkMode && styles.darkHeaderText]}>Validade</Text>
                </View>
              </View>
            }
            contentContainerStyle={styles.tableContainer}
          />
        )}
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
  tableContainer: {
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    marginHorizontal: 8,
    marginBottom: 16,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#F7FAFC',
    borderBottomWidth: 2,
    borderBottomColor: '#E2E8F0',
  },
  darkTableHeader: {
    backgroundColor: '#2D3748',
    borderBottomColor: '#4A5568',
  },
  tableRow: {
    flexDirection: 'row',
    backgroundColor: 'white',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    minHeight: 60,
  },
  darkTableRow: {
    backgroundColor: '#2a2a2a',
    borderBottomColor: '#4A5568',
  },
  tableCell: {
    padding: 8,
    justifyContent: 'center',
  },
  loteCell: {
    flex: 1,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
  },
  quantidadeCell: {
    flex: 0.8,
    borderRightWidth: 1,
    borderRightColor: '#E2E8F0',
    alignItems: 'center',
  },
  validadeCell: {
    flex: 0.8,
    alignItems: 'center',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#4A5568',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  darkHeaderText: {
    color: '#A0AEC0',
  },
  cellText: {
    fontSize: 13,
    color: '#2D3748',
  },
  loteText: {
    fontWeight: '600',
    color: '#4299E1',
    textAlign: 'center',
  },
  quantidadeText: {
    fontWeight: '600',
    color: '#38A169',
    fontSize: 13,
    textAlign: 'center',
  },
  dataText: {
    color: '#E53E3E',
    fontSize: 12,
    textAlign: 'center',
  },
  emptyText: {
    textAlign: "center",
    marginTop: 32,
    fontSize: 16,
    color: "#718096",
    paddingHorizontal: 16,
    fontStyle: 'italic',
  },
  resumoContainer: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  darkResumoContainer: {
    backgroundColor: '#2a2a2a',
    borderColor: '#4A5568',
  },
  resumoHeader: {
    marginBottom: 8,
  },
  resumoLabel: {
    fontSize: 14,
    color: '#718096',
  },
  resumoValue: {
    fontWeight: '600',
    color: '#4299E1',
  },
  resumoDescricao: {
    fontSize: 16,
    fontWeight: '500',
    color: '#2D3748',
    marginBottom: 12,
  },
  resumoTotal: {
    fontSize: 14,
    color: '#718096',
  },
  resumoTotalValue: {
    fontWeight: '600',
    color: '#38A169',
  },
});
