import { useCallback, useEffect, useRef, useState } from "react";
import {
  FlatList,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as DocumentPicker from "expo-document-picker";
import * as ImagePicker from "expo-image-picker";
import { useLocalSearchParams, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { mediaUrl } from "../../src/config";
import { formFile } from "../../src/files";
import { useSocket } from "../../src/socket";
import { AttachIcon, BackIcon, CameraIcon, CloseIcon, MoreIcon, PhoneIcon, SmileIcon, VideoIcon } from "../../src/components/icons";
import { Avatar } from "../../src/components/ui";
import { chatEmoji, colors, fonts } from "../../src/theme";
import type { ChatMessage, Profile } from "../../src/types";

export default function ChatScreen() {
  const { matchId } = useLocalSearchParams<{ matchId: string }>();
  const { token, user } = useAuth();
  const { socket } = useSocket();
  const router = useRouter();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [partner, setPartner] = useState<Profile | null>(null);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [menu, setMenu] = useState(false);
  const [note, setNote] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const listRef = useRef<FlatList<ChatMessage>>(null);

  const load = useCallback(async () => {
    if (!token || !matchId) return;
    try {
      const [history, matches] = await Promise.all([api.messages(token, matchId), api.matches(token)]);
      setMessages(history.messages);
      setPartner(matches.matches.find((match) => match.id === matchId)?.user || null);
      setError("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not open this chat");
    }
  }, [token, matchId]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!socket || !matchId) return;
    const onMessage = (message: ChatMessage) => {
      if (message.matchId !== matchId) return;
      setMessages((current) => (current.some((item) => item.id === message.id) ? current : [...current, message]));
    };
    socket.on("message:new", onMessage);
    return () => {
      socket.off("message:new", onMessage);
    };
  }, [socket, matchId]);

  async function send() {
    const body = draft.trim();
    if (!body || !token || !matchId) return;
    setDraft("");
    try {
      const result = await api.sendMessage(token, matchId, body);
      setMessages((current) =>
        current.some((item) => item.id === result.message.id) ? current : [...current, result.message]
      );
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (err) {
      setDraft(body);
      setError(err instanceof Error ? err.message : "Message was not sent");
    }
  }

  async function block() {
    if (!token || !partner) return;
    setMenu(false);
    try {
      await api.block(token, partner.id);
      router.back();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not block");
    }
  }

  async function report(reason: string) {
    if (!token || !partner) return;
    setMenu(false);
    try {
      await api.report(token, partner.id, reason);
      setNote("Report sent. Thank you.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the report");
    }
  }

  async function sendAttachment(file: Blob) {
    if (!token || !matchId) return;
    setMenu(false);
    setError("");
    const form = new FormData();
    form.append("file", file);
    try {
      const result = await api.sendAttachment(token, matchId, form);
      setMessages((current) =>
        current.some((item) => item.id === result.message.id) ? current : [...current, result.message]
      );
      requestAnimationFrame(() => listRef.current?.scrollToEnd({ animated: true }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that file");
    }
  }

  async function pickChatPhoto(source: "library" | "camera") {
    if (source === "camera") {
      const permission = await ImagePicker.requestCameraPermissionsAsync();
      if (!permission.granted) {
        setError("Camera access is needed to take a photo.");
        return;
      }
    } else if (Platform.OS !== "web") {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setError("Photo access is needed to attach a picture.");
        return;
      }
    }
    const picked =
      source === "camera"
        ? await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], quality: 0.8 })
        : await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], quality: 0.8 });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const file = await formFile(asset.uri, asset.fileName || "photo.jpg", asset.mimeType || "image/jpeg");
    await sendAttachment(file);
  }

  async function pickChatFile() {
    const picked = await DocumentPicker.getDocumentAsync({
      type: ["image/*", "application/pdf", "text/plain"],
      copyToCacheDirectory: true,
    });
    if (picked.canceled || !picked.assets[0]) return;
    const asset = picked.assets[0];
    const file = await formFile(asset.uri, asset.name, asset.mimeType || "application/octet-stream");
    await sendAttachment(file);
  }

  function openCall(kind: "audio" | "video") {
    setMenu(false);
    router.push({
      pathname: "/call/[matchId]",
      params: { matchId, role: "caller", name: partner?.displayName || "Match", kind },
    });
  }

  function stamp(iso: string) {
    return new Date(iso).toLocaleString([], { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.header}>
        <Pressable accessibilityRole="button" accessibilityLabel="Back" onPress={() => router.back()} hitSlop={12}>
          <BackIcon />
        </Pressable>
        <Avatar name={partner?.displayName || "Chat"} photoUrl={partner?.photoUrl} size={40} />
        <View style={styles.headerCopy}>
          <Text style={styles.name} numberOfLines={1}>
            {partner?.displayName || "Chat"}
          </Text>
          <Text style={styles.sub}>{messages.length} messages · {partner?.city || "Private chat"}</Text>
        </View>
        <Pressable accessibilityRole="button" accessibilityLabel="Phone call" style={styles.iconButton} onPress={() => openCall("audio")}>
          <PhoneIcon />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="Video call" style={styles.iconButton} onPress={() => openCall("video")}>
          <VideoIcon />
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel="More options" style={styles.iconButton} onPress={() => setMenu(true)}>
          <MoreIcon />
        </Pressable>
      </View>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {note ? <Text style={styles.note}>{note}</Text> : null}
      <FlatList
        ref={listRef}
        data={messages}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={<Text style={styles.empty}>No messages yet. Say hello, or start a phone or video call.</Text>}
        onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: false })}
        renderItem={({ item }) => {
          const mine = item.senderId === user?.id;
          const photo = item.attachmentType === "image" ? mediaUrl(item.attachmentUrl) : null;
          const fileLink = item.attachmentType === "file" ? mediaUrl(item.attachmentUrl) : null;
          const caption =
            item.body && item.body !== "Photo" && !(fileLink && item.body === item.attachmentName) ? item.body : "";
          const playful = !photo && !fileLink && caption.trim().length > 0 && caption.trim().length <= 12;
          return (
            <View style={[styles.bubbleWrap, mine ? styles.mineWrap : styles.theirWrap]}>
              <View style={[styles.bubble, mine ? styles.mine : styles.theirs]}>
                {photo ? <Image source={{ uri: photo }} style={styles.photo} /> : null}
                {fileLink ? (
                  <Pressable onPress={() => Linking.openURL(fileLink)}>
                    <Text style={[styles.fileName, mine && styles.mineText]}>{item.attachmentName || item.body}</Text>
                  </Pressable>
                ) : null}
                {caption ? (
                  <Text style={[styles.body, playful && styles.playful, mine && styles.mineText]}>{caption}</Text>
                ) : null}
              </View>
              <Text style={styles.time}>{stamp(item.createdAt)}</Text>
            </View>
          );
        }}
      />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
        {emojiOpen ? (
          <View style={styles.emojiRow}>
            {chatEmoji.map((emoji) => (
              <Pressable key={emoji} onPress={() => setDraft((current) => `${current}${emoji}`)} hitSlop={6}>
                <Text style={styles.emoji}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        ) : null}
        <View style={styles.composer}>
          <Pressable accessibilityLabel="Attach" style={styles.iconButton} onPress={() => setMenu(true)}>
            <AttachIcon />
          </Pressable>
          <Pressable accessibilityLabel={emojiOpen ? "Close emoji" : "Emoji"} style={styles.emojiToggle} onPress={() => setEmojiOpen((open) => !open)}>
            {emojiOpen ? <CloseIcon size={22} color={colors.teal} /> : <SmileIcon size={24} />}
          </Pressable>
          <TextInput
            style={styles.input}
            placeholder="Message"
            placeholderTextColor={colors.muted}
            value={draft}
            onChangeText={setDraft}
            multiline
          />
          <Pressable style={styles.send} onPress={send}>
            <Text style={styles.sendText}>Send</Text>
          </Pressable>
        </View>
      </KeyboardAvoidingView>
      {menu ? (
        <Pressable style={styles.scrim} onPress={() => setMenu(false)}>
          <View style={styles.menu}>
            <Text style={styles.menuTitle}>Options</Text>
            {partner?.bio ? <Text style={styles.menuBio}>{partner.bio}</Text> : null}
            <Pressable style={styles.menuRow} onPress={() => pickChatPhoto("library")}>
              <AttachIcon size={20} />
              <Text style={styles.menuItem}>Send a photo</Text>
            </Pressable>
            <Pressable style={styles.menuRow} onPress={() => pickChatPhoto("camera")}>
              <CameraIcon size={20} />
              <Text style={styles.menuItem}>Take a photo</Text>
            </Pressable>
            <Pressable style={styles.menuRow} onPress={pickChatFile}>
              <AttachIcon size={20} />
              <Text style={styles.menuItem}>Attach a file</Text>
            </Pressable>
            <Pressable
              style={styles.menuRow}
              onPress={() => {
                setMenu(false);
                setEmojiOpen(true);
              }}
            >
              <Text style={styles.menuItem}>Emoji</Text>
            </Pressable>
            <Pressable style={styles.menuRow} onPress={() => openCall("audio")}>
              <PhoneIcon size={20} />
              <Text style={styles.menuItem}>Phone call</Text>
            </Pressable>
            <Pressable style={styles.menuRow} onPress={() => openCall("video")}>
              <VideoIcon size={20} />
              <Text style={styles.menuItem}>Video call</Text>
            </Pressable>
            <Pressable style={styles.menuRow} onPress={() => report("Harassment")}><Text style={styles.menuItem}>Report harassment</Text></Pressable>
            <Pressable style={styles.menuRow} onPress={() => report("Fake profile")}><Text style={styles.menuItem}>Report a fake profile</Text></Pressable>
            <Pressable style={styles.menuRow} onPress={() => report("Spam")}><Text style={styles.menuItem}>Report spam</Text></Pressable>
            <Pressable style={styles.menuRow} onPress={block}><Text style={[styles.menuItem, styles.danger]}>Block</Text></Pressable>
            <Pressable style={styles.menuRow} onPress={() => setMenu(false)}><Text style={styles.menuItem}>Close</Text></Pressable>
          </View>
        </Pressable>
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.line,
  },
  headerCopy: { flex: 1 },
  iconButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#EEF3FF",
    alignItems: "center",
    justifyContent: "center",
  },
  name: { fontFamily: fonts.display, fontSize: 22, color: colors.ink },
  sub: { color: colors.muted },
  note: { color: colors.good, paddingHorizontal: 16, paddingTop: 8, fontWeight: "700" },
  list: { padding: 16, gap: 10, flexGrow: 1 },
  empty: { color: colors.muted, fontSize: 16, lineHeight: 22, marginTop: 24 },
  bubbleWrap: { maxWidth: "80%", gap: 4 },
  mineWrap: { alignSelf: "flex-end", alignItems: "flex-end" },
  theirWrap: { alignSelf: "flex-start", alignItems: "flex-start" },
  time: { color: colors.muted, fontSize: 11 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  mine: { alignSelf: "flex-end", backgroundColor: colors.plum, borderBottomRightRadius: 6 },
  theirs: { alignSelf: "flex-start", backgroundColor: colors.card, borderWidth: 1, borderColor: colors.line, borderBottomLeftRadius: 6 },
  photo: { width: 220, height: 280, borderRadius: 12, marginBottom: 6 },
  fileName: { color: colors.ink, fontSize: 16, fontWeight: "700", textDecorationLine: "underline" },
  body: { color: colors.ink, fontSize: 16, lineHeight: 22 },
  playful: { fontSize: 22, lineHeight: 28 },
  emojiToggle: { paddingHorizontal: 4, paddingVertical: 10 },
  emojiToggleText: { color: colors.teal, fontWeight: "700", fontSize: 22 },
  emojiRow: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingTop: 8 },
  emoji: { fontSize: 22 },
  mineText: { color: colors.white },
  composer: { flexDirection: "row", gap: 8, padding: 12, alignItems: "flex-end" },
  input: {
    flex: 1,
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: 16,
    paddingHorizontal: 14,
    paddingVertical: 10,
    maxHeight: 120,
    color: colors.ink,
    fontSize: 16,
  },
  send: { backgroundColor: colors.plum, borderRadius: 16, paddingHorizontal: 16, paddingVertical: 12 },
  sendText: { color: colors.white, fontWeight: "700" },
  error: { color: colors.coral, paddingHorizontal: 16, paddingTop: 8 },
  scrim: { ...StyleSheet.absoluteFill, backgroundColor: "rgba(36,20,28,0.35)", justifyContent: "flex-end" },
  menu: {
    backgroundColor: colors.card,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 18,
    paddingBottom: 28,
    gap: 4,
  },
  menuTitle: { fontFamily: fonts.display, fontSize: 28, color: colors.ink, marginBottom: 6 },
  menuBio: { color: colors.muted, lineHeight: 20, marginBottom: 8 },
  menuRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingVertical: 12 },
  menuItem: { color: colors.ink, fontSize: 16, fontWeight: "600" },
  danger: { color: colors.coral, fontWeight: "700" },
});
