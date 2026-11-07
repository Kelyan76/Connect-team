import type { Config } from 'tailwindcss';

/**
 * Design tokens de Connect Team.
 * La palette, l'échelle typographique, les espacements, les rayons et les ombres
 * REMPLACENT ceux de Tailwind : aucune valeur hors système n'est disponible.
 * Les couleurs sont des variables CSS (src/app/styles/tokens.css). Thème clair uniquement.
 */
const token = (name: string) => `hsl(var(--${name}) / <alpha-value>)`;

const slateSteps = [50, 100, 200, 300, 400, 500, 600, 700, 800, 900] as const;

// Grille de 4 px : la clé n vaut n × 4 px.
const spacing: Record<string, string> = { px: '1px', 0: '0' };
for (let n = 1; n <= 160; n += 1) spacing[String(n)] = `${(n * 4) / 16}rem`;

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  // La classe `dark` n'est jamais posée : les variantes dark: restent inactives (thème clair uniquement).
  darkMode: 'class',
  theme: {
    colors: {
      transparent: 'transparent',
      current: 'currentColor',
      white: '#ffffff',
      black: '#000000',
      slate: Object.fromEntries(slateSteps.map((s) => [s, token(`slate-${s}`)])),
      // Rôles sémantiques : les composants n'utilisent que ceux-ci.
      canvas: token('canvas'),
      surface: { DEFAULT: token('surface'), muted: token('surface-muted'), sunken: token('surface-sunken') },
      line: { DEFAULT: token('line'), strong: token('line-strong') },
      fg: { DEFAULT: token('fg'), muted: token('fg-muted'), subtle: token('fg-subtle'), inverse: token('fg-inverse') },
      accent: { DEFAULT: token('accent'), hover: token('accent-hover'), subtle: token('accent-subtle'), fg: token('accent-fg') },
      success: { DEFAULT: token('success'), subtle: token('success-subtle') },
      warning: { DEFAULT: token('warning'), subtle: token('warning-subtle') },
      danger: { DEFAULT: token('danger'), subtle: token('danger-subtle'), hover: token('danger-hover') },
      level: { 0: token('level-0'), 1: token('level-1'), 2: token('level-2'), 3: token('level-3'), 4: token('level-4') },
      focus: token('focus'),
      sidebar: { DEFAULT: token('sidebar'), hover: token('sidebar-hover'), fg: token('sidebar-fg'), muted: token('sidebar-muted') },
      hero: { from: token('hero-from'), to: token('hero-to') },
    },
    fontFamily: {
      sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      mono: ['ui-monospace', 'SFMono-Regular', 'Consolas', 'monospace'],
    },
    // Échelle stricte : 12 / 13 / 14 / 16 / 20 / 24 px.
    fontSize: {
      xs: ['0.75rem', { lineHeight: '1rem' }],
      sm: ['0.8125rem', { lineHeight: '1.25rem' }],
      base: ['0.875rem', { lineHeight: '1.25rem' }],
      md: ['1rem', { lineHeight: '1.5rem' }],
      lg: ['1.25rem', { lineHeight: '1.75rem', letterSpacing: '-0.01em' }],
      xl: ['1.5rem', { lineHeight: '2rem', letterSpacing: '-0.015em' }],
    },
    fontWeight: { normal: '400', medium: '500', semibold: '600' },
    spacing,
    // Formes arrondies : contrôles 10 px, cartes 16 px, pastilles pleines.
    borderRadius: { none: '0', sm: '6px', DEFAULT: '10px', md: '10px', lg: '16px', xl: '20px', full: '9999px' },
    borderWidth: { 0: '0', DEFAULT: '1px', 2: '2px' },
    boxShadow: {
      none: 'none',
      sm: '0 1px 2px 0 hsl(var(--shadow) / 0.04), 0 1px 3px 0 hsl(var(--shadow) / 0.04)',
      md: '0 8px 24px -6px hsl(var(--shadow) / 0.14), 0 0 0 1px hsl(var(--shadow) / 0.04)',
      up: '0 -4px 16px -6px hsl(var(--shadow) / 0.10)',
    },
    extend: {
      maxWidth: { prose: '68ch' },
      transitionDuration: { DEFAULT: '150ms' },
      transitionTimingFunction: { DEFAULT: 'cubic-bezier(0.2, 0, 0, 1)', out: 'cubic-bezier(0.16, 1, 0.3, 1)' },
      // Animations courtes et sobres (désactivées si « réduire les animations » est actif, voir index.css).
      keyframes: {
        pulse: { '50%': { opacity: '0.55' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        'fade-out': { from: { opacity: '1' }, to: { opacity: '0' } },
        'fade-up': { from: { opacity: '0', transform: 'translateY(10px)' }, to: { opacity: '1', transform: 'translateY(0)' } },
        'scale-in': { from: { opacity: '0', transform: 'translate(-50%, 0) scale(0.96)' }, to: { opacity: '1', transform: 'translate(-50%, 0) scale(1)' } },
        'scale-out': { from: { opacity: '1', transform: 'translate(-50%, 0) scale(1)' }, to: { opacity: '0', transform: 'translate(-50%, 0) scale(0.96)' } },
        'pop-in': { from: { opacity: '0', transform: 'scale(0.95) translateY(-4px)' }, to: { opacity: '1', transform: 'scale(1) translateY(0)' } },
        'sheet-up': { from: { transform: 'translateY(100%)' }, to: { transform: 'translateY(0)' } },
        'sheet-down': { from: { transform: 'translateY(0)' }, to: { transform: 'translateY(100%)' } },
        'slide-in-right': { from: { transform: 'translateX(100%)' }, to: { transform: 'translateX(0)' } },
        'slide-out-right': { from: { transform: 'translateX(0)' }, to: { transform: 'translateX(100%)' } },
        grow: { from: { transform: 'scaleX(0)' }, to: { transform: 'scaleX(1)' } },
        shimmer: { from: { backgroundPosition: '200% 0' }, to: { backgroundPosition: '-200% 0' } },
        float: { '0%, 100%': { transform: 'translate(0, 0) scale(1)' }, '50%': { transform: 'translate(24px, -18px) scale(1.06)' } },
        'float-slow': { '0%, 100%': { transform: 'translate(0, 0)' }, '50%': { transform: 'translate(-30px, 24px)' } },
      },
      animation: {
        'fade-in': 'fade-in 200ms ease-out both',
        'fade-out': 'fade-out 150ms ease-in both',
        'fade-up': 'fade-up 450ms cubic-bezier(0.16, 1, 0.3, 1) both',
        // « backwards » : aucun transform ne reste après l'animation (n'interfère pas avec position: fixed).
        'page-in': 'fade-up 380ms cubic-bezier(0.16, 1, 0.3, 1) backwards',
        'scale-in': 'scale-in 220ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'scale-out': 'scale-out 150ms ease-in both',
        'pop-in': 'pop-in 160ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-up': 'sheet-up 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'sheet-down': 'sheet-down 220ms ease-in both',
        'slide-in-right': 'slide-in-right 320ms cubic-bezier(0.16, 1, 0.3, 1) both',
        'slide-out-right': 'slide-out-right 220ms ease-in both',
        grow: 'grow 900ms cubic-bezier(0.16, 1, 0.3, 1) both',
        shimmer: 'shimmer 1.8s linear infinite',
        float: 'float 14s ease-in-out infinite',
        'float-slow': 'float-slow 18s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
