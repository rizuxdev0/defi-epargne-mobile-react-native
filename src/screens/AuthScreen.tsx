import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView, Platform,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
} from "react-native";
import { useApp } from "../services/AppContext";
import { COLORS } from "../lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, Sparkles, User, KeyRound } from "lucide-react-native";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

export default function AuthScreen({ navigation }: any) {
  const { profile, updateProfile, loading } = useApp();
  
  const [pin, setPin] = useState("");
  const [setupName, setSetupName] = useState("");
  const [setupPin, setSetupPin] = useState("");
  const [setupPinConfirm, setSetupPinConfirm] = useState("");

  const themeColors = COLORS[profile?.theme || "light"];

  useEffect(() => {
    if (loading || !profile) return;
    
    // If no PIN is configured, we stay on this screen to set it up.
    // If PIN is configured, we wait for input.
  }, [profile, loading]);

  const handleKeyPress = (num: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        // Verify PIN
        if (newPin === profile?.pin_code) {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          // Unlock and navigate to MainTabs (Dashboard, History, etc.)
          navigation.replace("MainTabs");
        } else {
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
          Alert.alert("Erreur", "Code PIN incorrect");
          setPin("");
        }
      }
    }
  };

  const handleBackspace = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(pin.slice(0, -1));
  };

  const handleSetup = async () => {
    if (!setupName.trim()) {
      return Alert.alert("Erreur", "Saisissez votre prénom.");
    }
    if (setupPin.length !== 4) {
      return Alert.alert("Erreur", "Le code PIN doit comporter 4 chiffres.");
    }
    if (setupPin !== setupPinConfirm) {
      return Alert.alert("Erreur", "Les codes PIN ne correspondent pas.");
    }

    try {
      await updateProfile({
        first_name: setupName.trim(),
        pin_code: setupPin,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Bienvenue", "Votre compte a été configuré avec succès !");
      navigation.replace("MainTabs");
    } catch (e: any) {
      Alert.alert("Erreur", "Une erreur est survenue.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: themeColors.foreground }}>Chargement...</Text>
      </View>
    );
  }

  const isFirstStartup = !profile?.pin_code;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {isFirstStartup ? (
        // First startup: setup screen
        <ScrollView contentContainerStyle={styles.setupContent} keyboardShouldPersistTaps="handled">
          <View style={styles.iconCircle}>
            <Sparkles size={40} color={themeColors.primary} />
          </View>
          <Text style={[styles.title, { color: themeColors.foreground }]}>Bienvenue sur Goal Glow</Text>
          <Text style={[styles.subtitle, { color: themeColors.mutedForeground }]}>
            Configurez votre profil d'épargne local sécurisé.
          </Text>

          <View style={styles.form}>
            <Text style={[styles.label, { color: themeColors.foreground }]}>Votre prénom</Text>
            <View style={[styles.inputContainer, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}>
              <User size={18} color={themeColors.mutedForeground} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.input, { color: themeColors.foreground }]}
                placeholder="ex: Jean, Marie..."
                placeholderTextColor={themeColors.mutedForeground}
                value={setupName}
                onChangeText={setSetupName}
              />
            </View>

            <Text style={[styles.label, { color: themeColors.foreground, marginTop: 15 }]}>Code PIN de sécurité (4 chiffres)</Text>
            <View style={[styles.inputContainer, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}>
              <KeyRound size={18} color={themeColors.mutedForeground} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.input, { color: themeColors.foreground }]}
                placeholder="Code à 4 chiffres"
                placeholderTextColor={themeColors.mutedForeground}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                value={setupPin}
                onChangeText={setSetupPin}
              />
            </View>

            <Text style={[styles.label, { color: themeColors.foreground, marginTop: 15 }]}>Confirmez le Code PIN</Text>
            <View style={[styles.inputContainer, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}>
              <KeyRound size={18} color={themeColors.mutedForeground} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.input, { color: themeColors.foreground }]}
                placeholder="Confirmez votre code"
                placeholderTextColor={themeColors.mutedForeground}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                value={setupPinConfirm}
                onChangeText={setSetupPinConfirm}
              />
            </View>

            <TouchableOpacity style={styles.setupBtn} onPress={handleSetup}>
              <LinearGradient colors={themeColors.gradientBrand} style={styles.btnGradient}>
                <Text style={styles.setupBtnText}>Commencer mon épargne 🚀</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        // Subsequent startups: Enter PIN lock-screen
        <View style={styles.lockContent}>
          <View style={styles.lockHeader}>
            <View style={[styles.lockIconCircle, { backgroundColor: `${themeColors.primary}15` }]}>
              <Lock size={32} color={themeColors.primary} />
            </View>
            <Text style={[styles.title, { color: themeColors.foreground, marginTop: 20 }]}>Goal Glow Sécurisé</Text>
            <Text style={[styles.subtitle, { color: themeColors.mutedForeground, marginTop: 5 }]}>
              Saisissez votre code PIN pour déverrouiller
            </Text>
          </View>

          {/* Dots Indicator */}
          <View style={styles.dotsRow}>
            {[1, 2, 3, 4].map((i) => (
              <View
                key={i}
                style={[
                  styles.dot,
                  {
                    backgroundColor: pin.length >= i ? themeColors.primary : "transparent",
                    borderColor: themeColors.primary,
                  },
                ]}
              />
            ))}
          </View>

          {/* Keypad */}
          <View style={styles.keypad}>
            <View style={styles.keypadRow}>
              {["1", "2", "3"].map((n) => (
                <TouchableOpacity key={n} style={[styles.key, { backgroundColor: themeColors.card }]} onPress={() => handleKeyPress(n)}>
                  <Text style={[styles.keyText, { color: themeColors.foreground }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.keypadRow}>
              {["4", "5", "6"].map((n) => (
                <TouchableOpacity key={n} style={[styles.key, { backgroundColor: themeColors.card }]} onPress={() => handleKeyPress(n)}>
                  <Text style={[styles.keyText, { color: themeColors.foreground }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.keypadRow}>
              {["7", "8", "9"].map((n) => (
                <TouchableOpacity key={n} style={[styles.key, { backgroundColor: themeColors.card }]} onPress={() => handleKeyPress(n)}>
                  <Text style={[styles.keyText, { color: themeColors.foreground }]}>{n}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.keypadRow}>
              <View style={[styles.key, { backgroundColor: "transparent" }]} />
              <TouchableOpacity style={[styles.key, { backgroundColor: themeColors.card }]} onPress={() => handleKeyPress("0")}>
                <Text style={[styles.keyText, { color: themeColors.foreground }]}>0</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[styles.key, { backgroundColor: "transparent" }]} onPress={handleBackspace}>
                <Text style={[styles.keyText, { color: themeColors.foreground }]}>⌫</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 10 : 0,
  },
  setupContent: {
    paddingHorizontal: 25,
    paddingTop: 40,
    paddingBottom: 30,
    alignItems: "center",
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: "rgba(108, 63, 196, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  subtitle: {
    fontSize: 14,
    textAlign: "center",
    marginTop: 8,
    paddingHorizontal: 15,
  },
  form: {
    width: "100%",
    marginTop: 30,
  },
  label: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 15,
    height: 48,
  },
  input: {
    flex: 1,
    height: "100%",
    fontSize: 15,
  },
  setupBtn: {
    height: 50,
    borderRadius: 25,
    marginTop: 35,
    overflow: "hidden",
  },
  btnGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  setupBtnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
  },
  lockContent: {
    flex: 1,
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 40,
  },
  lockHeader: {
    alignItems: "center",
    marginTop: 20,
  },
  lockIconCircle: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
  },
  dotsRow: {
    flexDirection: "row",
    gap: 15,
    marginVertical: 30,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  keypad: {
    width: width - 80,
    maxWidth: 320,
    gap: 12,
    marginBottom: 20,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  key: {
    flex: 1,
    height: 64,
    borderRadius: 32,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  keyText: {
    fontSize: 24,
    fontWeight: "bold",
  },
});
