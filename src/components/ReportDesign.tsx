import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, View } from 'react-native';
import { api } from '../api';
import { colors, fonts } from '../theme';
import { Body, Button } from './ui';

// Google Play requires apps that make AI-generated content to let people
// report offensive output without leaving the app. The report goes to the
// Wix backend, which marks the design for review (so it can't be printed
// without Don checking it) and emails Don.

const REASONS = [
  { id: 'offensive', label: 'Offensive or inappropriate' },
  { id: 'person', label: 'Shows a person it shouldn’t' },
  { id: 'other', label: 'Something else is wrong with it' },
] as const;

type Stage = 'closed' | 'choosing' | 'sending' | 'sent' | 'failed';

export function ReportDesign({ deviceId, designId }: { deviceId: string | null; designId: string }) {
  const [stage, setStage] = useState<Stage>('closed');
  const [reason, setReason] = useState<string | null>(null);

  async function send() {
    if (!deviceId || !reason) return;
    setStage('sending');
    try {
      await api.reportDesign(deviceId, designId, reason);
      setStage('sent');
    } catch {
      setStage('failed');
    }
  }

  const close = () => {
    setStage('closed');
    setReason(null);
  };

  return (
    <>
      <Text accessibilityRole="link" style={styles.link} onPress={() => setStage('choosing')}>
        Report this design
      </Text>
      <Modal visible={stage !== 'closed'} transparent animationType="fade" onRequestClose={close}>
        <View style={styles.backdrop}>
          <View style={styles.sheet} accessibilityViewIsModal>
            {stage === 'sent' ? (
              <>
                <Text style={styles.title}>Thanks. We&apos;ll take a look.</Text>
                <Body>This design has been set aside for a person to review. Nothing gets printed from it until that&apos;s done.</Body>
                <Button title="Close" onPress={close} />
              </>
            ) : (
              <>
                <Text style={styles.title}>What&apos;s wrong with this design?</Text>
                <View style={{ gap: 8 }}>
                  {REASONS.map((r) => (
                    <Pressable
                      key={r.id}
                      accessibilityRole="radio"
                      accessibilityState={{ selected: reason === r.id }}
                      onPress={() => setReason(r.id)}
                      style={[styles.option, reason === r.id && styles.optionOn]}
                    >
                      <Text style={styles.optionText}>{r.label}</Text>
                    </Pressable>
                  ))}
                </View>
                {stage === 'failed' ? <Body style={{ color: colors.error }}>That didn&apos;t send. Check your connection and try again.</Body> : null}
                <Button title={stage === 'sending' ? 'Sending…' : 'Send report'} disabled={!reason || stage === 'sending'} onPress={send} />
                <Button variant="link" title="Cancel" onPress={close} />
              </>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  link: { alignSelf: 'center', paddingVertical: 10, fontFamily: fonts.bodySemi, fontSize: 14, color: colors.slate, textDecorationLine: 'underline' },
  backdrop: { flex: 1, backgroundColor: 'rgba(22,32,42,0.6)', justifyContent: 'center', padding: 20 },
  sheet: { backgroundColor: colors.paper, borderRadius: 20, padding: 20, gap: 14 },
  title: { fontFamily: fonts.display, fontSize: 20, color: colors.navy },
  option: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 14, borderWidth: 1.5, borderColor: colors.agedCream, backgroundColor: colors.white },
  optionOn: { borderColor: colors.navy, borderWidth: 2 },
  optionText: { fontFamily: fonts.bodyMedium, fontSize: 16, color: colors.navy },
});
