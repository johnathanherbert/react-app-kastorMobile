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
  op: string;
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
                op: ordem.op ?? '-'
              });
            }
          );
        }
      }

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
                      aplicandoOP === ordens.indexOf(ordem) && { marginBottom: 160 },
                    ]}
                  >
                    {ordem.op && (
                      <View style={[styles.opBadgeContainer, isDarkMode && styles.darkOpBadgeContainer]}>
                        <Text style={styles.opBadgeText}>OP: {ordem.op}</Text>
                      </View>
                    )}
                    
                    <View style={styles.ordemContentContainer}>
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
                        {ordem.bins && ordem.bins.length > 0 && (
                          <View style={[styles.binsContainer, isDarkMode && styles.darkBinsContainer]}>
                            {ordem.bins.map((bin, binIndex) => (
                              <Text 
                                key={binIndex}
                                style={[styles.binText, isDarkMode && styles.darkBinText]}
                              >
                                Bin {binIndex + 1}: {bin.numero} - {bin.tara} kg
                              </Text>
                            ))}
                          </View>
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
                        <View style={[styles.opInputContainer, isDarkMode && styles.darkOpInputContainer]}>
                          <View style={[styles.inputsContainer, isDarkMode && styles.darkInputsContainer]}>
                            <View style={styles.opInputRow}>
                              <TextInput
                                style={[styles.opInputField, isDarkMode && styles.darkOpInputField]}
                                value={opInput}
                                onChangeText={handleOPInputChange}
                                placeholder="OP"
                                placeholderTextColor={isDarkMode ? "#A0AEC0" : "#718096"}
                                keyboardType="numeric"
                                maxLength={7}
                              />
                            </View>
                            
                            <View style={styles.binsContainer}>
                              {bins.map((bin, index) => (
                                <View key={index} style={styles.binInputRow}>
                                  <TextInput
                                    style={[styles.binInputField, isDarkMode && styles.darkBinInputField]}
                                    value={bin.numero}
                                    onChangeText={(text) => handleBinInputChange(index, text)}
                                    placeholder={`Bin ${index + 1}`}
                                    placeholderTextColor={isDarkMode ? "#A0AEC0" : "#718096"}
                                    keyboardType="numeric"
                                  />
                                  <TextInput
                                    style={[styles.binInputField, isDarkMode && styles.darkBinInputField]}
                                    value={bin.tara}
                                    onChangeText={(text) => handleTaraInputChange(index, text)}
                                    placeholder="Tara"
                                    placeholderTextColor={isDarkMode ? "#A0AEC0" : "#718096"}
                                    keyboardType="numeric"
                                  />
                                  <TouchableOpacity
                                    onPress={() => handleRemoveBin(index)}
                                    style={styles.removeBinButton}
                                  >
                                    <Ionicons
                                      name="close-circle-outline"
                                      size={20}
                                      color={isDarkMode ? "#FF6B6B" : "#E53E3E"}
                                    />
                                  </TouchableOpacity>
                                </View>
                              ))}
                            </View>
                          </View>
                          
                          <View style={styles.opButtonsContainer}>
                            <TouchableOpacity
                              style={[styles.opActionButton, isDarkMode && styles.darkOpActionButton]}
                              onPress={handleAddBin}
                            >
                              <Text style={styles.confirmOPButtonText}>+ Bin</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.opActionButton, isDarkMode && styles.darkOpActionButton]}
                              onPress={() => handleConfirmarOP(ordens.indexOf(ordem))}
                            >
                              <Text style={styles.confirmOPButtonText}>Confirmar</Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}
                    </View>
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
                  {ordem.op && (
                    <View style={[styles.opBadgePesadaContainer, isDarkMode && styles.darkOpBadgePesadaContainer]}>
                      <Text style={styles.opBadgePesadaText}>OP: {ordem.op}</Text>
                      <Ionicons
                        name="checkmark-circle"
                        size={20}
                        color="#38A169"
                        style={styles.checkIcon}
                      />
                    </View>
                  )}
                  
                  <View style={styles.ordemContentContainer}>
                    <TouchableOpacity
                      onPress={() => handleTogglePesado(ordens.indexOf(ordem))}
                      style={styles.checkboxButton}
                    >
                      <Ionicons
                        name="checkbox-outline"
                        size={24}
                        color={isDarkMode ? "#68D391" : "#38A169"}
                      />
                    </TouchableOpacity>
                    <View style={styles.ordemButton}>
                      <Text style={[styles.ordemTextPesada, isDarkMode && styles.darkOrdemTextPesada]}>
                        {ordem.codigo} - {ordem.nome}
                      </Text>
                      {ordem.bins && ordem.bins.length > 0 && (
                        <View style={[styles.binsPesadaContainer, isDarkMode && styles.darkBinsPesadaContainer]}>
                          {ordem.bins.map((bin, binIndex) => (
                            <Text key={binIndex} style={styles.binPesadaText}>
                              Bin {binIndex + 1}: {bin.numero} - {bin.tara} kg
                            </Text>
                          ))}
                        </View>
                      )}
                    </View>
                  </View>
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
                      <View style={[styles.ordensDetails, isDarkMode && styles.darkOrdensDetails]}>
                        <View style={styles.ordensDetailHeader}>
                          <Text
                            style={[
                              styles.ordensDetailHeaderText,
                              styles.codigoColumn,
                              isDarkMode && styles.darkText,
                            ]}
                          >
                            OP
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
                              isDarkMode && index % 2 === 0 && styles.darkOrdemDetailEven,
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
                              {ordem.op || '-'}
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
    borderRadius: 8,
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
    borderRadius: 8,
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
    borderRadius: 12,
    marginBottom: 12,
    overflow: 'visible',
    borderWidth: 1,
    borderColor: '#E2E8F0',
    maxWidth: '100%',
    position: 'relative',
  },
  darkOrdemItem: {
    backgroundColor: "#2a2a2a",
    borderColor: '#4A5568',
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
  opContainer: {
    backgroundColor: '#EBF8FF',
    borderRadius: 6,
    padding: 8,
    marginTop: 6,
    borderLeftWidth: 3,
    borderLeftColor: '#4299E1',
  },
  darkOpContainer: {
    backgroundColor: '#2D3748',
  },
  opText: {
    fontSize: 14,
    color: '#4A5568',
    fontWeight: '500',
  },
  darkOpText: {
    color: '#A0AEC0',
  },
  opInputContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: 'white',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: 16,
    marginTop: 8,
    zIndex: 9999,
    elevation: 9999,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  darkOpInputContainer: {
    backgroundColor: '#2D3748',
    borderColor: '#4A5568',
    shadowOpacity: 0.3,
  },
  inputsContainer: {
    marginBottom: 8,
  },
  darkInputsContainer: {
    backgroundColor: '#2D3748',
  },
  opInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  opInputField: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    color: '#333',
  },
  darkOpInputField: {
    backgroundColor: '#1A202C',
    borderColor: '#4A5568',
    color: '#f0f0f0',
  },
  binsContainer: {
    marginTop: 8,
  },
  binInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  binInputField: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    borderRadius: 8,
    paddingHorizontal: 12,
    backgroundColor: 'white',
    color: '#333',
  },
  darkBinInputField: {
    backgroundColor: '#1A202C',
    borderColor: '#4A5568',
    color: '#f0f0f0',
  },
  opButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 16,
    gap: 8,
  },
  opActionButton: {
    flex: 1,
    height: 40,
    backgroundColor: '#4299E1',
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  darkOpActionButton: {
    backgroundColor: '#2b6cb0',
  },
  ordemContentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
  },
  opBadgeContainer: {
    backgroundColor: '#EBF8FF',
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
    padding: 8,
    alignItems: 'flex-start',
    paddingLeft: 16,
  },
  darkOpBadgeContainer: {
    backgroundColor: '#2D3748',
    borderBottomColor: '#4A5568',
  },
  opBadgeText: {
    color: '#4299E1',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 1,
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
    justifyContent: "space-between",
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
    backgroundColor: '#F0FFF4',
    borderColor: '#9AE6B4',
    opacity: 0.9,
  },
  darkOrdemPesada: {
    backgroundColor: '#1C4532',
    borderColor: '#2F855A',
  },
  opBadgePesadaContainer: {
    backgroundColor: '#C6F6D5',
    borderBottomWidth: 1,
    borderBottomColor: '#9AE6B4',
    padding: 8,
    paddingLeft: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingRight: 16,
  },
  darkOpBadgePesadaContainer: {
    backgroundColor: '#276749',
    borderBottomColor: '#2F855A',
  },
  opBadgePesadaText: {
    color: '#2F855A',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 1,
  },
  checkIcon: {
    marginLeft: 8,
  },
  ordemTextPesada: {
    color: '#2F855A',
    fontSize: 15,
    fontWeight: '500',
    textDecorationLine: 'none',
  },
  darkOrdemTextPesada: {
    color: '#9AE6B4',
  },
  binsPesadaContainer: {
    marginTop: 4,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#9AE6B4',
  },
  darkBinsPesadaContainer: {
    borderTopColor: '#2F855A',
  },
  binPesadaText: {
    fontSize: 13,
    color: '#38A169',
    marginTop: 2,
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
  ordensPesadasHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  opButton: {
    backgroundColor: "#48BB78",
    borderRadius: 8,
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
  },
  opNumber: {
    color: '#4299E1',
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  darkBinsContainer: {
    borderTopColor: '#4A5568',
  },
  binText: {
    fontSize: 13,
    color: '#718096',
    marginTop: 2,
  },
  darkBinText: {
    color: '#A0AEC0',
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
    marginLeft: 16,
  },
  darkConfirmOPButton: {
    backgroundColor: '#2b6cb0',
  },
  removeBinButton: {
    padding: 4,
    width: 28,
    height: 28,
    alignItems: 'center',
    justifyContent: 'center',
  },
  confirmOPButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  ordensDetailHeaderText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#4A5568',
  },
});
