// Design Your Pet app: checkout and orders through Wix eCommerce.
// The app never takes payment. It gets a Wix checkout for the same store
// products the website sells, the customer pays on the site's secure
// checkout, and Wix sends them back to the app.

import { checkout, orders, orderFulfillments } from '@wix/ecom';
import { productsV3 } from '@wix/stores';
import { redirects } from '@wix/redirects';
import { auth } from '@wix/essentials';
import {
  DAY_MS,
  FIELD_DESIGNS,
  FIELD_DEVICE,
  PRODUCT_IDS,
  STORES_APP_ID,
  findApparelVariantId,
  isAllowedReturnUrl,
  orderTitle,
  parseCheckoutLines,
  readCustomField,
  toAppOrderStatus,
  toCents,
  withQuery,
} from 'backend/dyp/rules';
import { DypError, deviceOwnsOrder, markOrdered, orderableDesigns, previewForOrder } from 'backend/dyp/designs';

export const SITE_URL = 'https://www.goodwookie.com';
const RETURN_FUNCTION = `${SITE_URL}/_functions/dyp/return`;
const MAX_ORDER_LOOKUPS = 20;

const elevated = {
  getProduct: auth.elevate(productsV3.getProduct),
  createCheckout: auth.elevate(checkout.createCheckout),
  createRedirectSession: auth.elevate(redirects.createRedirectSession),
  getOrder: auth.elevate(orders.getOrder),
  searchOrders: auth.elevate(orders.searchOrders),
  listFulfillments: auth.elevate(orderFulfillments.listFulfillmentsForSingleOrder),
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

  const lineItems = [];
  for (const item of parsed.items) {
    lineItems.push({
      quantity: item.quantity,
      catalogReference: {
        appId: STORES_APP_ID,
        catalogItemId: PRODUCT_IDS[item.choice.product],
        options: { variantId: await variantIdFor(item.choice) },
      },
    });
  }

  const created = await elevated.createCheckout({
    lineItems,
    channelType: 'WEB',
    checkoutInfo: {
      // These travel with the order, so the order can be tied back to the
      // device and to the designs to print.
      customFields: [
        { title: FIELD_DEVICE, value: deviceId },
        { title: FIELD_DESIGNS, value: parsed.designIds.join(',') },
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

// Ties a paid order to the app device and marks its designs as ordered.
// Safe to call more than once. Also call it from backend/events.js
// (wixEcom_onOrderCreated) so orders are linked even if the customer never
// comes back to the app.
export async function linkOrder(order) {
  const deviceId = readCustomField(order, FIELD_DEVICE);
  const designIds = (readCustomField(order, FIELD_DESIGNS) ?? '').split(',').filter(Boolean);
  if (!deviceId || !designIds.length) return false;
  await markOrdered(deviceId, designIds, order._id);
  return true;
}

// GET /return — where Wix sends the browser after checkout. Redirects into
// the app, which closes the in-app browser.
export async function handleCheckoutReturn(query) {
  const to = isAllowedReturnUrl(query.to) ? query.to : 'designyourpet://confirmation';
  if (query.result !== 'paid' || !query.checkoutId) return to; // closed without paying: the app keeps the cart
  const order = await orderForCheckout(query.checkoutId, query.orderId);
  if (!order) return withQuery(to, { checkoutId: query.checkoutId });
  if (!(await linkOrder(order))) {
    // The checkout wasn't made by the app; don't hand its order out.
    return to;
  }
  return withQuery(to, { orderId: order._id });
}

async function trackingUrl(orderId) {
  try {
    const res = await elevated.listFulfillments(orderId);
    const list = res.orderWithFulfillments?.fulfillments ?? [];
    return list.map((f) => f.trackingInfo?.trackingLink).find(Boolean) ?? null;
  } catch {
    return null;
  }
}

// GET /orders -> the orders from `ids` that this device placed.
export async function listAppOrders(deviceId, ids) {
  const wanted = [...new Set(ids)].slice(0, MAX_ORDER_LOOKUPS);
  const out = [];
  for (const id of wanted) {
    const order = await elevated.getOrder(id).catch(() => null);
    if (!order || order.status === 'INITIALIZED') continue;
    const owned = readCustomField(order, FIELD_DEVICE) === deviceId || (await deviceOwnsOrder(deviceId, order._id));
    if (!owned) continue;
    const tracking = await trackingUrl(order._id);
    out.push({
      id: order._id,
      number: String(order.number),
      createdAt: new Date(order._createdDate).toISOString(),
      status: toAppOrderStatus(order, Boolean(tracking)),
      title: orderTitle(order),
      itemCount: (order.lineItems ?? []).reduce((n, l) => n + (l.quantity ?? 1), 0),
      totalCents: toCents(order.priceSummary?.total?.amount),
      trackingUrl: tracking,
      previewUrl: await previewForOrder(order._id),
    });
  }
  return out.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
