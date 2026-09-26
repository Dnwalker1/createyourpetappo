import { STYLES, StyleId } from '../data/catalog';
import { DAY_MS, DesignRecord, MAX_GOOD_DESIGNS, summarizeLimits } from '../lib/limits';
import { ApiError, CheckoutLine, Design, DesignYourPetApi, Limits, Order } from './types';

// An in-memory backend that follows the same rules as the website, so the app
// can be run and tested before the Wix endpoints exist. Not for production.

const GENERATION_MS = 4000;
const RETENTION_MS = 7 * DAY_MS;
const BLOCKED_TEXT = [/skywalker/i, /\bdisney\b/i, /\bmickey\b/i];

type MockDesign = DesignRecord & { styleId: StyleId; text?: string; readyAt: number };

export const MOCK_CHECKOUT_URL = 'mock://checkout';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export function createMockApi(now: () => number = Date.now): DesignYourPetApi {
  const designs = new Map<string, MockDesign>();
  const photos = new Set<string>();
  const orders = new Map<string, Order>();
  const checkouts = new Map<string, Order>();
  let counter = 0;
  let orderNumber = 10041;

  const settle = (d: MockDesign) => {
    if (d.status === 'processing' && now() >= d.readyAt) d.status = 'ready';
    return d;
  };
  const records = () => [...designs.values()].map(settle);
  const toDesign = (d: MockDesign): Design => ({
    id: d.id,
    styleId: d.styleId,
    text: d.text,
    status: d.status,
    createdAt: d.createdAt,
    preview: d.status === 'processing' || d.status === 'failed' ? null : STYLES.find((s) => s.id === d.styleId)!.sample,
  });

  return {
    async uploadPhoto(_deviceId, photo) {
      await wait(400);
      if (!photo.uri) throw new ApiError('UPLOAD_FAILED');
      const photoId = `photo-${++counter}`;
      photos.add(photoId);
      return { photoId };
    },

    async createDesign(_deviceId, input) {
      await wait(300);
      if (!photos.has(input.photoId)) throw new ApiError('UPLOAD_FAILED');
      if (input.text && BLOCKED_TEXT.some((re) => re.test(input.text!))) {
        throw new ApiError('TEXT_REJECTED', "That text can't be printed. It looks like a protected name or title.");
      }
      const summary = summarizeLimits(records(), now());
      if (summary.blockedBy === 'in-progress') throw new ApiError('DESIGN_IN_PROGRESS');
      if (summary.blockedBy === 'designs') throw new ApiError('LIMIT_REACHED', undefined, summary.unlocksAt ?? undefined);
      if (summary.blockedBy === 'tries') throw new ApiError('TRIES_LIMIT', undefined, summary.unlocksAt ?? undefined);
      const id = `design-${++counter}`;
      const created = now();
      designs.set(id, { id, createdAt: created, status: 'processing', styleId: input.styleId, text: input.text, readyAt: created + GENERATION_MS });
      return { designId: id };
    },

    async getDesign(_deviceId, designId) {
      const d = designs.get(designId);
      if (!d) throw new ApiError('DESIGN_FAILED');
      return toDesign(settle(d));
    },

    async listDesigns() {
      const cutoff = now() - RETENTION_MS;
      return records()
        .filter((d) => d.createdAt > cutoff && d.status !== 'failed' && d.status !== 'rejected' && d.status !== 'processing')
        .sort((a, b) => b.createdAt - a.createdAt)
        .map((d) => toDesign(d as MockDesign));
    },

    async getLimits(): Promise<Limits> {
      const s = summarizeLimits(records(), now());
      return { available: s.available, limit: MAX_GOOD_DESIGNS, nextDesignAt: s.nextDesignAt, blockedBy: s.blockedBy, unlocksAt: s.unlocksAt };
    },

    async createCheckout(_deviceId, lines: CheckoutLine[]) {
      await wait(300);
      const id = `checkout-${++counter}`;
      const itemCount = lines.reduce((n, l) => n + (l.kind === 'bundle' ? 4 : l.quantity), 0);
      const first = lines[0] && designs.get(lines[0].designId);
      checkouts.set(id, {
        id,
        number: String(++orderNumber),
        createdAt: now(),
        status: 'in-review',
        title: lines.some((l) => l.kind === 'bundle') ? 'Buy them all bundle' : 'Design Your Pet order',
        itemCount,
        totalCents: 0,
        preview: first ? toDesign(first).preview : null,
        items: lines.map((l) =>
          l.kind === 'bundle'
            ? { title: 'Buy them all bundle', detail: 'Tee, hoodie, sticker and poster', quantity: 1 }
            : { title: l.choice.product, detail: l.choice.size, quantity: l.quantity },
        ),
      });
      for (const l of lines) {
        const d = designs.get(l.designId);
        if (d) d.status = 'ordered';
      }
      // A real checkout URL is a Wix page; the mock's is paid straight away.
      return { checkoutId: id, checkoutUrl: MOCK_CHECKOUT_URL };
    },

    async getCheckoutStatus(_deviceId, checkoutId) {
      const order = checkouts.get(checkoutId);
      if (order) orders.set(order.id, order);
      return { completed: Boolean(order), orderNumber: order?.number ?? null };
    },

    async getOrders() {
      return [...orders.values()].sort((a, b) => b.createdAt - a.createdAt);
    },
  };
}
