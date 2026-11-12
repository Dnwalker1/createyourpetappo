import { Image } from 'expo-image';
import { useFocusEffect } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Linking, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, ApiError, Order, OrderAddress, OrderStatus } from '../api';
import { AddressForm } from '../components/AddressForm';
import { BottomNav } from '../components/BottomNav';
import { Body, Button, Card } from '../components/ui';
import { formatMoney } from '../lib/money';
import { useAppState } from '../state/AppState';
import { PolicyLinks } from '../components/PolicyLinks';
import { colors, fonts } from '../theme';

const pawNavy = require('../../assets/images/brand/paw-navy-icon.webp');
const STAGES: { key: OrderStatus; label: string }[] = [
  { key: 'in-review', label: 'In review' },
  { key: 'printing', label: 'Printing' },
  { key: 'shipped', label: 'Shipped' },
  { key: 'delivered', label: 'Delivered' },
];
const NOTES: Record<OrderStatus, string> = {
  'in-review': 'Being reviewed by hand before it goes to print.',
  printing: 'Being printed.',
  shipped: 'On its way.',
  delivered: 'Delivered. Go put it on.',
};

// The address as it would be written on an envelope.
function addressLines(a: OrderAddress): string[] {
  return [a.name, a.line1, a.line2, [a.city, [a.state, a.zip].filter(Boolean).join(' ')].filter(Boolean).join(', '), a.country !== 'US' ? a.country : '']
    .map((l) => l.trim())
    .filter(Boolean);
}

// "Sep 23, 2026" in the customer's local time.
const formatDate = (ms: number) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

