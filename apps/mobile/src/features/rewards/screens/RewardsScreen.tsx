import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { getGameSummary, getRewards } from "../../../shared/api/client";
import { colors } from "../../../shared/theme/colors";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { StatCard } from "../../../shared/ui/StatCard";

export function RewardsScreen() {
  const rewardsQuery = useQuery({
    queryKey: ["rewards"],
    queryFn: getRewards,
  });
  const summaryQuery = useQuery({
    queryKey: ["game-summary"],
    queryFn: getGameSummary,
  });

  if (rewardsQuery.isLoading || summaryQuery.isLoading || !rewardsQuery.data || !summaryQuery.data) {
    return <LoadingView label="Загружаем кошелёк наград..." />;
  }

  return (
    <Screen
      title="Награды"
      subtitle="Экран оставлен совместимым с текущим мок-сервером: показывает сводку по играм и список доступных промокодов."
    >
      <View style={styles.row}>
        <StatCard label="Всего запусков" value={summaryQuery.data.total_runs} />
        <StatCard label="Суммарная награда" value={summaryQuery.data.total_reward} />
      </View>
      <View style={styles.row}>
        <StatCard label="Игровой кешбэк" value={`${(summaryQuery.data.total_cashback ?? 0).toFixed(1)} BYN`} />
        <StatCard label="Игровые поинты" value={summaryQuery.data.total_bonus_points ?? 0} />
      </View>

      <SectionCard title="Сводка по играм">
        {summaryQuery.data.games.map((game) => (
          <View key={game.game_code} style={styles.item}>
            <Text style={styles.itemTitle}>{game.game_code}</Text>
            <Text style={styles.itemText}>
              Runs {game.runs} • Best score {game.best_score} • Reward {game.total_reward}
            </Text>
            <Text style={styles.itemText}>
              Cashback {(game.total_cashback ?? 0).toFixed(1)} BYN • Bonus points {game.total_bonus_points ?? 0}
            </Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Лента наград">
        {rewardsQuery.data.length ? (
          rewardsQuery.data.map((reward) => (
            <View key={reward.ledger_id} style={styles.item}>
              <Text style={styles.itemTitle}>{reward.title ?? reward.ledger_id}</Text>
              <Text style={styles.itemText}>{reward.description ?? "Награда сохранена в истории."}</Text>
              <Text style={styles.itemTime}>{new Date(reward.created_at).toLocaleString("ru-RU")}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.itemText}>Пока наград нет.</Text>
        )}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    gap: 12,
  },
  item: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingBottom: 10,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  itemText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 20,
  },
  itemTime: {
    color: colors.primary,
    fontSize: 12,
  },
});
