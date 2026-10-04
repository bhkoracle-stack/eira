import { BrowserVideo } from "./browser-video";

export function loadWebRtc() {
  if (typeof window === "undefined" || !window.RTCPeerConnection || !navigator.mediaDevices?.getUserMedia) {
    return null;
  }
  return {
    RTCPeerConnection: window.RTCPeerConnection,
    RTCIceCandidate: window.RTCIceCandidate,
    RTCSessionDescription: window.RTCSessionDescription,
    mediaDevices: navigator.mediaDevices,
    RTCView: BrowserVideo,
  };
}
