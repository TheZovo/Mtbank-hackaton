import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PLANET_META, buildStarString } from "@mtb/shared";
import { StyleSheet, Text, View } from "react-native";
import { claimQuest, getQuests } from "../../../shared/api/client";
import { colors } from "../../../shared/theme/colors";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
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
        queryClient.invalidateQueries({ queryKey: ["leaderboard"] }),
      ]);
    },
  });

  if (questsQuery.isLoading || !questsQuery.data) {
    return <LoadingView />;
  }

  return (
    <Screen
      title="Quest system"
      subtitle="MTBank quests now drive cashback, loyalty points, rating growth and constellation stars instead of feeling like disconnected arcade tasks."
    >
      {questsQuery.data.map((quest) => {
        const isReady = quest.status === "completed";
        const isClaimed = quest.status === "claimed";
        const progressRatio = Math.min(quest.current_value / quest.threshold, 1);
        const planetMeta = PLANET_META[quest.planet_code];

        return (
          <SectionCard key={quest.quest_id} title={quest.title} description={quest.description}>
            <View style={styles.metaRow}>
              <Text style={styles.pill}>{planetMeta.title}</Text>
              <Text style={styles.pill}>{quest.category}</Text>
              <Text style={styles.starReward}>{buildStarString(Math.min(quest.stars_reward, 3), 3)}</Text>
            </View>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(progressRatio * 100, 8)}%`,
                    backgroundColor: planetMeta.accent,
                  },
                ]}
              />
            </View>
            <Text style={styles.supportText}>
              Progress {Math.floor(quest.current_value)}/{quest.threshold}
            </Text>
            <Text style={styles.rewardText}>Reward: {quest.reward_display}</Text>
            <PrimaryButton
              disabled={!isReady || isClaimed || claimMutation.isPending}
              onPress={() => claimMutation.mutate(quest.quest_id)}
            >
              {isClaimed ? "Already claimed" : isReady ? "Claim reward" : "Keep progressing"}
            </PrimaryButton>
            {claimMutation.isError && claimMutation.variables === quest.quest_id ? (
              <Text style={styles.errorText}>The reward could not be claimed. Try once more.</Text>
            ) : null}
          </SectionCard>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  pill: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 999,
    color: colors.textMuted,
    overflow: "hidden",
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  starReward: {
    color: colors.warning,
    fontSize: 16,
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 10,
    overflow: "hidden",
  },
  progressFill: {
    borderRadius: 999,
    height: "100%",
  },
  supportText: {
    color: colors.textMuted,
    fontSize: 13,
  },
  rewardText: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "600",
  },
  errorText: {
    color: "#FCA5A5",
  },
});
