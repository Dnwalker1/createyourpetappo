import { Image } from 'expo-image';
import { ImageSourcePropType, Modal, Pressable, StyleSheet, Text, useWindowDimensions } from 'react-native';
import { Gesture, GestureDetector, GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

const MAX_SCALE = 4;
const DOUBLE_TAP_SCALE = 2.5;

// Full-screen view of a design. Pinch to zoom, drag to pan when zoomed,
// double-tap to zoom in or back out.
//
// Built on react-native-gesture-handler and Reanimated (31 Oct 2026). The
// first version used PanResponder, and its pinch didn't work on a real phone:
// the responder only follows the first finger reliably, so the second finger's
// movement never reached it. The gesture library tracks both fingers natively.
//
// A Modal is its own native window, so it needs its own GestureHandlerRootView
// inside it; the one at the app root doesn't reach in here.
export function ImageViewer({ source, visible, onClose, label }: { source: ImageSourcePropType | null; visible: boolean; onClose: () => void; label: string }) {
  const { width, height } = useWindowDimensions();

  const scale = useSharedValue(1);
  const savedScale = useSharedValue(1);
  const x = useSharedValue(0);
  const y = useSharedValue(0);
  const savedX = useSharedValue(0);
  const savedY = useSharedValue(0);

  // Keep the picture from being dragged off screen at the current zoom.
  const clampX = (v: number, s: number) => {
    'worklet';
    const max = (width * (s - 1)) / 2;
    return Math.min(max, Math.max(-max, v));
  };
  const clampY = (v: number, s: number) => {
    'worklet';
    const max = (height * (s - 1)) / 2;
    return Math.min(max, Math.max(-max, v));
  };
  const settle = () => {
    'worklet';
    const s = Math.min(MAX_SCALE, Math.max(1, scale.value));
    scale.value = withTiming(s);
    x.value = withTiming(clampX(x.value, s));
    y.value = withTiming(clampY(y.value, s));
    savedScale.value = s;
    savedX.value = clampX(x.value, s);
    savedY.value = clampY(y.value, s);
  };

  const pinch = Gesture.Pinch()
    .onStart(() => {
      savedScale.value = scale.value;
    })
    .onUpdate((e) => {
      scale.value = Math.min(MAX_SCALE * 1.2, Math.max(0.8, savedScale.value * e.scale));
    })
    .onEnd(settle);

  const pan = Gesture.Pan()
    .averageTouches(true)
    .onStart(() => {
      savedX.value = x.value;
      savedY.value = y.value;
    })
    .onUpdate((e) => {
      if (scale.value <= 1) return;
      x.value = savedX.value + e.translationX;
      y.value = savedY.value + e.translationY;
    })
    .onEnd(settle);

  const doubleTap = Gesture.Tap()
    .numberOfTaps(2)
    .onEnd(() => {
      const zoomIn = scale.value <= 1;
      const s = zoomIn ? DOUBLE_TAP_SCALE : 1;
      scale.value = withTiming(s);
      x.value = withTiming(0);
      y.value = withTiming(0);
      savedScale.value = s;
      savedX.value = 0;
      savedY.value = 0;
    });

  const gesture = Gesture.Simultaneous(pinch, pan, doubleTap);

  const picture = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }, { translateY: y.value }, { scale: scale.value }],
  }));

  // .set() rather than "= ", which the React Compiler lint rule requires
  // outside a worklet.
  const reset = () => {
    for (const v of [scale, savedScale]) v.set(1);
    for (const v of [x, y, savedX, savedY]) v.set(0);
  };

  return (
    <Modal visible={visible} animationType="fade" onRequestClose={onClose} onShow={reset} statusBarTranslucent>
      <GestureHandlerRootView style={styles.backdrop}>
        <GestureDetector gesture={gesture}>
          <Animated.View style={[StyleSheet.absoluteFill, picture]}>
            {source ? <Image source={source} style={StyleSheet.absoluteFill} contentFit="contain" accessibilityLabel={label} /> : null}
          </Animated.View>
        </GestureDetector>
        <SafeAreaView style={styles.chrome} edges={['top', 'bottom']} pointerEvents="box-none">
          <Pressable accessibilityRole="button" accessibilityLabel="Close" onPress={onClose} style={styles.close} hitSlop={8}>
            <Text style={styles.closeGlyph}>×</Text>
          </Pressable>
          <Text style={styles.hint} pointerEvents="none">
            Pinch to zoom · double-tap to zoom in
          </Text>
        </SafeAreaView>
      </GestureHandlerRootView>
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
