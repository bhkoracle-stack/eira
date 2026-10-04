import { useEffect, useRef, useState, type ComponentType } from "react";
import { PermissionsAndroid, Platform, Pressable, StyleSheet, Text, View } from "react-native";
import { useLocalSearchParams, useRouter } from "expo-router";
import { api } from "../../src/api";
import { useAuth } from "../../src/auth";
import { useSocket } from "../../src/socket";
import { FlipIcon, MicIcon, MicOffIcon, PhoneIcon, SpeakerIcon, VideoIcon, VideoOffIcon } from "../../src/components/icons";
import { colors, fonts } from "../../src/theme";
import { BrowserVideo } from "../../src/browser-video";
import { loadWebRtc } from "../../src/webrtc";

type Role = "caller" | "callee";

export default function CallScreen() {
  const params = useLocalSearchParams<{ matchId: string; role: Role; name: string; kind?: string }>();
  const matchId = params.matchId;
  const role = params.role === "callee" ? "callee" : "caller";
  const name = params.name || "Match";
  const audioOnly = params.kind === "audio";
  const { user } = useAuth();
  const { socket: activeSocket, setInCall } = useSocket();
  const router = useRouter();
  const [status, setStatus] = useState(role === "caller" ? "Calling…" : "Connecting…");
  const [unsupported, setUnsupported] = useState("");
  const [localStream, setLocalStream] = useState<unknown>(null);
  const [remoteStream, setRemoteStream] = useState<unknown>(null);
  const [RtcView, setRtcView] = useState<ComponentType<any> | null>(null);
  const [micMuted, setMicMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const [speakerOn, setSpeakerOn] = useState(!audioOnly);
  const facing = useRef<"user" | "environment">("user");
  const localRef = useRef<{ getTracks?: () => { kind: string; enabled: boolean; stop: () => void; _switchCamera?: () => void; applyConstraints?: (constraints: object) => Promise<void> }[] } | null>(null);
  const ended = useRef(false);

  function setKindEnabled(kind: "audio" | "video", enabled: boolean) {
    localRef.current?.getTracks?.().forEach((track) => {
      if (track.kind === kind) track.enabled = enabled;
    });
  }

  async function routeAudio(speaker: boolean) {
    try {
      const { setAudioModeAsync } = await import("expo-audio");
      await setAudioModeAsync({
        playsInSilentMode: true,
        allowsRecording: true,
        interruptionMode: "doNotMix",
        shouldRouteThroughEarpiece: !speaker,
      });
    } catch {
      /* Speaker routing is applied in the Android build. */
    }
  }

  function localTracks(kind: "audio" | "video") {
    return localRef.current?.getTracks?.().filter((track) => track.kind === kind) || [];
  }

  function toggleMic() {
    const next = !micMuted;
    setMicMuted(next);
    setKindEnabled("audio", !next);
  }

  function toggleCamera() {
    const next = !cameraOff;
    setCameraOff(next);
    setKindEnabled("video", !next);
  }

  async function toggleSpeaker() {
    const next = !speakerOn;
    setSpeakerOn(next);
    await routeAudio(next);
  }

  async function flipCamera() {
    const track = localTracks("video")[0];
    if (!track) return;
    facing.current = facing.current === "user" ? "environment" : "user";
    if (Platform.OS !== "web" && track._switchCamera) track._switchCamera();
    else await track.applyConstraints?.({ facingMode: facing.current });
  }

  useEffect(() => {
    setInCall(true);
    let pc: any = null;
    let local: any = null;
    const pendingIce: any[] = [];
    let pendingOffer: any = null;
    const ready = { caller: false, media: false, offered: false };

    function finish(notify: boolean) {
      if (ended.current) return;
      ended.current = true;
      local?.getTracks?.().forEach((track: { stop: () => void }) => track.stop());
      pc?.close?.();
      if (notify) activeSocket?.emit("call:end", { matchId });
      setInCall(false);
      if (router.canGoBack()) router.back();
      else router.replace("/chats");
    }

    async function flushIce() {
      if (!pc?.remoteDescription) return;
      while (pendingIce.length) {
        const candidate = pendingIce.shift();
        await pc.addIceCandidate(candidate);
      }
    }

    async function ensurePermissions() {
      if (Platform.OS !== "android") return;
      const permissions = audioOnly
        ? [PermissionsAndroid.PERMISSIONS.RECORD_AUDIO]
        : [PermissionsAndroid.PERMISSIONS.CAMERA, PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
      const result = await PermissionsAndroid.requestMultiple(permissions);
      const mic = result[PermissionsAndroid.PERMISSIONS.RECORD_AUDIO];
      const camera = audioOnly ? "granted" : result[PermissionsAndroid.PERMISSIONS.CAMERA];
      if (camera !== "granted" || mic !== "granted") {
        throw new Error(audioOnly ? "Microphone permission is required for phone calls." : "Camera and microphone permission are required for video calls.");
      }
    }

    async function start() {
      const link = activeSocket;
      let webrtc: any;
      try {
        webrtc = loadWebRtc();
      } catch {
        webrtc = null;
      }
      if (!webrtc?.mediaDevices?.getUserMedia && Platform.OS === "web" && typeof navigator !== "undefined" && navigator.mediaDevices?.getUserMedia) {
        webrtc = {
          RTCPeerConnection: window.RTCPeerConnection,
          RTCIceCandidate: window.RTCIceCandidate,
          RTCSessionDescription: window.RTCSessionDescription,
          mediaDevices: navigator.mediaDevices,
          RTCView: BrowserVideo,
        };
      }
      if (!webrtc?.mediaDevices?.getUserMedia) {
        setUnsupported("Phone and video calls need the camera and microphone.");
        return;
      }
      try {
        await ensurePermissions();
        const { RTCPeerConnection, RTCIceCandidate, RTCSessionDescription, mediaDevices, RTCView: ViewComponent } = webrtc;
        setRtcView(() => ViewComponent);
        local = await mediaDevices.getUserMedia({
          audio: true,
          video: audioOnly ? false : { facingMode: "user", width: 640, height: 480 },
        });
        localRef.current = local;
        setLocalStream(local);
        setStatus("Ready");
        await routeAudio(!audioOnly);
        if (!link || !matchId) return;
        const config = await api.config();
        pc = new RTCPeerConnection({ iceServers: config.iceServers });
        local.getTracks().forEach((track: unknown) => pc.addTrack(track, local));
        pc.onicecandidate = (event: { candidate: unknown }) => {
          if (event.candidate) link.emit("call:ice", { matchId, candidate: event.candidate });
        };
        pc.ontrack = (event: { streams: unknown[] }) => {
          setRemoteStream(event.streams[0]);
          setStatus("Live");
        };

        async function sendOffer() {
          if (!pc || ready.offered || role !== "caller" || !ready.caller || !ready.media) return;
          ready.offered = true;
          const offer = await pc.createOffer();
          await pc.setLocalDescription(offer);
          link.emit("call:offer", { matchId, sdp: pc.localDescription });
          setStatus("Ringing…");
        }

        activeSocket.on("call:ready", () => {
          ready.caller = true;
          sendOffer();
        });
        activeSocket.on("call:offer", async ({ matchId: incomingId, sdp }: { matchId: string; sdp: unknown }) => {
          if (incomingId !== matchId || !pc) return;
          if (!ready.media) {
            pendingOffer = sdp;
            return;
          }
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushIce();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          link.emit("call:answer", { matchId, sdp: pc.localDescription });
        });
        activeSocket.on("call:answer", async ({ matchId: incomingId, sdp }: { matchId: string; sdp: unknown }) => {
          if (incomingId !== matchId || !pc) return;
          await pc.setRemoteDescription(new RTCSessionDescription(sdp));
          await flushIce();
          setStatus("Connecting…");
        });
        activeSocket.on("call:ice", async ({ matchId: incomingId, candidate }: { matchId: string; candidate: unknown }) => {
          if (incomingId !== matchId || !pc || !candidate) return;
          const ice = new RTCIceCandidate(candidate);
          if (!pc.remoteDescription) pendingIce.push(ice);
          else await pc.addIceCandidate(ice);
        });
        activeSocket.on("call:reject", ({ matchId: incomingId }: { matchId: string }) => {
          if (incomingId !== matchId) return;
          setStatus("Call declined");
          setTimeout(() => finish(false), 900);
        });
        activeSocket.on("call:end", ({ matchId: incomingId }: { matchId: string }) => {
          if (incomingId === matchId) finish(false);
        });

        ready.media = true;
        if (pendingOffer && role === "callee") {
          await pc.setRemoteDescription(new RTCSessionDescription(pendingOffer));
          await flushIce();
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          link.emit("call:answer", { matchId, sdp: pc.localDescription });
        }
        if (role === "caller") {
          link.emit("call:invite", { matchId, fromName: user?.displayName || "Someone", kind: audioOnly ? "audio" : "video" }, (ack?: { error?: string }) => {
            if (ack?.error) setStatus(ack.error);
          });
          sendOffer();
        } else {
          ready.caller = true;
          link.emit("call:ready", { matchId });
        }
      } catch (error) {
        setUnsupported(error instanceof Error ? error.message : "Could not start the camera");
      }
    }

    start();
    return () => {
      activeSocket?.off("call:ready");
      activeSocket?.off("call:offer");
      activeSocket?.off("call:answer");
      activeSocket?.off("call:ice");
      activeSocket?.off("call:reject");
      activeSocket?.off("call:end");
      if (!ended.current) {
        ended.current = true;
        local?.getTracks?.().forEach((track: { stop: () => void }) => track.stop());
        pc?.close?.();
        activeSocket?.emit("call:end", { matchId });
        setInCall(false);
      }
    };
  }, [audioOnly, matchId, role, router, setInCall, activeSocket, user?.displayName]);

  const localUrl = (localStream as { toURL?: () => string } | null)?.toURL?.() || "";
  const remoteUrl = (remoteStream as { toURL?: () => string } | null)?.toURL?.() || "";
  const previewProps = (stream: unknown, url: string, muted: boolean) =>
    Platform.OS === "web" ? { stream, muted } : { streamURL: url };
  const liveNote = [micMuted ? "Muted" : "", !audioOnly && cameraOff ? "Camera off" : ""].filter(Boolean).join(" · ");

  return (
    <View style={styles.screen}>
      {!audioOnly && RtcView && (remoteStream || remoteUrl) ? (
        <RtcView {...previewProps(remoteStream, remoteUrl, false)} style={styles.remote} />
      ) : (
        <View style={styles.remote} />
      )}
      <View style={styles.top}>
        <View style={styles.badge}>
          {audioOnly ? <PhoneIcon color={colors.white} size={28} /> : cameraOff ? <VideoOffIcon color={colors.white} /> : <VideoIcon color={colors.white} size={28} />}
        </View>
        <Text style={styles.kicker}>{audioOnly ? "Phone call" : "Video call"}</Text>
        <Text style={styles.name}>{name}</Text>
        <Text style={styles.status}>{unsupported || liveNote || status}</Text>
      </View>
      {!audioOnly && !cameraOff && RtcView && (localStream || localUrl) ? (
        <RtcView {...previewProps(localStream, localUrl, true)} mirror style={styles.local} />
      ) : null}
      <View style={styles.controls}>
        <Pressable accessibilityRole="button" accessibilityLabel={micMuted ? "Unmute" : "Mute"} style={[styles.control, micMuted && styles.controlOn]} onPress={toggleMic}>
          {micMuted ? <MicOffIcon color={colors.ink} /> : <MicIcon />}
          <Text style={[styles.controlText, micMuted && styles.controlTextOn]}>{micMuted ? "Unmute" : "Mute"}</Text>
        </Pressable>
        <Pressable accessibilityRole="button" accessibilityLabel={speakerOn ? "Speaker" : "Earpiece"} style={[styles.control, speakerOn && styles.controlOn]} onPress={toggleSpeaker}>
          <SpeakerIcon color={speakerOn ? colors.ink : colors.white} />
          <Text style={[styles.controlText, speakerOn && styles.controlTextOn]}>{speakerOn ? "Speaker" : "Earpiece"}</Text>
        </Pressable>
        {!audioOnly ? (
          <Pressable accessibilityRole="button" accessibilityLabel={cameraOff ? "Camera on" : "Camera off"} style={[styles.control, cameraOff && styles.controlOn]} onPress={toggleCamera}>
            {cameraOff ? <VideoOffIcon color={colors.ink} /> : <VideoIcon color={colors.white} />}
            <Text style={[styles.controlText, cameraOff && styles.controlTextOn]}>{cameraOff ? "Camera on" : "Camera off"}</Text>
          </Pressable>
        ) : null}
        {!audioOnly ? (
          <Pressable accessibilityRole="button" accessibilityLabel="Flip camera" style={styles.control} onPress={flipCamera}>
            <FlipIcon />
            <Text style={styles.controlText}>Flip</Text>
          </Pressable>
        ) : null}
        <Pressable accessibilityRole="button" accessibilityLabel="End call" style={[styles.control, styles.end]} onPress={() => { if (router.canGoBack()) router.back(); else router.replace("/chats"); }}>
          <Text style={styles.endText}>End</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: "#10203F" },
  remote: { ...StyleSheet.absoluteFill, backgroundColor: "#10203F" },
  top: { paddingTop: 64, paddingHorizontal: 24 },
  badge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: colors.plum,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  kicker: { color: "#F4B8CC", fontWeight: "700", marginBottom: 6 },
  name: { fontFamily: fonts.display, fontSize: 36, color: colors.paper },
  status: { color: "#E7E1D6", marginTop: 6, fontSize: 16, maxWidth: 280 },
  local: {
    position: "absolute",
    width: 120,
    height: 170,
    right: 16,
    bottom: 168,
    borderRadius: 16,
    overflow: "hidden",
  },
  controls: {
    position: "absolute",
    left: 12,
    right: 12,
    bottom: 28,
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  control: {
    width: 62,
    minHeight: 64,
    borderRadius: 32,
    backgroundColor: "rgba(255,255,255,0.16)",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
  },
  controlOn: { backgroundColor: colors.white },
  controlText: { color: colors.white, fontSize: 10, fontWeight: "700", marginTop: 2 },
  controlTextOn: { color: colors.ink },
  end: { backgroundColor: colors.coral },
  endText: { color: colors.white, fontWeight: "800", fontSize: 14 },
});
