import type { PropsWithChildren } from "react";
import { Pressable, StyleSheet, Text } from "react-native";
import { colors } from "../theme/colors";

interface PrimaryButtonProps extends PropsWithChildren {
  onPress: () => void;
  disabled?: boolean;
}

export function PrimaryButton({ children, disabled, onPress }: PrimaryButtonProps) {
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
    backgroundColor: colors.primary,
    borderRadius: 40,
    justifyContent: "center",
    minHeight: 56,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  disabled: {
    opacity: 0.55,
  },
  pressed: {
    backgroundColor: colors.primaryPressed,
  },
  label: {
    color: colors.white,
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
});
