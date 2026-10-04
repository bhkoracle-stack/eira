import { Stack } from "expo-router";
import { StatusBar } from "expo-status-bar";
import { AuthProvider } from "../src/auth";
import { IncomingCall } from "../src/components/IncomingCall";
import { AppErrorBoundary } from "../src/errors";
import { SocketProvider } from "../src/socket";
import { colors } from "../src/theme";

export default function RootLayout() {
  return (
    <AppErrorBoundary>
    <AuthProvider>
      <SocketProvider>
        <StatusBar style="dark" />
        <Stack
          screenOptions={{
            headerShown: false,
            contentStyle: { backgroundColor: colors.paper },
          }}
        />
        <IncomingCall />
      </SocketProvider>
    </AuthProvider>
    </AppErrorBoundary>
  );
}
