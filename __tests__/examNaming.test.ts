import { nextExamTitle } from '../lib/exams';

const now = new Date(2026, 6, 25, 12); // 2026-07-25, local

describe('nextExamTitle', () => {
  it('starts at #1 with no existing sets today', () => {
    expect(nextExamTitle([], now)).toBe('2026-07-25 #1');
  });

  it('continues the daily sequence', () => {
    expect(nextExamTitle(['2026-07-25 #1', '2026-07-25 #2'], now)).toBe(
      '2026-07-25 #3',
    );
  });

  it('ignores other days when counting', () => {
    expect(
      nextExamTitle(['2026-07-24 #1', '2026-07-24 #2', '2026-07-25 #1'], now),
    ).toBe('2026-07-25 #2');
  });

  it('restarts at #1 on a fresh day', () => {
    expect(nextExamTitle(['2026-07-24 #1', '2026-07-24 #2'], now)).toBe(
      '2026-07-25 #1',
    );
  });
});
