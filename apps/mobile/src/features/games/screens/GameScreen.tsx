import { useEffect, useMemo, useRef, useState } from "react";
import type { GameCode } from "@mtb/contracts";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigation, useRoute } from "@react-navigation/native";
import { Direction, SIGNAL_PADS, SHIELD_PULSE_BASE_SPEED, SHIELD_PULSE_ROUND_SPEED, SHIELD_PULSE_START, SHIELD_ROUNDS, SOCIAL_ROUNDS, advanceSnake, createInitialSnakeState, getShieldAccuracyBand, getShieldScoreIncrement, queueDirection, randomSignal } from "@mtb/game-core";
import type { SignalPadId } from "@mtb/game-core";
import { StyleSheet, Text, View } from "react-native";
import { getPlanetProgress, submitGameRun } from "../../../shared/api/client";
import { colors } from "../../../shared/theme/colors";
import { LoadingView } from "../../../shared/ui/LoadingView";
import { PrimaryButton } from "../../../shared/ui/PrimaryButton";
import { Screen } from "../../../shared/ui/Screen";
import { SecondaryButton } from "../../../shared/ui/SecondaryButton";
import { SectionCard } from "../../../shared/ui/SectionCard";
import { StarIcon } from "../../../shared/ui/StarIcon";
import { StatCard } from "../../../shared/ui/StatCard";
import { getPlanetMeta } from "../../planets/planet-config";

interface GameScreenProps {
  gameCode?: GameCode;
  planetId?: string;
}

interface RunSubmitProps {
  attemptsDisabled: boolean;
  hasSubmitted: boolean;
  isSubmitting: boolean;
  onSubmit: (score: number) => void;
}

export function GameScreen({ gameCode: forcedGameCode, planetId: forcedPlanetId }: GameScreenProps) {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const gameCode = forcedGameCode ?? route.params?.gameCode ?? "halva_snake";
  const planetId = forcedPlanetId ?? route.params?.planetId ?? inferPlanetId(gameCode);
  const [latestReward, setLatestReward] = useState<string | null>(null);
  const [wasStarAwarded, setWasStarAwarded] = useState(false);

  const planetMeta = getPlanetMeta(planetId);
  const progressQuery = useQuery({
    queryKey: ["planet-progress", planetId],
    queryFn: () => getPlanetProgress(planetId),
  });

  const submitMutation = useMutation({
    mutationFn: (score: number) => submitGameRun(gameCode, { planet_id: planetId, score }),
    onSuccess: async (payload) => {
      setWasStarAwarded(Boolean(payload.small_star_awarded));
      setLatestReward(payload.small_star_awarded ? "Малая звезда начислена и прогресс планеты обновлён." : "Раунд сохранён без новой звезды.");
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["me"] }),
        queryClient.invalidateQueries({ queryKey: ["promocodes"] }),
        queryClient.invalidateQueries({ queryKey: ["planets-list"] }),
        queryClient.invalidateQueries({ queryKey: ["planet-progress", planetId] }),
        queryClient.invalidateQueries({ queryKey: ["planet-leaderboard", planetId] }),
        queryClient.invalidateQueries({ queryKey: ["planet-leaderboard"] }),
        queryClient.invalidateQueries({ queryKey: ["game-summary"] }),
      ]);
    },
  });

  const remainingAttempts = useMemo(() => {
    if (!progressQuery.data) {
      return 0;
    }
    return Math.max(0, progressQuery.data.game.daily_attempts_limit - progressQuery.data.game.daily_attempts_used);
  }, [progressQuery.data]);
  const attemptsDisabled = remainingAttempts <= 0;

  if (progressQuery.isLoading) {
    return <LoadingView label="Подготавливаем игровой запуск..." />;
  }

  if (progressQuery.isError || !progressQuery.data) {
    return (
      <Screen title="Игра планеты" subtitle="Не удалось загрузить данные игры.">
        <SectionCard title="Ошибка">
          <Text style={styles.errorText}>{progressQuery.error instanceof Error ? progressQuery.error.message : "Повторите попытку позже."}</Text>
        </SectionCard>
      </Screen>
    );
  }

  return (
    <Screen
      title={planetMeta.gameTitle}
      subtitle={`${planetMeta.title}. ${planetMeta.summary}`}
      footer={
        <View style={styles.footer}>
          <SecondaryButton onPress={() => navigation.navigate("PlanetDetail", { planetId, pulseToken: Date.now(), starAwarded: wasStarAwarded })}>
            Назад к планете
          </SecondaryButton>
        </View>
      }
    >
      <SectionCard description="Игровой раунд засчитывается в прогресс конкретной планеты." title="Статус запуска">
        <View style={styles.statsRow}>
          <StatCard label="Осталось попыток" value={remainingAttempts} />
          <StatCard label="Кешбэк планеты" value={`${progressQuery.data.cashback_percent.toFixed(1)}%`} />
        </View>
        <Text style={styles.metaText}>Текущая игра: {progressQuery.data.game.name}</Text>
        {attemptsDisabled ? <Text style={styles.warningText}>Дневные попытки закончились. Новые раунды сегодня недоступны.</Text> : null}
        {latestReward ? (
          <View style={styles.rewardBanner}>
            <StarIcon color={colors.warning} size={18} />
            <Text style={styles.rewardText}>{latestReward}</Text>
          </View>
        ) : null}
      </SectionCard>

      {gameCode === "credit_shield_reactor" ? (
        <ShieldGamePanel
          attemptsDisabled={attemptsDisabled}
          hasSubmitted={submitMutation.isSuccess}
          isSubmitting={submitMutation.isPending}
          onSubmit={(score) => submitMutation.mutate(score)}
        />
      ) : gameCode === "social_ring_signal" ? (
        <SocialGamePanel
          attemptsDisabled={attemptsDisabled}
          hasSubmitted={submitMutation.isSuccess}
          isSubmitting={submitMutation.isPending}
          onSubmit={(score) => submitMutation.mutate(score)}
        />
      ) : (
        <SnakeGamePanel
          attemptsDisabled={attemptsDisabled}
          hasSubmitted={submitMutation.isSuccess}
          isSubmitting={submitMutation.isPending}
          onSubmit={(score) => submitMutation.mutate(score)}
        />
      )}
    </Screen>
  );
}

