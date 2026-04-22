import { useQuery } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { getLeaderboard } from "../../../shared/api/client";
import { Screen } from "../../../shared/ui/Screen";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { SectionCard } from "../../../shared/ui/SectionCard";

export function LeaderboardScreen() {
  const leaderboardQuery = useQuery({
    queryKey: ["leaderboard"],
    queryFn: getLeaderboard,
  });

  if (leaderboardQuery.isLoading || !leaderboardQuery.data) {
    return <LoadingView />;
  }

  return (
    <Screen title="Лидерборд" subtitle="Рейтинг строится по серверному total XP без локальных расхождений.">
      <SectionCard title="Топ пилотов">
        {leaderboardQuery.data.map((entry, index) => (
          <View key={entry.user_id} style={{ gap: 4 }}>
            <Text style={{ color: "#F3F7FB", fontWeight: "700" }}>
              {index + 1}. {entry.display_name}
            </Text>
            <Text style={{ color: "#9DB6C9" }}>
              Орбита {entry.orbit_level} · XP {entry.total_xp}
            </Text>
          </View>
        ))}
      </SectionCard>
    </Screen>
  );
}
