import type { Ionicons } from '@expo/vector-icons';

import { CLOCK_ENABLED } from '../../../lib/featureFlags';

/** Top-level topic id. Each maps to a screen under `app/<id>.tsx`. */
export type TopicId =
  | 'operations'
  | 'shapes'
  | 'clock'
  | 'axis'
  | 'patterns'
  | 'money';

export interface TopicDef {
  id: TopicId;
  /** i18n key for the card label (looked up under `topics.*`). */
  labelKey: string;
  /** i18n key for the card description line (looked up under `topicsDesc.*`). */
  descKey: string;
  /** Ionicon shown on the topic badge. */
  icon: keyof typeof Ionicons.glyphMap;
  /** Solid colour used for the badge background and label. */
  accent: string;
  /** Tinted version of `accent` used for the card background. */
  tint: string;
  /** Whether the topic is functional today; controls the "Coming soon" pill. */
  enabled: boolean;
  /** Expo Router path to navigate to on tap. */
  route:
    | '/operations'
    | '/shapes'
    | '/clock'
    | '/axis'
    | '/patterns'
    | '/money';
}

/**
 * Single source of truth for the MainPanel topic list. Add a new topic
 * here + create `app/<id>.tsx` and the card lights up everywhere it's
 * shown — no other plumbing needed.
 */
export const TOPICS: TopicDef[] = [
  {
    id: 'operations',
    labelKey: 'topics.operations',
    descKey: 'topicsDesc.operations',
    icon: 'calculator-outline',
    accent: '#1F6FEB',
    tint: '#E8F0FE',
    enabled: true,
    route: '/operations',
  },
  {
    id: 'clock',
    labelKey: 'topics.clock',
    descKey: 'topicsDesc.clock',
    icon: 'time-outline',
    accent: '#0E8A6B',
    tint: '#E6F5EF',
    enabled: CLOCK_ENABLED,
    route: '/clock',
  },
  {
    id: 'shapes',
    labelKey: 'topics.shapes',
    descKey: 'topicsDesc.shapes',
    icon: 'shapes-outline',
    accent: '#7C3AED',
    tint: '#F1E9FE',
    enabled: false,
    route: '/shapes',
  },
  {
    id: 'axis',
    labelKey: 'topics.axis',
    descKey: 'topicsDesc.axis',
    icon: 'analytics-outline',
    accent: '#D97706',
    tint: '#FDEFD9',
    enabled: false,
    route: '/axis',
  },
  {
    id: 'patterns',
    labelKey: 'topics.patterns',
    descKey: 'topicsDesc.patterns',
    icon: 'extension-puzzle-outline',
    accent: '#DB2777',
    tint: '#FCE7F3',
    enabled: false,
    route: '/patterns',
  },
  {
    id: 'money',
    labelKey: 'topics.money',
    descKey: 'topicsDesc.money',
    icon: 'cash-outline',
    accent: '#16A34A',
    tint: '#DCFCE7',
    enabled: false,
    route: '/money',
  },
];
