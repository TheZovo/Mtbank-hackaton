import { useQuery } from "@tanstack/react-query";
import { useNavigation } from "@react-navigation/native";
import { GAME_META } from "@mtb/shared";
import { getGameSummary } from "../../../shared/api/client";
import { Screen } from "../../../shared/ui/Screen";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { Text, View } from "react-native";

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
    <Screen title="Мини-игры" subtitle="Каждый раунд считается локально, а итог авторитетно фиксируется на backend.">
      {Object.entries(GAME_META).map(([gameCode, meta]) => {
        const summary = summaryQuery.data.games.find((item) => item.game_code === gameCode);
        return (
          <SectionCard key={gameCode} title={meta.title} description={meta.description}>
            <View style={{ gap: 4 }}>
              <Text style={{ color: "#9DB6C9" }}>Планета: {meta.planetCode}</Text>
              <Text style={{ color: "#9DB6C9" }}>
                Забегов {summary?.runs ?? 0} · рекорд {summary?.best_score ?? 0}
              </Text>
            </View>
            <PrimaryButton onPress={() => navigation.navigate(gameCode === "halva_snake" ? "SnakeGame" : gameCode === "credit_shield_reactor" ? "ShieldGame" : "SocialGame")}>
              Открыть игру
            </PrimaryButton>
          </SectionCard>
        );
      })}
    </Screen>
  );
}
