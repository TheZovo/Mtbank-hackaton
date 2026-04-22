import { useQuery } from "@tanstack/react-query";
import { getGameSummary, getRewards } from "../../../shared/api/client";
import { Screen } from "../../../shared/ui/Screen";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { StatCard } from "../../../shared/ui/StatCard";
import { View, Text } from "react-native";

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
    return <LoadingView />;
  }

  return (
    <Screen title="Награды" subtitle="Журнал наград и агрегированная статистика по мини-играм.">
      <View style={{ flexDirection: "row", gap: 12 }}>
        <StatCard label="Всего забегов" value={summaryQuery.data.total_runs} />
        <StatCard label="Суммарная награда" value={summaryQuery.data.total_reward} />
      </View>

      <SectionCard title="Сводка по играм">
        {summaryQuery.data.games.map((game) => (
          <View key={game.game_code} style={{ gap: 4 }}>
            <Text style={{ color: "#F3F7FB", fontWeight: "700" }}>{game.game_code}</Text>
            <Text style={{ color: "#9DB6C9" }}>
              Забегов {game.runs} · рекорд {game.best_score} · награда {game.total_reward}
            </Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Леджер наград">
        {rewardsQuery.data.map((reward) => (
          <View key={reward.ledger_id} style={{ gap: 4 }}>
            <Text style={{ color: "#F3F7FB", fontWeight: "700" }}>{reward.reward_type}</Text>
            <Text style={{ color: "#9DB6C9" }}>
              {reward.amount} · {new Date(reward.created_at).toLocaleString()}
            </Text>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}
