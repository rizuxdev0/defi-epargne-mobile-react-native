import React, { useState, useMemo, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Share,
  StatusBar,
  Switch,
  Linking,
  ActivityIndicator,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import {
  ArrowLeft,
  Save,
  Trash2,
  Download,
  Upload,
  Moon,
  Sun,
  CheckCircle,
  Bell,
  LogOut,
  Bot,
  Sparkles,
  Key,
  ExternalLink,
  Shield,
  Share2,
  Flame,
  Target,
  Coins,
  Eye,
  EyeOff,
  Check,
  Search,
  Award,
  Clock,
  Info,
  CheckCheck,
  Calendar,
  Sunrise,
  Sunset,
  RefreshCw,
} from "lucide-react-native";
import { useApp } from "../services/AppContext";
import { useGamification } from "../hooks/useGamification";
import { useMoneyFormatter } from "../hooks/useMoneyFormatter";
import { COLORS } from "../lib/theme";
import { CURRENCIES, findCurrency } from "../lib/currencies";
import * as Sharing from "expo-sharing";
import * as DocumentPicker from "expo-document-picker";
import * as FileSystem from "expo-file-system/legacy";
import { notificationService } from "../services/notifications";
import { geminiService } from "../services/gemini";

const QUICK_AVATARS = ["💰", "🎯", "🚀", "💎", "🦁", "👑", "🔥", "🏆", "⭐", "✨", "🌍", "⚡"];
const POPULAR_CURRENCIES = ["XOF", "EUR", "USD", "CAD", "GBP", "CHF"];
const QUICK_HOURS = [
  { label: "Matin (08:00)", hour: "8", minute: "0" },
  { label: "Midi (13:00)", hour: "13", minute: "0" },
  { label: "Soir (20:00)", hour: "20", minute: "0" },
];

const WEEKDAYS = [
  { id: 1, label: "Dimanche", short: "Dim" },
  { id: 2, label: "Lundi", short: "Lun" },
  { id: 3, label: "Mardi", short: "Mar" },
  { id: 4, label: "Mercredi", short: "Mer" },
  { id: 5, label: "Jeudi", short: "Jeu" },
  { id: 6, label: "Vendredi", short: "Ven" },
  { id: 7, label: "Samedi", short: "Sam" },
];

const QUICK_MONTH_DAYS = [
  { day: 1, label: "1er (Début de mois)" },
  { day: 25, label: "25 (Fin de mois)" },
  { day: 28, label: "28 (Jour de paie 💳)" },
  { day: 30, label: "30 (Dernier jour)" },
];

export default function SettingsScreen({ navigation }: any) {
  const { profile, updateProfile, clearDatabase, importDatabase, state } = useApp();
  const { gamification } = useGamification();
  const formatMoney = useMoneyFormatter();
  const themeColors = COLORS[profile?.theme || "light"];

  const [firstName, setFirstName] = useState(profile?.first_name || "");
  const [avatarEmoji, setAvatarEmoji] = useState(profile?.avatar_emoji || "💰");
  const [currencyCode, setCurrencyCode] = useState(profile?.currency_code || "XOF");
  const [currencySearch, setCurrencySearch] = useState("");
  const [showCurrencyDropdown, setShowCurrencyDropdown] = useState(false);

  const [theme, setTheme] = useState(profile?.theme || "light");
  const [notificationsEnabled, setNotificationsEnabled] = useState(profile?.notifications_enabled ?? false);
  const [notificationHour, setNotificationHour] = useState(String(profile?.notification_hour ?? 20));
  const [notificationMinute, setNotificationMinute] = useState(String(profile?.notification_minute ?? 0));
  const [notificationFrequency, setNotificationFrequency] = useState<"daily" | "twice_daily" | "weekly" | "monthly">(
    (profile?.notification_frequency as any) ?? "daily"
  );
  const [notificationMorningHour, setNotificationMorningHour] = useState(String(profile?.notification_morning_hour ?? 8));
  const [notificationMorningMinute, setNotificationMorningMinute] = useState(String(profile?.notification_morning_minute ?? 30));
  const [notificationEveningHour, setNotificationEveningHour] = useState(String(profile?.notification_evening_hour ?? 20));
  const [notificationEveningMinute, setNotificationEveningMinute] = useState(String(profile?.notification_evening_minute ?? 0));
  const [notificationWeekday, setNotificationWeekday] = useState<number>(profile?.notification_weekday ?? 1);
  const [notificationDayOfMonth, setNotificationDayOfMonth] = useState<number>(profile?.notification_day_of_month ?? 28);

  const [scheduledRemindersCount, setScheduledRemindersCount] = useState<number>(0);

  const [pinCode, setPinCode] = useState(profile?.pin_code || "");
  const [geminiApiKey, setGeminiApiKey] = useState(profile?.gemini_api_key || "");
  const [showApiKey, setShowApiKey] = useState(false);
  const [isTestingApiKey, setIsTestingApiKey] = useState(false);
  const [apiKeyStatus, setApiKeyStatus] = useState<"idle" | "valid" | "invalid">("idle");
  const [isTestingNotification, setIsTestingNotification] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load active scheduled notifications count on mount
  useEffect(() => {
    refreshScheduledCount();
  }, []);

  const refreshScheduledCount = async () => {
    const list = await notificationService.getScheduledNotifications();
    setScheduledRemindersCount(list.length);
  };

  // Filter currencies for search
  const filteredCurrencies = useMemo(() => {
    if (!currencySearch.trim()) return CURRENCIES;
    const q = currencySearch.toLowerCase();
    return CURRENCIES.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.code.toLowerCase().includes(q) ||
        c.symbol.toLowerCase().includes(q)
    );
  }, [currencySearch]);

  const selectedCurrency = findCurrency(currencyCode);

  const handleToggleNotifications = async (val: boolean) => {
    if (val) {
      const granted = await notificationService.requestPermissions();
      if (!granted) {
        Alert.alert(
          "Autorisation requise",
          "Pour recevoir vos rappels, autorisez les notifications pour Défi Épargne dans les réglages système de votre téléphone Android.",
          [
            { text: "Annuler", style: "cancel" },
            { text: "Ouvrir les Réglages", onPress: () => Linking.openSettings() },
          ]
        );
        setNotificationsEnabled(false);
        return;
      }
      setNotificationsEnabled(true);
    } else {
      setNotificationsEnabled(false);
    }
  };

  const handleSaveProfile = async () => {
    setIsSaving(true);
    try {
      const selected = findCurrency(currencyCode);
      const hourNum = parseInt(notificationHour, 10) || 0;
      const minNum = parseInt(notificationMinute, 10) || 0;
      const mornH = parseInt(notificationMorningHour, 10) || 8;
      const mornM = parseInt(notificationMorningMinute, 10) || 30;
      const eveH = parseInt(notificationEveningHour, 10) || 20;
      const eveM = parseInt(notificationEveningMinute, 10) || 0;

      await updateProfile({
        first_name: firstName.trim(),
        avatar_emoji: avatarEmoji.trim(),
        currency_code: currencyCode,
        currency_symbol: selected?.symbol ?? "F CFA",
        currency_position: selected?.defaultPosition === "before" ? "left" : "right",
        theme: theme as "light" | "dark",
        notifications_enabled: notificationsEnabled,
        notification_hour: hourNum,
        notification_minute: minNum,
        notification_frequency: notificationFrequency,
        notification_morning_hour: mornH,
        notification_morning_minute: mornM,
        notification_evening_hour: eveH,
        notification_evening_minute: eveM,
        notification_weekday: notificationWeekday,
        notification_day_of_month: notificationDayOfMonth,
        pin_code: pinCode.trim() || null,
        gemini_api_key: geminiApiKey.trim() || null,
      });

      // Schedule or cancel reminders with complete frequency options
      const res = await notificationService.scheduleReminders({
        enabled: notificationsEnabled,
        frequency: notificationFrequency,
        hour: hourNum,
        minute: minNum,
        morningHour: mornH,
        morningMinute: mornM,
        eveningHour: eveH,
        eveningMinute: eveM,
        weekday: notificationWeekday,
        dayOfMonth: notificationDayOfMonth,
      });

      setScheduledRemindersCount(res.count);

      Alert.alert(
        "Enregistré !",
        notificationsEnabled
          ? `Vos préférences ont été sauvegardées. ${res.count} rappel(s) d'épargne planifié(s) avec succès ! 🎯`
          : "Vos préférences ont été mises à jour avec succès."
      );
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Impossible de sauvegarder le profil.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestGeminiKey = async () => {
    const key = geminiApiKey.trim();
    if (!key) {
      Alert.alert(
        "Mode Hors-ligne Actif",
        "Aucune clé API Gemini renseignée. RIZUX IA continuera de fonctionner en mode local 100% hors-ligne avec son moteur d'analyse embarqué."
      );
      setApiKeyStatus("idle");
      return;
    }

    setIsTestingApiKey(true);
    try {
      const res = await geminiService.testConnection(key);

      if (res.success) {
        setApiKeyStatus("valid");
        Alert.alert(
          "Connexion réussie ! ⚡",
          `Votre clé Google Gemini est valide et opérationnelle (Modèle connecté : ${res.model}). RIZUX IA est désormais propulsé par Google Cloud !`
        );
      } else {
        setApiKeyStatus("invalid");
        Alert.alert(
          "Clé Invalide ❌",
          res.error ||
            "La clé API a été rejetée par Google. Veuillez vérifier votre clé sur Google AI Studio."
        );
      }
    } catch (e: any) {
      Alert.alert(
        "Erreur réseau",
        "Impossible de joindre les serveurs Google. Vérifiez votre connexion internet ou réessayez plus tard."
      );
    } finally {
      setIsTestingApiKey(false);
    }
  };

  const handleTestNotification = async (inSeconds: number = 0) => {
    setIsTestingNotification(true);
    try {
      const sent = await notificationService.sendTestNotification(inSeconds);
      if (sent) {
        if (inSeconds > 0) {
          Alert.alert(
            "Rappel programmé dans 5s ⏱️",
            "Verrouillez votre téléphone ou passez sur l'écran d'accueil maintenant pour voir la notification arriver en arrière-plan !"
          );
        } else {
          Alert.alert(
            "Notification envoyée ! 🔔",
            "Vérifiez la barre d'état de votre téléphone, une notification Défi Épargne vient d'être émise avec succès !"
          );
        }
        await refreshScheduledCount();
      } else {
        Alert.alert(
          "Autorisation manquante",
          "Les notifications n'ont pas pu être délivrées. Assurez-vous d'avoir accordé l'autorisation dans les paramètres système de votre téléphone.",
          [
            { text: "Annuler", style: "cancel" },
            { text: "Ouvrir les Réglages", onPress: () => Linking.openSettings() },
          ]
        );
      }
    } catch (e: any) {
      Alert.alert("Erreur", e.message || "Erreur lors de l'émission de la notification.");
    } finally {
      setIsTestingNotification(false);
    }
  };

  const handleShareApp = async () => {
    try {
      await Share.share({
        title: "Défi Épargne — Mon application d'épargne",
        message:
          "Salut ! J'utilise Défi Épargne pour gérer mes défis financiers et booster mes économies avec le coach RIZUX IA. Découvre l'application et construis ta liberté financière ! 🚀💰",
      });
    } catch (e) {
      // User cancelled share
    }
  };

  const handleExport = async () => {
    if (!state) return;
    try {
      const content = JSON.stringify(state, null, 2);
      const fileUri = FileSystem.cacheDirectory + "defi_epargne_sauvegarde.json";
      await FileSystem.writeAsStringAsync(fileUri, content, { encoding: FileSystem.EncodingType.UTF8 });

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri, {
          mimeType: "application/json",
          dialogTitle: "Exporter la sauvegarde Défi Épargne",
          UTI: "public.json",
        });
      } else {
        await Share.share({
          message: content,
          title: "Export Défi Épargne DB",
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
      Alert.alert("Succès 🎉", "Vos données ont été importées et restaurées avec succès !");
    } catch (e: any) {
      Alert.alert("Erreur", "Format de fichier invalide ou erreur d'importation.");
    }
  };

  const handleReset = () => {
    Alert.alert(
      "Zone Dangereuse : Réinitialisation",
      "Cette action supprimera définitivement tous vos défis, versements et historiques. Cette action est irréversible. Êtes-vous absolument certain ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Tout effacer",
          style: "destructive",
          onPress: async () => {
            await clearDatabase();
            setFirstName("Épargnant");
            setAvatarEmoji("💰");
            setCurrencyCode("XOF");
            setTheme("light");
            setGeminiApiKey("");
            Alert.alert("Application Réinitialisée", "Toutes les données ont été remises à zéro.");
          },
        },
      ]
    );
  };

  const handleLogout = () => {
    Alert.alert(
      "Verrouiller l'application",
      "Voulez-vous verrouiller Défi Épargne et revenir à l'écran de déverrouillage sécurisé ?",
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Verrouiller",
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

      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.iconButton, { backgroundColor: `${themeColors.primary}12` }]}
          onPress={() => navigation.goBack()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={20} color={themeColors.foreground} />
        </TouchableOpacity>

        <View style={{ alignItems: "center" }}>
          <Text style={[styles.headerTitle, { color: themeColors.foreground }]}>Paramètres</Text>
          <Text style={[styles.headerSubtitle, { color: themeColors.mutedForeground }]}>
            Préférences & Personnalisation
          </Text>
        </View>

        <TouchableOpacity
          style={[styles.saveHeaderBtn, { backgroundColor: themeColors.primary }]}
          onPress={handleSaveProfile}
          disabled={isSaving}
          activeOpacity={0.8}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <CheckCheck size={18} color="white" />
          )}
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        {/* Profile Hero Card */}
        <LinearGradient
          colors={
            theme === "dark"
              ? ["#1e293b", "#0f172a"]
              : ["#eff6ff", "#f8fafc"]
          }
          style={[styles.heroCard, { borderColor: themeColors.border }]}
        >
          <View style={styles.heroTopRow}>
            <View style={[styles.avatarCircle, { backgroundColor: `${themeColors.primary}20`, borderColor: themeColors.primary }]}>
              <Text style={{ fontSize: 36 }}>{avatarEmoji}</Text>
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={[styles.heroLabel, { color: themeColors.mutedForeground }]}>Prénom / Pseudo</Text>
              <TextInput
                style={[
                  styles.heroNameInput,
                  { color: themeColors.foreground, borderBottomColor: themeColors.primary },
                ]}
                value={firstName}
                onChangeText={setFirstName}
                placeholder="Ex: David..."
                placeholderTextColor={themeColors.mutedForeground}
              />
            </View>
          </View>

          {/* Quick Avatar Emojis Selector */}
          <Text style={[styles.avatarPickTitle, { color: themeColors.mutedForeground }]}>
            Choisis ton avatar d'épargne :
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.avatarRow}>
            {QUICK_AVATARS.map((emoji) => (
              <TouchableOpacity
                key={emoji}
                style={[
                  styles.emojiChip,
                  avatarEmoji === emoji && {
                    backgroundColor: `${themeColors.primary}30`,
                    borderColor: themeColors.primary,
                    transform: [{ scale: 1.15 }],
                  },
                ]}
                onPress={() => setAvatarEmoji(emoji)}
              >
                <Text style={{ fontSize: 20 }}>{emoji}</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>

          {/* Quick Stats Summary */}
          <View style={[styles.statsRow, { borderTopColor: `${themeColors.border}80` }]}>
            <View style={styles.statItem}>
              <View style={[styles.statIconPill, { backgroundColor: "#3b82f620" }]}>
                <Target size={14} color="#3b82f6" />
              </View>
              <Text style={[styles.statValue, { color: themeColors.foreground }]}>
                {state?.challenges?.length || 0}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>Défis actifs</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIconPill, { backgroundColor: "#10b98120" }]}>
                <Coins size={14} color="#10b981" />
              </View>
              <Text style={[styles.statValue, { color: "#10b981" }]}>
                {formatMoney(gamification.totalSaved)}
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>Épargné</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={[styles.statIconPill, { backgroundColor: "#f59e0b20" }]}>
                <Flame size={14} color="#f59e0b" />
              </View>
              <Text style={[styles.statValue, { color: "#f59e0b" }]}>
                {gamification.streak} j
              </Text>
              <Text style={[styles.statLabel, { color: themeColors.mutedForeground }]}>Série actuelle</Text>
            </View>
          </View>
        </LinearGradient>

        {/* Coach RIZUX IA Section */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconBadge, { backgroundColor: "#8b5cf620" }]}>
            <Bot size={16} color="#8b5cf6" />
          </View>
          <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>
            Coach RIZUX IA & Connexion Gemini
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.iaHeaderRow}>
            <View style={{ flex: 1 }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                <Text style={[styles.cardSubTitle, { color: themeColors.foreground }]}>
                  Moteur RIZUX IA
                </Text>
                {geminiApiKey.trim() ? (
                  <View style={styles.badgeOnline}>
                    <Text style={styles.badgeOnlineText}>Cloud Gemini 1.5 ⚡</Text>
                  </View>
                ) : (
                  <View style={styles.badgeOffline}>
                    <Text style={styles.badgeOfflineText}>Mode Local Hors-ligne 🛡️</Text>
                  </View>
                )}
              </View>
              <Text style={[styles.cardDesc, { color: themeColors.mutedForeground, marginTop: 4 }]}>
                RIZUX IA fonctionne à 100% sans connexion internet. Pour des analyses financières approfondies et des conseils avancés, ajoute ta clé Google Gemini gratuite.
              </Text>
            </View>
          </View>

          {/* Gemini API Key Input */}
          <Text style={[styles.inputLabel, { color: themeColors.foreground, marginTop: 12 }]}>
            Clé API Google Gemini (AI Studio)
          </Text>
          <View style={styles.keyInputContainer}>
            <TextInput
              style={[
                styles.keyInput,
                {
                  color: themeColors.foreground,
                  backgroundColor: themeColors.background,
                  borderColor:
                    apiKeyStatus === "valid"
                      ? "#10b981"
                      : apiKeyStatus === "invalid"
                      ? "#ef4444"
                      : themeColors.border,
                },
              ]}
              value={geminiApiKey}
              onChangeText={(text) => {
                setGeminiApiKey(text);
                setApiKeyStatus("idle");
              }}
              placeholder="Ex: AIzaSyBxxxxxxxxxxxx..."
              placeholderTextColor={themeColors.mutedForeground}
              secureTextEntry={!showApiKey}
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.eyeBtn}
              onPress={() => setShowApiKey(!showApiKey)}
            >
              {showApiKey ? (
                <EyeOff size={18} color={themeColors.mutedForeground} />
              ) : (
                <Eye size={18} color={themeColors.mutedForeground} />
              )}
            </TouchableOpacity>
          </View>

          {/* Test & Get Key Buttons */}
          <View style={styles.iaActionRow}>
            <TouchableOpacity
              style={[styles.testKeyBtn, { backgroundColor: `${themeColors.primary}15`, borderColor: themeColors.primary }]}
              onPress={handleTestGeminiKey}
              disabled={isTestingApiKey}
            >
              {isTestingApiKey ? (
                <ActivityIndicator size="small" color={themeColors.primary} />
              ) : (
                <>
                  <Sparkles size={14} color={themeColors.primary} />
                  <Text style={[styles.testKeyBtnText, { color: themeColors.primary }]}>
                    Tester la connexion
                  </Text>
                </>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.getKeyLink}
              onPress={() => Linking.openURL("https://aistudio.google.com/app/apikey")}
            >
              <Text style={{ fontSize: 11, color: themeColors.primary, fontWeight: "600" }}>
                Obtenir une clé gratuite
              </Text>
              <ExternalLink size={12} color={themeColors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Preferences: Currency & Theme */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconBadge, { backgroundColor: "#3b82f620" }]}>
            <Coins size={16} color="#3b82f6" />
          </View>
          <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>
            Devise & Thème d'affichage
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          {/* Theme switcher */}
          <Text style={[styles.inputLabel, { color: themeColors.foreground }]}>Thème visuel</Text>
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
                Clair ☀️
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
                Sombre 🌙
              </Text>
            </TouchableOpacity>
          </View>

          {/* Quick Currencies Chips */}
          <Text style={[styles.inputLabel, { color: themeColors.foreground, marginTop: 16 }]}>
            Devise d'épargne : {selectedCurrency?.flag} {selectedCurrency?.name} ({currencyCode})
          </Text>

          <View style={styles.popularCurrenciesRow}>
            {POPULAR_CURRENCIES.map((code) => {
              const cur = findCurrency(code);
              const isSelected = currencyCode === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[
                    styles.currencyChip,
                    {
                      backgroundColor: isSelected ? themeColors.primary : themeColors.background,
                      borderColor: isSelected ? themeColors.primary : themeColors.border,
                    },
                  ]}
                  onPress={() => setCurrencyCode(code)}
                >
                  <Text style={{ fontSize: 13 }}>{cur?.flag}</Text>
                  <Text
                    style={[
                      styles.currencyChipText,
                      { color: isSelected ? "white" : themeColors.foreground },
                    ]}
                  >
                    {code}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Search all currencies */}
          <TouchableOpacity
            style={[styles.dropdownTrigger, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
            onPress={() => setShowCurrencyDropdown(!showCurrencyDropdown)}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <Search size={16} color={themeColors.mutedForeground} />
              <Text style={{ color: themeColors.foreground, fontSize: 13 }}>
                {showCurrencyDropdown ? "Fermer la liste des devises" : "Chercher une autre devise..."}
              </Text>
            </View>
            <Text style={{ fontSize: 11, color: themeColors.primary, fontWeight: "bold" }}>
              {showCurrencyDropdown ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {showCurrencyDropdown && (
            <View style={[styles.currencyListContainer, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}>
              <TextInput
                style={[styles.currencySearchInput, { color: themeColors.foreground, borderColor: themeColors.border }]}
                placeholder="Filtrer (ex: CFA, Dollar, Euro, NGN...)"
                placeholderTextColor={themeColors.mutedForeground}
                value={currencySearch}
                onChangeText={setCurrencySearch}
              />
              <ScrollView style={{ maxHeight: 200 }} nestedScrollEnabled>
                {filteredCurrencies.map((cur) => (
                  <TouchableOpacity
                    key={cur.code}
                    style={[
                      styles.currencyItem,
                      currencyCode === cur.code && { backgroundColor: `${themeColors.primary}15` },
                    ]}
                    onPress={() => {
                      setCurrencyCode(cur.code);
                      setShowCurrencyDropdown(false);
                      setCurrencySearch("");
                    }}
                  >
                    <Text style={{ fontSize: 16 }}>{cur.flag}</Text>
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={[styles.currencyItemName, { color: themeColors.foreground }]}>
                        {cur.name} ({cur.code})
                      </Text>
                      <Text style={{ fontSize: 11, color: themeColors.mutedForeground }}>
                        Symbole: {cur.symbol}
                      </Text>
                    </View>
                    {currencyCode === cur.code && <Check size={16} color={themeColors.primary} />}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          )}
        </View>

        {/* Security / PIN Lock */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconBadge, { backgroundColor: "#10b98120" }]}>
            <Shield size={16} color="#10b981" />
          </View>
          <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>
            Sécurité & Confidentialité
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <Text style={[styles.cardSubTitle, { color: themeColors.foreground }]}>
            Code PIN de verrouillage
          </Text>
          <Text style={[styles.cardDesc, { color: themeColors.mutedForeground, marginTop: 4 }]}>
            Verrouille l'application à l'ouverture pour protéger la confidentialité de vos économies.
          </Text>

          <View style={styles.pinInputRow}>
            <TextInput
              style={[
                styles.pinInput,
                {
                  color: themeColors.foreground,
                  backgroundColor: themeColors.background,
                  borderColor: themeColors.border,
                },
              ]}
              value={pinCode}
              onChangeText={(text) => {
                const cleaned = text.replace(/[^0-9]/g, "");
                if (cleaned.length <= 4) setPinCode(cleaned);
              }}
              placeholder="4 chiffres (vide = désactivé)"
              placeholderTextColor={themeColors.mutedForeground}
              keyboardType="numeric"
              secureTextEntry={true}
              maxLength={4}
            />

            {pinCode.length > 0 && (
              <TouchableOpacity
                style={[styles.removePinBtn, { backgroundColor: `${themeColors.destructive}15` }]}
                onPress={() => setPinCode("")}
              >
                <Text style={{ fontSize: 12, color: themeColors.destructive, fontWeight: "bold" }}>
                  Désactiver PIN
                </Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Notifications & Reminders - Enhanced with 4 Frequencies */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconBadge, { backgroundColor: "#f59e0b20" }]}>
            <Bell size={16} color="#f59e0b" />
          </View>
          <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>
            Rappels & Fréquences d'Épargne
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          {/* Main Toggle */}
          <View style={styles.toggleRow}>
            <View style={{ flex: 1, marginRight: 12 }}>
              <Text style={[styles.cardSubTitle, { color: themeColors.foreground }]}>
                Rappels programmés d'épargne
              </Text>
              <Text style={[styles.cardDesc, { color: themeColors.mutedForeground, marginTop: 2 }]}>
                Reçois des notifications motivantes pour ne jamais oublier de cocher tes versements.
              </Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={handleToggleNotifications}
              trackColor={{ false: themeColors.border, true: themeColors.primary }}
            />
          </View>

          {/* Active Status Badge */}
          <View
            style={[
              styles.alarmStatusPill,
              {
                backgroundColor: notificationsEnabled ? "#10b98115" : `${themeColors.mutedForeground}15`,
                borderColor: notificationsEnabled ? "#10b981" : themeColors.border,
              },
            ]}
          >
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6, flex: 1 }}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: notificationsEnabled ? "#10b981" : themeColors.mutedForeground },
                ]}
              />
              <Text
                style={{
                  fontSize: 11,
                  fontWeight: "bold",
                  color: notificationsEnabled ? "#10b981" : themeColors.mutedForeground,
                }}
              >
                {notificationsEnabled
                  ? scheduledRemindersCount > 0
                    ? `${scheduledRemindersCount} alarme(s) active(s) programmée(s)`
                    : "Rappels activés (en attente de sauvegarde)"
                  : "Rappels actuellement désactivés"}
              </Text>
            </View>
            <TouchableOpacity onPress={refreshScheduledCount} style={{ padding: 4 }}>
              <RefreshCw size={12} color={themeColors.mutedForeground} />
            </TouchableOpacity>
          </View>

          {notificationsEnabled && (
            <View style={{ marginTop: 14 }}>
              {/* 4 Frequencies selector */}
              <Text style={[styles.inputLabel, { color: themeColors.foreground }]}>
                Fréquence des rappels
              </Text>
              <View style={styles.frequencyRow}>
                {([
                  ["daily", "1x / jour", "Quotidien"],
                  ["twice_daily", "2x / jour", "Matin & Soir"],
                  ["weekly", "1x / sem.", "Hebdo"],
                  ["monthly", "1x / mois", "Paie & Bilan"],
                ] as const).map(([freq, label, desc]) => {
                  const isSelected = notificationFrequency === freq;
                  return (
                    <TouchableOpacity
                      key={freq}
                      style={[
                        styles.freqBtn,
                        {
                          backgroundColor: isSelected ? `${themeColors.primary}20` : themeColors.background,
                          borderColor: isSelected ? themeColors.primary : themeColors.border,
                        },
                      ]}
                      onPress={() => setNotificationFrequency(freq)}
                    >
                      <Text
                        style={[
                          styles.freqBtnTitle,
                          { color: isSelected ? themeColors.primary : themeColors.foreground },
                        ]}
                      >
                        {label}
                      </Text>
                      <Text style={{ fontSize: 9, color: themeColors.mutedForeground, marginTop: 2 }}>
                        {desc}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* DETAILS BASED ON SELECTED FREQUENCY */}

              {/* 1. DAILY FREQUENCY */}
              {notificationFrequency === "daily" && (
                <View style={styles.freqDetailBox}>
                  <Text style={[styles.freqDetailDesc, { color: themeColors.mutedForeground }]}>
                    💡 Un rappel motivant vous sera envoyé chaque jour à l'heure précise indiquée ci-dessous.
                  </Text>

                  {/* Quick Preset Hours */}
                  <View style={styles.quickHoursRow}>
                    {QUICK_HOURS.map((preset) => (
                      <TouchableOpacity
                        key={preset.label}
                        style={[
                          styles.quickHourChip,
                          notificationHour === preset.hour &&
                            notificationMinute === preset.minute && {
                              backgroundColor: `${themeColors.primary}20`,
                              borderColor: themeColors.primary,
                            },
                          { backgroundColor: themeColors.background, borderColor: themeColors.border },
                        ]}
                        onPress={() => {
                          setNotificationHour(preset.hour);
                          setNotificationMinute(preset.minute);
                        }}
                      >
                        <Clock size={12} color={themeColors.primary} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color:
                              notificationHour === preset.hour && notificationMinute === preset.minute
                                ? themeColors.primary
                                : themeColors.foreground,
                          }}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Time Inputs */}
                  <View style={styles.timeInputsContainer}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timeSubLabel, { color: themeColors.mutedForeground }]}>Heure (0 - 23)</Text>
                      <TextInput
                        style={[styles.timeInput, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                        keyboardType="numeric"
                        value={notificationHour}
                        onChangeText={(t) => {
                          const c = t.replace(/[^0-9]/g, "");
                          const n = parseInt(c, 10);
                          if (c === "" || (n >= 0 && n <= 23)) setNotificationHour(c);
                        }}
                        maxLength={2}
                      />
                    </View>
                    <Text style={[styles.timeColon, { color: themeColors.mutedForeground }]}>:</Text>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timeSubLabel, { color: themeColors.mutedForeground }]}>Minute (0 - 59)</Text>
                      <TextInput
                        style={[styles.timeInput, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                        keyboardType="numeric"
                        value={notificationMinute}
                        onChangeText={(t) => {
                          const c = t.replace(/[^0-9]/g, "");
                          const n = parseInt(c, 10);
                          if (c === "" || (n >= 0 && n <= 59)) setNotificationMinute(c);
                        }}
                        maxLength={2}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* 2. TWICE DAILY FREQUENCY (Morning & Evening) */}
              {notificationFrequency === "twice_daily" && (
                <View style={styles.freqDetailBox}>
                  <Text style={[styles.freqDetailDesc, { color: themeColors.mutedForeground }]}>
                    💡 Deux rappels équilibrés par jour : un coup d'élan le matin et un bilan d'épargne le soir.
                  </Text>

                  {/* Morning Row */}
                  <View style={[styles.dualTimeRow, { borderColor: themeColors.border }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Sunrise size={18} color="#f59e0b" />
                      <Text style={[styles.dualTimeTitle, { color: themeColors.foreground }]}>Rappel du matin :</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <TextInput
                        style={[styles.smallTimeInput, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                        keyboardType="numeric"
                        value={notificationMorningHour}
                        onChangeText={(t) => {
                          const c = t.replace(/[^0-9]/g, "");
                          const n = parseInt(c, 10);
                          if (c === "" || (n >= 0 && n <= 23)) setNotificationMorningHour(c);
                        }}
                        maxLength={2}
                        placeholder="08"
                        placeholderTextColor={themeColors.mutedForeground}
                      />
                      <Text style={{ fontWeight: "bold", color: themeColors.mutedForeground }}>:</Text>
                      <TextInput
                        style={[styles.smallTimeInput, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                        keyboardType="numeric"
                        value={notificationMorningMinute}
                        onChangeText={(t) => {
                          const c = t.replace(/[^0-9]/g, "");
                          const n = parseInt(c, 10);
                          if (c === "" || (n >= 0 && n <= 59)) setNotificationMorningMinute(c);
                        }}
                        maxLength={2}
                        placeholder="30"
                        placeholderTextColor={themeColors.mutedForeground}
                      />
                    </View>
                  </View>

                  {/* Evening Row */}
                  <View style={[styles.dualTimeRow, { borderColor: themeColors.border, marginTop: 8 }]}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Sunset size={18} color="#3b82f6" />
                      <Text style={[styles.dualTimeTitle, { color: themeColors.foreground }]}>Rappel du soir :</Text>
                    </View>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <TextInput
                        style={[styles.smallTimeInput, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                        keyboardType="numeric"
                        value={notificationEveningHour}
                        onChangeText={(t) => {
                          const c = t.replace(/[^0-9]/g, "");
                          const n = parseInt(c, 10);
                          if (c === "" || (n >= 0 && n <= 23)) setNotificationEveningHour(c);
                        }}
                        maxLength={2}
                        placeholder="20"
                        placeholderTextColor={themeColors.mutedForeground}
                      />
                      <Text style={{ fontWeight: "bold", color: themeColors.mutedForeground }}>:</Text>
                      <TextInput
                        style={[styles.smallTimeInput, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                        keyboardType="numeric"
                        value={notificationEveningMinute}
                        onChangeText={(t) => {
                          const c = t.replace(/[^0-9]/g, "");
                          const n = parseInt(c, 10);
                          if (c === "" || (n >= 0 && n <= 59)) setNotificationEveningMinute(c);
                        }}
                        maxLength={2}
                        placeholder="00"
                        placeholderTextColor={themeColors.mutedForeground}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* 3. WEEKLY FREQUENCY */}
              {notificationFrequency === "weekly" && (
                <View style={styles.freqDetailBox}>
                  <Text style={[styles.freqDetailDesc, { color: themeColors.mutedForeground }]}>
                    💡 Choisissez le jour de la semaine et l'heure pour votre grand bilan hebdomadaire.
                  </Text>

                  {/* Day chips */}
                  <Text style={[styles.timeSubLabel, { color: themeColors.foreground, marginTop: 6, fontWeight: "bold" }]}>
                    Jour de la semaine :
                  </Text>
                  <View style={styles.weekdaysRow}>
                    {WEEKDAYS.map((wd) => {
                      const isWdSelected = notificationWeekday === wd.id;
                      return (
                        <TouchableOpacity
                          key={wd.id}
                          style={[
                            styles.weekdayChip,
                            {
                              backgroundColor: isWdSelected ? themeColors.primary : themeColors.background,
                              borderColor: isWdSelected ? themeColors.primary : themeColors.border,
                            },
                          ]}
                          onPress={() => setNotificationWeekday(wd.id)}
                        >
                          <Text
                            style={[
                              styles.weekdayChipText,
                              { color: isWdSelected ? "white" : themeColors.foreground },
                            ]}
                          >
                            {wd.short}
                          </Text>
                        </TouchableOpacity>
                      );
                    })}
                  </View>

                  {/* Time Input for Weekly */}
                  <Text style={[styles.timeSubLabel, { color: themeColors.foreground, marginTop: 10, fontWeight: "bold" }]}>
                    Heure du rappel hebdomadaire :
                  </Text>
                  <View style={styles.timeInputsContainer}>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={[styles.timeInput, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                        keyboardType="numeric"
                        value={notificationHour}
                        onChangeText={(t) => {
                          const c = t.replace(/[^0-9]/g, "");
                          const n = parseInt(c, 10);
                          if (c === "" || (n >= 0 && n <= 23)) setNotificationHour(c);
                        }}
                        maxLength={2}
                        placeholder="19"
                        placeholderTextColor={themeColors.mutedForeground}
                      />
                    </View>
                    <Text style={[styles.timeColon, { color: themeColors.mutedForeground }]}>:</Text>
                    <View style={{ flex: 1 }}>
                      <TextInput
                        style={[styles.timeInput, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                        keyboardType="numeric"
                        value={notificationMinute}
                        onChangeText={(t) => {
                          const c = t.replace(/[^0-9]/g, "");
                          const n = parseInt(c, 10);
                          if (c === "" || (n >= 0 && n <= 59)) setNotificationMinute(c);
                        }}
                        maxLength={2}
                        placeholder="00"
                        placeholderTextColor={themeColors.mutedForeground}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* 4. MONTHLY FREQUENCY */}
              {notificationFrequency === "monthly" && (
                <View style={styles.freqDetailBox}>
                  <Text style={[styles.freqDetailDesc, { color: themeColors.mutedForeground }]}>
                    💡 Idéal pour épargner le jour de paie (ex: 28 du mois) avant toute dépense !
                  </Text>

                  {/* Quick Month Day Chips */}
                  <View style={styles.quickHoursRow}>
                    {QUICK_MONTH_DAYS.map((preset) => (
                      <TouchableOpacity
                        key={preset.day}
                        style={[
                          styles.quickHourChip,
                          notificationDayOfMonth === preset.day && {
                            backgroundColor: `${themeColors.primary}20`,
                            borderColor: themeColors.primary,
                          },
                          { backgroundColor: themeColors.background, borderColor: themeColors.border },
                        ]}
                        onPress={() => setNotificationDayOfMonth(preset.day)}
                      >
                        <Calendar size={12} color={themeColors.primary} />
                        <Text
                          style={{
                            fontSize: 11,
                            fontWeight: "600",
                            color:
                              notificationDayOfMonth === preset.day
                                ? themeColors.primary
                                : themeColors.foreground,
                          }}
                        >
                          {preset.label}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>

                  {/* Day of Month Input */}
                  <View style={{ flexDirection: "row", alignItems: "center", gap: 10, marginTop: 8 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timeSubLabel, { color: themeColors.mutedForeground }]}>Jour du mois (1 - 31)</Text>
                      <TextInput
                        style={[styles.timeInput, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                        keyboardType="numeric"
                        value={String(notificationDayOfMonth)}
                        onChangeText={(t) => {
                          const c = t.replace(/[^0-9]/g, "");
                          const n = parseInt(c, 10);
                          if (c === "" || (n >= 1 && n <= 31)) setNotificationDayOfMonth(n || 1);
                        }}
                        maxLength={2}
                        placeholder="28"
                        placeholderTextColor={themeColors.mutedForeground}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.timeSubLabel, { color: themeColors.mutedForeground }]}>Heure (0 - 23)</Text>
                      <TextInput
                        style={[styles.timeInput, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
                        keyboardType="numeric"
                        value={notificationHour}
                        onChangeText={(t) => {
                          const c = t.replace(/[^0-9]/g, "");
                          const n = parseInt(c, 10);
                          if (c === "" || (n >= 0 && n <= 23)) setNotificationHour(c);
                        }}
                        maxLength={2}
                        placeholder="10"
                        placeholderTextColor={themeColors.mutedForeground}
                      />
                    </View>
                  </View>
                </View>
              )}

              {/* TEST NOTIFICATION BUTTONS */}
              <View style={styles.testButtonsRow}>
                <TouchableOpacity
                  style={[styles.testNotificationBtn, { backgroundColor: `${themeColors.primary}12`, borderColor: themeColors.primary }]}
                  onPress={() => handleTestNotification(0)}
                  disabled={isTestingNotification}
                >
                  {isTestingNotification ? (
                    <ActivityIndicator size="small" color={themeColors.primary} />
                  ) : (
                    <>
                      <Bell size={15} color={themeColors.primary} />
                      <Text style={[styles.testNotificationText, { color: themeColors.primary }]}>
                        Tester immédiatement 🔔
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.testNotificationBtn, { backgroundColor: `${themeColors.primary}12`, borderColor: themeColors.primary }]}
                  onPress={() => handleTestNotification(5)}
                  disabled={isTestingNotification}
                >
                  <Clock size={15} color={themeColors.primary} />
                  <Text style={[styles.testNotificationText, { color: themeColors.primary }]}>
                    Tester en 5s ⏱️
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>

        {/* Database & Storage */}
        <View style={styles.sectionHeader}>
          <View style={[styles.sectionIconBadge, { backgroundColor: "#06b6d420" }]}>
            <Download size={16} color="#06b6d4" />
          </View>
          <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>
            Sauvegarde & Données (100% Hors-ligne)
          </Text>
        </View>

        <View style={[styles.card, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <TouchableOpacity
            style={[styles.utilityBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border }]}
            onPress={handleExport}
            activeOpacity={0.7}
          >
            <View style={[styles.utilityIconBadge, { backgroundColor: "#3b82f615" }]}>
              <Download size={18} color="#3b82f6" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.utilityTitle, { color: themeColors.foreground }]}>
                Exporter la sauvegarde (JSON)
              </Text>
              <Text style={[styles.utilityDesc, { color: themeColors.mutedForeground }]}>
                Crée un fichier de secours de tous vos défis et versements
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.utilityBtn, { backgroundColor: themeColors.background, borderColor: themeColors.border, marginTop: 10 }]}
            onPress={handleImport}
            activeOpacity={0.7}
          >
            <View style={[styles.utilityIconBadge, { backgroundColor: "#10b98115" }]}>
              <Upload size={18} color="#10b981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.utilityTitle, { color: themeColors.foreground }]}>
                Importer une sauvegarde
              </Text>
              <Text style={[styles.utilityDesc, { color: themeColors.mutedForeground }]}>
                Restaurer des données à partir d'un fichier .json
              </Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.utilityBtn,
              {
                backgroundColor: `${themeColors.destructive}08`,
                borderColor: `${themeColors.destructive}40`,
                marginTop: 10,
              },
            ]}
            onPress={handleReset}
            activeOpacity={0.7}
          >
            <View style={[styles.utilityIconBadge, { backgroundColor: `${themeColors.destructive}20` }]}>
              <Trash2 size={18} color={themeColors.destructive} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.utilityTitle, { color: themeColors.destructive }]}>
                Réinitialiser toutes les données
              </Text>
              <Text style={[styles.utilityDesc, { color: themeColors.mutedForeground }]}>
                Efface définitivement l'historique et les défis
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Share Application */}
        <TouchableOpacity
          style={[styles.shareCard, { backgroundColor: `${themeColors.primary}12`, borderColor: themeColors.primary }]}
          onPress={handleShareApp}
          activeOpacity={0.8}
        >
          <View style={[styles.shareIconPill, { backgroundColor: themeColors.primary }]}>
            <Share2 size={20} color="white" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={[styles.shareTitle, { color: themeColors.primary }]}>
              Partager Défi Épargne 🌟
            </Text>
            <Text style={[styles.shareDesc, { color: themeColors.mutedForeground }]}>
              Invite tes amis à épargner et à relever leurs défis avec toi !
            </Text>
          </View>
        </TouchableOpacity>

        {/* Big Save Button */}
        <TouchableOpacity
          style={[styles.bigSaveBtn, { backgroundColor: themeColors.primary }]}
          onPress={handleSaveProfile}
          disabled={isSaving}
          activeOpacity={0.85}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="white" />
          ) : (
            <>
              <Save size={20} color="white" />
              <Text style={styles.bigSaveBtnText}>Sauvegarder les modifications</Text>
            </>
          )}
        </TouchableOpacity>

        {/* About App */}
        <View style={[styles.aboutCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 8 }}>
            <Info size={16} color={themeColors.primary} />
            <Text style={[styles.aboutTitle, { color: themeColors.foreground }]}>À propos de Défi Épargne</Text>
          </View>
          <Text style={[styles.aboutDesc, { color: themeColors.mutedForeground }]}>
            Application mobile conçue pour développer votre discipline financière et concrétiser vos projets grâce à la méthode des petits pas et au coach RIZUX IA.
          </Text>

          <View style={[styles.aboutDivider, { backgroundColor: themeColors.border }]} />

          <View style={styles.aboutMetaRow}>
            <Text style={[styles.aboutMetaLabel, { color: themeColors.mutedForeground }]}>Créateur :</Text>
            <Text style={[styles.aboutMetaValue, { color: themeColors.foreground }]}>Build by Rizux</Text>
          </View>
          <View style={styles.aboutMetaRow}>
            <Text style={[styles.aboutMetaLabel, { color: themeColors.mutedForeground }]}>Email support :</Text>
            <Text style={[styles.aboutMetaValue, { color: themeColors.primary }]}>ericaguigahpro@gmail.com</Text>
          </View>
          <View style={styles.aboutMetaRow}>
            <Text style={[styles.aboutMetaLabel, { color: themeColors.mutedForeground }]}>Téléphone :</Text>
            <Text style={[styles.aboutMetaValue, { color: themeColors.foreground }]}>+228 96 63 43 45</Text>
          </View>
          <View style={styles.aboutMetaRow}>
            <Text style={[styles.aboutMetaLabel, { color: themeColors.mutedForeground }]}>Version de l'app :</Text>
            <Text style={[styles.aboutMetaValue, { color: themeColors.foreground }]}>1.0.0 (Production)</Text>
          </View>
        </View>

        {/* Lock / Logout Button */}
        <TouchableOpacity
          style={[styles.lockBtn, { borderColor: `${themeColors.destructive}50` }]}
          onPress={handleLogout}
          activeOpacity={0.7}
        >
          <LogOut size={16} color={themeColors.destructive} />
          <Text style={[styles.lockBtnText, { color: themeColors.destructive }]}>
            Verrouiller l'application
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? (StatusBar.currentHeight || 24) + 6 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  iconButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  saveHeaderBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 16,
  },
  heroTopRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
  },
  heroLabel: {
    fontSize: 11,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  heroNameInput: {
    fontSize: 18,
    fontWeight: "bold",
    borderBottomWidth: 1.5,
    paddingVertical: 4,
    marginTop: 4,
  },
  avatarPickTitle: {
    fontSize: 11,
    fontWeight: "600",
    marginTop: 14,
    marginBottom: 6,
  },
  avatarRow: {
    flexDirection: "row",
    paddingVertical: 4,
  },
  emojiChip: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    borderColor: "transparent",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 6,
  },
  statsRow: {
    flexDirection: "row",
    borderTopWidth: 1,
    marginTop: 14,
    paddingTop: 12,
    justifyContent: "space-around",
    alignItems: "center",
  },
  statItem: {
    alignItems: "center",
  },
  statIconPill: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 13,
    fontWeight: "bold",
  },
  statLabel: {
    fontSize: 10,
    marginTop: 1,
  },
  statDivider: {
    width: 1,
    height: 28,
    backgroundColor: "rgba(150,150,150,0.2)",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 14,
    marginBottom: 8,
  },
  sectionIconBadge: {
    width: 26,
    height: 26,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "bold",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  card: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginBottom: 10,
  },
  iaHeaderRow: {
    flexDirection: "row",
    alignItems: "flex-start",
  },
  cardSubTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  cardDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  badgeOnline: {
    backgroundColor: "#10b98120",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeOnlineText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#10b981",
  },
  badgeOffline: {
    backgroundColor: "#3b82f620",
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  badgeOfflineText: {
    fontSize: 10,
    fontWeight: "bold",
    color: "#3b82f6",
  },
  inputLabel: {
    fontSize: 12,
    fontWeight: "bold",
    marginBottom: 6,
  },
  keyInputContainer: {
    flexDirection: "row",
    alignItems: "center",
    position: "relative",
  },
  keyInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingLeft: 12,
    paddingRight: 40,
    fontSize: 12,
  },
  eyeBtn: {
    position: "absolute",
    right: 12,
    padding: 6,
  },
  iaActionRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  testKeyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    borderWidth: 1,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  testKeyBtnText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  getKeyLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
  },
  themeToggleRow: {
    flexDirection: "row",
    gap: 10,
  },
  themeBtn: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
  },
  themeBtnText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  popularCurrenciesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  currencyChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
  },
  currencyChipText: {
    fontSize: 12,
    fontWeight: "bold",
  },
  dropdownTrigger: {
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 4,
  },
  currencyListContainer: {
    borderWidth: 1,
    borderRadius: 12,
    marginTop: 6,
    padding: 8,
  },
  currencySearchInput: {
    height: 38,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 12,
    marginBottom: 6,
  },
  currencyItem: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  currencyItemName: {
    fontSize: 13,
    fontWeight: "600",
  },
  pinInputRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginTop: 10,
  },
  pinInput: {
    flex: 1,
    height: 44,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: "center",
    letterSpacing: 6,
  },
  removePinBtn: {
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderRadius: 12,
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alarmStatusPill: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 10,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  frequencyRow: {
    flexDirection: "row",
    gap: 6,
    marginTop: 6,
    marginBottom: 10,
  },
  freqBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 2,
    borderRadius: 12,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  freqBtnTitle: {
    fontSize: 11,
    fontWeight: "bold",
  },
  freqDetailBox: {
    marginTop: 4,
    marginBottom: 12,
  },
  freqDetailDesc: {
    fontSize: 11,
    lineHeight: 16,
    marginBottom: 10,
  },
  quickHoursRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
    marginBottom: 10,
  },
  quickHourChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 16,
    borderWidth: 1,
  },
  timeInputsContainer: {
    flexDirection: "row",
    gap: 10,
    alignItems: "center",
  },
  timeSubLabel: {
    fontSize: 10,
    marginBottom: 4,
  },
  timeInput: {
    height: 42,
    borderWidth: 1,
    borderRadius: 12,
    textAlign: "center",
    fontSize: 15,
    fontWeight: "bold",
  },
  timeColon: {
    fontSize: 20,
    fontWeight: "bold",
    marginTop: 16,
  },
  dualTimeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  dualTimeTitle: {
    fontSize: 13,
    fontWeight: "600",
  },
  smallTimeInput: {
    width: 44,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    textAlign: "center",
    fontSize: 14,
    fontWeight: "bold",
  },
  weekdaysRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 4,
    marginBottom: 10,
  },
  weekdayChip: {
    flex: 1,
    height: 36,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  weekdayChipText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  testButtonsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 10,
  },
  testNotificationBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    height: 40,
    borderRadius: 12,
    borderWidth: 1,
  },
  testNotificationText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  utilityBtn: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    borderRadius: 14,
    borderWidth: 1,
  },
  utilityIconBadge: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  utilityTitle: {
    fontSize: 13,
    fontWeight: "bold",
  },
  utilityDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  shareCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 18,
    padding: 14,
    marginVertical: 10,
  },
  shareIconPill: {
    width: 42,
    height: 42,
    borderRadius: 21,
    justifyContent: "center",
    alignItems: "center",
  },
  shareTitle: {
    fontSize: 14,
    fontWeight: "bold",
  },
  shareDesc: {
    fontSize: 11,
    marginTop: 2,
  },
  bigSaveBtn: {
    height: 52,
    borderRadius: 26,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
    marginVertical: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.15,
    shadowRadius: 5,
    elevation: 3,
  },
  bigSaveBtnText: {
    color: "white",
    fontSize: 15,
    fontWeight: "bold",
  },
  aboutCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 16,
    marginTop: 4,
    marginBottom: 10,
  },
  aboutTitle: {
    fontSize: 13,
    fontWeight: "bold",
  },
  aboutDesc: {
    fontSize: 12,
    lineHeight: 18,
  },
  aboutDivider: {
    height: 1,
    marginVertical: 10,
  },
  aboutMetaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 2,
  },
  aboutMetaLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  aboutMetaValue: {
    fontSize: 11,
    fontWeight: "bold",
  },
  lockBtn: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 8,
    height: 44,
    borderRadius: 22,
    borderWidth: 1,
    marginTop: 10,
  },
  lockBtnText: {
    fontSize: 13,
    fontWeight: "bold",
  },
});
