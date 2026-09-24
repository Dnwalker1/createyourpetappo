import type { ImageSourcePropType } from 'react-native';
import type { ProductChoice, StyleId } from '../data/catalog';
import type { DesignStatus, LimitBlock } from '../lib/limits';

// The contract between the app and the Goodwookie website backend.
// Endpoint details for the Wix side: docs/backend-api.md.

export type ErrorCode =
  | 'UPLOAD_FAILED'
  | 'CHECKER_UNAVAILABLE'
  | 'NO_PET'
  | 'PHOTO_REJECTED'
  | 'TEXT_REJECTED'
  | 'DESIGN_FAILED'
  | 'LIMIT_REACHED'
  | 'TRIES_LIMIT'
  | 'STUDIO_BUSY'
  | 'DESIGN_IN_PROGRESS'
  | 'NETWORK';

export class ApiError extends Error {
  code: ErrorCode;
  /** When a limit error unlocks, in ms since epoch. */
  unlocksAt?: number;

  constructor(code: ErrorCode, message?: string, unlocksAt?: number) {
    super(message ?? code);
    this.name = 'ApiError';
    this.code = code;
    this.unlocksAt = unlocksAt;
  }
}

export type Design = {
  id: string;
  styleId: StyleId;
  text?: string;
  status: DesignStatus;
  /** Why a failed or rejected design didn't come out: NO_PET, PHOTO_REJECTED, CHECKER_UNAVAILABLE or DESIGN_FAILED. */
  problem?: ErrorCode;
  createdAt: number;
  /** Watermarked preview. The print-quality file never reaches the app. */
  preview: ImageSourcePropType | null;
};

export type Limits = {
  available: number;
  nextDesignAt: number | null;
  blockedBy: LimitBlock | null;
  unlocksAt: number | null;
};

export type PhotoInput = { uri: string; mimeType?: string; fileName?: string };

export type CheckoutLine =
  | { kind: 'single'; designId: string; choice: ProductChoice; quantity: number }
  | { kind: 'bundle'; designId: string; choices: ProductChoice[] };

export type OrderStatus = 'in-review' | 'printing' | 'shipped' | 'delivered';

export type Order = {
  id: string;
  /** The Wix order number, shown as "Order #10042". */
  number: string;
  createdAt: number;
  status: OrderStatus;
  title: string;
  itemCount: number;
  totalCents: number;
  trackingUrl?: string;
  preview?: ImageSourcePropType | null;
};

export interface DesignYourPetApi {
  /** Uploads the photo. Throws UPLOAD_FAILED; creates no design record. */
  uploadPhoto(deviceId: string, photo: PhotoInput): Promise<{ photoId: string }>;
  /**
   * Starts a design. The backend creates the record, checks the photo and text,
   * then generates. Throws NO_PET, PHOTO_REJECTED, TEXT_REJECTED,
   * CHECKER_UNAVAILABLE, LIMIT_REACHED, TRIES_LIMIT, STUDIO_BUSY or
   * DESIGN_IN_PROGRESS.
   */
  createDesign(deviceId: string, input: { photoId: string; styleId: StyleId; text?: string }): Promise<{ designId: string }>;
  getDesign(deviceId: string, designId: string): Promise<Design>;
  /** Designs from the last 7 days, newest first. */
  listDesigns(deviceId: string): Promise<Design[]>;
  getLimits(deviceId: string): Promise<Limits>;
  /** Builds a Wix checkout for the cart. The app opens the URL; Wix takes payment. */
  createCheckout(deviceId: string, lines: CheckoutLine[], returnUrl: string): Promise<{ checkoutUrl: string }>;
  getOrders(deviceId: string, orderIds: string[]): Promise<Order[]>;
}
