/**
 * First-open "how-to" intro state. The very first time a kid opens a module
 * (an operation or the clock) we auto-open its how-to walkthrough. Each module
 * is tracked independently in the shared coach-mark store — dismissing one's
 * intro never affects another's.
 */
import { tipsStore } from './storage';

const seenKey = (id: string) => `howto:${id}`;

/** Whether module `id`'s intro should auto-open (i.e. it hasn't been seen). */
export async function shouldShowHowToIntro(id: string): Promise<boolean> {
  const dismissed = await tipsStore.load();
  return !dismissed.includes(seenKey(id));
}

/** Mark module `id`'s intro as shown, so it won't auto-open again. */
export async function markHowToIntroSeen(id: string): Promise<void> {
  const dismissed = await tipsStore.load();
  if (!dismissed.includes(seenKey(id))) {
    await tipsStore.save([...dismissed, seenKey(id)]);
  }
}

/** Dev/QA: clear every how-to flag so the intros auto-open again. */
export async function resetHowToIntros(): Promise<void> {
  const dismissed = await tipsStore.load();
  await tipsStore.save(dismissed.filter((d) => !d.startsWith('howto:')));
}
