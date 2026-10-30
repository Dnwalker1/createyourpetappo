import { Image } from 'expo-image';
import { useEffect, useState } from 'react';
import { ActivityIndicator, ImageSourcePropType, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { ProductChoice } from '../data/catalog';
import { colors, fonts } from '../theme';

// The design on the BACK of a tee or hoodie. The app only has front photos of
// the garments, so this asks the website for a Printful mockup of the back.
// While it's being made (10 to 30 seconds), or if it can't be made, the
// design is shown on its own with a note saying where it prints.

// One picture per design + product + colour, kept for the session, so
// switching back and forth doesn't ask Printful again.
const made = new Map<string, string | null>();

type Props = {
  deviceId: string | null;
  designId: string | null;
  choice: Extract<ProductChoice, { product: 'tee' | 'hoodie' }>;
  design: ImageSourcePropType | null;
  size?: number;
};

export function BackPreview({ deviceId, designId, choice, design, size = 220 }: Props) {
  // Size doesn't change the picture, so it's left out of the key.
  const key = designId ? `${designId}|${choice.product}|${choice.color}` : '';
  // The answer for the current key, once it arrives. Older answers are ignored.
  const [answer, setAnswer] = useState<{ key: string; url: string | null } | null>(null);
  const canAsk = Boolean(key && deviceId && designId);
  const url: string | null | undefined = !canAsk
    ? null
    : made.has(key)
      ? made.get(key)
      : answer?.key === key
        ? answer.url
        : undefined;

  useEffect(() => {
    if (!canAsk || made.has(key)) return;
    let live = true;
    api.backMockup(deviceId as string, designId as string, choice).then((u) => {
      made.set(key, u);
      if (live) setAnswer({ key, url: u });
    });
    return () => {
      live = false;
    };
    // choice is read for its product and colour, which are in the key.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key, canAsk]);

  if (url) {
    return (
      <Image
        source={{ uri: url }}
        style={{ width: size, height: size }}
        contentFit="contain"
        accessibilityLabel={`Your design on the back of a ${choice.color} ${choice.product === 'tee' ? 't-shirt' : 'hoodie'}`}
      />
    );
  }

  const loading = url === undefined;
  const d = size * 0.62;
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center', gap: 8 }}>
      {design ? <Image source={design} style={{ width: d, height: d }} contentFit="contain" /> : null}
      <View style={styles.row}>
        {loading ? <ActivityIndicator size="small" color={colors.navy} /> : null}
        <Text style={styles.note}>{loading ? 'Making the back preview…' : 'Printed on the back'}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  note: { fontFamily: fonts.bodySemi, fontSize: 13, color: colors.slate },
});
