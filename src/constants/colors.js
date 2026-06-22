// Two full palettes — one per appearance mode.
// Keep the SAME KEYS in both so every screen/component can stay
// theme-agnostic and just ask for "Colors.primary", "Colors.card", etc.

export const darkColors = {
  // Backgrounds
  background:   '#080814',
  card:         '#10102A',
  cardLight:    '#18183A',
  cardGlow:     '#1E1E45',

  // Brand
  primary:      '#C9A84C',   // Gold
  primaryLight: '#E8C875',
  primaryDim:   '#C9A84C30',

  // Accent
  blue:         '#4FC3F7',
  purple:       '#7C4DFF',
  night:        '#1A2A5E',   // Deep blue for next-prayer card

  // Text
  text:         '#F0F0FF',
  textSecondary:'#8888AA',
  textMuted:    '#555577',

  // UI
  border:       '#2A2A50',
  divider:      '#1E1E3A',
  overlay:      'rgba(0,0,0,0.6)',

  // Status
  success:      '#4CAF50',
  successDim:   '#4CAF5020',
  warning:      '#FF9800',
  danger:       '#F44336',
};

export const lightColors = {
  // Backgrounds
  background:   '#F7F7FB',
  card:         '#FFFFFF',
  cardLight:    '#F1F1F8',
  cardGlow:     '#EAEAF6',

  // Brand
  primary:      '#A9852E',   // Darker gold — keeps contrast on white
  primaryLight: '#C9A84C',
  primaryDim:   '#A9852E22',

  // Accent
  blue:         '#0288D1',
  purple:       '#6A3FC9',
  night:        '#E7ECFB',   // Soft blue card equivalent of "night" navy

  // Text
  text:         '#15152A',
  textSecondary:'#5C5C7A',
  textMuted:    '#9A9AB2',

  // UI
  border:       '#E3E2EE',
  divider:      '#ECEBF6',
  overlay:      'rgba(0,0,0,0.45)',

  // Status
  success:      '#388E3C',
  successDim:   '#4CAF5020',
  warning:      '#F57C00',
  danger:       '#D32F2F',
};

// Back-compat: if any file still does `import { Colors } from '../constants/colors'`
// instead of using the theme hook, it'll fall back to dark (the old default)
// rather than crashing.
export const Colors = darkColors;
