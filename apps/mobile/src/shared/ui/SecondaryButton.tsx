import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";

interface SecondaryButtonProps extends PropsWithChildren {
  onPress: () => void;
  disabled?: boolean;
}

export function SecondaryButton({ children, disabled, onPress }: SecondaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.button,
        disabled ? styles.disabled : null,
        pressed && !disabled ? styles.pressed : null,
      ]}
    >
      <Text style={styles.label}>{children}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    backgroundColor: "transparent",
    borderColor: colors.primary,
    borderRadius: 40,
    borderWidth: 1.5,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    backgroundColor: colors.primarySoft,
  },
  label: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: "700",
    textAlign: "center",
  },
});
