// Design Your Pet app: photos, designs and limits.
// Reads and writes the site's PetDesigns collection, the same one the
// website's generator uses. The app's deviceId is stored as visitorId.

import wixData from 'wix-data';
import { files } from '@wix/media';
import { auth } from '@wix/essentials';
import crypto from 'crypto';
import {
  DAY_MS,
  GOOD_SITE_STATUSES,
  HOUR_MS,
  KEEP_DESIGNS_DAYS,
  SITE_DESIGNS_PER_HOUR,
  SITE_TO_STYLE,
  STYLE_TO_SITE,
  cleanText,
  mediaUrl,
  summarizeLimits,
  toAppStatus,
} from 'backend/dyp/rules';
import { checkPhoto, checkText, startGeneration } from 'backend/dyp/site';

export const COLLECTION = 'PetDesigns';
const DATA = { suppressAuth: true };
const UPLOAD_FOLDER = '/design-your-pet/app-uploads';
const PHOTO_TYPES = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/heic': 'heic', 'image/webp': 'webp' };

export class DypError extends Error {
  constructor(code, status, message, unlocksAt) {
    super(message ?? code);
    this.code = code;
    this.status = status;
    this.unlocksAt = unlocksAt ?? null;
  }
}

const elevated = {
  generateFileUploadUrl: auth.elevate(files.generateFileUploadUrl),
  getFileDescriptor: auth.elevate(files.getFileDescriptor),
  bulkDeleteFiles: auth.elevate(files.bulkDeleteFiles),
};

const createdMs = (item) => new Date(item._createdDate).getTime();

// Uploaded file names start with a hash of the device, so a design can only
// use a photo uploaded from the same device.
function photoPrefix(deviceId) {
  return `dyp-${crypto.createHash('sha256').update(deviceId).digest('hex').slice(0, 16)}-`;
}

// ---------------------------------------------------------------------------
// Photos

// Step 1 of the upload: a one-time URL the phone PUTs the photo to. HTTP
// functions only accept 512 KB bodies, so the photo goes straight to the
// Media Manager. Creates no design record and uses nothing.
export async function createPhotoUpload(deviceId, mimeType) {
  const ext = PHOTO_TYPES[mimeType];
  if (!ext) throw new DypError('UPLOAD_FAILED', 400, 'Use a JPEG, PNG, HEIC or WebP photo.');
  const fileName = `${photoPrefix(deviceId)}${crypto.randomUUID()}.${ext}`;
  try {
    const { uploadUrl } = await elevated.generateFileUploadUrl(mimeType, { fileName, filePath: UPLOAD_FOLDER });
    return { uploadUrl, fileName };
  } catch (err) {
    console.error('dyp: generateFileUploadUrl failed', err);
    throw new DypError('UPLOAD_FAILED', 500);
  }
}

