import { ActivityIndicator, View } from "react-native";
import { Redirect } from "expo-router";
import { useAuth } from "../src/auth";
import { colors } from "../src/theme";

export default function Index() {
  const { user, booting } = useAuth();
  if (booting) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: colors.paper }}>
        <ActivityIndicator color={colors.teal} />
      </View>
    );
  }
  if (!user) return <Redirect href="/login" />;
  if (user.role === "admin") return <Redirect href="/admin" />;
  return <Redirect href="/discover" />;
}
