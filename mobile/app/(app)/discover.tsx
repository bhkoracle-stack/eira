import { useCallback, useEffect, useRef, useState } from "react";
import {
  ActivityIndicator,
  Animated,
  PanResponder,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { Image } from "react-native";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { mediaUrl } from "../../src/config";
import { FlowerMark } from "../../src/components/brand";
import { errorMessage } from "../../src/errors";
import { readCurrentPlace } from "../../src/place";
import { CloseIcon, HeartTabIcon, PinIcon } from "../../src/components/icons";
import { Button } from "../../src/components/ui";
import { colors, fonts } from "../../src/theme";
import type { Profile } from "../../src/types";

function CardFace({ profile }: { profile: Profile }) {
  const photo = mediaUrl(profile.photoUrl);
  return (
    <>
      {photo ? (
        <Image source={{ uri: photo }} style={styles.photo} resizeMode="contain" />
      ) : (
        <View style={styles.photoFallback}>
          <Text style={styles.initial}>{profile.displayName.slice(0, 1)}</Text>
        </View>
      )}
      <View style={styles.shade}>
        <Text style={styles.name}>
          {profile.displayName}, {profile.age}
        </Text>
        <View style={styles.cityRow}>
          <PinIcon />
          <Text style={styles.city}>{placeLine(profile)}</Text>
        </View>
        <Text style={styles.bio} numberOfLines={3}>
          {profile.bio || "Say hello and see where it goes."}
        </Text>
      </View>
    </>
  );
}

function placeLine(profile: Profile) {
  if (profile.distanceKm == null || profile.distanceKm < 2) return profile.city || "Nearby";
  return `${profile.distanceKm} km · ${profile.city}`;
}

export default function DiscoverScreen() {
  const { token, user, setUser } = useAuth();
  const router = useRouter();
  const { width } = useWindowDimensions();
  const [deck, setDeck] = useState<Profile[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [matchName, setMatchName] = useState<{ id: string; name: string } | null>(null);
  const pan = useRef(new Animated.ValueXY()).current;
  const busyRef = useRef(false);
  const mounted = useRef(true);
  const deckRef = useRef(deck);
  deckRef.current = deck;

  useEffect(() => {
    mounted.current = true;
    return () => {
      mounted.current = false;
    };
  }, []);

  const load = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");
    try {
      const result = await api.discover(token);
      if (!mounted.current) return;
      setDeck(Array.isArray(result.profiles) ? result.profiles : []);
    } catch (err) {
      if (mounted.current) setError(errorMessage(err, "Could not load people"));
    } finally {
      if (mounted.current) setLoading(false);
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  useEffect(() => {
    if (!token) return;
    let active = true;
    (async () => {
      try {
        const place = await readCurrentPlace(token);
        if (!active) return;
        const result = await api.updateMe(token, {
          latitude: place.latitude,
          longitude: place.longitude,
          ...(place.country ? { country: place.country } : {}),
          ...(!user?.city && place.city ? { city: place.city } : {}),
        });
        if (active) setUser(result.user);
        if (active) load();
      } catch {
        /* The deck still uses the city saved on the profile. */
      }
    })();
    return () => {
      active = false;
    };
  }, [token]);

  const finishSwipe = useCallback(
    async (liked: boolean) => {
      const current = deckRef.current[0];
      if (!current || !token) {
        busyRef.current = false;
        setBusy(false);
        return;
      }
      setDeck((items) => items.slice(1));
      pan.setValue({ x: 0, y: 0 });
      try {
        const result = await api.swipe(token, current.id, liked);
        if (!mounted.current) return;
        if (result.matched && result.match) {
          setMatchName({ id: result.match.id, name: result.match.user.displayName });
        }
      } catch (err) {
        if (!mounted.current) return;
        setDeck((items) => [current, ...items.filter((item) => item.id !== current.id)]);
        setError(errorMessage(err, "Could not save that swipe. Try again."));
      } finally {
        busyRef.current = false;
        if (mounted.current) setBusy(false);
      }
    },
    [pan, token]
  );

  const swipe = useCallback(
    (liked: boolean) => {
      if (busyRef.current || !deckRef.current[0]) return;
      busyRef.current = true;
      setBusy(true);
      setError("");
      Animated.timing(pan, {
        toValue: { x: liked ? width : -width, y: 36 },
        duration: 240,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) finishSwipe(liked);
        else {
          busyRef.current = false;
          setBusy(false);
        }
      });
    },
    [finishSwipe, pan, width]
  );

  const swipeRef = useRef(swipe);
  swipeRef.current = swipe;

  const responder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_event, gesture) => !busyRef.current && Math.abs(gesture.dx) > 8,
      onPanResponderMove: Animated.event([null, { dx: pan.x, dy: pan.y }], { useNativeDriver: false }),
      onPanResponderRelease: (_event, gesture) => {
        if (gesture.dx > 110) swipeRef.current(true);
        else if (gesture.dx < -110) swipeRef.current(false);
        else Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false, friction: 6 }).start();
      },
      onPanResponderTerminate: () => {
        Animated.spring(pan, { toValue: { x: 0, y: 0 }, useNativeDriver: false }).start();
      },
    })
  ).current;

  const current = deck[0];
  const next = deck[1];
  const rotate = pan.x.interpolate({ inputRange: [-width, width], outputRange: ["-12deg", "12deg"], extrapolate: "clamp" });
  const friendOpacity = pan.x.interpolate({ inputRange: [20, 120], outputRange: [0, 1], extrapolate: "clamp" });
  const skipOpacity = pan.x.interpolate({ inputRange: [-120, -20], outputRange: [1, 0], extrapolate: "clamp" });

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <FlowerMark size={26} />
          <Text style={styles.kicker}>Find friends</Text>
        </View>
        <Text style={styles.headerNote}>Swipe right to connect. Swipe left to skip.</Text>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <View style={styles.stage}>
        {loading ? (
          <View style={styles.empty}>
            <ActivityIndicator color={colors.rose} />
            <Text style={styles.emptyBody}>Finding people near you…</Text>
          </View>
        ) : null}
        {!current && !loading ? (
          <View style={styles.empty}>
            <View style={styles.emptyMark}>
              <FlowerMark size={42} />
            </View>
            <Text style={styles.emptyTitle}>You're caught up</Text>
            <Text style={styles.emptyBody}>New friends show up here when they join. Pull in a fresh deck anytime.</Text>
            <Button label="Refresh" onPress={load} />
          </View>
        ) : null}
        {next ? (
          <View pointerEvents="none" style={[styles.card, styles.behind]}>
            <CardFace profile={next} />
          </View>
        ) : null}
        {current ? (
          <Animated.View
            style={[styles.card, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { rotate }] }]}
            {...responder.panHandlers}
          >
            <CardFace profile={current} />
            <Animated.View style={[styles.stamp, styles.friendStamp, { opacity: friendOpacity }]}>
              <Text style={styles.friendStampText}>FRIEND</Text>
            </Animated.View>
            <Animated.View style={[styles.stamp, styles.skipStamp, { opacity: skipOpacity }]}>
              <Text style={styles.skipStampText}>SKIP</Text>
            </Animated.View>
          </Animated.View>
        ) : null}
      </View>
      {current ? (
        <View style={styles.actions}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Skip"
            disabled={busy}
            style={[styles.round, styles.skip]}
            onPress={() => swipe(false)}
          >
            <CloseIcon size={26} />
            <Text style={styles.skipLabel}>Skip</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Add friend"
            disabled={busy}
            style={[styles.round, styles.friend]}
            onPress={() => swipe(true)}
          >
            <HeartTabIcon color={colors.rose} filled size={26} />
            <Text style={styles.friendLabel}>Friend</Text>
          </Pressable>
        </View>
      ) : null}
      {matchName ? (
        <View style={styles.matchOverlay}>
          <FlowerMark size={48} color="#F7D6E4" />
          <Text style={styles.matchKicker}>New friend</Text>
          <Text style={styles.matchName}>{matchName.name}</Text>
          <Text style={styles.matchBody}>You both swiped right. Say hi, or start a call from the chat.</Text>
          <Button
            label="Open chat"
            onPress={() => {
              const id = matchName.id;
              setMatchName(null);
              router.push({ pathname: "/chat/[matchId]", params: { matchId: id } });
            }}
          />
          <Pressable onPress={() => setMatchName(null)}>
            <Text style={styles.later}>Keep swiping</Text>
          </Pressable>
        </View>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 16 },
  header: { paddingTop: 6, paddingBottom: 8 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  kicker: { color: colors.ink, fontSize: 28, fontWeight: "800" },
  headerNote: { color: colors.muted, marginTop: 2 },
  error: { color: colors.coral, fontWeight: "700", marginBottom: 6 },
  stage: { flex: 1, marginBottom: 8 },
  card: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.card,
    borderRadius: 28,
    overflow: "hidden",
    borderWidth: 1,
    borderColor: colors.line,
  },
  behind: { top: 14, transform: [{ scale: 0.96 }] },
  photo: { ...StyleSheet.absoluteFill, width: "100%", height: "100%", backgroundColor: "#243044" },
  photoFallback: { ...StyleSheet.absoluteFill, backgroundColor: colors.teal, alignItems: "center", justifyContent: "center" },
  initial: { fontFamily: fonts.display, fontSize: 84, color: colors.white, fontWeight: "700" },
  shade: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 18,
    paddingTop: 28,
    paddingBottom: 18,
    backgroundColor: "rgba(23,32,51,0.72)",
  },
  name: { color: colors.white, fontSize: 30, fontWeight: "800" },
  cityRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 4 },
  city: { color: "#F7D6E4", fontWeight: "700" },
  bio: { color: colors.white, marginTop: 8, lineHeight: 22 },
  stamp: {
    position: "absolute",
    top: 28,
    borderWidth: 4,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  friendStamp: { left: 18, borderColor: "#3DDC97", transform: [{ rotate: "-14deg" }] },
  skipStamp: { right: 18, borderColor: colors.coral, transform: [{ rotate: "14deg" }] },
  friendStampText: { color: "#3DDC97", fontSize: 28, fontWeight: "900" },
  skipStampText: { color: colors.coral, fontSize: 28, fontWeight: "900" },
  actions: { flexDirection: "row", justifyContent: "center", gap: 28, paddingBottom: 10 },
  round: {
    width: 84,
    height: 84,
    borderRadius: 42,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
  },
  skip: {},
  friend: { backgroundColor: "#FFF1F6", borderColor: "#F3C3D6" },
  skipLabel: { color: colors.ink, fontWeight: "800", fontSize: 12, marginTop: 2 },
  friendLabel: { color: colors.rose, fontWeight: "800", fontSize: 12, marginTop: 2 },
  empty: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 12 },
  emptyMark: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: colors.blush,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyTitle: { fontFamily: fonts.display, fontSize: 32, color: colors.ink, textAlign: "center" },
  emptyBody: { color: colors.muted, fontSize: 16, lineHeight: 22, textAlign: "center" },
  matchOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: colors.plum,
    margin: 16,
    borderRadius: 28,
    padding: 24,
    justifyContent: "flex-end",
  },
  matchEmoji: { fontSize: 56, marginBottom: 8 },
  matchKicker: { color: "#F8C2D4", fontWeight: "800", letterSpacing: 0.4, fontSize: 16 },
  matchName: { fontFamily: fonts.display, fontSize: 44, color: colors.paper, marginTop: 8 },
  matchBody: { color: "#E7E1D6", fontSize: 16, lineHeight: 22, marginVertical: 16 },
  later: { color: colors.paper, textAlign: "center", marginTop: 16, fontWeight: "700" },
});
