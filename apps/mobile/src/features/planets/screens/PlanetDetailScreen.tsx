import { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Platform, Pressable, Share, StyleSheet, Text, View } from "react-native";
import Animated, { useAnimatedStyle, useSharedValue, withSequence, withSpring, withTiming } from "react-native-reanimated";
import { captureRef } from "react-native-view-shot";
import { getPlanetLeaderboard, getPlanetProgress, getPlanetsList } from "../../../shared/api/client";
import { useSessionStore } from "../../../shared/state/session-store";
import { colors } from "../../../shared/theme/colors";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { StarIcon } from "../../../shared/ui/StarIcon";
import { StatCard } from "../../../shared/ui/StatCard";
import { ConstellationCanvas } from "../components/ConstellationCanvas";
import { getPlanetMeta, getPlanetShareMessage } from "../planet-config";

export function PlanetDetailScreen() {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const me = useSessionStore((state) => state.me);
  const planetId = route.params?.planetId ?? "apteki";
  const shareCardRef = useRef<View | null>(null);
  const rewardScale = useSharedValue(1);

  const planetsQuery = useQuery({
    queryKey: ["planets-list"],
    queryFn: getPlanetsList,
  });
  const progressQuery = useQuery({
    queryKey: ["planet-progress", planetId],
    queryFn: () => getPlanetProgress(planetId),
  });
  const leaderboardQuery = useQuery({
    queryKey: ["planet-leaderboard", planetId, "detail-preview"],
    queryFn: () => getPlanetLeaderboard(planetId),
  });

  useEffect(() => {
    if (!route.params?.pulseToken || !route.params?.starAwarded) {
      return;
    }
    rewardScale.value = withSequence(withTiming(1.04, { duration: 180 }), withSpring(1));
  }, [rewardScale, route.params?.pulseToken, route.params?.starAwarded]);

  const rewardPulseStyle = useAnimatedStyle(() => ({
    transform: [{ scale: rewardScale.value }],
  }));

  const planetMeta = getPlanetMeta(planetId);
  const planetSummary = useMemo(
    () => planetsQuery.data?.planets.find((planet) => planet.id === planetId),
    [planetId, planetsQuery.data?.planets],
  );

  if (progressQuery.isLoading || planetsQuery.isLoading || leaderboardQuery.isLoading) {
    return <LoadingView label="Подготавливаем орбиту планеты..." />;
  }

  if (progressQuery.isError || !progressQuery.data) {
    return (
      <Screen title={planetMeta.title} subtitle="Не удалось получить прогресс планеты.">
        <SectionCard title="Ошибка">
          <Text style={styles.errorText}>
            {progressQuery.error instanceof Error ? progressQuery.error.message : "Повторите попытку позже."}
          </Text>
        </SectionCard>
      </Screen>
    );
  }

  const progress = progressQuery.data;
  const leaders = leaderboardQuery.data?.leaders.slice(0, 10) ?? [];
  const shareMessage = getPlanetShareMessage(progress.planet_id, progress.cashback_percent, progress.period_small_stars);
  const achievedBigStars = progress.constellation.big_stars.filter(Boolean).length;

  async function handleShare() {
    const message = `${shareMessage} Созвездие ${progress.constellation.name}.`;
    const webUrl = typeof globalThis === "object" && "location" in globalThis ? String((globalThis as { location?: { href?: string } }).location?.href ?? "") : undefined;

    try {
      if (Platform.OS !== "web" && shareCardRef.current) {
        const snapshotUri = await captureRef(shareCardRef, {
          format: "png",
          quality: 0.95,
          result: "tmpfile",
        });
        await Share.share({
          message,
          title: `Планета ${planetMeta.title}`,
          url: snapshotUri,
        });
        return;
      }
    } catch {
      // Fallback below keeps sharing available even if native snapshot capture fails.
    }

    await Share.share({
      message,
      title: `Планета ${planetMeta.title}`,
      url: Platform.OS === "web" ? webUrl : undefined,
    });
  }

  return (
    <Screen
      footer={
        <View style={styles.footer}>
          <PrimaryButton onPress={() => navigation.navigate("Game", { gameCode: progress.game.code, planetId })}>Играть</PrimaryButton>
        </View>
      }
      title={planetMeta.title}
      subtitle={planetMeta.summary}
    >
      <Animated.View style={rewardPulseStyle}>
        <SectionCard description={planetMeta.focusHint} title="Карточка планеты">
          <View collapsable={false} ref={shareCardRef} style={styles.shareCardCapture}>
            <View style={styles.heroRow}>
              <View style={styles.heroText}>
                <Text style={styles.orbitLabel}>{progress.constellation.name}</Text>
                <Text style={styles.cashbackValue}>{progress.cashback_percent.toFixed(1)}%</Text>
                <Text style={styles.heroHint}>Текущий кешбэк на планете</Text>
              </View>
              <Pressable onPress={handleShare} style={styles.shareButton}>
                <Text style={styles.shareButtonText}>Поделиться</Text>
              </Pressable>
            </View>
            <View style={styles.statsRow}>
              <StatCard label="Больших звёзд" value={`${achievedBigStars}/${progress.constellation.big_stars_total}`} />
              <StatCard label="Малых за период" value={progress.period_small_stars} />
            </View>
          </View>
        </SectionCard>
      </Animated.View>

      <SectionCard description="Шкала до следующего прироста кешбэка +0.5%." title="До следующего буста">
        <View style={styles.scaleRow}>
          {Array.from({ length: progress.constellation.big_stars_total }, (_, index) => {
            const isFilled = index < achievedBigStars;
            return <View key={index} style={[styles.scaleStep, isFilled ? styles.scaleStepFilled : null]} />;
          })}
        </View>
        <Text style={styles.scaleCaption}>Осталось больших звёзд: {progress.big_stars_until_increase}</Text>
      </SectionCard>

      <SectionCard description={planetMeta.orbitLabel} title="Созвездие">
        <ConstellationCanvas progress={progress} />
        <View style={styles.constellationMeta}>
          <Text style={styles.metaLine}>Текущая орбита: {progress.constellation.index}</Text>
          <Text style={styles.metaLine}>Малых звёзд в сегменте: {progress.constellation.small_stars_current}/{progress.constellation.small_stars_per_segment}</Text>
          <Text style={styles.metaLine}>Игра планеты: {progress.game.name}</Text>
        </View>
      </SectionCard>

      <SectionCard description={planetMeta.leaderboardPrizeHint} title="Топ-10 планеты">
        {leaders.map((entry) => {
          const isCurrentUser = entry.user_id === me?.id;
          return (
            <View key={`${entry.user_id}-${entry.rank ?? 0}`} style={[styles.leaderRow, isCurrentUser ? styles.leaderRowActive : null]}>
              <View style={styles.rankBadge}>
                <Text style={styles.rankText}>{entry.rank ?? "-"}</Text>
              </View>
              <View style={styles.leaderContent}>
                <Text style={styles.leaderName}>{entry.name ?? entry.display_name ?? "Игрок"}</Text>
                <View style={styles.leaderStars}>
                  <StarIcon color={colors.warning} size={16} />
                  <Text style={styles.leaderStarsText}>{entry.stars ?? 0}</Text>
                </View>
              </View>
            </View>
          );
        })}
        <PrimaryButton onPress={() => navigation.navigate("Tabs", { params: { initialPlanetId: planetId }, screen: "Leaderboard" })}>
          Открыть рейтинг планеты
        </PrimaryButton>
      </SectionCard>

      <SectionCard title="Сводка">
        <Text style={styles.metaLine}>Категория: {planetMeta.category}</Text>
        <Text style={styles.metaLine}>Активная игра: {planetMeta.gameTitle}</Text>
        <Text style={styles.metaLine}>Общий прогресс карты: {(planetSummary?.progress_percent ?? 0).toFixed(0)}%</Text>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  footer: {
    gap: 12,
  },
  heroRow: {
    alignItems: "flex-start",
    flexDirection: "row",
    gap: 16,
    justifyContent: "space-between",
  },
  heroText: {
    flex: 1,
    gap: 6,
  },
  orbitLabel: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "700",
  },
  cashbackValue: {
    color: colors.warning,
    fontSize: 42,
    fontWeight: "800",
  },
  heroHint: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  shareButton: {
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: 999,
    borderWidth: 1,
    minWidth: 120,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  shareButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
    textAlign: "center",
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  shareCardCapture: {
    gap: 12,
  },
  scaleRow: {
    flexDirection: "row",
    gap: 8,
  },
  scaleStep: {
    backgroundColor: colors.surfaceElevated,
    borderColor: colors.border,
    borderRadius: 999,
    borderWidth: 1,
    flex: 1,
    height: 12,
  },
  scaleStepFilled: {
    backgroundColor: colors.warning,
    borderColor: "rgba(248, 214, 109, 0.5)",
  },
  scaleCaption: {
    color: colors.textMuted,
    fontSize: 14,
  },
  constellationMeta: {
    gap: 6,
  },
  metaLine: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  leaderRow: {
    alignItems: "center",
    backgroundColor: colors.surfaceElevated,
    borderRadius: 22,
    flexDirection: "row",
    gap: 12,
    padding: 12,
  },
  leaderRowActive: {
    borderColor: colors.primary,
    borderWidth: 1,
  },
  rankBadge: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderRadius: 999,
    height: 36,
    justifyContent: "center",
    width: 36,
  },
  rankText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: "800",
  },
  leaderContent: {
    flex: 1,
    gap: 6,
  },
  leaderName: {
    color: colors.text,
    fontSize: 15,
    fontWeight: "700",
  },
  leaderStars: {
    alignItems: "center",
    flexDirection: "row",
    gap: 6,
  },
  leaderStarsText: {
    color: colors.textMuted,
    fontSize: 13,
    fontWeight: "700",
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
});
