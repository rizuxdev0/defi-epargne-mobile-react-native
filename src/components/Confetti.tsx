import React, { useEffect, useRef } from "react";
import { View, StyleSheet, Dimensions, Animated, Easing } from "react-native";

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

const COLORS = [
  "#6C3FC4", // Violet
  "#3B82F6", // Bleu
  "#10B981", // Vert
  "#FBBF24", // Jaune
  "#EC4899", // Rose
  "#F43F5E", // Rouge
  "#8B5CF6", // Mauve
  "#06B6D4"  // Cyan
];

interface Particle {
  id: number;
  color: string;
  size: number;
  shape: "circle" | "square";
  x: Animated.Value;
  y: Animated.Value;
  rotate: Animated.Value;
}

export default function Confetti({ active, onAnimationEnd }: { active: boolean; onAnimationEnd?: () => void }) {
  const particles = useRef<Particle[]>([]);

  if (particles.current.length === 0) {
    particles.current = Array.from({ length: 60 }).map((_, i) => ({
      id: i,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      size: Math.floor(Math.random() * 8) + 6,
      shape: Math.random() > 0.5 ? "circle" : "square",
      x: new Animated.Value(Math.random() * SCREEN_WIDTH),
      y: new Animated.Value(-20),
      rotate: new Animated.Value(0),
    }));
  }

  useEffect(() => {
    if (active) {
      // Reset values
      particles.current.forEach((p) => {
        p.y.setValue(-20);
        p.x.setValue(Math.random() * SCREEN_WIDTH);
        p.rotate.setValue(0);
      });

      // Start animations
      const animations = particles.current.map((p) => {
        const duration = Math.floor(Math.random() * 2000) + 2500; // 2.5 to 4.5 seconds
        const delay = Math.floor(Math.random() * 1000); // Staggered start
        const toX = Math.random() * SCREEN_WIDTH;

        return Animated.parallel([
          Animated.timing(p.y, {
            toValue: SCREEN_HEIGHT + 20,
            duration,
            delay,
            easing: Easing.bezier(0.1, 0.6, 0.4, 1),
            useNativeDriver: true,
          }),
          Animated.timing(p.x, {
            toValue: toX,
            duration,
            delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
          Animated.timing(p.rotate, {
            toValue: 360 * (Math.random() > 0.5 ? 2 : -2),
            duration,
            delay,
            easing: Easing.linear,
            useNativeDriver: true,
          }),
        ]);
      });

      Animated.parallel(animations).start(() => {
        if (onAnimationEnd) {
          onAnimationEnd();
        }
      });
    }
  }, [active]);

  if (!active) return null;

  return (
    <View style={StyleSheet.absoluteFill} pointerEvents="none">
      {particles.current.map((p) => {
        const rotation = p.rotate.interpolate({
          inputRange: [-720, 720],
          outputRange: ["-720deg", "720deg"],
        });

        return (
          <Animated.View
            key={p.id}
            style={[
              styles.particle,
              {
                backgroundColor: p.color,
                width: p.size,
                height: p.size,
                borderRadius: p.shape === "circle" ? p.size / 2 : 2,
                transform: [
                  { translateX: p.x },
                  { translateY: p.y },
                  { rotate: rotation },
                ],
              },
            ]}
          />
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  particle: {
    position: "absolute",
    top: 0,
    left: 0,
    zIndex: 9999,
  },
});
