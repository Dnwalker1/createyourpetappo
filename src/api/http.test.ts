import { createHttpApi } from './http';
import { ApiError } from './types';

type Reply = { status?: number; body: unknown };

// A fetch stand-in that answers in order and records each request.
function fakeFetch(replies: Reply[]) {
  const calls: { url: string; init?: RequestInit }[] = [];
  const fn = jest.fn(async (url: string, init?: RequestInit) => {
    calls.push({ url, init });
    const reply = replies.shift();
    if (!reply) throw new Error(`Unexpected request to ${url}`);
    return { ok: (reply.status ?? 200) < 400, status: reply.status ?? 200, json: async () => reply.body, blob: async () => 'bytes' } as unknown as Response;
  });
  globalThis.fetch = fn as unknown as typeof fetch;
  return calls;
}

const DEVICE = 'device-1234567890abcdef';
const api = () => createHttpApi('https://www.goodwookie.com', 'test-key');
const headers = (init?: RequestInit) => init?.headers as Record<string, string>;
const body = (init?: RequestInit) => JSON.parse(String(init?.body));

afterEach(() => jest.useRealTimers());

describe('http api', () => {
  it('sends the device and app key headers to /_functions', async () => {
    const calls = fakeFetch([{ body: { ok: true, designs: [], inProgressDesignId: null, allowance: { designsLeft: 3, triesLeft: 9, designUnlockAt: '2026-09-24T20:14:00Z' } } }]);
    const limits = await api().getLimits(DEVICE);
    expect(calls[0].url).toBe('https://www.goodwookie.com/_functions/designs');
    expect(headers(calls[0].init)).toMatchObject({ 'X-Device-Id': DEVICE, 'X-App-Key': 'test-key' });
    expect(limits).toEqual({ available: 3, nextDesignAt: Date.parse('2026-09-24T20:14:00Z'), blockedBy: null, unlocksAt: null });
  });

  it('turns limits and a design in progress into blocks', async () => {
    fakeFetch([
      { body: { ok: true, inProgressDesignId: 'd1', allowance: { designsLeft: 2, triesLeft: 5 } } },
      { body: { ok: true, inProgressDesignId: null, allowance: { designsLeft: 3, triesLeft: 0, tryUnlockAt: '2026-09-25T01:00:00Z' } } },
    ]);
    expect((await api().getLimits(DEVICE)).blockedBy).toBe('in-progress');
    expect(await api().getLimits(DEVICE)).toMatchObject({ blockedBy: 'tries', unlocksAt: Date.parse('2026-09-25T01:00:00Z') });
  });

  it('maps { ok: false } answers to the app error codes', async () => {
    fakeFetch([{ body: { ok: false, code: 'limit_designs', message: 'x', unlockAt: '2026-09-24T20:14:00Z' } }]);
    const err = (await api()
      .createDesign(DEVICE, { photoId: 'f1', styleId: 'stamp' })
      .catch((e) => e)) as ApiError;
    expect(err.code).toBe('LIMIT_REACHED');
    expect(err.unlocksAt).toBe(Date.parse('2026-09-24T20:14:00Z'));
  });

  it('waits and retries while the upload is not ready', async () => {
    jest.useFakeTimers();
    const calls = fakeFetch([
      { body: { ok: false, code: 'upload_not_ready', retryAfterMs: 2000 } },
      { body: { ok: true, designId: 'd9', style: 'poster' } },
    ]);
    const pending = api().createDesign(DEVICE, { photoId: 'file-1', styleId: 'poster', text: 'BISCUIT' });
    await jest.advanceTimersByTimeAsync(2000);
    await expect(pending).resolves.toEqual({ designId: 'd9' });
    expect(body(calls[1].init)).toEqual({ fileId: 'file-1', style: 'poster', text: 'BISCUIT' });
  });

  it('carries on with the design already in progress', async () => {
    fakeFetch([{ body: { ok: false, code: 'one_at_a_time', designId: 'd-running' } }]);
    await expect(api().createDesign(DEVICE, { photoId: 'f', styleId: 'stamp' })).resolves.toEqual({ designId: 'd-running' });
  });

  it('maps finished design statuses to problem screens', async () => {
    fakeFetch([
      { body: { ok: true, designId: 'a', status: 'no_pet', style: 'stamp' } },
      { body: { ok: true, designId: 'b', status: 'checker_down', style: 'stamp' } },
      { body: { ok: true, designId: 'c', status: 'ready', style: 'evening', previewUrl: 'https://static.wixstatic.com/p.png' } },
    ]);
    expect(await api().getDesign(DEVICE, 'a')).toMatchObject({ status: 'rejected', problem: 'NO_PET' });
    expect(await api().getDesign(DEVICE, 'b')).toMatchObject({ status: 'failed', problem: 'CHECKER_UNAVAILABLE' });
    expect(await api().getDesign(DEVICE, 'c')).toMatchObject({ status: 'ready', preview: { uri: 'https://static.wixstatic.com/p.png' } });
  });

  it('expands a bundle into checkout items with the backend size names', async () => {
    const calls = fakeFetch([{ body: { ok: true, checkoutId: 'co1', checkoutUrl: 'https://www.goodwookie.com/checkout?x' } }]);
    const res = await api().createCheckout(DEVICE, [
      {
        kind: 'bundle',
        designId: 'd1',
        choices: [
          { product: 'tee', color: 'White', size: 'L' },
          { product: 'hoodie', color: 'Bone', size: 'XL' },
          { product: 'sticker', size: '4x4' },
          { product: 'poster', size: '16x16' },
        ],
      },
    ]);
    expect(res).toEqual({ checkoutId: 'co1', checkoutUrl: 'https://www.goodwookie.com/checkout?x' });
    expect(body(calls[0].init).items).toEqual([
      { designId: 'd1', productKey: 'tee', color: 'White', size: 'L', quantity: 1 },
      { designId: 'd1', productKey: 'hoodie', color: 'Bone', size: 'XL', quantity: 1 },
      { designId: 'd1', productKey: 'sticker', size: '4x4', quantity: 1 },
      { designId: 'd1', productKey: 'poster', size: '16×16', quantity: 1 },
    ]);
  });

  it('reads orders with the real order number and total in cents', async () => {
    fakeFetch([
      {
        body: {
          ok: true,
          orders: [
            {
              orderNumber: '10042',
              placedAt: '2026-09-23T18:40:00Z',
              total: 127.95,
              stage: 'shipped',
              trackingUrl: 'https://track',
              items: [{ title: 'T-Shirt', quantity: 2, previewUrl: 'https://p' }],
            },
          ],
        },
      },
    ]);
    const [order] = await api().getOrders(DEVICE);
    expect(order).toMatchObject({ number: '10042', totalCents: 12795, status: 'shipped', itemCount: 2, title: 'T-Shirt', trackingUrl: 'https://track' });
  });
});
