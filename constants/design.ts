/**
 * MathPad design tokens.
 *
 * Single source of truth for colours, typography, spacing, radii, shadows and
 * motion.
 * UI code should import from here rather than hard-coding values, so the
 * design system stays consistent across screens.
 *
 * See SPEC.md — colours are a neutral base plus one accent per operation,
 * with green for correct and coral for wrong answers.
 */

/* -------------------------------------------------------------------------- */
/* Colours                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Neutral base palette — backgrounds, surfaces, text and borders.
 */
export const colors = {
  /** App background (behind all surfaces). */
  background: '#F7F8FA',
  /** Default card / sheet surface. */
  surface: '#FFFFFF',
  /** Secondary surface for subtle separation (e.g. answer boxes). */
  surfaceAlt: '#EEF0F3',
  /** Primary text. */
  text: '#1C1C28',
  /** Secondary / supporting text. */
  textMuted: '#6E7079',
  /** Hairline borders and dividers. */
  border: '#DDE0E5',
  /** Marking — correct answer. */
  correct: '#22C55E',
  /**
   * Marking — wrong answer. Intentionally coral per SPEC; this is the same
   * coral used as the Subtraction accent (see `operationColors.subtraction`).
   */
  wrong: '#FF6F61',
} as const;

/**
 * One accent per operation. `accent` is the strong colour (icons, buttons,
 * active states); `tint` is a soft background wash for cards and highlights.
 */
export const operationColors = {
  /** Addition — blue. */
  addition: { accent: '#3B82F6', tint: '#E8F1FE' },
  /** Subtraction — coral. */
  subtraction: { accent: '#FF6F61', tint: '#FFEAE7' },
  /** Multiplication — purple. */
  multiplication: { accent: '#8B5CF6', tint: '#EFEAFE' },
  /** Division — teal. */
  division: { accent: '#14B8A6', tint: '#E0F6F3' },
  /** Mix — deep navy/indigo "challenge mode" (it's a live operation, not a
   *  disabled one, so it gets an exciting colour rather than a grey). */
  mix: { accent: '#312E81', tint: '#E9E8F7' },
} as const;

/* -------------------------------------------------------------------------- */
/* Typography                                                                   */
/* -------------------------------------------------------------------------- */

/**
 * System sans-serif (San Francisco on iOS, Roboto on Android) with two
 * weights. `undefined` fontFamily resolves to the platform system font.
 */
export const typography = {
  fontFamily: undefined as string | undefined,
  /** Only two weights are used across the app. */
  weight: {
    regular: '400',
    medium: '500',
  },
  /** Font-size scale. */
  size: {
    caption: 13,
    body: 15,
    bodyLarge: 17,
    title: 20,
    heading: 28,
    display: 40,
  },
  /** Line heights paired with the size scale. */
  lineHeight: {
    caption: 18,
    body: 22,
    bodyLarge: 24,
    title: 26,
    heading: 34,
    display: 46,
  },
} as const;

/* -------------------------------------------------------------------------- */
/* Spacing                                                                      */
/* -------------------------------------------------------------------------- */

/** 4pt spacing scale. */
export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  xxxl: 48,
} as const;

/* -------------------------------------------------------------------------- */
/* Radii                                                                        */
/* -------------------------------------------------------------------------- */

/** Border-radius scale. `pill` is a large value for fully-rounded shapes. */
export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

/* -------------------------------------------------------------------------- */
/* Shadows                                                                      */
/* -------------------------------------------------------------------------- */

/**
 * Elevation presets. Each entry spreads directly onto a `View` style and
 * covers both iOS (shadow*) and Android (elevation).
 */
export const shadows = {
  sm: {
    shadowColor: '#1C1C28',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  md: {
    shadowColor: '#1C1C28',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 10,
    elevation: 4,
  },
  lg: {
    shadowColor: '#1C1C28',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.14,
    shadowRadius: 24,
    elevation: 10,
  },
} as const;

/* -------------------------------------------------------------------------- */
/* Motion                                                                       */
/* -------------------------------------------------------------------------- */

/**
 * Animation durations, in milliseconds. Motion is deliberately restrained —
 * the app's style is calm and focused (SPEC § Visual & interaction design).
 */
export const motion = {
  duration: {
    /** Near-instant feedback, e.g. press states. */
    instant: 100,
    /** Quick transitions, e.g. highlights and toggles. */
    fast: 150,
    /** Standard transitions, e.g. screen-level fades. */
    base: 250,
    /** Deliberate transitions, e.g. layout changes between problem types. */
    slow: 400,
  },
} as const;

/* -------------------------------------------------------------------------- */
/* Aggregate export                                                             */
/* -------------------------------------------------------------------------- */

/** All tokens under one namespace, for ergonomic `design.colors.text` access. */
export const design = {
  colors,
  operationColors,
  typography,
  spacing,
  radius,
  shadows,
  motion,
} as const;

/** Keys of the per-operation colour map (`'addition' | 'subtraction' | ...`). */
export type OperationColorKey = keyof typeof operationColors;

export default design;
