import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Text, View } from "react-native";
import { claimQuest, getQuests } from "../../../shared/api/client";
import { Screen } from "../../../shared/ui/Screen";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { SectionCard } from "../../../shared/ui/SectionCard";

export function QuestsScreen() {
  const queryClient = useQueryClient();
  const questsQuery = useQuery({
    queryKey: ["quests"],
    queryFn: getQuests,
  });
  const claimMutation = useMutation({
    mutationFn: claimQuest,
    onSuccess: () => {
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["quests"] }),
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["rewards"] }),
      ]);
    },
  });

  if (questsQuery.isLoading || !questsQuery.data) {
    return <LoadingView />;
  }

  return (
    <Screen title="Квесты" subtitle="Все квесты теперь завязаны на реальные мобильные сценарии и серверный прогресс.">
      {questsQuery.data.map((quest) => {
        const isReady = quest.status === "completed";
        const isClaimed = quest.status === "claimed";
        return (
          <SectionCard key={quest.quest_id} title={quest.title} description={quest.description}>
            <Text style={{ color: "#9DB6C9" }}>
              Прогресс: {quest.current_value}/{quest.threshold}
            </Text>
            <Text style={{ color: "#9DB6C9" }}>
              Награда: {quest.reward_kind} · {quest.reward_value}
            </Text>
            <View style={{ gap: 8 }}>
              <PrimaryButton
                disabled={!isReady || isClaimed || claimMutation.isPending}
                onPress={() => claimMutation.mutate(quest.quest_id)}
              >
                {isClaimed ? "Получено" : isReady ? "Забрать награду" : "Еще не готово"}
              </PrimaryButton>
              {claimMutation.isError && claimMutation.variables === quest.quest_id ? (
                <Text style={{ color: "#FCA5A5" }}>Не удалось получить награду.</Text>
              ) : null}
            </View>
          </SectionCard>
        );
      })}
    </Screen>
  );
}
