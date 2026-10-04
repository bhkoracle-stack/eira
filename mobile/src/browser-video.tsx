import { createElement, useEffect, useRef } from "react";
import { StyleSheet, View } from "react-native";

type PreviewProps = {
  stream?: { getTracks?: () => unknown[] } | null;
  streamURL?: string;
  style?: object;
  mirror?: boolean;
  muted?: boolean;
};

export function BrowserVideo({ stream, style, mirror, muted = true }: PreviewProps) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    node.srcObject = (stream as MediaStream | null) || null;
    node.muted = muted;
    node.play?.().catch(() => {});
  }, [stream, muted]);

  return (
    <View style={[styles.fill, style]}>
      {createElement("video", {
        ref,
        autoPlay: true,
        playsInline: true,
        muted,
        style: {
          width: "100%",
          height: "100%",
          objectFit: "cover",
          backgroundColor: "#10203F",
          transform: mirror ? "scaleX(-1)" : undefined,
        },
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  fill: { overflow: "hidden" },
});
