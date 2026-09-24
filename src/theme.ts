// Goodwookie brand tokens. See docs/app-spec.md > Brand.
export const colors = {
  navy: '#16202A',
  cream: '#EFE3C6',
  agedCream: '#D9C8A2',
  gold: '#C79A3E',
  bronze: '#7A5A28',
  slate: '#31404C',
  rust: '#A85433',
  // Darker rust for error text on cream (4.5:1 contrast).
  error: '#8E4226',
  errorFill: '#F6E3DA',
  paper: '#F8F1E0',
  card: '#FBF7EC',
  white: '#FFFFFF',
} as const;

export const fonts = {
  display: 'Oswald_600SemiBold',
  heavy: 'AlfaSlabOne_400Regular',
  body: 'Barlow_400Regular',
  bodyMedium: 'Barlow_500Medium',
  bodySemi: 'Barlow_600SemiBold',
  bodyBold: 'Barlow_700Bold',
} as const;

export const radius = { sm: 10, md: 14, lg: 20 } as const;
