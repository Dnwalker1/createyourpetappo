import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import { Animated, Easing, StyleSheet, Text, View } from 'react-native';
import { api, ApiError } from '../api';
import { Body, Button, H1, Pill, Screen, StepHeader } from '../components/ui';
import { styleById } from '../data/catalog';
import { problemRoute } from '../lib/errorRoute';
import { useLimits } from '../lib/useLimits';
import { useAppState } from '../state/AppState';
import { colors, fonts } from '../theme';

// What the photo-rejected screen says for each refusal reason from the backend.
const REJECT_REASONS: Record<string, string> = {
  child: 'It looks like there may be a child in it. Photos with children can\'t be used, even with the people switch on.',
  famous: 'It looks like a well-known person may be in it. We can only draw you, your people and your pets.',
  too_many: 'There are more than 6 people and pets in it. Try a photo with fewer.',
};

const pawSunset = require('../../assets/images/brand/paw-sunset-icon.webp');
const POLL_MS = 2000;
const EXPECTED_MS = 60_000;

export default function Generating() {
  const { designId } = useLocalSearchParams<{ designId: string }>();
  const { deviceId, styleId, setActiveDesign } = useAppState();
  const [done, setDone] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  // True after several failed checks in a row: the phone can't reach us.
  const [offline, setOffline] = useState(false);
  const { limits } = useLimits();

  // The ring slowly glows gold and fades back while the design is made.
  const [glow] = useState(() => new Animated.Value(0));
  useEffect(() => {
    if (done) {
      glow.stopAnimation();
      glow.setValue(1);
      return;
    }
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 1400, easing: Easing.inOut(Easing.sin), useNativeDriver: false }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [done, glow]);
  const ringColor = useMemo(() => glow.interpolate({ inputRange: [0, 1], outputRange: [colors.slate, colors.gold] }), [glow]);
  const ringOpacity = useMemo(() => glow.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }), [glow]);

  useEffect(() => {
    if (!designId || !deviceId) return;
    let stopped = false;
    let misses = 0;
    const started = Date.now();
    const tick = async () => {
      if (stopped) return;
      setElapsed(Date.now() - started);
      try {
        const design = await api.getDesign(deviceId, designId);
        if (stopped) return;
        misses = 0;
        setOffline(false);
        if (design.status === 'failed' || design.status === 'rejected') {
          // The photo is checked while the design is made, so a photo with no
          // pet, or one that isn't accepted, ends up here too.
          stopped = true;
          const reason = design.rejectReason ? REJECT_REASONS[design.rejectReason] : undefined;
          router.replace(problemRoute(new ApiError(design.problem ?? 'DESIGN_FAILED', reason)) as never);
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
        // Network hiccup: keep polling. The design carries on being made on
        // our side either way, so it's never lost, just late.
        misses++;
        if (misses >= 3) setOffline(true);
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
        <Animated.View
          style={[styles.ring, { borderColor: ringColor, opacity: ringOpacity }]}
          accessibilityRole="progressbar"
          accessibilityValue={{ min: 0, max: 100, now: pct }}
        >
          <Image source={pawSunset} style={{ width: 130, height: 130 }} contentFit="contain" />
        </Animated.View>
        <View style={styles.track}>
          <View style={[styles.fill, { width: `${pct}%` }]} />
        </View>
        <Text style={styles.pct}>{pct}%</Text>
        <H1 tone="dark" heavy style={{ textAlign: 'center', fontSize: 30 }}>
          {done ? 'Your design is ready' : 'Making the magic happen!'}
        </H1>
        <Body tone="dark" style={{ textAlign: 'center', fontSize: 17 }}>
          {done
            ? 'Now let\u2019s put it on a shirt for you to fall in love with.'
            : 'This should take about a minute, then we\u2019ll put it on a shirt for you to fall in love with.'}
        </Body>
        {offline && !done ? (
          <Body tone="dark" style={{ textAlign: 'center', fontSize: 15, color: colors.gold }}>
            We can&apos;t reach the studio from your phone right now. Your design is still being made. Check your connection and it will appear here.
          </Body>
        ) : null}
        <Pill tone="dark">
          {styleById(styleId).name} · uses 1 of your {limits?.limit ?? 5} designs if it works
        </Pill>
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
