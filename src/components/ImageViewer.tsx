import { Image } from 'expo-image';
import { useState } from 'react';
import { Animated, Dimensions, ImageSourcePropType, Modal, PanResponder, Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

const MAX_SCALE = 4;
const DOUBLE_TAP_MS = 280;

type Touch = { pageX: number; pageY: number };

function distance(a: Touch, b: Touch) {
  return Math.hypot(a.pageX - b.pageX, a.pageY - b.pageY);
}

type Transform = { scale: number; x: number; y: number };
const IDENTITY: Transform = { scale: 1, x: 0, y: 0 };

// Pinch, pan and double-tap handling. Created once per viewer and kept outside
// React state, since the responder mutates it on every touch move.
function createZoom() {
  const scale = new Animated.Value(1);
  const pan = new Animated.ValueXY();
  let committed = IDENTITY; // transform when the current gesture began
  let shown = IDENTITY;
  let pinchStart = 0;
  let lastTap = 0;

  const clamp = (t: Transform): Transform => {
    const { width, height } = Dimensions.get('window');
    const s = Math.min(MAX_SCALE, Math.max(1, t.scale));
    const maxX = (width * (s - 1)) / 2;
    const maxY = (height * (s - 1)) / 2;
    return { scale: s, x: Math.min(maxX, Math.max(-maxX, t.x)), y: Math.min(maxY, Math.max(-maxY, t.y)) };
  };
  const show = (t: Transform, animate = false) => {
    shown = t;
    if (animate) {
      Animated.parallel([
        Animated.spring(scale, { toValue: t.scale, useNativeDriver: false }),
        Animated.spring(pan, { toValue: { x: t.x, y: t.y }, useNativeDriver: false }),
      ]).start();
    } else {
      scale.setValue(t.scale);
      pan.setValue({ x: t.x, y: t.y });
    }
  };
  const commit = () => {
    committed = clamp(shown);
    show(committed, true);
    pinchStart = 0;
  };

  const responder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onMoveShouldSetPanResponder: () => true,
    onPanResponderGrant: () => {
      pinchStart = 0;
    },
    onPanResponderMove: (e, g) => {
      const touches = e.nativeEvent.touches;
      if (touches.length >= 2) {
        const d = distance(touches[0], touches[1]);
        if (!pinchStart) {
          pinchStart = d;
          committed = shown;
          return;
        }
        const next = Math.min(MAX_SCALE * 1.2, Math.max(0.8, (committed.scale * d) / pinchStart));
        show({ ...committed, scale: next });
      } else if (!pinchStart && committed.scale > 1) {
        show({ scale: committed.scale, x: committed.x + g.dx, y: committed.y + g.dy });
      }
    },
    onPanResponderRelease: (_e, g) => {
      const moved = Math.abs(g.dx) > 8 || Math.abs(g.dy) > 8;
      if (!moved && !pinchStart) {
        const now = Date.now();
        if (now - lastTap < DOUBLE_TAP_MS) {
          lastTap = 0;
          shown = committed.scale > 1 ? IDENTITY : { scale: 2.5, x: 0, y: 0 };
        } else {
          lastTap = now;
        }
      }
      commit();
    },
    onPanResponderTerminate: commit,
  });

  const reset = () => {
    committed = shown = IDENTITY;
    pinchStart = lastTap = 0;
    show(IDENTITY);
  };

  return { scale, pan, panHandlers: responder.panHandlers, reset };
}

// Full-screen view of a design. Pinch to zoom, drag to pan when zoomed,
// double-tap to zoom in or reset. Built on PanResponder so it needs no native
// gesture library.
export function ImageViewer({ source, visible, onClose, label }: { source: ImageSourcePropType | null; visible: boolean; onClose: () => void; label: string }) {
  const [{ scale, pan, panHandlers, reset }] = useState(createZoom);

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} onShow={reset} statusBarTranslucent>
      <View style={styles.backdrop} {...panHandlers}>
        <Animated.View style={[StyleSheet.absoluteFill, { transform: [{ translateX: pan.x }, { translateY: pan.y }, { scale }] }]}>
          {source ? <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel={label} /> : null}
        </Animated.View>
      </View>
      <SafeAreaView style={styles.chrome} edges={['top', 'bottom']} pointerEvents="box-none">
        <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close} hitSlop={8}>
          <Text style={styles.closeGlyph}>×</Text>
        </Pressable>
        <Text style={styles.hint} pointerEvents="none">
          Pinch to zoom · double-tap to zoom in
        </Text>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: colors.navy, overflow: 'hidden' },
  chrome: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, justifyContent: 'space-between', padding: 16 },
  close: {
    alignSelf: 'flex-end',
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(239, 227, 198, 0.92)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeGlyph: { fontFamily: fonts.bodyBold, fontSize: 30, lineHeight: 32, color: colors.navy },
  hint: { alignSelf: 'center', fontFamily: fonts.body, fontSize: 14, color: colors.agedCream },
});
