import { PORTRAIT_SITTINGS, portraitSittings } from './catalog';

describe('portraitSittings', () => {
  it('offers the Christmas portrait first, in November and December only', () => {
    expect(portraitSittings(new Date(2026, 10, 14))[0]).toBe('CHRISTMAS PORTRAIT');
    expect(portraitSittings(new Date(2026, 11, 31))[0]).toBe('CHRISTMAS PORTRAIT');
    expect(portraitSittings(new Date(2026, 10, 1))).toHaveLength(PORTRAIT_SITTINGS.length + 1);
  });

  it('offers only the year-round sittings out of season', () => {
    expect(portraitSittings(new Date(2027, 0, 1))).toEqual([...PORTRAIT_SITTINGS]);
    expect(portraitSittings(new Date(2026, 9, 31))).toEqual([...PORTRAIT_SITTINGS]);
  });
});
