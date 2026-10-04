import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { PhoneIcon, VideoIcon } from "../../src/components/icons";
import { Avatar, ErrorText, Title } from "../../src/components/ui";
import { useSocket } from "../../src/socket";
import { colors } from "../../src/theme";
import type { Match } from "../../src/types";

export default function ChatsScreen() {
  const { token } = useAuth();
  const { notice, clearNotice } = useSocket();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const result = await api.matches(token);
      setMatches(result.matches.filter((match) => match.lastMessage));
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load chats");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Title>Chats</Title>
      <Text style={styles.note}>Your conversation history. Call from the phone and video buttons.</Text>
      <ErrorText>{error}</ErrorText>
      {notice ? (
        <Pressable
          style={styles.banner}
          onPress={() => {
            const matchId = notice.matchId;
            clearNotice();
            router.push({ pathname: "/chat/[matchId]", params: { matchId } });
          }}
        >
          <Text style={styles.bannerText}>New match with {notice.name}. Tap to open the chat.</Text>
        </Pressable>
      ) : null}
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={matches.length === 0 ? styles.emptyWrap : undefined}
        ListEmptyComponent={<Text style={styles.empty}>Conversations appear here after you both match.</Text>}
        renderItem={({ item }) => (
          <View style={styles.row}>
            <Pressable
              style={styles.copyHit}
              onPress={() => router.push({ pathname: "/chat/[matchId]", params: { matchId: item.id } })}
            >
            <Avatar name={item.user.displayName} photoUrl={item.user.photoUrl} />
            <View style={styles.copy}>
              <Text style={styles.name}>{item.user.displayName}</Text>
              <Text numberOfLines={1} style={styles.preview}>
                {item.lastMessage}
              </Text>
              {item.lastMessageAt ? <Text style={styles.when}>{new Date(item.lastMessageAt).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</Text> : null}
            </View>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Phone ${item.user.displayName}`}
              style={styles.call}
              onPress={() =>
                router.push({ pathname: "/call/[matchId]", params: { matchId: item.id, role: "caller", name: item.user.displayName, kind: "audio" } })
              }
            >
              <PhoneIcon size={18} />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Video ${item.user.displayName}`}
              style={styles.call}
              onPress={() =>
                router.push({ pathname: "/call/[matchId]", params: { matchId: item.id, role: "caller", name: item.user.displayName, kind: "video" } })
              }
            >
              <VideoIcon size={18} />
            </Pressable>
          </View>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 8 },
  note: { color: colors.muted, marginTop: 6, marginBottom: 8, lineHeight: 22 },
  banner: { backgroundColor: colors.teal, borderRadius: 16, padding: 14, marginTop: 12 },
  bannerText: { color: colors.paper, fontWeight: "600" },
  row: {
    flexDirection: "row",
    gap: 12,
    alignItems: "center",
    backgroundColor: colors.card,
    borderRadius: 20,
    padding: 14,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  copyHit: { flex: 1, flexDirection: "row", alignItems: "center", gap: 12 },
  copy: { flex: 1 },
  name: { fontWeight: "700", color: colors.ink, fontSize: 16 },
  preview: { color: colors.muted, marginTop: 2 },
  when: { color: colors.muted, fontSize: 11, marginTop: 4 },
  call: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "#EEF3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  emptyWrap: { flexGrow: 1, justifyContent: "center" },
  empty: { color: colors.muted, fontSize: 16, lineHeight: 22 },
});
