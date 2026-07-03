import React, { useState, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  SafeAreaView,
  Platform,
  StatusBar,
  TouchableOpacity,
  Alert,
} from "react-native";
import { ArrowLeft, Clock, CheckCircle, Trophy, Calendar, Archive, RotateCcw, AlertCircle } from "lucide-react-native";
import { useApp } from "../services/AppContext";
import { useMoneyFormatter } from "../hooks/useMoneyFormatter";
import { COLORS } from "../lib/theme";

export default function HistoryScreen({ navigation }: any) {
  const { profile, challenges, installments, updateChallenge } = useApp();
  const fmt = useMoneyFormatter();
  const themeColors = COLORS[profile?.theme || "light"];

  const [activeTab, setActiveTab] = useState<"deposits" | "challenges">("deposits");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "completed" | "archived">("all");

  // Tab 1: Find all checked installments, sort by checked date
  const checkedHistory = installments
    .filter((i) => i.is_checked && i.checked_at)
    .map((i) => {
      const challenge = challenges.find((c) => c.id === i.challenge_id);
      return {
        ...i,
        challengeName: challenge?.name || "Défi supprimé",
        challengeEmoji: challenge?.emoji || "🎯",
      };
    })
    .sort((a, b) => (b.checked_at ?? "").localeCompare(a.checked_at ?? ""));

  // Calculate statistics (Global across all challenges)
  const stats = useMemo(() => {
    const totalCount = challenges.length;
    const completedCount = challenges.filter((c) => c.status === "completed").length;
    const activeCount = challenges.filter((c) => c.status === "active").length;
    
    // Sum of checked installments
    const totalSaved = installments
      .filter((i) => i.is_checked)
      .reduce((sum, i) => sum + i.amount, 0);

    return {
      total: totalCount,
      completed: completedCount,
      active: activeCount,
      saved: totalSaved,
    };
  }, [challenges, installments]);

  // Tab 2: Filtered challenges list
  const filteredChallenges = useMemo(() => {
    let list = [...challenges];
    
    if (statusFilter !== "all") {
      list = list.filter((c) => c.status === statusFilter);
    }
    
    return list.sort((a, b) => b.start_date.localeCompare(a.start_date));
  }, [challenges, statusFilter]);

  const getChallengeProgress = (challengeId: string) => {
    const total = installments.filter((i) => i.challenge_id === challengeId);
    const checked = total.filter((i) => i.is_checked);
    const savedAmount = checked.reduce((acc, curr) => acc + curr.amount, 0);
    const totalAmount = total.reduce((acc, curr) => acc + curr.amount, 0);
    const percent = totalAmount > 0 ? Math.round((savedAmount / totalAmount) * 100) : 0;
    return {
      percent,
      savedAmount,
      totalAmount,
    };
  };

  const handleArchiveToggle = async (challengeId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "active" ? "archived" : "active";
      await updateChallenge(challengeId, { status: newStatus });
      Alert.alert(
        "Succès",
        newStatus === "archived"
          ? "Le défi a été archivé avec succès."
          : "Le défi a été réactivé avec succès."
      );
    } catch (e: any) {
      Alert.alert("Erreur", "Impossible de mettre à jour le statut du défi.");
    }
  };

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={profile?.theme === "dark" ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.foreground }]}>Statistiques & Historique</Text>
        <View style={{ width: 40 }} />
      </View>

      {/* Grid of Statistics (Parity with web dashboard) */}
      <View style={styles.statsGrid}>
        <View style={[styles.statsCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.statsHeaderRow}>
            <Trophy size={14} color={themeColors.mutedForeground} />
            <Text style={[styles.statsLabel, { color: themeColors.mutedForeground }]}>Défis créés</Text>
          </View>
          <Text style={[styles.statsValue, { color: themeColors.foreground }]}>{stats.total}</Text>
        </View>

        <View style={[styles.statsCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.statsHeaderRow}>
            <CheckCircle size={14} color={themeColors.secondary} />
            <Text style={[styles.statsLabel, { color: themeColors.mutedForeground }]}>Réussis</Text>
          </View>
          <Text style={[styles.statsValue, { color: themeColors.foreground }]}>{stats.completed}</Text>
        </View>

        <View style={[styles.statsCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.statsHeaderRow}>
            <Clock size={14} color={themeColors.primary} />
            <Text style={[styles.statsLabel, { color: themeColors.mutedForeground }]}>En cours</Text>
          </View>
          <Text style={[styles.statsValue, { color: themeColors.foreground }]}>{stats.active}</Text>
        </View>

        <View style={[styles.statsCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
          <View style={styles.statsHeaderRow}>
            <Trophy size={14} color="#EAB308" />
            <Text style={[styles.statsLabel, { color: themeColors.mutedForeground }]}>Total épargné</Text>
          </View>
          <Text style={[styles.statsValue, { color: themeColors.foreground }]} numberOfLines={1}>
            {fmt(stats.saved)}
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabBar, { borderBottomColor: themeColors.border }]}>
        <TouchableOpacity
          style={[styles.tabButton, activeTab === "deposits" && { borderBottomColor: themeColors.primary }]}
          onPress={() => setActiveTab("deposits")}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "deposits" ? themeColors.primary : themeColors.mutedForeground },
            ]}
          >
            💰 Dépôts ({checkedHistory.length})
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabButton, activeTab === "challenges" && { borderBottomColor: themeColors.primary }]}
          onPress={() => setActiveTab("challenges")}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "challenges" ? themeColors.primary : themeColors.mutedForeground },
            ]}
          >
            🎯 Défis ({challenges.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Sub-Filters for Challenges Tab */}
      {activeTab === "challenges" && (
        <View style={styles.filterContainer}>
          {([
            ["all", "Tous"],
            ["active", "Actifs"],
            ["completed", "Terminés"],
            ["archived", "Archivés"],
          ] as const).map(([key, label]) => (
            <TouchableOpacity
              key={key}
              style={[
                styles.filterBtn,
                statusFilter === key
                  ? { backgroundColor: themeColors.primary }
                  : { backgroundColor: themeColors.muted },
              ]}
              onPress={() => setStatusFilter(key)}
            >
              <Text
                style={[
                  styles.filterBtnText,
                  { color: statusFilter === key ? "white" : themeColors.foreground },
                ]}
              >
                {label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {activeTab === "deposits" ? (
        // Deposits List
        <FlatList
          data={checkedHistory}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Clock size={48} color={themeColors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: themeColors.foreground }]}>Aucun dépôt pour le moment</Text>
              <Text style={[styles.emptySubtitle, { color: themeColors.mutedForeground }]}>
                Vos dépôts apparaîtront ici au fur et à mesure que vous cocherez des tranches.
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={[styles.historyCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
              <View style={styles.cardEmojiBg}>
                <Text style={styles.cardEmoji}>{item.challengeEmoji}</Text>
              </View>
              <View style={styles.cardInfo}>
                <Text style={[styles.challengeName, { color: themeColors.foreground }]} numberOfLines={1}>
                  {item.challengeName}
                </Text>
                <Text style={[styles.depositDate, { color: themeColors.mutedForeground }]}>
                  {item.checked_at
                    ? new Date(item.checked_at).toLocaleDateString("fr-FR", {
                        day: "2-digit",
                        month: "long",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : ""}
                </Text>
              </View>
              <View style={styles.amountContainer}>
                <Text style={[styles.depositAmount, { color: themeColors.secondary }]}>
                  +{fmt(item.amount)}
                </Text>
                <View style={styles.statusRow}>
                  <CheckCircle size={12} color={themeColors.secondary} />
                  <Text style={[styles.statusText, { color: themeColors.secondary }]}>Validé</Text>
                </View>
              </View>
            </View>
          )}
        />
      ) : (
        // Challenges List
        <FlatList
          data={filteredChallenges}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Trophy size={48} color={themeColors.mutedForeground} />
              <Text style={[styles.emptyTitle, { color: themeColors.foreground }]}>Aucun défi trouvé</Text>
              <Text style={[styles.emptySubtitle, { color: themeColors.mutedForeground }]}>
                Aucun défi ne correspond au filtre sélectionné.
              </Text>
            </View>
          }
          renderItem={({ item }) => {
            const { percent, savedAmount, totalAmount } = getChallengeProgress(item.id);
            const isCompleted = item.status === "completed" || percent >= 100;
            return (
              <View style={[styles.challengeCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
                <TouchableOpacity
                  style={styles.challengeHeader}
                  onPress={() => navigation.navigate("ChallengeDetail", { id: item.id })}
                >
                  <View style={styles.challengeIconBg}>
                    <Text style={styles.challengeIcon}>{item.emoji || "🎯"}</Text>
                  </View>
                  <View style={{ flex: 1, marginLeft: 12 }}>
                    <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                      <Text style={[styles.challengeTitleText, { color: themeColors.foreground, flexShrink: 1 }]} numberOfLines={1}>
                        {item.name}
                      </Text>
                      {item.status === "archived" && (
                        <View style={styles.archivedBadge}>
                          <Text style={styles.archivedBadgeText}>Archivé</Text>
                        </View>
                      )}
                    </View>
                    <View style={styles.dateRow}>
                      <Calendar size={12} color={themeColors.mutedForeground} />
                      <Text style={[styles.dateText, { color: themeColors.mutedForeground }]}>
                        Lancé le {new Date(item.start_date).toLocaleDateString("fr-FR", { day: "2-digit", month: "short", year: "numeric" })}
                      </Text>
                    </View>
                  </View>
                  <View style={[styles.statusBadge, { backgroundColor: isCompleted ? `${themeColors.secondary}15` : `${themeColors.primary}15` }]}>
                    <Text style={[styles.statusBadgeText, { color: isCompleted ? themeColors.secondary : themeColors.primary }]}>
                      {isCompleted ? "Réussi 🎉" : `${percent}%`}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Progress bar */}
                <View style={[styles.progressBarBg, { backgroundColor: themeColors.muted }]}>
                  <View
                    style={[
                      styles.progressBarFill,
                      {
                        width: `${Math.min(percent, 100)}%`,
                        backgroundColor: isCompleted ? themeColors.secondary : themeColors.primary,
                      },
                    ]}
                  />
                </View>

                <View style={styles.challengeFooter}>
                  <Text style={[styles.footerProgressText, { color: themeColors.mutedForeground }]}>
                    Épargné : <Text style={{ color: themeColors.foreground, fontWeight: "bold" }}>{fmt(savedAmount)}</Text>
                  </Text>
                  <Text style={[styles.footerProgressText, { color: themeColors.mutedForeground }]}>
                    Cible : <Text style={{ color: themeColors.foreground, fontWeight: "bold" }}>{fmt(totalAmount)}</Text>
                  </Text>
                </View>

                {/* Archive / Resume actions */}
                <View style={[styles.actionRow, { borderTopColor: themeColors.border }]}>
                  {item.status === "active" ? (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: themeColors.muted }]}
                      onPress={() => handleArchiveToggle(item.id, "active")}
                    >
                      <Archive size={14} color={themeColors.foreground} />
                      <Text style={[styles.actionButtonText, { color: themeColors.foreground }]}>Archiver</Text>
                    </TouchableOpacity>
                  ) : (
                    <TouchableOpacity
                      style={[styles.actionButton, { backgroundColor: `${themeColors.primary}15` }]}
                      onPress={() => handleArchiveToggle(item.id, item.status)}
                    >
                      <RotateCcw size={14} color={themeColors.primary} />
                      <Text style={[styles.actionButtonText, { color: themeColors.primary }]}>Reprendre</Text>
                    </TouchableOpacity>
                  )}
                  
                  <TouchableOpacity
                    style={[styles.actionButton, { backgroundColor: `${themeColors.secondary}10` }]}
                    onPress={() => navigation.navigate("ChallengeDetail", { id: item.id })}
                  >
                    <AlertCircle size={14} color={themeColors.secondary} />
                    <Text style={[styles.actionButtonText, { color: themeColors.secondary }]}>Détails</Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingTop: Platform.OS === "android" ? StatusBar.currentHeight : 0,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 15,
    paddingVertical: 12,
  },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  tabBar: {
    flexDirection: "row",
    borderBottomWidth: 1,
    marginBottom: 10,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: "center",
    borderBottomWidth: 2,
    borderBottomColor: "transparent",
  },
  tabText: {
    fontSize: 14,
    fontWeight: "bold",
  },
  listContent: {
    paddingHorizontal: 15,
    paddingBottom: 30,
  },
  emptyState: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 60,
    paddingHorizontal: 30,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
    marginTop: 15,
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 8,
  },
  historyCard: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
    marginBottom: 10,
  },
  cardEmojiBg: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  cardEmoji: {
    fontSize: 20,
  },
  cardInfo: {
    flex: 1,
    marginLeft: 12,
  },
  challengeName: {
    fontSize: 14,
    fontWeight: "bold",
  },
  depositDate: {
    fontSize: 11,
    marginTop: 2,
  },
  amountContainer: {
    alignItems: "flex-end",
  },
  depositAmount: {
    fontSize: 15,
    fontWeight: "bold",
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  statusText: {
    fontSize: 10,
    fontWeight: "600",
  },
  challengeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 15,
    marginBottom: 12,
  },
  challengeHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  challengeIconBg: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "rgba(0,0,0,0.03)",
    justifyContent: "center",
    alignItems: "center",
  },
  challengeIcon: {
    fontSize: 22,
  },
  challengeTitleText: {
    fontSize: 15,
    fontWeight: "bold",
  },
  dateRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  dateText: {
    fontSize: 11,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusBadgeText: {
    fontSize: 11,
    fontWeight: "bold",
  },
  progressBarBg: {
    height: 6,
    borderRadius: 3,
    marginTop: 15,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  challengeFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 10,
  },
  footerProgressText: {
    fontSize: 11,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    paddingHorizontal: 15,
    gap: 8,
    marginBottom: 15,
  },
  statsCard: {
    flex: 1,
    minWidth: "45%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 12,
  },
  statsHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  statsLabel: {
    fontSize: 11,
    fontWeight: "500",
  },
  statsValue: {
    fontSize: 18,
    fontWeight: "bold",
    marginTop: 4,
  },
  filterContainer: {
    flexDirection: "row",
    paddingHorizontal: 15,
    gap: 6,
    marginBottom: 12,
  },
  filterBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: "600",
  },
  archivedBadge: {
    backgroundColor: "rgba(0,0,0,0.06)",
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  archivedBadgeText: {
    fontSize: 9,
    fontWeight: "bold",
    color: "#666",
  },
  actionRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 8,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: "600",
  },
});
