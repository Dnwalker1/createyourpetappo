import { router } from 'expo-router';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, fonts } from '../theme';

const TABS = [
  { key: 'create', label: 'Create', href: '/upload' },
  { key: 'designs', label: 'Your designs', href: '/designs' },
  { key: 'orders', label: 'My orders', href: '/orders' },
] as const;

export function BottomNav({ current }: { current: 'designs' | 'orders' }) {
  const insets = useSafeAreaInsets();
  return (
    <View accessibilityRole="tablist" style={[styles.bar, { paddingBottom: Math.max(insets.bottom, 12) }]}>
      {TABS.map((t) => {
        const on = t.key === current;
        return (
          <Pressable
            key={t.key}
            accessibilityRole="tab"
            accessibilityState={{ selected: on }}
            onPress={() => !on && router.replace(t.href)}
            style={styles.tab}
          >
            <Text style={[styles.label, on && styles.on]}>{t.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: { flexDirection: 'row', backgroundColor: colors.navy, paddingTop: 8, paddingHorizontal: 12 },
  tab: { flex: 1, minHeight: 48, alignItems: 'center', justifyContent: 'center' },
  label: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.agedCream },
  on: { fontFamily: fonts.bodyBold, color: colors.gold },
});
