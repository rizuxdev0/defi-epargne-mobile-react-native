import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView, Platform,
  TextInput,
  KeyboardAvoidingView,
  FlatList,
} from "react-native";
import { ArrowLeft, Send, Sparkles, BrainCircuit } from "lucide-react-native";
import { useApp } from "../services/AppContext";
import { useMoneyFormatter } from "../hooks/useMoneyFormatter";
import { COLORS } from "../lib/theme";

const STARTERS = [
  { icon: "📊", label: "Analyse mes défis en cours" },
  { icon: "💡", label: "3 astuces pour épargner plus ce mois" },
  { icon: "🛡️", label: "Construis-moi un plan fonds d'urgence" },
  { icon: "🎯", label: "Quel défi me conseilles-tu maintenant ?" },
];

export default function CoachScreen({ navigation }: any) {
  const { profile, challenges, installments, threads, messages, createThread, addMessage } = useApp();
  const fmt = useMoneyFormatter();
  const themeColors = COLORS[profile?.theme || "light"];

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  // Initialize or pick the first thread
  useEffect(() => {
    const initThread = async () => {
      if (threads.length > 0) {
        setActiveThreadId(threads[0].id);
      } else {
        const newT = await createThread("Conseiller Épargne");
        setActiveThreadId(newT.id);
        // Add initial message
        await addMessage(
          newT.id,
          "model",
          "Bonjour ! Je suis Kobo, ton coach d'épargne intelligent 🤖. Dis-moi quel est ton objectif ou clique sur l'une des suggestions ci-dessous pour démarrer notre séance !"
        );
      }
    };
    initThread();
  }, [threads]);

  const activeMessages = activeThreadId
    ? messages.filter((m) => m.thread_id === activeThreadId)
    : [];

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || !activeThreadId) return;

    setInputText("");
    await addMessage(activeThreadId, "user", textToSend.trim());
    setIsTyping(true);

    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    // Generate simulated offline reply based on user message
    setTimeout(async () => {
      let reply = "";
      const lower = textToSend.toLowerCase();

      // Gather stats for personalization
      const active = challenges.filter((c) => c.status === "active");
      const completed = challenges.filter((c) => c.status === "completed");
      const totalSaved = installments.filter((i) => i.is_checked).reduce((s, i) => s + i.amount, 0);

      if (lower.includes("analyse") || lower.includes("défis") || lower.includes("en cours")) {
        if (active.length === 0) {
          reply = "Tu n'as aucun défi actif pour le moment. Je te conseille d'en créer un depuis ton tableau de bord ! Quel est ton projet actuel (voyage, tech, urgence) ?";
        } else {
          reply = `Voici ton analyse d'épargne en cours :\n\n• Tu as actuellement **${active.length} défi(s) actif(s)**.\n• Tu as accumulé un total de **${fmt(totalSaved)}**.\n\n` +
            active.map((c) => {
              const insts = installments.filter((i) => i.challenge_id === c.id);
              const saved = insts.filter((i) => i.is_checked).reduce((sum, i) => sum + i.amount, 0);
              const pct = Math.min(100, Math.round((saved / c.target_amount) * 100));
              return `  - **${c.emoji} ${c.name}** : ${fmt(saved)} / ${fmt(c.target_amount)} (${pct}% complété).`;
            }).join("\n") +
            "\n\nConseil : Continue tes versements réguliers pour garder un bon élan !";
        }
      } else if (lower.includes("astuce") || lower.includes("conseil") || lower.includes("épargner plus")) {
        reply = "Voici 3 astuces concrètes pour maximiser ton épargne ce mois-ci :\n\n" +
          "1. **Règle des 24h** : Attends 24 heures avant d'acheter un objet non essentiel. Tu économiseras souvent l'achat par impulsion.\n" +
          "2. **Automatise un versement** : Règle un versement récurrent à chaque début de mois dès que tu reçois tes revenus.\n" +
          "3. **Fais la chasse aux abonnements inutiles** : Vérifie tes relevés et coupe les abonnements de streaming ou services que tu n'utilises plus.";
      } else if (lower.includes("urgence") || lower.includes("fonds d'urgence")) {
        reply = `Créer un fonds d'urgence est la meilleure décision financière possible 🛡️.\n\n` +
          `**Étape 1** : Fixe-toi un objectif de 1 à 3 mois de dépenses courantes (ex: 500 000 ${profile?.currency_symbol || "€"}).\n` +
          `**Étape 2** : Crée un nouveau défi d'épargne dans l'application avec la catégorie **Urgence**.\n` +
          `**Étape 3** : Choisis le mode de découpage **Aléatoire** ou **Régulier** et commence à cocher de petites sommes pour construire ta réserve sans effort.`;
      } else {
        reply = "C'est noté ! Je suis là pour t'accompagner. N'hésite pas à me poser d'autres questions sur l'épargne ou à me demander un bilan de tes défis !";
      }

      await addMessage(activeThreadId, "model", reply);
      setIsTyping(false);
      
      // Scroll to bottom after typing simulator
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, 1500);
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <BrainCircuit size={20} color={themeColors.primary} />
          <Text style={[styles.headerTitle, { color: themeColors.foreground }]}>Coach IA</Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      <FlatList
        ref={flatListRef}
        data={activeMessages}
        keyExtractor={(item) => item.id}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.chatContent}
        ListFooterComponent={
          isTyping ? (
            <View style={[styles.messageBubble, styles.modelBubble, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <Text style={{ color: themeColors.mutedForeground, fontStyle: "italic" }}>
                Kobo est en train de réfléchir...
              </Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          <View style={styles.startersContainer}>
            <Text style={[styles.startersTitle, { color: themeColors.foreground }]}>Suggestions :</Text>
            <View style={styles.startersGrid}>
              {STARTERS.map((s, idx) => (
                <TouchableOpacity
                  key={idx}
                  style={[styles.starterCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                  onPress={() => handleSend(s.label)}
                >
                  <Text style={styles.starterIcon}>{s.icon}</Text>
                  <Text style={[styles.starterLabel, { color: themeColors.foreground }]}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        }
        renderItem={({ item }) => {
          const isUser = item.role === "user";
          return (
            <View
              style={[
                styles.messageBubble,
                isUser ? styles.userBubble : styles.modelBubble,
                {
                  backgroundColor: isUser ? themeColors.primary : themeColors.card,
                  borderColor: isUser ? themeColors.primary : themeColors.border,
                },
              ]}
            >
              <Text style={[styles.messageText, { color: isUser ? "white" : themeColors.foreground }]}>
                {item.content}
              </Text>
              <Text style={[styles.messageTime, { color: isUser ? "rgba(255,255,255,0.7)" : themeColors.mutedForeground }]}>
                {new Date(item.created_at).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </View>
          );
        }}
      />

      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <View style={[styles.inputContainer, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
          <TextInput
            style={[styles.chatInput, { color: themeColors.foreground, backgroundColor: themeColors.muted }]}
            placeholder="Pose-moi une question sur ton budget..."
            placeholderTextColor={themeColors.mutedForeground}
            value={inputText}
            onChangeText={setInputText}
          />
          <TouchableOpacity
            style={[styles.sendBtn, { backgroundColor: themeColors.primary }]}
            onPress={() => handleSend(inputText)}
          >
            <Send size={18} color="white" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  chatContent: {
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  startersContainer: {
    marginVertical: 15,
  },
  startersTitle: {
    fontSize: 14,
    fontWeight: "bold",
    marginBottom: 10,
  },
  startersGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  starterCard: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "100%",
  },
  starterIcon: {
    fontSize: 16,
  },
  starterLabel: {
    fontSize: 12,
    fontWeight: "500",
    marginLeft: 6,
  },
  messageBubble: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginVertical: 6,
    maxWidth: "80%",
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 2,
  },
  modelBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 2,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageTime: {
    fontSize: 9,
    alignSelf: "flex-end",
    marginTop: 4,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderTopWidth: 1,
  },
  chatInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    paddingHorizontal: 16,
    fontSize: 14,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 10,
  },
});
