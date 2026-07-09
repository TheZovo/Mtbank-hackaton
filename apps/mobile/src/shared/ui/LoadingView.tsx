import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { colors } from "../theme/colors";

interface LoadingViewProps {
  label?: string;
}

export function LoadingView({ label = "Загрузка..." }: LoadingViewProps) {
  return (
    <View style={styles.container}>
      <ActivityIndicator color={colors.primary} size="large" />
      <Text style={styles.label}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    backgroundColor: colors.background,
    flex: 1,
    gap: 14,
    justifyContent: "center",
    padding: 24,
  },
  label: {
    color: colors.textMuted,
    fontSize: 14,
  },
});
