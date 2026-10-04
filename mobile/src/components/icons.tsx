import Svg, { Circle, Path } from "react-native-svg";

type IconProps = { color?: string; size?: number; filled?: boolean };

export function PhoneIcon({ color = "#2A62F0", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6.62 10.79a15.05 15.05 0 0 0 6.59 6.59l2.2-2.2a1 1 0 0 1 1.02-.24c1.12.37 2.33.57 3.57.57a1 1 0 0 1 1 1V20a1 1 0 0 1-1 1C10.85 21 3 13.15 3 3a1 1 0 0 1 1-1h3.5a1 1 0 0 1 1 1c0 1.24.2 2.45.57 3.57a1 1 0 0 1-.25 1.02l-2.2 2.2z" />
    </Svg>
  );
}

export function VideoIcon({ color = "#2A62F0", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M17 10.5V7a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-3.5l4 4v-11l-4 4z" />
    </Svg>
  );
}

export function AttachIcon({ color = "#2A62F0", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M8 12.5l6.2-6.2a3.2 3.2 0 0 1 4.5 4.5l-7.6 7.6a4.6 4.6 0 0 1-6.5-6.5l7.1-7.1"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
      />
    </Svg>
  );
}

export function CameraIcon({ color = "#2A62F0", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M9 4l1.2 2H20a1 1 0 0 1 1 1v11a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h3.8L9 4zm3 5.2A3.8 3.8 0 1 0 15.8 13 3.8 3.8 0 0 0 12 9.2z" />
    </Svg>
  );
}

export function MoreIcon({ color = "#172033", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M6 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4zm6 0a2 2 0 1 0 0 4 2 2 0 0 0 0-4z" />
    </Svg>
  );
}

export function DiscoverTabIcon({ color = "#66758A", size = 24, filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.25" stroke={color} strokeWidth={1.8} fill={filled ? color : "none"} />
      <Path d="M15.1 8.4 12.7 13.1 8.3 15.3l2.4-4.7 4.4-2.2Z" fill={filled ? "#FFFFFF" : color} />
    </Svg>
  );
}

export function HeartTabIcon({ color = "#66758A", size = 24, filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M12 19.4c-.3 0-6.8-4.1-6.8-8.6A3.7 3.7 0 0 1 12 8.2a3.7 3.7 0 0 1 6.8 2.6c0 4.5-6.5 8.6-6.8 8.6Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill={filled ? color : "none"}
      />
    </Svg>
  );
}

export function ChatTabIcon({ color = "#66758A", size = 24, filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path
        d="M6 6.2h12a1.6 1.6 0 0 1 1.6 1.6v6.4A1.6 1.6 0 0 1 18 15.8h-6.2L7.2 18.6v-2.8H6A1.6 1.6 0 0 1 4.4 14.2V7.8A1.6 1.6 0 0 1 6 6.2Z"
        stroke={color}
        strokeWidth={1.8}
        strokeLinejoin="round"
        fill={filled ? color : "none"}
      />
    </Svg>
  );
}

export function PersonTabIcon({ color = "#66758A", size = 24, filled = false }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="8.2" r="3.1" stroke={color} strokeWidth={1.8} fill={filled ? color : "none"} />
      <Path
        d="M6.2 18.4c.6-2.6 2.8-4 5.8-4s5.2 1.4 5.8 4"
        stroke={color}
        strokeWidth={1.8}
        strokeLinecap="round"
        fill="none"
      />
    </Svg>
  );
}

export function PinIcon({ color = "#F7D6E4", size = 16 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 2.8a6.2 6.2 0 0 0-6.2 6.2c0 4.6 6.2 12.2 6.2 12.2s6.2-7.6 6.2-12.2A6.2 6.2 0 0 0 12 2.8Zm0 8.4a2.2 2.2 0 1 1 2.2-2.2A2.2 2.2 0 0 1 12 11.2Z" />
    </Svg>
  );
}

export function CloseIcon({ color = "#172033", size = 26 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M7 7l10 10M17 7 7 17" stroke={color} strokeWidth={2.2} strokeLinecap="round" />
    </Svg>
  );
}

export function SmileIcon({ color = "#2A62F0", size = 24 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Circle cx="12" cy="12" r="8.2" stroke={color} strokeWidth={1.8} />
      <Circle cx="9" cy="10.2" r="1" fill={color} />
      <Circle cx="15" cy="10.2" r="1" fill={color} />
      <Path d="M8.6 13.6c.8 1.6 2 2.4 3.4 2.4s2.6-.8 3.4-2.4" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function MicIcon({ color = "#FFFFFF", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M12 14.5a3 3 0 0 0 3-3v-5a3 3 0 0 0-6 0v5a3 3 0 0 0 3 3zm5-3a5 5 0 0 1-10 0H5a7 7 0 0 0 6 6.7V21h2v-2.8a7 7 0 0 0 6-6.7h-2z" />
    </Svg>
  );
}

export function MicOffIcon({ color = "#FFFFFF", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M12 14.5a3 3 0 0 0 3-3V9.4L9.2 15.2A3 3 0 0 0 12 14.5zM8 8.2V11.5a4 4 0 0 0 .3 1.6" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M15 11.5a3 3 0 0 1-3 3M12 16.5a5 5 0 0 1-5-5H5a7 7 0 0 0 6 6.7V21h2v-2.8a6.9 6.9 0 0 0 3.2-1.3M4 5l16 16" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function SpeakerIcon({ color = "#FFFFFF", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M4 9h3.2L12 5.2v13.6L7.2 15H4V9zm10.2.8a3.2 3.2 0 0 1 0 4.4l1.2 1.2a5 5 0 0 0 0-6.8l-1.2 1.2zm2.4-2.4a6.6 6.6 0 0 1 0 9.2l1.2 1.2a8.4 8.4 0 0 0 0-11.6l-1.2 1.2z" />
    </Svg>
  );
}

export function VideoOffIcon({ color = "#FFFFFF", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M4 7h9.2L17 10.2V8.5l4-2.2v8.4M4 17h8.5" stroke={color} strokeWidth={1.8} strokeLinejoin="round" />
      <Path d="M5 5l14 14" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
    </Svg>
  );
}

export function FlipIcon({ color = "#FFFFFF", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill="none">
      <Path d="M8 8H5.5A6.5 6.5 0 0 1 16 6.2M16 16h2.5A6.5 6.5 0 0 1 8 17.8" stroke={color} strokeWidth={1.8} strokeLinecap="round" />
      <Path d="M8 4.5 5.2 8 8 11.5M16 12.5 18.8 16 16 19.5" stroke={color} strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
    </Svg>
  );
}

export function BackIcon({ color = "#172033", size = 22 }: IconProps) {
  return (
    <Svg width={size} height={size} viewBox="0 0 24 24" fill={color}>
      <Path d="M15.4 19.4 8 12l7.4-7.4 1.4 1.4L10.8 12l6 6-1.4 1.4z" />
    </Svg>
  );
}
