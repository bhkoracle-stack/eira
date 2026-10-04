import { Pressable, ScrollView, StyleSheet, Text } from "react-native";
import { useRouter } from "expo-router";
import { SafeAreaView } from "react-native-safe-area-context";
import * as Linking from "expo-linking";
import { getServerUrl } from "../src/config";
import { CopyrightLine } from "../src/components/ui";
import { colors, fonts } from "../src/theme";

export default function LegalScreen() {
  const router = useRouter();
  const server = getServerUrl();

  return (
    <SafeAreaView style={styles.safe}>
      <Pressable onPress={() => router.back()}>
        <Text style={styles.back}>Back</Text>
      </Pressable>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Privacy and terms</Text>
        <Text style={styles.body}>
          Eira is for adults 18 and older. The app stores your email, a hashed password, profile, likes, matches, and chat messages on the server you connect to. Video calls use your camera and microphone only while a call is open. The server relays the connection setup and does not record the call.
        </Text>
        <Text style={styles.body}>
          Other members of the same server can see your profile. The operator of that server does not sell your data through this app. You can delete your account from You. Deletion removes your profile, photo, matches, and messages.
        </Text>
        <Text style={styles.body}>
          Do not harass people, impersonate someone, or send illegal content. You can block or report a match from the chat screen.
        </Text>
        <Text style={styles.title}>Copyright</Text>
        <Text style={styles.body}>
          © 2026 Eira. All rights reserved. The Eira name, logo, and interface are protected. Photos and messages you upload stay yours. Sample portraits in the local demo are for demonstration only.
        </Text>
        <Pressable onPress={() => Linking.openURL(`${server}/legal/privacy`)}>
          <Text style={styles.link}>Open the privacy policy</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(`${server}/legal/terms`)}>
          <Text style={styles.link}>Open the terms</Text>
        </Pressable>
        <Pressable onPress={() => Linking.openURL(`${server}/legal/copyright`)}>
          <Text style={styles.link}>Open the copyright notice</Text>
        </Pressable>
        <Pressable onPress={() => router.push("/support")}>
          <Text style={styles.link}>Contact support</Text>
        </Pressable>
        <CopyrightLine />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, padding: 20 },
  back: { color: colors.plum, fontWeight: "700", marginBottom: 12 },
  kicker: { color: colors.rose, fontWeight: "800" },
  content: { paddingBottom: 40, gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 34, color: colors.ink },
  body: { color: colors.ink, fontSize: 16, lineHeight: 24 },
  link: { color: colors.teal, fontWeight: "700", fontSize: 16 },
});
