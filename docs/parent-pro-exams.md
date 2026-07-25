# Parent Pro — Assigned Exams (feature spec)

Second Parent Pro feature (`docs/parent-pro.md`). A parent **creates a practice
set / exam**, assigns it to one or more children; the kid sees it as a **pending
practice**, completes it in the normal workspace, and submits. **Blind results**:
the kid sees "Submitted ✓", the parent sees the score.

Lives in the dashboard's **Practice** tab (the placeholder shipped with the tab
restructure).

---

## 1. Reuse, don't fork

- **Questions:** an exam stores a fixed `Question[]`, generated from the existing
  `generateSession(settings)` (parent picks operation + settings + count).
  `Question` is already a plain serializable object.
- **Running it:** the kid completes the exam in the **existing practice
  workspace** — an exam is "a session with a fixed question list + blind
  results". (Requires a way to start a session from a preset question list
  instead of generating — a small `usePracticeSession` addition in the kid slice.)
- **Marking:** reuse the existing scoring against `Question.answer`.

---

## 2. Data model (proposed)

```
families/{fid}/exams/{examId}
    { title, createdBy: parentUid, assignedTo: childId[],
      operation, settings, questions: Question[], createdAt, dueAt? }

families/{fid}/children/{cid}/examResults/{examId}
    { examId, submittedAt, totalQuestions, finalScore,
      answers: { questionId, correct }[] }
```

- Exams are **family-level** (so a kid can query the ones assigned to them and a
  parent sees all they created).
- Results live under the **child** (like sessions) — the kid writes their own;
  the parent reads across children.
- **Pending** = an exam whose `assignedTo` includes the child AND has no
  `examResults/{examId}` yet.

---

## 3. Firestore rules (new — re-deploy required)

```
match /exams/{examId} {
  allow read:  if isMember(familyId)
               || (signedIn() && uid() in resource.data.assignedTo);
  allow write: if signedIn() && isMember(familyId);   // parents author
}
match /children/{childId}/examResults/{examId} {
  allow read:   if uid() == childId || isMember(familyId);
  allow create, update: if signedIn() && (uid() == childId || isMember(familyId));
  allow delete: if signedIn() && isMember(familyId);
}
```

---

## 4. Slices

1. **Data + Firestore layer** (`lib/exams/` types + `lib/firebase/exams.ts`):
   create/list exams, list pending for a child, submit a result, load results;
   cleanup wired into `removeChild` / family deletion.
2. **Parent UI** (Practice tab): create + assign (pick children, title, operation
   + settings + count → generate), list created exams with per-child status /
   score.
3. **Kid UI:** pending-exams list + open; run in the practice workspace from a
   preset question list; on Finish submit the result **blind** ("Submitted ✓").
4. **Rules deploy + gating** (`PARENT_PRO_ENABLED`, later the subscription).

---

## 5. Open decisions

- **Blind feedback tone:** kid sees "Submitted ✓ — nice work!" (no score);
  confirm no per-question review for the kid.
- **Mixed operations in one exam:** v1 = one `generateSession(settings)` set
  (one operation or `mix`); hand-picked specific problems later.
- **Due dates / expiry:** `dueAt` stored but v1 may not enforce.
- **Re-assign / retake:** v1 = one result per (child, exam); retake later.
- **Timer:** reuse the practice timer settings, or untimed for exams? (Proposed:
  follow the exam's `settings.timer`.)
