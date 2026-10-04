import { useState } from "react";
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, Text, View } from "react-native";
import { Link, Redirect, useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../src/api";
import { useAuth } from "../src/auth";
import { FallingFlowers, EiraLogo } from "../src/components/brand";
import { Button, CopyrightLine, ErrorText, Field } from "../src/components/ui";
import { colors, fonts } from "../src/theme";

export default function ForgotPasswordScreen() {
  const { user } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  if (user) return <Redirect href={user.role === "admin" ? "/admin" : "/discover"} />;

  async function sendCode() {
    setBusy(true);
    setError("");
    try {
      await api.forgotPassword(email.trim());
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the code");
    } finally {
      setBusy(false);
    }
  }

  async function reset() {
    if (password !== confirm) {
      setError("Those passwords do not match");
      return;
    }
    setBusy(true);
    setError("");
    try {
      await api.resetPassword(email.trim(), code.trim(), password);
      router.replace("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reset the password");
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
            <Text style={styles.heroTitle}>Reset your password</Text>
            <Text style={styles.heroNote}>
              {sent
                ? "Enter the 6-digit code from your email. It expires in 10 minutes."
                : "We will email a 6-digit code to the address on your account."}
            </Text>
          </View>
          <View style={styles.sheet}>
            <Field
              label="Email"
              autoCapitalize="none"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              editable={!sent}
            />
            {sent ? (
              <>
                <Field label="Email code" keyboardType="number-pad" value={code} onChangeText={setCode} maxLength={6} />
                <Field label="New password" secureTextEntry value={password} onChangeText={setPassword} />
                <Field label="Confirm password" secureTextEntry value={confirm} onChangeText={setConfirm} />
              </>
            ) : null}
            <ErrorText>{error}</ErrorText>
            <Button label={sent ? "Reset password" : "Send code"} onPress={sent ? reset : sendCode} disabled={busy} />
            {sent ? (
              <Text style={styles.again} onPress={() => setSent(false)}>
                Use a different email
              </Text>
            ) : null}
            <Link href="/login" style={styles.link}>
              Back to sign in
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
  again: { textAlign: "center", marginTop: 18, color: colors.teal, fontSize: 16, fontWeight: "600" },
  link: { textAlign: "center", marginTop: 18, color: colors.ink, fontSize: 16, fontWeight: "600" },
});
