import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BANK_RANK_META, PLANET_META, buildStarString } from "@mtb/shared";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { getProfile, logout, setFocusPlanet } from "../../../shared/api/client";
import { useSessionStore } from "../../../shared/state/session-store";
import { colors } from "../../../shared/theme/colors";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { SecondaryButton } from "../../../shared/ui/SecondaryButton";
import { StatCard } from "../../../shared/ui/StatCard";

export function ProfileScreen() {
  const queryClient = useQueryClient();
  const clearSession = useSessionStore((state) => state.clear);
  const profileQuery = useQuery({
    queryKey: ["profile"],
    queryFn: getProfile,
  });

  const focusMutation = useMutation({
    mutationFn: setFocusPlanet,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["profile"] });
    },
  });

  if (profileQuery.isLoading || !profileQuery.data) {
    return <LoadingView />;
  }

  const profile = profileQuery.data;
  const rankAccent =
    BANK_RANK_META.find((item) => profile.rating.rating_score >= item.minScore)?.accent ?? colors.primary;

  return (
    <Screen
      title={`MTBank Galaxy: ${profile.user.display_name}`}
      subtitle={`${profile.rating.bank_rank} status, ${profile.rating.rating_score} rating and ${profile.rating.total_stars} unlocked stars across the banking constellations.`}
      footer={
        <PrimaryButton
          onPress={() => {
            void logout().finally(async () => {
              await clearSession();
              await queryClient.clear();
            });
          }}
        >
          Sign out
        </PrimaryButton>
      }
    >
      <SectionCard
        title="Banking identity"
        description="Your profile combines loyalty, cashback, reliability and social engagement into one MTBank progression layer."
      >
        <View style={[styles.heroCard, { borderColor: rankAccent }]}>
          <Text style={styles.heroEyebrow}>Current tier</Text>
          <Text style={styles.heroTitle}>{profile.rating.bank_rank}</Text>
          <Text style={styles.heroMeta}>
            Orbit level {profile.rating.orbit_level} • {profile.rating.completed_quests} claimed quests
          </Text>
        </View>
        <View style={styles.row}>
          <StatCard label="Rating" value={profile.rating.rating_score} />
          <StatCard label="Stars" value={`${profile.rating.total_stars}/15`} />
        </View>
        <View style={styles.row}>
          <StatCard label="Cashback" value={`${profile.wallet.cashback_balance.toFixed(1)} BYN`} />
          <StatCard label="Bonus points" value={profile.wallet.bonus_points} />
        </View>
        <View style={styles.row}>
          <StatCard label="Stardust" value={profile.stardust} />
          <StatCard label="Vault crates" value={profile.wallet.vault_crates} />
        </View>
      </SectionCard>

      <SectionCard
        title="Constellation board"
        description="Each constellation fills up with stars as the user behaves like a stronger MTBank customer."
      >
        {profile.constellations.map((constellation) => (
          <View key={constellation.constellation_code} style={styles.constellationCard}>
            <View style={styles.constellationHeader}>
              <Text style={styles.cardTitle}>{constellation.title}</Text>
              <Text style={styles.starLine}>{buildStarString(constellation.stars_filled, constellation.total_stars)}</Text>
            </View>
            <Text style={styles.cardMuted}>{constellation.theme}</Text>
            <Text style={styles.cardHeadline}>{constellation.headline}</Text>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  {
                    width: `${Math.max(constellation.completion_ratio * 100, 8)}%`,
                    backgroundColor: constellation.accent,
                  },
                ]}
              />
            </View>
            <Text style={styles.cardMuted}>Next star: {constellation.next_goal}</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard
        title="Quest pulse"
        description="The quest system is designed around cashback growth, trust profile improvement and community expansion."
      >
        <View style={styles.row}>
          <StatCard label="Active" value={profile.quest_summary.active} />
          <StatCard label="Ready to claim" value={profile.quest_summary.completed} />
          <StatCard label="Claimed" value={profile.quest_summary.claimed} />
        </View>
      </SectionCard>

      <SectionCard
        title="Planet focus"
        description="The selected planet amplifies rewards in the matching mini-game loop and gives the user a clear progression direction."
      >
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={styles.planetRow}>
            {profile.planets.map((planet) => {
              const meta = PLANET_META[planet.planet_code];
              const isFocused = profile.selected_planet === planet.planet_code;
              return (
                <View key={planet.planet_code} style={styles.planetCard}>
                  <Text style={styles.cardTitle}>{meta.title}</Text>
                  <Text style={styles.cardMuted}>{meta.summary}</Text>
                  <Text style={styles.cardValue}>XP {planet.xp}</Text>
                  <Text style={styles.cardMuted}>
                    Level {planet.level} • Mastery {planet.mastery}
                  </Text>
                  {isFocused ? (
                    <PrimaryButton onPress={() => undefined}>Active focus</PrimaryButton>
                  ) : (
                    <SecondaryButton
                      disabled={focusMutation.isPending}
                      onPress={() => focusMutation.mutate({ planet_code: planet.planet_code })}
                    >
                      Make focus
                    </SecondaryButton>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SectionCard>

      <SectionCard title="Financial profile" description="A light banking profile layer makes rewards meaningful beyond pure arcade score.">
        <View style={styles.row}>
          <StatCard label="Current limit" value={`${profile.installment_profile.current_limit.toFixed(0)} BYN`} />
          <StatCard label="Available" value={`${profile.installment_profile.available_limit.toFixed(0)} BYN`} />
        </View>
        <View style={styles.row}>
          <StatCard label="Risk score" value={profile.installment_profile.risk_score} />
          <StatCard label="On-time actions" value={profile.installment_profile.on_time_payments_3m} />
        </View>
      </SectionCard>

      <SectionCard title="Recent rewards">
        {profile.reward_ledger_preview.map((reward) => (
          <View key={reward.ledger_id} style={styles.listItem}>
            <Text style={styles.cardTitle}>{reward.title}</Text>
            <Text style={styles.cardMuted}>{reward.description}</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Activity feed">
        {profile.activity.map((item) => (
          <View key={item.activity_id} style={styles.listItem}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardMuted}>{item.detail}</Text>
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
  heroCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 18,
    borderWidth: 1,
    gap: 6,
    padding: 16,
  },
  heroEyebrow: {
    color: colors.textMuted,
    fontSize: 13,
    textTransform: "uppercase",
  },
  heroTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: "800",
  },
  heroMeta: {
    color: colors.textMuted,
    fontSize: 14,
  },
  constellationCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    gap: 8,
    padding: 14,
  },
  constellationHeader: {
    alignItems: "center",
    flexDirection: "row",
    justifyContent: "space-between",
  },
  progressTrack: {
    backgroundColor: colors.border,
    borderRadius: 999,
    height: 8,
    overflow: "hidden",
  },
  progressFill: {
    borderRadius: 999,
    height: "100%",
  },
  planetRow: {
    flexDirection: "row",
    gap: 12,
  },
  planetCard: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    gap: 8,
    padding: 14,
    width: 260,
  },
  cardTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: "700",
  },
  cardHeadline: {
    color: colors.text,
    fontSize: 14,
    lineHeight: 20,
  },
  cardMuted: {
    color: colors.textMuted,
    fontSize: 13,
    lineHeight: 18,
  },
  cardValue: {
    color: colors.primary,
    fontSize: 18,
    fontWeight: "700",
  },
  starLine: {
    color: colors.warning,
    fontSize: 18,
    letterSpacing: 1,
  },
  listItem: {
    borderBottomColor: colors.border,
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingBottom: 10,
  },
});
