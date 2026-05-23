import type {TextStyle} from 'react-native';

export type ArcadeTheme = {
  colors: {
    background: string;
    panel: string;
    panelMuted: string;
    ink: string;
    softInk: string;
    mutedInk: string;
    faintInk: string;
    line: string;
    heavyLine: string;
    ghostBodyTop: string;
    ghostBodyBottom: string;
    ghostFace: string;
    accent: string;
    warning: string;
    danger: string;
    success: string;
  };
  spacing: {
    xs: number;
    sm: number;
    md: number;
    lg: number;
    xl: number;
    xxl: number;
  };
  radii: {
    pixel: number;
    chip: number;
    panel: number;
    control: number;
    round: number;
  };
  dimensions: {
    iconButton: number;
    modeCardMinHeight: number;
    mascotLarge: number;
    mascotMedium: number;
  };
  typography: {
    label: TextStyle;
    body: TextStyle;
    timerLarge: TextStyle;
    timerMedium: TextStyle;
  };
};

export const arcadeTheme: ArcadeTheme = {
  colors: {
    background: '#F2F2EF',
    panel: '#FFFFFF',
    panelMuted: '#E5E5E0',
    ink: '#111111',
    softInk: '#2B2B2B',
    mutedInk: '#6F726D',
    faintInk: '#B9BBB5',
    line: '#C9CBC5',
    heavyLine: '#1B1B1B',
    ghostBodyTop: '#FFFFFF',
    ghostBodyBottom: '#D8DAD4',
    ghostFace: '#242424',
    accent: '#2F80ED',
    warning: '#D97706',
    danger: '#B42318',
    success: '#18794E',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
  },
  radii: {
    pixel: 2,
    chip: 6,
    panel: 8,
    control: 8,
    round: 999,
  },
  dimensions: {
    iconButton: 44,
    modeCardMinHeight: 92,
    mascotLarge: 168,
    mascotMedium: 112,
  },
  typography: {
    label: {
      fontSize: 12,
      lineHeight: 16,
      fontWeight: '700',
      letterSpacing: 0,
    },
    body: {
      fontSize: 16,
      lineHeight: 24,
      fontWeight: '400',
      letterSpacing: 0,
    },
    timerLarge: {
      fontSize: 64,
      lineHeight: 72,
      fontVariant: ['tabular-nums'],
      fontWeight: '900',
      letterSpacing: 0,
    },
    timerMedium: {
      fontSize: 32,
      lineHeight: 40,
      fontVariant: ['tabular-nums'],
      fontWeight: '900',
      letterSpacing: 0,
    },
  },
};
