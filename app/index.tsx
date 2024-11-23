import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  SafeAreaView,
  Alert,
  ActivityIndicator,
  Switch,
  Clipboard,
} from "react-native";
import { supabase } from "../utils/supabase";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { useTheme } from "../src/contexts/ThemeContext";

interface Ordem {
  codigo: string;
  nome: string;
  op?: string;
  tara?: string;
  pesado: boolean;
  bins?: { numero: string; tara: string }[];
}

interface OrdemExcipiente {
  codigo: string;
  quantidade: number;
  nome: string;
}

interface Excipiente {
  total: number;
  ordens: OrdemExcipiente[];
}

interface Excipientes {
  [key: string]: Excipiente;
}

const EXCIPIENTES_ESPECIAIS = [
  "LACTOSE (200)",
  "LACTOSE (50/70)",
  "AMIDO DE MILHO PREGELATINIZADO",
  "CELULOSE MIC (TIPO200)",
  "CELULOSE MIC.(TIPO102)",
  "FOSF.CAL.DIB.(COMPDIRETA)",
  "AMIDO",
  "CELULOSE+LACTOSE",
];

const getExcipientNameStyle = (excipient: string, isDarkMode: boolean) => {
  if (EXCIPIENTES_ESPECIAIS.includes(excipient)) {
    return isDarkMode
      ? styles.excipientNameSpecialDark
      : styles.excipientNameSpecial;
  }
  return isDarkMode
    ? styles.excipientNameNormalDark
    : styles.excipientNameNormal;
};

