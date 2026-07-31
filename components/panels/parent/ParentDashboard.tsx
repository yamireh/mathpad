import { Ionicons } from '@expo/vector-icons';
import { type ReactNode, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
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
import { Button, ConfirmDialog, Pill } from '../../ui';
import {
  useActiveChild,
  useAuthUser,
  useDashboard,
  usePurchases,
} from '../../../hooks';
import { PARENT_PRO_ENABLED } from '../../../lib/featureFlags';
import { type ChildProgress, resetChild } from '../../../lib/firebase/dashboard';
import {
  addChild as addChildSlot,
  FamilyFullError,
  reissueChild,
  removeChild,
  SLOT_COUNT,
} from '../../../lib/firebase/family';
import { AddChildDialog } from './AddChildDialog';
import { FamilyCode } from './FamilyCode';
import { Avatar, childColor, StatBadge, TopicPill } from './kit';
import { PracticeTab } from './PracticeTab';
import { RewardsSection } from './RewardsSection';

/** Parent dashboard tabs (only shown when Parent Pro is enabled). */
type DashTab = 'progress' | 'goals' | 'practice';

const pct = (correct: number, total: number) =>
  total > 0 ? Math.round((correct / total) * 100) : 0;

const label = (topic: string) => topic.charAt(0).toUpperCase() + topic.slice(1);

const methodColor = (topic: string) =>
  (operationColors as Record<string, { accent: string }>)[topic]?.accent ??
  (topic === 'clock' ? clockColors.hourHand : colors.text);

const methodTint = (topic: string) =>
  (operationColors as Record<string, { tint: string }>)[topic]?.tint ??
  (topic === 'clock' ? '#E6F0F7' : colors.surfaceAlt);

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
  allCorrect,
}: {
  corrected: number;
  solvedWithHelp: number;
  hintsUsed: number;
  allCorrect: boolean;
}) {
  const { t } = useTranslation();
  if (corrected + solvedWithHelp + hintsUsed === 0) {
    // No help used. Only celebrate if they actually got everything right —
    // otherwise (e.g. 0/10, all wrong, no help) show nothing; the score says it.
    return allCorrect ? (
      <Text style={styles.cleanNote}>{t('dashboard.clean')}</Text>
    ) : null;
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
 * A child's collapsible card header: avatar + name + an optional trailing stat,
 * with a chevron showing it can open/close. Shared by the Progress and Goals
 * tabs so a child looks the same wherever they appear.
 */
function ChildHeader({
  name,
  index,
  expanded,
  onToggle,
  stat,
}: {
  name: string;
  index: number;
  expanded: boolean;
  onToggle: () => void;
  stat?: ReactNode;
}) {
  return (
    <Pressable
      onPress={onToggle}
      style={styles.childHeader}
      accessibilityRole="button"
      accessibilityState={{ expanded }}
    >
      <View style={styles.childHeaderLeft}>
        <Avatar name={name} index={index} size={36} />
        <Text style={styles.childName} numberOfLines={1}>
          {name}
        </Text>
      </View>
      <View style={styles.childHeaderRight}>
        {stat}
        <Ionicons
          name={expanded ? 'chevron-up' : 'chevron-down'}
          size={18}
          color={colors.textMuted}
        />
      </View>
    </Pressable>
  );
}

/** The slot state banner: a join code + instructions while pending, or a small
 * "active" line once a device has claimed it. */
function SlotBanner({ child, name }: { child: ChildProgress; name: string }) {
  const { t } = useTranslation();
  if (child.status === 'pending' && child.code) {
    return (
      <View style={styles.slotPending}>
        <Text style={styles.slotStatus}>{t('dashboard.statusPending')}</Text>
        <FamilyCode code={child.code} label={t('dashboard.codeLabel')} hint="" />
        <Text style={styles.slotHint}>{t('dashboard.shareCode', { name })}</Text>
      </View>
    );
  }
  return (
    <View style={styles.slotActive}>
      <Ionicons name="checkmark-circle" size={15} color={colors.correct} />
      <Text style={styles.slotActiveText}>{t('dashboard.statusLinked')}</Text>
    </View>
  );
}

function ChildBody({
  child,
  name,
  onPractice,
  onReset,
  onRemove,
  onReissue,
}: {
  child: ChildProgress;
  name: string;
  onPractice: () => void;
  onReset: () => void;
  onRemove: () => void;
  onReissue: () => void;
}) {
  const { t } = useTranslation();
  const topics = Object.entries(child.byTopic);
  return (
    <View style={styles.card}>
      <SlotBanner child={child} name={name} />
      <View style={styles.stats}>
        <StatBadge
          icon="albums-outline"
          iconColor={operationColors.addition.accent}
          background={operationColors.addition.tint}
          value={String(child.totalSessions)}
          valueColor={operationColors.addition.accent}
          caption={t('dashboard.sessions')}
        />
        <StatBadge
          icon="help-circle-outline"
          iconColor={operationColors.multiplication.accent}
          background={operationColors.multiplication.tint}
          value={String(child.totalQuestions)}
          valueColor={operationColors.multiplication.accent}
          caption={t('dashboard.questions')}
        />
        <StatBadge
          icon="ribbon-outline"
          iconColor={colors.correct}
          background="#E6F7EC"
          value={`${pct(child.totalCorrect, child.totalQuestions)}%`}
          valueColor={colors.correct}
          caption={t('dashboard.accuracy')}
        />
      </View>

      {topics.length > 0 ? (
        <View style={styles.section}>
          {topics.map(([topic, s]) => (
            <View key={topic} style={styles.topicRow}>
              <TopicPill
                label={label(topic)}
                tint={methodTint(topic)}
                color={methodColor(topic)}
              />
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
                <View style={styles.methodHead}>
                  <TopicPill
                    label={label(g.topic)}
                    tint={methodTint(g.topic)}
                    color={methodColor(g.topic)}
                  />
                </View>
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
                        allCorrect={r.finalScore >= r.totalQuestions}
                      />
                    </View>
                  </View>
                ))}
              </View>
            ))}
          </View>
        </View>
      ) : null}

      <View style={styles.childActions}>
        <Pressable
          onPress={onPractice}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.childAction}
        >
          <Ionicons name="play-circle-outline" size={14} color={colors.answerInk} />
          <Text style={[styles.childActionText, { color: colors.answerInk }]}>
            {t('dashboard.practiceAs')}
          </Text>
        </Pressable>
        {child.status === 'linked' ? (
          <Pressable
            onPress={onReissue}
            accessibilityRole="button"
            hitSlop={8}
            style={styles.childAction}
          >
            <Ionicons name="refresh-circle-outline" size={14} color={colors.textMuted} />
            <Text style={styles.childActionText}>{t('dashboard.reissue')}</Text>
          </Pressable>
        ) : null}
        <Pressable
          onPress={onReset}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.childAction}
        >
          <Ionicons name="refresh-outline" size={14} color={colors.textMuted} />
          <Text style={styles.childActionText}>{t('dashboard.reset')}</Text>
        </Pressable>
        <Pressable
          onPress={onRemove}
          accessibilityRole="button"
          hitSlop={8}
          style={styles.childAction}
        >
          <Ionicons name="person-remove-outline" size={14} color={colors.wrong} />
          <Text style={[styles.childActionText, styles.removeText]}>
            {t('dashboard.remove')}
          </Text>
        </Pressable>
      </View>
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
  const { user } = useAuthUser();
  const { setActiveChild } = useActiveChild();
  const { devSetParentPro } = usePurchases();
  const { children, loading, error, reload } = useDashboard(familyId);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [goalsOpen, setGoalsOpen] = useState<Record<string, boolean>>({});
  const [pending, setPending] = useState<{
    action: 'reset' | 'remove' | 'reissue';
    childId: string;
    name: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);
  const [tab, setTab] = useState<DashTab>('progress');
  const [addingChild, setAddingChild] = useState(false);
  // After "Add child", the freshly-minted join code to reveal to the parent.
  const [newChild, setNewChild] = useState<{ name: string; code: string } | null>(
    null,
  );

  const addChild = async (name: string) => {
    setAddingChild(false);
    try {
      const { code } = await addChildSlot(familyId, name);
      setNewChild({ name, code });
      reload();
    } catch (e) {
      if (e instanceof FamilyFullError) {
        Alert.alert(
          t('dashboard.familyFullTitle'),
          t('dashboard.familyFull', { max: SLOT_COUNT }),
        );
      }
    }
  };

  const action = pending?.action;
  const confirmAction = async () => {
    if (!pending) return;
    setBusy(true);
    try {
      if (pending.action === 'remove') await removeChild(familyId, pending.childId);
      else if (pending.action === 'reissue')
        await reissueChild(familyId, pending.childId);
      else await resetChild(familyId, pending.childId);
      reload();
    } catch {
      // best-effort; the dialog closes and they can retry
    } finally {
      setBusy(false);
      setPending(null);
    }
  };

  // Every child starts collapsed — the parent taps a name to open it.
  const toggle = (id: string) => setExpanded((m) => ({ ...m, [id]: !m[id] }));
  const toggleGoals = (id: string) =>
    setGoalsOpen((m) => ({ ...m, [id]: !m[id] }));

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
        <Ionicons name="people-outline" size={44} color={colors.textMuted} />
        <Text style={styles.emptyText}>{t('dashboard.empty')}</Text>
        <Button
          label={t('dashboard.addChild')}
          icon="add"
          onPress={() => setAddingChild(true)}
        />
        <AddChildDialog
          visible={addingChild}
          onAdd={addChild}
          onCancel={() => setAddingChild(false)}
        />
        <NewChildDialog child={newChild} onClose={() => setNewChild(null)} />
        {/* The dashboard doesn't live-update, so a parent who just shared the
            code needs a way to pull the newly-connected child in. */}
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
    );
  }

  const sections = children.map((child, index) => ({
    key: child.childId,
    child,
    index,
    data: (expanded[child.childId] ?? false) ? [child] : [],
  }));

  const progressList = (
    <SectionList
      sections={sections}
      keyExtractor={(item) => item.childId}
      stickySectionHeadersEnabled
      renderSectionHeader={({ section }) => {
        const name =
          section.child.name?.trim() ||
          t('dashboard.child', { n: section.index + 1 });
        return (
          <ChildHeader
            name={name}
            index={section.index}
            expanded={expanded[section.child.childId] ?? false}
            onToggle={() => toggle(section.child.childId)}
            stat={
              section.child.status === 'pending' ? (
                <Text style={styles.pendingTag}>{t('dashboard.statusPending')}</Text>
              ) : section.child.totalQuestions > 0 ? (
                <Text
                  style={[
                    styles.childHeaderStat,
                    { color: childColor(section.index) },
                  ]}
                >
                  {pct(section.child.totalCorrect, section.child.totalQuestions)}%
                </Text>
              ) : null
            }
          />
        );
      }}
      renderItem={({ item, section }) => {
        const name =
          item.name?.trim() || t('dashboard.child', { n: section.index + 1 });
        return (
          <ChildBody
            child={item}
            name={name}
            onPractice={() =>
              setActiveChild({ familyId, childId: item.childId, name })
            }
            onReset={() =>
              setPending({ action: 'reset', childId: item.childId, name })
            }
            onRemove={() =>
              setPending({ action: 'remove', childId: item.childId, name })
            }
            onReissue={() =>
              setPending({ action: 'reissue', childId: item.childId, name })
            }
          />
        );
      }}
      renderSectionFooter={() => <View style={styles.sectionGap} />}
      ListFooterComponent={
        <Pressable
          onPress={() => setAddingChild(true)}
          accessibilityRole="button"
          style={styles.addChildRow}
        >
          <Ionicons name="add-circle-outline" size={18} color={colors.answerInk} />
          <Text style={styles.addChildText}>{t('dashboard.addChild')}</Text>
        </Pressable>
      }
      contentContainerStyle={styles.dashListContent}
      showsVerticalScrollIndicator={false}
    />
  );

  const goalsList = (
    <ScrollView
      contentContainerStyle={styles.dashListContent}
      showsVerticalScrollIndicator={false}
    >
      {children.map((child, index) => {
        const name = child.name?.trim() || t('dashboard.child', { n: index + 1 });
        const open = goalsOpen[child.childId] ?? false;
        return (
          <View key={child.childId} style={styles.goalGroup}>
            <ChildHeader
              name={name}
              index={index}
              expanded={open}
              onToggle={() => toggleGoals(child.childId)}
            />
            {open ? (
              <View style={styles.card}>
                <RewardsSection
                  familyId={familyId}
                  childId={child.childId}
                  sessions={child.recent.map((r) => ({
                    topic: r.topic,
                    completedAt: r.completedAt,
                    totalQuestions: r.totalQuestions,
                  }))}
                  topicLabel={label}
                />
              </View>
            ) : null}
          </View>
        );
      })}
    </ScrollView>
  );

  const practiceTab = (
    <PracticeTab
      familyId={familyId}
      createdBy={user?.uid ?? ''}
      children={children.map((c, i) => ({
        childId: c.childId,
        name: c.name?.trim() || t('dashboard.child', { n: i + 1 }),
      }))}
    />
  );

  return (
    <View style={styles.dash}>
      {/* Pinned bar — title/tabs + refresh, stays put while the list scrolls. */}
      <View style={styles.dashBar}>
        {PARENT_PRO_ENABLED ? (
          <View style={styles.tabs}>
            {(['progress', 'goals', 'practice'] as DashTab[]).map((k) => (
              <Pressable
                key={k}
                onPress={() => setTab(k)}
                accessibilityRole="button"
                accessibilityState={{ selected: tab === k }}
                style={[styles.tab, tab === k && styles.tabActive]}
              >
                <Text style={[styles.tabText, tab === k && styles.tabTextActive]}>
                  {t(
                    k === 'progress'
                      ? 'dashboard.tabProgress'
                      : k === 'goals'
                        ? 'dashboard.tabGoals'
                        : 'dashboard.tabPractice',
                  )}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : (
          <Text style={styles.dashBarTitle}>{t('dashboard.title')}</Text>
        )}
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

      {!PARENT_PRO_ENABLED || tab === 'progress'
        ? progressList
        : tab === 'goals'
          ? goalsList
          : practiceTab}

      {/* Dev-only: re-lock parent mode (brings the paywall back). Pinned to the
          bottom so it stays out of the way of the real dashboard. */}
      {__DEV__ ? (
        <View style={styles.devRow}>
          <Pill
            label="DEV: lock parent mode"
            icon="bug-outline"
            onPress={() => devSetParentPro(false)}
          />
        </View>
      ) : null}

      <ConfirmDialog
        visible={pending !== null}
        title={t(
          action === 'remove'
            ? 'dashboard.removeTitle'
            : action === 'reissue'
              ? 'dashboard.reissueTitle'
              : 'dashboard.resetTitle',
          { name: pending?.name ?? '' },
        )}
        message={t(
          action === 'remove'
            ? 'dashboard.removeMessage'
            : action === 'reissue'
              ? 'dashboard.reissueMessage'
              : 'dashboard.resetMessage',
          { name: pending?.name ?? '' },
        )}
        confirmLabel={
          busy
            ? t(
                action === 'remove'
                  ? 'dashboard.removing'
                  : action === 'reissue'
                    ? 'dashboard.reissuing'
                    : 'dashboard.resetting',
              )
            : t(
                action === 'remove'
                  ? 'dashboard.remove'
                  : action === 'reissue'
                    ? 'dashboard.reissue'
                    : 'dashboard.reset',
              )
        }
        cancelLabel={t('common.cancel')}
        destructive={action !== 'reissue'}
        onConfirm={confirmAction}
        onCancel={() => setPending(null)}
      />

      <AddChildDialog
        visible={addingChild}
        onAdd={addChild}
        onCancel={() => setAddingChild(false)}
      />

      <NewChildDialog child={newChild} onClose={() => setNewChild(null)} />
    </View>
  );
}

/**
 * Reveals a just-created child's join code + short instructions so the parent
 * can enter it on the child's device. Shown right after "Add child".
 */
function NewChildDialog({
  child,
  onClose,
}: {
  child: { name: string; code: string } | null;
  onClose: () => void;
}) {
  const { t } = useTranslation();
  return (
    <Modal
      visible={child !== null}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.newChildBackdrop}>
        <View style={styles.newChildDialog} accessibilityViewIsModal>
          <Text style={styles.newChildTitle}>
            {t('dashboard.addedTitle', { name: child?.name ?? '' })}
          </Text>
          {child ? (
            <FamilyCode code={child.code} label={t('dashboard.codeLabel')} hint="" />
          ) : null}
          <View style={styles.newChildSteps}>
            <Text style={styles.newChildStep}>{t('dashboard.addStep1')}</Text>
            <Text style={styles.newChildStep}>{t('dashboard.addStep2')}</Text>
            <Text style={styles.newChildStep}>{t('dashboard.addStep3')}</Text>
          </View>
          <Button label={t('common.done')} variant="primary" onPress={onClose} />
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  dash: { flex: 1, alignSelf: 'stretch', gap: spacing.sm },
  dashBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  dashBarTitle: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: colors.textMuted,
  },
  // Segmented control: a tinted track with a raised white pill for the active
  // tab — clearer than tinted text.
  tabs: {
    flexDirection: 'row',
    flex: 1,
    backgroundColor: colors.surfaceAlt,
    borderRadius: radius.md,
    padding: 3,
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.surface,
    ...shadows.sm,
  },
  tabText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
  tabTextActive: { color: operationColors.addition.accent },
  goalGroup: { marginBottom: spacing.md },
  devRow: { alignItems: 'center', marginTop: 'auto', paddingTop: spacing.sm },
  dashListContent: { paddingBottom: spacing.xl },
  addChildRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
    paddingVertical: spacing.lg,
  },
  addChildText: {
    fontSize: typography.size.body,
    fontWeight: typography.weight.medium,
    color: colors.answerInk,
  },
  familyFull: {
    textAlign: 'center',
    paddingVertical: spacing.lg,
    fontSize: typography.size.caption,
    color: colors.textMuted,
  },
  pendingTag: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: operationColors.addition.accent,
    backgroundColor: operationColors.addition.tint,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: 'hidden',
  },
  slotPending: { gap: spacing.sm },
  slotStatus: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    color: operationColors.addition.accent,
  },
  slotHint: {
    fontSize: typography.size.caption,
    color: colors.textMuted,
    textAlign: 'center',
  },
  slotActive: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  slotActiveText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.correct,
  },
  newChildBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(28, 28, 40, 0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.xl,
  },
  newChildDialog: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: colors.surface,
    borderRadius: radius.xl,
    padding: spacing.xl,
    gap: spacing.md,
    ...shadows.lg,
  },
  newChildTitle: {
    fontSize: typography.size.title,
    fontWeight: typography.weight.medium,
    color: colors.text,
    textAlign: 'center',
  },
  newChildSteps: { gap: spacing.xs },
  newChildStep: {
    fontSize: typography.size.body,
    color: colors.textMuted,
  },
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
  childHeaderStat: {
    fontSize: typography.size.body,
    fontWeight: '700',
  },
  sectionGap: { height: spacing.md },
  childActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: colors.border,
  },
  childAction: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingVertical: spacing.xs,
  },
  childActionText: {
    fontSize: typography.size.caption,
    fontWeight: typography.weight.medium,
    color: colors.textMuted,
  },
  removeText: { color: colors.wrong },
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
  stats: { flexDirection: 'row', gap: spacing.sm },
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
  topicRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
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
  methodHead: { flexDirection: 'row' },
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
