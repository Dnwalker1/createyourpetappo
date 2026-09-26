import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useRef, useState } from 'react';
import { Keyboard, Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from 'react-native';
import { ApiError } from '../api';
import { Alert, Body, Button, Checkbox, H1, Screen, StepHeader } from '../components/ui';
import { MAX_TEXT_LENGTH, STYLES, styleById } from '../data/catalog';
import { problemRoute } from '../lib/errorRoute';
import { useAppState } from '../state/AppState';
import { colors, fonts } from '../theme';

export default function Style() {
  const { photo, styleId, setStyleId, text, setText, includePeople, setIncludePeople, peopleConsent, setPeopleConsent, startDesign } = useAppState();
  const [busy, setBusy] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState(false);
  const [checkerBusy, setCheckerBusy] = useState(false);
  const style = styleById(styleId);
  // Where the text field sits on the page, so it can be scrolled above the keyboard.
  const scrollRef = useRef<ScrollView>(null);
  const textY = useRef(0);
  function showTextField() {
    const scroll = () => scrollRef.current?.scrollTo({ y: Math.max(0, textY.current - 24), animated: true });
    // Wait for the keyboard to finish opening, then scroll.
    const sub = Keyboard.addListener('keyboardDidShow', () => {
      sub.remove();
      scroll();
    });
    setTimeout(scroll, 350);
  }

  async function generate() {
    setBusy(true);
    setTextError(null);
    setInProgress(false);
    setCheckerBusy(false);
    try {
      const designId = await startDesign();
      router.push({ pathname: '/generating', params: { designId } });
    } catch (e) {
      if (e instanceof ApiError && e.code === 'TEXT_REJECTED') {
        setTextError("That one can't go on a shirt. It reads as a trademark or a word we don't print. Try your pet's actual name.");
      } else if (e instanceof ApiError && e.code === 'DESIGN_IN_PROGRESS') {
        setInProgress(true);
      } else if (e instanceof ApiError && e.code === 'PEOPLE_CONSENT_NEEDED') {
        setIncludePeople(true);
        setPeopleConsent(false);
      } else if (e instanceof ApiError && e.code === 'TEXT_CHECKER_DOWN') {
        setCheckerBusy(true);
      } else {
        router.push(problemRoute(e) as never);
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <Screen
      scrollRef={scrollRef}
      footer={
        <>
          <Button title={busy ? 'Starting…' : 'Generate design'} disabled={busy || !!textError || (includePeople && !peopleConsent)} onPress={generate} />
          {textError ? (
            <Button
              variant="link"
              title="Generate without text"
              onPress={() => {
                setText('');
                setTextError(null);
              }}
            />
          ) : null}
        </>
      }
    >
      <StepHeader step={3} label="STEPS 2 & 3 OF 5" />
      <View style={{ gap: 6 }}>
        <H1>Choose a style</H1>
        <Body>Try all four on the same photo. Decide afterward.</Body>
      </View>

      {photo ? (
        <View style={styles.photoRow}>
          <Image source={{ uri: photo.uri }} style={styles.photoThumb} contentFit="cover" accessibilityIgnoresInvertColors />
          <Body style={{ flex: 1, fontSize: 15 }}>Using this photo.</Body>
          <Button variant="link" title="Change" onPress={() => router.push('/upload')} />
        </View>
      ) : null}

      <View style={styles.grid} accessibilityRole="radiogroup">
        {STYLES.map((s) => {
          const on = s.id === styleId;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              onPress={() => {
                setStyleId(s.id);
                setTextError(null);
              }}
              style={[styles.card, { borderColor: on ? colors.navy : colors.agedCream }]}
            >
              <Image source={s.sample} style={styles.sample} contentFit="contain" />
              <Text style={styles.cardTitle}>{s.name}</Text>
            </Pressable>
          );
        })}
      </View>

      {style.allowsText ? (
        <View style={{ gap: 8 }} onLayout={(e) => (textY.current = e.nativeEvent.layout.y)}>
          <View style={styles.labelRow}>
            <Text nativeID="textLabel" style={styles.fieldLabel}>
              Add text (optional)
            </Text>
            <Text style={styles.counter}>
              {text.length} / {MAX_TEXT_LENGTH}
            </Text>
          </View>
          <TextInput
            accessibilityLabelledBy="textLabel"
            accessibilityLabel="Text on your design"
            value={text}
            onChangeText={(t) => {
              setText(t.slice(0, MAX_TEXT_LENGTH));
              setTextError(null);
            }}
            maxLength={MAX_TEXT_LENGTH}
            onFocus={showTextField}
            returnKeyType="done"
            placeholder="Your pet's name"
            placeholderTextColor={colors.slate}
            style={[styles.input, textError ? { borderColor: colors.error, borderWidth: 2 } : null]}
          />
          {textError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {textError}
            </Text>
          ) : (
            <Body style={{ fontSize: 14 }}>Up to 18 characters. Your pet&apos;s name works. Profanity and trademarked names don&apos;t.</Body>
          )}
        </View>
      ) : (
        <View style={styles.note}>
          <Body style={{ fontSize: 15 }}>Words only fit on the Travel Stamp and the Travel Poster. The other two let the picture do the talking.</Body>
        </View>
      )}

      <View style={styles.people}>
        <View style={styles.peopleRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text nativeID="peopleLabel" style={styles.fieldLabel}>
              Include the people in my photo
            </Text>
            <Body style={{ fontSize: 14 }}>{includePeople ? 'Everyone in the photo is drawn together with your pets.' : 'Off: only your pets are drawn.'}</Body>
          </View>
          <Switch
            accessibilityLabelledBy="peopleLabel"
            accessibilityLabel="Include the people in my photo"
            value={includePeople}
            onValueChange={setIncludePeople}
            trackColor={{ false: colors.agedCream, true: colors.navy }}
            thumbColor={colors.white}
            ios_backgroundColor={colors.agedCream}
          />
        </View>
        {includePeople ? (
          <Checkbox checked={peopleConsent} onChange={setPeopleConsent}>
            <Text style={styles.consentText}>Everyone in this photo is 18 or older and agreed to be in the design.</Text>
          </Checkbox>
        ) : null}
      </View>

      {inProgress ? (
        <Alert title="A design is already being made">
          <Body>One at a time. The last design is still in the oven. Give it a minute.</Body>
        </Alert>
      ) : null}
      {checkerBusy ? (
        <Alert title="Our text checker is busy">
          <Body>Try again in a minute. Nothing was used up.</Body>
        </Alert>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  photoThumb: { width: 48, height: 48, borderRadius: 10, backgroundColor: colors.paper },
  people: { gap: 12, padding: 14, borderRadius: 14, backgroundColor: colors.card, borderWidth: 1.5, borderColor: colors.agedCream },
  peopleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  consentText: { fontFamily: fonts.body, fontSize: 15, color: colors.navy },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  card: { width: '47%', flexGrow: 1, padding: 8, borderRadius: 18, borderWidth: 3, backgroundColor: colors.card },
  sample: { width: '100%', height: 124, borderRadius: 10, backgroundColor: colors.paper },
  cardTitle: { paddingTop: 8, paddingHorizontal: 4, fontFamily: fonts.bodyBold, fontSize: 16, color: colors.navy },
  labelRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'baseline' },
  fieldLabel: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.navy },
  counter: { fontFamily: fonts.body, fontSize: 14, color: colors.slate },
  input: {
    height: 50,
    paddingHorizontal: 16,
    borderWidth: 1.5,
    borderColor: colors.agedCream,
    borderRadius: 12,
    backgroundColor: colors.card,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.navy,
  },
  error: { fontFamily: fonts.body, fontSize: 15, lineHeight: 21, color: colors.error },
  note: { padding: 14, borderRadius: 14, backgroundColor: colors.paper },
});
