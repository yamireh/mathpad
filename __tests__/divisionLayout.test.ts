/**
 * Long-division layout math — locks the dividend → draft grid geometry so
 * future tweaks to dimensions can't silently shrink the grid below what an
 * N-digit dividend needs.
 */
import { divisionDraftSize } from '../components/domain/layout';

describe('divisionDraftSize', () => {
  it('mirrors the dividend digit count for columns', () => {
    expect(divisionDraftSize(7).columns).toBe(1);
    expect(divisionDraftSize(43).columns).toBe(2);
    expect(divisionDraftSize(432).columns).toBe(3);
    expect(divisionDraftSize(4321).columns).toBe(4);
  });

  it('initial rows fit one quotient step — workspace grows from there', () => {
    // Single-digit dividend: nothing to draft (e.g. 8 ÷ 2 = 4).
    expect(divisionDraftSize(7).rows).toBe(0);
    // Multi-digit dividends start with one product + one difference row;
    // the workspace adds more rows as the kid writes into the last visible row.
    expect(divisionDraftSize(43).rows).toBe(2);
    expect(divisionDraftSize(432).rows).toBe(2);
    expect(divisionDraftSize(4321).rows).toBe(2);
  });

  it('absolute value — sign of dividend never affects the grid', () => {
    expect(divisionDraftSize(-432)).toEqual(divisionDraftSize(432));
  });
});
