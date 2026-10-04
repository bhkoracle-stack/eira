import { useEffect, useRef } from "react";
import { Animated, Easing, Platform, StyleSheet, Text, useWindowDimensions, View } from "react-native";
import Svg, { Circle, Ellipse, Path } from "react-native-svg";
import { colors } from "../theme";

export function FlowerMark({ size = 28, color = colors.rose }: { size?: number; color?: string }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 32 32">
      <Ellipse cx="16" cy="7.2" rx="4.4" ry="6.4" fill={color} />
      <Ellipse cx="16" cy="24.8" rx="4.4" ry="6.4" fill={color} />
      <Ellipse cx="7.2" cy="16" rx="6.4" ry="4.4" fill={color} />
      <Ellipse cx="24.8" cy="16" rx="6.4" ry="4.4" fill={color} />
      <Circle cx="16" cy="16" r="3.5" fill={colors.gold} />
    </Svg>
  );
}

export function EiraMark({ size = 92 }: { size?: number }) {
  return (
    <Svg width={size} height={size} viewBox="0 0 64 64">
      <Circle cx="32" cy="32" r="30" fill={colors.teal} />
      <Ellipse cx="20.5" cy="22" rx="9.2" ry="10" fill={colors.rose} />
      <Path d="M13.2 24c-.2 8 .6 16 2.2 22 1.2-7 2-14 2.4-22-.8 0-2.4 0-4.6 0z" fill={colors.rose} />
      <Path d="M12.5 51c.8-9 5.2-14 11.2-14s10.4 5 11.2 14" fill={colors.rose} />
      <Circle cx="22.4" cy="23.6" r="6.2" fill={colors.white} />
      <Path d="M33.6 51.4c.7-7.6 4.8-12 10.6-12s9.9 4.4 10.6 12" fill={colors.white} />
      <Circle cx="44.2" cy="24.6" r="6.3" fill={colors.white} />
      <Path
        d="M38 22.8c.5-5 3.2-8.2 6.4-8.2 3.4 0 6 3 6.4 7.4-1.1-2.8-3.4-4.4-6.2-4.4-3.1 0-5.4 2.1-6.6 5.2z"
        fill={colors.tealDark}
      />
    </Svg>
  );
}

export function EiraLogo() {
  return (
    <View style={styles.logoBlock}>
      <EiraMark />
      <Text style={styles.word}>Eira</Text>
      <View style={styles.tagRow}>
        <View style={styles.tag}>
          <Text style={styles.tagText}>18+</Text>
        </View>
        <Text style={styles.tagLine}>Chat & video</Text>
      </View>
    </View>
  );
}

type Petal = {
  id: number;
  left: number;
  size: number;
  duration: number;
  delay: number;
  drift: number;
  spin: number;
  color: string;
  anim: Animated.Value;
};

const petalColors = ["#E25B86", "#F4A7C2", "#F7C9DA", "#F3D7A4", "#C9D7FB"];

function makePetals(count: number): Petal[] {
  return Array.from({ length: count }, (_, id) => ({
    id,
    left: Math.random() * 92,
    size: 12 + Math.random() * 16,
    duration: 9000 + Math.random() * 7000,
    delay: Math.random() * 5000,
    drift: -46 + Math.random() * 92,
    spin: 80 + Math.random() * 220,
    color: petalColors[id % petalColors.length],
    anim: new Animated.Value(0),
  }));
}

export function FallingFlowers() {
  const { height } = useWindowDimensions();
  const petals = useRef(makePetals(16)).current;

  useEffect(() => {
    const running = petals.map((petal) => {
      let alive = true;
      const fall = () => {
        if (!alive) return;
        petal.anim.setValue(0);
        Animated.timing(petal.anim, {
          toValue: 1,
          duration: petal.duration,
          delay: petal.delay,
          easing: Easing.linear,
          useNativeDriver: Platform.OS !== "web",
        }).start(({ finished }) => {
          petal.delay = 0;
          if (finished) fall();
        });
      };
      fall();
      return () => {
        alive = false;
        petal.anim.stopAnimation();
      };
    });
    return () => running.forEach((stop) => stop());
  }, [petals]);

  return (
    <View pointerEvents="none" style={styles.field}>
      {petals.map((petal) => {
        const translateY = petal.anim.interpolate({
          inputRange: [0, 1],
          outputRange: [-48, height + 40],
        });
        const translateX = petal.anim.interpolate({
          inputRange: [0, 0.5, 1],
          outputRange: [0, petal.drift, 0],
        });
        const rotate = petal.anim.interpolate({
          inputRange: [0, 1],
          outputRange: ["0deg", `${petal.spin}deg`],
        });
        const opacity = petal.anim.interpolate({
          inputRange: [0, 0.08, 0.82, 1],
          outputRange: [0, 0.9, 0.75, 0],
        });
        return (
          <Animated.View
            key={petal.id}
            style={[
              styles.petal,
              {
                left: `${petal.left}%`,
                opacity,
                transform: [{ translateY }, { translateX }, { rotate }],
              },
            ]}
          >
            <FlowerMark size={petal.size} color={petal.color} />
          </Animated.View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  logoBlock: { alignItems: "center", gap: 8 },
  word: {
    color: colors.ink,
    fontSize: 72,
    lineHeight: 78,
    fontWeight: "800",
    letterSpacing: -2.4,
  },
  tagRow: { flexDirection: "row", alignItems: "center", gap: 10, marginTop: 2 },
  tag: {
    backgroundColor: colors.rose,
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  tagText: { color: colors.white, fontSize: 12, fontWeight: "800", letterSpacing: 0.4 },
  tagLine: { color: colors.teal, fontSize: 15, fontWeight: "700", letterSpacing: 0.2 },
  field: { ...StyleSheet.absoluteFill, overflow: "hidden", zIndex: 0 },
  petal: { position: "absolute", top: 0 },
});
