import { Ionicons } from '@expo/vector-icons';
import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Pressable,
  SectionList,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import {
  clockColors,
  colors,
  operationColors,
  radius,
  shadows,
  spacing,
  typography,
} from '../../../constants/design';
import { useDashboard } from '../../../hooks';
import type { ChildProgress } from '../../../lib/firebase/dashboard';

const pct = (correct: number, total: number) =>
  total > 0 ? Math.round((correct / total) * 100) : 0;

const label = (topic: string) => topic.charAt(0).toUpperCase() + topic.slice(1);

const methodColor = (topic: string) =>
  (operationColors as Record<string, { accent: string }>)[topic]?.accent ??
  (topic === 'clock' ? clockColors.hourHand : colors.text);

// A distinct tint per child so several kids read apart at a glance.
const CHILD_TINTS = ['#2563EB', '#DB2777', '#16A34A', '#D97706', '#7C3AED', '#0891B2'];
const childTint = (index: number) => CHILD_TINTS[index % CHILD_TINTS.length];

/** Group recent sessions by method, keeping each group in recency order. */
function groupByMethod<T extends { topic: string }>(sessions: T[]) {
  const groups: { topic: string; sessions: T[] }[] = [];
  for (const s of sessions) {
    const existing = groups.find((g) => g.topic === s.topic);
    if (existing) existing.sessions.push(s);
    else groups.push({ topic: s.topic, sessions: [s] });
  }
  return groups;
}

const shortDate = (iso: string) => {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return '';
  }
};

const shortTime = (iso: string) => {
  try {
    return new Date(iso).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return '';
  }
};

function Stat({ value, caption }: { value: string; caption: string }) {
  return (
    <View style={styles.stat}>
      <Text style={styles.statValue}>{value}</Text>
      <Text style={styles.statCaption}>{caption}</Text>
    </View>
  );
}

type IoniconName = keyof typeof Ionicons.glyphMap;

/** A small "help signal" pill (corrected / solved / hint) on a session row. */
function Badge({
  icon,
  tone,
  text,
}: {
  icon: IoniconName;
  tone: string;
  text: string;
}) {
  return (
    <View style={styles.badge}>
      <Ionicons name={icon} size={13} color={tone} />
      <Text style={styles.badgeText}>{text}</Text>
    </View>
  );
}

/**
 * The story behind a session's score: how many the kid corrected themselves,
 * how many the app solved, and hints used. A clean run shows a single "no help"
 * note so 10/10 with help reads differently from a spotless 10/10.
 */
function SessionBadges({
  corrected,
  solvedWithHelp,
  hintsUsed,
}: {
  corrected: number;
  solvedWithHelp: number;
  hintsUsed: number;
}) {
  const { t } = useTranslation();
  if (corrected + solvedWithHelp + hintsUsed === 0) {
    return <Text style={styles.cleanNote}>{t('dashboard.clean')}</Text>;
  }
  return (
    <View style={styles.badges}>
      {corrected > 0 ? (
        <Badge
          icon="create-outline"
          tone="#D97706"
          text={t('dashboard.corrected', { count: corrected })}
        />
      ) : null}
      {solvedWithHelp > 0 ? (
        <Badge
          icon="color-wand-outline"
          tone="#7C3AED"
          text={t('dashboard.solvedWithHelp', { count: solvedWithHelp })}
        />
      ) : null}
      {hintsUsed > 0 ? (
        <Badge
          icon="bulb-outline"
          tone={operationColors.addition.accent}
          text={t('dashboard.hint', { count: hintsUsed })}
        />
      ) : null}
    </View>
  );
}

/**
 * A child's collapsible, sticky section header: name + a compact accuracy, with
 * a chevron showing it can open/close. Stays pinned while its body scrolls, so
 * the parent always knows whose progress they're looking at.
 */
