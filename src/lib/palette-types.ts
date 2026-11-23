export type Palette = {
  primary: string;   // cor principal (hex)
  secondary: string; // cor de apoio (hex)
  base: string;      // fundo escuro derivado (hex)
  isFallback: boolean;
};

export const FALLBACK_PALETTE: Palette = {
  primary: '#3b2a5a',
  secondary: '#1f3a5f',
  base: '#0b0b12',
  isFallback: true,
};
