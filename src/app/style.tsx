import { Image } from "expo-image";
import { router } from "expo-router";
import { useRef, useState } from "react";
import {
  Keyboard,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  useWindowDimensions,
  View,
} from "react-native";
import { ApiError } from "../api";
import { ImageViewer } from "../components/ImageViewer";
import { LimitsLine } from "../components/LimitsLine";
import { ProductPreview } from "../components/ProductPreview";
import {
  Alert,
  Body,
  Button,
  Checkbox,
  H1,
  Screen,
  StepHeader,
} from "../components/ui";
import {
  JOB_TITLES,
  MAX_TEXT_LENGTH,
  PORTRAIT_SITTINGS,
  STYLES,
  jobLabel,
  styleById,
  type DesignStyle,
} from "../data/catalog";
import { problemRoute } from "../lib/errorRoute";
import { useAppState } from "../state/AppState";
import { colors, fonts } from "../theme";

export default function Style() {
  const {
    photo,
    styleId,
    setStyleId,
    job,
    setJob,
    sitting,
    setSitting,
    text,
    setText,
    includePeople,
    setIncludePeople,
    peopleConsent,
    setPeopleConsent,
    startDesign,
  } = useAppState();
  const [busy, setBusy] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [inProgress, setInProgress] = useState(false);
  const [checkerBusy, setCheckerBusy] = useState(false);
  const style = styleById(styleId);
  const needsJob =
    (!!style.jobPicker && !job) || (!!style.sittingPicker && !sitting);
  // Where the text field sits on the page, so it can be scrolled above the keyboard.
  const scrollRef = useRef<ScrollView>(null);
  // The text field now sits inside the chosen style's card, so its place on
  // the page is the card's position plus the field's position in the card.
  const cardY = useRef(0);
  const textY = useRef(0);
  const [viewing, setViewing] = useState<DesignStyle | null>(null);
  // Two pictures side by side in each card: the design and the design on a
  // shirt. Page width less the page and card padding, split in two.
  const { width } = useWindowDimensions();
  const tile = Math.floor((Math.min(width, 520) - 48 - 24 - 6 - 10) / 2);
  function showTextField() {
    const scroll = () =>
      scrollRef.current?.scrollTo({
        y: Math.max(0, cardY.current + textY.current - 24),
        animated: true,
      });
    // Wait for the keyboard to finish opening, then scroll.
    const sub = Keyboard.addListener("keyboardDidShow", () => {
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
      router.push({ pathname: "/generating", params: { designId } });
    } catch (e) {
      if (e instanceof ApiError && e.code === "TEXT_REJECTED") {
        setTextError(
          "That one can't go on a shirt. It reads as a trademark or a word we don't print. Try your pet's actual name.",
        );
      } else if (e instanceof ApiError && e.code === "DESIGN_IN_PROGRESS") {
        setInProgress(true);
      } else if (e instanceof ApiError && e.code === "PEOPLE_CONSENT_NEEDED") {
        setIncludePeople(true);
        setPeopleConsent(false);
      } else if (e instanceof ApiError && e.code === "TEXT_CHECKER_DOWN") {
        setCheckerBusy(true);
      } else {
        router.push(problemRoute(e) as never);
      }
    } finally {
      setBusy(false);
    }
  }

  // The chosen style's own choices, shown inside its card.
  function renderOptions() {
    return style.jobPicker ? (
      <View style={{ gap: 8 }}>
        <Text nativeID="jobLabel" style={styles.fieldLabel}>
          Pick your pet&apos;s job
        </Text>
        <View
          style={styles.jobs}
          accessibilityRole="radiogroup"
          accessibilityLabelledBy="jobLabel"
        >
          {JOB_TITLES.map((t) => {
            const on = t === job;
            return (
              <Pressable
                key={t}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setJob(t)}
                style={[styles.job, on && styles.jobOn]}
              >
                <Text style={[styles.jobText, on && { color: colors.cream }]}>
                  {jobLabel(t)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Body style={{ fontSize: 14 }}>
          The job title goes on the banner. Several pets in one photo become one
          crew, and the title goes plural (Head Chefs).
        </Body>
      </View>
    ) : style.sittingPicker ? (
      <View style={{ gap: 8 }}>
        <Text nativeID="sittingLabel" style={styles.fieldLabel}>
          Pick your pet&apos;s portrait
        </Text>
        <View
          style={styles.jobs}
          accessibilityRole="radiogroup"
          accessibilityLabelledBy="sittingLabel"
        >
          {PORTRAIT_SITTINGS.map((t) => {
            const on = t === sitting;
            return (
              <Pressable
                key={t}
                accessibilityRole="radio"
                accessibilityState={{ selected: on }}
                onPress={() => setSitting(t)}
                style={[styles.job, on && styles.jobOn]}
              >
                <Text style={[styles.jobText, on && { color: colors.cream }]}>
                  {jobLabel(t)}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Body style={{ fontSize: 14 }}>
          Your pet gets dressed for the occasion. Several pets in one photo pose
          together, like a family portrait.
        </Body>
      </View>
    ) : style.allowsText ? (
      <View
        style={{ gap: 8 }}
        onLayout={(e) => (textY.current = e.nativeEvent.layout.y)}
      >
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
          style={[
            styles.input,
            textError ? { borderColor: colors.error, borderWidth: 2 } : null,
          ]}
        />
        {textError ? (
          <Text accessibilityRole="alert" style={styles.error}>
            {textError}
          </Text>
        ) : (
          <Body style={{ fontSize: 14 }}>
            Up to 18 characters. Letters, numbers and ! ? &amp; $ @ + # work.
            Profanity and trademarked names don&apos;t.
          </Body>
        )}
      </View>
    ) : (
      <View style={styles.note}>
        <Body style={{ fontSize: 15 }}>
          Names only fit on the Travel Stamp, the Travel Poster and the Anime
          Hero. This style lets the picture do the talking.
        </Body>
      </View>
    );
  }

  return (
    <Screen
      scrollRef={scrollRef}
      footer={
        <>
          <Button
            title={busy ? "Starting…" : "Generate design"}
            disabled={
              busy ||
              !!textError ||
              needsJob ||
              (includePeople && !peopleConsent)
            }
            onPress={generate}
          />
          {textError ? (
            <Button
              variant="link"
              title="Generate without text"
              onPress={() => {
                setText("");
                setTextError(null);
              }}
            />
          ) : null}
          <LimitsLine />
        </>
      }
    >
      <StepHeader step={3} label="STEPS 2 & 3 OF 5" />
      <View style={{ gap: 6 }}>
        <H1>Choose a style</H1>
        <Body>Try them all on the same photo. Decide afterward.</Body>
      </View>

      {photo ? (
        <View style={styles.photoRow}>
          <Image
            source={{ uri: photo.uri }}
            style={styles.photoThumb}
            contentFit="cover"
            accessibilityIgnoresInvertColors
          />
          <Body style={{ flex: 1, fontSize: 15 }}>Using this photo.</Body>
          <Button
            variant="link"
            title="Change"
            onPress={() => router.push("/upload")}
          />
        </View>
      ) : null}

      {/* THE STYLE CARDS (redone 10 Nov 2026, in the layout of the style
          gallery): one card per style, the design and the design on a shirt
          side by side, the name centred above. The chosen card opens to show
          its own choices — a job, a portrait, or the name — right under its
          pictures. Tap a picture to see it bigger. */}
      <View style={{ gap: 14 }} accessibilityRole="radiogroup">
        {STYLES.map((s) => {
          const on = s.id === styleId;
          return (
            <Pressable
              key={s.id}
              accessibilityRole="radio"
              accessibilityState={{ selected: on }}
              accessibilityLabel={`${s.name}. ${s.blurb}`}
              onPress={() => {
                setStyleId(s.id);
                setTextError(null);
              }}
              onLayout={
                on ? (e) => (cardY.current = e.nativeEvent.layout.y) : undefined
              }
              style={[styles.card, on ? styles.cardOn : null]}
            >
              <Text style={styles.cardTitle}>{s.name}</Text>
              <View style={styles.pair}>
                <Pressable
                  accessibilityRole="imagebutton"
                  accessibilityLabel={`${s.name} sample, tap to enlarge`}
                  onPress={() => {
                    setStyleId(s.id);
                    setTextError(null);
                    setViewing(s);
                  }}
                >
                  <Image
                    source={s.sample}
                    style={[styles.sample, { width: tile, height: tile }]}
                    contentFit="contain"
                  />
                </Pressable>
                <View style={[styles.shirt, { width: tile, height: tile }]}>
                  <ProductPreview
                    choice={{ product: "tee", color: "Natural", size: "M" }}
                    design={s.sample}
                    size={tile}
                  />
                </View>
              </View>
              <Body style={styles.blurb}>{s.blurb}</Body>
              {on ? (
                <View style={styles.options}>{renderOptions()}</View>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <View style={styles.people}>
        <View style={styles.peopleRow}>
          <View style={{ flex: 1, gap: 2 }}>
            <Text nativeID="peopleLabel" style={styles.fieldLabel}>
              Include the people in my photo
            </Text>
            <Body style={{ fontSize: 14 }}>
              {includePeople
                ? "Everyone in the photo is drawn together with your pets."
                : "Off: only your pets are drawn."}
            </Body>
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
            <Text style={styles.consentText}>
              Everyone in this photo is 13 or older, fully clothed, and agreed
              to be in it. I&apos;m the parent or guardian of anyone under 18,
              or have their permission.
            </Text>
          </Checkbox>
        ) : null}
      </View>

      {inProgress ? (
        <Alert title="A design is already being made">
          <Body>
            One at a time. The last design is still in the oven. Give it a
            minute.
          </Body>
        </Alert>
      ) : null}
      <ImageViewer
        source={viewing?.sample ?? null}
        visible={!!viewing}
        onClose={() => setViewing(null)}
        label={viewing ? `${viewing.name} sample` : ""}
      />
      {checkerBusy ? (
        <Alert title="Our text checker is busy">
          <Body>Try again in a minute. Nothing was used up.</Body>
        </Alert>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  photoRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  photoThumb: {
    width: 48,
    height: 48,
    borderRadius: 10,
    backgroundColor: colors.paper,
  },
  people: {
    gap: 12,
    padding: 14,
    borderRadius: 14,
    backgroundColor: colors.card,
    borderWidth: 1.5,
    borderColor: colors.agedCream,
  },
  peopleRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  consentText: { fontFamily: fonts.body, fontSize: 15, color: colors.navy },
  card: {
    gap: 10,
    padding: 12,
    borderRadius: 18,
    borderWidth: 3,
    borderColor: colors.agedCream,
    backgroundColor: colors.card,
  },
  cardOn: { borderColor: colors.navy },
  cardTitle: {
    fontFamily: fonts.display,
    fontSize: 22,
    color: colors.navy,
    textAlign: "center",
  },
  pair: { flexDirection: "row", gap: 10, justifyContent: "center" },
  sample: { borderRadius: 10, backgroundColor: colors.paper },
  shirt: {
    borderRadius: 10,
    backgroundColor: colors.paper,
    overflow: "hidden",
  },
  blurb: { fontSize: 14, textAlign: "center" },
  options: {
    gap: 8,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: colors.agedCream,
  },
  labelRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
  },
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
  error: {
    fontFamily: fonts.body,
    fontSize: 15,
    lineHeight: 21,
    color: colors.error,
  },
  note: { padding: 14, borderRadius: 14, backgroundColor: colors.paper },
  jobs: { flexDirection: "row", flexWrap: "wrap", gap: 8 },
  job: {
    minHeight: 44,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.agedCream,
    backgroundColor: colors.card,
    alignItems: "center",
    justifyContent: "center",
  },
  jobOn: { backgroundColor: colors.navy, borderColor: colors.navy },
  jobText: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.navy },
});
