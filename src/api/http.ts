import type { ProductChoice } from '../data/catalog';
import { ApiError, CheckoutLine, Design, DesignYourPetApi, ErrorCode, Limits, Order, OrderStatus } from './types';

// Talks to the goodwookie.com Wix backend (https://www.goodwookie.com/_functions).
// Contract: docs/backend-api.md. Handled outcomes come back as HTTP 200 with
// { ok: true, ... } or { ok: false, code, message }.

type Json = Record<string, unknown>;

// Backend error code -> the app's error code (and so its problem screen).
const CODE_MAP: Record<string, ErrorCode> = {
  limit_designs: 'LIMIT_REACHED',
  limit_tries: 'TRIES_LIMIT',
  studio_busy: 'STUDIO_BUSY',
  one_at_a_time: 'DESIGN_IN_PROGRESS',
  text_rejected: 'TEXT_REJECTED',
  text_checker_down: 'TEXT_CHECKER_DOWN',
  bad_photo: 'UPLOAD_FAILED',
  bad_photo_type: 'UPLOAD_FAILED',
  upload_unavailable: 'UPLOAD_FAILED',
  upload_not_ready: 'UPLOAD_FAILED',
  design_unavailable: 'CART_ITEM_UNAVAILABLE',
  bad_choice: 'CART_ITEM_UNAVAILABLE',
  bad_product: 'CART_ITEM_UNAVAILABLE',
};

// Design status -> the app's status, plus the problem screen for the ones that
// didn't come out. None of these count toward the 5; all count toward the 12.
const STATUS_MAP: Record<string, { status: Design['status']; problem?: ErrorCode }> = {
  working: { status: 'processing' },
  ready: { status: 'ready' },
  ordered: { status: 'ordered' },
  no_pet: { status: 'rejected', problem: 'NO_PET' },
  photo_rejected: { status: 'rejected', problem: 'PHOTO_REJECTED' },
  checker_down: { status: 'failed', problem: 'CHECKER_UNAVAILABLE' },
  failed: { status: 'failed', problem: 'DESIGN_FAILED' },
};

const time = (v: unknown) => (v ? Date.parse(String(v)) : null);
const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The backend's size names. Only posters differ: "12×12" with a multiplication sign.
function backendSize(choice: ProductChoice): string {
  return choice.product === 'poster' ? choice.size.replace('x', '×') : choice.size;
}

function toDesign(d: Json): Design {
  const mapped = STATUS_MAP[String(d.status ?? 'ready')] ?? { status: 'failed', problem: 'DESIGN_FAILED' };
  return {
    id: String(d.designId),
    styleId: d.style as Design['styleId'],
    text: (d.text as string | undefined) || undefined,
    status: mapped.status,
    problem: mapped.problem,
    createdAt: time(d.createdAt) ?? Date.now(),
    preview: d.previewUrl ? { uri: String(d.previewUrl) } : null,
  };
}

function toLimits(allowance: Json | undefined, inProgressDesignId: unknown): Limits {
  const a = allowance ?? {};
  const designsLeft = Number(a.designsLeft ?? 0);
  const triesLeft = Number(a.triesLeft ?? 0);
  let blockedBy: Limits['blockedBy'] = null;
  let unlocksAt: number | null = null;
  if (inProgressDesignId) {
    blockedBy = 'in-progress';
  } else if (designsLeft <= 0) {
    blockedBy = 'designs';
    unlocksAt = time(a.designUnlockAt);
  } else if (triesLeft <= 0) {
    blockedBy = 'tries';
    unlocksAt = time(a.tryUnlockAt);
  }
  return { available: designsLeft, nextDesignAt: time(a.designUnlockAt), blockedBy, unlocksAt };
}

// Order stage names aren't fixed in the contract, so match on the word.
function toOrderStatus(stage: unknown): OrderStatus {
  const s = String(stage ?? '').toLowerCase();
  if (s.includes('deliver')) return 'delivered';
  if (s.includes('ship')) return 'shipped';
  if (s.includes('print') || s.includes('production')) return 'printing';
  return 'in-review';
}

function toOrder(o: Json): Order {
  const items = (o.items as Json[] | undefined) ?? [];
  const designIds = new Set(items.map((i) => i.previewUrl));
  const title =
    items.length === 4 && designIds.size === 1
      ? 'Buy them all bundle'
      : items.length > 1
        ? `${items[0].title} and ${items.length - 1} more`
        : String(items[0]?.title ?? 'Your order');
  const firstPreview = items.find((i) => i.previewUrl)?.previewUrl;
  return {
    id: String(o.orderNumber),
    number: String(o.orderNumber),
    createdAt: time(o.placedAt) ?? Date.now(),
    status: toOrderStatus(o.stage),
    title,
    itemCount: items.reduce((n, i) => n + Number(i.quantity ?? 1), 0),
    totalCents: Math.round(Number(o.total ?? 0) * 100),
    trackingUrl: (o.trackingUrl as string | undefined) || undefined,
    preview: firstPreview ? { uri: String(firstPreview) } : null,
  };
}

