import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { ImageSourcePropType, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { ImageViewer } from '../components/ImageViewer';
import { ProductPreview } from '../components/ProductPreview';
import { Body, Button, Screen, TitleBar } from '../components/ui';
import { STYLES, type DesignStyle } from '../data/catalog';
import { useAppState } from '../state/AppState';
import { colors, fonts } from '../theme';

// THE STYLE GALLERY (added 8 Nov 2026).
//
// Before this, the only way to see what the app makes was to upload a photo
// first. Here a customer can look through every style, see real designs and
// one on a shirt, and then start with the style they liked already picked.
// Nothing is uploaded or used up on this screen.

const TILE = 150;

export default function Styles() {
  const { setStyleId } = useAppState();
  const [viewing, setViewing] = useState<{ source: ImageSourcePropType; label: string } | null>(null);

  function start(style?: DesignStyle) {
    if (style) setStyleId(style.id);
    router.push('/upload');
  }

  return (
    <Screen footer={<Button title="Get started" onPress={() => start()} />}>
      <TitleBar title="The styles" />
      <Body>
        {STYLES.length} ways to draw your pet. Every design is made fresh from your photo, so yours will be one of a kind. Tap a picture to see it bigger.
      </Body>

      {STYLES.map((s) => {
        const pictures = [s.sample, ...(s.examples ?? [])];
        return (
          <View key={s.id} style={styles.card}>
            <Text style={styles.name} accessibilityRole="header">
              {s.name}
            </Text>
            <Body style={{ fontSize: 15 }}>{s.blurb}</Body>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.strip}>
              {pictures.map((p, i) => (
                <Pressable
                  key={i}
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`${s.name} example ${i + 1}, tap to enlarge`}
                  onPress={() => setViewing({ source: p, label: `${s.name} example ${i + 1}` })}
                >
                  <Image source={p} style={styles.tile} contentFit="contain" />
                </Pressable>
              ))}
              <View style={styles.shirt}>
                <ProductPreview choice={{ product: 'tee', color: 'Natural', size: 'M' }} design={s.sample} size={TILE} />
              </View>
            </ScrollView>
            <Button variant="secondary" title={`Use ${s.name}`} onPress={() => start(s)} />
          </View>
        );
      })}

      <ImageViewer source={viewing?.source ?? null} visible={!!viewing} onClose={() => setViewing(null)} label={viewing?.label ?? ''} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: { gap: 10, padding: 14, borderRadius: 18, borderWidth: 1.5, borderColor: colors.agedCream, backgroundColor: colors.card },
  name: { fontFamily: fonts.display, fontSize: 24, color: colors.navy },
  strip: { gap: 10 },
  tile: { width: TILE, height: TILE, borderRadius: 10, backgroundColor: colors.paper },
  shirt: { width: TILE, height: TILE, borderRadius: 10, backgroundColor: colors.paper, overflow: 'hidden' },
});
