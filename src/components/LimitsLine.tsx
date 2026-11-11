import { StyleSheet, Text } from "react-native";
import { useLimits } from "../lib/useLimits";
import { colors, fonts } from "../theme";

// "3 of 5 designs available · next one unlocks tomorrow at 7:30 AM", under the
// main button on Steps 1 and 2-3 (added 10 Nov 2026), so a customer knows
// where they stand before spending one. Nothing shows until the count arrives.
export function LimitsLine() {
  const { line } = useLimits();
  if (!line) return null;
  return (
    <Text style={styles.line} accessibilityLiveRegion="polite">
      {line}
    </Text>
  );
}

const styles = StyleSheet.create({
  line: {
    fontFamily: fonts.bodySemi,
    fontSize: 13,
    color: colors.slate,
    textAlign: "center",
  },
});
