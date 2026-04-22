import { useQuery } from "@tanstack/react-query";
import { buildStarString } from "@mtb/shared";
import { StyleSheet, Text, View } from "react-native";
import { getLeaderboard } from "../../../shared/api/client";
import { colors } from "../../../shared/theme/colors";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";

function medal(index: number): string {
  if (index === 0) return "1";
  if (index === 1) return "2";
  if (index === 2) return "3";
  return `${index + 1}`;
}

export function LeaderboardScreen() {
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboard,
  });

  if (leaderboardQuery.isLoading || !leaderboardQuery.data) {
    return <LoadingView />;
  }

  return (
    <Screen
      title="User rating"
      subtitle="The leaderboard is now built around MTBank user rating, constellation stars and real profile progression instead of raw XP alone."
    >
      <SectionCard title="Top users">
        {leaderboardQuery.data.map((entry, index) => (
          <View key={entry.user_id} style={styles.card}>
            <View style={styles.header}>
              <View style={styles.rankCircle}>
                <Text style={styles.rankText}>{medal(index)}</Text>
              </View>
              <View style={styles.headerText}>
                <Text style={styles.name}>{entry.display_name}</Text>
                <Text style={styles.meta}>
                  {entry.bank_rank} • Rating {entry.rating_score}
                </Text>
              </View>
            </View>
            <Text style={styles.stars}>{buildStarString(Math.min(entry.total_stars, 15), 15)}</Text>
            <Text style={styles.meta}>
              Orbit level {entry.orbit_level} • XP {entry.total_xp} • Cashback {entry.cashback_balance.toFixed(1)} BYN
            </Text>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    gap: 8,
    padding: 14,
  },
  header: {
    alignItems: "center",
    flexDirection: "row",
    gap: 12,
  },
  rankCircle: {
    alignItems: "center",
    backgroundColor: colors.primary,
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  rankText: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "800",
  },
  headerText: {
    flex: 1,
    gap: 2,
  },
  name: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  meta: {
    color: colors.textMuted,
    fontSize: 13,
  },
  stars: {
    color: colors.warning,
    fontSize: 15,
    letterSpacing: 0.5,
  },
});
