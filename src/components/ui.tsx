import { Image } from 'expo-image';
import { router } from 'expo-router';
import { ReactNode, RefObject } from 'react';
import { ImageSourcePropType, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleProp, StyleSheet, Text, TextStyle, View, ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { colors, fonts, radius } from '../theme';

type Tone = 'light' | 'dark';

export function Screen({
  children,
  tone = 'light',
  scroll = true,
  footer,
  scrollRef,
}: {
  children: ReactNode;
  tone?: Tone;
  scroll?: boolean;
  footer?: ReactNode;
  /** Lets a screen scroll a field into view when the keyboard opens. */
  scrollRef?: RefObject<ScrollView | null>;
}) {
  const bg = tone === 'dark' ? colors.navy : colors.cream;
  return (
    <SafeAreaView style={[styles.fill, { backgroundColor: bg }]} edges={['top', 'bottom']}>
      {/* The keyboard pushes the page up instead of covering the field being typed in. */}
      <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : 'height'}>
        {scroll ? (
          <ScrollView ref={scrollRef} contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            {children}
          </ScrollView>
        ) : (
          <View style={[styles.fill, styles.content]}>{children}</View>
        )}
        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

export function BackButton({ onPress }: { onPress?: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Back"
      onPress={onPress ?? (() => (router.canGoBack() ? router.back() : router.replace('/')))}
      style={styles.back}
    >
      <Text style={styles.backGlyph}>‹</Text>
    </Pressable>
  );
}

export function StepHeader({ step, label, tone = 'light', showBack = true }: { step: number; label?: string; tone?: Tone; showBack?: boolean }) {
  const on = tone === 'dark' ? colors.gold : colors.navy;
  const off = tone === 'dark' ? colors.slate : colors.agedCream;
  return (
    <View style={styles.row}>
      {showBack ? <BackButton /> : null}
      <View style={{ flex: 1, gap: 6 }}>
        <Text style={[styles.stepLabel, { color: tone === 'dark' ? colors.agedCream : colors.slate }]}>{label ?? `STEP ${step} OF 5`}</Text>
        <View style={styles.bars} accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 5, now: step }}>
          {[1, 2, 3, 4, 5].map((i) => (
            <View key={i} style={[styles.bar, { backgroundColor: i <= step ? on : off }]} />
          ))}
        </View>
      </View>
    </View>
  );
}

export function TitleBar({ title, right }: { title: string; right?: ReactNode }) {
  return (
    <View style={styles.row}>
      <BackButton />
      <Text style={[styles.h2, { flex: 1 }]} accessibilityRole="header">
        {title}
      </Text>
      {right}
    </View>
  );
}

export function H1({ children, tone = 'light', heavy, style }: { children: ReactNode; tone?: Tone; heavy?: boolean; style?: StyleProp<TextStyle> }) {
  return (
    <Text accessibilityRole="header" style={[heavy ? styles.heavy : styles.h1, { color: tone === 'dark' ? colors.cream : colors.navy }, style]}>
      {children}
    </Text>
  );
}

export function Body({ children, tone = 'light', style }: { children: ReactNode; tone?: Tone; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.body, { color: tone === 'dark' ? colors.agedCream : colors.slate }, style]}>{children}</Text>;
}

export function Label({ children, style }: { children: ReactNode; style?: StyleProp<TextStyle> }) {
  return <Text style={[styles.label, style]}>{children}</Text>;
}

type ButtonProps = { title: string; onPress?: () => void; disabled?: boolean; variant?: 'primary' | 'secondary' | 'dark-secondary' | 'link'; accessibilityLabel?: string };

export function Button({ title, onPress, disabled, variant = 'primary', accessibilityLabel }: ButtonProps) {
  const style: StyleProp<ViewStyle> =
    variant === 'primary'
      ? [styles.primary, disabled && styles.primaryDisabled]
      : variant === 'secondary'
        ? styles.secondary
        : variant === 'dark-secondary'
          ? styles.darkSecondary
          : styles.link;
  const text: StyleProp<TextStyle> =
    variant === 'primary'
      ? [styles.primaryText, disabled && { color: colors.slate }]
      : variant === 'dark-secondary'
        ? [styles.secondaryText, { color: colors.cream }]
        : styles.secondaryText;
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [style, pressed && !disabled && { opacity: 0.85 }]}
    >
      <Text style={text}>{variant === 'primary' ? title.toUpperCase() : title}</Text>
    </Pressable>
  );
}

export function Checkbox({ checked, onChange, children }: { checked: boolean; onChange: (v: boolean) => void; children: ReactNode }) {
  return (
    <Pressable accessibilityRole="checkbox" accessibilityState={{ checked }} onPress={() => onChange(!checked)} style={styles.checkRow}>
      <View style={[styles.checkBox, checked && styles.checkBoxOn]}>{checked ? <Text style={styles.checkMark}>✓</Text> : null}</View>
      <View style={{ flex: 1 }}>{children}</View>
    </Pressable>
  );
}

