import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { getPlanetsList } from "../../../shared/api/client";
import { colors } from "../../../shared/theme/colors";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { ProgressRing } from "../../../shared/ui/ProgressRing";
import { Screen } from "../../../shared/ui/Screen";
import { StarIcon } from "../../../shared/ui/StarIcon";

export function PlanetsMapScreen() {
  const planetsQuery = useQuery({
    queryKey: ["planets-list"],
    queryFn: getPlanetsList,
  });

  if (planetsQuery.isLoading || !planetsQuery.data) {
    return <LoadingView label="Загружаем карту планет..." />;
  }

  return (
    <Screen
      title="Карта планет"
      subtitle="Главная карта уже готова для навигации FE1: пользователь видит все планеты, текущий процент кешбэка и общий прогресс по каждой категории."
    >
      <View style={styles.grid}>
        {planetsQuery.data.planets.map((planet) => (
          <View key={planet.id} style={styles.card}>
            <View style={styles.cardHeader}>
              <StarIcon color={colors.warning} size={18} />
              <Text style={styles.cashback}>{planet.cashback_percent.toFixed(1)}%</Text>
            </View>
            <Text style={styles.title}>{planet.name}</Text>
            <ProgressRing color={colors.primary} label="Прогресс" size={96} value={planet.progress_percent} />
            <Text style={styles.meta}>Текущий кешбэк</Text>
          </View>
        ))}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  card: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 24,
    borderWidth: 1,
    gap: 12,
    minHeight: 220,
    padding: 16,
    width: "48%",
  },
  cardHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  cashback: {
    color: colors.warning,
    fontSize: 16,
    fontWeight: "800",
  },
  title: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
    minHeight: 40,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
});