function SnakeGamePanel({ attemptsDisabled, hasSubmitted, isSubmitting, onSubmit }: RunSubmitProps) {
  const directionRef = useRef<Direction>("right");
  const [game, setGame] = useState(() => createInitialSnakeState());
  const [isStarted, setIsStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [status, setStatus] = useState("Запустите забег и собирайте токены на поле.");
  const speed = Math.max(92, 180 - game.score * 5);

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
      setStatus("Раунд завершён. Можно отправить результат.");
      setIsStarted(false);
      setIsPaused(false);
    }
  }, [game.isOver]);

  const cells = useMemo(
    () =>
      Array.from({ length: game.boardSize * game.boardSize }, (_, index) => {
        const x = index % game.boardSize;
        const y = Math.floor(index / game.boardSize);
        return {
          x,
          y,
          isFood: game.food.x === x && game.food.y === y,
          isSnake: game.snake.some((point) => point.x === x && point.y === y),
        };
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
    setStatus("Поле сброшено. Можно начинать новый забег.");
  }

  return (
    <>
      <SectionCard title="Статус">
        <Text style={styles.metaText}>Счёт: {game.score}</Text>
        <Text style={styles.metaText}>Скорость: {speed} мс</Text>
        <Text style={styles.metaText}>{status}</Text>
      </SectionCard>
      <SectionCard title="Поле">
        <View style={styles.grid}>
          {cells.map((cell) => (
            <View key={`${cell.x}-${cell.y}`} style={[styles.cell, cell.isSnake ? styles.snakeCell : null, cell.isFood ? styles.foodCell : null]} />
          ))}
        </View>
      </SectionCard>
      <SectionCard title="Управление">
        <View style={styles.controlsRow}>
          <SecondaryButton disabled={attemptsDisabled || game.isOver || isStarted} onPress={() => setIsStarted(true)}>
            Старт
          </SecondaryButton>
          <SecondaryButton disabled={!isStarted || game.isOver} onPress={() => setIsPaused((value) => !value)}>
            {isPaused ? "Продолжить" : "Пауза"}
          </SecondaryButton>
          <SecondaryButton onPress={resetGame}>Сбросить</SecondaryButton>
        </View>
        <View style={styles.controlsColumn}>
          <SecondaryButton onPress={() => updateDirection("up")}>Вверх</SecondaryButton>
          <View style={styles.controlsRow}>
            <SecondaryButton onPress={() => updateDirection("left")}>Влево</SecondaryButton>
            <SecondaryButton onPress={() => updateDirection("right")}>Вправо</SecondaryButton>
          </View>
          <SecondaryButton onPress={() => updateDirection("down")}>Вниз</SecondaryButton>
        </View>
        <PrimaryButton disabled={!game.isOver || game.score === 0 || hasSubmitted || isSubmitting} onPress={() => onSubmit(game.score)}>
          {isSubmitting ? "Отправляем..." : hasSubmitted ? "Результат отправлен" : "Отправить результат"}
        </PrimaryButton>
      </SectionCard>
    </>
  );
}

function ShieldGamePanel({ attemptsDisabled, hasSubmitted, isSubmitting, onSubmit }: RunSubmitProps) {
  const directionRef = useRef(1);
  const [round, setRound] = useState(1);
  const [position, setPosition] = useState(SHIELD_PULSE_START);
  const [score, setScore] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [isComplete, setIsComplete] = useState(false);
  const speed = SHIELD_PULSE_BASE_SPEED + Math.min(round, 6) * SHIELD_PULSE_ROUND_SPEED;
  const accuracyBand = getShieldAccuracyBand(position);

  useEffect(() => {
    if (!isRunning || isComplete) {
      return;
    }
    const timer = setInterval(() => {
      setPosition((current) => {
        let next = current + directionRef.current * speed * 0.1;
        if (next >= 100) {
          next = 100 - (next - 100);
          directionRef.current = -1;
        }
        if (next <= 0) {
          next = -next;
          directionRef.current = 1;
        }
        return Math.max(0, Math.min(100, next));
      });
    }, 16);
    return () => clearInterval(timer);
  }, [isComplete, isRunning, speed]);

  function reset() {
    directionRef.current = 1;
    setRound(1);
    setPosition(SHIELD_PULSE_START);
    setScore(0);
    setIsRunning(false);
    setIsComplete(false);
  }

  function lockPulse() {
    if (!isRunning || isComplete) {
      return;
    }
    setScore((value) => value + getShieldScoreIncrement(accuracyBand));
    if (round >= SHIELD_ROUNDS) {
      setIsRunning(false);
      setIsComplete(true);
      return;
    }
    setRound((value) => value + 1);
  }

  return (
    <>
      <SectionCard title="Состояние">
        <Text style={styles.metaText}>Раунд {round}/{SHIELD_ROUNDS}</Text>
        <Text style={styles.metaText}>Счёт {score}</Text>
        <Text style={styles.metaText}>Точность {accuracyBand}</Text>
      </SectionCard>
      <SectionCard title="Шкала импульса">
        <View style={styles.track}>
          <View
            style={[
              styles.marker,
              {
                backgroundColor: accuracyBand === "perfect" ? colors.success : accuracyBand === "good" ? colors.warning : colors.primary,
                marginLeft: `${position}%`,
              },
            ]}
          />
        </View>
        <Text style={styles.metaText}>Позиция {Math.round(position)}%</Text>
        <View style={styles.controlsRow}>
          <SecondaryButton disabled={attemptsDisabled || isRunning || isComplete} onPress={() => setIsRunning(true)}>
            Старт реактора
          </SecondaryButton>
          <SecondaryButton disabled={!isRunning || isComplete} onPress={lockPulse}>
            Зафиксировать
          </SecondaryButton>
          <SecondaryButton onPress={reset}>Сбросить</SecondaryButton>
        </View>
        <PrimaryButton disabled={!isComplete || score === 0 || hasSubmitted || isSubmitting} onPress={() => onSubmit(score)}>
          {isSubmitting ? "Отправляем..." : hasSubmitted ? "Результат отправлен" : "Отправить результат"}
        </PrimaryButton>
      </SectionCard>
    </>
  );
}

type Phase = "idle" | "showing" | "input" | "complete";

function SocialGamePanel({ attemptsDisabled, hasSubmitted, isSubmitting, onSubmit }: RunSubmitProps) {
  const [phase, setPhase] = useState<Phase>("idle");
  const [sequence, setSequence] = useState<SignalPadId[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [score, setScore] = useState(0);
  const [round, setRound] = useState(0);
  const [activePad, setActivePad] = useState<SignalPadId | null>(null);

  useEffect(() => {
    if (phase !== "showing") {
      return;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    const copy = [...sequence];
    const run = (index: number) => {
      if (index >= copy.length) {
        timer = setTimeout(() => {
          setActivePad(null);
          setCurrentIndex(0);
          setPhase("input");
        }, 400);
        return;
      }
      setActivePad(copy[index]);
      timer = setTimeout(() => {
        setActivePad(null);
        timer = setTimeout(() => run(index + 1), 220);
      }, 320);
    };
    run(0);
    return () => {
      if (timer) {
        clearTimeout(timer);
      }
    };
  }, [phase, sequence]);

  function start() {
    const initial = [randomSignal()];
    setSequence(initial);
    setCurrentIndex(0);
    setRound(1);
    setScore(0);
    setPhase("showing");
  }

  function reset() {
    setPhase("idle");
    setSequence([]);
    setCurrentIndex(0);
    setScore(0);
    setRound(0);
    setActivePad(null);
  }

  function handlePadPress(padId: SignalPadId) {
    if (phase !== "input") {
      return;
    }
    setActivePad(padId);
    setTimeout(() => setActivePad(null), 180);
    if (padId !== sequence[currentIndex]) {
      setPhase("complete");
      return;
    }
    const nextIndex = currentIndex + 1;
    setScore((value) => value + 2);
    if (nextIndex < sequence.length) {
      setCurrentIndex(nextIndex);
      return;
    }
    if (round >= SOCIAL_ROUNDS) {
      setPhase("complete");
      return;
    }
    const nextSequence = [...sequence, randomSignal()];
    setSequence(nextSequence);
    setCurrentIndex(0);
    setRound((value) => value + 1);
    setPhase("showing");
  }

  return (
    <>
      <SectionCard title="Прогресс">
        <Text style={styles.metaText}>Раунд {round}/{SOCIAL_ROUNDS}</Text>
        <Text style={styles.metaText}>Счёт {score}</Text>
        <Text style={styles.metaText}>Фаза {phase}</Text>
        <View style={styles.controlsRow}>
          <SecondaryButton disabled={attemptsDisabled || phase === "showing" || phase === "input"} onPress={start}>
            {phase === "idle" ? "Старт" : "Заново"}
          </SecondaryButton>
          <SecondaryButton onPress={reset}>Сбросить</SecondaryButton>
        </View>
      </SectionCard>
      <SectionCard title="Панели">
        <View style={styles.signalGrid}>
          {SIGNAL_PADS.map((pad) => (
            <View key={pad.id} style={styles.signalPad}>
              <PrimaryButton onPress={() => handlePadPress(pad.id)}>{activePad === pad.id ? `${pad.label} •` : pad.label}</PrimaryButton>
            </View>
          ))}
        </View>
        <PrimaryButton disabled={phase !== "complete" || score === 0 || hasSubmitted || isSubmitting} onPress={() => onSubmit(score)}>
          {isSubmitting ? "Отправляем..." : hasSubmitted ? "Результат отправлен" : "Отправить результат"}
        </PrimaryButton>
      </SectionCard>
    </>
  );
}

function inferPlanetId(gameCode: GameCode) {
  if (gameCode === "credit_shield_reactor") {
    return "azs";
  }
  if (gameCode === "social_ring_signal") {
    return "marketplace";
  }
  return "apteki";
}

const styles = StyleSheet.create({
  footer: {
    gap: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
  },
  metaText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  warningText: {
    color: colors.warning,
    fontSize: 14,
    lineHeight: 21,
  },
  rewardBanner: {
    alignItems: "center",
    backgroundColor: colors.primarySoft,
    borderColor: colors.primary,
    borderRadius: 18,
    borderWidth: 1,
    flexDirection: "row",
    gap: 10,
    padding: 14,
  },
  rewardText: {
    color: colors.text,
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
  },
  errorText: {
    color: colors.textMuted,
    fontSize: 14,
    lineHeight: 21,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 2,
  },
  cell: {
    backgroundColor: colors.surface,
    borderRadius: 4,
    height: 22,
    width: 22,
  },
  snakeCell: {
    backgroundColor: colors.primary,
  },
  foodCell: {
    backgroundColor: colors.success,
  },
  controlsRow: {
    flexDirection: "row",
    gap: 12,
    justifyContent: "center",
  },
  controlsColumn: {
    alignItems: "center",
    gap: 12,
  },
  track: {
    backgroundColor: colors.surfaceElevated,
    borderRadius: 16,
    height: 18,
    overflow: "hidden",
  },
  marker: {
    borderRadius: 9,
    height: 18,
    width: 18,
  },
  signalGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  signalPad: {
    flexBasis: "47%",
  },
});