export function createHttpApi(baseUrl: string, appKey?: string): DesignYourPetApi {
  const root = `${baseUrl.replace(/\/$/, '')}/_functions`;

  async function call(deviceId: string, path: string, init: RequestInit = {}, fallback: ErrorCode = 'NETWORK'): Promise<Json> {
    const headers: Record<string, string> = { 'X-Device-Id': deviceId, ...(init.headers as Record<string, string>) };
    if (appKey) headers['X-App-Key'] = appKey;
    let res: Response;
    try {
      res = await fetch(`${root}${path}`, { ...init, headers });
    } catch {
      throw new ApiError(fallback);
    }
    const body = (await res.json().catch(() => ({}))) as Json;
    if (!res.ok || body.ok !== true) {
      const code = CODE_MAP[String(body.code)] ?? fallback;
      const error = new ApiError(code, body.message as string | undefined, time(body.unlockAt) ?? undefined);
      error.backendCode = body.code as string | undefined;
      error.details = body;
      throw error;
    }
    return body;
  }

  const post = (body: unknown): RequestInit => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  return {
    // Three steps, because Wix HTTP functions only take 512 KB: an upload URL
    // (limits are checked here first), the photo straight to Wix Media, and
    // the file id back for POST /designs.
    async uploadPhoto(deviceId, photo) {
      const mimeType = photo.mimeType ?? 'image/jpeg';
      const { uploadUrl } = await call(deviceId, '/uploadUrl', post({ mimeType }), 'UPLOAD_FAILED');
      try {
        const blob = await (await fetch(photo.uri)).blob();
        const ext = mimeType.split('/')[1] ?? 'jpg';
        const res = await fetch(`${String(uploadUrl)}?filename=pet.${ext}`, {
          method: 'PUT',
          headers: { 'Content-Type': mimeType },
          body: blob,
        });
        if (!res.ok) throw new Error(`Upload ${res.status}`);
        const file = ((await res.json()) as { file?: { id?: string } }).file;
        if (!file?.id) throw new Error('No file id');
        return { photoId: file.id };
      } catch {
        throw new ApiError('UPLOAD_FAILED');
      }
    },

    async createDesign(deviceId, input) {
      const body = { fileId: input.photoId, style: input.styleId, ...(input.text ? { text: input.text } : {}) };
      // Wix may still be processing the photo: wait and ask again. Uses nothing.
      for (let attempt = 0; ; attempt++) {
        try {
          const res = await call(deviceId, '/designs', post(body));
          return { designId: String(res.designId) };
        } catch (e) {
          if (!(e instanceof ApiError)) throw e;
          const details = e.details ?? {};
          if (e.backendCode === 'upload_not_ready' && attempt < 15) {
            await wait(Number(details.retryAfterMs ?? 2000));
            continue;
          }
          // A design is already being made: carry on with that one.
          if (e.backendCode === 'one_at_a_time' && details.designId) return { designId: String(details.designId) };
          throw e;
        }
      }
    },

    async getDesign(deviceId, designId) {
      return toDesign(await call(deviceId, `/designs/${encodeURIComponent(designId)}`));
    },

    async listDesigns(deviceId) {
      const body = await call(deviceId, '/designs');
      return ((body.designs as Json[]) ?? []).map(toDesign);
    },

    async getLimits(deviceId) {
      const body = await call(deviceId, '/designs');
      return toLimits(body.allowance as Json | undefined, body.inProgressDesignId);
    },

    async createCheckout(deviceId, lines: CheckoutLine[]) {
      const items = lines.flatMap((line) =>
        (line.kind === 'bundle' ? line.choices.map((choice) => ({ choice, quantity: 1 })) : [{ choice: line.choice, quantity: line.quantity }]).map(
          ({ choice, quantity }) => ({
            designId: line.designId,
            productKey: choice.product,
            ...('color' in choice ? { color: choice.color } : {}),
            size: backendSize(choice),
            quantity,
          }),
        ),
      );
      const body = await call(deviceId, '/checkout', post({ items }));
      return { checkoutId: String(body.checkoutId), checkoutUrl: String(body.checkoutUrl) };
    },

    async getCheckoutStatus(deviceId, checkoutId) {
      const body = await call(deviceId, `/checkout/${encodeURIComponent(checkoutId)}`);
      return { completed: body.completed === true, orderNumber: body.orderNumber ? String(body.orderNumber) : null };
    },

    async getOrders(deviceId) {
      const body = await call(deviceId, '/orders');
      return ((body.orders as Json[]) ?? []).map(toOrder);
    },
  };
}
