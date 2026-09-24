import { Image } from 'expo-image';
import { router, useFocusEffect } from 'expo-router';
import { useCallback, useState } from 'react';
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, Design } from '../api';
import { BottomNav } from '../components/BottomNav';
import { Body, Button } from '../components/ui';
import { styleById } from '../data/catalog';
import { useLimits } from '../lib/useLimits';
import { useAppState } from '../state/AppState';
import { colors, fonts } from '../theme';

const pawNavy = require('../../assets/images/brand/paw-navy-icon.webp');

export default function Designs() {
  const { deviceId, setActiveDesign } = useAppState();
  const { line } = useLimits();
  const [designs, setDesigns] = useState<Design[] | null>(null);

  useFocusEffect(
    useCallback(() => {
      if (!deviceId) return;
      let live = true;
      api
        .listDesigns(deviceId)
        .then((d) => live && setDesigns(d))
        .catch(() => live && setDesigns([]));
      return () => {
        live = false;
      };
    }, [deviceId]),
  );

  return (
    <SafeAreaView style={styles.fill} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View style={styles.titleRow}>
            <Image source={pawNavy} style={{ width: 44, height: 44 }} contentFit="contain" />
            <Text style={styles.title} accessibilityRole="header">
              Your designs
            </Text>
          </View>
          <Pressable accessibilityRole="button" accessibilityLabel="New design" onPress={() => router.push('/upload')} style={styles.add}>
            <Text style={styles.addText}>+</Text>
          </Pressable>
        </View>
        <Body style={{ fontSize: 15 }}>Everything you made in the last 7 days. Tap one to see it on your shirt again. It won&apos;t use another design.</Body>
        {line ? <Text style={styles.limit}>{line}</Text> : null}

        {designs === null ? <ActivityIndicator color={colors.navy} /> : null}
        {designs && !designs.length ? (
          <View style={{ gap: 12 }}>
            <Body>No designs yet.</Body>
            <Button title="Make your first design" onPress={() => router.push('/upload')} />
          </View>
        ) : null}
        <View style={styles.grid}>
          {designs?.map((d) => (
            <Pressable
              key={d.id}
              accessibilityRole="button"
              accessibilityLabel={`${styleById(d.styleId).name} design`}
              style={styles.item}
              onPress={() => {
                setActiveDesign(d);
                router.push('/result');
              }}
            >
              <Image source={d.preview ?? undefined} style={styles.image} contentFit="contain" />
              <Text style={styles.itemTitle}>{styleById(d.styleId).name}</Text>
            </Pressable>
          ))}
        </View>
        <Body style={{ fontSize: 13 }}>Designs you don&apos;t order are deleted automatically after 7 days.</Body>
      </ScrollView>
      <BottomNav current="designs" />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, paddingTop: 12, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  title: { fontFamily: fonts.display, fontSize: 32, color: colors.navy },
  add: { width: 44, height: 44, borderRadius: 22, backgroundColor: colors.gold, alignItems: 'center', justifyContent: 'center' },
  addText: { fontFamily: fonts.bodyBold, fontSize: 26, lineHeight: 28, color: colors.navy },
  limit: { fontFamily: fonts.bodySemi, fontSize: 14, color: colors.bronze },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  item: { width: '47%', gap: 8 },
  image: { width: '100%', height: 160, borderRadius: 16, backgroundColor: colors.paper },
  itemTitle: { fontFamily: fonts.bodyBold, fontSize: 16, color: colors.navy },
});
