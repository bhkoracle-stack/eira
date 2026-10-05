import { useState } from "react";
import { Alert, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import * as ImagePicker from "expo-image-picker";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { uploadBody } from "../../src/files";
import { readCurrentPlace } from "../../src/place";
import { Avatar, Button, CopyrightLine, ErrorText, Field, Title } from "../../src/components/ui";
import { colors } from "../../src/theme";
import type { Interest } from "../../src/types";

const distances = [10, 25, 50, 100, 250];

export default function ProfileScreen() {
  const { user, token, setUser, signOut } = useAuth();
  const router = useRouter();
  const [displayName, setDisplayName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [city, setCity] = useState(user?.city || "");
  const [interestedIn, setInterestedIn] = useState<Interest>(user?.interestedIn || "everyone");
  const [maxDistanceKm, setMaxDistanceKm] = useState(user?.maxDistanceKm || 50);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [busy, setBusy] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");

  if (!user || !token) return null;
  const sessionToken = token;

  async function save() {
    setBusy(true);
    setError("");
    setSaved("");
    try {
      const result = await api.updateMe(sessionToken, { displayName, bio, city, interestedIn, maxDistanceKm });
      setUser(result.user);
      setSaved("Saved");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save");
    } finally {
      setBusy(false);
    }
  }

  async function choosePhoto(source: "library" | "camera") {
    setError("");
    setSaved("");
    try {
      if (source === "camera") {
        const permission = await ImagePicker.requestCameraPermissionsAsync();
        if (!permission.granted) {
          setError("Camera access is needed to take a profile picture.");
          return;
        }
      } else if (Platform.OS !== "web") {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) {
          setError("Photo access is needed to update your profile picture.");
          return;
        }
      }
      const options: ImagePicker.ImagePickerOptions = {
        mediaTypes: ["images"],
        allowsEditing: Platform.OS !== "web",
        aspect: [3, 4],
        quality: 0.5,
        base64: true,
      };
      const picked =
        source === "camera"
          ? await ImagePicker.launchCameraAsync(options)
          : await ImagePicker.launchImageLibraryAsync(options);
      if (picked.canceled || !picked.assets[0]) return;
      const asset = picked.assets[0];
      setBusy(true);
      const body = uploadBody(asset.base64 || "", asset.fileName || "profile.jpg", asset.mimeType || "image/jpeg");
      const result = await api.uploadPhoto(sessionToken, body);
      setUser(result.user);
      setSaved("Photo updated");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not upload the photo");
    } finally {
      setBusy(false);
    }
  }

  function changePhoto() {
    Alert.alert("Profile photo", undefined, [
      { text: "Choose from library", onPress: () => choosePhoto("library") },
      { text: "Take photo", onPress: () => choosePhoto("camera") },
      { text: "Cancel", style: "cancel" },
    ]);
  }

  function confirmDelete() {
    Alert.alert("Delete account?", "This removes your profile, matches, and messages from the server.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await api.deleteMe(sessionToken);
            await signOut();
            router.replace("/login");
          } catch (err) {
            setError(err instanceof Error ? err.message : "Could not delete the account");
          }
        },
      },
    ]);
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1 }}>
        <ScrollView contentContainerStyle={styles.content}>
          <Title>Profile</Title>
          <View style={styles.hero}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Change profile photo"
              disabled={busy}
              onPress={changePhoto}
            >
              <Avatar name={user.displayName} photoUrl={user.photoUrl} size={96} />
            </Pressable>
            <View style={{ flex: 1 }}>
              <Text style={styles.metaName}>{user.displayName}</Text>
              <Text style={styles.meta}>
                {user.age} · {user.city || "Add a city"}
              </Text>
            </View>
          </View>
          <Field label="Name" value={displayName} onChangeText={setDisplayName} />
          <Field label="City" value={city} onChangeText={setCity} />
          <Button
            label="Use my location"
            tone="ghost"
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              setError("");
              setSaved("");
              try {
                const place = await readCurrentPlace(sessionToken);
                const result = await api.updateMe(sessionToken, {
                  latitude: place.latitude,
                  longitude: place.longitude,
                  city: place.city,
                  ...(place.country ? { country: place.country } : {}),
                });
                setCity(result.user.city);
                setUser(result.user);
                setSaved(`Location updated to ${result.user.city}`);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not read your location");
              } finally {
                setBusy(false);
              }
            }}
          />
          <Text style={styles.label}>Maximum distance</Text>
          <View style={styles.choices}>
            {distances.map((km) => (
              <Pressable
                key={km}
                onPress={() => setMaxDistanceKm(km)}
                style={[styles.choice, maxDistanceKm === km && styles.choiceOn]}
              >
                <Text style={[styles.choiceText, maxDistanceKm === km && styles.choiceTextOn]}>{km} km</Text>
              </Pressable>
            ))}
          </View>
          <Field label="Bio" value={bio} onChangeText={setBio} multiline style={styles.bio} />
          <Text style={styles.label}>I want to meet</Text>
          <View style={styles.choices}>
            {(["women", "men", "everyone"] as Interest[]).map((option) => (
              <Pressable
                key={option}
                onPress={() => setInterestedIn(option)}
                style={[styles.choice, interestedIn === option && styles.choiceOn]}
              >
                <Text style={[styles.choiceText, interestedIn === option && styles.choiceTextOn]}>
                  {option === "women" ? "Women" : option === "men" ? "Men" : "Everyone"}
                </Text>
              </Pressable>
            ))}
          </View>
          <ErrorText>{error}</ErrorText>
          {saved ? <Text style={styles.saved}>{saved}</Text> : null}
          <Button label="Save profile" onPress={save} disabled={busy} />
          <Field label="Current password" secureTextEntry value={currentPassword} onChangeText={setCurrentPassword} />
          <Field label="New password" secureTextEntry value={newPassword} onChangeText={setNewPassword} />
          <Button
            label="Change password"
            tone="ghost"
            disabled={busy}
            onPress={async () => {
              setBusy(true);
              setError("");
              setSaved("");
              try {
                await api.changePassword(sessionToken, currentPassword, newPassword);
                setCurrentPassword("");
                setNewPassword("");
                setSaved("Password updated");
              } catch (err) {
                setError(err instanceof Error ? err.message : "Could not change the password");
              } finally {
                setBusy(false);
              }
            }}
          />
          <Button
            label="Privacy, terms, and copyright"
            tone="ghost"
            onPress={() => router.push("/legal")}
          />
          <Button label="Support" tone="ghost" onPress={() => router.push("/support")} />
          <CopyrightLine />
          <Button
            label="Sign out"
            tone="ghost"
            onPress={async () => {
              await signOut();
              router.replace("/login");
            }}
          />
          <Button label="Delete account" tone="coral" onPress={confirmDelete} />
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper },
  content: { padding: 20, gap: 12, paddingBottom: 40 },
  hero: {
    backgroundColor: colors.card,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.line,
    padding: 16,
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
  },
  metaName: { color: colors.ink, fontSize: 20, fontWeight: "700" },
  meta: { color: colors.muted, fontSize: 15, marginTop: 2 },
  label: { color: colors.muted, marginTop: 4 },
  choices: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  choice: { backgroundColor: colors.card, borderRadius: 999, borderWidth: 1, borderColor: colors.line, paddingHorizontal: 12, paddingVertical: 8 },
  choiceOn: { backgroundColor: colors.plum, borderColor: colors.plum },
  choiceText: { color: colors.ink, fontWeight: "700" },
  choiceTextOn: { color: colors.white },
  bio: { minHeight: 90, textAlignVertical: "top" },
  saved: { color: colors.good, fontWeight: "700" },
});
