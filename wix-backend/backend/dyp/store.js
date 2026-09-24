// Design Your Pet app: checkout and orders through Wix eCommerce.
// The app never takes payment. It gets a Wix checkout for the same store
// products the website sells, the customer pays on the site's secure
// checkout, and Wix sends them back to the app.

import { checkout, orders, orderFulfillments } from '@wix/ecom';
import { productsV3 } from '@wix/stores';
import { redirects } from '@wix/redirects';
import { auth } from '@wix/essentials';
import { fetch } from 'wix-fetch';
import { PRINTFUL_BASE, printfulHeaders } from 'backend/printfulShared';
import {
  DAY_MS,
  FIELD_DESIGNS,
  FIELD_DEVICE,
  FIELD_LINES,
  conflictingLines,
  designForLine,
  encodeLines,
  PRODUCT_IDS,
  STORES_APP_ID,
  findApparelVariantId,
  isAllowedReturnUrl,
  orderStatusFromPrintful,
  orderTitle,
  printfulExternalId,
  parseCheckoutLines,
  readCustomField,
  toAppOrderStatus,
  toCents,
  withQuery,
} from 'backend/dyp/rules';
import { DypError, orderableDesigns, previewForDesign } from 'backend/dyp/designs';

export const SITE_URL = 'https://www.goodwookie.com';
const RETURN_FUNCTION = `${SITE_URL}/_functions/dyp/return`;
const MAX_ORDER_LOOKUPS = 20;

// Elevated on every call, never once at module load: the site found that
// elevating at load time can quietly return incomplete results.
const elevated = {
  getProduct: (...args) => auth.elevate(productsV3.getProduct)(...args),
  createCheckout: (...args) => auth.elevate(checkout.createCheckout)(...args),
  getCheckout: (...args) => auth.elevate(checkout.getCheckout)(...args),
  createRedirectSession: (...args) => auth.elevate(redirects.createRedirectSession)(...args),
  getOrder: (...args) => auth.elevate(orders.getOrder)(...args),
  searchOrders: (...args) => auth.elevate(orders.searchOrders)(...args),
  listFulfillments: (...args) => auth.elevate(orderFulfillments.listFulfillmentsForSingleOrder)(...args),
};

// Tee and hoodie have one variant per colour and size (54 and 30 of them), so
// they're looked up by name on the live product rather than hard-coded.
const productCache = new Map();
async function apparelProduct(key) {
  const cached = productCache.get(key);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) return cached.product;
  const res = await elevated.getProduct(PRODUCT_IDS[key]);
  const product = res.product ?? res;
  productCache.set(key, { at: Date.now(), product });
  return product;
}

async function variantIdFor(choice) {
  if (choice.variantId) return choice.variantId;
  const id = findApparelVariantId(await apparelProduct(choice.product), choice.color, choice.size);
  if (!id) throw new DypError('DESIGN_FAILED', 400, `${choice.color} ${choice.size} isn't available.`);
  return id;
}

// POST /checkout -> { checkoutUrl }
export async function createAppCheckout(deviceId, lines, returnUrl) {
  if (!isAllowedReturnUrl(returnUrl)) throw new DypError('NETWORK', 400, 'Bad return URL.');
  let parsed;
  try {
    parsed = parseCheckoutLines(lines);
  } catch (err) {
    throw new DypError('NETWORK', 400, err.message);
  }
  await orderableDesigns(deviceId, parsed.designIds);

  const entries = [];
  for (const item of parsed.items) {
    entries.push({ ...item, productId: PRODUCT_IDS[item.choice.product], variantId: await variantIdFor(item.choice) });
  }
  if (conflictingLines(entries)) {
    throw new DypError('CART_CONFLICT', 409, 'Two different designs on the same product, colour and size need separate orders.');
  }
  const lineItems = entries.map((e) => ({
    quantity: e.quantity,
    catalogReference: { appId: STORES_APP_ID, catalogItemId: e.productId, options: { variantId: e.variantId } },
  }));

  const created = await elevated.createCheckout({
    lineItems,
    channelType: 'WEB',
    checkoutInfo: {
      // These tie the order back to the phone and say which design goes on
      // which line (see appDesignForLineItem). They also show on the order in
      // the dashboard.
      customFields: [
        { title: FIELD_DEVICE, value: deviceId },
        { title: FIELD_DESIGNS, value: parsed.designIds.join(',') },
        { title: FIELD_LINES, value: encodeLines(entries) },
      ],
    },
  });
  const checkoutId = created._id ?? created.checkout?._id;

  const back = (result) => withQuery(RETURN_FUNCTION, { checkoutId, result, to: returnUrl });
  const session = await elevated.createRedirectSession({
    ecomCheckout: { checkoutId },
    callbacks: { thankYouPageUrl: back('paid'), postFlowUrl: back('closed') },
  });
  const url = session.redirectSession?.fullUrl ?? session.redirectSession?.fullURL;
  if (!url) throw new Error('No checkout URL from createRedirectSession');
  return { checkoutUrl: url };
}

