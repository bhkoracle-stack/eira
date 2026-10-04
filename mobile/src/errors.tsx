import { Component, ReactNode } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { colors } from "./theme";

export function errorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message.trim()) return error.message;
  if (typeof error === "string" && error.trim()) return error;
  return fallback;
}

type BoundaryProps = { children: ReactNode };
type BoundaryState = { message: string };

export class AppErrorBoundary extends Component<BoundaryProps, BoundaryState> {
  state: BoundaryState = { message: "" };

  static getDerivedStateFromError(error: unknown): BoundaryState {
    return { message: errorMessage(error, "Something went wrong") };
  }

  render() {
    if (!this.state.message) return this.props.children;
    return (
      <View style={styles.safe}>
        <Text style={styles.emoji}>⚠️</Text>
        <Text style={styles.title}>Something went wrong</Text>
        <Text style={styles.body}>{this.state.message}</Text>
        <Pressable style={styles.button} onPress={() => this.setState({ message: "" })}>
          <Text style={styles.buttonText}>Try again</Text>
        </Pressable>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: colors.paper, alignItems: "center", justifyContent: "center", padding: 28, gap: 10 },
  emoji: { fontSize: 42 },
  title: { color: colors.ink, fontSize: 24, fontWeight: "800" },
  body: { color: colors.muted, fontSize: 16, lineHeight: 22, textAlign: "center" },
  button: { marginTop: 8, backgroundColor: colors.plum, borderRadius: 16, paddingHorizontal: 18, paddingVertical: 12 },
  buttonText: { color: colors.white, fontWeight: "700" },
});
