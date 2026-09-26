import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  TextInput,
  Alert,
  Dimensions,
  ScrollView,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useApp } from "../services/AppContext";
import { COLORS } from "../lib/theme";
import { LinearGradient } from "expo-linear-gradient";
import { Lock, Sparkles, User, KeyRound, ShieldAlert } from "lucide-react-native";
import * as Haptics from "expo-haptics";

const { width } = Dimensions.get("window");

export default function AuthScreen({ navigation }: any) {
  const { profile, updateProfile, loading } = useApp();
  
  const [pin, setPin] = useState("");
  const [setupName, setSetupName] = useState("");
  const [setupPin, setSetupPin] = useState("");
  const [setupPinConfirm, setSetupPinConfirm] = useState("");
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState(0);

  const themeColors = COLORS[profile?.theme || "light"];

  // Countdown timer for lockout
  useEffect(() => {
    if (lockoutSeconds <= 0) return;
    const interval = setInterval(() => {
      setLockoutSeconds((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(interval);
  }, [lockoutSeconds]);

  useEffect(() => {
    if (loading || !profile) return;
    
    // If onboarding is already completed and user has no PIN code configured, proceed directly
    if (profile.onboarding_completed && !profile.pin_code) {
      navigation.replace("MainTabs");
    }
  }, [profile, loading]);

  const handleKeyPress = (num: string) => {
    if (lockoutSeconds > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      Alert.alert("Sécurité 🔒", `Veuillez patienter encore ${lockoutSeconds}s avant de réessayer.`);
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (pin.length < 4) {
      const newPin = pin + num;
      setPin(newPin);
      if (newPin.length === 4) {
        // Verify PIN
        if (newPin === profile?.pin_code) {
          setFailedAttempts(0);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          navigation.replace("MainTabs");
        } else {
          const nextFailed = failedAttempts + 1;
          setFailedAttempts(nextFailed);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);

          if (nextFailed >= 5) {
            setLockoutSeconds(30);
            Alert.alert("Sécurité 🔒", "5 tentatives infructueuses. Saisie bloquée pendant 30 secondes.");
          } else {
            Alert.alert("Code incorrect", `Code PIN erroné (${5 - nextFailed} essai(s) restant(s)).`);
          }
          setPin("");
        }
      }
    }
  };

  const handleBackspace = () => {
    if (lockoutSeconds > 0) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setPin(pin.slice(0, -1));
  };

  const handleSetup = async () => {
    if (!setupName.trim()) {
      return Alert.alert("Prénom requis", "Saisissez votre prénom pour personnaliser l'application.");
    }

    // PIN is optional during setup, but if entered, must be 4 digits matching confirmation
    let finalPin: string | null = null;
    if (setupPin.length > 0 || setupPinConfirm.length > 0) {
      if (setupPin.length !== 4) {
        return Alert.alert("Erreur", "Le code PIN doit comporter exactement 4 chiffres.");
      }
      if (setupPin !== setupPinConfirm) {
        return Alert.alert("Erreur", "Les deux codes PIN ne correspondent pas.");
      }
      finalPin = setupPin;
    }

    try {
      await updateProfile({
        first_name: setupName.trim(),
        pin_code: finalPin,
        onboarding_completed: true,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Bienvenue 🎉", "Votre profil a été configuré avec succès !");
      navigation.replace("MainTabs");
    } catch (e: any) {
      Alert.alert("Erreur", "Une erreur est survenue lors de la configuration.");
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: themeColors.background, justifyContent: "center", alignItems: "center" }]}>
        <Text style={{ color: themeColors.foreground }}>Chargement...</Text>
      </View>
    );
  }

  const isFirstStartup = !profile?.onboarding_completed;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={profile?.theme === "dark" ? "light-content" : "dark-content"} />

      {isFirstStartup ? (
        // First startup: setup screen
        <ScrollView contentContainerStyle={styles.setupContent} keyboardShouldPersistTaps="handled">
          <View style={styles.iconCircle}>
            <Sparkles size={40} color={themeColors.primary} />
          </View>
          <Text style={[styles.title, { color: themeColors.foreground }]}>Bienvenue sur Défi Épargne</Text>
          <Text style={[styles.subtitle, { color: themeColors.mutedForeground }]}>
            Configurez votre profil d'épargne locale sécurisée.
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

            <Text style={[styles.label, { color: themeColors.foreground, marginTop: 15 }]}>
              Code PIN de sécurité (optionnel, 4 chiffres)
            </Text>
            <View style={[styles.inputContainer, { borderColor: themeColors.border, backgroundColor: themeColors.card }]}>
              <KeyRound size={18} color={themeColors.mutedForeground} style={{ marginRight: 10 }} />
              <TextInput
                style={[styles.input, { color: themeColors.foreground }]}
                placeholder="Code à 4 chiffres (laisser vide si non souhaité)"
                placeholderTextColor={themeColors.mutedForeground}
                keyboardType="numeric"
                secureTextEntry
                maxLength={4}
                value={setupPin}
                onChangeText={setSetupPin}
              />
            </View>

            {setupPin.length > 0 && (
              <>
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
              </>
            )}

            <TouchableOpacity style={styles.submitBtn} onPress={handleSetup}>
              <LinearGradient
                colors={themeColors.gradientBrand}
                style={styles.btnGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.btnText}>Commencer l'aventure 🚀</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </ScrollView>
      ) : (
        // Unlock Screen with keypad
        <View style={styles.unlockContent}>
          <View style={styles.iconCircle}>
            <Lock size={36} color={themeColors.primary} />
          </View>
          <Text style={[styles.title, { color: themeColors.foreground }]}>Déverrouillage</Text>
          <Text style={[styles.subtitle, { color: themeColors.mutedForeground }]}>
            Bonjour {profile?.first_name || "Épargnant"}, entrez votre code PIN
          </Text>

          {lockoutSeconds > 0 && (
            <View style={[styles.lockoutBanner, { backgroundColor: `${themeColors.destructive}20`, borderColor: themeColors.destructive }]}>
              <ShieldAlert size={16} color={themeColors.destructive} style={{ marginRight: 6 }} />
              <Text style={{ color: themeColors.destructive, fontSize: 12, fontWeight: "600" }}>
                Verrouillé : réessayez dans {lockoutSeconds}s
              </Text>
            </View>
          )}

          {/* Dots */}
          <View style={styles.dotsContainer}>
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
  submitBtn: {
    marginTop: 30,
    width: "100%",
    height: 52,
    borderRadius: 14,
    overflow: "hidden",
  },
  btnGradient: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  btnText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "bold",
  },
  unlockContent: {
    flex: 1,
    paddingHorizontal: 30,
    paddingTop: 60,
    alignItems: "center",
  },
  lockoutBanner: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 15,
  },
  dotsContainer: {
    flexDirection: "row",
    gap: 20,
    marginTop: 40,
    marginBottom: 50,
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 2,
  },
  keypad: {
    width: "100%",
    maxWidth: 280,
    gap: 15,
  },
  keypadRow: {
    flexDirection: "row",
    justifyContent: "space-between",
  },
  key: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: "center",
    alignItems: "center",
  },
  keyText: {
    fontSize: 24,
    fontWeight: "600",
  },
});
