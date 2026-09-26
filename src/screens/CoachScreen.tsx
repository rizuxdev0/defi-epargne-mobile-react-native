import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Platform,
  TextInput,
  KeyboardAvoidingView,
  FlatList,
  Modal,
  Alert,
  Share,
  Keyboard,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  ArrowLeft,
  Send,
  Sparkles,
  BrainCircuit,
  History,
  MessageSquarePlus,
  Trash2,
  Edit3,
  Check,
  X,
  Share2,
  Coins,
  Bot,
  Plus,
  Clock,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "../services/AppContext";
import { useMoneyFormatter } from "../hooks/useMoneyFormatter";
import { COLORS } from "../lib/theme";
import { geminiService } from "../services/gemini";
import { AIThread } from "../services/db";

const STARTERS = [
  { icon: "📊", label: "Analyse mes défis en cours" },
  { icon: "💡", label: "3 astuces pour épargner plus ce mois" },
  { icon: "🛡️", label: "Construis-moi un plan fonds d'urgence" },
  { icon: "🎯", label: "Quel défi me conseilles-tu maintenant ?" },
  { icon: "📈", label: "Comment fonctionnent les intérêts composés ?" },
  { icon: "⚡", label: "Comment éviter les achats impulsifs ?" },
];

export default function CoachScreen({ navigation }: any) {
  const {
    profile,
    challenges,
    installments,
    threads,
    messages,
    createThread,
    deleteThread,
    renameThread,
    addMessage,
  } = useApp();
  const fmt = useMoneyFormatter();
  const themeColors = COLORS[profile?.theme || "light"];

  const [activeThreadId, setActiveThreadId] = useState<string | null>(null);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [historyModalVisible, setHistoryModalVisible] = useState(false);
  const [renameModalVisible, setRenameModalVisible] = useState(false);
  const [selectedThreadForRename, setSelectedThreadForRename] = useState<AIThread | null>(null);
  const [renameInputText, setRenameInputText] = useState("");
  const flatListRef = useRef<FlatList>(null);

  // Financial summary context for AI & Context Banner
  const activeChallenges = challenges.filter((c) => c.status === "active");
  const completedChallenges = challenges.filter((c) => c.status === "completed");
  const totalSaved = installments.filter((i) => i.is_checked).reduce((s, i) => s + i.amount, 0);

  // Initialize or pick thread
  useEffect(() => {
    const initThread = async () => {
      if (threads.length > 0) {
        if (!activeThreadId || !threads.some((t) => t.id === activeThreadId)) {
          setActiveThreadId(threads[0].id);
        }
      } else {
        const newT = await createThread("Conseiller Épargne");
        setActiveThreadId(newT.id);
        await addMessage(
          newT.id,
          "model",
          "Bonjour ! Je suis RIZUX IA, ton coach d'épargne intelligent 🤖. Dis-moi quel est ton objectif ou clique sur l'une des suggestions ci-dessous pour démarrer notre séance !"
        );
      }
    };
    initThread();
  }, [threads, activeThreadId]);

  // Auto-scroll chat to bottom when soft keyboard appears
  useEffect(() => {
    const showSub = Keyboard.addListener("keyboardDidShow", () => {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    return () => {
      showSub.remove();
    };
  }, []);

  const activeMessages = activeThreadId
    ? messages.filter((m) => m.thread_id === activeThreadId)
    : [];

  const currentThread = threads.find((t) => t.id === activeThreadId);

  // Create a brand new thread
  const handleNewThread = async () => {
    try {
      const dateStr = new Date().toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
      const newT = await createThread(`Séance du ${dateStr}`);
      setActiveThreadId(newT.id);
      await addMessage(
        newT.id,
        "model",
        "Bonjour ! Je suis prêt pour une nouvelle séance d'épargne 🚀. Que souhaites-tu aborder ou analyser aujourd'hui ?"
      );
      setHistoryModalVisible(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      console.error("Error creating thread:", e);
    }
  };

  // Delete thread
  const handleDeleteThread = (threadId: string, title: string) => {
    Alert.alert(
      "Supprimer la conversation ?",
      `Voulez-vous supprimer définitivement la discussion "${title}" ?`,
      [
        { text: "Annuler", style: "cancel" },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: async () => {
            await deleteThread(threadId);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            if (activeThreadId === threadId) {
              const remaining = threads.filter((t) => t.id !== threadId);
              if (remaining.length > 0) {
                setActiveThreadId(remaining[0].id);
              } else {
                handleNewThread();
              }
            }
          },
        },
      ]
    );
  };

  // Rename thread
  const openRenameModal = (thread: AIThread) => {
    setSelectedThreadForRename(thread);
    setRenameInputText(thread.title);
    setRenameModalVisible(true);
  };

  const handleSaveRename = async () => {
    if (!selectedThreadForRename || !renameInputText.trim()) return;
    try {
      await renameThread(selectedThreadForRename.id, renameInputText.trim());
      setRenameModalVisible(false);
      setSelectedThreadForRename(null);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e) {
      Alert.alert("Erreur", "Impossible de renommer la discussion.");
    }
  };

  // Share AI Advice
  const handleShareAdvice = async (content: string) => {
    try {
      await Share.share({
        message: `💡 Conseil RIZUX IA (Défi Épargne) :\n\n${content}\n\nRejoins-moi sur Défi Épargne pour concrétiser tes objectifs financiers ! 🚀💰`,
      });
    } catch (e) {
      console.error("Error sharing:", e);
    }
  };

  // Format relative thread date
  const formatThreadDate = (isoStr: string) => {
    try {
      const d = new Date(isoStr);
      const now = new Date();
      const diffTime = Math.abs(now.getTime() - d.getTime());
      const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays === 0) {
        return `Aujourd'hui à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
      }
      if (diffDays === 1) {
        return `Hier à ${d.toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}`;
      }
      return d.toLocaleDateString("fr-FR", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });
    } catch {
      return "";
    }
  };

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || !activeThreadId) return;

    const trimmed = textToSend.trim();
    setInputText("");
    await addMessage(activeThreadId, "user", trimmed);
    setIsTyping(true);

    // Auto-rename thread if generic title
    const curThread = threads.find((t) => t.id === activeThreadId);
    if (
      curThread &&
      (curThread.title === "Conseiller Épargne" ||
        curThread.title.startsWith("Séance du") ||
        curThread.title === "Nouvelle discussion")
    ) {
      const smartTitle = trimmed.length > 28 ? trimmed.slice(0, 28) + "..." : trimmed;
      renameThread(activeThreadId, smartTitle).catch(() => {});
    }

    // Scroll to bottom
    setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);

    const getOfflineReply = () => {
      const lower = trimmed.toLowerCase();
      if (lower.includes("analyse") || lower.includes("défis") || lower.includes("en cours")) {
        if (activeChallenges.length === 0) {
          return "Tu n'as aucun défi actif pour le moment. Je te conseille d'en créer un depuis ton tableau de bord ! Quel est ton projet actuel (voyage, tech, urgence) ?";
        } else {
          return (
            `Voici ton analyse d'épargne en cours :\n\n• Tu as actuellement **${activeChallenges.length} défi(s) actif(s)**.\n• Tu as accumulé un total de **${fmt(totalSaved)}**.\n\n` +
            activeChallenges
              .map((c) => {
                const insts = installments.filter((i) => i.challenge_id === c.id);
                const saved = insts.filter((i) => i.is_checked).reduce((sum, i) => sum + i.amount, 0);
                const pct = Math.min(100, Math.round((saved / c.target_amount) * 100));
                return `  - **${c.emoji} ${c.name}** : ${fmt(saved)} / ${fmt(c.target_amount)} (${pct}% complété).`;
              })
              .join("\n") +
            "\n\nConseil : Continue tes versements réguliers pour garder un bon élan !"
          );
        }
      } else if (lower.includes("astuce") || lower.includes("conseil") || lower.includes("épargner plus")) {
        return (
          "Voici 3 astuces concrètes pour maximiser ton épargne ce mois-ci :\n\n" +
          "1. **Règle des 24h** : Attends 24 heures avant d'acheter un objet non essentiel. Tu éviteras l'achat d'impulsion.\n" +
          "2. **Automatise un versement** : Règle un versement récurrent à chaque début de mois dès réception de tes revenus.\n" +
          "3. **Fais la chasse aux abonnements inutiles** : Vérifie tes relevés et coupe les abonnements que tu n'utilises plus."
        );
      } else if (lower.includes("urgence") || lower.includes("fonds d'urgence")) {
        return (
          `Créer un fonds d'urgence est la meilleure décision financière possible 🛡️.\n\n` +
          `**Étape 1** : Fixe-toi un objectif de 1 à 3 mois de dépenses courantes (ex: 500 000 ${profile?.currency_symbol || "FCFA"}).\n` +
          `**Étape 2** : Crée un nouveau défi d'épargne dans l'application avec la catégorie **Urgence**.\n` +
          `**Étape 3** : Choisis le mode de découpage **Aléatoire** ou **Régulier** et commence à cocher de petites sommes pour construire ta réserve sans stress.`
        );
      } else if (lower.includes("intérêts") || lower.includes("composé") || lower.includes("intérêts composés")) {
        return (
          "L'effet des intérêts composés est la 8ème merveille du monde 📈 !\n\n" +
          "Chaque somme épargnée et investie génère des intérêts, qui à leur tour génèrent eux-mêmes des intérêts les années suivantes.\n\n" +
          "💡 *Exemple* : Épargner 25 000 FCFA chaque mois pendant 10 ans à 8% par an te rapporte plus de 4,5 millions de FCFA, dont plus de 1,5 million d'intérêts purs gratuits !\n\n" +
          "Tu peux tester notre simulateur interactif d'intérêts composés directement depuis la barre supérieure de ton tableau de bord !"
        );
      } else {
        return "C'est bien noté ! Je suis là pour t'accompagner dans chacun de tes objectifs d'épargne. Pose-moi n'importe quelle question sur ton budget ou tes défis !";
      }
    };

    if (profile?.gemini_api_key?.trim()) {
      try {
        const systemPrompt = `Tu es RIZUX IA, le coach financier et expert en épargne personnel et bienveillant de l'application mobile DéfiÉpargne.
Voici le profil financier réel de l'utilisateur :
- Prénom : ${profile?.first_name || "Épargnant"}
- Devise : ${profile?.currency_code || "XOF"} (${profile?.currency_symbol || "FCFA"})
- Total cumulé épargné : ${fmt(totalSaved)}
- Nombre de défis actifs : ${activeChallenges.length}
- Nombre de défis réussis : ${completedChallenges.length}
${
  activeChallenges.length > 0
    ? "Défis en cours :\n" +
      activeChallenges
        .map((c) => {
          const insts = installments.filter((i) => i.challenge_id === c.id);
          const saved = insts.filter((i) => i.is_checked).reduce((sum, i) => sum + i.amount, 0);
          const pct = Math.min(100, Math.round((saved / c.target_amount) * 100));
          return `- ${c.name} (${c.category || "Autre"}) : ${fmt(saved)} sur ${fmt(c.target_amount)} (${pct}%)`;
        })
        .join("\n")
    : "Aucun défi actif pour l'instant."
}

Règles de comportement :
1. Sois encourageant, positif, pragmatique et concis.
2. Utilise des emojis adaptés (🎯, 💡, 💰, 🚀, 🛡️).
3. Donne des conseils précis adaptés à sa situation réelle et sa devise.
4. Réponds toujours en français.
5. Sois direct et évite les réponses trop longues pour l'écran d'un smartphone.`;

        const contents = [
          ...activeMessages.slice(-8).map((m) => ({
            role: m.role === "user" ? "user" : "model",
            parts: [{ text: m.content }],
          })),
          {
            role: "user",
            parts: [{ text: trimmed }],
          },
        ];

        const reply = await geminiService.generateReply(
          profile.gemini_api_key,
          systemPrompt,
          contents
        );

        if (reply) {
          await addMessage(activeThreadId, "model", reply);
          setIsTyping(false);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
          return;
        }
      } catch (err) {
        console.warn("Gemini API call failed, falling back to local:", err);
      }
    }

    // Fallback to offline rule-based response
    setTimeout(async () => {
      const offlineReply = getOfflineReply();
      await addMessage(activeThreadId, "model", offlineReply);
      setIsTyping(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, 800);
  };

  return (
    <SafeAreaView
      style={[styles.container, { backgroundColor: themeColors.background }]}
      edges={["top", "left", "right"]}
    >
      {/* Top Header */}
      <View style={[styles.header, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.headerBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
          onPress={() => navigation.goBack()}
        >
          <ArrowLeft size={20} color={themeColors.foreground} />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.headerCenter}
          activeOpacity={0.7}
          onPress={() => setHistoryModalVisible(true)}
        >
          <View style={styles.headerTitleContainer}>
            <BrainCircuit size={18} color={themeColors.primary} />
            <Text style={[styles.headerTitle, { color: themeColors.foreground }]}>RIZUX IA</Text>
            <View style={[styles.onlineDot, { backgroundColor: profile?.gemini_api_key ? "#10B981" : "#F59E0B" }]} />
          </View>
          <Text style={[styles.headerSubtitle, { color: themeColors.mutedForeground }]} numberOfLines={1}>
            {currentThread?.title || "Discussion"} ▾
          </Text>
        </TouchableOpacity>

        <View style={styles.headerActions}>
          {/* New Discussion Button */}
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={handleNewThread}
          >
            <MessageSquarePlus size={18} color={themeColors.primary} />
          </TouchableOpacity>

          {/* History Button */}
          <TouchableOpacity
            style={[styles.headerBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
            onPress={() => setHistoryModalVisible(true)}
          >
            <History size={18} color={themeColors.foreground} />
            {threads.length > 1 && (
              <View style={[styles.historyBadge, { backgroundColor: themeColors.primary }]}>
                <Text style={styles.historyBadgeText}>{threads.length}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Financial Snapshot Banner */}
      <View style={[styles.contextBanner, { backgroundColor: `${themeColors.primary}10`, borderColor: `${themeColors.primary}25` }]}>
        <View style={styles.contextItem}>
          <Coins size={13} color={themeColors.primary} />
          <Text style={[styles.contextText, { color: themeColors.foreground }]}>
            Total : <Text style={{ fontWeight: "800", color: themeColors.primary }}>{fmt(totalSaved)}</Text>
          </Text>
        </View>
        <View style={[styles.contextDivider, { backgroundColor: `${themeColors.primary}30` }]} />
        <View style={styles.contextItem}>
          <Text style={[styles.contextText, { color: themeColors.foreground }]}>
            🎯 <Text style={{ fontWeight: "700" }}>{activeChallenges.length} défi(s)</Text>
          </Text>
        </View>
        <View style={[styles.contextDivider, { backgroundColor: `${themeColors.primary}30` }]} />
        <TouchableOpacity
          style={styles.modelStatusBadge}
          onPress={() => navigation.navigate("Settings")}
        >
          <Sparkles size={11} color={profile?.gemini_api_key ? themeColors.primary : themeColors.mutedForeground} />
          <Text style={{ fontSize: 10, fontWeight: "700", color: profile?.gemini_api_key ? themeColors.primary : themeColors.mutedForeground }}>
            {profile?.gemini_api_key ? "Gemini ⚡" : "Hors-ligne 📱"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Chat Messages & Input Container in KeyboardAvoidingView */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 90 : 0}
      >
        <FlatList
          ref={flatListRef}
          data={activeMessages}
          keyExtractor={(item) => item.id}
          style={{ flex: 1 }}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.chatContent}
        ListFooterComponent={
          isTyping ? (
            <View style={[styles.messageBubble, styles.modelBubble, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <View style={styles.modelHeader}>
                <View style={[styles.botAvatar, { backgroundColor: `${themeColors.primary}20` }]}>
                  <Bot size={14} color={themeColors.primary} />
                </View>
                <Text style={[styles.botName, { color: themeColors.primary }]}>RIZUX IA</Text>
              </View>
              <Text style={{ color: themeColors.mutedForeground, fontStyle: "italic", fontSize: 13, marginTop: 4 }}>
                En train d'analyser vos finances...
              </Text>
            </View>
          ) : null
        }
        ListHeaderComponent={
          activeMessages.length <= 1 ? (
            <View style={styles.startersContainer}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 10 }}>
                <Sparkles size={15} color={themeColors.primary} />
                <Text style={[styles.startersTitle, { color: themeColors.foreground }]}>
                  Questions rapides & Suggestions :
                </Text>
              </View>
              <View style={styles.startersGrid}>
                {STARTERS.map((s, idx) => (
                  <TouchableOpacity
                    key={idx}
                    activeOpacity={0.7}
                    style={[styles.starterCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                    onPress={() => handleSend(s.label)}
                  >
                    <Text style={styles.starterIcon}>{s.icon}</Text>
                    <Text style={[styles.starterLabel, { color: themeColors.foreground }]}>{s.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          ) : null
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
              {!isUser && (
                <View style={styles.modelHeader}>
                  <View style={[styles.botAvatar, { backgroundColor: `${themeColors.primary}20` }]}>
                    <Bot size={13} color={themeColors.primary} />
                  </View>
                  <Text style={[styles.botName, { color: themeColors.primary }]}>RIZUX IA</Text>
                  <TouchableOpacity
                    style={styles.shareIconBtn}
                    onPress={() => handleShareAdvice(item.content)}
                  >
                    <Share2 size={13} color={themeColors.mutedForeground} />
                  </TouchableOpacity>
                </View>
              )}

              <Text
                style={[
                  styles.messageText,
                  { color: isUser ? "white" : themeColors.foreground },
                ]}
              >
                {item.content}
              </Text>

              <Text
                style={[
                  styles.messageTime,
                  { color: isUser ? "rgba(255,255,255,0.7)" : themeColors.mutedForeground },
                ]}
              >
                {new Date(item.created_at).toLocaleTimeString("fr-FR", {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          );
        }}
      />

      {/* Input Field */}
      <View style={[styles.inputContainer, { backgroundColor: themeColors.card, borderTopColor: themeColors.border }]}>
        <TextInput
          style={[styles.chatInput, { color: themeColors.foreground, backgroundColor: themeColors.background, borderColor: themeColors.border }]}
          placeholder="Pose une question à RIZUX IA..."
          placeholderTextColor={themeColors.mutedForeground}
          value={inputText}
          onChangeText={setInputText}
          returnKeyType="send"
          onSubmitEditing={() => {
            if (inputText.trim()) {
              handleSend(inputText);
            }
          }}
          blurOnSubmit={false}
          onFocus={() => {
            setTimeout(() => {
              flatListRef.current?.scrollToEnd({ animated: true });
            }, 150);
          }}
          maxLength={1000}
        />
        <TouchableOpacity
          style={[
            styles.sendBtn,
            {
              backgroundColor: inputText.trim() ? themeColors.primary : themeColors.muted,
            },
          ]}
          disabled={!inputText.trim()}
          onPress={() => handleSend(inputText)}
        >
          <Send size={18} color={inputText.trim() ? "white" : themeColors.mutedForeground} />
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>

      {/* History Modal (Historisation) */}
      <Modal
        visible={historyModalVisible}
        animationType="slide"
        transparent
        onRequestClose={() => setHistoryModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.historySheet, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={styles.sheetHeader}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <History size={20} color={themeColors.primary} />
                <Text style={[styles.sheetTitle, { color: themeColors.foreground }]}>
                  Historique des discussions
                </Text>
              </View>
              <TouchableOpacity
                style={styles.sheetCloseBtn}
                onPress={() => setHistoryModalVisible(false)}
              >
                <X size={20} color={themeColors.mutedForeground} />
              </TouchableOpacity>
            </View>

            {/* New Thread CTA Button */}
            <TouchableOpacity
              style={[styles.newThreadBtn, { backgroundColor: themeColors.primary }]}
              onPress={handleNewThread}
            >
              <Plus size={18} color="white" />
              <Text style={styles.newThreadBtnText}>Nouvelle conversation</Text>
            </TouchableOpacity>

            <FlatList
              data={threads}
              keyExtractor={(t) => t.id}
              showsVerticalScrollIndicator={false}
              contentContainerStyle={{ paddingBottom: 20 }}
              renderItem={({ item }) => {
                const isActive = item.id === activeThreadId;
                const msgCount = messages.filter((m) => m.thread_id === item.id).length;
                return (
                  <TouchableOpacity
                    activeOpacity={0.7}
                    style={[
                      styles.threadCard,
                      {
                        backgroundColor: isActive ? `${themeColors.primary}12` : themeColors.background,
                        borderColor: isActive ? themeColors.primary : themeColors.border,
                        borderWidth: isActive ? 1.5 : 1,
                      },
                    ]}
                    onPress={() => {
                      setActiveThreadId(item.id);
                      setHistoryModalVisible(false);
                      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    }}
                  >
                    <View style={{ flex: 1, marginRight: 10 }}>
                      <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 2 }}>
                        {isActive && (
                          <View style={[styles.activeIndicator, { backgroundColor: themeColors.primary }]}>
                            <Text style={styles.activeIndicatorText}>Active</Text>
                          </View>
                        )}
                        <Text
                          style={[
                            styles.threadTitle,
                            { color: themeColors.foreground, fontWeight: isActive ? "bold" : "600" },
                          ]}
                          numberOfLines={1}
                        >
                          {item.title}
                        </Text>
                      </View>

                      <View style={{ flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 }}>
                        <Text style={[styles.threadDate, { color: themeColors.mutedForeground }]}>
                          <Clock size={11} color={themeColors.mutedForeground} /> {formatThreadDate(item.updated_at || item.created_at)}
                        </Text>
                        <Text style={[styles.threadCount, { color: themeColors.mutedForeground }]}>
                          • {msgCount} message{msgCount > 1 ? "s" : ""}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.threadActions}>
                      <TouchableOpacity
                        style={[styles.threadActionBtn, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                        onPress={() => openRenameModal(item)}
                      >
                        <Edit3 size={14} color={themeColors.mutedForeground} />
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.threadActionBtn, { backgroundColor: `${themeColors.destructive}15`, borderColor: `${themeColors.destructive}30` }]}
                        onPress={() => handleDeleteThread(item.id, item.title)}
                      >
                        <Trash2 size={14} color={themeColors.destructive} />
                      </TouchableOpacity>
                    </View>
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </View>
      </Modal>

      {/* Rename Thread Modal */}
      <Modal
        visible={renameModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setRenameModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.renameCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={[styles.renameTitle, { color: themeColors.foreground }]}>
              Renommer la discussion
            </Text>
            <TextInput
              style={[styles.renameInput, { backgroundColor: themeColors.background, borderColor: themeColors.border, color: themeColors.foreground }]}
              value={renameInputText}
              onChangeText={setRenameInputText}
              placeholder="Titre de la conversation..."
              placeholderTextColor={themeColors.mutedForeground}
              maxLength={40}
              autoFocus
            />
            <View style={{ flexDirection: "row", gap: 10, marginTop: 15 }}>
              <TouchableOpacity
                style={[styles.modalCancelBtn, { borderColor: themeColors.border }]}
                onPress={() => setRenameModalVisible(false)}
              >
                <Text style={{ color: themeColors.foreground, fontWeight: "600" }}>Annuler</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalSaveBtn, { backgroundColor: themeColors.primary }]}
                onPress={handleSaveRename}
              >
                <Text style={{ color: "white", fontWeight: "bold" }}>Enregistrer</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? 10 : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
    position: "relative",
  },
  headerCenter: {
    flex: 1,
    alignItems: "center",
    marginHorizontal: 8,
  },
  headerTitleContainer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  headerSubtitle: {
    fontSize: 11,
    marginTop: 1,
  },
  onlineDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
  },
  headerActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  historyBadge: {
    position: "absolute",
    top: -4,
    right: -4,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 3,
  },
  historyBadgeText: {
    color: "white",
    fontSize: 9,
    fontWeight: "bold",
  },
  contextBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
  },
  contextItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  contextText: {
    fontSize: 11,
  },
  contextDivider: {
    width: 1,
    height: 12,
  },
  modelStatusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 10,
  },
  chatContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },
  startersContainer: {
    marginBottom: 16,
  },
  startersTitle: {
    fontSize: 12,
    fontWeight: "bold",
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
    borderRadius: 14,
    paddingHorizontal: 12,
    paddingVertical: 8,
    maxWidth: "100%",
  },
  starterIcon: {
    fontSize: 15,
  },
  starterLabel: {
    fontSize: 12,
    fontWeight: "600",
    marginLeft: 6,
  },
  messageBubble: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 12,
    marginVertical: 5,
    maxWidth: "85%",
  },
  userBubble: {
    alignSelf: "flex-end",
    borderBottomRightRadius: 4,
  },
  modelBubble: {
    alignSelf: "flex-start",
    borderBottomLeftRadius: 4,
  },
  modelHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 6,
    gap: 6,
  },
  botAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
  botName: {
    fontSize: 11,
    fontWeight: "bold",
    flex: 1,
  },
  shareIconBtn: {
    padding: 3,
  },
  messageText: {
    fontSize: 13.5,
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
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderTopWidth: 1,
    gap: 8,
  },
  chatInput: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.65)",
    justifyContent: "flex-end",
  },
  historySheet: {
    maxHeight: "80%",
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    padding: 20,
  },
  sheetHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sheetTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  sheetCloseBtn: {
    padding: 4,
  },
  newThreadBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    height: 42,
    borderRadius: 12,
    marginBottom: 16,
  },
  newThreadBtnText: {
    color: "white",
    fontSize: 13,
    fontWeight: "bold",
  },
  threadCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 14,
    padding: 12,
    marginBottom: 8,
  },
  activeIndicator: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 6,
  },
  activeIndicatorText: {
    color: "white",
    fontSize: 9,
    fontWeight: "bold",
  },
  threadTitle: {
    fontSize: 13,
    flex: 1,
  },
  threadDate: {
    fontSize: 10,
  },
  threadCount: {
    fontSize: 10,
  },
  threadActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  threadActionBtn: {
    width: 32,
    height: 32,
    borderRadius: 8,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  renameCard: {
    margin: 20,
    borderRadius: 20,
    borderWidth: 1,
    padding: 20,
    marginBottom: "auto",
    marginTop: "auto",
  },
  renameTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginBottom: 12,
  },
  renameInput: {
    height: 42,
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    fontSize: 13,
  },
  modalCancelBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalSaveBtn: {
    flex: 1,
    height: 40,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
  },
});
