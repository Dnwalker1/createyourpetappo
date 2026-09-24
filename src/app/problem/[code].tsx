import { Image } from 'expo-image';
import { router, useLocalSearchParams } from 'expo-router';
import { ReactNode } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import { Alert, Body, Button, H1, Label, Screen, StepHeader, Tip } from '../../components/ui';
import { formatClockTime } from '../../lib/limits';
import { useAppState } from '../../state/AppState';
import { colors, fonts } from '../../theme';

const pawSunset = require('../../../assets/images/brand/paw-sunset-icon.webp');
const pawNavy = require('../../../assets/images/brand/paw-navy-icon.webp');

// One route for every problem screen, keyed by the error that triggers it.
// See docs/app-spec.md > Error states.
export default function Problem() {
  const { code, reason, unlocksAt } = useLocalSearchParams<{ code: string; reason?: string; unlocksAt?: string }>();
  const { setPhoto } = useAppState();
  const unlock = unlocksAt ? formatClockTime(Number(unlocksAt)) : null;
  const newPhoto = () => {
    setPhoto(null);
    router.replace('/upload');
  };

  switch (code) {
    case 'upload-failed':
      return (
        <Screen footer={<><Button title="Try again" onPress={() => router.replace('/upload')} /><Button variant="secondary" title="Choose another photo" onPress={newPhoto} /></>}>
          <StepHeader step={1} />
          <H1>Add your photo</H1>
          <Alert title="Your photo didn't finish uploading">
            <Body>Check your connection and try again. Nothing was used up.</Body>
          </Alert>
          <View style={{ gap: 10 }}>
            <Label>IF IT KEEPS HAPPENING</Label>
            <Tip>Switch to Wi-Fi if you can.</Tip>
            <Tip>A phone photo is fine; very large files take longer.</Tip>
          </View>
        </Screen>
      );
    case 'checker-down':
      return (
        <Screen footer={<><Button title="Try again" onPress={() => router.replace('/style')} /><Button variant="secondary" title="Choose another photo" onPress={newPhoto} /></>}>
          <StepHeader step={1} />
          <Center>
            <H1 style={{ textAlign: 'center', fontSize: 24 }}>Our photo check is taking a short break</H1>
            <Body style={{ textAlign: 'center' }}>Try again in a minute. Nothing was used up, and your photo is still here.</Body>
          </Center>
        </Screen>
      );
    case 'no-pet':
      return (
        <Screen footer={<Button title="Choose a different photo" onPress={newPhoto} />}>
          <StepHeader step={1} />
          <H1>Add your photo</H1>
          <Alert title="We couldn't find a pet in this photo" icon={pawNavy}>
            <Body>We&apos;ve deleted it, and it won&apos;t count toward your 5 designs.</Body>
          </Alert>
          <View style={{ gap: 10 }}>
            <Label>GETTING A GOOD RESULT</Label>
            <Tip strong="Get close.">Your pet should fill most of the frame.</Tip>
            <Tip strong="Good light.">Eyes visible, face and markings clear.</Tip>
            <Tip strong="Skip the big scenery.">A small pet in a wide field or snowy landscape is hard to find.</Tip>
          </View>
        </Screen>
      );
    case 'photo-rejected':
      return (
        <Screen footer={<Button title="Choose a different photo" onPress={newPhoto} />}>
          <StepHeader step={1} />
          <H1>Add your photo</H1>
          <Alert title="We can't use this photo">
            {reason ? <Body style={{ color: colors.navy }}>{reason}</Body> : null}
            <Text style={styles.strong}>This won&apos;t count toward your 5 designs.</Text>
          </Alert>
          <View style={{ gap: 10 }}>
            <Label>A PHOTO THAT WORKS</Label>
            <Tip strong="Your own photo">of your own pet.</Tip>
            <Tip strong="No children,">yours or anyone else&apos;s.</Tip>
            <Tip strong="No logos, characters or brands,">and no other artist&apos;s work.</Tip>
            <Tip strong="Keep it decent.">No nudity, violence or hateful imagery.</Tip>
          </View>
          <Body style={{ fontSize: 14 }}>Uploads are checked automatically. Think we got it wrong? Email info@goodwookie.com.</Body>
        </Screen>
      );
    case 'design-failed':
      return (
        <Screen
          tone="dark"
          footer={
            <>
              <Button title="Try again" onPress={() => router.replace('/style')} />
              <Button variant="dark-secondary" title="New photo" onPress={newPhoto} />
            </>
          }
        >
          <StepHeader step={4} tone="dark" showBack={false} />
          <Center>
            <Image source={pawSunset} style={{ width: 120, height: 120, opacity: 0.55 }} contentFit="contain" />
            <H1 tone="dark" heavy style={{ textAlign: 'center', fontSize: 30 }}>
              That one didn&apos;t come out right
            </H1>
            <Body tone="dark" style={{ textAlign: 'center' }}>
              We couldn&apos;t get a clean design from this photo. A closer photo in good light usually fixes it.
            </Body>
            <Text style={styles.banner}>This one didn&apos;t work out, so it won&apos;t count toward your 5 designs.</Text>
          </Center>
        </Screen>
      );
    case 'limit':
      return (
        <DarkLimit title="That's five for now" body="Every design costs real money to make, so everyone gets five free designs in any 24 hours." unlockLabel="Your next free design unlocks at" unlock={unlock}>
          Designs that don&apos;t work out never count. Your designs are saved, and you can still order any of them.
        </DarkLimit>
      );
    case 'tries':
      return (
        <DarkLimit
          title="That's 12 tries today, which is the limit"
          body="Designs that don't work out never count toward your five, but there's a cap on tries to keep things fair for everyone."
          unlockLabel="You can try again at"
          unlock={unlock}
        >
          Something not working? Email info@goodwookie.com.
        </DarkLimit>
      );
    case 'busy':
    default:
      return (
        <Screen
          tone="dark"
          footer={
            <>
              <Button title="Try again" onPress={() => router.replace('/style')} />
              <Button variant="dark-secondary" title="See your designs" onPress={() => router.replace('/designs')} />
            </>
          }
        >
          <Center>
            <Image source={pawSunset} style={{ width: 130, height: 130 }} contentFit="contain" />
            <H1 tone="dark" heavy style={{ textAlign: 'center', fontSize: 30 }}>
              Our design studio is very busy right now
            </H1>
            <Body tone="dark" style={{ textAlign: 'center' }}>
              Lots of people are making designs at the moment. Please try again in a few minutes. Nothing was used up, and your photo and style are still here.
            </Body>
          </Center>
        </Screen>
      );
  }
}

