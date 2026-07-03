import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView, Platform,
  TextInput,
  Alert,
  Share,
  StatusBar,
  Switch,
} from "react-native";
import { ArrowLeft, Save, Trash2, Download, Upload, Moon, Sun, CheckCircle, Bell, LogOut } from "lucide-react-native";
import { useApp } from "../services/AppContext";
import { COLORS } from "../lib/theme";
import { CURRENCIES, findCurrency } from "../lib/currencies";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { notificationService } from "../services/notifications";

export default function SettingsScreen({ navigation }: any) {
  const { profile, updateProfile, clearDatabase, importDatabase, state } = useApp();
  const themeColors = COLORS[profile?.theme || "light"];

  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [avatarEmoji, setAvatarEmoji] = useState(profile?.avatar_emoji || "💰");
  const [currencyCode, setCurrencyCode] = useState(profile?.currency_code || "EUR");
  const [theme, setTheme] = useState(profile?.theme || "light");
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.notifications_enabled ?? false);
  const [notificationHour, setNotificationHour] = useState(String(profile?.notification_hour ?? 20));
  const [notificationMinute, setNotificationMinute] = useState(String(profile?.notification_minute ?? 0));
  const [notificationFrequency, setNotificationFrequency] = useState<"daily" | "twice_daily" | "weekly">(profile?.notification_frequency ?? "daily");

  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const handleSaveProfile = async () => {
    try {
      const selected = findCurrency(currencyCode);
      const hourNum = parseInt(notificationHour, 10) || 0;
      const minNum = parseInt(notificationMinute, 10) || 0;
      
      await updateProfile({
        first_name: firstName.trim(),
        avatar_emoji: avatarEmoji.trim(),
        currency_code: currencyCode,
        currency_symbol: selected?.symbol ?? "€",
        currency_position: selected?.defaultPosition === "before" ? "left" : "right",
        theme: theme as "light" | "dark",
        notifications_enabled: notificationsEnabled,
        notification_hour: hourNum,
        notification_minute: minNum,
        notification_frequency: notificationFrequency,
      });

      // Schedule or cancel reminders
      await notificationService.scheduleReminders(
        notificationsEnabled, 
        hourNum, 
        minNum, 
        notificationFrequency
      );

      Alert.alert("Succès", "Profil mis à jour avec succès !");
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible de sauvegarder le profil.");
    }
  };

  const handleExport = async () => {
    if (!state) return;
    try {
      const content = JSON.stringify(state, null, 2);
      const fileUri = FileSystem.cacheDirectory + "goal_glow_sauvegarde.json";
      await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });
      
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Exporter la sauvegarde Goal Glow",
          UTI: "public.json",
        });
      } else {
        await Share.share({
          message: content,
          title: "Export Goal Glow DB",
        });
      }
    } catch (e: any) {
      Alert.alert("Erreur", "Impossible d'exporter la base de données.");
    }
  };

  const handleImport = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: "application/json",
        copyToCacheDirectory: true,
      });

      if (result.canceled || !result.assets || result.assets.length === 0) {
        return;
      }

      const fileUri = result.assets[0].uri;
      const content = await FileSystem.readAsStringAsync(fileUri, {
        encoding: FileSystem.EncodingType.UTF8,
      });

      await importDatabase(content);
      Alert.alert("Succès", "Données importées avec succès !");
    } catch (e: any) {
      Alert.alert("Erreur", "Format de fichier invalide ou erreur d'importation.");
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Réinitialiser l'application",
      "Cette action supprimera tous vos défis, versements et configurations. Es-tu sûr ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Réinitialiser",
          style: "destructive",
          onPress: async () => {
            await clearDatabase();
            setFirstName("Épargnant");
            setAvatarEmoji("💰");
            setCurrencyCode("EUR");
            setTheme("light");
            Alert.alert("Succès", "Données réinitialisées.");
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Se déconnecter",
      "Voulez-vous verrouiller l'application et retourner à l'écran de saisie du code PIN ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Confirmer",
          style: "destructive",
          onPress: () => {
            navigation.reset({
              index: 0,
              routes: [{ name: "Auth" }],
            });
          },
        },
      ]
    );
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={profile?.theme === "dark" ? "light-content" : "dark-content"} />
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.foreground }]}>Paramètres</Text>
        <TouchableOpacity style={styles.backBtn} onPress={handleSaveProfile}>
          <Save size={22} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Card Info */}
        <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>Mon Profil</Text>
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.label, { color: themeColors.foreground }]}>Nom d'utilisateur</Text>
          <TextInput
            style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="Épargnant..."
            placeholderTextColor={themeColors.mutedForeground}
          />

          <Text style={[styles.label, { color: themeColors.foreground, marginTop: 12 }]}>Avatar Emoji</Text>
          <TextInput
            style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
            value={avatarEmoji}
            onChangeText={setAvatarEmoji}
            placeholder="💰"
            maxLength={2}
          />
        </View>

        {/* Preferences */}
        <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>Préférences</Text>
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          {/* Theme Selector */}
          <Text style={[styles.label, { color: themeColors.foreground }]}>Thème visuel</Text>
          <View style={styles.themeToggleRow}>
            <TouchableOpacity
              style={[
                styles.themeBtn,
                theme === "light"
                  ? { backgroundColor: `${themeColors.primary}20`, borderColor: themeColors.primary }
                  : { backgroundColor: themeColors.background, borderColor: themeColors.border },
              ]}
              onPress={() => {
                setTheme("light");
                updateProfile({ theme: "light" });
              }}
            >
              <Sun size={18} color={theme === "light" ? themeColors.primary : themeColors.mutedForeground} />
              <Text style={[styles.themeBtnText, { color: theme === "light" ? themeColors.primary : themeColors.foreground }]}>
                Clair
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.themeBtn,
                theme === "dark"
                  ? { backgroundColor: `${themeColors.primary}20`, borderColor: themeColors.primary }
                  : { backgroundColor: themeColors.background, borderColor: themeColors.border },
              ]}
              onPress={() => {
                setTheme("dark");
                updateProfile({ theme: "dark" });
              }}
            >
              <Moon size={18} color={theme === "dark" ? themeColors.primary : themeColors.mutedForeground} />
              <Text style={[styles.themeBtnText, { color: theme === "dark" ? themeColors.primary : themeColors.foreground }]}>
                Sombre
              </Text>
            </TouchableOpacity>
          </View>

          {/* Currency Dropdown Selector */}
          <Text style={[styles.label, { color: themeColors.foreground, marginTop: 15 }]}>Devise</Text>
          <TouchableOpacity
            style={[styles.input, styles.currencyPicker, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
            onPress={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
          >
            <Text style={{ color: themeColors.foreground }}>
              {findCurrency(currencyCode)?.flag} {findCurrency(currencyCode)?.name} ({currencyCode})
            </Text>
          </TouchableOpacity>

          {showCurrencyDropdown && (
            <View style={[styles.dropdownContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
              {CURRENCIES.map((cur) => (
                <TouchableOpacity
                  key={cur.code}
                  style={styles.dropdownItem}
                  onPress={() => {
                    setCurrencyCode(cur.code);
                    setShowCurrencyDropdown(false);
                  }}
                >
                  <Text style={{ color: themeColors.foreground }}>
                    {cur.flag} {cur.name} ({cur.symbol})
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        {/* Notifications */}
        <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>Notifications locales</Text>
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}>
            <View style={{ flex: 1, marginRight: 10 }}>
              <Text style={[styles.label, { color: themeColors.foreground, marginBottom: 2 }]}>Rappels programmés</Text>
              <Text style={{ fontSize: 12, color: themeColors.mutedForeground }}>
                Rappel d'épargne régulier pour garder le rythme de vos objectifs.
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              trackColor={{ false: themeColors.border, true: themeColors.primary }}
            />
          </View>

          {notificationsEnabled && (
            <View style={{ marginTop: 15 }}>
              {/* Frequency Selector */}
              <Text style={[styles.label, { color: themeColors.foreground, marginBottom: 8 }]}>Fréquence des rappels</Text>
              <View style={{ flexDirection: "row", gap: 6, marginBottom: 15 }}>
                {([
                  ["daily", "1x / jour"],
                  ["twice_daily", "2x / jour"],
                  ["weekly", "1x / sem."],
                ] as const).map(([freq, label]) => (
                  <TouchableOpacity
                    key={freq}
                    style={{
                      flex: 1,
                      paddingVertical: 8,
                      borderRadius: 10,
                      borderWidth: 1,
                      alignItems: "center",
                      justifyContent: "center",
                      backgroundColor: notificationFrequency === freq ? `${themeColors.primary}20` : themeColors.background,
                      borderColor: notificationFrequency === freq ? themeColors.primary : themeColors.border,
                    }}
                    onPress={() => setNotificationFrequency(freq)}
                  >
                    <Text
                      style={{
                        fontSize: 11,
                        fontWeight: "bold",
                        color: notificationFrequency === freq ? themeColors.primary : themeColors.foreground,
                      }}
                    >
                      {label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* Hour & Minute Row */}
              <Text style={[styles.label, { color: themeColors.foreground, marginBottom: 6 }]}>Heure du rappel</Text>
              <View style={{ flexDirection: "row", gap: 10, alignItems: "center" }}>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: themeColors.mutedForeground, marginBottom: 4 }}>Heure (0 - 23)</Text>
                  <TextInput
                    style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border, textAlign: "center" }]}
                    keyboardType="numeric"
                    value={notificationHour}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9]/g, "");
                      const num = parseInt(cleaned, 10);
                      if (cleaned === "" || (num >= 0 && num <= 23)) {
                        setNotificationHour(cleaned);
                      }
                    }}
                    maxLength={2}
                    placeholder="20"
                    placeholderTextColor={themeColors.mutedForeground}
                  />
                </View>

                <Text style={{ fontSize: 18, fontWeight: "bold", color: themeColors.mutedForeground, marginTop: 15 }}>:</Text>

                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 10, color: themeColors.mutedForeground, marginBottom: 4 }}>Minute (0 - 59)</Text>
                  <TextInput
                    style={[styles.input, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border, textAlign: "center" }]}
                    keyboardType="numeric"
                    value={notificationMinute}
                    onChangeText={(text) => {
                      const cleaned = text.replace(/[^0-9]/g, "");
                      const num = parseInt(cleaned, 10);
                      if (cleaned === "" || (num >= 0 && num <= 59)) {
                        setNotificationMinute(cleaned);
                      }
                    }}
                    maxLength={2}
                    placeholder="00"
                    placeholderTextColor={themeColors.mutedForeground}
                  />
                </View>
              </View>
            </View>
          )}
        </View>

        <View style={{ marginVertical: 10 }}>
          {/* Explicit Save button at the bottom of form */}
          <TouchableOpacity
            style={{
              height: 48,
              borderRadius: 24,
              backgroundColor: themeColors.primary,
              justifyContent: "center",
              alignItems: "center",
              marginTop: 20,
              shadowColor: "#000",
              shadowOffset: { width: 0, height: 2 },
              shadowOpacity: 0.1,
              shadowRadius: 4,
              elevation: 2,
            }}
            onPress={handleSaveProfile}
          >
            <Text style={{ color: "white", fontSize: 15, fontWeight: "bold" }}>Sauvegarder les modifications</Text>
          </TouchableOpacity>
        </View>

        {/* Database Utilities */}
        <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>Base de données (Stockage fichier)</Text>
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <TouchableOpacity style={[styles.utilityBtn, { backgroundColor: themeColors.muted }]} onPress={handleExport}>
            <Download size={18} color={themeColors.foreground} />
            <Text style={[styles.utilityBtnText, { color: themeColors.foreground }]}>Exporter la sauvegarde (JSON)</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.utilityBtn, { backgroundColor: themeColors.muted }]} onPress={handleImport}>
            <Upload size={18} color={themeColors.foreground} />
            <Text style={[styles.utilityBtnText, { color: themeColors.foreground }]}>Importer une sauvegarde</Text>
          </TouchableOpacity>

          <TouchableOpacity style={[styles.utilityBtn, { backgroundColor: `${themeColors.destructive}15` }]} onPress={handleReset}>
            <Trash2 size={18} color={themeColors.destructive} />
            <Text style={[styles.utilityBtnText, { color: themeColors.destructive }]}>Réinitialiser toutes les données</Text>
          </TouchableOpacity>
        </View>

        {/* À propos */}
        <Text style={[styles.sectionTitle, { color: themeColors.foreground, marginTop: 20 }]}>À propos</Text>
        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border, padding: 15 }]}>
          <Text style={{ fontSize: 14, fontWeight: "bold", color: themeColors.foreground, marginBottom: 8 }}>DéfiÉpargne Mobile</Text>
          <Text style={{ fontSize: 12, color: themeColors.mutedForeground, lineHeight: 18, marginBottom: 12 }}>
            Une application premium conçue pour vous aider à suivre, planifier et atteindre vos objectifs d'épargne en toute simplicité.
          </Text>
          
          <View style={{ gap: 6 }}>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: themeColors.mutedForeground }}>Développeur :</Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: themeColors.foreground }}>Build by Rizux</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: themeColors.mutedForeground }}>Email :</Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: themeColors.primary }}>ericaguigahpro@gmail.com</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: themeColors.mutedForeground }}>Téléphone :</Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: themeColors.foreground }}>+228 96 63 43 45</Text>
            </View>
            <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
              <Text style={{ fontSize: 11, fontWeight: "bold", color: themeColors.mutedForeground }}>Version :</Text>
              <Text style={{ fontSize: 11, fontWeight: "600", color: themeColors.foreground }}>1.0.0 (Production)</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.utilityBtn,
            {
              backgroundColor: `${themeColors.destructive}10`,
              borderColor: themeColors.destructive,
              borderWidth: 1,
              marginTop: 20,
              justifyContent: "center",
              height: 48,
              borderRadius: 24,
            },
          ]}
          onPress={handleLogout}
        >
          <LogOut size={18} color={themeColors.destructive} />
          <Text style={[styles.utilityBtnText, { color: themeColors.destructive, fontWeight: "bold" }]}>
            Se déconnecter (Verrouiller)
          </Text>
        </TouchableOpacity>
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
  scrollContent: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 40,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
    marginTop: 20,
    marginBottom: 8,
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    marginBottom: 10,
  },
  label: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
  },
  input: {
    height: 44,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    fontSize: 14,
  },
  themeToggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeBtn: {
    flex: 1,
    height: 40,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  themeBtnText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  currencyPicker: {
    justifyContent: "center",
  },
  dropdownContainer: {
    borderWidth: 1,
    borderRadius: 10,
    marginTop: 5,
    maxHeight: 180,
    overflow: "scroll",
  },
  dropdownItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0,0,0,0.05)",
  },
  utilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    padding: 12,
    borderRadius: 10,
    marginBottom: 10,
  },
  utilityBtnText: {
    fontSize: 13,
    fontWeight: "600",
  },
});
