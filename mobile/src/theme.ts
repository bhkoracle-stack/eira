export const colors = {
  paper: "#F4F7FB",
  blush: "#FDECF3",
  card: "#FFFFFF",
  ink: "#172033",
  muted: "#66758A",
  line: "#E3EAF4",
  teal: "#2A62F0",
  tealDark: "#1B3F9A",
  plum: "#2A62F0",
  rose: "#E25B86",
  gold: "#E8B15A",
  coral: "#D64545",
  white: "#FFFFFF",
  good: "#1C8A5A",
};

export const fonts = {
  display: "sans-serif" as const,
};

export const chatEmoji = ["😀", "😂", "🥰", "😍", "❤️", "🔥", "✨", "👋", "☕", "🌹", "🎵", "🌙", "💬", "🌸"];

const moods = ["🌙", "☕", "🌸", "🎧", "📚", "🌊", "🎨", "✨", "🌹", "🎵"];

export function moodFor(name: string) {
  const code = name.split("").reduce((sum, char) => sum + char.charCodeAt(0), 0);
  return moods[code % moods.length];
}
