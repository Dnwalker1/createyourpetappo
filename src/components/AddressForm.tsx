import { ComponentProps, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { OrderAddress } from '../api';
import { colors, fonts } from '../theme';
import { Body, Button } from './ui';

// The "Change address" form for an order that is still In review.
//
// Added 1 Nov 2026, after a customer typed her house number one digit off and
// the order was headed for an empty lot. The checkout itself is Wix's page, so
// mistakes can't be stopped there; this is where they get fixed.
//
// Country stays what it was: changing country can change shipping and tax,
// which the order has already been charged for.

type Field = 'name' | 'line1' | 'line2' | 'city' | 'state' | 'zip';

const US_STATE = /^[A-Za-z]{2}$/;
const US_ZIP = /^\d{5}(-\d{4})?$/;

export function problemsWith(a: OrderAddress): Partial<Record<Field, string>> {
  const p: Partial<Record<Field, string>> = {};
  if (!a.name.trim()) p.name = 'Who is it going to?';
  if (!a.line1.trim()) p.line1 = 'Street address, please.';
  else if (!/\d/.test(a.line1)) p.line1 = 'Include the house or building number.';
  if (!a.city.trim()) p.city = 'City, please.';
  if (a.country === 'US') {
    if (!US_STATE.test(a.state.trim())) p.state = 'Two letters, like TN.';
    if (!US_ZIP.test(a.zip.trim())) p.zip = 'Five digits, like 37774.';
  } else if (!a.zip.trim()) {
    p.zip = 'Postal code, please.';
  }
  return p;
}

export function AddressForm({
  visible,
  initial,
  onCancel,
  onSave,
}: {
  visible: boolean;
  initial: OrderAddress;
  onCancel: () => void;
  /** Resolves when saved; throws with a customer-ready message to show. */
  onSave: (a: OrderAddress) => Promise<void>;
}) {
  const [a, setA] = useState<OrderAddress>(initial);
  const [shown, setShown] = useState(false); // show field problems only after a first try
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const problems = problemsWith(a);
  const set = (k: Field) => (v: string) => {
    setA((x) => ({ ...x, [k]: k === 'state' ? v.toUpperCase() : v }));
    setError(null);
  };

  async function save() {
    setShown(true);
    if (Object.keys(problems).length) return;
    setSaving(true);
    setError(null);
    try {
      await onSave({ ...a, state: a.state.trim().toUpperCase(), zip: a.zip.trim() });
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : 'That didn’t save. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  // `half`: one of the two fields side by side (State and ZIP).
  const field = (k: Field, label: string, props: Partial<ComponentProps<typeof TextInput>> = {}, half = false) => (
    <View style={[{ gap: 4 }, half && { flex: 1 }]}>
      <Text nativeID={`addr-${k}`} style={styles.label}>
        {label}
      </Text>
      <TextInput
        accessibilityLabelledBy={`addr-${k}`}
        accessibilityLabel={label}
        value={a[k]}
        onChangeText={set(k)}
        style={[styles.input, shown && problems[k] ? styles.inputBad : null]}
        placeholderTextColor={colors.slate}
        {...props}
      />
      {shown && problems[k] ? <Text style={styles.problem}>{problems[k]}</Text> : null}
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onCancel} onShow={() => { setA(initial); setShown(false); setError(null); }}>
      <SafeAreaView style={styles.fill}>
        <KeyboardAvoidingView style={styles.fill} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
            <Text style={styles.title} accessibilityRole="header">
              Change the address
            </Text>
            <Body style={{ fontSize: 15 }}>Check every number. This is exactly where the package goes.</Body>
            {field('name', 'Full name', { autoComplete: 'name', textContentType: 'name' })}
            {field('line1', 'Street address', { autoComplete: 'address-line1', textContentType: 'streetAddressLine1' })}
            {field('line2', 'Apartment, suite, lot (optional)', { autoComplete: 'address-line2', textContentType: 'streetAddressLine2' })}
            {field('city', 'City', { autoComplete: 'postal-address-locality', textContentType: 'addressCity' })}
            <View style={styles.row}>
              {field('state', a.country === 'US' ? 'State' : 'State / region', { autoCapitalize: 'characters', maxLength: a.country === 'US' ? 2 : 40, autoComplete: 'postal-address-region', textContentType: 'addressState' }, true)}
              {field('zip', a.country === 'US' ? 'ZIP' : 'Postal code', { keyboardType: a.country === 'US' ? 'number-pad' : 'default', autoComplete: 'postal-code', textContentType: 'postalCode' }, true)}
            </View>
            <Body style={{ fontSize: 14 }}>Country: {a.country}. To ship to a different country, email info@goodwookie.com.</Body>
            {error ? (
              <Text accessibilityRole="alert" style={styles.problem}>
                {error}
              </Text>
            ) : null}
          </ScrollView>
          <View style={styles.footer}>
            <Button title={saving ? 'Saving…' : 'Save address'} disabled={saving} onPress={save} />
            <Button variant="link" title="Cancel" onPress={onCancel} />
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  fill: { flex: 1, backgroundColor: colors.cream },
  content: { padding: 24, gap: 14, width: '100%', maxWidth: 520, alignSelf: 'center' },
  title: { fontFamily: fonts.display, fontSize: 28, color: colors.navy },
  row: { flexDirection: 'row', gap: 12 },
  label: { fontFamily: fonts.bodySemi, fontSize: 15, color: colors.navy },
  input: {
    height: 50,
    paddingHorizontal: 14,
    borderWidth: 1.5,
    borderColor: colors.agedCream,
    borderRadius: 12,
    backgroundColor: colors.card,
    fontFamily: fonts.body,
    fontSize: 17,
    color: colors.navy,
  },
  inputBad: { borderColor: colors.error, borderWidth: 2 },
  problem: { fontFamily: fonts.body, fontSize: 14, color: colors.error },
  footer: { padding: 16, gap: 4, borderTopWidth: 1, borderTopColor: colors.agedCream, width: '100%', maxWidth: 520, alignSelf: 'center' },
});
