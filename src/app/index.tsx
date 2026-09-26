import { Image } from 'expo-image';
import { router } from 'expo-router';
import { StyleSheet, View } from 'react-native';
import { Body, Button, H1, Pill, Row, Screen } from '../components/ui';
import { STYLES } from '../data/catalog';

const badge = require('../../assets/images/brand/badge-logo.webp');

export default function Welcome() {
  const [stamp, , evening, sticker] = STYLES;
  return (
    <Screen
      tone="dark"
      footer={
        <>
          <Button title="Get started" onPress={() => router.push('/upload')} />
          <Button variant="dark-secondary" title="See your designs" onPress={() => router.push('/designs')} />
        </>
      }
    >
      <Image source={badge} style={styles.badge} contentFit="contain" accessibilityLabel="Goodwookie Productions LLC: Adventure is the destination" />
      <View style={styles.collage}>
        <Image source={evening.sample} style={[styles.sample, styles.left]} contentFit="cover" accessibilityLabel="Evening Portrait sample" />
        <Image source={stamp.sample} style={[styles.sample, styles.center]} contentFit="contain" accessibilityLabel="Travel Stamp sample" />
        <Image source={sticker.sample} style={[styles.sample, styles.right]} contentFit="contain" accessibilityLabel="Adventure Sticker sample" />
      </View>
      <H1 tone="dark" heavy>
        Put Your Best Friend On A Shirt
      </H1>
      <Body tone="dark">Upload a photo. Pick a style. We&apos;ll turn your pet into original Goodwookie artwork and put it on a shirt. Your pet doesn&apos;t have to sit still for any of it.</Body>
      <Row style={{ flexWrap: 'wrap', gap: 8 }}>
        <Pill tone="dark">About 1 minute</Pill>
        <Pill tone="dark">5 free designs every 24 hours</Pill>
        <Pill tone="dark">No account. No password to forget.</Pill>
      </Row>
    </Screen>
  );
}

const styles = StyleSheet.create({
  badge: { width: 200, height: 182, alignSelf: 'center' },
  collage: { height: 190, alignItems: 'center', justifyContent: 'center' },
  sample: { position: 'absolute' },
  left: { width: 112, height: 112, left: '8%', top: 6, transform: [{ rotate: '-6deg' }] },
  center: { width: 150, height: 150, transform: [{ rotate: '3deg' }] },
  right: { width: 96, height: 96, right: '8%', bottom: 0, transform: [{ rotate: '8deg' }] },
});
