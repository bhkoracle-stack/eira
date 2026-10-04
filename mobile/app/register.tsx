import { useState } from "react";
import { KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import DateTimePicker, { DateTimePickerEvent } from "@react-native-community/datetimepicker";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../src/api";
import { useAuth } from "../src/auth";
import { Button, CopyrightLine, ErrorText, Field, Subtitle, Title } from "../src/components/ui";
import { colors } from "../src/theme";
import type { Gender, Interest } from "../src/types";

const genders: { id: Gender; label: string }[] = [
  { id: "woman", label: "Woman" },
  { id: "man", label: "Man" },
  { id: "nonbinary", label: "Nonbinary" },
];

const interests: { id: Interest; label: string }[] = [
  { id: "women", label: "Women" },
  { id: "men", label: "Men" },
  { id: "everyone", label: "Everyone" },
];

function yearsAgo(years: number) {
  const date = new Date();
  date.setFullYear(date.getFullYear() - years);
  return date;
}

function toIso(date: Date) {
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

export default function RegisterScreen() {
  const router = useRouter();
  const { signIn } = useAuth();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [birthday, setBirthday] = useState(yearsAgo(25));
  const [birthText, setBirthText] = useState(toIso(yearsAgo(25)));
  const [showDate, setShowDate] = useState(false);
  const [gender, setGender] = useState<Gender>("woman");
  const [interestedIn, setInterestedIn] = useState<Interest>("men");
  const [city, setCity] = useState("");
  const [bio, setBio] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  function onDateChange(event: DateTimePickerEvent, date?: Date) {
    if (Platform.OS === "android") setShowDate(false);
    if (event.type === "dismissed" || !date) return;
    setBirthday(date);
  }

  async function submit() {
    setBusy(true);
    setError("");
    try {
      const birthDate = Platform.OS === "web" ? birthText : toIso(birthday);
      const result = await api.register({
        displayName,
        email,
        password,
        birthDate,
        gender,
        interestedIn,
        city,
        bio,
      });
      await signIn(result.token, result.user);
      router.replace("/discover");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not create the account");
    } finally {
      setBusy(false);
    }
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <Pressable onPress={() => router.back()}>
            <Text style={styles.back}>‹ Back</Text>
          </Pressable>
          <Title>Create your account</Title>
          <Subtitle>Eira is for adults 18 and older. Your birthday is checked once, then kept private.</Subtitle>
          <Field label="Name" value={displayName} onChangeText={setDisplayName} />
          <Field label="Email" autoCapitalize="none" keyboardType="email-address" value={email} onChangeText={setEmail} />
          <Field label="Password" secureTextEntry value={password} onChangeText={setPassword} />
          {Platform.OS === "web" ? (
            <Field label="Birthday (YYYY-MM-DD)" value={birthText} onChangeText={setBirthText} autoCapitalize="none" />
          ) : (
            <>
              <Text style={styles.label}>Birthday</Text>
              <Pressable style={styles.date} onPress={() => setShowDate(true)}>
                <Text style={styles.dateText}>{birthday.toLocaleDateString()}</Text>
              </Pressable>
              {showDate ? (
                <DateTimePicker
                  value={birthday}
                  mode="date"
                  maximumDate={yearsAgo(18)}
                  minimumDate={yearsAgo(100)}
                  onChange={onDateChange}
                />
              ) : null}
            </>
          )}
          <Text style={styles.label}>I am</Text>
          <ChoiceRow options={genders} value={gender} onChange={setGender} />
          <Text style={styles.label}>I want to meet</Text>
          <ChoiceRow options={interests} value={interestedIn} onChange={setInterestedIn} />
          <Field label="City" value={city} onChangeText={setCity} />
          <Field label="Bio" value={bio} onChangeText={setBio} multiline style={styles.bio} />
          <ErrorText>{error}</ErrorText>
          <Button label="Join Eira" onPress={submit} disabled={busy} />
          <Pressable onPress={() => router.push("/legal")}>
            <Text style={styles.footerLink}>Privacy, terms, and copyright</Text>
          </Pressable>
          <Pressable onPress={() => router.push("/support")}>
            <Text style={styles.footerLink}>Support</Text>
          </Pressable>
          <CopyrightLine />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

function ChoiceRow<T extends string>({
  options,
  value,
  onChange,
}: {
  options: { id: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <View style={styles.choices}>
      {options.map((option) => {
        const selected = option.id === value;
        return (
          <Pressable
            key={option.id}
            onPress={() => onChange(option.id)}
            style={[styles.choice, selected && styles.choiceOn]}
          >
            <Text style={[styles.choiceText, selected && styles.choiceTextOn]}>{option.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 24, paddingBottom: 48 },
  back: { color: colors.plum, fontWeight: "700", marginBottom: 12 },
  kicker: { color: colors.rose, fontWeight: "800", marginBottom: 6 },
  label: { color: colors.muted, fontSize: 13, marginTop: 14, marginBottom: 6 },
  date: {
    backgroundColor: colors.card,
    borderColor: colors.line,
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  dateText: { color: colors.ink, fontSize: 16 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: {
    borderWidth: 1,
    borderColor: colors.line,
    backgroundColor: colors.card,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  choiceOn: { backgroundColor: colors.plum, borderColor: colors.plum },
  choiceText: { color: colors.ink },
  choiceTextOn: { color: colors.paper, fontWeight: "700" },
  bio: { minHeight: 90, textAlignVertical: "top" },
  footerLink: { textAlign: "center", marginTop: 14, color: colors.muted },
});
