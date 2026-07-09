import { StyleSheet, Text, TextInput, View } from "react-native";
import { colors } from "../theme/colors";

interface TextFieldProps {
  label: string;
  value: string;
  placeholder?: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: "default" | "phone-pad" | "number-pad";
  error?: string | null;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
}

export function TextField({
  autoCapitalize = "sentences",
  autoCorrect = false,
  error,
  keyboardType = "default",
  label,
  onChangeText,
  placeholder,
  secureTextEntry,
  value,
}: TextFieldProps) {
  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <TextInput
        autoCapitalize={autoCapitalize}
        autoCorrect={autoCorrect}
        keyboardType={keyboardType}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={colors.textMuted}
        secureTextEntry={secureTextEntry}
        style={[styles.input, error ? styles.inputError : null]}
        value={value}
      />
      {error ? <Text style={styles.errorText}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
    letterSpacing: 0.2,
  },
  input: {
    backgroundColor: "rgba(255,255,255,0.03)",
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    color: colors.text,
    fontSize: 16,
    minHeight: 56,
    paddingHorizontal: 18,
    paddingVertical: 16,
  },
  inputError: {
    borderColor: colors.danger,
  },
  errorText: {
    color: colors.danger,
    fontSize: 13,
  },
});