export default function Orders() {
  const { deviceId } = useAppState();
  const [orders, setOrders] = useState<Order[] | null>(null);
  // The order whose items are shown. Tap a card to open or close it.
  const [openId, setOpenId] = useState<string | null>(null);
  // The order whose address is being changed, and the last one saved.
  const [editing, setEditing] = useState<Order | null>(null);
  const [savedFor, setSavedFor] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!deviceId) return () => undefined;
    let live = true;
    api
      .getOrders(deviceId)
      .then((o) => live && setOrders(o.sort((a, b) => b.createdAt - a.createdAt)))
      .catch(() => live && setOrders([]));
    return () => {
      live = false;
    };
  }, [deviceId]);
  useFocusEffect(load);

  async function saveAddress(order: Order, address: OrderAddress) {
    if (!deviceId) throw new Error('Please try again in a moment.');
    try {
      await api.updateOrderAddress(deviceId, order.number, address);
    } catch (e) {
      if (e instanceof ApiError && e.code === 'ORDER_LOCKED') {
        throw new Error('This order has already gone to print, so the address can’t be changed here. Email info@goodwookie.com and we’ll do what we can.');
      }
      if (e instanceof ApiError && e.code === 'ADDRESS_INVALID') {
        throw new Error(e.message && e.message !== e.code ? e.message : 'Something in that address doesn’t look right. Check each line and try again.');
      }
      throw new Error('That didn’t save. Check your connection and try again.');
    }
    setEditing(null);
    setSavedFor(order.id);
    load();
  }

  return (
    <SafeAreaView style={styles.fill} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.titleRow}>
          <Image source={pawNavy} style={{ width: 44, height: 44 }} contentFit="contain" />
          <Text style={styles.title} accessibilityRole="header">
            My orders
          </Text>
        </View>
        {orders === null ? <ActivityIndicator color={colors.navy} /> : null}
        {orders && !orders.length ? <Body>No orders yet. Orders you place in this app show up here.</Body> : null}
        {orders?.map((o) => {
          const at = STAGES.findIndex((s) => s.key === o.status);
          const open = openId === o.id;
          return (
            <Card key={o.id} style={{ gap: 12 }}>
              <Pressable
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                accessibilityHint={open ? 'Hides the items in this order' : 'Shows the items in this order'}
                onPress={() => setOpenId(open ? null : o.id)}
                style={{ gap: 12 }}
              >
              <View style={styles.line}>
                <Text style={styles.number}>Order #{o.number}</Text>
                <Text style={styles.muted}>{formatDate(o.createdAt)}</Text>
              </View>
              <View style={styles.row}>
                {o.preview ? <Image source={o.preview} style={styles.thumb} contentFit="contain" /> : null}
                <View style={{ flex: 1, gap: 2 }}>
                  <Text style={styles.itemTitle}>{o.title}</Text>
                  <Text style={styles.muted}>{o.itemCount === 1 ? '1 item' : `${o.itemCount} items`}</Text>
                </View>
                <Text style={styles.number}>{formatMoney(o.totalCents)}</Text>
              </View>
              {open ? (
                <View style={styles.items}>
                  {o.items.map((it, i) => (
                    <View key={i} style={styles.line}>
                      <Text style={[styles.muted, { flex: 1 }]}>
                        {it.title}
                        {it.detail ? ` · ${it.detail}` : ''}
                      </Text>
                      <Text style={styles.muted}>× {it.quantity}</Text>
                    </View>
                  ))}
                </View>
              ) : (
                <Text style={styles.more}>Tap to see what&apos;s in it</Text>
              )}
              </Pressable>
              <View accessibilityLabel={`Status: ${STAGES[at]?.label ?? o.status}`} style={{ gap: 6 }}>
                <View style={styles.bars}>
                  {STAGES.map((s, i) => (
                    <View key={s.key} style={[styles.bar, { backgroundColor: i <= at ? colors.navy : colors.agedCream }]} />
                  ))}
                </View>
                <View style={styles.bars}>
                  {STAGES.map((s, i) => (
                    <Text key={s.key} style={[styles.stage, i === at && styles.stageOn]}>
                      {s.label}
                    </Text>
                  ))}
                </View>
              </View>
              <Body style={{ fontSize: 14 }}>{NOTES[o.status]}</Body>
              {o.shipTo ? (
                <View style={styles.shipTo} accessibilityLabel={`Ships to ${addressLines(o.shipTo).join(', ')}`}>
                  <Text style={styles.shipLabel}>Ships to</Text>
                  {addressLines(o.shipTo).map((l, i) => (
                    <Text key={i} style={styles.shipLine}>
                      {l}
                    </Text>
                  ))}
                  {savedFor === o.id ? <Text style={styles.saved}>Address updated.</Text> : null}
                  {o.canChangeAddress ? <Button variant="secondary" title="Change address" onPress={() => setEditing(o)} /> : null}
                </View>
              ) : null}
              {o.trackingUrl ? <Button variant="secondary" title="Track package" onPress={() => WebBrowser.openBrowserAsync(o.trackingUrl!)} /> : null}
            </Card>
          );
        })}
        <Body style={{ fontSize: 14 }}>
          Questions, or something not right? Email{' '}
          <Text style={styles.mail} accessibilityRole="link" onPress={() => Linking.openURL('mailto:info@goodwookie.com')}>
            info@goodwookie.com
          </Text>
          .
        </Body>
        <PolicyLinks />
      </ScrollView>
      <BottomNav current="orders" />
      {editing?.shipTo ? (
        <AddressForm visible initial={editing.shipTo} onCancel={() => setEditing(null)} onSave={(a) => saveAddress(editing, a)} />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingTop: 12, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.navy },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  number: { fontFamily: fonts.display, fontSize: 17, color: colors.navy },
  muted: { fontFamily: fonts.body, fontSize: 14, color: colors.slate },
  thumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: colors.paper },
  itemTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.navy },
  items: { gap: 6, paddingTop: 4, borderTopWidth: 1, borderTopColor: colors.agedCream },
  more: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.bronze },
  bars: { flexDirection: 'row', gap: 4 },
  bar: { flex: 1, height: 6, borderRadius: 3 },
  stage: { flex: 1, fontFamily: fonts.body, fontSize: 12, color: colors.slate },
  stageOn: { fontFamily: fonts.bodyBold, color: colors.navy },
  mail: { fontFamily: fonts.bodySemi, color: colors.navy, textDecorationLine: 'underline' },
  shipTo: { gap: 2, padding: 12, borderRadius: 12, backgroundColor: colors.paper },
  shipLabel: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.slate, marginBottom: 2 },
  shipLine: { fontFamily: fonts.body, fontSize: 16, color: colors.navy },
  saved: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.navy, marginTop: 4 },
});
