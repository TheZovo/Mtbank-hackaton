import { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Direction, advanceSnake, createInitialSnakeState, queueDirection } from "@mtb/game-core";
import { submitGameRun } from "../../../shared/api/client";
import { Screen } from "../../../shared/ui/Screen";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { SecondaryButton } from "../../../shared/ui/SecondaryButton";
import { SectionCard } from "../../../shared/ui/SectionCard";

export function SnakeGameScreen() {
  const queryClient = useQueryClient();
  const directionRef = useRef<Direction>("right");
  const [game, setGame] = useState(() => createInitialSnakeState());
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [status, setStatus] = useState("Запустите забег и собирайте токены на поле.");

  const speed = Math.max(92, 180 - game.score * 5);
  const submitMutation = useMutation({
    mutationFn: () => submitGameRun("halva_snake", { score: game.score }),
    onSuccess: (payload) => {
      setHasSubmitted(true);
      setStatus(`Раунд отправлен: +${payload.total_reward} звездной пыли.`);
      void Promise.all([
        queryClient.invalidateQueries({ queryKey: ["profile"] }),
        queryClient.invalidateQueries({ queryKey: ["rewards"] }),
        queryClient.invalidateQueries({ queryKey: ["quests"] }),
        queryClient.invalidateQueries({ queryKey: ["game-summary"] }),
      ]);
    },
  });

  useEffect(() => {
    if (!isStarted || isPaused || game.isOver) {
      return;
    }
    const timer = setInterval(() => {
      setGame((current) => advanceSnake({ ...current, direction: directionRef.current }));
    }, speed);
    return () => clearInterval(timer);
  }, [game.isOver, isPaused, isStarted, speed]);

  useEffect(() => {
    if (game.isOver) {
      setStatus("Забег завершен. Можно отправить результат на сервер.");
      setIsStarted(false);
      setIsPaused(false);
    }
  }, [game.isOver]);

  const cells = useMemo(
    () =>
      Array.from({ length: game.boardSize * game.boardSize }, (_, index) => {
        const x = index % game.boardSize;
        const y = Math.floor(index / game.boardSize);
        const isSnake = game.snake.some((point) => point.x === x && point.y === y);
        const isFood = game.food.x === x && game.food.y === y;
        return { x, y, isSnake, isFood };
      }),
    [game.boardSize, game.food.x, game.food.y, game.snake],
  );

  function updateDirection(next: Direction) {
    directionRef.current = queueDirection(directionRef.current, next);
    setGame((current) => ({ ...current, direction: directionRef.current }));
  }

  function resetGame() {
    const initial = createInitialSnakeState();
    directionRef.current = initial.direction;
    setGame(initial);
    setIsStarted(false);
    setIsPaused(false);
    setHasSubmitted(false);
    setStatus("Поле сброшено. Готово к новому забегу.");
  }

  return (
    <Screen
      title="Змейка Халва"
      subtitle="Touch-native ран с отправкой итогового счета в `/v1/games/halva_snake/runs`."
      footer={
        <View style={{ gap: 12 }}>
          <PrimaryButton onPress={() => setIsStarted(true)} disabled={game.isOver || isStarted}>
            Старт
          </PrimaryButton>
          <SecondaryButton onPress={() => setIsPaused((value) => !value)} disabled={!isStarted || game.isOver}>
            {isPaused ? "Продолжить" : "Пауза"}
          </SecondaryButton>
          <SecondaryButton onPress={resetGame}>Сбросить</SecondaryButton>
          <PrimaryButton
            disabled={!game.isOver || game.score === 0 || hasSubmitted || submitMutation.isPending}
            onPress={() => submitMutation.mutate()}
          >
            {submitMutation.isPending ? "Отправляем..." : hasSubmitted ? "Результат отправлен" : "Отправить результат"}
          </PrimaryButton>
        </View>
      }
    >
      <SectionCard title="Статус">
        <Text style={styles.metaText}>Счет: {game.score}</Text>
        <Text style={styles.metaText}>Скорость: {speed}ms</Text>
        <Text style={styles.metaText}>{status}</Text>
      </SectionCard>
      <SectionCard title="Поле">
        <View style={styles.grid}>
          {cells.map((cell) => (
            <View
              key={`${cell.x}-${cell.y}`}
              style={[
                styles.cell,
                cell.isSnake ? styles.snakeCell : null,
                cell.isFood ? styles.foodCell : null,
              ]}
            />
          ))}
        </View>
      </SectionCard>
      <SectionCard title="Управление">
        <View style={styles.controlsRow}>
          <SecondaryButton onPress={() => updateDirection("up")}>Вверх</SecondaryButton>
        </View>
        <View style={styles.controlsRow}>
          <SecondaryButton onPress={() => updateDirection("left")}>Влево</SecondaryButton>
          <SecondaryButton onPress={() => updateDirection("right")}>Вправо</SecondaryButton>
        </View>
        <View style={styles.controlsRow}>
          <SecondaryButton onPress={() => updateDirection("down")}>Вниз</SecondaryButton>
        </View>
      </SectionCard>
    </Screen>
  );
}

const styles = StyleSheet.create({
  metaText: {
    color: "#9DB6C9",
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  cell: {
    backgroundColor: "#0D1B2A",
    borderRadius: 4,
    height: 22,
    width: 22,
  },
  snakeCell: {
    backgroundColor: "#FF7A59",
  },
  foodCell: {
    backgroundColor: "#14B8A6",
  },
  controlsRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
});