export default function Index() {
  const { isDarkMode } = useTheme();
  const [ordens, setOrdens] = useState<Ordem[]>([]);
  const [ativo, setAtivo] = useState<string>("");
  const [excipientes, setExcipientes] = useState<Excipientes>({});
  const [expandedExcipient, setExpandedExcipient] = useState<string | null>(
    null
  );
  const [filtroOrdem, setFiltroOrdem] = useState<string | null>(null);
  const [aplicandoOP, setAplicandoOP] = useState<number | null>(null);
  const [opInput, setOPInput] = useState<string>("");
  const [taraInput, setTaraInput] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [exibirAutomaticos, setExibirAutomaticos] = useState<boolean>(false);
  const [bins, setBins] = useState<{ numero: string; tara: string }[]>([]);
  const [showOpInput, setShowOpInput] = useState(false);
  const [baseOP, setBaseOP] = useState("");
  const [incrementalOP, setIncrementalOP] = useState("");
  const ordensPesadas = ordens.filter((ordem) => ordem.pesado);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    saveData();
  }, [ordens, excipientes, filtroOrdem]);

  const loadData = async () => {
    try {
      const savedOrdens = await AsyncStorage.getItem("ordens");
      const savedExcipientes = await AsyncStorage.getItem("excipientes");
      const savedFiltroOrdem = await AsyncStorage.getItem("filtroOrdem");

      if (savedOrdens) setOrdens(JSON.parse(savedOrdens));
      if (savedExcipientes) setExcipientes(JSON.parse(savedExcipientes));
      if (savedFiltroOrdem) setFiltroOrdem(JSON.parse(savedFiltroOrdem));
    } catch (error) {
      console.error("Erro ao carregar dados:", error);
    }
  };

  const saveData = async () => {
    try {
      await AsyncStorage.setItem("ordens", JSON.stringify(ordens));
      await AsyncStorage.setItem("excipientes", JSON.stringify(excipientes));
      await AsyncStorage.setItem("filtroOrdem", JSON.stringify(filtroOrdem));
    } catch (error) {
      console.error("Erro ao salvar dados:", error);
    }
  };

  const handleAddOrdem = async () => {
    if (isLoading) return;
    setIsLoading(true);
    
    try {
      const { data, error } = await supabase
        .from("DataBase_ems")
        .select("*")
        .eq("Codigo_Receita", ativo);

      if (error) {
        Alert.alert("Erro", error.message);
      } else if (data && data.length > 0) {
        // Determinar a próxima OP
        let nextOP = "";
        if (showOpInput && baseOP) {
          nextOP = incrementalOP || baseOP;
          // Incrementar para a próxima ordem
          setIncrementalOP((parseInt(nextOP) + 1).toString().padStart(7, "0"));
        }

        const newOrdens: Ordem[] = [
          ...ordens,
          { 
            codigo: ativo, 
            nome: data[0].Ativo, 
            pesado: false,
            op: nextOP || undefined // Adiciona a OP apenas se estiver usando o modo Auto OP
          },
        ];
        
        setOrdens(newOrdens);
        calcularExcipientes(newOrdens);
      } else {
        Alert.alert("Erro", "Receita não encontrada");
      }
    } catch (error) {
      console.error("Erro ao adicionar ordem:", error);
      Alert.alert("Erro", "Ocorreu um erro ao adicionar a ordem");
    } finally {
      setIsLoading(false);
    }
  };

  const handleRemoveOrdem = (index: number) => {
    const newOrdens = [...ordens];
    newOrdens.splice(index, 1);
    setOrdens(newOrdens);
    calcularExcipientes(newOrdens);
  };

  const handleAplicarOP = (index: number) => {
    if (aplicandoOP === index) {
      setAplicandoOP(null);
      setOPInput("");
      setTaraInput("");
      setBins([]);
    } else {
      setAplicandoOP(index);
      setOPInput(ordens[index].op || "");
      setTaraInput(ordens[index].tara || "");
      setBins(ordens[index].bins || []);
    }
  };

  const handleOPInputChange = (text: string) => {
    // Limita o input a 7 caracteres e apenas números
    const limitedText = text.replace(/[^0-9]/g, "").slice(0, 7);
    setOPInput(limitedText);
  };

  const handleTaraInputChange = (index: number, text: string) => {
    const sanitizedText = text.replace(",", ".");
    const regex = /^\d*\.?\d{0,3}$/;
    if (regex.test(sanitizedText) || sanitizedText === "") {
      const newBins = [...bins];
      newBins[index].tara = sanitizedText;
      setBins(newBins);
    }
  };

  const handleBinInputChange = (index: number, text: string) => {
    const newBins = [...bins];
    newBins[index].numero = text;
    setBins(newBins);
  };

  const handleAddBin = () => {
    if (bins.length < 2) {
      setBins([...bins, { numero: "", tara: "" }]);
    } else {
      Alert.alert("Erro", "Você pode adicionar no máximo 2 bins por ordem.");
    }
  };

  const handleRemoveBin = (index: number) => {
    const newBins = [...bins];
    newBins.splice(index, 1);
    setBins(newBins);
  };

  const handleConfirmarOP = (index: number) => {
    if (opInput.length !== 7) {
      Alert.alert("Erro", "A OP deve conter exatamente 7 dígitos numéricos.");
      return;
    }

    const newOrdens = [...ordens];
    newOrdens[index] = {
      ...newOrdens[index],
      op: opInput,
      bins: bins.map((bin) => ({ numero: bin.numero, tara: bin.tara })),
    };
    setOrdens(newOrdens);
    setAplicandoOP(null);
    setOPInput("");
    setBins([]);
  };

  const handleTogglePesado = (index: number) => {
    const newOrdens = [...ordens];
    newOrdens[index] = {
      ...newOrdens[index],
      pesado: !newOrdens[index].pesado,
    };
    setOrdens(newOrdens);
    calcularExcipientes(newOrdens);
  };

  const calcularExcipientes = async (ordens: Ordem[]) => {
    setIsLoading(true);
    try {
      // Filtrar ordens não pesadas
      const ordensNaoPesadas = ordens.filter((ordem) => !ordem.pesado);

      if (ordensNaoPesadas.length === 0) {
        setExcipientes({});
        return;
      }

      let newExcipientes: Excipientes = {};

      for (let ordem of ordensNaoPesadas) {
        const { data, error } = await supabase
          .from("DataBase_ems")
          .select("Excipiente, qtd_materia_prima")
          .eq("Codigo_Receita", ordem.codigo);

        if (error) {
          console.error("Erro ao buscar excipientes:", error);
          continue;
        }

        if (data) {
          data.forEach(
            (item: { Excipiente: string; qtd_materia_prima: number }) => {
              if (!newExcipientes[item.Excipiente]) {
                newExcipientes[item.Excipiente] = { total: 0, ordens: [] };
              }
              newExcipientes[item.Excipiente].total += item.qtd_materia_prima;
              newExcipientes[item.Excipiente].ordens.push({
                codigo: ordem.codigo,
                quantidade: item.qtd_materia_prima,
                nome: ordem.nome,
              });
            }
          );
        }
      }

      // Arredonda o total para 3 casas decimais
      for (let excipient in newExcipientes) {
        newExcipientes[excipient].total = Number(
          newExcipientes[excipient].total.toFixed(3)
        );
      }

      setExcipientes(newExcipientes);
      saveData();
    } catch (error) {
      console.error("Erro ao calcular excipientes:", error);
      Alert.alert("Erro", "Ocorreu um erro ao calcular os excipientes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleExpandExcipient = (excipient: string) => {
    setExpandedExcipient(expandedExcipient === excipient ? null : excipient);
  };

  const handleFiltroOrdem = (codigo: string) => {
    if (filtroOrdem === codigo) {
      setFiltroOrdem(null);
    } else {
      setFiltroOrdem(codigo);
    }
  };

  const handleToggleAutomaticos = () => {
    setExibirAutomaticos(!exibirAutomaticos);
  };

  const excipientesFiltrados = filtroOrdem
    ? Object.fromEntries(
        Object.entries(excipientes)
          .filter(([_, { ordens }]) =>
            ordens.some((ordem) => ordem.codigo === filtroOrdem)
          )
          .map(([excipient, { ordens }]) => {
            const ordemFiltrada = ordens.find(
              (ordem) => ordem.codigo === filtroOrdem
            );
            return [
              excipient,
              {
                total: ordemFiltrada ? ordemFiltrada.quantidade : 0,
                ordens: [ordemFiltrada!],
              },
            ];
          })
      )
    : excipientes;

  // Filtra excipientes automáticos se o switch estiver ativado
  const excipientesFiltradosFinal = exibirAutomaticos
    ? Object.fromEntries(
        Object.entries(excipientesFiltrados).filter(
          ([excipient]) =>
            excipient.includes("Automática") || // Ajuste para incluir excipientes automáticos
            getExcipientNameStyle(excipient, isDarkMode) ===
              styles.excipientNameSpecial || // Verifica se o estilo é de excipiente especial
            getExcipientNameStyle(excipient, isDarkMode) ===
              styles.excipientNameSpecialDark // Verifica se o estilo é de excipiente especial em modo escuro
        )
      )
    : excipientesFiltrados;

  const handleCopyExcipientes = () => {
    let excipientesText = "Materiais:\n\n";

    Object.entries(excipientesFiltradosFinal).forEach(
      ([excipient, { total, ordens }]) => {
        excipientesText += `${excipient}:  ${total.toFixed(3)} kg\n`;

        if (expandedExcipient === excipient) {
          excipientesText += "Detalhes:\n";
          ordens.forEach((ordem) => {
            excipientesText += `  ${ordem.codigo} - ${
              ordem.nome
            }: ${ordem.quantidade.toFixed(3)} kg\n`;
          });
          excipientesText += "\n";
        }
      }
    );

    Clipboard.setString(excipientesText);
    Alert.alert(
      "Sucesso",
      "Tabela de excipientes copiada para a área de transferência."
    );
  };

  return (
    <SafeAreaView
      style={[styles.container, isDarkMode && styles.darkContainer]}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <Ionicons
              name="scale-outline"
              size={24}
              color={isDarkMode ? "#f0f0f0" : "#333"}
            />
            <Text style={[styles.headerText, isDarkMode && styles.darkText]}>
              Pesagem
            </Text>
          </View>
          <Text style={[styles.byText, isDarkMode && styles.darkByText]}>
            by Johnathan Herbert
          </Text>
        </View>

        <View style={styles.inputContainer}>
          <TextInput
            style={[styles.input, isDarkMode && styles.darkInput]}
            placeholder="Digite o código da receita"
            placeholderTextColor={isDarkMode ? "#A0AEC0" : "#718096"}
            value={ativo}
            onChangeText={setAtivo}
            keyboardType="numeric"
          />
          <TouchableOpacity
            style={[styles.addButton, isLoading && styles.addButtonLoading]}
            onPress={handleAddOrdem}
            disabled={isLoading}
          >
            <Text style={styles.addButtonText}>
              {isLoading ? "..." : "Adicionar"}
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.opButton, showOpInput && styles.opButtonActive]}
            onPress={() => setShowOpInput(!showOpInput)}
          >
            <Text style={styles.addButtonText}>Auto OP</Text>
          </TouchableOpacity>
        </View>

        {showOpInput && (
          <View style={styles.opInputWrapper}>
            <TextInput
              style={[styles.input, isDarkMode && styles.darkInput]}
              placeholder="OP inicial (7 dígitos)"
              placeholderTextColor={isDarkMode ? "#A0AEC0" : "#718096"}
              value={baseOP}
              onChangeText={(text) => {
                const limitedText = text.replace(/[^0-9]/g, "").slice(0, 7);
                setBaseOP(limitedText);
                if (limitedText.length === 7) {
                  setIncrementalOP(limitedText);
                }
              }}
              keyboardType="numeric"
              maxLength={7}
            />
          </View>
        )}

        {ordens.length > 0 && (
          <>
            <View style={styles.ordensContainer}>
              <Text
                style={[styles.sectionTitle, isDarkMode && styles.darkText]}
              >
                Ordens Adicionadas
              </Text>
              {ordens
                .filter((ordem) => !ordem.pesado)
                .map((ordem, index) => (
                  <View
                    key={ordens.indexOf(ordem)}
                    style={[
                      styles.ordemItem,
                      isDarkMode && styles.darkOrdemItem,
                      filtroOrdem === ordem.codigo && styles.ordemItemFiltrada,
                      isDarkMode &&
                        filtroOrdem === ordem.codigo &&
                        styles.darkOrdemItemFiltrada,
                    ]}
                  >
                    <TouchableOpacity
                      onPress={() => handleTogglePesado(ordens.indexOf(ordem))}
                      style={styles.checkboxButton}
                    >
                      <Ionicons
                        name="square-outline"
                        size={24}
                        color={isDarkMode ? "#81b0ff" : "#4299E1"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.ordemButton}
                      onPress={() => handleFiltroOrdem(ordem.codigo)}
                    >
                      <Text
                        style={[
                          styles.ordemText,
                          isDarkMode && styles.darkText,
                          ordem.pesado && styles.ordemTextPesada,
                        ]}
                      >
                        {ordem.codigo} - {ordem.nome}
                      </Text>
                      {ordem.op && (
                        <Text
                          style={[
                            styles.opText,
                            isDarkMode && styles.darkOpText,
                            ordem.pesado && styles.ordemTextPesada,
                          ]}
                        >
                          OP: {ordem.op}{" "}
                          {ordem.bins && ordem.bins.length > 0 && (
                            <>
                              {ordem.bins.map((bin, binIndex) => (
                                <Text key={binIndex}>
                                  Bin {binIndex + 1}: {bin.numero} - {bin.tara}{" "}
                                  kg
                                </Text>
                              ))}
                            </>
                          )}
                        </Text>
                      )}
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleAplicarOP(ordens.indexOf(ordem))}
                      style={styles.actionButton}
                    >
                      <Ionicons
                        name={
                          ordem.op ? "create-outline" : "add-circle-outline"
                        }
                        size={24}
                        color={isDarkMode ? "#81b0ff" : "#4299E1"}
                      />
                    </TouchableOpacity>
                    <TouchableOpacity
                      onPress={() => handleRemoveOrdem(ordens.indexOf(ordem))}
                      style={styles.actionButton}
                    >
                      <Ionicons
                        name="close-circle-outline"
                        size={24}
                        color={isDarkMode ? "#FF6B6B" : "#E53E3E"}
                      />
                    </TouchableOpacity>
                    {filtroOrdem === ordem.codigo && (
                      <View style={styles.filtroIndicator}>
                        <Text style={styles.filtroIndicatorText}>Filtrado</Text>
                      </View>
                    )}
                    {aplicandoOP === ordens.indexOf(ordem) && (
                      <View style={styles.opInputContainer}>
                        <View style={styles.opInputRow}>
                          <TextInput
                            style={[styles.opInputField, isDarkMode && styles.darkInput]}
                            value={opInput}
                            onChangeText={handleOPInputChange}
                            placeholder="Ordem de produção..."
                            placeholderTextColor={isDarkMode ? "#A0AEC0" : "#718096"}
                            keyboardType="numeric"
                            maxLength={7}
                          />
                        </View>
                        
                        {bins.map((bin, index) => (
                          <View key={index} style={styles.binInputRow}>
                            <TextInput
                              style={[styles.binInputField, isDarkMode && styles.darkInput]}
                              value={bin.numero}
                              onChangeText={(text) => handleBinInputChange(index, text)}
                              placeholder={`Número do bin ${index + 1}`}
                              placeholderTextColor={isDarkMode ? "#A0AEC0" : "#718096"}
                              keyboardType="numeric"
                            />
                            <TextInput
                              style={[styles.binInputField, isDarkMode && styles.darkInput]}
                              value={bin.tara}
                              onChangeText={(text) => handleTaraInputChange(index, text)}
                              placeholder={`Tara (kg)`}
                              placeholderTextColor={isDarkMode ? "#A0AEC0" : "#718096"}
                              keyboardType="numeric"
                            />
                            <TouchableOpacity
                              onPress={() => handleRemoveBin(index)}
                              style={styles.removeBinButton}
                            >
                              <Ionicons
                                name="close-circle-outline"
                                size={24}
                                color={isDarkMode ? "#FF6B6B" : "#E53E3E"}
                              />
                            </TouchableOpacity>
                          </View>
                        ))}
                        
                        <View style={styles.opButtonsContainer}>
                          <TouchableOpacity
                            style={[styles.opActionButton, isDarkMode && styles.darkConfirmOPButton]}
                            onPress={handleAddBin}
                          >
                            <Text style={styles.confirmOPButtonText}>Adicionar Bin</Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.opActionButton, isDarkMode && styles.darkConfirmOPButton]}
                            onPress={() => handleConfirmarOP(ordens.indexOf(ordem))}
                          >
                            <Text style={styles.confirmOPButtonText}>Confirmar</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}
                  </View>
                ))}
            </View>

            <View style={styles.ordensContainer}>
              <View style={styles.ordensPesadasHeader}>
                <Text
                  style={[styles.sectionTitle, isDarkMode && styles.darkText]}
                >
                  Ordens Pesadas
                </Text>
                <Text
                  style={[
                    styles.ordensPesadasHeader,
                    isDarkMode ? styles.darkByText : styles.byText,
                  ]}
                >
                  {ordensPesadas.length} OPs pesadas
                </Text>
              </View>
              {ordensPesadas.map((ordem, index) => (
                <View
                  key={ordens.indexOf(ordem)}
                  style={[
                    styles.ordemItem,
                    styles.ordemPesada,
                    isDarkMode && styles.darkOrdemPesada,
                  ]}
                >
                  <TouchableOpacity
                    onPress={() => handleTogglePesado(ordens.indexOf(ordem))}
                    style={styles.checkboxButton}
                  >
                    <Ionicons
                      name="checkbox-outline"
                      size={24}
                      color={isDarkMode ? "#81b0ff" : "#4299E1"}
                    />
                  </TouchableOpacity>
                  <View style={styles.ordemButton}>
                    <Text style={[styles.ordemText, styles.ordemTextPesada]}>
                      {ordem.codigo} - {ordem.nome}
                    </Text>
                    {ordem.op && (
                      <Text style={[styles.opText, styles.ordemTextPesada]}>
                        OP: {ordem.op}{" "}
                        {ordem.bins && ordem.bins.length > 0 && (
                          <>
                            {ordem.bins.map((bin, binIndex) => (
                              <Text key={binIndex}>
                                Bin {binIndex + 1}: {bin.numero} - {bin.tara} kg
                              </Text>
                            ))}
                          </>
                        )}
                      </Text>
                    )}
                  </View>
                  <TouchableOpacity
                    onPress={() => handleRemoveOrdem(ordens.indexOf(ordem))}
                    style={styles.actionButton}
                  >
                    <Ionicons
                      name="close-circle-outline"
                      size={24}
                      color={isDarkMode ? "#FF6B6B" : "#E53E3E"}
                    />
                  </TouchableOpacity>
                </View>
              ))}
            </View>

            <View style={styles.excipientesContainer}>
              <View style={styles.excipientesHeader}>
                <View style={styles.excipientesHeaderTop}>
                  <Text
                    style={[styles.sectionTitle, isDarkMode && styles.darkText]}
                  >
                    Somatória de Excipientes
                    {filtroOrdem && (
                      <Text style={styles.filtroText}> (Filtrado)</Text>
                    )}
                  </Text>
                </View>
                <View style={styles.legendaContainer}>
                  <View style={styles.legendaItem}>
                    <View
                      style={[
                        styles.legendaColor,
                        { backgroundColor: "#4299E1" },
                      ]}
                    />
                    <Text
                      style={[
                        styles.legendaText,
                        isDarkMode && styles.darkText,
                      ]}
                    >
                      Manual
                    </Text>
                  </View>
                  <View style={styles.legendaItem}>
                    <View
                      style={[
                        styles.legendaColor,
                        { backgroundColor: "#FF6B6B" },
                      ]}
                    />
                    <Text
                      style={[
                        styles.legendaText,
                        isDarkMode && styles.darkText,
                      ]}
                    >
                      Automática
                    </Text>
                    <Switch
                      value={exibirAutomaticos}
                      onValueChange={handleToggleAutomaticos}
                      trackColor={{ false: "#4299E1", true: "#FF6B6B" }} // Azul se manual, vermelho se ativado
                      thumbColor={isDarkMode ? "#f0f0f0" : "#fff"} // Cor do botão do switch
                      style={styles.switch}
                    />
                  </View>
                </View>
              </View>
              {Object.entries(excipientesFiltradosFinal).map(
                ([excipient, { total, ordens }]) => (
                  <TouchableOpacity
                    key={excipient}
                    style={[
                      styles.excipientItem,
                      isDarkMode && styles.darkExcipientItem,
                    ]}
                    onPress={() => handleToggleExpandExcipient(excipient)}
                  >
                    <View style={styles.excipientHeader}>
                      <Text
                        style={[
                          styles.excipientName,
                          getExcipientNameStyle(excipient, isDarkMode),
                        ]}
                      >
                        {excipient}
                      </Text>
                      <Text
                        style={[
                          styles.excipientTotal,
                          isDarkMode && styles.darkText,
                        ]}
                      >
                        {total.toFixed(3)} kg
                      </Text>
                    </View>
                    {expandedExcipient === excipient && (
                      <View
                        style={[
                          styles.ordensDetails,
                          isDarkMode && styles.darkOrdensDetails,
                        ]}
                      >
                        <View style={styles.ordensDetailHeader}>
                          <Text
                            style={[
                              styles.ordensDetailHeaderText,
                              styles.codigoColumn,
                              isDarkMode && styles.darkText,
                            ]}
                          >
                            Código
                          </Text>
                          <Text
                            style={[
                              styles.ordensDetailHeaderText,
                              styles.ativoColumn,
                              isDarkMode && styles.darkText,
                            ]}
                          >
                            Ativo
                          </Text>
                          <Text
                            style={[
                              styles.ordensDetailHeaderText,
                              styles.quantidadeColumn,
                              isDarkMode && styles.darkText,
                            ]}
                          >
                            Quantidade
                          </Text>
                        </View>
                        {ordens.map((ordem, index) => (
                          <View
                            key={index}
                            style={[
                              styles.ordemDetail,
                              isDarkMode && styles.darkOrdemDetail,
                              index % 2 === 0 && styles.ordemDetailEven,
                              isDarkMode &&
                                index % 2 === 0 &&
                                styles.darkOrdemDetailEven,
                            ]}
                          >
                            <Text
                              style={[
                                styles.ordemDetailText,
                                styles.codigoColumn,
                                isDarkMode && styles.darkText,
                              ]}
                              numberOfLines={1}
                            >
                              {ordem.codigo}
                            </Text>
                            <Text
                              style={[
                                styles.ordemDetailText,
                                styles.ativoColumn,
                                isDarkMode && styles.darkText,
                              ]}
                              numberOfLines={1}
                            >
                              {ordem.nome}
                            </Text>
                            <Text
                              style={[
                                styles.ordemDetailText,
                                styles.quantidadeColumn,
                                styles.blueText,
                                isDarkMode && styles.darkBlueText,
                              ]}
                            >
                              {ordem.quantidade.toFixed(3)} kg
                            </Text>
                          </View>
                        ))}
                      </View>
                    )}
                  </TouchableOpacity>
                )
              )}
              <TouchableOpacity
                style={[styles.copyButton, isDarkMode && styles.darkCopyButton]}
                onPress={handleCopyExcipientes}
              >
                <Ionicons
                  name="copy-outline"
                  size={24}
                  color={isDarkMode ? "#f0f0f0" : "#333"}
                />
                <Text
                  style={[
                    styles.copyButtonText,
                    isDarkMode && styles.darkCopyButtonText,
                  ]}
                >
                  Copiar Tabela de Excipientes
                </Text>
              </TouchableOpacity>
            </View>
          </>
        )}
      </ScrollView>
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
  scrollContent: {
    padding: 16,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
  },
  headerText: {
    fontSize: 24,
    fontWeight: "bold",
    marginLeft: 10,
    color: "#333",
  },
  byText: {
    fontSize: 12,
    color: "#718096",
    fontStyle: "italic",
  },
  darkByText: {
    color: "#A0AEC0",
  },
  inputContainer: {
    flexDirection: "row",
    marginBottom: 20,
    alignItems: "center",
  },
  input: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    padding: 10,
    height: 40,
    marginRight: 8,
  },
  darkInput: {
    backgroundColor: "#2a2a2a",
    borderColor: "#4a4a4a",
    color: "#f0f0f0",
  },
  addButton: {
    backgroundColor: "#4299E1",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    paddingHorizontal: 12,
  },
  addButtonLoading: {
    backgroundColor: "#2b6cb0",
  },
  addButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 12,
    color: "#333",
  },
  darkText: {
    color: "#f0f0f0",
  },
  ordensContainer: {
    marginBottom: 16,
  },
  ordemItem: {
    backgroundColor: "white",
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    flexWrap: "wrap",
    borderWidth: 1,
    borderColor: "transparent",
    position: "relative",
  },
  darkOrdemItem: {
    backgroundColor: "#2a2a2a",
  },
  actionButton: {
    padding: 4,
    marginLeft: 4,
  },
  ordemButton: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
  },
  ordemText: {
    fontSize: 14,
    color: "#4A5568",
  },
  opText: {
    fontSize: 12,
    color: "#718096",
    marginTop: 4,
  },
  darkOpText: {
    color: "#A0AEC0",
  },
  opInputContainer: {
    width: "100%",
    paddingHorizontal: 8,
    paddingTop: 12,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  opInputRow: {
    marginBottom: 12,
  },
  opInputField: {
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    padding: 10,
    height: 40,
  },
  binInputRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 8,
  },
  binInputField: {
    flex: 1,
    backgroundColor: "white",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    borderRadius: 4,
    padding: 10,
    height: 40,
  },
  removeBinButton: {
    padding: 8,
  },
  opButtonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 12,
    gap: 8,
  },
  opActionButton: {
    flex: 1,
    backgroundColor: "#4299E1",
    padding: 12,
    borderRadius: 4,
    alignItems: "center",
  },
  confirmOPButton: {
    backgroundColor: "#4299E1",
    padding: 8,
    borderRadius: 4,
    alignItems: "center",
  },
  darkConfirmOPButton: {
    backgroundColor: "#2b6cb0",
  },
  confirmOPButtonText: {
    color: "white",
    fontWeight: "bold",
  },
  excipientesContainer: {
    marginTop: 20,
  },
  excipientItem: {
    backgroundColor: "white",
    borderRadius: 8,
    marginBottom: 6,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  darkExcipientItem: {
    backgroundColor: "#2a2a2a",
  },
  excipientHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 10,
  },
  excipientName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  excipientNameNormal: {
    color: "#4299E1",
  },
  excipientNameNormalDark: {
    color: "#63B3ED",
  },
  excipientNameSpecial: {
    color: "#E53E3E",
  },
  excipientNameSpecialDark: {
    color: "#FC8181",
  },
  excipientTotal: {
    fontSize: 14,
    color: "#4A5568",
  },
  ordensDetails: {
    backgroundColor: "#F7FAFC",
    padding: 10,
    borderTopWidth: 1,
    borderTopColor: "#E2E8F0",
  },
  darkOrdensDetails: {
    backgroundColor: "#2D3748",
    borderTopColor: "#4A5568",
  },
  ordensDetailHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  darkOrdensDetailHeader: {
    borderBottomColor: "#4A5568",
  },
  ordensDetailHeaderText: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#4A5568",
  },
  ordemDetail: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: "#E2E8F0",
  },
  darkOrdemDetail: {
    borderBottomColor: "#4A5568",
  },
  ordemDetailEven: {
    backgroundColor: "#EDF2F7",
  },
  darkOrdemDetailEven: {
    backgroundColor: "#2C3E50",
  },
  ordemDetailText: {
    fontSize: 12,
    color: "#4A5568",
  },
  blueText: {
    color: "#4299E1",
  },
  darkBlueText: {
    color: "#63B3ED",
  },
  legendaContainer: {
    flexDirection: "row",
    justifyContent: "flex-start",
    alignItems: "center",
    marginTop: 5,
    marginBottom: 10,
  },
  legendaItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
    justifyContent: "space-between", // Alinha o switch à direita
  },
  legendaColor: {
    width: 12,
    height: 12,
    borderRadius: 2,
    marginRight: 4,
  },
  legendaText: {
    fontSize: 12,
    color: "#6B7280",
  },
  ordemPesada: {
    backgroundColor: "#E6FFFA",
  },
  darkOrdemPesada: {
    backgroundColor: "#1D4044",
  },
  ordemTextPesada: {
    color: "#2C7A7B",
    textDecorationLine: "line-through",
  },
  ordemItemFiltrada: {
    borderColor: "#4299E1",
    backgroundColor: "#EBF8FF",
  },
  darkOrdemItemFiltrada: {
    borderColor: "#63B3ED",
    backgroundColor: "#2A4365",
  },
  filtroIndicator: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#4299E1",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  filtroIndicatorText: {
    color: "white",
    fontSize: 10,
    fontWeight: "bold",
  },
  checkboxButton: {
    padding: 8,
    marginRight: 8,
  },
  codigoColumn: {
    flex: 2,
    marginRight: 8,
  },
  ativoColumn: {
    flex: 4,
    marginRight: 8,
  },
  quantidadeColumn: {
    flex: 2,
    textAlign: "right",
  },
  excipientesHeader: {
    marginBottom: 10,
  },
  excipientesHeaderTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
  filtroText: {
    fontSize: 14,
    color: "#4299E1",
    fontStyle: "italic",
    marginLeft: 5,
  },
  switch: {
    marginLeft: 16, // Ajuste a margem esquerda para mover o switch mais para a direita
  },
  copyButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4299E1",
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
  },
  darkCopyButton: {
    backgroundColor: "#2b6cb0",
  },
  copyButtonText: {
    color: "white",
    fontWeight: "bold",
    marginLeft: 8,
  },
  darkCopyButtonText: {
    color: "#f0f0f0",
  },
  ordensPesadasHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  opButton: {
    backgroundColor: "#68D391",
    borderRadius: 4,
    alignItems: "center",
    justifyContent: "center",
    height: 40,
    paddingHorizontal: 12,
    marginLeft: 8,
  },
  opButtonActive: {
    backgroundColor: "#48BB78",
  },
  opInputWrapper: {
    marginBottom: 16,
  }
});
