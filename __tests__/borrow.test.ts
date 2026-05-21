import { computeBorrowDisplay } from '../components/domain/borrow';

describe('computeBorrowDisplay', () => {
  it('leaves digits untouched with no lenders', () => {
    expect(computeBorrowDisplay([7, 3], [])).toEqual([
      { value: 7, crossedOut: false },
      { value: 3, crossedOut: false },
    ]);
  });

  it('handles a single borrow (73 → 6, 13)', () => {
    expect(computeBorrowDisplay([7, 3], [0])).toEqual([
      { value: 6, crossedOut: true },
      { value: 13, crossedOut: true },
    ]);
  });

  it('cascades through a zero (703, borrow from the middle 0)', () => {
    // Tapping the 0 (index 1) to lend to the units cascades to the 7.
    expect(computeBorrowDisplay([7, 0, 3], [1])).toEqual([
      { value: 6, crossedOut: true },
      { value: 9, crossedOut: true },
      { value: 13, crossedOut: true },
    ]);
  });

  it('supports two independent borrows', () => {
    // 8 5 2 with borrows at the hundreds and tens.
    expect(computeBorrowDisplay([8, 5, 2], [0, 1])).toEqual([
      { value: 7, crossedOut: true },
      { value: 14, crossedOut: true },
      { value: 12, crossedOut: true },
    ]);
  });

  it('ignores a lender on the units digit', () => {
    expect(computeBorrowDisplay([7, 3], [1])).toEqual([
      { value: 7, crossedOut: false },
      { value: 3, crossedOut: false },
    ]);
  });
});
