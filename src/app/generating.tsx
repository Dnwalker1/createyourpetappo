import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '../api';
import { Body, Button, H1, Pill, Screen, StepHeader } from '../components/ui';
import { styleById } from '../data/catalog';
import { useAppState } from '../state/AppState';
import { colors, fonts } from '../theme';

const pawSunset = require('../../assets/images/brand/paw-sunset-icon.webp');
const POLL_MS = 2000;
const EXPECTED_MS = 60_000;

export default function Generating() {
  const { designId } = useLocalSearchParams<{ designId: string }>();
  const { deviceId, styleId, setActiveDesign } = useAppState();
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (!designId || !deviceId) return;
    let stopped = false;
    const started = Date.now();
    const tick = async () => {
      if (stopped) return;
      setElapsed(Date.now() - started);
      try {
        const design = await api.getDesign(deviceId, designId);
        if (stopped) return;
        if (design.status === 'failed' || design.status === 'rejected') {
          stopped = true;
          router.replace('/problem/design-failed');
          return;
        }
        if (design.status !== 'processing') {
          stopped = true;
          setActiveDesign(design);
          setDone(true);
          return;
        }
      } catch (e) {
        if (e instanceof ApiError && e.code === 'DESIGN_FAILED') {
          stopped = true;
          router.replace('/problem/design-failed');
          return;
        }
        // Network hiccup: keep polling.
      }
      setTimeout(tick, POLL_MS);
    };
    tick();
    return () => {
      stopped = true;
    };
  }, [designId, deviceId, setActiveDesign]);

  // Progress is an estimate; generation takes about a minute.
  const pct = done ? 100 : Math.min(95, Math.round((elapsed / EXPECTED_MS) * 100));

  return (
    <Screen
      tone="dark"
      footer={done ? <Button title="See it on a shirt" onPress={() => router.replace('/result')} /> : null}
    >
      <StepHeader step={4} tone="dark" showBack={false} />
      <View style={styles.center}>
        <View style={styles.ring} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: pct }}>
          <Image source={pawSunset} style={{ width: 130, height: 130 }} contentFit="contain" />
        </View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.pct}>{pct}%</Text>
        <H1 tone="dark" heavy style={{ textAlign: 'center', fontSize: 30 }}>
          {done ? 'Your design is ready' : 'Making your design…'}
        </H1>
        <Body tone="dark" style={{ textAlign: 'center', fontSize: 17 }}>
          Making your design takes about a minute. It appears on the shirt when it&apos;s ready.
        </Body>
        <Pill tone="dark">{styleById(styleId).name} · uses 1 of your 5 designs if it works</Pill>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 18 },
  ring: { width: 200, height: 200, borderRadius: 100, borderWidth: 12, borderColor: colors.slate, alignItems: 'center', justifyContent: 'center' },
  track: { width: 220, height: 8, borderRadius: 4, backgroundColor: colors.slate, overflow: 'hidden' },
  fill: { height: 8, backgroundColor: colors.gold },
  pct: { fontFamily: fonts.display, fontSize: 28, color: colors.cream },
});