function ChildHeader({
  child,
  index,
  expanded,
  onToggle,
}: {
  child: ChildProgress;
  index: number;
  expanded: boolean;
  onToggle: () => void;
}) {
  const { t } = useTranslation();
  const name = child.name?.trim() || t('dashboard.child', { n: index + 1 });
  const initial = (child.name?.trim()?.[0] ?? String(index + 1)).toUpperCase();
  const tint = childTint(index);
  return (
    <Pressable
      onPress={onToggle}
      style={styles.childHeader}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
    >
      <View style={styles.childHeaderLeft}>
        <View style={[styles.avatar, { backgroundColor: tint }]}>
          <Text style={styles.avatarText}>{initial}</Text>
        </View>
        <Text style={styles.childName} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={styles.childHeaderRight}>
        {child.totalQuestions > 0 ? (
          <Text style={[styles.childHeaderStat, { color: tint }]}>
            {pct(child.totalCorrect, child.totalQuestions)}%
          </Text>
        ) : null}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </View>
    </Pressable>
  );
}

function ChildBody({ child }: { child: ChildProgress }) {
  const { t } = useTranslation();
  const topics = Object.entries(child.byTopic);
  return (
    <View style={styles.card}>
      <View style={styles.stats}>
        <Stat value={String(child.totalSessions)} caption={t('dashboard.sessions')} />
        <Stat value={String(child.totalQuestions)} caption={t('dashboard.questions')} />
        <Stat
          value={`${pct(child.totalCorrect, child.totalQuestions)}%`}
          caption={t('dashboard.accuracy')}
        />
      </View>

      {topics.length > 0 ? (
        <View style={styles.section}>
          {topics.map(([topic, s]) => (
            <View key={topic} style={styles.row}>
              <Text style={styles.rowLabel}>{label(topic)}</Text>
              <Text style={styles.rowValue}>
                {s.correct}/{s.questions} · {pct(s.correct, s.questions)}%
              </Text>
            </View>
          ))}
        </View>
      ) : null}

      {child.recent.length > 0 ? (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>{t('dashboard.recent')}</Text>
          <View style={styles.methodGroups}>
            {groupByMethod(child.recent).map((g) => (
              <View key={g.topic} style={styles.methodGroup}>
                <Text style={[styles.methodTitle, { color: methodColor(g.topic) }]}>
                  {label(g.topic)}
                </Text>
                {g.sessions.map((r, i) => (
                  <View key={r.id}>
                    {i > 0 ? <View style={styles.divider} /> : null}
                    <View style={styles.recentItem}>
                      <View style={styles.row}>
                        <Text style={styles.rowLabel}>
                          {shortDate(r.completedAt)}
                          <Text style={styles.rowTime}>
                            {'  '}
                            {shortTime(r.completedAt)}
                          </Text>
                        </Text>
                        <Text style={styles.rowValue}>
                          {r.finalScore}/{r.totalQuestions}
                        </Text>
                      </View>
                      <SessionBadges
                        corrected={r.corrected}
                        solvedWithHelp={r.solvedWithHelp}
                        hintsUsed={r.hintsUsed}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      ) : null}
    </View>
  );
}

/**
 * The parent progress dashboard — one collapsible section per child. Section
 * headers are sticky, so with several kids you can collapse the ones you're not
 * looking at and always see whose card you're scrolling.
 */
export function ParentDashboard({ familyId }: { familyId: string }) {
  const { t } = useTranslation();
  const { children, loading, error, reload } = useDashboard(familyId);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const seeded = useRef(false);

  // Open the first child by default; the rest collapse so every name is visible
  // at once without scrolling to reach the last child.
  useEffect(() => {
    if (!seeded.current && children.length > 0) {
      seeded.current = true;
      setExpanded({ [children[0].childId]: true });
    }
  }, [children]);

  const toggle = (id: string) => setExpanded((m) => ({ ...m, [id]: !m[id] }));

  if (loading && children.length === 0) {
    return <ActivityIndicator color={operationColors.addition.accent} />;
  }
  if (error) {
    return (
      <Pressable onPress={reload} style={styles.empty}>
        <Text style={styles.emptyText}>{t('dashboard.error')}</Text>
      </Pressable>
    );
  }
  if (children.length === 0) {
    return (
      <View style={styles.empty}>
        <Ionicons name="bar-chart-outline" size={44} color={colors.textMuted} />
        <Text style={styles.emptyText}>{t('dashboard.empty')}</Text>
      </View>
    );
  }

  const sections = children.map((child, index) => ({
    key: child.childId,
    child,
    index,
    data: (expanded[child.childId] ?? false) ? [child] : [],
  }));

  return (
    <View style={styles.dash}>
      {/* Pinned bar — refresh stays reachable while the list below scrolls. */}
      <View style={styles.dashBar}>
        <Text style={styles.dashBarTitle}>{t('dashboard.title')}</Text>
        <Pressable
          onPress={reload}
          disabled={loading}
          style={styles.refresh}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator size="small" color={operationColors.addition.accent} />
          ) : (
            <Ionicons name="refresh" size={16} color={operationColors.addition.accent} />
          )}
          <Text style={styles.refreshText}>
            {t(loading ? 'dashboard.refreshing' : 'dashboard.refresh')}
          </Text>
        </Pressable>
      </View>
      <SectionList
        sections={sections}
        keyExtractor={(item) => item.childId}
        stickySectionHeadersEnabled
        renderSectionHeader={({ section }) => (
          <ChildHeader
            child={section.child}
            index={section.index}
            expanded={expanded[section.child.childId] ?? false}
            onToggle={() => toggle(section.child.childId)}
          />
        )}
        renderItem={({ item }) => <ChildBody child={item} />}
        renderSectionFooter={() => <View style={styles.sectionGap} />}
        contentContainerStyle={styles.dashListContent}
        showsVerticalScrollIndicator={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  dash: { flex: 1, alignSelf: 'stretch', gap: spacing.sm },
  dashBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dashBarTitle: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  dashListContent: { paddingBottom: spacing.xl },
  // A styled card, opaque so the sticky header cleanly covers content beneath it.
  childHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.sm,
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    ...shadows.sm,
  },
  childHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    flexShrink: 1,
  },
  childHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  avatar: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: typography.size.body,
    fontWeight: '700',
  },
  childHeaderStat: {
    fontSize: typography.size.body,
    fontWeight: '700',
  },
  sectionGap: { height: spacing.md },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginTop: spacing.xs,
    gap: spacing.md,
    ...shadows.sm,
  },
  childName: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    flexShrink: 1,
  },
  stats: { flexDirection: 'row', justifyContent: 'space-around' },
  stat: { alignItems: 'center', gap: 2 },
  statValue: {
    fontSize: typography.size.heading,
    fontWeight: '700',
    color: operationColors.addition.accent,
  },
  statCaption: {
    fontSize: typography.size.caption,
    color: colors.textMuted,
  },
  section: {
    gap: spacing.xs,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
    marginBottom: spacing.xs,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between' },
  rowLabel: { fontSize: typography.size.body, color: colors.text },
  rowTime: { fontSize: typography.size.caption, color: colors.textMuted },
  rowValue: { fontSize: typography.size.body, color: colors.textMuted },
  methodGroups: { gap: spacing.sm },
  methodGroup: {
    gap: spacing.sm,
    backgroundColor: colors.background,
    borderRadius: radius.md,
    padding: spacing.md,
  },
  methodTitle: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
  },
  divider: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: colors.border,
    marginVertical: spacing.sm,
  },
  recentItem: { gap: 4 },
  badges: { flexDirection: 'row', flexWrap: 'wrap', gap: spacing.xs },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    backgroundColor: colors.background,
    borderRadius: radius.sm,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  badgeText: { fontSize: typography.size.caption, color: colors.textMuted },
  cleanNote: { fontSize: typography.size.caption, color: colors.correct },
  empty: { alignItems: 'center', gap: spacing.sm, padding: spacing.xl },
  emptyText: {
    fontSize: typography.size.body,
    color: colors.textMuted,
    textAlign: 'center',
    maxWidth: 320,
  },
  refresh: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
  },
  refreshText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: operationColors.addition.accent,
  },
});
