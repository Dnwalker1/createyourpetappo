import { problemsWith } from './AddressForm';

const good = { name: 'Macey Webb', line1: '123 Campground Rd', line2: 'Lot 12', city: 'Loudon', state: 'TN', zip: '37774', country: 'US' };

describe('address checks', () => {
  it('accepts a complete US address', () => {
    expect(problemsWith(good)).toEqual({});
    expect(problemsWith({ ...good, line2: '', zip: '37774-1234' })).toEqual({});
  });
  it('asks for the missing pieces', () => {
    const p = problemsWith({ ...good, name: ' ', city: '', state: 'Tenn', zip: '3777' });
    expect(Object.keys(p).sort()).toEqual(['city', 'name', 'state', 'zip']);
  });
  it('wants a house number on the street line', () => {
    expect(problemsWith({ ...good, line1: 'Campground Road' }).line1).toMatch(/number/);
  });
  it('only needs some postal code outside the US', () => {
    expect(problemsWith({ ...good, country: 'CA', state: 'Ontario', zip: 'M5V 2T6' })).toEqual({});
  });
});
