import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../src/api";
import { useAuth } from "../src/auth";
import { FallingFlowers, EiraLogo } from "../src/components/brand";
import { Button, CopyrightLine, ErrorText, Field } from "../src/components/ui";
import { colors, fonts } from "../src/theme";

export default function LoginScreen() {
  const { user, signIn } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Redirect href={user.role === "admin" ? "/admin" : "/discover"} />;

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const result = await api.login(email.trim(), password);
      await signIn(result.token, result.user);
      router.replace(result.user.role === "admin" ? "/admin" : "/discover");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not sign in");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <FallingFlowers />
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.layer}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <EiraLogo />
            <Text style={styles.heroTitle}>Meet with a little more care.</Text>
            <Text style={styles.heroNote}>Where a quiet hello can become a call.</Text>
          </View>
          <View style={styles.sheet}>
          <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />
          <Link href="/forgot" style={styles.forgot}>
            Forgot password?
          </Link>
          <ErrorText>{error}</ErrorText>
          <Button label="Sign in" onPress={submit} disabled={busy} />
          <Link href="/register" style={styles.link}>
            Create an account
          </Link>
          <Link href="/legal" style={styles.legal}>
            Privacy, terms, and copyright
          </Link>
          <Link href="/support" style={styles.legal}>
            Support
          </Link>
          <CopyrightLine />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, overflow: "hidden" },
  layer: { flex: 1, zIndex: 2 },
  content: { padding: 24, paddingBottom: 40, alignItems: "center" },
  hero: { width: "100%", maxWidth: 440, alignItems: "center", paddingTop: 18, paddingBottom: 8, backgroundColor: colors.paper, zIndex: 2 },
  heroTitle: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38, color: colors.ink, fontWeight: "700", marginTop: 22, textAlign: "center" },
  heroNote: { color: colors.muted, marginTop: 10, fontSize: 18, lineHeight: 26, textAlign: "center" },
  sheet: { marginTop: 8, width: "100%", maxWidth: 440, backgroundColor: colors.paper, zIndex: 2 },
  forgot: { textAlign: "right", marginTop: 4, marginBottom: 8, color: colors.teal, fontSize: 15, fontWeight: "600" },
  link: { textAlign: "center", marginTop: 18, color: colors.ink, fontSize: 16, fontWeight: "600" },
  legal: { textAlign: "center", marginTop: 14, color: colors.muted },
});
