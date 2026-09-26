import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  TextInput,
  ScrollView,
} from "react-native";
import { X, TrendingUp, Sparkles, DollarSign } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useMoneyFormatter } from "../hooks/useMoneyFormatter";
import { COLORS } from "../lib/theme";
import { useApp } from "../services/AppContext";

interface Props {
  visible: boolean;
  onClose: () => void;
  currentSaved?: number;
}

export default function CompoundInterestModal({ visible, onClose, currentSaved }: Props) {
  const { profile } = useApp();
  const fmt = useMoneyFormatter();
  const themeColors = COLORS[profile?.theme || "light"];

  const isHighDenom = ["XOF", "XAF", "JPY", "CLP"].includes(profile?.currency_code || "XOF");
  const defaultInitial = (currentSaved && currentSaved > 0)
    ? String(Math.round(currentSaved))
    : (isHighDenom ? "100000" : "1000");
  const defaultMonthly = isHighDenom ? "25000" : "100";

  const [initialAmount, setInitialAmount] = useState(defaultInitial);
  const [monthlyContribution, setMonthlyContribution] = useState(defaultMonthly);
  const [annualRate, setAnnualRate] = useState(5); // 5%
  const [years, setYears] = useState(10); // 10 years

  const simulation = useMemo(() => {
    const P = parseFloat(initialAmount.replace(/\s+/g, "").replace(",", ".")) || 0;
    const PMT = parseFloat(monthlyContribution.replace(/\s+/g, "").replace(",", ".")) || 0;
    const r = annualRate / 100 / 12; // monthly rate
    const n = years * 12; // total months

    // Future Value formula: FV = P*(1+r)^n + PMT * (((1+r)^n - 1) / r)
    let fv = P * Math.pow(1 + r, n);
    if (r > 0) {
      fv += PMT * ((Math.pow(1 + r, n) - 1) / r);
    } else {
      fv += PMT * n;
    }

    const totalInvested = P + PMT * n;
    const totalInterest = Math.max(0, fv - totalInvested);

    return {
      futureValue: Math.round(fv),
      totalInvested: Math.round(totalInvested),
      totalInterest: Math.round(totalInterest),
    };
  }, [initialAmount, monthlyContribution, annualRate, years]);

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={[styles.container, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <TrendingUp size={22} color={themeColors.secondary} />
              <Text style={[styles.title, { color: themeColors.foreground }]}>
                Intérêts Composés
              </Text>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <X size={20} color={themeColors.mutedForeground} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scroll}>
            <Text style={[styles.subtitle, { color: themeColors.mutedForeground }]}>
              Visualise le pouvoir des intérêts composés si tes économies étaient placées sur un livret ou un investissement.
            </Text>

            {/* Inputs */}
            <View style={styles.inputsGrid}>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.foreground }]}>Capital initial</Text>
                <TextInput
                  style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                  keyboardType="numeric"
                  value={initialAmount}
                  onChangeText={setInitialAmount}
                />
              </View>
              <View style={styles.inputGroup}>
                <Text style={[styles.label, { color: themeColors.foreground }]}>Dépôt par mois</Text>
                <TextInput
                  style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                  keyboardType="numeric"
                  value={monthlyContribution}
                  onChangeText={setMonthlyContribution}
                />
              </View>
            </View>

            {/* Rate presets */}
            <Text style={[styles.label, { color: themeColors.foreground, marginTop: 15 }]}>
              Taux annuel estimé : <Text style={{ color: themeColors.primary, fontWeight: "bold" }}>{annualRate} %</Text>
            </Text>
            <View style={styles.ratePills}>
              {[
                { label: "3 % (Livret)", rate: 3 },
                { label: "5 % (Prudent)", rate: 5 },
                { label: "8 % (Bourse)", rate: 8 },
                { label: "10 % (Dynamique)", rate: 10 },
              ].map((item) => (
                <TouchableOpacity
                  key={item.rate}
                  style={[
                    styles.pill,
                    annualRate === item.rate
                      ? { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
                      : { backgroundColor: themeColors.background, borderColor: themeColors.border },
                  ]}
                  onPress={() => setAnnualRate(item.rate)}
                >
                  <Text style={[styles.pillText, { color: annualRate === item.rate ? "#FFF" : themeColors.foreground }]}>
                    {item.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Duration selector */}
            <Text style={[styles.label, { color: themeColors.foreground, marginTop: 15 }]}>
              Horizon d'épargne : <Text style={{ color: themeColors.primary, fontWeight: "bold" }}>{years} ans</Text>
            </Text>
            <View style={styles.ratePills}>
              {[3, 5, 10, 15, 20].map((y) => (
                <TouchableOpacity
                  key={y}
                  style={[
                    styles.pill,
                    years === y
                      ? { backgroundColor: themeColors.primary, borderColor: themeColors.primary }
                      : { backgroundColor: themeColors.background, borderColor: themeColors.border },
                  ]}
                  onPress={() => setYears(y)}
                >
                  <Text style={[styles.pillText, { color: years === y ? "#FFF" : themeColors.foreground }]}>
                    {y} ans
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Result Hero Card */}
            <LinearGradient
              colors={themeColors.gradientHero}
              style={styles.resultCard}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.resultLabel}>VALEUR TOTALE FUTURE</Text>
              <Text style={styles.resultValue}>{fmt(simulation.futureValue)}</Text>

              <View style={styles.resultSplit}>
                <View>
                  <Text style={styles.splitLabel}>Capital versé</Text>
                  <Text style={styles.splitVal}>{fmt(simulation.totalInvested)}</Text>
                </View>
                <View style={{ alignItems: "flex-end" }}>
                  <Text style={styles.splitLabel}>Gains d'intérêts 🚀</Text>
                  <Text style={[styles.splitVal, { color: "#4ADE80", fontWeight: "bold" }]}>
                    +{fmt(simulation.totalInterest)}
                  </Text>
                </View>
              </View>
            </LinearGradient>

            <Text style={{ fontSize: 11, color: themeColors.mutedForeground, textAlign: "center", marginTop: 12, lineHeight: 16 }}>
              💡 Les intérêts composés signifient que vos intérêts gagnent eux-mêmes des intérêts, accélérant la croissance de votre patrimoine au fil du temps.
            </Text>
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.55)",
    justifyContent: "flex-end",
  },
  container: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    borderWidth: 1,
    maxHeight: "85%",
    paddingBottom: 25,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  title: {
    fontSize: 17,
    fontWeight: "bold",
  },
  closeBtn: {
    padding: 6,
  },
  scroll: {
    padding: 20,
  },
  subtitle: {
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  inputsGrid: {
    flexDirection: "row",
    gap: 12,
  },
  inputGroup: {
    flex: 1,
  },
  label: {
    fontSize: 12,
    fontWeight: "600",
    marginBottom: 6,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
    fontWeight: "600",
  },
  ratePills: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginTop: 6,
  },
  pill: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 12,
    borderWidth: 1,
  },
  pillText: {
    fontSize: 12,
    fontWeight: "600",
  },
  resultCard: {
    borderRadius: 20,
    padding: 20,
    marginTop: 22,
  },
  resultLabel: {
    fontSize: 11,
    fontWeight: "bold",
    color: "rgba(255,255,255,0.8)",
    letterSpacing: 1,
  },
  resultValue: {
    fontSize: 28,
    fontWeight: "900",
    color: "#FFFFFF",
    marginVertical: 6,
  },
  resultSplit: {
    flexDirection: "row",
    justifyContent: "space-between",
    borderTopWidth: 1,
    borderTopColor: "rgba(255,255,255,0.2)",
    paddingTop: 12,
    marginTop: 10,
  },
  splitLabel: {
    fontSize: 10,
    color: "rgba(255,255,255,0.8)",
  },
  splitVal: {
    fontSize: 13,
    fontWeight: "700",
    color: "#FFFFFF",
    marginTop: 2,
  },
});
