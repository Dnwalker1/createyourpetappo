// Design Your Pet app: the bridge to the website's own generator.
//
// The app must use the same photo checks, text checks and generator as
// goodwookie.com/design-your-pet. That code lives in the site's
// backend/aiDesign.web.js and backend/petDesigns.js, which aren't in this
// repository. Replace the three bodies below with calls to those functions.
// Until then every design stops with DESIGN_FAILED / CHECKER_UNAVAILABLE and
// nothing is generated.
//
// Example once wired (names are placeholders for the site's real exports):
//   import { moderateText, checkPetPhoto, startPetDesign } from 'backend/aiDesign.web';

export class NotWiredError extends Error {
  constructor(what) {
    super(`backend/dyp/site.js: ${what} is not connected to the site's code yet.`);
    this.name = 'NotWiredError';
  }
}

/**
 * Text check: profanity, protected names and titles.
 * @param {string} text  Already trimmed, 1–18 characters.
 * @returns {Promise<{ ok: true } | { ok: false, message?: string }>}
 */
export async function checkText(text) {
  void text;
  throw new NotWiredError('checkText');
}

/**
 * Photo check with Gemini: is there an animal, and is the photo acceptable.
 * @param {string} photoUrl  https URL of the uploaded photo.
 * @returns {Promise<{ result: 'ok' | 'no-pet' | 'rejected' | 'unavailable', message?: string }>}
 *   'rejected' carries the message shown to the customer, for example
 *   "It looks like there may be a child in it."
 *   'unavailable' means the checker is down; nothing is used up.
 */
export async function checkPhoto(photoUrl) {
  void photoUrl;
  return { result: 'unavailable', message: new NotWiredError('checkPhoto').message };
}

/**
 * Starts generation for a PetDesigns record that is already saved with
 * status "pending". Must return quickly: the app polls the record until the
 * site's generator sets status to ready / flagged / unclean / failed and fills
 * previewArtUrl (watermarked) and generatedArtUrl (print file).
 *
 * If the site's generator needs longer than an HTTP function may run, start it
 * the same way the website page does (for example a pending-queue job).
 * @param {object} design  The saved PetDesigns item.
 */
export async function startGeneration(design) {
  void design;
  throw new NotWiredError('startGeneration');
}
