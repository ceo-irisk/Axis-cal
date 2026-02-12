// Dark Glassmorphism Theme — matches web version
export const colors = {
  background: '#050505',
  surface: '#121212',
  surfaceLight: '#1a1a1a',
  surfaceGlass: 'rgba(18, 18, 18, 0.85)',
  border: 'rgba(255, 255, 255, 0.08)',
  borderLight: 'rgba(255, 255, 255, 0.12)',
  borderActive: 'rgba(255, 255, 255, 0.25)',
  
  primary: '#ffffff',
  secondary: '#a1a1aa',
  muted: '#71717a',
  accent: '#6366f1',
  
  text: '#ffffff',
  textSecondary: '#a1a1aa',
  textMuted: '#71717a',
  
  // Event colors
  meeting: '#8b5cf6',
  call: '#06b6d4',
  personal: '#f59e0b',
  urgent: '#ef4444',
  travel: '#10b981',
  deep_work: '#6366f1',
  
  // Status colors
  confirmed: '#10b981',
  tentative: '#f59e0b',
  cancelled: '#ef4444',
  template: '#8b5cf6',
  
  // UI colors
  success: '#10b981',
  warning: '#f59e0b',
  error: '#ef4444',
  info: '#06b6d4',
  
  // Special
  currentTimeLine: '#ef4444',
  todayHighlight: 'rgba(99, 102, 241, 0.15)',
  overlay: 'rgba(0, 0, 0, 0.7)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  full: 100,
};

export const fontSize = {
  xs: 10,
  sm: 12,
  md: 14,
  lg: 16,
  xl: 18,
  xxl: 22,
  xxxl: 28,
  hero: 34,
};

export const fontWeight = {
  normal: '400',
  medium: '500',
  semibold: '600',
  bold: '700',
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.36,
    shadowRadius: 16,
    elevation: 8,
  },
  glow: {
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
};

// Glass card style helper
export const glassStyle = {
  backgroundColor: colors.surfaceGlass,
  borderWidth: 1,
  borderColor: colors.border,
  borderRadius: borderRadius.lg,
};

export default { colors, spacing, borderRadius, fontSize, fontWeight, shadows, glassStyle };
