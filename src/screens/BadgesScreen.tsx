import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Share,
  StatusBar,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { ArrowLeft, Trophy, Flame, Sparkles, Share2, CheckCircle2, Lock } from "lucide-react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useApp } from "../services/AppContext";
import { useGamification } from "../hooks/useGamification";
import { useMoneyFormatter } from "../hooks/useMoneyFormatter";
import { COLORS } from "../lib/theme";
import * as Haptics from "expo-haptics";

export default function BadgesScreen({ navigation }: any) {
  const { profile } = useApp();
  const { gamification } = useGamification();
  const fmt = useMoneyFormatter();
  const themeColors = COLORS[profile?.theme || "light"];

  const handleShare = async () => {
    if (!gamification) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    const unlocked = gamification.badges.filter((b) => b.unlocked);
    const message = 
      `🏆 Mon Bilan sur DéfiÉpargne 🎯\n\n` +
      `🎖️ Rang : ${gamification.levelLabel} (Niveau ${gamification.level})\n` +
      `🔥 Série de régularité : ${gamification.streak} jour(s) d'affilée\n` +
      `💰 Total économisé : ${fmt(gamification.totalSaved)}\n` +
      `🥇 Trophées remportés : ${unlocked.length}/${gamification.badges.length}\n\n` +
      `Construis ta liberté financière, un versement à la fois avec DéfiÉpargne ! 🚀`;

    try {
      await Share.share({ message });
    } catch (e) {
      // dismissed
    }
  };

  if (!gamification) return null;

  const unlockedBadges = gamification.badges.filter((b) => b.unlocked);
  const lockedBadges = gamification.badges.filter((b) => !b.unlocked);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: themeColors.background }]}>
      <StatusBar barStyle={profile?.theme === "dark" ? "light-content" : "dark-content"} />

      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.headerBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={24} color={themeColors.foreground} />
        </TouchableOpacity>
        <Text style={[styles.headerTitle, { color: themeColors.foreground }]}>Trophées & Niveaux</Text>
        <TouchableOpacity style={styles.headerBtn} onPress={handleShare}>
          <Share2 size={22} color={themeColors.primary} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Level Hero Card */}
        <LinearGradient
          colors={themeColors.gradientHero}
          style={styles.heroCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.heroTop}>
            <View style={styles.trophyIconBg}>
              <Trophy size={32} color="#FFFFFF" />
            </View>
            <View style={{ flex: 1, marginLeft: 14 }}>
              <Text style={styles.heroRankLabel}>NIVEAU ACTUEL</Text>
              <Text style={styles.heroLevelTitle}>{gamification.levelLabel}</Text>
              <Text style={styles.heroLevelSubtitle}>Niveau {gamification.level} · {gamification.xp} XP</Text>
            </View>
            <View style={styles.streakBadge}>
              <Flame size={18} color="#FF7A00" />
              <Text style={styles.streakNum}>{gamification.streak} j</Text>
            </View>
          </View>

          {/* Progress bar to next level */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTextRow}>
              <Text style={styles.progressText}>Prochain niveau</Text>
              <Text style={styles.progressText}>{gamification.progressToNext} %</Text>
            </View>
            <View style={styles.progressBarBg}>
              <View style={[styles.progressBarFill, { width: `${gamification.progressToNext}%` }]} />
            </View>
          </View>
        </LinearGradient>

        {/* Unlocked Badges Section */}
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>
            Badges Débloqués ({unlockedBadges.length})
          </Text>
        </View>

        {unlockedBadges.length === 0 ? (
          <View style={[styles.emptyBox, { backgroundColor: themeColors.card, borderColor: themeColors.border }]}>
            <Text style={{ fontSize: 24, marginBottom: 6 }}>🌱</Text>
            <Text style={{ color: themeColors.foreground, fontWeight: "600", fontSize: 13 }}>Aucun badge pour le moment</Text>
            <Text style={{ color: themeColors.mutedForeground, fontSize: 11, textAlign: "center", marginTop: 2 }}>
              Coche ton tout premier versement pour débloquer ton premier trophée !
            </Text>
          </View>
        ) : (
          <View style={styles.badgesGrid}>
            {unlockedBadges.map((badge) => (
              <View
                key={badge.id}
                style={[
                  styles.badgeCard,
                  {
                    backgroundColor: themeColors.card,
                    borderColor: `${themeColors.primary}40`,
                    borderWidth: 1.5,
                  },
                ]}
              >
                <View style={styles.badgeTop}>
                  <Text style={styles.badgeEmoji}>{badge.emoji}</Text>
                  <CheckCircle2 size={18} color={themeColors.secondary} />
                </View>
                <Text style={[styles.badgeLabel, { color: themeColors.foreground }]} numberOfLines={1}>
                  {badge.label}
                </Text>
                <Text style={[styles.badgeDesc, { color: themeColors.mutedForeground }]} numberOfLines={2}>
                  {badge.desc}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* Locked Badges Section */}
        {lockedBadges.length > 0 && (
          <>
            <View style={[styles.sectionHeader, { marginTop: 25 }]}>
              <Text style={[styles.sectionTitle, { color: themeColors.foreground }]}>
                À Débloquer ({lockedBadges.length})
              </Text>
            </View>
            <View style={styles.badgesGrid}>
              {lockedBadges.map((badge) => (
                <View
                  key={badge.id}
                  style={[
                    styles.badgeCard,
                    styles.lockedBadgeCard,
                    {
                      backgroundColor: themeColors.card,
                      borderColor: themeColors.border,
                    },
                  ]}
                >
                  <View style={styles.badgeTop}>
                    <Text style={[styles.badgeEmoji, { opacity: 0.4 }]}>{badge.emoji}</Text>
                    <Lock size={16} color={themeColors.mutedForeground} />
                  </View>
                  <Text style={[styles.badgeLabel, { color: themeColors.mutedForeground }]} numberOfLines={1}>
                    {badge.label}
                  </Text>
                  <Text style={[styles.badgeDesc, { color: themeColors.mutedForeground }]} numberOfLines={2}>
                    {badge.desc}
                  </Text>
                </View>
              ))}
            </View>
          </>
        )}

        {/* Share CTA */}
        <TouchableOpacity style={styles.shareCta} onPress={handleShare}>
          <LinearGradient
            colors={themeColors.gradientBrand}
            style={styles.shareGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Share2 size={18} color="#FFFFFF" style={{ marginRight: 8 }} />
            <Text style={styles.shareText}>Partager mes trophées 🎉</Text>
          </LinearGradient>
        </TouchableOpacity>
      </ScrollView>
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
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  headerBtn: {
    padding: 6,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: "bold",
  },
  scroll: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  heroCard: {
    borderRadius: 24,
    padding: 22,
    marginTop: 8,
    marginBottom: 20,
  },
  heroTop: {
    flexDirection: "row",
    alignItems: "center",
  },
  trophyIconBg: {
    width: 54,
    height: 54,
    borderRadius: 27,
    backgroundColor: "rgba(255,255,255,0.2)",
    justifyContent: "center",
    alignItems: "center",
  },
  heroRankLabel: {
    fontSize: 10,
    fontWeight: "800",
    color: "rgba(255,255,255,0.75)",
    letterSpacing: 1,
  },
  heroLevelTitle: {
    fontSize: 22,
    fontWeight: "900",
    color: "#FFFFFF",
    marginTop: 2,
  },
  heroLevelSubtitle: {
    fontSize: 12,
    color: "rgba(255,255,255,0.85)",
    marginTop: 2,
  },
  streakBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 14,
    gap: 4,
  },
  streakNum: {
    fontSize: 12,
    fontWeight: "bold",
    color: "#1F2937",
  },
  progressContainer: {
    marginTop: 18,
  },
  progressTextRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 6,
  },
  progressText: {
    fontSize: 11,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
  },
  progressBarBg: {
    height: 8,
    borderRadius: 4,
    backgroundColor: "rgba(255,255,255,0.25)",
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    borderRadius: 4,
    backgroundColor: "#FFFFFF",
  },
  sectionHeader: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: "bold",
  },
  emptyBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 20,
    alignItems: "center",
    marginBottom: 15,
  },
  badgesGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  badgeCard: {
    width: "48%",
    borderRadius: 18,
    padding: 14,
    elevation: 1,
  },
  lockedBadgeCard: {
    borderWidth: 1,
    opacity: 0.65,
  },
  badgeTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  badgeEmoji: {
    fontSize: 28,
  },
  badgeLabel: {
    fontSize: 13,
    fontWeight: "bold",
    marginBottom: 4,
  },
  badgeDesc: {
    fontSize: 11,
    lineHeight: 15,
  },
  shareCta: {
    marginTop: 30,
    height: 50,
    borderRadius: 25,
    overflow: "hidden",
  },
  shareGradient: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  shareText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "bold",
  },
});