function Center({ children }: { children: ReactNode }) {
  return <View style={styles.center}>{children}</View>;
}

function DarkLimit({ title, body, unlockLabel, unlock, children }: { title: string; body: string; unlockLabel: string; unlock: string | null; children: ReactNode }) {
  return (
    <Screen tone="dark" footer={<Button title="See your designs" onPress={() => router.replace('/designs')} />}>
      <Center>
        <Image source={pawSunset} style={{ width: 130, height: 130 }} contentFit="contain" />
        <H1 tone="dark" heavy style={{ textAlign: 'center', fontSize: 30 }}>
          {title}
        </H1>
        <Body tone="dark" style={{ textAlign: 'center', fontSize: 17 }}>
          {body}
        </Body>
        {unlock ? (
          <View style={styles.unlock}>
            <Text style={styles.unlockLabel}>{unlockLabel}</Text>
            <Text style={styles.unlockTime}>{unlock}</Text>
          </View>
        ) : null}
        <Body tone="dark" style={{ textAlign: 'center', fontSize: 15 }}>
          {children}
        </Body>
      </Center>
    </Screen>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 20 },
  strong: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.navy },
  banner: { padding: 12, borderRadius: 12, backgroundColor: colors.slate, color: colors.cream, fontFamily: fonts.bodySemi, fontSize: 15, textAlign: 'center', overflow: 'hidden' },
  unlock: { alignItems: 'center', gap: 4, paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14, borderWidth: 1.5, borderColor: colors.slate },
  unlockLabel: { fontFamily: fonts.body, fontSize: 15, color: colors.agedCream },
  unlockTime: { fontFamily: fonts.display, fontSize: 30, color: colors.gold },
});
