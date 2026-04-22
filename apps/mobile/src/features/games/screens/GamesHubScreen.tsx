import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { GAME_META } from "@mtb/shared";
import { Text, View } from "react-native";
import { getGameSummary } from "../../../shared/api/client";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";

export function GamesHubScreen() {
  const navigation = useNavigation<any>();
  const summaryQuery = useQuery({
    queryKey: ["game-summary"],
    queryFn: getGameSummary,
  });

  if (summaryQuery.isLoading || !summaryQuery.data) {
    return <LoadingView />;
  }

  return (
    <Screen
      title="Mini-games"
      subtitle="Each run feeds the real banking progression: stardust, cashback, loyalty points, stars and user rating."
    >
      {Object.entries(GAME_META).map(([gameCode, meta]) => {
        const summary = summaryQuery.data.games.find((item) => item.game_code === gameCode);
        return (
          <SectionCard key={gameCode} title={meta.title} description={meta.description}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: "#9DB6C9" }}>Planet: {meta.planetCode}</Text>
              <Text style={{ color: "#9DB6C9" }}>
                Runs {summary?.runs ?? 0} • Best {summary?.best_score ?? 0} • Stardust {summary?.total_reward ?? 0}
              </Text>
              <Text style={{ color: "#9DB6C9" }}>
                Cashback {summary?.total_cashback?.toFixed(1) ?? "0.0"} BYN • Points {summary?.total_bonus_points ?? 0}
              </Text>
            </View>
            <PrimaryButton
              onPress={() =>
                navigation.navigate(
                  gameCode === "halva_snake"
                    ? "SnakeGame"
                    : gameCode === "credit_shield_reactor"
                      ? "ShieldGame"
                      : "SocialGame",
                )
              }
            >
              Open game
            </PrimaryButton>
          </SectionCard>
        );
      })}
    </Screen>
  );
}
