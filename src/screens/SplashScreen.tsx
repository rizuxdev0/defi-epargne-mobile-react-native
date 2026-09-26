import React, { useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  Animated,
  Dimensions,
  TouchableOpacity,
  Platform,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  Flame,
  Sparkles,
  ShieldCheck,
  BrainCircuit,
  Phone,
  Mail,
  User,
  ChevronRight,
} from "lucide-react-native";
import * as Haptics from "expo-haptics";
import { useApp } from "../services/AppContext";

const { width } = Dimensions.get("window");

interface SplashScreenProps {
  navigation: any;
}

export default function SplashScreen({ navigation }: SplashScreenProps) {
  const { profile, loading } = useApp();

  // Animation drivers
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.85)).current;
  const cardSlideAnim = useRef(new Animated.Value(40)).current;
  const cardOpacityAnim = useRef(new Animated.Value(0)).current;
  const progressAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Entrance haptic
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    // Parallel entrance animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 900,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 6,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Staggered creator card entrance
    Animated.parallel([
      Animated.timing(cardOpacityAnim, {
        toValue: 1,
        duration: 700,
        delay: 400,
        useNativeDriver: true,
      }),
      Animated.spring(cardSlideAnim, {
        toValue: 0,
        friction: 7,
        tension: 40,
        delay: 400,
        useNativeDriver: true,
      }),
    ]).start();

    // Progress bar animation
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: 2400,
      useNativeDriver: false,
    }).start();

    // Navigate to next screen after splash sequence
    const timer = setTimeout(() => {
      proceedToApp();
    }, 2700);

    return () => clearTimeout(timer);
  }, [loading, profile]);

  const proceedToApp = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.replace("Auth");
  };

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  return (
    <SafeAreaView style={styles.container}>
      {/* Background Ambient Glows */}
      <View style={styles.glowTop} />
      <View style={styles.glowBottom} />

      {/* Skip Button in top right */}
      <TouchableOpacity
        style={styles.skipBtn}
        onPress={proceedToApp}
        activeOpacity={0.7}
      >
        <Text style={styles.skipText}>Passer</Text>
        <ChevronRight size={14} color="#94A3B8" />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Animated Brand Section */}
        <Animated.View
          style={[
            styles.brandContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            },
          ]}
        >
          {/* Logo Badge */}
          <View style={styles.logoBadgeContainer}>
            <View style={styles.logoBadge}>
              <Flame size={42} color="#10B981" />
            </View>
            <View style={styles.sparkleIcon}>
              <Sparkles size={20} color="#F59E0B" />
            </View>
          </View>

          {/* App Title */}
          <Text style={styles.appTitle}>DÉFI ÉPARGNE</Text>
          <Text style={styles.appSubtitle}>
            L'Art de Conquérir sa Liberté Financière
          </Text>

          {/* Feature Badges */}
          <View style={styles.tagsRow}>
            <View style={styles.tag}>
              <ShieldCheck size={13} color="#10B981" />
              <Text style={styles.tagText}>100% Sécurisé & Hors-ligne</Text>
            </View>
            <View style={styles.tag}>
              <BrainCircuit size={13} color="#6366F1" />
              <Text style={styles.tagText}>Coach RIZUX IA</Text>
            </View>
          </View>
        </Animated.View>

        {/* Creator Info / Signature Card */}
        <Animated.View
          style={[
            styles.creatorCard,
            {
              opacity: cardOpacityAnim,
              transform: [{ translateY: cardSlideAnim }],
            },
          ]}
        >
          <View style={styles.creatorHeader}>
            <View style={styles.creatorAvatar}>
              <User size={18} color="#10B981" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.creatorRole}>ARCHITECTE & CONCEPTEUR</Text>
              <Text style={styles.creatorName}>Éric AGUIGAH</Text>
              <Text style={styles.creatorAlias}>Build by Rizux</Text>
            </View>
          </View>

          <View style={styles.cardDivider} />

          {/* Personal contact rows */}
          <View style={styles.contactRow}>
            <Phone size={14} color="#10B981" />
            <Text style={styles.contactText}>+228 96 63 43 45 (WhatsApp)</Text>
          </View>

          <View style={styles.contactRow}>
            <Mail size={14} color="#6366F1" />
            <Text style={styles.contactText}>ericaguigahpro@gmail.com</Text>
          </View>

          <View style={styles.cardFooter}>
            <Text style={styles.versionBadge}>Version 1.0.0 Pro • Release 2026</Text>
          </View>
        </Animated.View>
      </View>

      {/* Bottom Loading Progress Bar */}
      <View style={styles.bottomSection}>
        <View style={styles.progressBarContainer}>
          <Animated.View style={[styles.progressBarFill, { width: progressWidth }]} />
        </View>
        <Text style={styles.loadingText}>Initialisation du coffre-fort sécurisé...</Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090D16",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: Platform.OS === "android" ? 20 : 10,
    paddingHorizontal: 20,
    position: "relative",
  },
  glowTop: {
    position: "absolute",
    top: -100,
    right: -60,
    width: 260,
    height: 260,
    borderRadius: 130,
    backgroundColor: "rgba(16, 185, 129, 0.12)",
  },
  glowBottom: {
    position: "absolute",
    bottom: -80,
    left: -60,
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(99, 102, 241, 0.12)",
  },
  skipBtn: {
    alignSelf: "flex-end",
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: "rgba(255, 255, 255, 0.07)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.1)",
  },
  skipText: {
    color: "#94A3B8",
    fontSize: 12,
    fontWeight: "600",
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    width: "100%",
    maxWidth: 420,
  },
  brandContainer: {
    alignItems: "center",
    marginBottom: 26,
  },
  logoBadgeContainer: {
    position: "relative",
    marginBottom: 16,
  },
  logoBadge: {
    width: 88,
    height: 88,
    borderRadius: 26,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1.5,
    borderColor: "rgba(16, 185, 129, 0.4)",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 8,
  },
  sparkleIcon: {
    position: "absolute",
    top: -6,
    right: -6,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: "#1E293B",
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 1.5,
    borderColor: "#F59E0B",
  },
  appTitle: {
    fontSize: 26,
    fontWeight: "900",
    color: "#FFFFFF",
    letterSpacing: 2.5,
    textAlign: "center",
  },
  appSubtitle: {
    fontSize: 13,
    fontWeight: "500",
    color: "#94A3B8",
    textAlign: "center",
    marginTop: 6,
    letterSpacing: 0.5,
  },
  tagsRow: {
    flexDirection: "row",
    gap: 8,
    marginTop: 14,
  },
  tag: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    backgroundColor: "rgba(255, 255, 255, 0.05)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
  },
  tagText: {
    color: "#CBD5E1",
    fontSize: 11,
    fontWeight: "600",
  },
  creatorCard: {
    width: "100%",
    backgroundColor: "rgba(22, 27, 44, 0.75)",
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.25)",
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.4,
    shadowRadius: 20,
    elevation: 6,
  },
  creatorHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  creatorAvatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  creatorRole: {
    fontSize: 10,
    fontWeight: "800",
    color: "#10B981",
    letterSpacing: 1.2,
  },
  creatorName: {
    fontSize: 17,
    fontWeight: "800",
    color: "#FFFFFF",
    marginTop: 1,
  },
  creatorAlias: {
    fontSize: 11,
    fontWeight: "600",
    color: "#818CF8",
  },
  cardDivider: {
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
    marginVertical: 12,
  },
  contactRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  contactText: {
    color: "#E2E8F0",
    fontSize: 12.5,
    fontWeight: "500",
  },
  cardFooter: {
    marginTop: 4,
    alignItems: "center",
    backgroundColor: "rgba(0, 0, 0, 0.25)",
    paddingVertical: 6,
    borderRadius: 8,
  },
  versionBadge: {
    color: "#64748B",
    fontSize: 10.5,
    fontWeight: "600",
    letterSpacing: 0.5,
  },
  bottomSection: {
    width: "100%",
    alignItems: "center",
    paddingBottom: 10,
  },
  progressBarContainer: {
    width: width * 0.55,
    height: 4,
    backgroundColor: "rgba(255, 255, 255, 0.1)",
    borderRadius: 2,
    overflow: "hidden",
    marginBottom: 8,
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#10B981",
    borderRadius: 2,
  },
  loadingText: {
    color: "#64748B",
    fontSize: 11.5,
    fontWeight: "500",
  },
});
