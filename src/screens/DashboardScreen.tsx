import React, { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  SafeAreaView, Platform,
  StatusBar,
} from "react-native";
import { Plus, Flame, Trophy, Sparkles, Settings, MessageSquare, History } from "lucide-react-native";
import { useApp } from "../services/AppContext";
import { useMoneyFormatter } from "../hooks/useMoneyFormatter";
import { useGamification } from "../hooks/useGamification";
import { COLORS } from "../lib/theme";
import { getCategory } from "../lib/categories";
import { LinearGradient } from "expo-linear-gradient";

export default function DashboardScreen({ navigation }: any) {
  const { profile, challenges, installments } = useApp();
  const fmt = useMoneyFormatter();
  const { gamification } = useGamification();
  const [filter, setFilter] = useState<string | null>(null);

  const themeColors = COLORS[profile?.theme || "light"];

  const activeChallenges = challenges
    .filter((c) => c.status === "active")
    .map((c) => {
      const insts = installments.filter((i) => i.challenge_id === c.id);
      const saved = insts.filter((i) => i.is_checked).reduce((sum, i) => sum + i.amount, 0);
      return {
        ...c,
        saved,
        total_installments: insts.length,
        checked_installments: insts.filter((i) => i.is_checked).length,
      };
    });

  const totalSaved = activeChallenges.reduce((s, c) => s + c.saved, 0);

  const usedCategories = Array.from(
    new Set(activeChallenges.map((c) => c.category).filter(Boolean) as string[]),
  );

  const visibleChallenges = filter
    ? activeChallenges.filter((c) => c.category === filter)
    : activeChallenges;

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={profile?.theme === "dark" ? "light-content" : "dark-content"} />
      
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={[styles.welcome, { color: themeColors.foreground }]}>
            Bonjour {profile?.first_name || "👋"}
          </Text>
          <Text style={[styles.subWelcome, { color: themeColors.mutedForeground }]}>
            Total épargné : <Text style={{ color: themeColors.primary, fontWeight: "bold" }}>{fmt(totalSaved)}</Text>
          </Text>
        </View>
        <View style={styles.headerButtons}>
          <TouchableOpacity
            style={[styles.iconButton, { backgroundColor: themeColors.card }]}
            onPress={() => navigation.navigate("Settings")}
          >
            <Settings size={20} color={themeColors.foreground} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Gamification Bar */}
        {gamification && (
          <View style={[styles.gamificationCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <View style={styles.gRow}>
              <LinearGradient
                colors={themeColors.gradientBrand}
                style={styles.levelBadge}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Text style={styles.levelBadgeText}>Niv.</Text>
                <Text style={styles.levelBadgeNum}>{gamification.level}</Text>
              </LinearGradient>

              <View style={styles.levelInfo}>
                <View style={styles.levelLabelRow}>
                  <Sparkles size={14} color={themeColors.primary} />
                  <Text style={[styles.levelLabel, { color: themeColors.foreground }]}>
                    {gamification.levelLabel}
                  </Text>
                </View>
                <Text style={[styles.xpText, { color: themeColors.mutedForeground }]}>
                  {gamification.xp} / {gamification.xpForNext} versements
                </Text>
              </View>

              <View style={styles.statBadges}>
                <View style={[styles.statBadge, { backgroundColor: `${themeColors.accent}15` }]}>
                  <Flame size={16} color={themeColors.accent} />
                  <Text style={[styles.statBadgeText, { color: themeColors.accent }]}>{gamification.streak}</Text>
                </View>
                <View style={[styles.statBadge, { backgroundColor: `${themeColors.secondary}15` }]}>
                  <Trophy size={16} color={themeColors.secondary} />
                  <Text style={[styles.statBadgeText, { color: themeColors.secondary }]}>
                    {gamification.completedChallenges}
                  </Text>
                </View>
              </View>
            </View>

            {/* Progress Bar */}
            <View style={[styles.progressBarBg, { backgroundColor: themeColors.muted }]}>
              <LinearGradient
                colors={themeColors.gradientBrand}
                style={[styles.progressBarFill, { width: `${gamification.progressToNext}%` }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>

            {/* Badges List */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
              {gamification.badges.map((b) => (
                <View
                  key={b.id}
                  style={[
                    styles.badgeContainer,
                    {
                      borderColor: b.unlocked ? `${themeColors.primary}40` : themeColors.border,
                      backgroundColor: b.unlocked ? `${themeColors.primary}10` : "transparent",
                      opacity: b.unlocked ? 1 : 0.4,
                    },
                  ]}
                >
                  <Text style={styles.badgeEmoji}>{b.emoji}</Text>
                  <Text style={[styles.badgeLabel, { color: b.unlocked ? themeColors.foreground : themeColors.mutedForeground }]}>
                    {b.label}
                  </Text>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Categories filters */}
        {usedCategories.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filtersScroll}>
            <TouchableOpacity
              style={[
                styles.filterBtn,
                !filter
                  ? { backgroundColor: `${themeColors.primary}20`, borderColor: themeColors.primary }
                  : { backgroundColor: themeColors.card, borderColor: themeColors.border },
              ]}
              onPress={() => setFilter(null)}
            >
              <Text style={[styles.filterBtnText, !filter ? { color: themeColors.primary } : { color: themeColors.foreground }]}>
                Tout
              </Text>
            </TouchableOpacity>
            {usedCategories.map((cid) => {
              const c = getCategory(cid);
              if (!c) return null;
              return (
                <TouchableOpacity
                  key={cid}
                  style={[
                    styles.filterBtn,
                    filter === cid
                      ? { backgroundColor: `${themeColors.primary}20`, borderColor: themeColors.primary }
                      : { backgroundColor: themeColors.card, borderColor: themeColors.border },
                  ]}
                  onPress={() => setFilter(cid === filter ? null : cid)}
                >
                  <Text style={[styles.filterBtnText, filter === cid ? { color: themeColors.primary } : { color: themeColors.foreground }]}>
                    {c.emoji} {c.label}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        )}

        {/* Challenges Grid */}
        <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>Mes Défis actifs</Text>
        {visibleChallenges.length === 0 ? (
          <View style={[styles.emptyState, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={styles.emptyIcon}>✨</Text>
            <Text style={[styles.emptyTitle, { color: themeColors.foreground }]}>Aucun défi actif</Text>
            <Text style={[styles.emptySubtitle, { color: themeColors.mutedForeground }]}>
              Commence à épargner dès aujourd'hui en créant ton premier défi !
            </Text>
            <TouchableOpacity onPress={() => navigation.navigate("NewChallenge")}>
              <LinearGradient
                colors={themeColors.gradientBrand}
                style={styles.emptyBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.emptyBtnText}>Créer un défi</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.challengesContainer}>
            {visibleChallenges.map((c) => {
              const pct = Math.min(100, Math.round((c.saved / c.target_amount) * 100));
              const daysLeft = c.end_date
                ? Math.max(0, Math.ceil((new Date(c.end_date).getTime() - Date.now()) / 86400000))
                : null;
              const cat = getCategory(c.category);

              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.challengeCard, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}
                  onPress={() => navigation.navigate("ChallengeDetail", { id: c.id })}
                >
                  <View style={styles.cCardHeader}>
                    <View style={styles.cEmojiBg}>
                      <Text style={styles.cEmoji}>{c.emoji}</Text>
                    </View>
                    <View style={styles.cCardTitleContainer}>
                      <Text style={[styles.cCardTitle, { color: themeColors.foreground }]} numberOfLines={1}>
                        {c.name}
                      </Text>
                      <Text style={[styles.cCardMeta, { color: themeColors.mutedForeground }]}>
                        {cat && `${cat.emoji} ${cat.label} · `}Objectif {fmt(c.target_amount)}
                      </Text>
                    </View>
                    <Text style={[styles.cCardPct, { color: themeColors.primary }]}>{pct}%</Text>
                  </View>

                  <View style={[styles.cProgressBarBg, { backgroundColor: themeColors.muted }]}>
                    <LinearGradient
                      colors={themeColors.gradientBrand}
                      style={[styles.cProgressBarFill, { width: `${pct}%` }]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                    />
                  </View>

                  <View style={styles.cCardFooter}>
                    <Text style={[styles.cSavedText, { color: themeColors.foreground }]}>
                      {fmt(c.saved)}
                    </Text>
                    <Text style={[styles.cVersText, { color: themeColors.mutedForeground }]}>
                      {c.checked_installments}/{c.total_installments} tranches
                    </Text>
                  </View>

                  {daysLeft !== null && (
                    <Text style={[styles.cDaysLeft, { color: themeColors.mutedForeground }]}>
                      📅 {daysLeft === 0 ? "Dernier jour !" : `${daysLeft} jour${daysLeft > 1 ? "s" : ""} restant${daysLeft > 1 ? "s" : ""}`}
                    </Text>
                  )}
                </TouchableOpacity>
              );
            })}
          </View>
        )}
      </ScrollView>

      {/* FAB */}
      <TouchableOpacity
        style={styles.fabContainer}
        onPress={() => navigation.navigate("NewChallenge")}
      >
        <LinearGradient
          colors={themeColors.gradientBrand}
          style={styles.fab}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Plus size={28} color="white" />
        </LinearGradient>
      </TouchableOpacity>
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
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 15,
    paddingBottom: 10,
  },
  welcome: {
    fontSize: 24,
    fontWeight: "bold",
  },
  subWelcome: {
    fontSize: 14,
    marginTop: 2,
  },
  headerButtons: {
    flexDirection: "row",
    gap: 10,
  },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "rgba(0,0,0,0.05)",
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },
  gamificationCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginTop: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 2,
  },
  gRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  levelBadge: {
    width: 44,
    height: 44,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
  },
  levelBadgeText: {
    color: "white",
    fontSize: 8,
    fontWeight: "600",
    textTransform: "uppercase",
  },
  levelBadgeNum: {
    color: "white",
    fontSize: 18,
    fontWeight: "bold",
    lineHeight: 20,
  },
  levelInfo: {
    flex: 1,
    marginLeft: 12,
  },
  levelLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  levelLabel: {
    fontSize: 15,
    fontWeight: "700",
  },
  xpText: {
    fontSize: 12,
    marginTop: 2,
  },
  statBadges: {
    flexDirection: "row",
    gap: 8,
  },
  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 6,
    borderRadius: 8,
  },
  statBadgeText: {
    fontSize: 13,
    fontWeight: "bold",
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    marginTop: 12,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
  },
  badgesScroll: {
    marginTop: 15,
  },
  badgeContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
  },
  badgeEmoji: {
    fontSize: 14,
  },
  badgeLabel: {
    fontSize: 11,
    fontWeight: "600",
    marginLeft: 4,
  },
  filtersScroll: {
    marginTop: 20,
    flexDirection: "row",
  },
  filterBtn: {
    borderWidth: 1,
    borderRadius: 15,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginRight: 8,
  },
  filterBtnText: {
    fontSize: 12,
    fontWeight: "500",
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "700",
    marginTop: 25,
    marginBottom: 12,
  },
  emptyState: {
    borderRadius: 20,
    borderWidth: 2,
    borderStyle: "dashed",
    padding: 30,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyIcon: {
    fontSize: 40,
    marginBottom: 10,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: "bold",
  },
  emptySubtitle: {
    fontSize: 13,
    textAlign: "center",
    marginTop: 4,
    marginBottom: 20,
    paddingHorizontal: 10,
  },
  emptyBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 20,
  },
  emptyBtnText: {
    color: "white",
    fontSize: 14,
    fontWeight: "bold",
  },
  challengesContainer: {
    gap: 12,
  },
  challengeCard: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 5,
    elevation: 1,
  },
  cCardHeader: {
    flexDirection: "row",
    alignItems: "center",
  },
  cEmojiBg: {
    width: 40,
    height: 40,
    borderRadius: 10,
    backgroundColor: "rgba(108, 63, 196, 0.1)",
    justifyContent: "center",
    alignItems: "center",
  },
  cEmoji: {
    fontSize: 20,
  },
  cCardTitleContainer: {
    flex: 1,
    marginLeft: 10,
  },
  cCardTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  cCardMeta: {
    fontSize: 11,
    marginTop: 1,
  },
  cCardPct: {
    fontSize: 18,
    fontWeight: "bold",
  },
  cProgressBarBg: {
    height: 6,
    borderRadius: 3,
    marginTop: 12,
    overflow: "hidden",
  },
  cProgressBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  cCardFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
  },
  cSavedText: {
    fontSize: 14,
    fontWeight: "600",
  },
  cVersText: {
    fontSize: 12,
  },
  cDaysLeft: {
    fontSize: 11,
    marginTop: 6,
  },
  fabContainer: {
    position: "absolute",
    bottom: 24,
    right: 20,
    shadowColor: "#6C3FC4",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35,
    shadowRadius: 10,
    elevation: 5,
  },
  fab: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: "center",
    alignItems: "center",
  },
});