// Finds an uploaded photo by the file id the upload returned, checks it came
// from this device, and waits briefly for Wix to finish processing it.
async function resolvePhoto(deviceId, photoId) {
  if (typeof photoId !== 'string' || !photoId || photoId.length > 200) throw new DypError('UPLOAD_FAILED', 400, 'Missing photo.');
  for (let attempt = 0; attempt < 6; attempt++) {
    let file;
    try {
      file = await elevated.getFileDescriptor(photoId);
    } catch {
      throw new DypError('UPLOAD_FAILED', 400, 'Photo not found.');
    }
    if (!String(file.displayName ?? '').startsWith(photoPrefix(deviceId))) throw new DypError('UPLOAD_FAILED', 400, 'Photo not found.');
    if (file.operationStatus === 'FAILED') throw new DypError('UPLOAD_FAILED', 400, 'The photo could not be read.');
    if (file.operationStatus === 'READY' && file.url) return { id: file._id ?? photoId, url: file.url };
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new DypError('UPLOAD_FAILED', 500, 'The photo is still processing. Try again.');
}

async function deletePhoto(fileIdOrUrl) {
  try {
    await elevated.bulkDeleteFiles([fileIdOrUrl], { permanent: true });
  } catch (err) {
    console.error('dyp: could not delete photo', err);
  }
}

// ---------------------------------------------------------------------------
// Designs

export function toApiDesign(item, now = Date.now()) {
  const created = createdMs(item);
  const status = toAppStatus(item.status, created, now);
  const good = ['ready', 'flagged', 'ordered'].includes(status);
  return {
    id: item._id,
    style: SITE_TO_STYLE[item.styleChoice] ?? 'stamp',
    text: item.customText || null,
    status,
    createdAt: new Date(created).toISOString(),
    // Only the watermarked preview. generatedArtUrl (the print file) never leaves the server.
    previewUrl: good ? mediaUrl(item.previewArtUrl) : null,
  };
}

async function recentForDevice(deviceId, since) {
  const res = await wixData
    .query(COLLECTION)
    .eq('visitorId', deviceId)
    .gt('_createdDate', new Date(since))
    .descending('_createdDate')
    .limit(1000)
    .find(DATA);
  return res.items;
}

export async function getLimits(deviceId, now = Date.now()) {
  const items = await recentForDevice(deviceId, now - DAY_MS);
  return summarizeLimits(
    items.map((i) => ({ createdAt: createdMs(i), status: toAppStatus(i.status, createdMs(i), now) })),
    now,
  );
}

export function limitsBody(summary) {
  const iso = (ms) => (ms ? new Date(ms).toISOString() : null);
  return {
    available: summary.available,
    nextDesignAt: iso(summary.nextDesignAt),
    blockedBy: summary.blockedBy,
    unlocksAt: iso(summary.unlocksAt),
  };
}

export async function getDesign(deviceId, designId) {
  const item = typeof designId === 'string' && designId ? await wixData.get(COLLECTION, designId, DATA) : null;
  if (!item || item.visitorId !== deviceId) throw new DypError('DESIGN_FAILED', 404, 'Design not found.');
  return toApiDesign(item);
}

export async function listDesigns(deviceId, now = Date.now()) {
  const items = await recentForDevice(deviceId, now - KEEP_DESIGNS_DAYS * DAY_MS);
  return items.filter((i) => GOOD_SITE_STATUSES.includes(i.status)).map((i) => toApiDesign(i, now));
}

// Designs this device may order: its own, and successful.
export async function orderableDesigns(deviceId, designIds) {
  const res = await wixData.query(COLLECTION).hasSome('_id', designIds).eq('visitorId', deviceId).limit(1000).find(DATA);
  const ok = res.items.filter((i) => GOOD_SITE_STATUSES.includes(i.status));
  if (ok.length !== designIds.length) throw new DypError('DESIGN_FAILED', 404, 'One of these designs is no longer available.');
  return ok;
}

// POST /designs. Order of steps is in docs/backend-api.md.
export async function createDesign(deviceId, { photoId, style, text }) {
  const styleChoice = STYLE_TO_SITE[style];
  if (!styleChoice) throw new DypError('DESIGN_FAILED', 400, 'Unknown style.');
  let customText;
  try {
    customText = cleanText(style, text);
  } catch (err) {
    throw new DypError('TEXT_REJECTED', 422, err.message);
  }

  // 1–2. One design at a time, then the device limits, then the site ceiling.
  const now = Date.now();
  const limits = await getLimits(deviceId, now);
  if (limits.blockedBy === 'in-progress') throw new DypError('DESIGN_IN_PROGRESS', 409);
  if (limits.blockedBy === 'designs') throw new DypError('LIMIT_REACHED', 429, null, new Date(limits.unlocksAt).toISOString());
  if (limits.blockedBy === 'tries') throw new DypError('TRIES_LIMIT', 429, null, new Date(limits.unlocksAt).toISOString());
  const lastHour = await wixData.query(COLLECTION).gt('_createdDate', new Date(now - HOUR_MS)).count(DATA);
  if (lastHour >= SITE_DESIGNS_PER_HOUR) throw new DypError('STUDIO_BUSY', 503);

  // The photo must exist before anything is used up.
  const photo = await resolvePhoto(deviceId, photoId);

  // 3. The record. From here on this counts toward the 12 tries.
  const design = await wixData.insert(
    COLLECTION,
    {
      title: 'Design Your Pet app',
      visitorId: deviceId,
      styleChoice,
      customText,
      originalPhotoUrl: photo.url,
      status: 'pending',
    },
    DATA,
  );
  const finish = (fields) => wixData.update(COLLECTION, { ...design, ...fields }, DATA);

  // 4. Text, then photo.
  if (customText) {
    const verdict = await checkText(customText).catch((err) => {
      console.error('dyp: text check failed', err);
      return null;
    });
    if (!verdict) {
      await wixData.remove(COLLECTION, design._id, DATA);
      throw new DypError('CHECKER_UNAVAILABLE', 503);
    }
    if (!verdict.ok) {
      await finish({ status: 'blocked', moderationNote: `Text: ${verdict.message ?? 'not allowed'}` });
      throw new DypError('TEXT_REJECTED', 422, verdict.message);
    }
  }

  const check = await checkPhoto(photo.url).catch((err) => {
    console.error('dyp: photo check failed', err);
    return { result: 'unavailable' };
  });
  if (check.result === 'unavailable') {
    // Uses nothing: take the record back out.
    await wixData.remove(COLLECTION, design._id, DATA);
    throw new DypError('CHECKER_UNAVAILABLE', 503);
  }
  if (check.result === 'no-pet' || check.result === 'rejected') {
    await deletePhoto(photo.id);
    await finish({ status: 'blocked', originalPhotoUrl: '', moderationNote: check.result === 'no-pet' ? 'No animal in the photo.' : check.message ?? 'Photo rejected.' });
    if (check.result === 'no-pet') throw new DypError('NO_PET', 422);
    throw new DypError('PHOTO_REJECTED', 422, check.message);
  }

  // 5. Generate. The app polls GET /design.
  try {
    await startGeneration(design);
  } catch (err) {
    console.error('dyp: startGeneration failed', err);
    await finish({ status: 'failed', moderationNote: String(err?.message ?? err) });
    throw new DypError('DESIGN_FAILED', 500);
  }
  return { designId: design._id };
}

// Marks designs as ordered, the way the website links a design to its order.
export async function markOrdered(deviceId, designIds, orderId) {
  if (!designIds.length) return;
  const res = await wixData.query(COLLECTION).hasSome('_id', designIds).eq('visitorId', deviceId).limit(1000).find(DATA);
  for (const item of res.items) {
    if (item.orderId === orderId && item.status === 'ordered') continue;
    await wixData.update(COLLECTION, { ...item, orderId, status: 'ordered' }, DATA);
  }
}

// The watermarked preview of the first design linked to an order.
export async function previewForOrder(orderId) {
  const res = await wixData.query(COLLECTION).eq('orderId', orderId).limit(1).find(DATA);
  return res.items.length ? mediaUrl(res.items[0].previewArtUrl) : null;
}

export async function deviceOwnsOrder(deviceId, orderId) {
  const n = await wixData.query(COLLECTION).eq('orderId', orderId).eq('visitorId', deviceId).count(DATA);
  return n > 0;
}
