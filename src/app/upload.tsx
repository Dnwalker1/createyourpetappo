import Constants from 'expo-constants';
import { Image } from 'expo-image';
import * as ImagePicker from 'expo-image-picker';
import { router } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Platform, StyleSheet, Text, View } from 'react-native';
import { Body, Button, Checkbox, H1, Label, Screen, StepHeader, Tip } from '../components/ui';
import { problemRoute } from '../lib/errorRoute';
import { useAppState } from '../state/AppState';
import { colors, fonts } from '../theme';

const pawNavy = require('../../assets/images/brand/paw-navy-icon.webp');
const PRIVACY_URL: string = Constants.expoConfig?.extra?.privacyPolicyUrl ?? 'https://www.goodwookie.com/terms-and-conditions';

export default function Upload() {
  const { photo, setPhoto, uploadPhoto } = useAppState();
  const [ownsPhoto, setOwnsPhoto] = useState(false);
  const [aiConsent, setAiConsent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  async function pick(source: 'camera' | 'library') {
    setNotice(null);
    if (source === 'camera') {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (!perm.granted) {
        setNotice('Camera access is off. You can turn it on in Settings, or choose a photo instead.');
        return;
      }
    }
    const options: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.85 };
    const result = source === 'camera' ? await ImagePicker.launchCameraAsync(options) : await ImagePicker.launchImageLibraryAsync(options);
    if (result.canceled || !result.assets?.[0]) return;
    const a = result.assets[0];
    setPhoto({ uri: a.uri, mimeType: a.mimeType ?? undefined, fileName: a.fileName ?? undefined });
  }

  async function onContinue() {
    setBusy(true);
    try {
      await uploadPhoto();
      router.push('/style');
    } catch (e) {
      router.push(problemRoute(e) as never);
    } finally {
      setBusy(false);
    }
  }

  const ready = !!photo && ownsPhoto && aiConsent && !busy;

  return (
    <Screen footer={<Button title={busy ? 'Uploading…' : 'Continue'} disabled={!ready} onPress={onContinue} />}>
      <StepHeader step={1} />
      <View style={{ gap: 6 }}>
        <H1>Add your photo</H1>
        <Body>One photo is all it takes. You can try every style on it without uploading again.</Body>
      </View>

      <View style={styles.drop}>
        {photo ? (
          <Image source={{ uri: photo.uri }} style={StyleSheet.absoluteFill} contentFit="cover" accessibilityLabel="Your pet photo" />
        ) : (
          <>
            <Image source={pawNavy} style={{ width: 48, height: 48 }} contentFit="contain" />
            <Text style={styles.dropTitle}>Any animal works</Text>
            <Body style={{ textAlign: 'center', fontSize: 15 }}>Dogs, cats, horses, the goat you swore you weren&apos;t going to name.</Body>
          </>
        )}
        {busy ? <ActivityIndicator style={StyleSheet.absoluteFill} color={colors.navy} /> : null}
      </View>

      <View style={styles.twoUp}>
        {Platform.OS !== 'web' ? (
          <View style={{ flex: 1 }}>
            <Button variant="secondary" title="Take photo" onPress={() => pick('camera')} />
          </View>
        ) : null}
        <View style={{ flex: 1 }}>
          <Button variant="secondary" title={photo ? 'Choose another' : 'Choose photo'} onPress={() => pick('library')} />
        </View>
      </View>
      {notice ? <Body style={{ color: colors.error }}>{notice}</Body> : null}

      <View style={{ gap: 10 }}>
        <Label>GETTING A GOOD RESULT</Label>
        <Tip strong="Get close.">Your pet should fill most of the frame.</Tip>
        <Tip strong="Good light.">Eyes visible, face and markings clear. A phone photo is fine.</Tip>
        <Tip strong="More than one pet?">Put them in one photo. Two or three works best.</Tip>
      </View>

      <View style={styles.consent}>
        <Checkbox checked={ownsPhoto} onChange={setOwnsPhoto}>
          <Text style={styles.consentText}>I own this photo and there are no children in it.</Text>
        </Checkbox>
        <Checkbox checked={aiConsent} onChange={setAiConsent}>
          <Text style={styles.consentText}>
            I agree that my photo, and any text I add, is sent to Google&apos;s Gemini AI to create my design and run safety checks.{' '}
            <Text accessibilityRole="link" style={styles.link} onPress={() => WebBrowser.openBrowserAsync(PRIVACY_URL)}>
              Privacy policy
            </Text>
          </Text>
        </Checkbox>
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  drop: {
    height: 170,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: colors.bronze,
    borderRadius: 20,
    backgroundColor: colors.paper,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: 14,
    overflow: 'hidden',
  },
  dropTitle: { fontFamily: fonts.bodySemi, fontSize: 17, color: colors.navy },
  twoUp: { flexDirection: 'row', gap: 12 },
  consent: { gap: 10, padding: 14, borderRadius: 14, backgroundColor: colors.paper },
  consentText: { fontFamily: fonts.body, fontSize: 14, lineHeight: 20, color: colors.navy },
  link: { fontFamily: fonts.bodyBold, textDecorationLine: 'underline' },
});
