import { useNavigation } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../shared/theme/colors";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { StarIcon } from "../../../shared/ui/StarIcon";

const games = [
  {
    gameCode: "halva_snake",
    title: "Змейка Халва",
    subtitle: "Аркадный режим для фарма попыток, вовлечения и прогресса по ежедневной игровой петле.",
    planet: "Аптеки",
    planetId: "apteki",
  },
  {
    gameCode: "credit_shield_reactor",
    title: "Реактор щита",
    subtitle: "Игра на тайминг и точность. Подходит для демонстрации второго сценария игрового модуля.",
    planet: "АЗС",
    planetId: "azs",
  },
  {
    gameCode: "social_ring_signal",
    title: "Сигнальный ринг",
    subtitle: "Мини-игра на память и ритм. Показывает, как FE1 встраивает общую навигацию поверх игровых экранов.",
    planet: "Маркетплейсы",
    planetId: "marketplace",
  },
] as const;

export function GamesHubScreen() {
  const navigation = useNavigation<any>();

  return (
    <Screen
      title="Игровой хаб"
      subtitle="FE2 использует единый GameScreen: хаб показывает доступные игры и открывает их с привязкой к конкретной планете."
    >
      {games.map((game) => (
        <SectionCard key={game.gameCode} description={game.subtitle} title={game.title}>
          <View style={styles.metaRow}>
            <StarIcon color={colors.warning} size={18} />
            <Text style={styles.metaText}>Связано с планетой: {game.planet}</Text>
          </View>
          <PrimaryButton onPress={() => navigation.navigate("Game", { gameCode: game.gameCode, planetId: game.planetId })}>Открыть игру</PrimaryButton>
        </SectionCard>
      ))}
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    alignItems: "center",
    flexDirection: "row",
    gap: 8,
  },
  metaText: {
    color: colors.textMuted,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
});
