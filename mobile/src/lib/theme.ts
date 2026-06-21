// Committed dark, warm rose-toned identity — an intimate companion used at night,
// in private. Not the SaaS-purple default. Carry warmth via accent + ink, not a
// tinted near-white body.
export const c = {
  bg: "#17121B", // warm near-black (slight plum)
  surface: "#241C2B", // assistant bubble, inputs
  surfaceAlt: "#2E2438", // raised / pressed
  ink: "#F4ECEF", // primary text
  muted: "#A99FB0", // narration, secondary text (light-on-dark, high contrast)
  faint: "#6E6478", // hints, disabled
  accent: "#E2647F", // rose — user bubble, primary actions
  accentDeep: "#C84E6A",
  onAccent: "#FFFFFF",
  border: "rgba(255,255,255,0.08)",
  danger: "#FF7A85",
};

export const radius = { sm: 12, md: 18, lg: 24, pill: 999 };

// Deterministic warm avatar tint per character id, so each reads as distinct.
const AVATAR_TINTS = ["#E2647F", "#C77DA8", "#8E7BC9", "#5E86C9", "#D98859", "#5FA98C"];
export const avatarTint = (id: string) =>
  AVATAR_TINTS[[...id].reduce((a, ch) => a + ch.charCodeAt(0), 0) % AVATAR_TINTS.length];

// 4pt spacing scale.
export const sp = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
};
