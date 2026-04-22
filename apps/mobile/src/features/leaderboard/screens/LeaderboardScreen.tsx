import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { getPlanetLeaderboard, getPlanetsList } from "../../../shared/api/client";
import { colors } from "../../../shared/theme/colors";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { StarIcon } from "../../../shared/ui/StarIcon";
import { StatCard } from "../../../shared/ui/StatCard";

export function LeaderboardScreen() {
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);
  const planetsQuery = useQuery({
    queryKey: ["planets-list"],
    queryFn: getPlanetsList,
  });

  useEffect(() => {
    if (!selectedPlanetId && planetsQuery.data?.planets[0]?.id) {
      setSelectedPlanetId(planetsQuery.data.planets[0].id);
    }
  }, [planetsQuery.data, selectedPlanetId]);

  const leaderboardQuery = useQuery({
    enabled: Boolean(selectedPlanetId),
    queryFn: () => getPlanetLeaderboard(selectedPlanetId ?? ""),
    queryKey: ["planet-leaderboard", selectedPlanetId],
  });

  if (planetsQuery.isLoading || !planetsQuery.data || !selectedPlanetId || leaderboardQuery.isLoading || !leaderboardQuery.data) {
    return <LoadingView label="Собираем рейтинг..." />;
  }

  return (
    <Screen
      title="Рейтинг планет"
      subtitle="Таб рейтинга уже встроен в FE1-навигацию. Пользователь может переключать планеты и смотреть недельную таблицу лидеров мок-сервера."
    >
      <SectionCard title="Ваш результат">
        <View style={styles.statsRow}>
          <StatCard label="Мой ранг" value={`#${leaderboardQuery.data.my_rank}`} />
          <StatCard label="Звёзды за период" value={leaderboardQuery.data.my_stars} />
        </View>
      </SectionCard>

      <SectionCard title="Планеты">
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.chipsRow}>
            {planetsQuery.data.planets.map((planet) => {
              const active = planet.id === selectedPlanetId;
              return (
                <Pressable
                  key={planet.id}
                  onPress={() => setSelectedPlanetId(planet.id)}
                  style={[styles.chip, active ? styles.chipActive : null]}
                >
                  <Text style={[styles.chipText, active ? styles.chipTextActive : null]}>{planet.name}</Text>
                </Pressable>
              );
            })}
          </View>
        </ScrollView>
      </SectionCard>

      <SectionCard title="Лидеры недели">
        {leaderboardQuery.data.leaders.map((entry) => (
          <View key={entry.user_id} style={styles.row}>
            <View style={styles.rankBadge}>
              <Text style={styles.rankText}>{entry.rank}</Text>
            </View>
            {entry.avatar_url ? <Image source={{ uri: entry.avatar_url }} style={styles.avatar} /> : null}
            <View style={styles.entryContent}>
              <Text style={styles.name}>{entry.name}</Text>
              <View style={styles.starsRow}>
                <StarIcon color={colors.warning} size={16} />
                <Text style={styles.stars}>{entry.stars}</Text>
              </View>
            </View>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  chipsRow: {
    flexDirection: "row",
    gap: 10,
  },
  chip: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  chipActive: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
  },
  chipText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  chipTextActive: {
    color: colors.primary,
  },
  row: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  rankBadge: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 34,
    justifyContent: "center",
    width: 34,
  },
  rankText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  avatar: {
    borderRadius: 18,
    height: 36,
    width: 36,
  },
  entryContent: {
    flex: 1,
    gap: 4,
  },
  name: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  starsRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  stars: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
});
