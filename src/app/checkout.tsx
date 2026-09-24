import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useEffect, useRef, useState } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import { api, ApiError, CheckoutLine, MOCK_CHECKOUT_URL } from '../api';
import { Alert, Body, Button, Card, Label, Screen, TitleBar } from '../components/ui';
import { describeChoice } from '../data/catalog';
import { cartTotals, itemCents } from '../lib/cart';
import { formatMoney } from '../lib/money';
import { useAppState } from '../state/AppState';
import { colors, fonts } from '../theme';

const wait = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

// The app never takes payment. It asks the backend for a Wix checkout, opens
// it, and when the customer comes back asks whether the order went through.
export default function Checkout() {
  const { deviceId, cart, clearCart } = useAppState();
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState<false | 'network' | 'unavailable'>(false);
  // Set while a checkout is open in the browser and not yet confirmed.
  const [pendingId, setPendingId] = useState<string | null>(null);
  const checking = useRef(false);
  const totals = cartTotals(cart);

  // Paid? The order can take a moment to appear, so ask a few times.
  const confirm = useCallback(
    async (checkoutId: string) => {
      if (!deviceId || checking.current) return;
      checking.current = true;
      setBusy(true);
      try {
        for (let attempt = 0; attempt < 4; attempt++) {
          const status = await api.getCheckoutStatus(deviceId, checkoutId).catch(() => null);
          if (status?.completed) {
            setPendingId(null);
            clearCart();
            router.replace({ pathname: '/confirmation', params: status.orderNumber ? { number: status.orderNumber } : {} });
            return;
          }
          await wait(1500);
        }
        // Not paid (yet): nothing changes, the cart is kept.
      } finally {
        checking.current = false;
        setBusy(false);
      }
    },
    [deviceId, clearCart],
  );

  // On Android the browser opens alongside the app, so check again whenever
  // the customer comes back to it.
  useEffect(() => {
    if (!pendingId) return;
    const sub = AppState.addEventListener('change', (state) => {
      if (state === 'active') confirm(pendingId);
    });
    return () => sub.remove();
  }, [pendingId, confirm]);

  async function pay() {
    if (!deviceId || !cart.length) return;
    setBusy(true);
    setFailed(false);
    try {
      const lines: CheckoutLine[] = cart.map((i) =>
        i.kind === 'bundle'
          ? { kind: 'bundle', designId: i.designId, choices: [i.choices.tee, i.choices.hoodie, i.choices.sticker, i.choices.poster] }
          : { kind: 'single', designId: i.designId, choice: i.choice, quantity: i.quantity },
      );
      const { checkoutId, checkoutUrl } = await api.createCheckout(deviceId, lines);
      setBusy(false);
      if (checkoutUrl === MOCK_CHECKOUT_URL) {
        await confirm(checkoutId);
        return;
      }
      setPendingId(checkoutId);
      const result = await WebBrowser.openBrowserAsync(checkoutUrl);
      // iOS resolves when the sheet closes; Android as soon as it opens.
      if (result.type !== 'opened') await confirm(checkoutId);
    } catch (e) {
      setFailed(e instanceof ApiError && e.code === 'CART_ITEM_UNAVAILABLE' ? 'unavailable' : 'network');
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      footer={
        <>
          {pendingId ? (
            <>
              <Button title={busy ? 'Checking your order…' : "I've paid, check my order"} disabled={busy} onPress={() => confirm(pendingId)} />
              <Button variant="link" title="Open checkout again" disabled={busy} onPress={pay} />
            </>
          ) : (
            <Button title={busy ? 'Opening checkout…' : 'Continue to secure checkout'} disabled={busy || !cart.length} onPress={pay} />
          )}
          <Body style={{ textAlign: 'center', fontSize: 13 }}>
            You&apos;ll pay on the Goodwookie store&apos;s secure checkout, then come right back here. Every order is reviewed by hand before it&apos;s printed.
          </Body>
        </>
      }
    >
      <TitleBar title="Review and pay" />
      <Card>
        <View style={styles.line}>
          <Label>YOUR ORDER</Label>
          <Text accessibilityRole="link" style={styles.edit} onPress={() => router.back()}>
            Edit
          </Text>
        </View>
        {cart.map((i) => (
          <View key={i.id} style={styles.line}>
            <Text style={styles.text}>{i.kind === 'bundle' ? 'Buy them all bundle' : `${describeChoice(i.choice)}${i.quantity > 1 ? ` × ${i.quantity}` : ''}`}</Text>
            <Text style={styles.text}>{formatMoney(itemCents(i))}</Text>
          </View>
        ))}
        {totals.bundleDiscountCents ? (
          <View style={styles.line}>
            <Text style={styles.muted}>Bundle discount (10%)</Text>
            <Text style={styles.muted}>−{formatMoney(totals.bundleDiscountCents)}</Text>
          </View>
        ) : null}
        <View style={styles.line}>
          <Text style={styles.muted}>Shipping</Text>
          <Text style={styles.muted}>Free</Text>
        </View>
        <View style={styles.line}>
          <Text style={styles.muted}>Tax</Text>
          <Text style={styles.muted}>Added at checkout</Text>
        </View>
        <View style={styles.rule} />
        <View style={styles.line}>
          <Text style={styles.totalLabel}>Total before tax</Text>
          <Text style={styles.total}>{formatMoney(totals.totalCents)}</Text>
        </View>
      </Card>
      <View style={styles.pay}>
        <Label>WAYS TO PAY</Label>
        <View style={styles.chips}>
          {['Credit or debit card', 'PayPal', 'Apple Pay', 'Google Pay'].map((m) => (
            <View key={m} style={styles.chip}>
              <Text style={styles.chipText}>{m}</Text>
            </View>
          ))}
        </View>
        <Body style={{ fontSize: 14 }}>The options you see depend on your phone. You&apos;ll enter your shipping address on the next screen.</Body>
      </View>
      {failed === 'unavailable' ? (
        <Alert title="Something in your cart has changed">
          <Body>
            One of the designs or product options in your cart isn&apos;t available any more. Designs are kept for 7 days. Remove it and try again.
          </Body>
        </Alert>
      ) : failed ? (
        <Alert title="Checkout didn't open">
          <Body>Check your connection and try again. Your cart is still here.</Body>
        </Alert>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 },
  text: { fontFamily: fonts.body, fontSize: 15, color: colors.navy, flexShrink: 1 },
  muted: { fontFamily: fonts.body, fontSize: 15, color: colors.slate },
  edit: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.navy, textDecorationLine: 'underline' },
  rule: { height: 1, backgroundColor: colors.agedCream },
  totalLabel: { fontFamily: fonts.display, fontSize: 18, color: colors.navy },
  total: { fontFamily: fonts.display, fontSize: 26, color: colors.navy },
  pay: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.paper },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  chip: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 10, backgroundColor: colors.white, borderWidth: 1.5, borderColor: colors.agedCream },
  chipText: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.navy },
});
