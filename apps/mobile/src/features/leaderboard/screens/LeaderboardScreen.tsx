import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRoute } from "@react-navigation/native";
import { Image, Modal, Pressable, RefreshControl, ScrollView, StyleSheet, Text, View } from "react-native";
import { getPlanetLeaderboard, getPlanetsList } from "../../../shared/api/client";
import { useSessionStore } from "../../../shared/state/session-store";
import { colors } from "../../../shared/theme/colors";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { StarIcon } from "../../../shared/ui/StarIcon";
import { StatCard } from "../../../shared/ui/StatCard";
import { PERIOD_PRIZES, getPlanetMeta } from "../../planets/planet-config";

export function LeaderboardScreen() {
  const route = useRoute<any>();
  const me = useSessionStore((state) => state.me);
  const [selectedPlanetId, setSelectedPlanetId] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isPrizesVisible, setPrizesVisible] = useState(false);
  const planetsQuery = useQuery({
    queryKey: ["planets-list"],
    queryFn: getPlanetsList,
  });

  useEffect(() => {
    const requestedPlanetId = route.params?.initialPlanetId;
    if (requestedPlanetId) {
      setSelectedPlanetId(requestedPlanetId);
      return;
    }
    if (!selectedPlanetId && planetsQuery.data?.planets[0]?.id) {
      setSelectedPlanetId(planetsQuery.data.planets[0].id);
    }
  }, [planetsQuery.data, route.params?.initialPlanetId, selectedPlanetId]);

  const leaderboardQuery = useQuery({
    enabled: Boolean(selectedPlanetId),
    queryFn: () => getPlanetLeaderboard(selectedPlanetId ?? ""),
    queryKey: ["planet-leaderboard", selectedPlanetId],
  });

  if (planetsQuery.isLoading || (leaderboardQuery.isLoading && !leaderboardQuery.data)) {
    return <LoadingView label="Собираем рейтинг..." />;
  }

  if (planetsQuery.isError || leaderboardQuery.isError || !planetsQuery.data || !selectedPlanetId || !leaderboardQuery.data) {
    return (
      <Screen title="Рейтинг планет" subtitle="Не удалось собрать рейтинг.">
        <SectionCard title="Ошибка загрузки">
          <Text style={styles.errorText}>
            {planetsQuery.error instanceof Error
              ? planetsQuery.error.message
              : leaderboardQuery.error instanceof Error
                ? leaderboardQuery.error.message
                : "Повторите попытку позже."}
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  async function handleRefresh() {
    setIsRefreshing(true);
    try {
      await Promise.all([planetsQuery.refetch(), leaderboardQuery.refetch()]);
    } finally {
      setIsRefreshing(false);
    }
  }

  const selectedMeta = getPlanetMeta(selectedPlanetId);

  return (
    <Screen
      title="Рейтинг планет"
      subtitle="FE2-рейтинг показывает недельный топ планеты, подсвечивает текущего пользователя и открывает модальное окно призов периода."
      scrollViewProps={{
        refreshControl: <RefreshControl onRefresh={handleRefresh} refreshing={isRefreshing} tintColor={colors.primary} />,
      }}
    >
      <SectionCard title="Ваш результат">
        <View style={styles.statsRow}>
          <StatCard label="Мой ранг" value={`#${leaderboardQuery.data.my_rank}`} />
          <StatCard label="Звёзды за период" value={leaderboardQuery.data.my_stars} />
        </View>
        <PrimaryButton onPress={() => setPrizesVisible(true)}>Призы периода</PrimaryButton>
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
        <Text style={styles.sectionHint}>{selectedMeta.leaderboardPrizeHint}</Text>
        {leaderboardQuery.data.leaders.slice(0, 50).map((entry) => (
          <View key={entry.user_id} style={[styles.row, entry.user_id === me?.id ? styles.rowActive : null]}>
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

      <Modal animationType="slide" onRequestClose={() => setPrizesVisible(false)} transparent visible={isPrizesVisible}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Призы периода</Text>
            <Text style={styles.modalSubtitle}>{selectedMeta.title}. {selectedMeta.leaderboardPrizeHint}</Text>
            {PERIOD_PRIZES.map((prize) => (
              <View key={prize.place} style={styles.prizeRow}>
                <Text style={styles.prizePlace}>{prize.place}</Text>
                <Text style={styles.prizeReward}>{prize.reward}</Text>
              </View>
            ))}
            <PrimaryButton onPress={() => setPrizesVisible(false)}>Закрыть</PrimaryButton>
          </View>
        </View>
      </Modal>
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
  rowActive: {
    borderColor: colors.primary,
    borderWidth: 1,
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
  sectionHint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  modalBackdrop: {
    backgroundColor: "rgba(6, 10, 24, 0.75)",
    flex: 1,
    justifyContent: "flex-end",
    padding: 16,
  },
  modalCard: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 28,
    borderWidth: 1,
    gap: 14,
    padding: 20,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: "800",
  },
  modalSubtitle: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  prizeRow: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 20,
    gap: 6,
    padding: 14,
  },
  prizePlace: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: "800",
  },
  prizeReward: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
});
