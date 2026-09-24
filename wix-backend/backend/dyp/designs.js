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
  KEEP_DESIGNS_DAYS,
  SITE_TO_STYLE,
  STYLE_TO_SITE,
  cleanText,
  mediaUrl,
  problemFor,
  startFailureCode,
  summarizeLimits,
  toAppStatus,
} from 'backend/dyp/rules';
// The website's own generator: same limits, text check, photo check and art.
import { startPetDesign } from 'backend/aiDesign.web';

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

// Elevated on every call, never once at module load: the site found that
// elevating at load time can quietly return incomplete results.
const elevated = {
  generateFileUploadUrl: (...args) => auth.elevate(files.generateFileUploadUrl)(...args),
  getFileDescriptor: (...args) => auth.elevate(files.getFileDescriptor)(...args),
  searchFiles: (...args) => auth.elevate(files.searchFiles)(...args),
  bulkDeleteFiles: (...args) => auth.elevate(files.bulkDeleteFiles)(...args),
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

// Nightly: photos uploaded from the app that never became a design (the
// customer stopped before Generate, or was over a limit). They have no
// PetDesigns record, so the site's deleteOldUnorderedDesigns never sees them.
// Photos that did become designs are left to that clean-up. Permanent delete,
// not the trash, to match the privacy policy.
const APP_UPLOAD_NAME = /^dyp-[0-9a-f]{16}-/;
export async function deleteOldAppUploads(days = KEEP_DESIGNS_DAYS) {
  const before = Date.now() - days * DAY_MS;
  let cursor;
  let deleted = 0;
  for (let page = 0; page < 20; page++) {
    const res = await elevated.searchFiles({ search: 'dyp-', paging: { limit: 100, cursor } });
    const old = (res.files ?? []).filter(
      (f) => APP_UPLOAD_NAME.test(f.displayName ?? '') && f.url && new Date(f._createdDate).getTime() < before,
    );
    if (old.length) {
      const used = await wixData.query(COLLECTION).hasSome('originalPhotoUrl', old.map((f) => f.url)).limit(1000).find(DATA);
      const usedUrls = new Set(used.items.map((d) => d.originalPhotoUrl));
      const orphans = old.filter((f) => !usedUrls.has(f.url)).map((f) => f._id);
      if (orphans.length) {
        await elevated.bulkDeleteFiles(orphans, { permanent: true });
        deleted += orphans.length;
      }
    }
    cursor = res.nextCursor?.cursors?.next ?? (typeof res.nextCursor === 'string' ? res.nextCursor : null);
    if (!cursor) break;
  }
  return deleted;
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
    // Why it didn't come out (NO_PET, PHOTO_REJECTED, CHECKER_UNAVAILABLE,
    // DESIGN_FAILED), or null.
    problem: problemFor(status, item.status, item.moderationNote),
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
  const design = toApiDesign(item);
  if (design.problem === 'CHECKER_UNAVAILABLE') {
    // The checker being down isn't the customer's doing, and the app tells
    // them nothing was used up, so this attempt doesn't count toward the 12.
    await wixData.remove(COLLECTION, item._id, DATA).catch((err) => console.error('dyp: could not remove design', err));
  }
  return design;
}

export async function listDesigns(deviceId, now = Date.now()) {
  const items = await recentForDevice(deviceId, now - KEEP_DESIGNS_DAYS * DAY_MS);
  return items.filter((i) => GOOD_SITE_STATUSES.includes(i.status) && i.previewArtUrl).map((i) => toApiDesign(i, now));
}

// Designs this device may order: its own, and successful.
export async function orderableDesigns(deviceId, designIds) {
  const res = await wixData.query(COLLECTION).hasSome('_id', designIds).eq('visitorId', deviceId).limit(1000).find(DATA);
  const ok = res.items.filter((i) => GOOD_SITE_STATUSES.includes(i.status));
  if (ok.length !== designIds.length) throw new DypError('DESIGN_FAILED', 404, 'One of these designs is no longer available.');
  return ok;
}

// POST /designs. Hands over to the website's startPetDesign, which checks
// the limits and the text, creates the PetDesigns record and starts the
// generation in the background. The photo check happens inside that
// generation, so a photo with no pet or a refused photo shows up on the
// design (GET /design -> problem), not as an error here.
export async function createDesign(deviceId, { photoId, style, text }) {
  const styleChoice = STYLE_TO_SITE[style];
  if (!styleChoice) throw new DypError('DESIGN_FAILED', 400, 'Unknown style.');
  let customText;
  try {
    customText = cleanText(style, text);
  } catch (err) {
    throw new DypError('TEXT_REJECTED', 422, err.message);
  }

  // One design at a time (the app's rule; the website page enforces it by
  // disabling Generate). Checking the limits here as well gives the app the
  // unlock time, which startPetDesign doesn't return.
  const limits = await getLimits(deviceId);
  if (limits.blockedBy === 'in-progress') throw new DypError('DESIGN_IN_PROGRESS', 409);
  if (limits.blockedBy === 'designs') throw new DypError('LIMIT_REACHED', 429, null, new Date(limits.unlocksAt).toISOString());
  if (limits.blockedBy === 'tries') throw new DypError('TRIES_LIMIT', 429, null, new Date(limits.unlocksAt).toISOString());

  // The photo must exist before anything is used up.
  const photo = await resolvePhoto(deviceId, photoId);

  const result = await startPetDesign(photo.url, styleChoice, deviceId, customText);
  if (!result?.ok) {
    const code = startFailureCode(result?.step);
    console.warn(`dyp: startPetDesign refused (${result?.step}): ${result?.reason}`);
    const status = { TEXT_REJECTED: 422, CHECKER_UNAVAILABLE: 503, LIMIT_REACHED: 429, TRIES_LIMIT: 429, STUDIO_BUSY: 503 }[code] ?? 500;
    // The site's own wording for a refused name is fine to show; its limit
    // wording says "today", which the app never does, so the app uses its own.
    throw new DypError(code, status, code === 'TEXT_REJECTED' ? result.reason : null);
  }
  return { designId: result.designRecordId };
}

// The watermarked preview of a design, for the orders list.
export async function previewForDesign(designId) {
  const item = designId ? await wixData.get(COLLECTION, designId, DATA) : null;
  return item ? mediaUrl(item.previewArtUrl) : null;
}
