import { Redirect, Tabs } from "expo-router";
import { ActivityIndicator, View } from "react-native";
import { useAuth } from "../../src/auth";
import { ChatTabIcon, DiscoverTabIcon, HeartTabIcon, PersonTabIcon } from "../../src/components/icons";
import { colors } from "../../src/theme";

export default function AppTabs() {
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

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: colors.plum,
        tabBarInactiveTintColor: colors.muted,
        tabBarStyle: {
          backgroundColor: colors.card,
          borderTopColor: colors.line,
          height: 68,
          paddingTop: 6,
          paddingBottom: 8,
        },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="discover"
        options={{
          title: "Friends",
          tabBarIcon: ({ color, focused }) => <DiscoverTabIcon color={String(color)} filled={focused} />,
        }}
      />
      <Tabs.Screen
        name="matches"
        options={{
          title: "Matched",
          tabBarIcon: ({ color, focused }) => <HeartTabIcon color={String(color)} filled={focused} />,
        }}
      />
      <Tabs.Screen
        name="chats"
        options={{
          title: "Chats",
          tabBarIcon: ({ color, focused }) => <ChatTabIcon color={String(color)} filled={focused} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: "You",
          tabBarIcon: ({ color, focused }) => <PersonTabIcon color={String(color)} filled={focused} />,
        }}
      />
    </Tabs>
  );
}
