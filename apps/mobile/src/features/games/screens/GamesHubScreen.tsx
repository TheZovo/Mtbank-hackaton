import { useNavigation } from "@react-navigation/native";
import { StyleSheet, Text, View } from "react-native";
import { colors } from "../../../shared/theme/colors";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { StarIcon } from "../../../shared/ui/StarIcon";

const games = [
  {
    id: "SnakeGame",
    title: "Змейка Халва",
    subtitle: "Аркадный режим для фарма попыток, вовлечения и прогресса по ежедневной игровой петле.",
    planet: "Аптеки",
  },
  {
    id: "ShieldGame",
    title: "Реактор щита",
    subtitle: "Игра на тайминг и точность. Подходит для демонстрации второго сценария игрового модуля.",
    planet: "АЗС",
  },
  {
    id: "SocialGame",
    title: "Сигнальный ринг",
    subtitle: "Мини-игра на память и ритм. Показывает, как FE1 встраивает общую навигацию поверх игровых экранов.",
    planet: "Маркетплейсы",
  },
] as const;

export function GamesHubScreen() {
  const navigation = useNavigation<any>();

  return (
    <Screen
      title="Игровой хаб"
      subtitle="FE1 подключает общий вход в игровой модуль и оставляет все сценарии доступными из таб-навигации. Результаты игр отправляются на мок-сервер."
    >
      {games.map((game) => (
        <SectionCard key={game.id} description={game.subtitle} title={game.title}>
          <View style={styles.metaRow}>
            <StarIcon color={colors.warning} size={18} />
            <Text style={styles.metaText}>Связано с планетой: {game.planet}</Text>
          </View>
          <PrimaryButton onPress={() => navigation.navigate(game.id)}>Открыть игру</PrimaryButton>
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
