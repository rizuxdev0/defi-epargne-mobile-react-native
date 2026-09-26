import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  StatusBar,
  TextInput,
  Switch,
  Alert,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Sparkles, Check, Zap } from "lucide-react-native";
import { useApp } from "../services/AppContext";
import { useMoneyFormatter } from "../hooks/useMoneyFormatter";
import { COLORS } from "../lib/theme";
import { CATEGORIES } from "../lib/categories";
import { generateRandomInstallments, generateRegularInstallments } from "../lib/installments";
import { CHALLENGE_TEMPLATES, ChallengeTemplate } from "../lib/templates";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "expo-haptics";

const EMOJIS = ["🎯", "✈️", "💰", "🏠", "🚗", "📱", "🎓", "💍", "🎁", "🌴", "🏥", "🍔", "🎮", "🚴"];

export default function NewChallengeScreen({ navigation }: any) {
  const { profile, createChallenge } = useApp();
  const fmt = useMoneyFormatter();
  const themeColors = COLORS[profile?.theme || "light"];

  const [step, setStep] = useState(1);

  // Form states
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [category, setCategory] = useState("other");
  const [targetAmount, setTargetAmount] = useState("500000");

  const [useDate, setUseDate] = useState(false);
  const [durationMode, setDurationMode] = useState<"days" | "date">("days");
  const [durationDays, setDurationDays] = useState("180");
  const [endDateStr, setEndDateStr] = useState("");

  const [mode, setMode] = useState<"random" | "regular" | "free">("random");
  const [minInst, setMinInst] = useState("500");
  const [maxInst, setMaxInst] = useState("10000");
  const [regularCount, setRegularCount] = useState("20");
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);

  const parsedTarget = parseFloat(targetAmount) || 0;
  const parsedMin = parseFloat(minInst) || 500;
  const parsedMax = parseFloat(maxInst) || 10000;
  const parsedCount = parseInt(regularCount, 10) || 20;

  const preview = useMemo(() => {
    if (parsedTarget <= 0) return [];
    if (selectedTemplateId) {
      const t = CHALLENGE_TEMPLATES.find((tpl) => tpl.id === selectedTemplateId);
      if (t) return t.generateInstallments(parsedTarget, profile?.currency_code || "XOF");
    }
    if (mode === "random") return generateRandomInstallments(parsedTarget, parsedMin, parsedMax);
    if (mode === "regular") return generateRegularInstallments(parsedTarget, parsedCount);
    return [];
  }, [mode, parsedTarget, parsedMin, parsedMax, parsedCount, selectedTemplateId, profile?.currency_code]);

  const handleSelectTemplate = (t: ChallengeTemplate) => {
    setSelectedTemplateId(t.id);
    const target = t.getTargetAmount(profile?.currency_code || "XOF");
    setName(t.name);
    setEmoji(t.emoji);
    setCategory(t.category);
    setDescription(t.description);
    setTargetAmount(String(target));
    setMode(t.mode);
    setUseDate(true);
    setDurationMode("days");
    setDurationDays(String(t.recommendedDays));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setStep(2); // Directly advance to step 2 with everything pre-configured!
  };

  const handleCreate = async () => {
    if (!name.trim()) {
      return Alert.alert("Erreur", "Veuillez entrer un nom pour votre défi.");
    }
    if (parsedTarget <= 100) {
      return Alert.alert("Erreur", "L'objectif d'épargne doit être supérieur à 100.");
    }

    let endDate: string | null = null;
    if (useDate) {
      if (durationMode === "days") {
        const days = parseInt(durationDays, 10) || 180;
        const d = new Date();
        d.setDate(d.getDate() + days);
        endDate = d.toISOString();
      } else {
        // Parse date from JJ/MM/AAAA format
        const parts = endDateStr.split("/");
        if (parts.length === 3) {
          const day = parseInt(parts[0], 10);
          const month = parseInt(parts[1], 10) - 1;
          const year = parseInt(parts[2], 10);
          const d = new Date(year, month, day);
          if (!isNaN(d.getTime()) && d > new Date()) {
            endDate = d.toISOString();
          } else {
            return Alert.alert("Erreur", "La date de fin doit être dans le futur.");
          }
        } else {
          return Alert.alert("Erreur", "Veuillez saisir la date au format JJ/MM/AAAA.");
        }
      }
    }

    try {
      const challengeData = {
        name: name.trim(),
        emoji,
        target_amount: parsedTarget,
        category,
        description: description.trim() || null,
        start_date: new Date().toISOString(),
        end_date: endDate,
        status: "active" as const,
        mode,
        min_installment: parsedMin,
        max_installment: parsedMax,
      };

      const installmentsData = preview.map((amount, i) => ({
        challenge_id: "", // Will be set by db.createChallenge
        amount,
        position: i,
        is_checked: false,
        checked_at: null,
        user_id: "local-user",
      }));

      const newCh = await createChallenge(challengeData, installmentsData);
      navigation.replace("ChallengeDetail", { id: newCh.id });
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Une erreur est survenue.");
    }
  };

  const nextStep = () => {
    if (step === 1 && !name.trim()) {
      return Alert.alert("Nom requis", "Saisissez un nom pour votre défi.");
    }
    if (step === 1 && parsedTarget <= 100) {
      return Alert.alert("Objectif invalide", "Veuillez saisir un montant d'épargne réaliste.");
    }
    setStep(step + 1);
  };

  const prevStep = () => {
    setStep(step - 1);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => step > 1 ? prevStep() : navigation.goBack()}>
          <ArrowLeft size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.foreground }]}>Nouveau Défi</Text>
        <Text style={[styles.stepIndicator, { color: themeColors.mutedForeground }]}>Étape {step}/3</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Step 1: Info & Objectif */}
        {step === 1 && (
          <View style={styles.stepContainer}>
            {/* Template shortcuts */}
            <View style={{ marginBottom: 22 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Sparkles size={16} color={themeColors.primary} />
                <Text style={{ fontSize: 13, fontWeight: "bold", color: themeColors.foreground }}>
                  Modèles Populaires (1 clic)
                </Text>
              </View>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 10 }}>
                {CHALLENGE_TEMPLATES.map((tpl) => (
                  <TouchableOpacity
                    key={tpl.id}
                    style={[
                      styles.templateCard,
                      { backgroundColor: themeColors.card, borderColor: themeColors.border },
                    ]}
                    onPress={() => handleSelectTemplate(tpl)}
                  >
                    <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
                      <Text style={{ fontSize: 24 }}>{tpl.emoji}</Text>
                      <View style={[styles.templateBadge, { backgroundColor: `${themeColors.primary}15` }]}>
                        <Text style={[styles.templateBadgeText, { color: themeColors.primary }]}>{tpl.badge}</Text>
                      </View>
                    </View>
                    <Text style={[styles.templateName, { color: themeColors.foreground }]} numberOfLines={1}>
                      {tpl.name}
                    </Text>
                    <Text style={[styles.templateTarget, { color: themeColors.primary }]}>
                      {fmt(tpl.getTargetAmount(profile?.currency_code || "XOF"))}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>

            <Text style={[styles.label, { color: themeColors.foreground }]}>Nom du Défi</Text>
            <TextInput
              style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.card, borderColor: themeColors.border }]}
              placeholder="ex: Voyage au Japon, iPhone 16..."
              placeholderTextColor={themeColors.mutedForeground}
              value={name}
              onChangeText={setName}
            />

            <Text style={[styles.label, { color: themeColors.foreground }]}>Description (facultatif)</Text>
            <TextInput
              style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.card, borderColor: themeColors.border, height: 60 }]}
              placeholder="Ajouter des notes à propos de cet objectif..."
              placeholderTextColor={themeColors.mutedForeground}
              value={description}
              onChangeText={setDescription}
              multiline
            />

            <Text style={[styles.label, { color: themeColors.foreground }]}>Emoji représentatif</Text>
            <View style={styles.emojiList}>
              {EMOJIS.map((em) => (
                <TouchableOpacity
                  key={em}
                  style={[
                    styles.emojiBtn,
                    emoji === em
                      ? { backgroundColor: `${themeColors.primary}20`, borderColor: themeColors.primary }
                      : { backgroundColor: themeColors.card, borderColor: themeColors.border },
                  ]}
                  onPress={() => setEmoji(em)}
                >
                  <Text style={styles.emojiText}>{em}</Text>
                </TouchableOpacity>
              ))}
            </View>

            <Text style={[styles.label, { color: themeColors.foreground }]}>Objectif total d'épargne ({profile?.currency_symbol})</Text>
            <TextInput
              style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.card, borderColor: themeColors.border }]}
              placeholder="Montant total..."
              placeholderTextColor={themeColors.mutedForeground}
              keyboardType="numeric"
              value={targetAmount}
              onChangeText={setTargetAmount}
            />

            <Text style={[styles.label, { color: themeColors.foreground }]}>Catégorie</Text>
            <View style={styles.categoriesGrid}>
              {CATEGORIES.map((cat) => (
                <TouchableOpacity
                  key={cat.id}
                  style={[
                    styles.categoryBtn,
                    category === cat.id
                      ? { backgroundColor: `${themeColors.primary}20`, borderColor: themeColors.primary }
                      : { backgroundColor: themeColors.card, borderColor: themeColors.border },
                  ]}
                  onPress={() => setCategory(cat.id)}
                >
                  <Text style={{ fontSize: 13, color: themeColors.foreground }}>
                    {cat.emoji} {cat.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <TouchableOpacity style={styles.nextBtn} onPress={nextStep}>
              <LinearGradient colors={themeColors.gradientBrand} style={styles.btnGradient}>
                <Text style={styles.btnText}>Continuer</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        )}

        {/* Step 2: Planification de Date */}
        {step === 2 && (
          <View style={styles.stepContainer}>
            <View style={styles.switchRow}>
              <View style={{ flex: 1 }}>
                <Text style={[styles.label, { color: themeColors.foreground, marginBottom: 2 }]}>
                  Définir une durée cible
                </Text>
                <Text style={[styles.switchSubtitle, { color: themeColors.mutedForeground }]}>
                  Pour calculer combien vous devez mettre de côté par jour.
                </Text>
              </View>
              <Switch
                value={useDate}
                onValueChange={setUseDate}
                trackColor={{ false: themeColors.border, true: themeColors.primary }}
              />
            </View>

            {useDate && (
              <View style={{ marginTop: 15 }}>
                {/* Sub-mode toggle: days vs date */}
                <View style={{ flexDirection: "row", gap: 8, marginBottom: 15 }}>
                  <TouchableOpacity
                    style={[
                      styles.categoryBtn,
                      durationMode === "days"
                        ? { backgroundColor: `${themeColors.primary}20`, borderColor: themeColors.primary }
                        : { backgroundColor: themeColors.card, borderColor: themeColors.border },
                    ]}
                    onPress={() => setDurationMode("days")}
                  >
                    <Text style={{ fontSize: 13, color: durationMode === "days" ? themeColors.primary : themeColors.foreground, fontWeight: durationMode === "days" ? "bold" : "normal" }}>
                      📅 Nombre de jours
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.categoryBtn,
                      durationMode === "date"
                        ? { backgroundColor: `${themeColors.primary}20`, borderColor: themeColors.primary }
                        : { backgroundColor: themeColors.card, borderColor: themeColors.border },
                    ]}
                    onPress={() => setDurationMode("date")}
                  >
                    <Text style={{ fontSize: 13, color: durationMode === "date" ? themeColors.primary : themeColors.foreground, fontWeight: durationMode === "date" ? "bold" : "normal" }}>
                      🎯 Date de fin
                    </Text>
                  </TouchableOpacity>
                </View>

                {durationMode === "days" ? (
                  <>
                    <Text style={[styles.label, { color: themeColors.foreground }]}>Durée cible (en jours)</Text>
                    <TextInput
                      style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                      keyboardType="numeric"
                      value={durationDays}
                      onChangeText={setDurationDays}
                      placeholder="180"
                      placeholderTextColor={themeColors.mutedForeground}
                    />
                    <View style={[styles.infoBanner, { backgroundColor: `${themeColors.primary}10`, borderColor: `${themeColors.primary}30` }]}>
                      <Sparkles size={16} color={themeColors.primary} />
                      <Text style={[styles.infoBannerText, { color: themeColors.foreground }]}>
                        Vous devrez épargner en moyenne{" "}
                        <Text style={{ fontWeight: "bold", color: themeColors.primary }}>
                          {fmt(Math.ceil(parsedTarget / (parseInt(durationDays, 10) || 1)))}
                        </Text>{" "}
                        par jour.
                      </Text>
                    </View>
                  </>
                ) : (
                  <>
                    <Text style={[styles.label, { color: themeColors.foreground }]}>Date de fin souhaitée (JJ/MM/AAAA)</Text>
                    <TextInput
                      style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                      keyboardType="numeric"
                      value={endDateStr}
                      onChangeText={(text) => {
                        // Auto-format: add slashes after DD and MM
                        let cleaned = text.replace(/[^0-9]/g, "");
                        if (cleaned.length > 2) cleaned = cleaned.slice(0, 2) + "/" + cleaned.slice(2);
                        if (cleaned.length > 5) cleaned = cleaned.slice(0, 5) + "/" + cleaned.slice(5);
                        if (cleaned.length > 10) cleaned = cleaned.slice(0, 10);
                        setEndDateStr(cleaned);
                      }}
                      placeholder="31/12/2025"
                      placeholderTextColor={themeColors.mutedForeground}
                      maxLength={10}
                    />
                    {(() => {
                      const parts = endDateStr.split("/");
                      if (parts.length === 3 && parts[2].length === 4) {
                        const day = parseInt(parts[0], 10);
                        const month = parseInt(parts[1], 10) - 1;
                        const year = parseInt(parts[2], 10);
                        const d = new Date(year, month, day);
                        const now = new Date();
                        const diffDays = Math.ceil((d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
                        if (!isNaN(d.getTime()) && diffDays > 0) {
                          return (
                            <View style={[styles.infoBanner, { backgroundColor: `${themeColors.primary}10`, borderColor: `${themeColors.primary}30` }]}>
                              <Sparkles size={16} color={themeColors.primary} />
                              <Text style={[styles.infoBannerText, { color: themeColors.foreground }]}>
                                Il reste{" "}
                                <Text style={{ fontWeight: "bold", color: themeColors.primary }}>{diffDays} jours</Text>
                                . Vous devrez épargner en moyenne{" "}
                                <Text style={{ fontWeight: "bold", color: themeColors.primary }}>
                                  {fmt(Math.ceil(parsedTarget / diffDays))}
                                </Text>{" "}
                                par jour.
                              </Text>
                            </View>
                          );
                        } else if (diffDays <= 0) {
                          return (
                            <View style={[styles.infoBanner, { backgroundColor: "#ff000010", borderColor: "#ff000030" }]}>
                              <Text style={[styles.infoBannerText, { color: "#cc0000" }]}>
                                ⚠️ Cette date est déjà passée. Choisissez une date dans le futur.
                              </Text>
                            </View>
                          );
                        }
                      }
                      return null;
                    })()}
                  </>
                )}
              </View>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.outlineBtn, { borderColor: themeColors.border }]} onPress={prevStep}>
                <Text style={{ color: themeColors.foreground, fontWeight: "bold" }}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtnFlex} onPress={nextStep}>
                <LinearGradient colors={themeColors.gradientBrand} style={styles.btnGradient}>
                  <Text style={styles.btnText}>Continuer</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Step 3: Paramétrage des Tranches & Mode */}
        {step === 3 && (
          <View style={styles.stepContainer}>
            <Text style={[styles.label, { color: themeColors.foreground }]}>Mode de découpage</Text>
            <View style={styles.modeSelectors}>
              <TouchableOpacity
                style={[
                  styles.modeSelector,
                  mode === "random"
                    ? { backgroundColor: `${themeColors.primary}15`, borderColor: themeColors.primary }
                    : { backgroundColor: themeColors.card, borderColor: themeColors.border },
                ]}
                onPress={() => setMode("random")}
              >
                <Text style={[styles.modeTitle, { color: themeColors.foreground }]}>🎲 Aléatoire</Text>
                <Text style={[styles.modeDesc, { color: themeColors.mutedForeground }]}>
                  Tranches de tailles variées et ludiques (ex: méthode 52 semaines)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeSelector,
                  mode === "regular"
                    ? { backgroundColor: `${themeColors.primary}15`, borderColor: themeColors.primary }
                    : { backgroundColor: themeColors.card, borderColor: themeColors.border },
                ]}
                onPress={() => setMode("regular")}
              >
                <Text style={[styles.modeTitle, { color: themeColors.foreground }]}>📊 Régulier</Text>
                <Text style={[styles.modeDesc, { color: themeColors.mutedForeground }]}>
                  Tranches de tailles strictement identiques.
                </Text>
              </TouchableOpacity>
            </View>

            {mode === "random" && (
              <View style={styles.inputsRow}>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.label, { color: themeColors.foreground }]}>Montant min ({profile?.currency_symbol})</Text>
                  <TextInput
                    style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                    keyboardType="numeric"
                    value={minInst}
                    onChangeText={setMinInst}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 12 }}>
                  <Text style={[styles.label, { color: themeColors.foreground }]}>Montant max ({profile?.currency_symbol})</Text>
                  <TextInput
                    style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                    keyboardType="numeric"
                    value={maxInst}
                    onChangeText={setMaxInst}
                  />
                </View>
              </View>
            )}

            {mode === "regular" && (
              <View>
                <Text style={[styles.label, { color: themeColors.foreground }]}>Nombre de versements</Text>
                <TextInput
                  style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                  keyboardType="numeric"
                  value={regularCount}
                  onChangeText={setRegularCount}
                />
              </View>
            )}

            {/* Mode Free explanation */}
            {mode === "free" && (
              <View style={[styles.previewContainer, { backgroundColor: `${themeColors.primary}10`, borderColor: themeColors.primary, borderWidth: 1, borderRadius: 14, padding: 15 }]}>
                <Text style={{ fontSize: 13, fontWeight: "bold", color: themeColors.primary, marginBottom: 4 }}>
                  🌱 Mode Versement Libre
                </Text>
                <Text style={{ fontSize: 12, color: themeColors.foreground, lineHeight: 18 }}>
                  Aucune case pré-calculée. Tu pourras enregistrer tes versements au fur et à mesure selon tes disponibilités jusqu'à atteindre les {fmt(parsedTarget)} !
                </Text>
              </View>
            )}

            {/* Preview of installments */}
            {preview.length > 0 && (
              <View style={styles.previewContainer}>
                <Text style={[styles.label, { color: themeColors.foreground }]}>
                  Aperçu ({preview.length} tranches générées)
                </Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.previewScroll}>
                  {preview.slice(0, 15).map((amount, idx) => (
                    <View key={idx} style={[styles.previewBubble, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                      <Text style={{ color: themeColors.foreground, fontWeight: "600", fontSize: 12 }}>
                        {fmt(amount)}
                      </Text>
                    </View>
                  ))}
                  {preview.length > 15 && (
                    <View style={[styles.previewBubble, { backgroundColor: themeColors.card, borderColor: themeColors.border, borderStyle: "dashed" }]}>
                      <Text style={{ color: themeColors.mutedForeground, fontSize: 12 }}>...</Text>
                    </View>
                  )}
                </ScrollView>
              </View>
            )}

            <View style={styles.btnRow}>
              <TouchableOpacity style={[styles.outlineBtn, { borderColor: themeColors.border }]} onPress={prevStep}>
                <Text style={{ color: themeColors.foreground, fontWeight: "bold" }}>Retour</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.nextBtnFlex} onPress={handleCreate}>
                <LinearGradient colors={themeColors.gradientBrand} style={styles.btnGradient}>
                  <Text style={styles.btnText}>Lancer le défi ! 🚀</Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 10 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  backBtn: {
    padding: 5,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  stepIndicator: {
    fontSize: 12,
    fontWeight: "600",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  stepContainer: {
    width: "100%",
  },
  label: {
    fontSize: 14,
    fontWeight: "bold",
    marginTop: 15,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    height: 48,
    fontSize: 15,
  },
  emojiList: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  emojiBtn: {
    width: 44,
    height: 44,
    borderRadius: 12,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  emojiText: {
    fontSize: 20,
  },
  categoriesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  categoryBtn: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
  },
  nextBtn: {
    marginTop: 30,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
  },
  nextBtnFlex: {
    flex: 2,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
  },
  btnGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
  },
  btnRow: {
    flexDirection: "row",
    gap: 12,
    marginTop: 30,
    alignItems: "center",
  },
  outlineBtn: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
  },
  switchRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 15,
  },
  switchSubtitle: {
    fontSize: 12,
    marginTop: 2,
  },
  infoBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    padding: 12,
    marginTop: 15,
    gap: 8,
  },
  infoBannerText: {
    fontSize: 13,
    flex: 1,
  },
  modeSelectors: {
    gap: 12,
  },
  modeSelector: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  modeTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  modeDesc: {
    fontSize: 12,
    marginTop: 4,
    lineHeight: 16,
  },
  inputsRow: {
    flexDirection: "row",
    marginTop: 10,
  },
  previewContainer: {
    marginTop: 20,
  },
  previewScroll: {
    flexDirection: "row",
    marginTop: 8,
  },
  previewBubble: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginRight: 8,
  },
  templateCard: {
    width: 170,
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  templateBadge: {
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 3,
  },
  templateBadgeText: {
    fontSize: 9,
    fontWeight: "bold",
  },
  templateName: {
    fontSize: 12,
    fontWeight: "bold",
    marginTop: 8,
  },
  templateTarget: {
    fontSize: 12,
    fontWeight: "800",
    marginTop: 2,
  },
});
