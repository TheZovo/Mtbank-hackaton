import { useQuery } from "@tanstack/react-query";
import { StyleSheet, Text, View } from "react-native";
import { getGameSummary, getProfile, getRewards } from "../../../shared/api/client";
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
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  if (
    rewardsQuery.isLoading ||
    summaryQuery.isLoading ||
    profileQuery.isLoading ||
    !rewardsQuery.data ||
    !summaryQuery.data ||
    !profileQuery.data
  ) {
    return <LoadingView />;
  }

  const profile = profileQuery.data;

  return (
    <Screen
      title="Rewards wallet"
      subtitle="A banking rewards layer now sits on top of the mini-games: cashback, bonus points, rating boosts and progression crates."
    >
      <View style={styles.row}>
        <StatCard label="Cashback wallet" value={`${profile.wallet.cashback_balance.toFixed(1)} BYN`} />
        <StatCard label="Bonus points" value={profile.wallet.bonus_points} />
      </View>
      <View style={styles.row}>
        <StatCard label="Rating boost" value={profile.wallet.rating_boost} />
        <StatCard label="Vault crates" value={profile.wallet.vault_crates} />
      </View>
      <View style={styles.row}>
        <StatCard label="Game cashback" value={`${summaryQuery.data.total_cashback.toFixed(1)} BYN`} />
        <StatCard label="Game points" value={summaryQuery.data.total_bonus_points} />
      </View>

      <SectionCard title="Reward summary">
        {summaryQuery.data.games.map((game) => (
          <View key={game.game_code} style={styles.item}>
            <Text style={styles.itemTitle}>{game.game_code}</Text>
            <Text style={styles.itemText}>
              Runs {game.runs} • Best score {game.best_score} • Stardust {game.total_reward}
            </Text>
            <Text style={styles.itemText}>
              Cashback {game.total_cashback.toFixed(1)} BYN • Bonus points {game.total_bonus_points}
            </Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Reward ledger">
        {rewardsQuery.data.map((reward) => (
          <View key={reward.ledger_id} style={styles.item}>
            <Text style={styles.itemTitle}>{reward.title}</Text>
            <Text style={styles.itemText}>{reward.description}</Text>
            <Text style={styles.itemTime}>{new Date(reward.created_at).toLocaleString()}</Text>
          </View>
        ))}
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