export function Tip({ strong, children }: { strong?: string; children: ReactNode }) {
  return (
    <View style={styles.tip}>
      <Text style={styles.tipMark}>✓</Text>
      <Text style={[styles.bodyText, { flex: 1 }]}>
        {strong ? <Text style={{ fontFamily: fonts.bodyBold }}>{strong} </Text> : null}
        {children}
      </Text>
    </View>
  );
}

export function Card({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.card, style]}>{children}</View>;
}

export function Alert({ title, children, icon }: { title: string; children?: ReactNode; icon?: ImageSourcePropType }) {
  return (
    <View accessibilityRole="alert" style={styles.alert}>
      <View style={styles.row}>
        {icon ? <Image source={icon} style={{ width: 36, height: 36 }} contentFit="contain" /> : <Text style={styles.alertIcon}>!</Text>}
        <Text style={styles.alertTitle}>{title}</Text>
      </View>
      {children}
    </View>
  );
}

export function Pill({ children, tone = 'light' }: { children: ReactNode; tone?: Tone }) {
  return (
    <View style={[styles.pill, { borderColor: tone === 'dark' ? colors.slate : colors.agedCream }]}>
      <Text style={[styles.pillText, { color: tone === 'dark' ? colors.cream : colors.navy }]}>{children}</Text>
    </View>
  );
}

export function Row({ children, style }: { children: ReactNode; style?: StyleProp<ViewStyle> }) {
  return <View style={[styles.row, style]}>{children}</View>;
}

export const styles = StyleSheet.create({
  fill: { flex: 1 },
  content: { flexGrow: 1, paddingHorizontal: 24, paddingTop: 12, paddingBottom: 24, gap: 16, width: '100%', maxWidth: 520, alignSelf: 'center' },
  footer: { paddingHorizontal: 24, paddingBottom: 12, gap: 8, width: '100%', maxWidth: 520, alignSelf: 'center' },
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  back: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.paper, alignItems: 'center', justifyContent: 'center' },
  backGlyph: { fontSize: 30, lineHeight: 32, color: colors.navy, fontFamily: fonts.bodyBold, marginTop: -3 },
  stepLabel: { fontFamily: fonts.display, fontSize: 13, letterSpacing: 2 },
  bars: { flexDirection: 'row', gap: 6 },
  bar: { flex: 1, height: 5, borderRadius: 3 },
  h1: { fontFamily: fonts.display, fontSize: 32, lineHeight: 38 },
  h2: { fontFamily: fonts.display, fontSize: 26, lineHeight: 32, color: colors.navy },
  heavy: { fontFamily: fonts.heavy, fontSize: 32, lineHeight: 36 },
  body: { fontFamily: fonts.body, fontSize: 16, lineHeight: 23 },
  bodyText: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.navy },
  label: { fontFamily: fonts.display, fontSize: 15, letterSpacing: 1, color: colors.navy },
  primary: { height: 56, borderRadius: radius.md, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 16 },
  primaryDisabled: { backgroundColor: colors.agedCream },
  primaryText: { fontFamily: fonts.display, fontSize: 19, letterSpacing: 1, color: colors.navy },
  secondary: { minHeight: 52, borderRadius: radius.md, borderWidth: 2, borderColor: colors.navy, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  darkSecondary: { minHeight: 52, borderRadius: radius.md, borderWidth: 2, borderColor: colors.slate, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 12 },
  link: { minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  secondaryText: { fontFamily: fonts.bodySemi, fontSize: 16, color: colors.navy },
  checkRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start', minHeight: 44 },
  checkBox: { width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: colors.navy, backgroundColor: colors.white, alignItems: 'center', justifyContent: 'center', marginTop: 1 },
  checkBoxOn: { backgroundColor: colors.navy },
  checkMark: { color: colors.cream, fontFamily: fonts.bodyBold, fontSize: 15, lineHeight: 18 },
  tip: { flexDirection: 'row', gap: 10 },
  tipMark: { color: colors.bronze, fontFamily: fonts.bodyBold, fontSize: 16 },
  card: { padding: 14, borderRadius: radius.md, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.agedCream, gap: 10 },
  alert: { padding: 16, borderRadius: 16, backgroundColor: colors.errorFill, borderWidth: 2, borderColor: colors.error, gap: 10 },
  alertIcon: { width: 28, height: 28, borderRadius: 14, backgroundColor: colors.error, color: colors.white, textAlign: 'center', fontFamily: fonts.bodyBold, fontSize: 18, lineHeight: 28 },
  alertTitle: { flex: 1, fontFamily: fonts.bodyBold, fontSize: 18, color: colors.error },
  pill: { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16, borderWidth: 1.5 },
  pillText: { fontFamily: fonts.bodySemi, fontSize: 14 },
});
