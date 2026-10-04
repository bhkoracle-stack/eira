import { Modal, Pressable, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { PhoneIcon, VideoIcon } from "./icons";
import { useSocket } from "../socket";
import { colors, fonts } from "../theme";

export function IncomingCall() {
  const router = useRouter();
  const { incoming, clearIncoming, socket } = useSocket();

  function decline() {
    if (incoming) socket?.emit("call:reject", { matchId: incoming.matchId });
    clearIncoming();
  }

  function accept() {
    if (!incoming) return;
    const { matchId, fromName, kind } = incoming;
    clearIncoming();
    router.push({
      pathname: "/call/[matchId]",
      params: { matchId, role: "callee", name: fromName, kind: kind === "audio" ? "audio" : "video" },
    });
  }

  return (
    <Modal visible={Boolean(incoming)} transparent animationType="slide">
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.iconWrap}>
            {incoming?.kind === "audio" ? <PhoneIcon color={colors.white} size={28} /> : <VideoIcon color={colors.white} size={28} />}
          </View>
          <Text style={styles.kicker}>{incoming?.kind === "audio" ? "Incoming phone call" : "Incoming video call"}</Text>
          <Text style={styles.name}>{incoming?.fromName}</Text>
          <View style={styles.row}>
            <Pressable style={[styles.action, styles.decline]} onPress={decline}>
              <Text style={styles.actionText}>Decline</Text>
            </Pressable>
            <Pressable style={[styles.action, styles.accept]} onPress={accept}>
              <Text style={styles.actionText}>Accept</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(28,25,21,0.35)", padding: 16 },
  card: { backgroundColor: colors.card, borderRadius: 24, padding: 22 },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.plum,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  kicker: { color: colors.plum, fontWeight: "700", letterSpacing: 0.4 },
  name: { fontFamily: fonts.display, fontSize: 34, color: colors.ink, marginTop: 6 },
  row: { flexDirection: "row", gap: 12, marginTop: 20 },
  action: { flex: 1, minHeight: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  decline: { backgroundColor: colors.coral },
  accept: { backgroundColor: colors.teal },
  actionText: { color: colors.white, fontWeight: "700", fontSize: 16 },
});
