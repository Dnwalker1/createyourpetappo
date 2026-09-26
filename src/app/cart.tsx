import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { ProductPreview } from '../components/ProductPreview';
import { Body, Button, Card, Screen, TitleBar } from '../components/ui';
import { describeChoice, priceCents } from '../data/catalog';
import { cartTotals, itemCents } from '../lib/cart';
import { formatMoney } from '../lib/money';
import { useAppState } from '../state/AppState';
import { colors, fonts } from '../theme';

export default function Cart() {
  const { cart, updateQuantity, removeFromCart } = useAppState();
  const totals = cartTotals(cart);

  return (
    <Screen
      footer={
        <>
          <Button title="Checkout" disabled={!cart.length} onPress={() => router.push('/checkout')} />
          <Button variant="link" title="Keep designing" onPress={() => router.dismissTo('/result')} />
        </>
      }
    >
      <TitleBar title="Your cart" right={<Text style={styles.count}>{totals.itemCount === 1 ? '1 item' : `${totals.itemCount} items`}</Text>} />
      {!cart.length ? <Body>Your cart is empty. That&apos;s fixable. Pick a product for one of your designs.</Body> : null}

      {cart.map((item) =>
        item.kind === 'bundle' ? (
          <Card key={item.id}>
            <View style={styles.head}>
              <View style={styles.thumb}>
                <ProductPreview choice={item.choices.hoodie} design={item.preview} size={52} />
              </View>
              <Text style={styles.title}>Buy them all bundle</Text>
              <View style={styles.off}>
                <Text style={styles.offText}>10% OFF</Text>
              </View>
            </View>
            {[item.choices.tee, item.choices.hoodie, item.choices.sticker, item.choices.poster].map((c) => (
              <View key={c.product} style={styles.line}>
                <Text style={styles.lineText}>{describeChoice(c)}</Text>
                <Text style={styles.lineText}>{formatMoney(priceCents(c))}</Text>
              </View>
            ))}
            <View style={styles.line}>
              <Pressable accessibilityRole="button" onPress={() => removeFromCart(item.id)} hitSlop={10}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
              <Text style={styles.itemTotal}>{formatMoney(itemCents(item))}</Text>
            </View>
          </Card>
        ) : (
          <Card key={item.id} style={styles.single}>
            <View style={styles.thumb}>
              <ProductPreview choice={item.choice} design={item.preview} size={52} />
            </View>
            <View style={{ flex: 1, gap: 2 }}>
              <Text style={styles.title}>{describeChoice(item.choice).split(' · ')[0]}</Text>
              <Text style={styles.lineText}>
                {describeChoice(item.choice).split(' · ').slice(1).join(' · ')} · {formatMoney(itemCents(item))}
              </Text>
              <Pressable accessibilityRole="button" onPress={() => removeFromCart(item.id)} hitSlop={10}>
                <Text style={styles.remove}>Remove</Text>
              </Pressable>
            </View>
            <View style={styles.stepper}>
              <Pressable accessibilityRole="button" accessibilityLabel="Fewer" onPress={() => updateQuantity(item.id, item.quantity - 1)} style={styles.stepBtn}>
                <Text style={styles.stepText}>−</Text>
              </Pressable>
              <Text accessibilityLiveRegion="polite" style={styles.qty}>
                {item.quantity}
              </Text>
              <Pressable accessibilityRole="button" accessibilityLabel="More" onPress={() => updateQuantity(item.id, item.quantity + 1)} style={styles.stepBtn}>
                <Text style={styles.stepText}>+</Text>
              </Pressable>
            </View>
          </Card>
        ),
      )}

      {cart.length ? (
        <View style={styles.summary}>
          <View style={styles.line}>
            <Text style={styles.sumText}>Items</Text>
            <Text style={styles.sumText}>{formatMoney(totals.itemsCents)}</Text>
          </View>
          {totals.bundleDiscountCents ? (
            <View style={styles.line}>
              <Text style={styles.sumText}>Bundle discount (10%)</Text>
              <Text style={styles.sumText}>−{formatMoney(totals.bundleDiscountCents)}</Text>
            </View>
          ) : null}
          <View style={styles.line}>
            <Text style={styles.sumText}>Shipping</Text>
            <Text style={styles.sumText}>Free</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.sumText}>Tax</Text>
            <Text style={styles.sumText}>Calculated at checkout</Text>
          </View>
          <View style={styles.line}>
            <Text style={styles.totalLabel}>Total</Text>
            <Text style={styles.total}>{formatMoney(totals.totalCents)}</Text>
          </View>
          {totals.bundleDiscountCents ? <Text style={styles.sumNote}>The bundle discount is applied automatically at checkout.</Text> : null}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  count: { fontFamily: fonts.body, fontSize: 15, color: colors.slate },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  single: { flexDirection: 'row', alignItems: 'center' },
  thumb: { width: 52, height: 52, borderRadius: 10, backgroundColor: colors.white, overflow: 'hidden' },
  title: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 17, color: colors.navy },
  off: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, backgroundColor: colors.rust },
  offText: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 1, color: colors.white },
  line: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12 },
  lineText: { fontFamily: fonts.body, fontSize: 15, color: colors.slate, flexShrink: 1 },
  itemTotal: { fontFamily: fonts.display, fontSize: 18, color: colors.navy },
  remove: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.error, textDecorationLine: 'underline' },
  stepper: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: colors.agedCream, borderRadius: 12, backgroundColor: colors.white },
  stepBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
  stepText: { fontFamily: fonts.bodySemi, fontSize: 20, color: colors.navy },
  qty: { minWidth: 20, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 16, color: colors.navy },
  summary: { gap: 6, padding: 16, borderRadius: 14, backgroundColor: colors.navy },
  sumText: { fontFamily: fonts.body, fontSize: 15, color: colors.agedCream, flexShrink: 1 },
  sumNote: { fontFamily: fonts.body, fontSize: 13, color: colors.agedCream },
  totalLabel: { fontFamily: fonts.display, fontSize: 18, color: colors.cream },
  total: { fontFamily: fonts.display, fontSize: 26, color: colors.gold },
});
