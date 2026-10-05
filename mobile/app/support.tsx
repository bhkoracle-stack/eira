import { useEffect, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { api } from "../src/api";
import { useAuth } from "../src/auth";
import { Button, CopyrightLine, ErrorText, Field } from "../src/components/ui";
import { colors, fonts } from "../src/theme";

const topics = ["Account", "Profile photo", "Chat", "Calls", "Safety", "Copyright", "Other"];

export default function SupportScreen() {
  const router = useRouter();
  const { user, token } = useAuth();
  const [email, setEmail] = useState(user?.email || "");
  const [topic, setTopic] = useState("Account");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [sent, setSent] = useState(false);
  const [delivered, setDelivered] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail((current) => current || user.email);
  }, [user?.email]);

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await api.sendSupport({ email: email.trim(), topic, message: message.trim() }, token);
      setDelivered(result.delivered !== false);
      setSent(true);
      setMessage("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send that message");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Back</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Support</Text>
        <Text style={styles.body}>
          Ask for help with your account, a profile photo, chat, a call, safety, or a copyright concern. Replies go to the email you enter.
        </Text>
        <Pressable onPress={() => Linking.openURL("mailto:support@eira.app")}>
          <Text style={styles.link}>support@eira.app</Text>
        </Pressable>
        <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
        <Text style={styles.label}>Topic</Text>
        <View style={styles.choices}>
          {topics.map((option) => (
            <Pressable
              key={option}
              onPress={() => setTopic(option)}
              style={[styles.choice, topic === option && styles.choiceOn]}
            >
              <Text style={[styles.choiceText, topic === option && styles.choiceTextOn]}>{option}</Text>
            </Pressable>
          ))}
        </View>
        <Field
          label="Message"
          value={message}
          onChangeText={setMessage}
          multiline
          style={styles.message}
          placeholder="What do you need help with?"
        />
        <ErrorText>{error}</ErrorText>
        {sent ? (
          <Text style={styles.sent}>
            {delivered
              ? `Message sent. We will reply to ${email.trim()}.`
              : "Message saved. Email delivery is not available yet."}
          </Text>
        ) : null}
        <Button label={sent ? "Send another message" : "Send to support"} onPress={submit} disabled={busy} />
        <CopyrightLine />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, padding: 20 },
  back: { color: colors.plum, fontWeight: "700", marginBottom: 12 },
  content: { paddingBottom: 40, gap: 12 },
  title: { fontFamily: fonts.display, fontSize: 34, color: colors.ink },
  body: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  link: { color: colors.teal, fontWeight: "700", fontSize: 16 },
  label: { color: colors.muted, marginTop: 4 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    backgroundColor: colors.card,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.line,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  choiceOn: { backgroundColor: colors.plum, borderColor: colors.plum },
  choiceText: { color: colors.ink, fontWeight: "700" },
  choiceTextOn: { color: colors.white },
  message: { minHeight: 120, textAlignVertical: "top" },
  sent: { color: colors.good, fontWeight: "700" },
});
