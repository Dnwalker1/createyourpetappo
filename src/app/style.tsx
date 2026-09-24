import { Image } from 'expo-image';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { ApiError } from '../api';
import { Alert, Body, Button, H1, Screen, StepHeader } from '../components/ui';
import { MAX_TEXT_LENGTH, STYLES, styleById } from '../data/catalog';
import { problemRoute } from '../lib/errorRoute';
import { useAppState } from '../state/AppState';
import { colors, fonts } from '../theme';

export default function Style() {
  const { styleId, setStyleId, text, setText, startDesign } = useAppState();
  const [busy, setBusy] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState(false);
  const [checkerBusy, setCheckerBusy] = useState(false);
  const style = styleById(styleId);

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
        setTextError("That text can't be printed. Please avoid profanity and trademarked names or titles. Try your pet's own name instead.");
      } else if (e instanceof ApiError && e.code === 'DESIGN_IN_PROGRESS') {
        setInProgress(true);
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
      footer={
        <>
          <Button title={busy ? 'Starting…' : 'Generate design'} disabled={busy || !!textError} onPress={generate} />
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
        <Body>Try all four on the same photo and decide afterward.</Body>
      </View>

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
        <View style={{ gap: 8 }}>
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
            placeholder="Your pet's name"
            placeholderTextColor={colors.slate}
            style={[styles.input, textError ? { borderColor: colors.error, borderWidth: 2 } : null]}
          />
          {textError ? (
            <Text accessibilityRole="alert" style={styles.error}>
              {textError}
            </Text>
          ) : (
            <Body style={{ fontSize: 14 }}>Up to 18 characters. No profanity or protected names, or the design is rejected.</Body>
          )}
        </View>
      ) : (
        <View style={styles.note}>
          <Body style={{ fontSize: 15 }}>Text can be added to the Travel Stamp and Travel Poster styles.</Body>
        </View>
      )}

      {inProgress ? (
        <Alert title="A design is already being made">
          <Body>Only one design can be made at a time. Wait for it to finish, then try again.</Body>
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
