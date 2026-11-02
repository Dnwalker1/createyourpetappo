import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, Linking, StyleSheet, Text, View } from 'react-native';
import { api, ApiError, OrderAddress } from '../api';
import { AddressForm } from '../components/AddressForm';
import { Body, Button, H1, Screen } from '../components/ui';
import { useAppState } from '../state/AppState';
import { colors, fonts } from '../theme';

const pawSunset = require('../../assets/images/brand/paw-sunset-icon.webp');

function Step({ n, title, children }: { n: number; title: string; children: string }) {
  return (
    <View style={styles.step}>
      <Text style={styles.stepNum}>{n}</Text>
      <Text style={styles.stepText}>
        <Text style={{ fontFamily: fonts.bodyBold, color: colors.cream }}>{title} </Text>
        {children}
      </Text>
    </View>
  );
}

// The address as it would be written on an envelope.
function addressLines(a: OrderAddress): string[] {
  return [a.name, a.line1, a.line2, [a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '), a.country !== 'US' ? a.country : '']
    .map((l) => l.trim())
    .filter(Boolean);
}

type Check =
  | { state: 'loading' }
  | { state: 'none' } // order not found yet, or no address: the screen simply doesn't ask
  | { state: 'ask'; address: OrderAddress; canChange: boolean }
  | { state: 'confirmed'; address: OrderAddress; changed: boolean };

// "IS THIS RIGHT?" (added 1 Nov 2026). A customer typed her house number one
// digit off and the order was headed for an empty lot. Wix's checkout can't be
// changed, so the very first thing after paying is the address, large, with a
// way to fix it while the order is still waiting for review.
//
// The new order can take a few seconds to show up, so this asks a few times
// before giving up quietly.
function useShippingCheck(number: string | undefined) {
  const { deviceId } = useAppState();
  const [check, setCheck] = useState<Check>({ state: 'loading' });
  useEffect(() => {
    if (!deviceId || !number) return;
    let live = true;
    (async () => {
      for (let attempt = 0; attempt < 5 && live; attempt++) {
        try {
          const order = (await api.getOrders(deviceId)).find((o) => o.number === number);
          if (order?.shipTo) {
            if (live) setCheck({ state: 'ask', address: order.shipTo, canChange: !!order.canChangeAddress });
            return;
          }
        } catch {
          /* try again */
        }
        await new Promise((r) => setTimeout(r, 2500));
      }
      if (live) setCheck({ state: 'none' });
    })();
    return () => {
      live = false;
    };
  }, [deviceId, number]);
  // No order number (rare) or no device yet: nothing to ask about.
  const shown: Check = !deviceId || !number ? { state: 'none' } : check;
  return [shown, setCheck] as const;
}

// Shown after the backend confirms the checkout was paid. `number` is the
// real Wix order number.
export default function Confirmation() {
  const { number } = useLocalSearchParams<{ number?: string }>();
  const { deviceId } = useAppState();
  const [check, setCheck] = useShippingCheck(number);
  const [editing, setEditing] = useState(false);

  async function saveAddress(address: OrderAddress) {
    if (!deviceId || !number) throw new Error('Please try again in a moment.');
    try {
      await api.updateOrderAddress(deviceId, number, address);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ORDER_LOCKED') {
        throw new Error('This order has already gone to print. Email info@goodwookie.com and we\u2019ll do what we can.');
      }
      if (e instanceof ApiError && e.code === 'ADDRESS_INVALID') {
        throw new Error(e.message && e.message !== e.code ? e.message : 'Something in that address doesn\u2019t look right. Check each line and try again.');
      }
      throw new Error('That didn\u2019t save. Check your connection and try again.');
    }
    setEditing(false);
    setCheck({ state: 'confirmed', address, changed: true });
  }

  return (
    <Screen
      tone="dark"
      footer={
        <>
          <Button title="View my orders" onPress={() => router.replace('/orders')} />
          <Button variant="dark-secondary" title="Make another design" onPress={() => router.replace('/upload')} />
        </>
      }
    >
      <View style={styles.center}>
        <Image source={pawSunset} style={{ width: 150, height: 150 }} contentFit="contain" />
        <H1 tone="dark" heavy style={{ textAlign: 'center' }}>
          Thanks. Your order is in.
        </H1>
        {number ? <Text style={styles.number}>ORDER #{number}</Text> : null}
        {check.state === 'loading' ? (
          <View style={styles.check}>
            <ActivityIndicator color={colors.gold} />
            <Text style={styles.checkHint}>Getting your shipping address…</Text>
          </View>
        ) : null}
        {check.state === 'ask' || check.state === 'confirmed' ? (
          <View style={styles.check} accessibilityLabel={`Ships to ${addressLines(check.address).join(', ')}`}>
            <Text style={styles.checkTitle}>{check.state === 'ask' ? 'Is this where it\u2019s going?' : check.changed ? 'Address updated.' : 'Great, it\u2019s on its way there.'}</Text>
            {addressLines(check.address).map((l, i) => (
              <Text key={i} style={styles.addressLine}>
                {l}
              </Text>
            ))}
            {check.state === 'ask' ? (
              <>
                <Text style={styles.checkHint}>Check the house number and ZIP. One digit off and it goes to the wrong door.</Text>
                <Button title="Yes, that's right" onPress={() => setCheck({ state: 'confirmed', address: check.address, changed: false })} />
                {check.canChange ? <Button variant="dark-secondary" title="No, change it" onPress={() => setEditing(true)} /> : null}
              </>
            ) : null}
          </View>
        ) : null}
        <View style={styles.steps}>
          <Step n={1} title="Reviewed by hand.">A person looks at every order before it&apos;s printed. That person is me.</Step>
          <Step n={2} title="Printed on demand.">Nothing sits in a warehouse. Allow a few days.</Step>
          <Step n={3} title="Shipped free.">You&apos;ll see tracking in My orders once it ships.</Step>
        </View>
        <Body tone="dark" style={{ textAlign: 'center', fontSize: 15 }}>
          Your receipt from the Goodwookie store is on its way to your email. Questions, or something not right? Email{' '}
          <Text style={styles.mail} accessibilityRole="link" onPress={() => Linking.openURL('mailto:info@goodwookie.com')}>
            info@goodwookie.com
          </Text>
          .
        </Body>
      </View>
      {check.state === 'ask' ? (
        <AddressForm visible={editing} initial={check.address} onCancel={() => setEditing(false)} onSave={saveAddress} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  number: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 2, color: colors.gold },
  steps: { alignSelf: 'stretch', gap: 12, padding: 16, borderRadius: 16, borderWidth: 1.5, borderColor: colors.slate },
  step: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  stepNum: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.gold, color: colors.navy, textAlign: 'center', lineHeight: 28, fontFamily: fonts.display, fontSize: 15, overflow: 'hidden' },
  stepText: { flex: 1, fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.agedCream },
  mail: { color: colors.gold, fontFamily: fonts.bodySemi },
  check: { alignSelf: 'stretch', gap: 8, padding: 16, borderRadius: 16, borderWidth: 2, borderColor: colors.gold, alignItems: 'stretch' },
  checkTitle: { fontFamily: fonts.display, fontSize: 20, color: colors.cream, marginBottom: 4 },
  addressLine: { fontFamily: fonts.bodySemi, fontSize: 20, lineHeight: 27, color: colors.cream },
  checkHint: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.agedCream, marginVertical: 6 },
});
