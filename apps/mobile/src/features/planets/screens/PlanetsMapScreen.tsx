import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { getPlanetsList } from "../../../shared/api/client";
import { colors } from "../../../shared/theme/colors";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { ProgressRing } from "../../../shared/ui/ProgressRing";
import { Screen } from "../../../shared/ui/Screen";
import { StarIcon } from "../../../shared/ui/StarIcon";
import { PLANET_ORDER, getPlanetMeta } from "../planet-config";

export function PlanetsMapScreen() {
  const navigation = useNavigation<any>();
  const planetsQuery = useQuery({
    queryKey: ["planets-list"],
    queryFn: getPlanetsList,
  });

  if (planetsQuery.isLoading) {
    return <LoadingView label="Загружаем карту планет..." />;
  }

  if (planetsQuery.isError || !planetsQuery.data) {
    return (
      <Screen title="Карта планет" subtitle="Не удалось загрузить данные планет.">
        <View style={styles.errorCard}>
          <Text style={styles.errorText}>{planetsQuery.error instanceof Error ? planetsQuery.error.message : "Повторите попытку позже."}</Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen
      title="Карта планет"
      subtitle="FE2-карта собирает планеты в сетку 2x5. Активные карточки ведут в detail-экран, закрытые слоты остаются на месте до готовности API."
    >
      <View style={styles.grid}>
        {PLANET_ORDER.map((planetId) => {
          const meta = getPlanetMeta(planetId);
          const planet = planetsQuery.data.planets.find((entry) => entry.id === planetId);
          const isAvailable = Boolean(planet);
          return (
            <Pressable
              accessibilityRole="button"
              disabled={!isAvailable}
              key={planetId}
              onPress={() => navigation.navigate("PlanetDetail", { planetId })}
              style={({ pressed }) => [styles.card, !isAvailable ? styles.cardLocked : null, pressed && isAvailable ? styles.cardPressed : null]}
            >
              <View style={styles.cardHeader}>
                <StarIcon color={isAvailable ? colors.warning : colors.textMuted} size={18} />
                <Text style={[styles.cashback, !isAvailable ? styles.cashbackLocked : null]}>
                  {isAvailable ? `${planet.cashback_percent.toFixed(1)}%` : `${meta.fallbackCashback.toFixed(1)}%`}
                </Text>
              </View>
              <Text style={styles.title}>{meta.title}</Text>
              <Text style={styles.category}>{meta.category}</Text>
              <ProgressRing color={isAvailable ? colors.primary : colors.textMuted} label={isAvailable ? "Прогресс" : "Слот"} size={92} value={planet?.progress_percent ?? 0} />
              <Text style={styles.meta}>{isAvailable ? "Открыть орбиту" : "Скоро доступно"}</Text>
            </Pressable>
          );
        })}
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
  cardLocked: {
    opacity: 0.7,
  },
  cardPressed: {
    borderColor: colors.primary,
    transform: [{ scale: 0.98 }],
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
  category: {
    color: colors.textMuted,
    fontSize: 13,
    minHeight: 18,
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
    textAlign: "center",
  },
  cashbackLocked: {
    color: colors.textMuted,
  },
  errorCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
});
