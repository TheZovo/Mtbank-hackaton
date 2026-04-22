import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { PLANET_META } from "@mtb/shared";
import { getProfile, logout, setFocusPlanet } from "../../../shared/api/client";
import { useSessionStore } from "../../../shared/state/session-store";
import { Screen } from "../../../shared/ui/Screen";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
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

  return (
    <Screen
      title={`Привет, ${profile.user.display_name}`}
      subtitle="Галактика теперь mobile-first: весь авторитетный прогресс хранится на backend, а экран показывает актуальное состояние профиля."
      footer={
        <PrimaryButton
          onPress={() => {
            void logout().finally(async () => {
              await clearSession();
              await queryClient.clear();
            });
          }}
        >
          Выйти
        </PrimaryButton>
      }
    >
      <View style={styles.row}>
        <StatCard label="Орбита" value={profile.orbit_level} />
        <StatCard label="Звездная пыль" value={profile.stardust} />
      </View>
      <View style={styles.row}>
        <StatCard label="XP" value={profile.total_xp} />
        <StatCard label="Контейнеры" value={profile.vault_crates} />
      </View>
      <View style={styles.row}>
        <StatCard label="Серия" value={`${profile.bonus_streak}x`} />
        <StatCard label="Заряд хранилища" value={`${profile.vault_charge}%`} />
      </View>

      <SectionCard title="Планеты" description="Смена фокусной планеты влияет на бонус за результат мини-игр.">
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
                  <Text style={styles.cardMuted}>Уровень {planet.level} · Mastery {planet.mastery}</Text>
                  {isFocused ? (
                    <PrimaryButton onPress={() => undefined}>Фокус активен</PrimaryButton>
                  ) : (
                    <SecondaryButton
                      disabled={focusMutation.isPending}
                      onPress={() => focusMutation.mutate({ planet_code: planet.planet_code })}
                    >
                      Сделать фокусом
                    </SecondaryButton>
                  )}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </SectionCard>

      <SectionCard title="Бустеры" description="Активные окна усиления наград и прогресса.">
        {profile.active_boosters.length ? (
          profile.active_boosters.map((booster) => (
            <View key={booster.booster_id} style={styles.listItem}>
              <Text style={styles.cardTitle}>{booster.category}</Text>
              <Text style={styles.cardMuted}>+{booster.boost_rate}% до {new Date(booster.end_at).toLocaleString()}</Text>
            </View>
          ))
        ) : (
          <Text style={styles.cardMuted}>Пока нет активных бустеров. Завершайте забеги и клеймите квесты.</Text>
        )}
      </SectionCard>

      <SectionCard title="Последние награды">
        {profile.reward_ledger_preview.map((reward) => (
          <View key={reward.ledger_id} style={styles.listItem}>
            <Text style={styles.cardTitle}>{reward.reward_type}</Text>
            <Text style={styles.cardMuted}>{reward.amount}</Text>
          </View>
        ))}
      </SectionCard>

      <SectionCard title="Активность">
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
  planetRow: {
    flexDirection: "row",
    gap: 12,
  },
  planetCard: {
    backgroundColor: "#11263A",
    borderRadius: 16,
    gap: 8,
    padding: 14,
    width: 250,
  },
  cardTitle: {
    color: "#F3F7FB",
    fontSize: 16,
    fontWeight: "700",
  },
  cardMuted: {
    color: "#9DB6C9",
    fontSize: 13,
    lineHeight: 18,
  },
  cardValue: {
    color: "#FF7A59",
    fontSize: 18,
    fontWeight: "700",
  },
  listItem: {
    borderBottomColor: "#294A66",
    borderBottomWidth: StyleSheet.hairlineWidth,
    gap: 4,
    paddingBottom: 10,
  },
});