// Finds the order placed from a checkout. Wix may add ?orderId= to the
// thank-you URL; otherwise search recent orders. Orders can take a moment to
// appear, so try for a few seconds.
async function orderForCheckout(checkoutId, orderIdHint) {
  if (orderIdHint) {
    const order = await elevated.getOrder(orderIdHint).catch(() => null);
    if (order && order.checkoutId === checkoutId) return order;
  }
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await elevated.searchOrders({
      filter: { _createdDate: { $gte: new Date(Date.now() - DAY_MS).toISOString() } },
      cursorPaging: { limit: 100 },
    });
    const order = (res.orders ?? []).find((o) => o.checkoutId === checkoutId);
    if (order) return order;
    await new Promise((r) => setTimeout(r, 1500));
  }
  return null;
}

// The app's custom fields for an order. They're set on the checkout; if the
// order doesn't carry them, read them from the checkout it came from.
async function appFields(order) {
  let source = order;
  if (!readCustomField(order, FIELD_DEVICE) && order.checkoutId) {
    const res = await elevated.getCheckout(order.checkoutId).catch(() => null);
    source = res?.checkout ?? res ?? order;
  }
  return {
    deviceId: readCustomField(source, FIELD_DEVICE),
    designIds: (readCustomField(source, FIELD_DESIGNS) ?? '').split(',').filter(Boolean),
    lines: readCustomField(source, FIELD_LINES),
  };
}

// For backend/events.js: the PetDesigns record to print for one line of an
// order placed from the app, or null if the order didn't come from the app.
// Pass the result to fulfillPetDesignLineItem(order, lineItem, designId).
export async function appDesignForLineItem(order, lineItem) {
  const fields = await appFields(order);
  if (!fields.deviceId || !fields.lines) return null;
  return designForLine(fields.lines, order.lineItems, lineItem);
}

// GET /return — where Wix sends the browser after checkout. Redirects into
// the app, which closes the in-app browser.
export async function handleCheckoutReturn(query) {
  const to = isAllowedReturnUrl(query.to) ? query.to : 'designyourpet://confirmation';
  if (query.result !== 'paid' || !query.checkoutId) return to; // closed without paying: the app keeps the cart
  const order = await orderForCheckout(query.checkoutId, query.orderId);
  if (!order) return withQuery(to, { checkoutId: query.checkoutId });
  // Only hand out orders the app made. Printful fulfilment (events.js) marks
  // the designs as ordered once the order is paid.
  if (!(await appFields(order)).deviceId) return to;
  return withQuery(to, { orderId: order._id });
}

async function wixTrackingUrl(orderId) {
  try {
    const res = await elevated.listFulfillments(orderId);
    const list = res.orderWithFulfillments?.fulfillments ?? [];
    return list.map((f) => f.trackingInfo?.trackingLink).find(Boolean) ?? null;
  } catch {
    return null;
  }
}

// Status and tracking from Printful, one Printful order per Wix line (see the
// site's printfulOrders.js). Best effort: returns { status: null } if Printful
// can't be reached or has nothing yet.
async function printfulProgress(order) {
  const statuses = [];
  let tracking = null;
  try {
    const headers = await printfulHeaders();
    for (const line of order.lineItems ?? []) {
      const resp = await fetch(`${PRINTFUL_BASE}/orders/@${printfulExternalId(order, line)}`, { method: 'GET', headers });
      if (!resp.ok) continue;
      const result = (await resp.json()).result ?? {};
      statuses.push(result.status);
      tracking = tracking ?? (result.shipments ?? []).map((sh) => sh.tracking_url).find(Boolean) ?? null;
    }
  } catch (err) {
    console.warn('dyp: Printful status unavailable', err);
  }
  return { status: orderStatusFromPrintful(statuses), tracking };
}

// GET /orders -> the orders from `ids` that this device placed.
export async function listAppOrders(deviceId, ids) {
  const wanted = [...new Set(ids)].slice(0, MAX_ORDER_LOOKUPS);
  const out = [];
  for (const id of wanted) {
    const order = await elevated.getOrder(id).catch(() => null);
    if (!order || order.status === 'INITIALIZED') continue;
    const fields = await appFields(order);
    if (fields.deviceId !== deviceId) continue;
    const printful = await printfulProgress(order);
    const tracking = printful.tracking ?? (await wixTrackingUrl(order._id));
    out.push({
      id: order._id,
      number: String(order.number),
      createdAt: new Date(order._createdDate).toISOString(),
      status: printful.status ?? toAppOrderStatus(order, Boolean(tracking)),
      title: orderTitle(order),
      itemCount: (order.lineItems ?? []).reduce((n, l) => n + (l.quantity ?? 1), 0),
      totalCents: toCents(order.priceSummary?.total?.amount),
      trackingUrl: tracking,
      previewUrl: await previewForDesign(fields.designIds[0]),
    });
  }
  return out.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
