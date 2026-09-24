import { ApiError, CheckoutLine, Design, DesignYourPetApi, ErrorCode, Limits, Order } from './types';

// Talks to the Wix http-functions described in docs/backend-api.md.

type Json = Record<string, unknown>;

const KNOWN_CODES: ErrorCode[] = [
  'UPLOAD_FAILED', 'CHECKER_UNAVAILABLE', 'NO_PET', 'PHOTO_REJECTED', 'TEXT_REJECTED', 'DESIGN_FAILED',
  'LIMIT_REACHED', 'TRIES_LIMIT', 'STUDIO_BUSY', 'DESIGN_IN_PROGRESS', 'NETWORK',
];

function toDesign(d: Json): Design {
  return {
    id: String(d.id),
    styleId: d.style as Design['styleId'],
    text: (d.text as string | undefined) ?? undefined,
    status: d.status as Design['status'],
    createdAt: Date.parse(String(d.createdAt)),
    preview: d.previewUrl ? { uri: String(d.previewUrl) } : null,
  };
}

function toOrder(o: Json): Order {
  return {
    id: String(o.id),
    number: String(o.number),
    createdAt: Date.parse(String(o.createdAt)),
    status: o.status as Order['status'],
    title: String(o.title),
    itemCount: Number(o.itemCount),
    totalCents: Number(o.totalCents),
    trackingUrl: (o.trackingUrl as string | undefined) ?? undefined,
    preview: o.previewUrl ? { uri: String(o.previewUrl) } : null,
  };
}

export function createHttpApi(baseUrl: string): DesignYourPetApi {
  const root = `${baseUrl.replace(/\/$/, '')}/_functions/dyp`;

  async function call(path: string, init?: RequestInit, fallback: ErrorCode = 'NETWORK'): Promise<Json> {
    let res: Response;
    try {
      res = await fetch(`${root}${path}`, init);
    } catch {
      throw new ApiError(fallback);
    }
    const body = (await res.json().catch(() => ({}))) as Json;
    if (!res.ok) {
      const err = (body.error ?? {}) as Json;
      const code = KNOWN_CODES.includes(err.code as ErrorCode) ? (err.code as ErrorCode) : fallback;
      const unlocksAt = err.unlocksAt ? Date.parse(String(err.unlocksAt)) : undefined;
      throw new ApiError(code, err.message as string | undefined, unlocksAt);
    }
    return body;
  }

  const json = (body: unknown): RequestInit => ({
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const q = (params: Record<string, string>) => `?${new URLSearchParams(params).toString()}`;

  return {
    // Two steps, because Wix HTTP functions only take 512 KB: the backend hands
    // out a one-time upload URL, and the photo goes straight to Wix Media.
    async uploadPhoto(deviceId, photo) {
      const mimeType = photo.mimeType ?? 'image/jpeg';
      const { uploadUrl, fileName } = await call('/photos', json({ deviceId, mimeType }), 'UPLOAD_FAILED');
      try {
        const blob = await (await fetch(photo.uri)).blob();
        const res = await fetch(`${String(uploadUrl)}?filename=${encodeURIComponent(String(fileName))}`, {
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
      const body = await call('/designs', json({ deviceId, photoId: input.photoId, style: input.styleId, text: input.text ?? '' }));
      return { designId: String(body.designId) };
    },

    async getDesign(deviceId, designId) {
      return toDesign(await call(`/design${q({ deviceId, designId })}`));
    },

    async listDesigns(deviceId) {
      const body = await call(`/designs${q({ deviceId })}`);
      return ((body.designs as Json[]) ?? []).map(toDesign);
    },

    async getLimits(deviceId): Promise<Limits> {
      const b = await call(`/limits${q({ deviceId })}`);
      const time = (v: unknown) => (v ? Date.parse(String(v)) : null);
      return {
        available: Number(b.available),
        nextDesignAt: time(b.nextDesignAt),
        blockedBy: (b.blockedBy as Limits['blockedBy']) ?? null,
        unlocksAt: time(b.unlocksAt),
      };
    },

    async createCheckout(deviceId, lines: CheckoutLine[], returnUrl) {
      const body = await call('/checkout', json({ deviceId, lines, returnUrl }));
      return { checkoutUrl: String(body.checkoutUrl) };
    },

    async getOrders(deviceId, orderIds) {
      if (!orderIds.length) return [];
      const body = await call(`/orders${q({ deviceId, ids: orderIds.join(',') })}`);
      return ((body.orders as Json[]) ?? []).map(toOrder);
    },
  };
}
