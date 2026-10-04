import { useCallback, useState } from "react";
import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useFocusEffect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { Avatar, ErrorText, Title } from "../../src/components/ui";
import { colors } from "../../src/theme";
import type { Match } from "../../src/types";

export default function MatchesScreen() {
  const { token } = useAuth();
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    if (!token) return;
    try {
      const result = await api.matches(token);
      setMatches(result.matches);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not load matches");
    }
  }, [token]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <SafeAreaView style={styles.safe}>
      <Title>Matched</Title>
      <Text style={styles.note}>Friends who liked you back. Chat stays between the two of you.</Text>
      <ErrorText>{error}</ErrorText>
      <FlatList
        data={matches}
        keyExtractor={(item) => item.id}
        contentContainerStyle={matches.length === 0 ? styles.emptyWrap : undefined}
        ListEmptyComponent={<Text style={styles.empty}>No matches yet. A like on Discover becomes a match when you both say yes.</Text>}
        renderItem={({ item }) => (
          <Pressable
            style={styles.row}
            onPress={() => router.push({ pathname: "/chat/[matchId]", params: { matchId: item.id } })}
          >
            <Avatar name={item.user.displayName} photoUrl={item.user.photoUrl} />
            <View style={styles.copy}>
              <Text style={styles.name}>{item.user.displayName}</Text>
              <Text style={styles.preview} numberOfLines={1}>
                {item.lastMessage || "Start a conversation"}
              </Text>
            </View>
            {item.online ? <View style={styles.dot} /> : null}
          </Pressable>
        )}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, paddingHorizontal: 20, paddingTop: 8 },
  note: { color: colors.muted, marginTop: 6, marginBottom: 8, lineHeight: 22 },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: colors.card,
    borderRadius: 18,
    padding: 12,
    marginTop: 10,
    borderWidth: 1,
    borderColor: colors.line,
  },
  copy: { flex: 1 },
  name: { color: colors.ink, fontSize: 17, fontWeight: "700" },
  preview: { color: colors.muted, marginTop: 2 },
  dot: { width: 10, height: 10, borderRadius: 5, backgroundColor: colors.good },
  emptyWrap: { flexGrow: 1, justifyContent: "center" },
  empty: { color: colors.muted, fontSize: 16, lineHeight: 22 },
});
