import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { Linking, StyleSheet, Text, View } from 'react-native';
import { Body, Button, H1, Screen } from '../components/ui';
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

// Shown after the backend confirms the checkout was paid. `number` is the
// real Wix order number.
export default function Confirmation() {
  const { number } = useLocalSearchParams<{ number?: string }>();

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
});
