// HTTP functions for the Design Your Pet app.
// Endpoints: https://www.goodwookie.com/_functions/dyp/<endpoint>
// Contract: docs/backend-api.md in the app repository.
//
// If the site already has a backend/http-functions.js, add get_dyp, post_dyp
// and options_dyp to it instead of replacing the file.

import { response } from 'wix-http-functions';
import { isDeviceId } from 'backend/dyp/rules';
import { DypError, createDesign, createPhotoUpload, getDesign, getLimits, limitsBody, listDesigns } from 'backend/dyp/designs';
import { createAppCheckout, handleCheckoutReturn, listAppOrders } from 'backend/dyp/store';

const HEADERS = {
  'Content-Type': 'application/json',
  'Cache-Control': 'no-store',
  // Only matters for the app's web build; the phone apps don't use CORS.
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

function send(status, body) {
  return response({ status, headers: HEADERS, body: JSON.stringify(body) });
}

function fail(err) {
  if (err instanceof DypError) {
    const error = { code: err.code };
    if (err.message && err.message !== err.code) error.message = err.message;
    if (err.unlocksAt) error.unlocksAt = err.unlocksAt;
    return send(err.status, { error });
  }
  console.error('dyp: unexpected error', err);
  return send(500, { error: { code: 'NETWORK' } });
}

function requireDevice(deviceId) {
  if (!isDeviceId(deviceId)) throw new DypError('NETWORK', 400, 'Missing or bad deviceId.');
  return deviceId;
}

async function readJson(request) {
  try {
    return (await request.body.json()) ?? {};
  } catch {
    throw new DypError('NETWORK', 400, 'Body must be JSON.');
  }
}

export async function get_dyp(request) {
  const endpoint = request.path[0];
  const query = request.query ?? {};
  try {
    switch (endpoint) {
      case 'design':
        return send(200, await getDesign(requireDevice(query.deviceId), query.designId));
      case 'designs':
        return send(200, { designs: await listDesigns(requireDevice(query.deviceId)) });
      case 'limits':
        return send(200, limitsBody(await getLimits(requireDevice(query.deviceId))));
      case 'orders': {
        const ids = String(query.ids ?? '').split(',').filter(Boolean);
        return send(200, { orders: await listAppOrders(requireDevice(query.deviceId), ids) });
      }
      case 'return': {
        // Browser redirect from Wix checkout back into the app.
        const location = await handleCheckoutReturn(query).catch((err) => {
          console.error('dyp: checkout return failed', err);
          return 'designyourpet://confirmation';
        });
        return response({ status: 302, headers: { Location: location, 'Cache-Control': 'no-store' } });
      }
      default:
        return send(404, { error: { code: 'NETWORK', message: 'Unknown endpoint.' } });
    }
  } catch (err) {
    return fail(err);
  }
}

export async function post_dyp(request) {
  const endpoint = request.path[0];
  try {
    const body = await readJson(request);
    const deviceId = requireDevice(body.deviceId);
    switch (endpoint) {
      case 'photos':
        return send(200, await createPhotoUpload(deviceId, body.mimeType));
      case 'designs':
        return send(200, await createDesign(deviceId, { photoId: body.photoId, style: body.style, text: body.text }));
      case 'checkout':
        return send(200, await createAppCheckout(deviceId, body.lines, body.returnUrl));
      default:
        return send(404, { error: { code: 'NETWORK', message: 'Unknown endpoint.' } });
    }
  } catch (err) {
    return fail(err);
  }
}

export function options_dyp() {
  return response({ status: 204, headers: HEADERS });
}
